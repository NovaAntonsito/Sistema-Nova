import { Repository, DataSource } from 'typeorm'
import { Interest } from '../entities/Interest'

export class InterestRepository extends Repository<Interest> {
  constructor(dataSource: DataSource) {
    super(Interest, dataSource.createEntityManager())
  }

  /**
   * Encuentra todas las configuraciones de interés
   */
  async findAll(): Promise<Interest[]> {
    return this.find({
      order: { paymentTerm: 'ASC' }
    })
  }

  /**
   * Encuentra configuración de interés por plazo de pago
   */
  async findByPaymentTerm(paymentTerm: number): Promise<Interest | null> {
    return this.findOne({
      where: { paymentTerm }
    })
  }

  /**
   * Crea una nueva configuración de interés
   */
  async createInterest(interestData: Partial<Interest>): Promise<Interest> {
    const interest = this.create(interestData)
    return this.save(interest)
  }

  /**
   * Actualiza la tasa de interés para un plazo de pago
   */
  async updateInterestRate(paymentTerm: number, interestRate: number): Promise<void> {
    await this.update({ paymentTerm }, { interest: interestRate })
  }

  /**
   * Elimina configuración de interés por plazo de pago
   */
  async deleteByPaymentTerm(paymentTerm: number): Promise<void> {
    await this.delete({ paymentTerm })
  }

  /**
   * Verifica si el plazo de pago existe
   */
  async paymentTermExists(paymentTerm: number, excludeId?: string): Promise<boolean> {
    const query = this.createQueryBuilder('interest').where('interest.paymentTerm = :paymentTerm', {
      paymentTerm
    })

    if (excludeId) {
      query.andWhere('interest.id != :excludeId', { excludeId })
    }

    const count = await query.getCount()
    return count > 0
  }

  /**
   * Obtiene la tasa de interés por plazo de pago
   */
  async getInterestRateByPaymentTerm(paymentTerm: number): Promise<number | null> {
    const interest = await this.findByPaymentTerm(paymentTerm)
    return interest ? interest.interest : null
  }

  /**
   * Encuentra configuraciones de interés dentro de un rango de plazos de pago
   */
  async findByPaymentTermRange(minTerm: number, maxTerm: number): Promise<Interest[]> {
    return this.createQueryBuilder('interest')
      .where('interest.paymentTerm >= :minTerm', { minTerm })
      .andWhere('interest.paymentTerm <= :maxTerm', { maxTerm })
      .orderBy('interest.paymentTerm', 'ASC')
      .getMany()
  }

  /**
   * Obtiene todos los plazos de pago disponibles
   */
  async getAvailablePaymentTerms(): Promise<number[]> {
    const interests = await this.find({
      select: ['paymentTerm'],
      order: { paymentTerm: 'ASC' }
    })
    return interests.map((interest) => interest.paymentTerm)
  }
}
