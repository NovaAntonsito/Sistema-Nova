/**
 * Exportaciones del sistema de validación de importación CSV
 * Cumple con requisitos: 1.3, 2.3, 2.4, 3.3, 4.3, 4.4, 6.1, 6.2, 6.3
 */

// Validador principal
export { DataValidator } from './DataValidator'

// Servicio de validación
export {
  ValidationService,
  type ValidationServiceConfig,
  type CompleteValidationResult,
  DEFAULT_VALIDATION_CONFIG
} from './ValidationService'

// Utilidades de validación
export { ValidationUtils, type ValidationRules, DEFAULT_VALIDATION_RULES } from './ValidationUtils'

// Excepciones de validación
export {
  ImportValidationException,
  CSVParseException,
  DataValidationException,
  ReferentialIntegrityException,
  DuplicateValueException,
  FieldFormatException,
  RequiredFieldException,
  ValueRangeException,
  ValidationExceptionFactory
} from './ValidationExceptions'

// Re-exportar tipos de validación desde types
export type { ValidationResult, ValidationError, ValidationWarning } from '../types/import.types'
