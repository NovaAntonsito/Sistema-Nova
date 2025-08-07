import { FORM_VALIDATION } from './constants'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface FieldValidationResult {
  isValid: boolean
  error: string | null
}

// Generic validation function
export const validateField = (value: any, rules: ValidationRule): FieldValidationResult => {
  const errors: string[] = []

  // Required validation
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    errors.push('Este campo es obligatorio')
  }

  // Skip other validations if field is empty and not required
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return {
      isValid: errors.length === 0,
      error: errors[0] || null
    }
  }

  // String-specific validations
  if (typeof value === 'string') {
    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`Debe tener al menos ${rules.minLength} caracteres`)
    }

    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`No puede tener más de ${rules.maxLength} caracteres`)
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push('El formato no es válido')
    }
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value)
    if (customError) {
      errors.push(customError)
    }
  }

  return {
    isValid: errors.length === 0,
    error: errors[0] || null
  }
}

// User form validation rules
export const userValidationRules = {
  nombre: {
    required: true,
    minLength: 2,
    maxLength: FORM_VALIDATION.MAX_TEXT_LENGTH,
    custom: (value: string) => {
      if (value && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) {
        return 'Solo se permiten letras y espacios'
      }
      return null
    }
  },
  apellido: {
    required: true,
    minLength: 2,
    maxLength: FORM_VALIDATION.MAX_TEXT_LENGTH,
    custom: (value: string) => {
      if (value && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) {
        return 'Solo se permiten letras y espacios'
      }
      return null
    }
  },
  email: {
    required: true,
    maxLength: FORM_VALIDATION.MAX_TEXT_LENGTH,
    pattern: FORM_VALIDATION.EMAIL_REGEX,
    custom: (value: string) => {
      if (value && !FORM_VALIDATION.EMAIL_REGEX.test(value)) {
        return 'Ingrese un email válido'
      }
      return null
    }
  },
  telefono: {
    required: false,
    maxLength: 20,
    custom: (value: string) => {
      if (value && value.trim() && !FORM_VALIDATION.PHONE_REGEX.test(value)) {
        return 'Ingrese un número de teléfono válido'
      }
      return null
    }
  },
  direccion: {
    required: false,
    maxLength: FORM_VALIDATION.MAX_DESCRIPTION_LENGTH
  }
} as const

// Budget form validation rules
export const budgetValidationRules = {
  code: {
    required: true,
    minLength: 3,
    maxLength: 50,
    custom: (value: string) => {
      if (value && !/^[A-Z0-9-_]+$/.test(value)) {
        return 'Solo se permiten letras mayúsculas, números, guiones y guiones bajos'
      }
      return null
    }
  },
  baseAmount: {
    required: true,
    custom: (value: number | string) => {
      const numValue = typeof value === 'string' ? parseFloat(value) : value
      if (isNaN(numValue) || numValue <= 0) {
        return 'Debe ser un número mayor a 0'
      }
      if (numValue > 999999999) {
        return 'El monto es demasiado alto'
      }
      return null
    }
  },
  interestPercentage: {
    required: true,
    custom: (value: number | string) => {
      const numValue = typeof value === 'string' ? parseFloat(value) : value
      if (isNaN(numValue) || numValue < 0) {
        return 'Debe ser un número mayor o igual a 0'
      }
      if (numValue > 100) {
        return 'El porcentaje no puede ser mayor a 100%'
      }
      return null
    }
  },
  paymentTerm: {
    required: true,
    custom: (value: number | string) => {
      const numValue = typeof value === 'string' ? parseInt(value, 10) : value
      if (isNaN(numValue) || numValue <= 0) {
        return 'Debe ser un número entero mayor a 0'
      }
      if (numValue > 360) {
        return 'El plazo no puede ser mayor a 360 meses'
      }
      return null
    }
  },
  userId: {
    required: true,
    custom: (value: string) => {
      if (!value || value.trim() === '') {
        return 'Debe seleccionar un usuario'
      }
      return null
    }
  },
  description: {
    required: false,
    maxLength: FORM_VALIDATION.MAX_DESCRIPTION_LENGTH
  }
} as const

// Validate entire form
export const validateForm = <T extends Record<string, any>>(
  data: T,
  rules: Record<keyof T, ValidationRule>
): ValidationResult & { fieldErrors: Record<keyof T, string | null> } => {
  const fieldErrors = {} as Record<keyof T, string | null>
  let isValid = true
  const errors: string[] = []

  for (const field in rules) {
    const fieldResult = validateField(data[field], rules[field])
    fieldErrors[field] = fieldResult.error

    if (!fieldResult.isValid) {
      isValid = false
      if (fieldResult.error) {
        errors.push(`${String(field)}: ${fieldResult.error}`)
      }
    }
  }

  return {
    isValid,
    errors,
    fieldErrors
  }
}

// Specific validation functions for forms
export const validateUserForm = (userData: {
  nombre: string
  apellido: string
  email: string
  telefono?: string
  direccion?: string
}) => {
  return validateForm(userData, userValidationRules)
}

export const validateBudgetForm = (budgetData: {
  code: string
  baseAmount: number | string
  interestPercentage: number | string
  paymentTerm: number | string
  userId: string
  description?: string
}) => {
  return validateForm(budgetData, budgetValidationRules)
}

// Real-time validation helpers
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Format validation error messages
export const formatValidationErrors = (errors: string[]): string => {
  if (errors.length === 0) return ''
  if (errors.length === 1) return errors[0]
  return `Se encontraron ${errors.length} errores:\n${errors.map((e) => `• ${e}`).join('\n')}`
}
