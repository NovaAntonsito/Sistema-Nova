import { Repository, DataSource } from 'typeorm'
import { Quota } from '../entities/Quota'

export class QuotaRepository extends Repository<Quota> {
  constructor(dataSource: DataSource) {
    super(Quota, dataSource.createEntityManager())
  }

  /**
   * Encuentra todas las cuotas con relaciones de presupuesto
   */
  async findAllWithBudget(): Promise<Quota[]> {
    return this.find({
      relations: ['budget', 'budget.user']
    })
  }

  /**
   * Encuentra una cuota por ID con relación de presupuesto
   */
  async findByIdWithBudget(id: string): Promise<Quota | null> {
    return this.findOne({
      where: { id },
      relations: ['budget', 'budget.user']
    })
  }

  /**
   * Encuentra cuotas por ID de presupuesto
   */
  async findByBudgetId(budgetId: string): Promise<Quota[]> {
    return this.find({
      where: { budget: { id: budgetId } },
      relations: ['budget'],
      order: { _creationDate: 'ASC' }
    })
  }

  /**
   * Crea una nueva cuota
   */
  async createQuota(quotaData: Partial<Quota>): Promise<Quota> {
    const quota = this.create(quotaData)
    return this.save(quota)
  }

  /**
   * Actualiza el monto de la cuota
   */
  async updateAmount(id: string, amount: number): Promise<void> {
    await this.update(id, { amount })
  }

  /**
   * Elimina una cuota por ID
   */
  async deleteById(id: string): Promise<void> {
    await this.delete(id)
  }

  /**
   * Calcula el monto total de cuotas para un presupuesto
   */
  async getTotalQuotaAmountByBudgetId(budgetId: string): Promise<number> {
    const result = await this.createQueryBuilder('quota')
      .select('SUM(quota.amount)', 'total')
      .where('quota.budget.id = :budgetId', { budgetId })
      .getRawOne()

    return parseFloat(result.total) || 0
  }

  /**
   * Obtiene el número de cuotas para un presupuesto
   */
  async getQuotaCountByBudgetId(budgetId: string): Promise<number> {
    return this.count({
      where: { budget: { id: budgetId } }
    })
  }

  /**
   * Encuentra cuotas dentro de un rango de fechas
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Quota[]> {
    return this.createQueryBuilder('quota')
      .leftJoinAndSelect('quota.budget', 'budget')
      .leftJoinAndSelect('budget.user', 'user')
      .where('quota._creationDate >= :startDate', { startDate })
      .andWhere('quota._creationDate <= :endDate', { endDate })
      .orderBy('quota._creationDate', 'DESC')
      .getMany()
  }
}
