/**
 * Servicio principal de validación para importación CSV
 * Cumple con requisitos: 1.3, 2.3, 2.4, 3.3, 4.3, 4.4, 6.1, 6.2, 6.3
 */

import { DataValidator } from './DataValidator'
import { ValidationUtils, ValidationRules, DEFAULT_VALIDATION_RULES } from './ValidationUtils'
import { DataValidationException, ValidationExceptionFactory } from './ValidationExceptions'
import {
  ValidationResult,
  UserImportData,
  BudgetImportData,
  QuotaImportData,
  InterestImportData,
  EntityType,
  ImportConfig
} from '../types/import.types'

/**
 * Configuración del servicio de validación
 */
export interface ValidationServiceConfig {
  validationRules: ValidationRules
  strictMode: boolean
  enableReferentialIntegrity: boolean
  enableDuplicateChecking: boolean
  maxErrorsPerEntity: number
}

/**
 * Configuración por defecto del servicio
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationServiceConfig = {
  validationRules: DEFAULT_VALIDATION_RULES,
  strictMode: true,
  enableReferentialIntegrity: true,
  enableDuplicateChecking: true,
  maxErrorsPerEntity: 100
}

/**
 * Resultado de validación completa
 */
export interface CompleteValidationResult {
  overallValid: boolean
  entityResults: Map<EntityType, ValidationResult>
  referentialIntegrityResult: ValidationResult
  totalErrors: number
  totalWarnings: number
  validationDuration: number
}

/**
 * Servicio principal de validación
 */
export class ValidationService {
  private dataValidator: DataValidator
  private config: ValidationServiceConfig

  constructor(config: ValidationServiceConfig = DEFAULT_VALIDATION_CONFIG) {
    this.dataValidator = new DataValidator()
    this.config = config
  }

  /**
   * Inicializa el servicio con datos existentes de la base de datos
   */
  async initialize(existingData: {
    userIds?: string[]
    budgetIds?: string[]
    interestTerms?: number[]
  }): Promise<void> {
    await this.dataValidator.initializeContext(existingData)
  }

  /**
   * Valida un conjunto completo de datos de importación
   */
  async validateImportData(data: {
    users?: UserImportData[]
    budgets?: BudgetImportData[]
    quotas?: QuotaImportData[]
    interests?: InterestImportData[]
  }): Promise<CompleteValidationResult> {
    const startTime = Date.now()
    const entityResults = new Map<EntityType, ValidationResult>()
    let totalErrors = 0
    let totalWarnings = 0

    try {
      // Validar cada tipo de entidad (temporalmente desactivar strict mode)
      const originalStrictMode = this.config.strictMode
      this.config.strictMode = false

      if (data.users && data.users.length > 0) {
        const userResult = await this.validateUsers(data.users)
        entityResults.set(EntityType.USER, userResult)
        totalErrors += userResult.errors.length
        totalWarnings += userResult.warnings.length
      }

      if (data.interests && data.interests.length > 0) {
        const interestResult = await this.validateInterests(data.interests)
        entityResults.set(EntityType.INTEREST, interestResult)
        totalErrors += interestResult.errors.length
        totalWarnings += interestResult.warnings.length
      }

      if (data.budgets && data.budgets.length > 0) {
        const budgetResult = await this.validateBudgets(data.budgets)
        entityResults.set(EntityType.BUDGET, budgetResult)
        totalErrors += budgetResult.errors.length
        totalWarnings += budgetResult.warnings.length
      }

      if (data.quotas && data.quotas.length > 0) {
        const quotaResult = await this.validateQuotas(data.quotas)
        entityResults.set(EntityType.QUOTA, quotaResult)
        totalErrors += quotaResult.errors.length
        totalWarnings += quotaResult.warnings.length
      }

      // Restaurar strict mode
      this.config.strictMode = originalStrictMode

      // Validar integridad referencial si está habilitada
      let referentialIntegrityResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      }

      if (this.config.enableReferentialIntegrity) {
        referentialIntegrityResult = await this.dataValidator.validateReferentialIntegrity(data)
        totalErrors += referentialIntegrityResult.errors.length
        totalWarnings += referentialIntegrityResult.warnings.length
      }

      const validationDuration = Date.now() - startTime
      const overallValid = totalErrors === 0

      return {
        overallValid,
        entityResults,
        referentialIntegrityResult,
        totalErrors,
        totalWarnings,
        validationDuration
      }
    } catch (error) {
      throw new DataValidationException(
        `Error durante la validación: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        [],
        []
      )
    }
  }

  /**
   * Valida datos de usuarios
   */
  async validateUsers(users: UserImportData[]): Promise<ValidationResult> {
    if (!users || users.length === 0) {
      return { isValid: true, errors: [], warnings: [] }
    }

    const result = await this.dataValidator.validateUsers(users)

    if (this.config.strictMode && !result.isValid) {
      throw ValidationExceptionFactory.fromValidationResult(result, 'usuarios')
    }

    return this.limitErrors(result)
  }

  /**
   * Valida datos de presupuestos
   */
  async validateBudgets(budgets: BudgetImportData[]): Promise<ValidationResult> {
    if (!budgets || budgets.length === 0) {
      return { isValid: true, errors: [], warnings: [] }
    }

    const result = await this.dataValidator.validateBudgets(budgets)

    if (this.config.strictMode && !result.isValid) {
      throw ValidationExceptionFactory.fromValidationResult(result, 'presupuestos')
    }

    return this.limitErrors(result)
  }

  /**
   * Valida datos de cuotas
   */
  async validateQuotas(quotas: QuotaImportData[]): Promise<ValidationResult> {
    if (!quotas || quotas.length === 0) {
      return { isValid: true, errors: [], warnings: [] }
    }

    const result = await this.dataValidator.validateQuotas(quotas)

    if (this.config.strictMode && !result.isValid) {
      throw ValidationExceptionFactory.fromValidationResult(result, 'cuotas')
    }

    return this.limitErrors(result)
  }

  /**
   * Valida datos de configuraciones de interés
   */
  async validateInterests(interests: InterestImportData[]): Promise<ValidationResult> {
    if (!interests || interests.length === 0) {
      return { isValid: true, errors: [], warnings: [] }
    }

    const result = await this.dataValidator.validateInterests(interests)

    if (this.config.strictMode && !result.isValid) {
      throw ValidationExceptionFactory.fromValidationResult(result, 'configuraciones de interés')
    }

    return this.limitErrors(result)
  }

  /**
   * Valida un archivo CSV individual
   */
  async validateEntityCSV<T>(data: T[], entityType: EntityType): Promise<ValidationResult> {
    switch (entityType) {
      case EntityType.USER:
        return this.validateUsers(data as UserImportData[])
      case EntityType.BUDGET:
        return this.validateBudgets(data as BudgetImportData[])
      case EntityType.QUOTA:
        return this.validateQuotas(data as QuotaImportData[])
      case EntityType.INTEREST:
        return this.validateInterests(data as InterestImportData[])
      default:
        throw new Error(`Tipo de entidad no soportado: ${entityType}`)
    }
  }

  /**
   * Genera un reporte de validación detallado
   */
  generateValidationReport(result: CompleteValidationResult): string {
    const report: string[] = []

    report.push('=== REPORTE DE VALIDACIÓN ===')
    report.push(`Estado general: ${result.overallValid ? 'VÁLIDO' : 'INVÁLIDO'}`)
    report.push(`Total de errores: ${result.totalErrors}`)
    report.push(`Total de advertencias: ${result.totalWarnings}`)
    report.push(`Duración de validación: ${result.validationDuration}ms`)
    report.push('')

    // Reporte por entidad
    for (const [entityType, entityResult] of result.entityResults.entries()) {
      report.push(`--- ${entityType.toUpperCase()} ---`)
      report.push(`Errores: ${entityResult.errors.length}`)
      report.push(`Advertencias: ${entityResult.warnings.length}`)

      if (entityResult.errors.length > 0) {
        report.push('Errores encontrados:')
        report.push(ValidationUtils.formatValidationErrors(entityResult.errors))
      }

      if (entityResult.warnings.length > 0) {
        report.push('Advertencias encontradas:')
        report.push(ValidationUtils.formatValidationWarnings(entityResult.warnings))
      }

      report.push('')
    }

    // Reporte de integridad referencial
    if (
      result.referentialIntegrityResult.errors.length > 0 ||
      result.referentialIntegrityResult.warnings.length > 0
    ) {
      report.push('--- INTEGRIDAD REFERENCIAL ---')
      report.push(`Errores: ${result.referentialIntegrityResult.errors.length}`)
      report.push(`Advertencias: ${result.referentialIntegrityResult.warnings.length}`)

      if (result.referentialIntegrityResult.errors.length > 0) {
        report.push('Errores de integridad referencial:')
        report.push(
          ValidationUtils.formatValidationErrors(result.referentialIntegrityResult.errors)
        )
      }

      if (result.referentialIntegrityResult.warnings.length > 0) {
        report.push('Advertencias de integridad referencial:')
        report.push(
          ValidationUtils.formatValidationWarnings(result.referentialIntegrityResult.warnings)
        )
      }
    }

    return report.join('\n')
  }

  /**
   * Obtiene estadísticas del contexto de validación
   */
  getValidationStats(): {
    existingUsers: number
    existingBudgets: number
    existingInterests: number
    importedUsers: number
    importedBudgets: number
    importedInterests: number
  } {
    return this.dataValidator.getContextStats()
  }

  /**
   * Resetea el contexto de validación
   */
  resetContext(): void {
    this.dataValidator.resetContext()
  }

  /**
   * Actualiza la configuración del servicio
   */
  updateConfig(newConfig: Partial<ValidationServiceConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): ValidationServiceConfig {
    return { ...this.config }
  }

  /**
   * Limita el número de errores por entidad según la configuración
   */
  private limitErrors(result: ValidationResult): ValidationResult {
    if (result.errors.length <= this.config.maxErrorsPerEntity) {
      return result
    }

    const limitedErrors = result.errors.slice(0, this.config.maxErrorsPerEntity)
    const remainingCount = result.errors.length - this.config.maxErrorsPerEntity

    // Agregar advertencia sobre errores truncados
    const truncationWarning = ValidationUtils.createValidationWarning(
      0,
      'validation',
      remainingCount,
      `Se truncaron ${remainingCount} errores adicionales. Máximo permitido: ${this.config.maxErrorsPerEntity}`,
      'ERRORS_TRUNCATED'
    )

    return {
      isValid: false,
      errors: limitedErrors,
      warnings: [...result.warnings, truncationWarning]
    }
  }

  /**
   * Valida configuración de importación
   */
  static validateImportConfig(config: ImportConfig): ValidationResult {
    const errors = []
    const warnings = []

    if (config.batchSize <= 0) {
      errors.push(
        ValidationUtils.createValidationError(
          0,
          'batchSize',
          config.batchSize,
          'El tamaño de lote debe ser mayor a 0',
          'INVALID_BATCH_SIZE'
        )
      )
    }

    if (config.maxFileSize <= 0) {
      errors.push(
        ValidationUtils.createValidationError(
          0,
          'maxFileSize',
          config.maxFileSize,
          'El tamaño máximo de archivo debe ser mayor a 0',
          'INVALID_MAX_FILE_SIZE'
        )
      )
    }

    if (config.backupRetentionDays < 0) {
      errors.push(
        ValidationUtils.createValidationError(
          0,
          'backupRetentionDays',
          config.backupRetentionDays,
          'Los días de retención de respaldo no pueden ser negativos',
          'INVALID_RETENTION_DAYS'
        )
      )
    }

    if (!config.tempDirectory || config.tempDirectory.trim() === '') {
      errors.push(
        ValidationUtils.createValidationError(
          0,
          'tempDirectory',
          config.tempDirectory,
          'El directorio temporal es requerido',
          'MISSING_TEMP_DIRECTORY'
        )
      )
    }

    if (!['strict', 'lenient'].includes(config.validationLevel)) {
      errors.push(
        ValidationUtils.createValidationError(
          0,
          'validationLevel',
          config.validationLevel,
          'El nivel de validación debe ser "strict" o "lenient"',
          'INVALID_VALIDATION_LEVEL'
        )
      )
    }

    // Advertencias
    if (config.batchSize > 10000) {
      warnings.push(
        ValidationUtils.createValidationWarning(
          0,
          'batchSize',
          config.batchSize,
          'Tamaño de lote muy grande puede afectar el rendimiento',
          'LARGE_BATCH_SIZE'
        )
      )
    }

    if (config.maxFileSize > 100 * 1024 * 1024) {
      // 100MB
      warnings.push(
        ValidationUtils.createValidationWarning(
          0,
          'maxFileSize',
          config.maxFileSize,
          'Tamaño máximo de archivo muy grande puede afectar el rendimiento',
          'LARGE_MAX_FILE_SIZE'
        )
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}
