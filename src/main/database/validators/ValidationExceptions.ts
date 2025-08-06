/**
 * Excepciones específicas para el sistema de validación de importación
 * Cumple con requisitos: 6.1, 6.2, 6.3
 */

import { ValidationError, ValidationWarning } from '../types/import.types'

/**
 * Excepción base para errores de validación de importación
 */
export class ImportValidationException extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ImportValidationException'
  }
}

/**
 * Excepción para errores de parsing de CSV
 */
export class CSVParseException extends ImportValidationException {
  constructor(
    message: string,
    public line: number,
    public column?: number,
    public field?: string
  ) {
    super(message, 'CSV_PARSE_ERROR', { line, column, field })
    this.name = 'CSVParseException'
  }
}

/**
 * Excepción para errores de validación de datos
 */
export class DataValidationException extends ImportValidationException {
  constructor(
    message: string,
    public errors: ValidationError[],
    public warnings: ValidationWarning[] = []
  ) {
    super(message, 'DATA_VALIDATION_ERROR', { errors, warnings })
    this.name = 'DataValidationException'
  }

  /**
   * Obtiene un resumen de los errores
   */
  getErrorSummary(): string {
    const errorCount = this.errors.length
    const warningCount = this.warnings.length
    return `${errorCount} errores, ${warningCount} advertencias encontradas`
  }

  /**
   * Obtiene errores agrupados por línea
   */
  getErrorsByLine(): Map<number, ValidationError[]> {
    const errorsByLine = new Map<number, ValidationError[]>()

    for (const error of this.errors) {
      if (!errorsByLine.has(error.line)) {
        errorsByLine.set(error.line, [])
      }
      errorsByLine.get(error.line)!.push(error)
    }

    return errorsByLine
  }

  /**
   * Obtiene errores agrupados por código
   */
  getErrorsByCode(): Map<string, ValidationError[]> {
    const errorsByCode = new Map<string, ValidationError[]>()

    for (const error of this.errors) {
      if (!errorsByCode.has(error.code)) {
        errorsByCode.set(error.code, [])
      }
      errorsByCode.get(error.code)!.push(error)
    }

    return errorsByCode
  }
}

/**
 * Excepción para errores de integridad referencial
 */
export class ReferentialIntegrityException extends ImportValidationException {
  constructor(
    message: string,
    public entityType: string,
    public referenceId: string,
    public referencedEntityType: string,
    public line: number
  ) {
    super(message, 'REFERENTIAL_INTEGRITY_ERROR', {
      entityType,
      referenceId,
      referencedEntityType,
      line
    })
    this.name = 'ReferentialIntegrityException'
  }
}

/**
 * Excepción para errores de duplicados
 */
export class DuplicateValueException extends ImportValidationException {
  constructor(
    message: string,
    public field: string,
    public value: any,
    public originalLine: number,
    public duplicateLine: number
  ) {
    super(message, 'DUPLICATE_VALUE_ERROR', {
      field,
      value,
      originalLine,
      duplicateLine
    })
    this.name = 'DuplicateValueException'
  }
}

/**
 * Excepción para errores de formato de campo
 */
export class FieldFormatException extends ImportValidationException {
  constructor(
    message: string,
    public field: string,
    public value: any,
    public expectedFormat: string,
    public line: number
  ) {
    super(message, 'FIELD_FORMAT_ERROR', {
      field,
      value,
      expectedFormat,
      line
    })
    this.name = 'FieldFormatException'
  }
}

/**
 * Excepción para campos requeridos faltantes
 */
export class RequiredFieldException extends ImportValidationException {
  constructor(
    message: string,
    public field: string,
    public line: number
  ) {
    super(message, 'REQUIRED_FIELD_ERROR', { field, line })
    this.name = 'RequiredFieldException'
  }
}

/**
 * Excepción para errores de rango de valores
 */
export class ValueRangeException extends ImportValidationException {
  constructor(
    message: string,
    public field: string,
    public value: any,
    public minValue?: any,
    public maxValue?: any,
    public line?: number
  ) {
    super(message, 'VALUE_RANGE_ERROR', {
      field,
      value,
      minValue,
      maxValue,
      line
    })
    this.name = 'ValueRangeException'
  }
}

/**
 * Utilidad para crear excepciones desde resultados de validación
 */
export class ValidationExceptionFactory {
  /**
   * Crea una DataValidationException desde un resultado de validación
   */
  static fromValidationResult(
    result: { errors: ValidationError[]; warnings: ValidationWarning[] },
    entityType: string
  ): DataValidationException {
    const errorCount = result.errors.length
    const warningCount = result.warnings.length

    const message = `Validación fallida para ${entityType}: ${errorCount} errores, ${warningCount} advertencias`

    return new DataValidationException(message, result.errors, result.warnings)
  }

  /**
   * Crea una excepción específica basada en el código de error
   */
  static fromValidationError(error: ValidationError): ImportValidationException {
    switch (error.code) {
      case 'REQUIRED_FIELD_MISSING':
        return new RequiredFieldException(error.message, error.field, error.line)

      case 'INVALID_ID_FORMAT':
      case 'INVALID_EMAIL_FORMAT':
      case 'INVALID_DATE_FORMAT':
        return new FieldFormatException(
          error.message,
          error.field,
          error.value,
          this.getExpectedFormat(error.code),
          error.line
        )

      case 'DUPLICATE_EMAIL':
      case 'DUPLICATE_CODE':
      case 'DUPLICATE_PAYMENT_TERM':
        return new DuplicateValueException(
          error.message,
          error.field,
          error.value,
          0, // Original line would need to be tracked separately
          error.line
        )

      case 'REFERENTIAL_INTEGRITY_ERROR':
        return new ReferentialIntegrityException(
          error.message,
          'unknown', // Would need entity type context
          error.value,
          'unknown', // Would need referenced entity type context
          error.line
        )

      case 'INVALID_AMOUNT':
      case 'INVALID_INTEREST':
      case 'INVALID_INTEREST_PERCENTAGE':
        return new ValueRangeException(
          error.message,
          error.field,
          error.value,
          0,
          error.code === 'INVALID_INTEREST_PERCENTAGE' ? 100 : undefined,
          error.line
        )

      default:
        return new ImportValidationException(error.message, error.code, {
          field: error.field,
          value: error.value,
          line: error.line
        })
    }
  }

  private static getExpectedFormat(code: string): string {
    switch (code) {
      case 'INVALID_ID_FORMAT':
        return 'UUID v4 (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)'
      case 'INVALID_EMAIL_FORMAT':
        return 'email@domain.com'
      case 'INVALID_DATE_FORMAT':
        return 'ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)'
      default:
        return 'formato válido'
    }
  }
}
