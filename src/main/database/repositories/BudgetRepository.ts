import { Repository, DataSource } from 'typeorm'
import { Budget } from '../entities/Budget'
import { Status } from '../entities/Status'

export class BudgetRepository extends Repository<Budget> {
  constructor(dataSource: DataSource) {
    super(Budget, dataSource.createEntityManager())
  }

  /**
   * Encuentra todos los presupuestos excluyendo los eliminados lógicamente
   */
  async findAllActive(): Promise<Budget[]> {
    return this.find({
      where: { isDeleted: false },
      relations: ['user', 'quotaList']
    })
  }

  /**
   * Encuentra un presupuesto por ID excluyendo los eliminados lógicamente
   */
  async findActiveById(id: string): Promise<Budget | null> {
    return this.findOne({
      where: { id, isDeleted: false },
      relations: ['user', 'quotaList']
    })
  }

  /**
   * Busca presupuesto por código (coincidencia exacta, insensible a mayúsculas)
   */
  async findByCode(code: string): Promise<Budget | null> {
    return this.createQueryBuilder('budget')
      .leftJoinAndSelect('budget.user', 'user')
      .leftJoinAndSelect('budget.quotaList', 'quota')
      .where('budget.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('LOWER(budget.code) = LOWER(:code)', { code })
      .getOne()
  }

  /**
   * Actualiza el estado del presupuesto
   */
  async updateStatus(id: string, status: Status): Promise<void> {
    await this.update(id, { currentStatus: status })
  }

  /**
   * Encuentra presupuestos vencidos que necesitan actualización de estado
   */
  async findExpiredBudgets(): Promise<Budget[]> {
    return this.createQueryBuilder('budget')
      .leftJoinAndSelect('budget.user', 'user')
      .leftJoinAndSelect('budget.quotaList', 'quota')
      .where('budget.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('budget.currentStatus = :status', { status: Status.ACTIVE })
      .andWhere('budget._expirationDate < :currentDate', { currentDate: new Date() })
      .getMany()
  }

  /**
   * Realiza la eliminación lógica de un presupuesto
   */
  async logicalDelete(id: string): Promise<void> {
    await this.update(id, { isDeleted: true })
  }

  /**
   * Restaura un presupuesto eliminado lógicamente
   */
  async restoreBudget(id: string): Promise<void> {
    await this.update(id, { isDeleted: false })
  }

  /**
   * Verifica si el código existe (excluyendo presupuestos eliminados)
   */
  async codeExists(code: string, excludeId?: string): Promise<boolean> {
    const query = this.createQueryBuilder('budget')
      .where('LOWER(budget.code) = LOWER(:code)', { code })
      .andWhere('budget.isDeleted = :isDeleted', { isDeleted: false })

    if (excludeId) {
      query.andWhere('budget.id != :excludeId', { excludeId })
    }

    const count = await query.getCount()
    return count > 0
  }

  /**
   * Encuentra presupuestos por ID de usuario
   */
  async findByUserId(userId: string): Promise<Budget[]> {
    return this.find({
      where: {
        user: { id: userId },
        isDeleted: false
      },
      relations: ['user', 'quotaList']
    })
  }

  /**
   * Encuentra presupuestos por estado
   */
  async findByStatus(status: Status): Promise<Budget[]> {
    return this.find({
      where: {
        currentStatus: status,
        isDeleted: false
      },
      relations: ['user', 'quotaList']
    })
  }
}
