export interface CreateQuotaDto {
  amount: number
  budgetId: string
}

export interface UpdateQuotaDto {
  amount?: number
}

export interface QuotaResponseDto {
  id: string
  _creationDate: Date
  amount: number
  budget?: BudgetResponseDto
}

// Import interface (will be resolved when BudgetResponseDto is created)
interface BudgetResponseDto {
  id: string
  code: string
  totalAmount: number
  currentStatus: string
}

export const validateCreateQuotaDto = (dto: CreateQuotaDto): string[] => {
  const errors: string[] = []

  if (dto.amount === undefined || dto.amount === null) {
    errors.push('La cantidad debe ser definida')
  } else if (typeof dto.amount !== 'number' || dto.amount <= 0) {
    errors.push('La cantidad debe ser un numero positivo')
  }

  if (!dto.budgetId || dto.budgetId.trim().length === 0) {
    errors.push('El id del presupuesto es requerido y no puede estar vacio')
  }

  return errors
}

export const validateUpdateQuotaDto = (dto: UpdateQuotaDto): string[] => {
  const errors: string[] = []

  if (dto.amount !== undefined) {
    if (dto.amount === null || typeof dto.amount !== 'number' || dto.amount <= 0) {
      errors.push('La cantidad debe ser positiva')
    }
  }

  return errors
}
