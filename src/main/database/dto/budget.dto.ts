import { Status } from '../entities/Status'

export interface CreateBudgetDto {
  _expirationDate: Date
  baseAmount: number
  paymentTerm: number
  userId: string
  code?: string
}

export interface UpdateBudgetDto {
  quotaToAdd?: {
    amount: number
  }
}

export interface BudgetResponseDto {
  id: string
  _creationDate: Date
  _expirationDate: Date
  currentStatus: Status
  totalAmount: number
  currentInterest: number
  paymentTerm: number
  code: string
  quotaList?: QuotaResponseDto[]
  user?: UserResponseDto
  updatedAt: Date
}

interface QuotaResponseDto {
  id: string
  _creationDate: Date
  amount: number
}

interface UserResponseDto {
  id: string
  nombre: string
  email: string
  phoneNumber: string
}

export const validateCreateBudgetDto = (dto: CreateBudgetDto): string[] => {
  const errors: string[] = []

  if (!dto._expirationDate) {
    errors.push('La fecha de expiracion es requerida')
  } else if (!(dto._expirationDate instanceof Date) || isNaN(dto._expirationDate.getTime())) {
    errors.push('La fecha de expiracion debe ser valida')
  } else if (dto._expirationDate <= new Date()) {
    errors.push('La fecha de expiracion debe ser en el futuro, idiota')
  }

  if (dto.baseAmount === undefined || dto.baseAmount === null) {
    errors.push('El cantidad base es requerida')
  } else if (typeof dto.baseAmount !== 'number' || dto.baseAmount <= 0) {
    errors.push('La cantidad base debe ser un numero positivo')
  }

  if (dto.paymentTerm === undefined || dto.paymentTerm === null) {
    errors.push('El plazo del pago es requerid')
  } else if (!Number.isInteger(dto.paymentTerm) || dto.paymentTerm <= 0) {
    errors.push('El plazo del pago debe ser positivo')
  }

  if (!dto.userId || dto.userId.trim().length === 0) {
    errors.push('El id del presupuestario es requerido')
  }

  if (dto.code !== undefined && (!dto.code || dto.code.trim().length === 0)) {
    errors.push('El codigo es requerido si se actualiza')
  }

  return errors
}

export const validateUpdateBudgetDto = (dto: UpdateBudgetDto): string[] => {
  const errors: string[] = []

  if (dto.quotaToAdd) {
    if (dto.quotaToAdd.amount === undefined || dto.quotaToAdd.amount === null) {
      errors.push('Se requiere poner una couta a pagar')
    } else if (typeof dto.quotaToAdd.amount !== 'number' || dto.quotaToAdd.amount <= 0) {
      errors.push('La couta debe ser un numero positivo')
    }
  }

  return errors
}
