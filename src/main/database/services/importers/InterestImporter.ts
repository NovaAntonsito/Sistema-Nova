/**
 * Importador específico para configuraciones de interés desde CSV
 * Cumple con requisitos: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { InterestRepository } from '../../repositories/InterestRepository'
import { DataValidator } from '../../validators/DataValidator'
import { CsvParser } from '../../utils/csvParser'
import { Interest } from '../../entities/Interest'
import {
  InterestImportData,
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
 * Importador específico para configuraciones de interés
 */
export class InterestImporter {
  constructor(
    private interestRepository: InterestRepository,
    private dataValidator: DataValidator,
    private csvParser: CsvParser
  ) {}

  /**
   * Importa configuraciones de interés desde un archivo CSV
   * @param filePath - Ruta del archivo CSV
   * @returns Promise<ImportResult> - Resultado de la importación
   */
  async importFromCSV(filePath: string): Promise<ImportResult> {
    const startTime = Date.now()
    const result: ImportResult = {
      entityType: EntityType.INTEREST,
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
      const parseResult = await this.csvParser.parseCSV<InterestImportData>(
        filePath,
        EntityType.INTEREST
      )
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
      const existingInterests = await this.interestRepository.findAll()
      const existingInterestTerms = existingInterests.map((interest) => interest.paymentTerm)

      await this.dataValidator.initializeContext({
        interestTerms: existingInterestTerms
      })

      // 3. Validar datos
      const validationResult = await this.dataValidator.validateInterests(parseResult.data)

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

      // 4. Procesar configuraciones de interés válidas
      for (let i = 0; i < parseResult.data.length; i++) {
        const interestData = parseResult.data[i]
        const lineNumber = i + 2 // +2 porque línea 1 es header y arrays empiezan en 0

        try {
          // Verificar si hay errores de validación para esta línea
          const hasValidationErrors = result.errors.some((error) => error.line === lineNumber)
          if (hasValidationErrors) {
            result.failedImports++
            continue
          }

          // Procesar configuración de interés
          const importSuccess = await this.processInterest(interestData, lineNumber, result)
          if (importSuccess) {
            result.successfulImports++
          } else {
            result.failedImports++
          }
        } catch (error) {
          result.failedImports++
          result.errors.push({
            line: lineNumber,
            message:
              error instanceof Error
                ? error.message
                : 'Error desconocido procesando configuración de interés',
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
   * Procesa una configuración de interés individual
   * @param interestData - Datos de la configuración de interés a procesar
   * @param lineNumber - Número de línea en el CSV
   * @param result - Resultado de importación para agregar errores/advertencias
   * @returns Promise<boolean> - True si el procesamiento fue exitoso
   */
  private async processInterest(
    interestData: InterestImportData,
    lineNumber: number,
    result: ImportResult
  ): Promise<boolean> {
    try {
      // Verificar si la configuración ya existe por ID
      const existingInterestById = await this.interestRepository.findOne({
        where: { id: interestData.id }
      })

      if (existingInterestById) {
        // Configuración existe - actualizar
        return await this.updateExistingInterest(
          existingInterestById,
          interestData,
          lineNumber,
          result
        )
      } else {
        // Verificar si existe por término de pago
        const existingInterestByTerm = await this.interestRepository.findByPaymentTerm(
          interestData.paymentTerm
        )

        if (existingInterestByTerm) {
          // Existe por término de pago - actualizar
          return await this.updateExistingInterest(
            existingInterestByTerm,
            interestData,
            lineNumber,
            result
          )
        } else {
          // No existe - crear nueva configuración
          return await this.createNewInterest(interestData, lineNumber, result)
        }
      }
    } catch (error) {
      result.errors.push({
        line: lineNumber,
        message:
          error instanceof Error ? error.message : 'Error procesando configuración de interés',
        code: 'INTEREST_PROCESSING_ERROR'
      })
      return false
    }
  }

  /**
   * Actualiza una configuración de interés existente
   * @param existingInterest - Configuración existente en la base de datos
   * @param interestData - Nuevos datos de la configuración
   * @param lineNumber - Número de línea en el CSV
   * @param result - Resultado de importación
   * @returns Promise<boolean> - True si la actualización fue exitosa
   */
  private async updateExistingInterest(
    existingInterest: Interest,
    interestData: InterestImportData,
    lineNumber: number,
    result: ImportResult
  ): Promise<boolean> {
    try {
      // Verificar si el término de pago cambió y si el nuevo término ya existe
      if (interestData.paymentTerm !== existingInterest.paymentTerm) {
        const termExists = await this.interestRepository.paymentTermExists(
          interestData.paymentTerm,
          existingInterest.id
        )
        if (termExists) {
          result.errors.push({
            line: lineNumber,
            field: 'paymentTerm',
            value: interestData.paymentTerm,
            message: 'Término de pago ya existe en otra configuración',
            code: 'DUPLICATE_PAYMENT_TERM'
          })
          return false
        }
      }

      // Validar rango de porcentaje de interés
      if (interestData.interestPercentage < 0 || interestData.interestPercentage > 100) {
        result.errors.push({
          line: lineNumber,
          field: 'interestPercentage',
          value: interestData.interestPercentage,
          message: 'Porcentaje de interés debe estar entre 0 y 100',
          code: 'INVALID_INTEREST_PERCENTAGE'
        })
        return false
      }

      // Validar término de pago
      if (interestData.paymentTerm <= 0) {
        result.errors.push({
          line: lineNumber,
          field: 'paymentTerm',
          value: interestData.paymentTerm,
          message: 'Término de pago debe ser mayor a cero',
          code: 'INVALID_PAYMENT_TERM'
        })
        return false
      }

      // Actualizar campos
      existingInterest.paymentTerm = interestData.paymentTerm
      existingInterest.interest = interestData.interestPercentage

      // Actualizar fechas si son válidas
      if (interestData.createdAt) {
        const createdAt = new Date(interestData.createdAt)
        if (!isNaN(createdAt.getTime())) {
          existingInterest.createdAt = createdAt
        }
      }

      if (interestData.updatedAt) {
        const updatedAt = new Date(interestData.updatedAt)
        if (!isNaN(updatedAt.getTime())) {
          existingInterest.updatedAt = updatedAt
        }
      }

      await this.interestRepository.save(existingInterest)
      result.updatedRecords++

      // Agregar advertencias para valores extremos
      if (interestData.interestPercentage === 0) {
        result.warnings.push({
          line: lineNumber,
          field: 'interestPercentage',
          value: interestData.interestPercentage,
          message: 'Porcentaje de interés es 0%, verificar si es correcto',
          code: 'ZERO_INTEREST_WARNING'
        })
      }

      if (interestData.interestPercentage > 50) {
        result.warnings.push({
          line: lineNumber,
          field: 'interestPercentage',
          value: interestData.interestPercentage,
          message: 'Porcentaje de interés muy alto (>50%), verificar si es correcto',
          code: 'HIGH_INTEREST_WARNING'
        })
      }

      // Advertir sobre estado inactivo
      if (!interestData.isActive) {
        result.warnings.push({
          line: lineNumber,
          field: 'isActive',
          value: interestData.isActive,
          message: 'Configuración de interés marcada como inactiva',
          code: 'INACTIVE_INTEREST_WARNING'
        })
      }

      return true
    } catch (error) {
      result.errors.push({
        line: lineNumber,
        message: `Error actualizando configuración de interés: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        code: 'INTEREST_UPDATE_ERROR'
      })
      return false
    }
  }

  /**
   * Crea una nueva configuración de interés
   * @param interestData - Datos de la configuración a crear
   * @param lineNumber - Número de línea en el CSV
   * @param result - Resultado de importación
   * @returns Promise<boolean> - True si la creación fue exitosa
   */
  private async createNewInterest(
    interestData: InterestImportData,
    lineNumber: number,
    result: ImportResult
  ): Promise<boolean> {
    try {
      // Verificar que el término de pago no exista
      const termExists = await this.interestRepository.paymentTermExists(interestData.paymentTerm)
      if (termExists) {
        result.errors.push({
          line: lineNumber,
          field: 'paymentTerm',
          value: interestData.paymentTerm,
          message: 'Término de pago ya existe en la base de datos',
          code: 'DUPLICATE_PAYMENT_TERM'
        })
        return false
      }

      // Validar rango de porcentaje de interés
      if (interestData.interestPercentage < 0 || interestData.interestPercentage > 100) {
        result.errors.push({
          line: lineNumber,
          field: 'interestPercentage',
          value: interestData.interestPercentage,
          message: 'Porcentaje de interés debe estar entre 0 y 100',
          code: 'INVALID_INTEREST_PERCENTAGE'
        })
        return false
      }

      // Validar término de pago
      if (interestData.paymentTerm <= 0) {
        result.errors.push({
          line: lineNumber,
          field: 'paymentTerm',
          value: interestData.paymentTerm,
          message: 'Término de pago debe ser mayor a cero',
          code: 'INVALID_PAYMENT_TERM'
        })
        return false
      }

      // Crear nueva configuración de interés
      const newInterest = new Interest()
      newInterest.id = interestData.id
      newInterest.paymentTerm = interestData.paymentTerm
      newInterest.interest = interestData.interestPercentage

      // Establecer fechas
      if (interestData.createdAt) {
        const createdAt = new Date(interestData.createdAt)
        if (!isNaN(createdAt.getTime())) {
          newInterest.createdAt = createdAt
        }
      }

      if (interestData.updatedAt) {
        const updatedAt = new Date(interestData.updatedAt)
        if (!isNaN(updatedAt.getTime())) {
          newInterest.updatedAt = updatedAt
        }
      }

      await this.interestRepository.save(newInterest)
      result.createdRecords++

      // Agregar advertencias para valores extremos
      if (interestData.interestPercentage === 0) {
        result.warnings.push({
          line: lineNumber,
          field: 'interestPercentage',
          value: interestData.interestPercentage,
          message: 'Porcentaje de interés es 0%, verificar si es correcto',
          code: 'ZERO_INTEREST_WARNING'
        })
      }

      if (interestData.interestPercentage > 50) {
        result.warnings.push({
          line: lineNumber,
          field: 'interestPercentage',
          value: interestData.interestPercentage,
          message: 'Porcentaje de interés muy alto (>50%), verificar si es correcto',
          code: 'HIGH_INTEREST_WARNING'
        })
      }

      // Advertir sobre términos de pago inusuales
      if (interestData.paymentTerm > 60) {
        result.warnings.push({
          line: lineNumber,
          field: 'paymentTerm',
          value: interestData.paymentTerm,
          message: 'Término de pago muy largo (>60 meses), verificar si es correcto',
          code: 'LONG_PAYMENT_TERM_WARNING'
        })
      }

      // Advertir sobre estado inactivo
      if (!interestData.isActive) {
        result.warnings.push({
          line: lineNumber,
          field: 'isActive',
          value: interestData.isActive,
          message: 'Configuración de interés creada como inactiva',
          code: 'INACTIVE_INTEREST_WARNING'
        })
      }

      return true
    } catch (error) {
      result.errors.push({
        line: lineNumber,
        message: `Error creando configuración de interés: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        code: 'INTEREST_CREATE_ERROR'
      })
      return false
    }
  }

  /**
   * Valida un archivo CSV de configuraciones de interés sin importar
   * @param filePath - Ruta del archivo CSV
   * @returns Promise<ImportResult> - Resultado de la validación
   */
  async validateCSV(filePath: string): Promise<ImportResult> {
    const startTime = Date.now()
    const result: ImportResult = {
      entityType: EntityType.INTEREST,
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
      const parseResult = await this.csvParser.parseCSV<InterestImportData>(
        filePath,
        EntityType.INTEREST
      )
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
        const existingInterests = await this.interestRepository.findAll()
        const existingInterestTerms = existingInterests.map((interest) => interest.paymentTerm)

        await this.dataValidator.initializeContext({
          interestTerms: existingInterestTerms
        })

        // Validar datos
        const validationResult = await this.dataValidator.validateInterests(parseResult.data)

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

        // Validaciones adicionales específicas para configuraciones de interés
        for (let i = 0; i < parseResult.data.length; i++) {
          const interestData = parseResult.data[i]
          const lineNumber = i + 2

          // Validar rango de porcentaje de interés
          if (interestData.interestPercentage < 0 || interestData.interestPercentage > 100) {
            result.errors.push({
              line: lineNumber,
              field: 'interestPercentage',
              value: interestData.interestPercentage,
              message: 'Porcentaje de interés debe estar entre 0 y 100',
              code: 'INVALID_INTEREST_PERCENTAGE'
            })
          }

          // Validar término de pago
          if (interestData.paymentTerm <= 0) {
            result.errors.push({
              line: lineNumber,
              field: 'paymentTerm',
              value: interestData.paymentTerm,
              message: 'Término de pago debe ser mayor a cero',
              code: 'INVALID_PAYMENT_TERM'
            })
          }

          // Advertencias para valores extremos
          if (interestData.interestPercentage === 0) {
            result.warnings.push({
              line: lineNumber,
              field: 'interestPercentage',
              value: interestData.interestPercentage,
              message: 'Porcentaje de interés es 0%, verificar si es correcto',
              code: 'ZERO_INTEREST_WARNING'
            })
          }

          if (interestData.interestPercentage > 50) {
            result.warnings.push({
              line: lineNumber,
              field: 'interestPercentage',
              value: interestData.interestPercentage,
              message: 'Porcentaje de interés muy alto (>50%), verificar si es correcto',
              code: 'HIGH_INTEREST_WARNING'
            })
          }

          if (interestData.paymentTerm > 60) {
            result.warnings.push({
              line: lineNumber,
              field: 'paymentTerm',
              value: interestData.paymentTerm,
              message: 'Término de pago muy largo (>60 meses), verificar si es correcto',
              code: 'LONG_PAYMENT_TERM_WARNING'
            })
          }

          if (!interestData.isActive) {
            result.warnings.push({
              line: lineNumber,
              field: 'isActive',
              value: interestData.isActive,
              message: 'Configuración de interés marcada como inactiva',
              code: 'INACTIVE_INTEREST_WARNING'
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
