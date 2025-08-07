/**
 * Importador específico para cuotas desde CSV
 * Cumple con requisitos: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { QuotaRepository } from '../../repositories/QuotaRepository'
import { BudgetRepository } from '../../repositories/BudgetRepository'
import { DataValidator } from '../../validators/DataValidator'
import { CsvParser } from '../../utils/csvParser'
import { Quota } from '../../entities/Quota'
import {
  QuotaImportData,
  ImportResult,
  EntityType,
  ImportError,
  ImportWarning
} from '../../types/import.types'
import {
  ValidationException,
  ReferentialIntegrityException
} from '../../exceptions/importExceptions'

/**
 * Importador específico para cuotas
 */
export class QuotaImporter {
  constructor(
    private quotaRepository: QuotaRepository,
    private budgetRepository: BudgetRepository,
    private dataValidator: DataValidator,
    private csvParser: CsvParser
  ) {}

  /**
   * Importa cuotas desde un archivo CSV
   * @param filePath - Ruta del archivo CSV
   * @returns Promise<ImportResult> - Resultado de la importación
   */
  async importFromCSV(filePath: string): Promise<ImportResult> {
    const startTime = Date.now()
    const result: ImportResult = {
      entityType: EntityType.QUOTA,
      totalRecords: 0,
      successfulImports: 0,
      failedImports: 0,
      updatedRecords: 0,
      createdRecords: 0,
      errors: [],
      warnings: [],
      duration: 0
    }

    try {
      // 1. Parsear archivo CSV
      const parseResult = await this.csvParser.parseCSV<QuotaImportData>(filePath, EntityType.QUOTA)
      result.totalRecords = parseResult.totalRows

      // Agregar errores de parsing al resultado
      parseResult.errors.forEach((error) => {
        result.errors.push({
          line: error.line,
          field: error.field,
          value: error.value,
          message: error.message,
          code: 'CSV_PARSE_ERROR'
        })
      })

      if (parseResult.data.length === 0) {
        result.duration = Date.now() - startTime
        return result
      }

      // 2. Inicializar contexto de validación
      const existingBudgets = await this.budgetRepository.findAllActive()
      const existingBudgetIds = existingBudgets.map((budget) => budget.id)

      await this.dataValidator.initializeContext({
        budgetIds: existingBudgetIds
      })

      // 3. Validar datos
      const validationResult = await this.dataValidator.validateQuotas(parseResult.data)

      // Agregar errores de validación al resultado
      validationResult.errors.forEach((error) => {
        result.errors.push({
          line: error.line,
          field: error.field,
          value: error.value,
          message: error.message,
          code: error.code
        })
      })

      // Agregar advertencias de validación al resultado
      validationResult.warnings.forEach((warning) => {
        result.warnings.push({
          line: warning.line,
          field: warning.field,
          value: warning.value,
          message: warning.message,
          code: warning.code
        })
      })

      // 4. Procesar cuotas válidas
      for (let i = 0; i < parseResult.data.length; i++) {
        const quotaData = parseResult.data[i]
        const lineNumber = i + 2 // +2 porque línea 1 es header y arrays empiezan en 0

        try {
          // Verificar si hay errores de validación para esta línea
          const hasValidationErrors = result.errors.some((error) => error.line === lineNumber)
          if (hasValidationErrors) {
            result.failedImports++
            continue
          }

          // Procesar cuota
          const importSuccess = await this.processQuota(quotaData, lineNumber, result)
          if (importSuccess) {
            result.successfulImports++
          } else {
            result.failedImports++
          }
        } catch (error) {
          result.failedImports++
          result.errors.push({
            line: lineNumber,
            message: error instanceof Error ? error.message : 'Error desconocido procesando cuota',
            code: 'PROCESSING_ERROR'
          })
        }
      }

      result.duration = Date.now() - startTime
      return result
    } catch (error) {
      result.duration = Date.now() - startTime
      result.errors.push({
        line: 0,
        message: error instanceof Error ? error.message : 'Error desconocido en importación',
        code: 'IMPORT_ERROR'
      })
      return result
    }
  }

  /**
   * Procesa una cuota individual
   * @param quotaData - Datos de la cuota a procesar
   * @param lineNumber - Número de línea en el CSV
   * @param result - Resultado de importación para agregar errores/advertencias
   * @returns Promise<boolean> - True si el procesamiento fue exitoso
   */
  private async processQuota(
    quotaData: QuotaImportData,
    lineNumber: number,
    result: ImportResult
  ): Promise<boolean> {
    try {
      // Verificar si la cuota ya existe por ID
      const existingQuotaById = await this.quotaRepository.findByIdWithBudget(quotaData.id)

      if (existingQuotaById) {
        // Cuota existe - actualizar
        return await this.updateExistingQuota(existingQuotaById, quotaData, lineNumber, result)
      } else {
        // Cuota no existe - crear nueva
        return await this.createNewQuota(quotaData, lineNumber, result)
      }
    } catch (error) {
      result.errors.push({
        line: lineNumber,
        message: error instanceof Error ? error.message : 'Error procesando cuota',
        code: 'QUOTA_PROCESSING_ERROR'
      })
      return false
    }
  }

  /**
   * Actualiza una cuota existente
   * @param existingQuota - Cuota existente en la base de datos
   * @param quotaData - Nuevos datos de la cuota
   * @param lineNumber - Número de línea en el CSV
   * @param result - Resultado de importación
   * @returns Promise<boolean> - True si la actualización fue exitosa
   */
  private async updateExistingQuota(
    existingQuota: Quota,
    quotaData: QuotaImportData,
    lineNumber: number,
    result: ImportResult
  ): Promise<boolean> {
    try {
      // Verificar que el presupuesto referenciado existe
      const budget = await this.budgetRepository.findActiveById(quotaData.budgetId)
      if (!budget) {
        result.errors.push({
          line: lineNumber,
          field: 'budgetId',
          value: quotaData.budgetId,
          message: 'Presupuesto referenciado no existe',
          code: 'REFERENTIAL_INTEGRITY_ERROR'
        })
        return false
      }

      // Validar que el monto sea positivo
      if (quotaData.amount <= 0) {
        result.errors.push({
          line: lineNumber,
          field: 'amount',
          value: quotaData.amount,
          message: 'El monto de la cuota debe ser mayor a cero',
          code: 'INVALID_QUOTA_AMOUNT'
        })
        return false
      }

      // Actualizar campos
      existingQuota.amount = quotaData.amount
      existingQuota.budget = budget

      // Actualizar fecha de creación si es válida
      if (quotaData._creationDate) {
        const creationDate = new Date(quotaData._creationDate)
        if (!isNaN(creationDate.getTime())) {
          existingQuota._creationDate = creationDate
        }
      }

      await this.quotaRepository.save(existingQuota)
      result.updatedRecords++

      // Agregar advertencia si la cuota está marcada como eliminada
      if (quotaData.isDeleted) {
        result.warnings.push({
          line: lineNumber,
          field: 'isDeleted',
          value: quotaData.isDeleted,
          message: 'Cuota marcada como eliminada en los datos de importación',
          code: 'DELETED_QUOTA_WARNING'
        })
      }

      return true
    } catch (error) {
      result.errors.push({
        line: lineNumber,
        message: `Error actualizando cuota: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        code: 'QUOTA_UPDATE_ERROR'
      })
      return false
    }
  }

  /**
   * Crea una nueva cuota
   * @param quotaData - Datos de la cuota a crear
   * @param lineNumber - Número de línea en el CSV
   * @param result - Resultado de importación
   * @returns Promise<boolean> - True si la creación fue exitosa
   */
  private async createNewQuota(
    quotaData: QuotaImportData,
    lineNumber: number,
    result: ImportResult
  ): Promise<boolean> {
    try {
      // Verificar que el presupuesto referenciado existe
      const budget = await this.budgetRepository.findActiveById(quotaData.budgetId)
      if (!budget) {
        result.errors.push({
          line: lineNumber,
          field: 'budgetId',
          value: quotaData.budgetId,
          message: 'Presupuesto referenciado no existe',
          code: 'REFERENTIAL_INTEGRITY_ERROR'
        })
        return false
      }

      // Validar que el monto sea positivo
      if (quotaData.amount <= 0) {
        result.errors.push({
          line: lineNumber,
          field: 'amount',
          value: quotaData.amount,
          message: 'El monto de la cuota debe ser mayor a cero',
          code: 'INVALID_QUOTA_AMOUNT'
        })
        return false
      }

      // Verificar si el presupuesto no está eliminado lógicamente
      if (budget.isDeleted) {
        result.warnings.push({
          line: lineNumber,
          field: 'budgetId',
          value: quotaData.budgetId,
          message: 'El presupuesto referenciado está marcado como eliminado',
          code: 'DELETED_BUDGET_WARNING'
        })
      }

      // Crear nueva cuota
      const newQuota = new Quota()
      newQuota.id = quotaData.id
      newQuota.amount = quotaData.amount
      newQuota.budget = budget

      // Establecer fecha de creación
      if (quotaData._creationDate) {
        const creationDate = new Date(quotaData._creationDate)
        if (!isNaN(creationDate.getTime())) {
          newQuota._creationDate = creationDate
        }
      }

      await this.quotaRepository.save(newQuota)
      result.createdRecords++

      // Agregar advertencia si la cuota está marcada como eliminada
      if (quotaData.isDeleted) {
        result.warnings.push({
          line: lineNumber,
          field: 'isDeleted',
          value: quotaData.isDeleted,
          message: 'Cuota marcada como eliminada en los datos de importación pero fue creada',
          code: 'DELETED_QUOTA_WARNING'
        })
      }

      // Verificar si el monto de la cuota es muy alto comparado con el presupuesto
      if (quotaData.amount > budget.totalAmount * 0.5) {
        result.warnings.push({
          line: lineNumber,
          field: 'amount',
          value: quotaData.amount,
          message: `Monto de cuota (${quotaData.amount}) es más del 50% del presupuesto total (${budget.totalAmount})`,
          code: 'HIGH_QUOTA_AMOUNT_WARNING'
        })
      }

      return true
    } catch (error) {
      result.errors.push({
        line: lineNumber,
        message: `Error creando cuota: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        code: 'QUOTA_CREATE_ERROR'
      })
      return false
    }
  }

  /**
   * Valida un archivo CSV de cuotas sin importar
   * @param filePath - Ruta del archivo CSV
   * @returns Promise<ImportResult> - Resultado de la validación
   */
  async validateCSV(filePath: string): Promise<ImportResult> {
    const startTime = Date.now()
    const result: ImportResult = {
      entityType: EntityType.QUOTA,
      totalRecords: 0,
      successfulImports: 0,
      failedImports: 0,
      updatedRecords: 0,
      createdRecords: 0,
      errors: [],
      warnings: [],
      duration: 0
    }

    try {
      // Parsear archivo CSV
      const parseResult = await this.csvParser.parseCSV<QuotaImportData>(filePath, EntityType.QUOTA)
      result.totalRecords = parseResult.totalRows

      // Agregar errores de parsing
      parseResult.errors.forEach((error) => {
        result.errors.push({
          line: error.line,
          field: error.field,
          value: error.value,
          message: error.message,
          code: 'CSV_PARSE_ERROR'
        })
      })

      if (parseResult.data.length > 0) {
        // Inicializar contexto de validación
        const existingBudgets = await this.budgetRepository.findAllActive()
        const existingBudgetIds = existingBudgets.map((budget) => budget.id)

        await this.dataValidator.initializeContext({
          budgetIds: existingBudgetIds
        })

        // Validar datos
        const validationResult = await this.dataValidator.validateQuotas(parseResult.data)

        // Agregar errores de validación
        validationResult.errors.forEach((error) => {
          result.errors.push({
            line: error.line,
            field: error.field,
            value: error.value,
            message: error.message,
            code: error.code
          })
        })

        // Agregar advertencias de validación
        validationResult.warnings.forEach((warning) => {
          result.warnings.push({
            line: warning.line,
            field: warning.field,
            value: warning.value,
            message: warning.message,
            code: warning.code
          })
        })

        // Validaciones adicionales específicas para cuotas
        for (let i = 0; i < parseResult.data.length; i++) {
          const quotaData = parseResult.data[i]
          const lineNumber = i + 2

          // Validar que el monto sea positivo
          if (quotaData.amount <= 0) {
            result.errors.push({
              line: lineNumber,
              field: 'amount',
              value: quotaData.amount,
              message: 'El monto de la cuota debe ser mayor a cero',
              code: 'INVALID_QUOTA_AMOUNT'
            })
          }

          // Verificar relación con presupuesto
          const budget = existingBudgets.find((b) => b.id === quotaData.budgetId)
          if (budget) {
            // Advertir si el monto es muy alto
            if (quotaData.amount > budget.totalAmount * 0.5) {
              result.warnings.push({
                line: lineNumber,
                field: 'amount',
                value: quotaData.amount,
                message: `Monto de cuota (${quotaData.amount}) es más del 50% del presupuesto total (${budget.totalAmount})`,
                code: 'HIGH_QUOTA_AMOUNT_WARNING'
              })
            }

            // Advertir si el presupuesto está eliminado
            if (budget.isDeleted) {
              result.warnings.push({
                line: lineNumber,
                field: 'budgetId',
                value: quotaData.budgetId,
                message: 'El presupuesto referenciado está marcado como eliminado',
                code: 'DELETED_BUDGET_WARNING'
              })
            }
          }

          // Advertir si la cuota está marcada como eliminada
          if (quotaData.isDeleted) {
            result.warnings.push({
              line: lineNumber,
              field: 'isDeleted',
              value: quotaData.isDeleted,
              message: 'Cuota marcada como eliminada en los datos de importación',
              code: 'DELETED_QUOTA_WARNING'
            })
          }
        }

        // Contar registros que pasarían la validación
        const validLines = new Set<number>()
        for (let i = 0; i < parseResult.data.length; i++) {
          const lineNumber = i + 2
          const hasErrors = result.errors.some((error) => error.line === lineNumber)
          if (!hasErrors) {
            validLines.add(lineNumber)
          }
        }

        result.successfulImports = validLines.size
        result.failedImports = parseResult.data.length - validLines.size
      }

      result.duration = Date.now() - startTime
      return result
    } catch (error) {
      result.duration = Date.now() - startTime
      result.errors.push({
        line: 0,
        message: error instanceof Error ? error.message : 'Error desconocido en validación',
        code: 'VALIDATION_ERROR'
      })
      return result
    }
  }
}
