import { QuotaRepository } from '../repositories/QuotaRepository'
import { BudgetRepository } from '../repositories/BudgetRepository'
import { Quota } from '../entities/Quota'
import {
  CreateQuotaDto,
  UpdateQuotaDto,
  QuotaResponseDto,
  validateCreateQuotaDto,
  validateUpdateQuotaDto
} from '../dto/quota.dto'
import { StatusManager } from '../utils/statusManager'

export class QuotaNotFoundException extends Error {
  constructor(id: string) {
    super(`Cuota con ID ${id} no encontrada`)
    this.name = 'QuotaNotFoundException'
  }
}

export class BudgetNotFoundException extends Error {
  constructor(id: string) {
    super(`Presupuesto con ID ${id} no encontrado`)
    this.name = 'BudgetNotFoundException'
  }
}

export class ValidationException extends Error {
  constructor(errors: string[]) {
    super(`Errores de validación: ${errors.join(', ')}`)
    this.name = 'ValidationException'
  }
}

export class InvalidQuotaAmountException extends Error {
  constructor(quotaAmount: number, remainingAmount: number) {
    super(
      `La cantidad de la cuota (${quotaAmount}) excede el monto restante del presupuesto (${remainingAmount})`
    )
    this.name = 'InvalidQuotaAmountException'
  }
}

export class QuotaService {
  private statusManager: StatusManager

  constructor(
    private quotaRepository: QuotaRepository,
    private budgetRepository: BudgetRepository
  ) {
    this.statusManager = new StatusManager(budgetRepository)
  }

  /**
   * Crea una nueva cuota y la asocia con un presupuesto
   */
  async createQuota(createQuotaDto: CreateQuotaDto): Promise<QuotaResponseDto> {
    // Validar datos de entrada
    const validationErrors = validateCreateQuotaDto(createQuotaDto)
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors)
    }

    // Verificar que el presupuesto existe
    const budget = await this.budgetRepository.findActiveById(createQuotaDto.budgetId)
    if (!budget) {
      throw new BudgetNotFoundException(createQuotaDto.budgetId)
    }

    // Validar que la cantidad de la cuota no exceda el monto restante
    const totalPaid = budget.quotaList.reduce((sum, quota) => sum + Number(quota.amount), 0)
    const remainingAmount = Number(budget.totalAmount) - totalPaid

    if (createQuotaDto.amount > remainingAmount) {
      throw new InvalidQuotaAmountException(createQuotaDto.amount, remainingAmount)
    }

    // Crear cuota
    const quota = new Quota()
    quota.amount = createQuotaDto.amount // Requirement 3.2
    quota.budget = budget // Requirement 3.3

    const savedQuota = await this.quotaRepository.save(quota)

    // Verificar si el presupuesto debe marcarse como terminado
    await this.statusManager.updateToFinishedIfComplete(createQuotaDto.budgetId)

    return this.mapToResponseDto(savedQuota)
  }

  /**
   * Obtiene todas las cuotas
   */
  async getAllQuotas(): Promise<QuotaResponseDto[]> {
    const quotas = await this.quotaRepository.find({
      relations: ['budget', 'budget.user']
    })
    return quotas.map((quota) => this.mapToResponseDto(quota))
  }

  /**
   * Obtiene una cuota por ID
   */
  async getQuotaById(id: string): Promise<QuotaResponseDto> {
    const quota = await this.quotaRepository.findOne({
      where: { id },
      relations: ['budget', 'budget.user']
    })

    if (!quota) {
      throw new QuotaNotFoundException(id)
    }

    return this.mapToResponseDto(quota)
  }

  /**
   * Obtiene cuotas por ID de presupuesto
   */
  async getQuotasByBudgetId(budgetId: string): Promise<QuotaResponseDto[]> {
    // Verificar que el presupuesto existe
    const budget = await this.budgetRepository.findActiveById(budgetId)
    if (!budget) {
      throw new BudgetNotFoundException(budgetId)
    }

    const quotas = await this.quotaRepository.find({
      where: { budget: { id: budgetId } },
      relations: ['budget', 'budget.user'],
      order: { _creationDate: 'ASC' }
    })

    return quotas.map((quota) => this.mapToResponseDto(quota))
  }

  /**
   * Actualiza una cuota
   */
  async updateQuota(id: string, updateQuotaDto: UpdateQuotaDto): Promise<QuotaResponseDto> {
    const validationErrors = validateUpdateQuotaDto(updateQuotaDto)
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors)
    }

    // Verificar que la cuota existe
    const existingQuota = await this.quotaRepository.findOne({
      where: { id },
      relations: ['budget', 'budget.quotaList']
    })

    if (!existingQuota) {
      throw new QuotaNotFoundException(id)
    }

    // Si se actualiza el monto, validar que no exceda el monto restante
    if (updateQuotaDto.amount !== undefined) {
      const otherQuotasTotal = existingQuota.budget.quotaList
        .filter((q) => q.id !== id)
        .reduce((sum, quota) => sum + Number(quota.amount), 0)

      const remainingAmount = Number(existingQuota.budget.totalAmount) - otherQuotasTotal

      if (updateQuotaDto.amount > remainingAmount) {
        throw new InvalidQuotaAmountException(updateQuotaDto.amount, remainingAmount)
      }

      existingQuota.amount = updateQuotaDto.amount
    }

    const updatedQuota = await this.quotaRepository.save(existingQuota)

    // Verificar si el presupuesto debe marcarse como terminado
    await this.statusManager.updateToFinishedIfComplete(existingQuota.budget.id)

    return this.mapToResponseDto(updatedQuota)
  }

  /**
   * Elimina una cuota
   */
  async deleteQuota(id: string): Promise<void> {
    const quota = await this.quotaRepository.findOne({
      where: { id },
      relations: ['budget']
    })

    if (!quota) {
      throw new QuotaNotFoundException(id)
    }

    const budgetId = quota.budget.id
    await this.quotaRepository.remove(quota)

    // Verificar si el presupuesto debe actualizarse después de eliminar la cuota
    await this.statusManager.updateToFinishedIfComplete(budgetId)
  }

  /**
   * Calcula el monto total pagado para un presupuesto
   */
  async getTotalPaidForBudget(budgetId: string): Promise<number> {
    const quotas = await this.getQuotasByBudgetId(budgetId)
    return quotas.reduce((sum, quota) => sum + quota.amount, 0)
  }

  /**
   * Calcula el monto restante para un presupuesto
   */
  async getRemainingAmountForBudget(budgetId: string): Promise<number> {
    const budget = await this.budgetRepository.findActiveById(budgetId)
    if (!budget) {
      throw new BudgetNotFoundException(budgetId)
    }

    const totalPaid = await this.getTotalPaidForBudget(budgetId)
    return Number(budget.totalAmount) - totalPaid
  }

  /**
   * Obtiene estadísticas de cuotas para un presupuesto
   * Esto lo agregue para flexear vieja
   */
  async getBudgetQuotaStats(budgetId: string): Promise<{
    totalQuotas: number
    totalPaid: number
    remainingAmount: number
    completionPercentage: number
  }> {
    const budget = await this.budgetRepository.findActiveById(budgetId)
    if (!budget) {
      throw new BudgetNotFoundException(budgetId)
    }

    const quotas = await this.getQuotasByBudgetId(budgetId)
    const totalPaid = quotas.reduce((sum, quota) => sum + quota.amount, 0)
    const remainingAmount = Number(budget.totalAmount) - totalPaid
    const completionPercentage = (totalPaid / Number(budget.totalAmount)) * 100

    return {
      totalQuotas: quotas.length,
      totalPaid,
      remainingAmount,
      completionPercentage: Math.round(completionPercentage * 100) / 100
    }
  }

  /**
   * Mapea una entidad Quota a QuotaResponseDto
   */
  private mapToResponseDto(quota: Quota): QuotaResponseDto {
    return {
      id: quota.id,
      _creationDate: quota._creationDate,
      amount: quota.amount,
      budget: quota.budget
        ? {
            id: quota.budget.id,
            code: quota.budget.code,
            totalAmount: quota.budget.totalAmount,
            currentStatus: quota.budget.currentStatus
          }
        : undefined
    }
  }
}
