// Validation utilities for forms

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface UserFormData {
  nombre: string
  apellido: string
  email: string
  telefono: string
  direccion: string
}

export interface BudgetFormData {
  code: string
  baseAmount: string
  interestPercentage: string
  paymentTerm: string
  userId: string
  _expirationDate: string
}

// Email validation regex
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Phone validation (basic format)
const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7
}

// Validate user form data
export const validateUserForm = (data: UserFormData): ValidationResult => {
  const errors: string[] = []

  // Validate nombre (required)
  if (!data.nombre || data.nombre.trim().length === 0) {
    errors.push('El nombre es requerido')
  } else if (data.nombre.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres')
  }

  // Validate apellido (required)
  if (!data.apellido || data.apellido.trim().length === 0) {
    errors.push('El apellido es requerido')
  } else if (data.apellido.trim().length < 2) {
    errors.push('El apellido debe tener al menos 2 caracteres')
  }

  // Validate email (required)
  if (!data.email || data.email.trim().length === 0) {
    errors.push('El email es requerido')
  } else if (!isValidEmail(data.email)) {
    errors.push('Debe ser un email válido')
  }

  // Validate telefono (required)
  if (!data.telefono || data.telefono.trim().length === 0) {
    errors.push('El teléfono es requerido')
  } else if (!isValidPhone(data.telefono)) {
    errors.push('El teléfono debe tener un formato válido')
  }

  // Validate direccion (optional, but if provided should have minimum length)
  if (data.direccion && data.direccion.trim().length > 0 && data.direccion.trim().length < 5) {
    errors.push('La dirección debe tener al menos 5 caracteres')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Validate individual fields for real-time validation
export const validateField = (fieldName: keyof UserFormData, value: string): string[] => {
  const errors: string[] = []

  switch (fieldName) {
    case 'nombre':
      if (!value || value.trim().length === 0) {
        errors.push('El nombre es requerido')
      } else if (value.trim().length < 2) {
        errors.push('El nombre debe tener al menos 2 caracteres')
      }
      break

    case 'apellido':
      if (!value || value.trim().length === 0) {
        errors.push('El apellido es requerido')
      } else if (value.trim().length < 2) {
        errors.push('El apellido debe tener al menos 2 caracteres')
      }
      break

    case 'email':
      if (!value || value.trim().length === 0) {
        errors.push('El email es requerido')
      } else if (!isValidEmail(value)) {
        errors.push('Debe ser un email válido')
      }
      break

    case 'telefono':
      if (!value || value.trim().length === 0) {
        errors.push('El teléfono es requerido')
      } else if (!isValidPhone(value)) {
        errors.push('El teléfono debe tener un formato válido')
      }
      break

    case 'direccion':
      if (value && value.trim().length > 0 && value.trim().length < 5) {
        errors.push('La dirección debe tener al menos 5 caracteres')
      }
      break
  }

  return errors
}

// Validate budget form data
export const validateBudgetForm = (data: BudgetFormData): ValidationResult => {
  const errors: string[] = []

  // Validate code (required)
  if (!data.code || data.code.trim().length === 0) {
    errors.push('El código es requerido')
  } else if (data.code.trim().length < 3) {
    errors.push('El código debe tener al menos 3 caracteres')
  }

  // Validate baseAmount (required, positive number)
  if (!data.baseAmount || data.baseAmount.trim().length === 0) {
    errors.push('El monto base es requerido')
  } else {
    const amount = parseFloat(data.baseAmount)
    if (isNaN(amount) || amount <= 0) {
      errors.push('El monto base debe ser un número positivo')
    }
  }

  // Validate interestPercentage (required, positive number)
  if (!data.interestPercentage || data.interestPercentage.trim().length === 0) {
    errors.push('El porcentaje de interés es requerido')
  } else {
    const percentage = parseFloat(data.interestPercentage)
    if (isNaN(percentage) || percentage < 0) {
      errors.push('El porcentaje de interés debe ser un número no negativo')
    }
  }

  // Validate paymentTerm (required, positive integer)
  if (!data.paymentTerm || data.paymentTerm.trim().length === 0) {
    errors.push('El plazo de pago es requerido')
  } else {
    const term = parseInt(data.paymentTerm)
    if (isNaN(term) || term <= 0) {
      errors.push('El plazo de pago debe ser un número entero positivo')
    }
  }

  // Validate userId (required)
  if (!data.userId || data.userId.trim().length === 0) {
    errors.push('Debe seleccionar un usuario')
  }

  // Validate expiration date (required, future date)
  if (!data._expirationDate || data._expirationDate.trim().length === 0) {
    errors.push('La fecha de expiración es requerida')
  } else {
    const expirationDate = new Date(data._expirationDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (isNaN(expirationDate.getTime())) {
      errors.push('La fecha de expiración debe ser válida')
    } else if (expirationDate <= today) {
      errors.push('La fecha de expiración debe ser en el futuro')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Validate individual budget fields for real-time validation
export const validateBudgetField = (fieldName: keyof BudgetFormData, value: string): string[] => {
  const errors: string[] = []

  switch (fieldName) {
    case 'code':
      if (!value || value.trim().length === 0) {
        errors.push('El código es requerido')
      } else if (value.trim().length < 3) {
        errors.push('El código debe tener al menos 3 caracteres')
      }
      break

    case 'baseAmount':
      if (!value || value.trim().length === 0) {
        errors.push('El monto base es requerido')
      } else {
        const amount = parseFloat(value)
        if (isNaN(amount) || amount <= 0) {
          errors.push('El monto base debe ser un número positivo')
        }
      }
      break

    case 'interestPercentage':
      if (!value || value.trim().length === 0) {
        errors.push('El porcentaje de interés es requerido')
      } else {
        const percentage = parseFloat(value)
        if (isNaN(percentage) || percentage < 0) {
          errors.push('El porcentaje de interés debe ser un número no negativo')
        }
      }
      break

    case 'paymentTerm':
      if (!value || value.trim().length === 0) {
        errors.push('El plazo de pago es requerido')
      } else {
        const term = parseInt(value)
        if (isNaN(term) || term <= 0) {
          errors.push('El plazo de pago debe ser un número entero positivo')
        }
      }
      break

    case 'userId':
      if (!value || value.trim().length === 0) {
        errors.push('Debe seleccionar un usuario')
      }
      break

    case '_expirationDate':
      if (!value || value.trim().length === 0) {
        errors.push('La fecha de expiración es requerida')
      } else {
        const expirationDate = new Date(value)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (isNaN(expirationDate.getTime())) {
          errors.push('La fecha de expiración debe ser válida')
        } else if (expirationDate <= today) {
          errors.push('La fecha de expiración debe ser en el futuro')
        }
      }
      break
  }

  return errors
}
