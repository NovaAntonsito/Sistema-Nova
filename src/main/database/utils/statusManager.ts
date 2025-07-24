import { Repository } from 'typeorm'
import { Budget } from '../entities/Budget'
import { Status } from '../entities/Status'

/**
 * Clase utilitaria para gestionar las transiciones de estado del presupuesto
 */
export class StatusManager {
  private budgetRepository: Repository<Budget>

  constructor(budgetRepository: Repository<Budget>) {
    this.budgetRepository = budgetRepository
  }

  /**
   * Verifica y actualiza presupuestos vencidos
   * @returns Promise<number> - Número de presupuestos actualizados
   */
  async updateExpiredBudgets(): Promise<number> {
    const currentDate = new Date()

    // Encuentra todos los presupuestos activos que han pasado su fecha de vencimiento
    const expiredBudgets = await this.budgetRepository
      .createQueryBuilder('budget')
      .where('budget.currentStatus = :status', { status: Status.ACTIVE })
      .andWhere('budget._expirationDate < :currentDate', { currentDate })
      .andWhere('budget.isDeleted = :isDeleted', { isDeleted: false })
      .getMany()

    if (expiredBudgets.length === 0) {
      return 0
    }

    // Actualiza el estado a EXPIRED para todos los presupuestos vencidos
    await this.budgetRepository
      .createQueryBuilder()
      .update(Budget)
      .set({ currentStatus: Status.EXPIRED })
      .where('id IN (:...ids)', { ids: expiredBudgets.map((b) => b.id) })
      .execute()

    return expiredBudgets.length
  }

  /**
   * Verifica si un presupuesto debe marcarse como terminado basado en los pagos de cuotas
   * @param budgetId - El ID del presupuesto a verificar
   * @returns Promise<boolean> - True si el presupuesto debe terminarse
   */
  async shouldMarkAsFinished(budgetId: string): Promise<boolean> {
    const budget = await this.budgetRepository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.quotaList', 'quota')
      .where('budget.id = :budgetId', { budgetId })
      .andWhere('budget.isDeleted = :isDeleted', { isDeleted: false })
      .getOne()

    if (!budget) {
      return false
    }

    // Calcula el monto total pagado de las cuotas
    const totalPaid = budget.quotaList.reduce((sum, quota) => sum + Number(quota.amount), 0)

    // Verifica si el monto total pagado iguala o excede el monto total del presupuesto
    return totalPaid >= Number(budget.totalAmount)
  }

  /**
   * Actualiza el estado de un presupuesto a FINISHED si todas las cuotas están pagadas
   * @param budgetId - El ID del presupuesto a actualizar
   * @returns Promise<boolean> - True si el estado fue actualizado
   */
  async updateToFinishedIfComplete(budgetId: string): Promise<boolean> {
    const shouldFinish = await this.shouldMarkAsFinished(budgetId)

    if (shouldFinish) {
      await this.budgetRepository
        .createQueryBuilder()
        .update(Budget)
        .set({ currentStatus: Status.FINISHED })
        .where('id = :budgetId', { budgetId })
        .andWhere('currentStatus = :currentStatus', { currentStatus: Status.ACTIVE })
        .execute()

      return true
    }

    return false
  }

  /**
   * Valida si una transición de estado está permitida
   * @param currentStatus - Estado actual del presupuesto
   * @param newStatus - Nuevo estado deseado
   * @returns boolean - True si la transición es válida
   */
  static isValidStatusTransition(currentStatus: Status, newStatus: Status): boolean {
    const validTransitions: Record<Status, Status[]> = {
      [Status.ACTIVE]: [Status.EXPIRED, Status.FINISHED],
      [Status.EXPIRED]: [], // Los presupuestos vencidos no pueden cambiar de estado
      [Status.FINISHED]: [] // Los presupuestos terminados no pueden cambiar de estado
    }

    return validTransitions[currentStatus]?.includes(newStatus) || false
  }

  /**
   * Obtiene todos los presupuestos que necesitan actualizaciones de estado
   * @returns Promise<Budget[]> - Presupuestos que requieren actualizaciones de estado
   */
  async getBudgetsNeedingStatusUpdate(): Promise<Budget[]> {
    const currentDate = new Date()

    return await this.budgetRepository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.quotaList', 'quota')
      .where('budget.currentStatus = :status', { status: Status.ACTIVE })
      .andWhere('budget.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('budget._expirationDate < :currentDate', { currentDate })
      .getMany()
  }

  /**
   * Realiza una verificación integral de actualización de estado para todos los presupuestos
   * @returns Promise<{expired: number, finished: number}> - Conteos de actualizaciones
   */
  async performStatusMaintenance(): Promise<{ expired: number; finished: number }> {
    // Actualiza presupuestos vencidos
    const expiredCount = await this.updateExpiredBudgets()

    // Verifica presupuestos que deben marcarse como terminados
    const activeBudgets = await this.budgetRepository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.quotaList', 'quota')
      .where('budget.currentStatus = :status', { status: Status.ACTIVE })
      .andWhere('budget.isDeleted = :isDeleted', { isDeleted: false })
      .getMany()

    let finishedCount = 0
    for (const budget of activeBudgets) {
      const wasUpdated = await this.updateToFinishedIfComplete(budget.id)
      if (wasUpdated) {
        finishedCount++
      }
    }

    return { expired: expiredCount, finished: finishedCount }
  }

  /**
   * Obtiene el resumen de estado de presupuestos
   * @returns Promise<Record<Status, number>> - Conteo de presupuestos por estado
   */
  async getStatusSummary(): Promise<Record<Status, number>> {
    const summary = await this.budgetRepository
      .createQueryBuilder('budget')
      .select('budget.currentStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('budget.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('budget.currentStatus')
      .getRawMany()

    const result: Record<Status, number> = {
      [Status.ACTIVE]: 0,
      [Status.EXPIRED]: 0,
      [Status.FINISHED]: 0
    }

    summary.forEach((item) => {
      result[item.status as Status] = parseInt(item.count, 10)
    })

    return result
  }
}
