import { InterestRepository } from '../repositories/InterestRepository'
import { Interest } from '../entities/Interest'
import {
  CreateInterestDto,
  UpdateInterestDto,
  InterestResponseDto,
  validateCreateInterestDto,
  validateUpdateInterestDto
} from '../dto/interest.dto'

export class InterestNotFoundException extends Error {
  constructor(id: string) {
    super(`Configuración de interés con ID ${id} no encontrada`)
    this.name = 'InterestNotFoundException'
  }
}

export class PaymentTermNotFoundException extends Error {
  constructor(paymentTerm: number) {
    super(`Configuración de interés para plazo ${paymentTerm} no encontrada`)
    this.name = 'PaymentTermNotFoundException'
  }
}

export class DuplicatePaymentTermException extends Error {
  constructor(paymentTerm: number) {
    super(`Ya existe una configuración de interés para el plazo ${paymentTerm}`)
    this.name = 'DuplicatePaymentTermException'
  }
}

export class ValidationException extends Error {
  constructor(errors: string[]) {
    super(`Errores de validación: ${errors.join(', ')}`)
    this.name = 'ValidationException'
  }
}

export class InterestService {
  constructor(private interestRepository: InterestRepository) {}

  /**
   * Crea una nueva configuración de interés
   */
  async createInterest(createInterestDto: CreateInterestDto): Promise<InterestResponseDto> {
    const validationErrors = validateCreateInterestDto(createInterestDto)
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors)
    }

    // Verificar que el plazo de pago no exista
    const paymentTermExists = await this.interestRepository.paymentTermExists(
      createInterestDto.paymentTerm
    )
    if (paymentTermExists) {
      throw new DuplicatePaymentTermException(createInterestDto.paymentTerm)
    }

    // Crear configuración de interés
    const interest = new Interest()
    interest.paymentTerm = createInterestDto.paymentTerm
    interest.interest = createInterestDto.interest

    const savedInterest = await this.interestRepository.save(interest)
    return this.mapToResponseDto(savedInterest)
  }

  /**
   * Obtiene todas las configuraciones de interés
   */
  async getAllInterests(): Promise<InterestResponseDto[]> {
    const interests = await this.interestRepository.findAll()
    return interests.map((interest) => this.mapToResponseDto(interest))
  }

  /**
   * Obtiene una configuración de interés por ID
   */
  async getInterestById(id: string): Promise<InterestResponseDto> {
    const interest = await this.interestRepository.findOne({ where: { id } })
    if (!interest) {
      throw new InterestNotFoundException(id)
    }
    return this.mapToResponseDto(interest)
  }

  /**
   * Obtiene configuración de interés por plazo de pago
   */
  async getInterestByPaymentTerm(paymentTerm: number): Promise<InterestResponseDto> {
    const interest = await this.interestRepository.findByPaymentTerm(paymentTerm)
    if (!interest) {
      throw new PaymentTermNotFoundException(paymentTerm)
    }
    return this.mapToResponseDto(interest)
  }

  /**
   * Obtiene la tasa de interés por plazo de pago
   */
  async getInterestRateByPaymentTerm(paymentTerm: number): Promise<number> {
    const interestRate = await this.interestRepository.getInterestRateByPaymentTerm(paymentTerm)
    if (interestRate === null) {
      throw new PaymentTermNotFoundException(paymentTerm)
    }
    return interestRate
  }

  /**
   * Actualiza una configuración de interés
   */
  async updateInterest(
    id: string,
    updateInterestDto: UpdateInterestDto
  ): Promise<InterestResponseDto> {
    // Validar datos de entrada
    const validationErrors = validateUpdateInterestDto(updateInterestDto)
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors)
    }

    // Verificar que la configuración existe
    const existingInterest = await this.interestRepository.findOne({ where: { id } })
    if (!existingInterest) {
      throw new InterestNotFoundException(id)
    }

    // Verificar plazo de pago único si se está actualizando
    if (updateInterestDto.paymentTerm !== undefined) {
      const paymentTermExists = await this.interestRepository.paymentTermExists(
        updateInterestDto.paymentTerm,
        id
      )
      if (paymentTermExists) {
        throw new DuplicatePaymentTermException(updateInterestDto.paymentTerm)
      }
    }

    // Actualizar campos proporcionados
    if (updateInterestDto.paymentTerm !== undefined) {
      existingInterest.paymentTerm = updateInterestDto.paymentTerm
    }
    if (updateInterestDto.interest !== undefined) {
      existingInterest.interest = updateInterestDto.interest
    }

    const updatedInterest = await this.interestRepository.save(existingInterest)
    return this.mapToResponseDto(updatedInterest)
  }

  /**
   * Actualiza la tasa de interés para un plazo de pago específico
   */
  async updateInterestRateByPaymentTerm(
    paymentTerm: number,
    interestRate: number
  ): Promise<InterestResponseDto> {
    // Validar entrada
    if (typeof interestRate !== 'number' || interestRate < 0 || interestRate > 100) {
      throw new ValidationException(['La tasa de interés debe ser un número entre 0 y 100'])
    }

    // Verificar que la configuración existe
    const existingInterest = await this.interestRepository.findByPaymentTerm(paymentTerm)
    if (!existingInterest) {
      throw new PaymentTermNotFoundException(paymentTerm)
    }

    await this.interestRepository.updateInterestRate(paymentTerm, interestRate)

    // Obtener la configuración actualizada
    const updatedInterest = await this.interestRepository.findByPaymentTerm(paymentTerm)
    return this.mapToResponseDto(updatedInterest!)
  }

  /**
   * Elimina una configuración de interés
   */
  async deleteInterest(id: string): Promise<void> {
    const interest = await this.interestRepository.findOne({ where: { id } })
    if (!interest) {
      throw new InterestNotFoundException(id)
    }

    await this.interestRepository.remove(interest)
  }

  /**
   * Elimina configuración de interés por plazo de pago
   */
  async deleteByPaymentTerm(paymentTerm: number): Promise<void> {
    const interest = await this.interestRepository.findByPaymentTerm(paymentTerm)
    if (!interest) {
      throw new PaymentTermNotFoundException(paymentTerm)
    }

    await this.interestRepository.deleteByPaymentTerm(paymentTerm)
  }

  /**
   * Obtiene todos los plazos de pago disponibles
   */
  async getAvailablePaymentTerms(): Promise<number[]> {
    return await this.interestRepository.getAvailablePaymentTerms()
  }

  /**
   * Obtiene configuraciones de interés dentro de un rango de plazos
   */
  async getInterestsByPaymentTermRange(
    minTerm: number,
    maxTerm: number
  ): Promise<InterestResponseDto[]> {
    if (minTerm < 0 || maxTerm < 0 || minTerm > maxTerm) {
      throw new ValidationException(['El rango de plazos de pago debe ser válido'])
    }

    const interests = await this.interestRepository.findByPaymentTermRange(minTerm, maxTerm)
    return interests.map((interest) => this.mapToResponseDto(interest))
  }

  /**
   * Verifica si existe una configuración para un plazo de pago
   */
  async paymentTermExists(paymentTerm: number): Promise<boolean> {
    return await this.interestRepository.paymentTermExists(paymentTerm)
  }

  /**
   * Crea configuraciones de interés por defecto
   */
  async createDefaultInterestConfigurations(): Promise<InterestResponseDto[]> {
    const defaultConfigurations = [
      { paymentTerm: 1, interest: 0 }, // Sin interés para pago único
      { paymentTerm: 3, interest: 5 }, // 5% para 3 cuotas
      { paymentTerm: 6, interest: 10 }, // 10% para 6 cuotas
      { paymentTerm: 12, interest: 15 }, // 15% para 12 cuotas
      { paymentTerm: 24, interest: 25 } // 25% para 24 cuotas
    ]

    const createdConfigurations: InterestResponseDto[] = []

    for (const config of defaultConfigurations) {
      try {
        const created = await this.createInterest(config)
        createdConfigurations.push(created)
      } catch (error) {
        // Ignorar errores de duplicados si ya existen
        if (!(error instanceof DuplicatePaymentTermException)) {
          throw error
        }
      }
    }

    return createdConfigurations
  }

  /**
   * Mapea una entidad Interest a InterestResponseDto
   */
  private mapToResponseDto(interest: Interest): InterestResponseDto {
    return {
      id: interest.id,
      paymentTerm: interest.paymentTerm,
      interest: interest.interest,
      createdAt: interest.createdAt,
      updatedAt: interest.updatedAt
    }
  }
}
