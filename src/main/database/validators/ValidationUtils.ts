/**
 * Utilidades para validación de datos de importación
 * Cumple con requisitos: 1.3, 2.3, 2.4, 3.3, 4.3, 4.4, 6.1, 6.2, 6.3
 */

import { ValidationError, ValidationWarning, EntityType } from '../types/import.types'

/**
 * Reglas de validación configurables
 */
export interface ValidationRules {
  // Reglas para IDs
  idFormat: 'uuid' | 'numeric' | 'alphanumeric'

  // Reglas para emails
  emailRequired: boolean
  emailUnique: boolean

  // Reglas para fechas
  dateFormat: 'iso' | 'custom'
  customDateFormat?: string

  // Reglas para montos
  minAmount: number
  maxAmount: number

  // Reglas para porcentajes
  minPercentage: number
  maxPercentage: number

  // Reglas para teléfonos
  phoneRequired: boolean
  phoneMinLength: number
  phoneMaxLength: number
}

/**
 * Configuración de validación por defecto
 */
export const DEFAULT_VALIDATION_RULES: ValidationRules = {
  idFormat: 'uuid',
  emailRequired: true,
  emailUnique: true,
  dateFormat: 'iso',
  minAmount: 0,
  maxAmount: Number.MAX_SAFE_INTEGER,
  minPercentage: 0,
  maxPercentage: 100,
  phoneRequired: false,
  phoneMinLength: 7,
  phoneMaxLength: 20
}

/**
 * Utilidades de validación
 */
export class ValidationUtils {
  /**
   * Valida formato de UUID v4
   */
  static isValidUUID(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
  }

  /**
   * Valida formato de email
   */
  static isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string' || email.length === 0) {
      return false
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email) && email.length <= 254
  }

  /**
   * Valida formato de teléfono
   */
  static isValidPhone(phone: string, rules: ValidationRules = DEFAULT_VALIDATION_RULES): boolean {
    // Remover caracteres no numéricos para validar longitud
    const digitsOnly = phone.replace(/\D/g, '')

    // Validar longitud
    if (digitsOnly.length < rules.phoneMinLength || digitsOnly.length > rules.phoneMaxLength) {
      return false
    }

    // Validar formato básico (números, espacios, guiones, paréntesis, +)
    const phoneRegex = /^[\d\s\-\(\)\+]+$/
    return phoneRegex.test(phone)
  }

  /**
   * Valida formato de fecha ISO 8601
   */
  static isValidISODate(dateStr: string): boolean {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
      return false
    }

    // Verificar formato ISO básico
    const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/
    if (!isoRegex.test(dateStr)) {
      return false
    }

    const date = new Date(dateStr)
    return !isNaN(date.getTime()) && date.toISOString().startsWith(dateStr.substring(0, 10))
  }

  /**
   * Valida formato de fecha personalizado
   */
  static isValidCustomDate(dateStr: string, format: string): boolean {
    // Implementación básica para formatos comunes
    // En una implementación real, se usaría una librería como moment.js o date-fns

    if (format === 'DD/MM/YYYY') {
      const regex = /^\d{2}\/\d{2}\/\d{4}$/
      if (!regex.test(dateStr)) return false

      const [day, month, year] = dateStr.split('/').map(Number)
      const date = new Date(year, month - 1, day)
      return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    }

    // Por defecto, usar validación ISO
    return this.isValidISODate(dateStr)
  }

  /**
   * Valida que un valor esté dentro de un rango numérico
   */
  static isInRange(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && !isNaN(value) && value >= min && value <= max
  }

  /**
   * Valida que un valor sea un número positivo
   */
  static isPositiveNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value) && value > 0
  }

  /**
   * Valida que un valor sea un número no negativo
   */
  static isNonNegativeNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value) && value >= 0
  }

  /**
   * Valida que un valor esté en una lista de valores permitidos
   */
  static isInAllowedValues<T>(value: T, allowedValues: T[]): boolean {
    return allowedValues.includes(value)
  }

  /**
   * Valida longitud de string
   */
  static isValidStringLength(value: string, minLength: number, maxLength: number): boolean {
    return typeof value === 'string' && value.length >= minLength && value.length <= maxLength
  }

  /**
   * Sanitiza un string removiendo caracteres peligrosos
   */
  static sanitizeString(value: string): string {
    if (typeof value !== 'string') {
      return String(value)
    }

    // Remover caracteres de control y caracteres peligrosos para CSV
    return value
      .replace(/[\x00-\x1F\x7F]/g, '') // Caracteres de control
      .replace(/"/g, ' ') // Comillas
      .replace(/\r/g, ' ') // Retorno de carro
      .replace(/\n/g, ' ') // Nueva línea
      .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
      .trim()
  }

  /**
   * Crea un error de validación estandarizado
   */
  static createValidationError(
    line: number,
    field: string,
    value: any,
    message: string,
    code: string
  ): ValidationError {
    return {
      line,
      field,
      value,
      message,
      code
    }
  }

  /**
   * Crea una advertencia de validación estandarizada
   */
  static createValidationWarning(
    line: number,
    field: string,
    value: any,
    message: string,
    code: string
  ): ValidationWarning {
    return {
      line,
      field,
      value,
      message,
      code
    }
  }

  /**
   * Valida campos requeridos en un objeto
   */
  static validateRequiredFields(
    data: Record<string, any>,
    requiredFields: string[],
    lineNumber: number
  ): ValidationError[] {
    const errors: ValidationError[] = []

    for (const field of requiredFields) {
      const value = data[field]
      if (value === undefined || value === null || value === '') {
        errors.push(
          this.createValidationError(
            lineNumber,
            field,
            value,
            `Campo requerido faltante: ${field}`,
            'REQUIRED_FIELD_MISSING'
          )
        )
      }
    }

    return errors
  }

  /**
   * Valida tipos de datos
   */
  static validateDataTypes(
    data: Record<string, any>,
    typeDefinitions: Record<string, 'string' | 'number' | 'boolean' | 'date'>,
    lineNumber: number
  ): ValidationError[] {
    const errors: ValidationError[] = []

    for (const [field, expectedType] of Object.entries(typeDefinitions)) {
      const value = data[field]

      if (value === undefined || value === null) {
        continue // Los campos opcionales se validan por separado
      }

      let isValidType = false

      switch (expectedType) {
        case 'string':
          isValidType = typeof value === 'string'
          break
        case 'number':
          isValidType = typeof value === 'number' && !isNaN(value)
          break
        case 'boolean':
          isValidType = typeof value === 'boolean'
          break
        case 'date':
          isValidType = this.isValidISODate(value)
          break
      }

      if (!isValidType) {
        errors.push(
          this.createValidationError(
            lineNumber,
            field,
            value,
            `Tipo de dato inválido para ${field}, se esperaba ${expectedType}`,
            'INVALID_DATA_TYPE'
          )
        )
      }
    }

    return errors
  }

  /**
   * Obtiene el esquema de validación para un tipo de entidad
   */
  static getEntityValidationSchema(entityType: EntityType): {
    requiredFields: string[]
    optionalFields: string[]
    typeDefinitions: Record<string, 'string' | 'number' | 'boolean' | 'date'>
  } {
    switch (entityType) {
      case EntityType.USER:
        return {
          requiredFields: [
            'id',
            'nombre',
            'email',
            'phoneNumber',
            'isDeleted',
            'createdAt',
            'updatedAt'
          ],
          optionalFields: [],
          typeDefinitions: {
            id: 'string',
            nombre: 'string',
            email: 'string',
            phoneNumber: 'string',
            isDeleted: 'boolean',
            createdAt: 'date',
            updatedAt: 'date'
          }
        }

      case EntityType.BUDGET:
        return {
          requiredFields: [
            'id',
            '_creationDate',
            '_expirationDate',
            'currentStatus',
            'totalAmount',
            'currentInterest',
            'paymentTerm',
            'code',
            'userId',
            'isDeleted',
            'updatedAt'
          ],
          optionalFields: [],
          typeDefinitions: {
            id: 'string',
            _creationDate: 'date',
            _expirationDate: 'date',
            currentStatus: 'string',
            totalAmount: 'number',
            currentInterest: 'number',
            paymentTerm: 'number',
            code: 'string',
            userId: 'string',
            isDeleted: 'boolean',
            updatedAt: 'date'
          }
        }

      case EntityType.QUOTA:
        return {
          requiredFields: ['id', '_creationDate', 'amount', 'budgetId', 'isDeleted'],
          optionalFields: [],
          typeDefinitions: {
            id: 'string',
            _creationDate: 'date',
            amount: 'number',
            budgetId: 'string',
            isDeleted: 'boolean'
          }
        }

      case EntityType.INTEREST:
        return {
          requiredFields: [
            'id',
            'paymentTerm',
            'interestPercentage',
            'isActive',
            'createdAt',
            'updatedAt'
          ],
          optionalFields: [],
          typeDefinitions: {
            id: 'string',
            paymentTerm: 'number',
            interestPercentage: 'number',
            isActive: 'boolean',
            createdAt: 'date',
            updatedAt: 'date'
          }
        }

      default:
        return {
          requiredFields: [],
          optionalFields: [],
          typeDefinitions: {}
        }
    }
  }

  /**
   * Formatea errores de validación para mostrar al usuario
   */
  static formatValidationErrors(errors: ValidationError[]): string {
    if (errors.length === 0) {
      return 'No hay errores de validación'
    }

    const errorsByLine = new Map<number, ValidationError[]>()

    // Agrupar errores por línea
    for (const error of errors) {
      if (!errorsByLine.has(error.line)) {
        errorsByLine.set(error.line, [])
      }
      errorsByLine.get(error.line)!.push(error)
    }

    // Formatear errores
    const formattedErrors: string[] = []

    for (const [line, lineErrors] of errorsByLine.entries()) {
      formattedErrors.push(`Línea ${line}:`)
      for (const error of lineErrors) {
        formattedErrors.push(`  - ${error.field}: ${error.message}`)
      }
    }

    return formattedErrors.join('\n')
  }

  /**
   * Formatea advertencias de validación para mostrar al usuario
   */
  static formatValidationWarnings(warnings: ValidationWarning[]): string {
    if (warnings.length === 0) {
      return 'No hay advertencias de validación'
    }

    const warningsByLine = new Map<number, ValidationWarning[]>()

    // Agrupar advertencias por línea
    for (const warning of warnings) {
      if (!warningsByLine.has(warning.line)) {
        warningsByLine.set(warning.line, [])
      }
      warningsByLine.get(warning.line)!.push(warning)
    }

    // Formatear advertencias
    const formattedWarnings: string[] = []

    for (const [line, lineWarnings] of warningsByLine.entries()) {
      formattedWarnings.push(`Línea ${line}:`)
      for (const warning of lineWarnings) {
        formattedWarnings.push(`  - ${warning.field}: ${warning.message}`)
      }
    }

    return formattedWarnings.join('\n')
  }
}
