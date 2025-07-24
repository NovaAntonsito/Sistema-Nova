export interface CreateInterestDto {
  paymentTerm: number
  interest: number
}

export interface UpdateInterestDto {
  paymentTerm?: number
  interest?: number
}

export interface InterestResponseDto {
  id: string
  paymentTerm: number
  interest: number
  createdAt: Date
  updatedAt: Date
}

// Validation helper functions
export const validateCreateInterestDto = (dto: CreateInterestDto): string[] => {
  const errors: string[] = []

  if (dto.paymentTerm === undefined || dto.paymentTerm === null) {
    errors.push('El pago requiere un plazo')
  } else if (!Number.isInteger(dto.paymentTerm) || dto.paymentTerm <= 0) {
    errors.push('El plazo del pago tiene que ser un numero positivo')
  }

  if (dto.interest === undefined || dto.interest === null) {
    errors.push('El interes es requerido')
  } else if (typeof dto.interest !== 'number' || dto.interest < 0) {
    errors.push('El interes no puede ser un numero negativo')
  } else if (dto.interest > 100) {
    errors.push('El interes no puede exceder del 100%')
  }

  return errors
}

export const validateUpdateInterestDto = (dto: UpdateInterestDto): string[] => {
  const errors: string[] = []

  if (dto.paymentTerm !== undefined) {
    if (dto.paymentTerm === null || !Number.isInteger(dto.paymentTerm) || dto.paymentTerm <= 0) {
      errors.push('El pago requiere un plazo positivo si se actualiza')
    }
  }

  if (dto.interest !== undefined) {
    if (dto.interest === null || typeof dto.interest !== 'number' || dto.interest < 0) {
      errors.push('El interes no puede ser negativo si se actualiza')
    } else if (dto.interest > 100) {
      errors.push('El interes no puede del 100% si se actualiza')
    }
  }

  return errors
}
