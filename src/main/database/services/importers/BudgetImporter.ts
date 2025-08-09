/**
 * Importador específico para presupuestos desde CSV
 * Cumple con requisitos: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { BudgetRepository } from '../../repositories/BudgetRepository'
import { UserRepository } from '../../repositories/UserRepository'
import { InterestRepository } from '../../repositories/InterestRepository'
import { DataValidator } from '../../validators/DataValidator'
import { CsvParser } from '../../utils/csvParser'
import { Budget } from '../../entities/Budget'
import { Status } from '../../entities/Status'
import { BudgetImportData, ImportResult, EntityType } from '../../types/import.types'

/**
 * Importador específico para presupuestos
 */
export class BudgetImporter {
  constructor(
    private budgetRepository: BudgetRepository,
    private userRepository: UserRepository,
    private interestRepository: InterestRepository,
    private dataValidator: DataValidator,
    private csvParser: CsvParser
  ) {}

  /**
   * Importa presupuestos desde un archivo CSV
   * @param filePath - Ruta del archivo CSV
   * @returns Promise<ImportResult> - Resultado de la importación
   */
  async importFromCSV(filePath: string): Promise<ImportResult> {
    const startTime = Date.now()
    const result: ImportResult = {
      entityType: EntityType.BUDGET,
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
      const parseResult = await this.csvParser.parseCSV<BudgetImportData>(
        filePath,
        EntityType.BUDGET
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
      const existingUsers = await this.userRepository.findAllActive()
      const existingBudgets = await this.budgetRepository.findAllActive()
      const existingInterests = await this.interestRepository.findAll()

      const existingUserIds = existingUsers.map((user) => user.id)
      const existingBudgetIds = existingBudgets.map((budget) => budget.id)
      const existingInterestTerms = existingInterests.map((interest) => interest.paymentTerm)

      console.log('Inicializando contexto de validación...')
      console.log('Usuarios existentes:', existingUserIds.length)
      console.log('Presupuestos existentes:', existingBudgetIds.length)
      console.log('Términos de interés existentes:', existingInterestTerms.length)

      await this.dataValidator.initializeContext({
        userIds: existingUserIds,
        budgetIds: existingBudgetIds,
        interestTerms: existingInterestTerms
      })
      console.log('Contexto inicializado correctamente')

      // 3. Validar datos
      console.log('Iniciando validación de presupuestos...')
      const validationResult = await this.dataValidator.validateBudgets(parseResult.data)
      console.log('Validación completada:', validationResult)

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

      // 4. Procesar presupuestos válidos
      for (let i = 0; i < parseResult.data.length; i++) {
        const budgetData = parseResult.data[i]
        const lineNumber = i + 2 // +2 porque línea 1 es header y arrays empiezan en 0

        try {
          // Verificar si hay errores de validación para esta línea
          const hasValidationErrors = result.errors.some((error) => error.line === lineNumber)
          if (hasValidationErrors) {
            result.failedImports++
            continue
          }

          // Procesar presupuesto
          const importSuccess = await this.processBudget(budgetData, lineNumber, result)
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
              error instanceof Error ? error.message : 'Error desconocido procesando presupuesto',
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
   * Procesa un presupuesto individual
   * @param budgetData - Datos del presupuesto a procesar
   * @param lineNumber - Número de línea en el CSV
   * @param result - Resultado de importación para agregar errores/advertencias
   * @returns Promise<boolean> - True si el procesamiento fue exitoso
   */
  private async processBudget(
    budgetData: BudgetImportData,
    lineNumber: number,
    result: ImportResult
  ): Promise<boolean> {
    try {
      // Verificar si el presupuesto ya existe por ID
      const existingBudgetById = await this.budgetRepository.findActiveById(budgetData.id)

      if (existingBudgetById) {
        // Presupuesto existe - actualizar
        return await this.updateExistingBudget(existingBudgetById, budgetData, lineNumber, result)
      } else {
        // Presupuesto no existe - crear nuevo
        return await this.createNewBudget(budgetData, lineNumber, result)
      }
    } catch (error) {
      result.errors.push({
        line: lineNumber,
        message: error instanceof Error ? error.message : 'Error procesando presupuesto',
        code: 'BUDGET_PROCESSING_ERROR'
      })
      return false
    }
  }

  /**
   * Actualiza un presupuesto existente
   * @param existingBudget - Presupuesto existente en la base de datos
   * @param budgetData - Nuevos datos del presupuesto
   * @param lineNumber - Número de línea en el CSV
   * @param result - Resultado de importación
   * @returns Promise<boolean> - True si la actualización fue exitosa
   */
  private async updateExistingBudget(
    existingBudget: Budget,
    budgetData: BudgetImportData,
    lineNumber: number,
    result: ImportResult
  ): Promise<boolean> {
    try {
      // Verificar si el código cambió y si el nuevo código ya existe
      if (budgetData.code !== existingBudget.code) {
        const codeExists = await this.budgetRepository.codeExists(
          budgetData.code,
          existingBudget.id
        )
        if (codeExists) {
          result.errors.push({
            line: lineNumber,
            field: 'code',
            value: budgetData.code,
            message: 'Código de presupuesto ya existe',
            code: 'DUPLICATE_CODE'
          })
          return false
        }
      }

      // Verificar que el usuario referenciado existe
      const user = await this.userRepository.findActiveById(budgetData.userId)
      if (!user) {
        result.errors.push({
          line: lineNumber,
          field: 'userId',
          value: budgetData.userId,
          message: 'Usuario referenciado no existe',
          code: 'REFERENTIAL_INTEGRITY_ERROR'
        })
        return false
      }

      // Actualizar campos
      existingBudget.code = budgetData.code
      existingBudget.totalAmount = budgetData.totalAmount
      existingBudget.currentInterest = budgetData.currentInterest
      existingBudget.paymentTerm = budgetData.paymentTerm
      existingBudget.isDeleted = budgetData.isDeleted
      existingBudget.user = user

      // Convertir y validar estado
      const status = this.convertStringToStatus(budgetData.currentStatus)
      if (status) {
        existingBudget.currentStatus = status
      } else {
        result.warnings.push({
          line: lineNumber,
          field: 'currentStatus',
          value: budgetData.currentStatus,
          message: `Estado inválido '${budgetData.currentStatus}', manteniendo estado actual`,
          code: 'INVALID_STATUS_WARNING'
        })
      }

      // Actualizar fechas si son válidas
      if (budgetData._creationDate) {
        const creationDate = new Date(budgetData._creationDate)
        if (!isNaN(creationDate.getTime())) {
          existingBudget._creationDate = creationDate
        }
      }

      if (budgetData._expirationDate) {
        const expirationDate = new Date(budgetData._expirationDate)
        if (!isNaN(expirationDate.getTime())) {
          existingBudget._expirationDate = expirationDate
        }
      }

      if (budgetData.updatedAt) {
        const updatedAt = new Date(budgetData.updatedAt)
        if (!isNaN(updatedAt.getTime())) {
          existingBudget.updatedAt = updatedAt
        }
      }

      await this.budgetRepository.save(existingBudget)
      result.updatedRecords++

      return true
    } catch (error) {
      result.errors.push({
        line: lineNumber,
        message: `Error actualizando presupuesto: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        code: 'BUDGET_UPDATE_ERROR'
      })
      return false
    }
  }

  /**
   * Crea un nuevo presupuesto
   * @param budgetData - Datos del presupuesto a crear
   * @param lineNumber - Número de línea en el CSV
   * @param result - Resultado de importación
   * @returns Promise<boolean> - True si la creación fue exitosa
   */
  private async createNewBudget(
    budgetData: BudgetImportData,
    lineNumber: number,
    result: ImportResult
  ): Promise<boolean> {
    try {
      // Verificar que el código no exista
      const codeExists = await this.budgetRepository.codeExists(budgetData.code)
      if (codeExists) {
        result.errors.push({
          line: lineNumber,
          field: 'code',
          value: budgetData.code,
          message: 'Código de presupuesto ya existe en la base de datos',
          code: 'DUPLICATE_CODE'
        })
        return false
      }

      // Verificar que el usuario referenciado existe
      const user = await this.userRepository.findActiveById(budgetData.userId)
      if (!user) {
        result.errors.push({
          line: lineNumber,
          field: 'userId',
          value: budgetData.userId,
          message: 'Usuario referenciado no existe',
          code: 'REFERENTIAL_INTEGRITY_ERROR'
        })
        return false
      }

      // Crear nuevo presupuesto
      const newBudget = new Budget()
      newBudget.id = budgetData.id
      newBudget.code = budgetData.code
      newBudget.totalAmount = budgetData.totalAmount
      newBudget.currentInterest = budgetData.currentInterest
      newBudget.paymentTerm = budgetData.paymentTerm
      newBudget.isDeleted = budgetData.isDeleted
      newBudget.user = user
      newBudget.quotaList = [] // Inicializar lista vacía

      // Convertir y validar estado
      const status = this.convertStringToStatus(budgetData.currentStatus)
      if (status) {
        newBudget.currentStatus = status
      } else {
        newBudget.currentStatus = Status.ACTIVE // Estado por defecto
        result.warnings.push({
          line: lineNumber,
          field: 'currentStatus',
          value: budgetData.currentStatus,
          message: `Estado inválido '${budgetData.currentStatus}', usando estado ACTIVE por defecto`,
          code: 'INVALID_STATUS_WARNING'
        })
      }

      // Establecer fechas
      if (budgetData._creationDate) {
        const creationDate = new Date(budgetData._creationDate)
        if (!isNaN(creationDate.getTime())) {
          newBudget._creationDate = creationDate
        }
      }

      if (budgetData._expirationDate) {
        const expirationDate = new Date(budgetData._expirationDate)
        if (!isNaN(expirationDate.getTime())) {
          newBudget._expirationDate = expirationDate
        }
      }

      if (budgetData.updatedAt) {
        const updatedAt = new Date(budgetData.updatedAt)
        if (!isNaN(updatedAt.getTime())) {
          newBudget.updatedAt = updatedAt
        }
      }

      await this.budgetRepository.save(newBudget)
      result.createdRecords++

      return true
    } catch (error) {
      result.errors.push({
        line: lineNumber,
        message: `Error creando presupuesto: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        code: 'BUDGET_CREATE_ERROR'
      })
      return false
    }
  }

  /**
   * Convierte string de estado a enum Status
   * @param statusString - String del estado
   * @returns Status | null - Estado convertido o null si es inválido
   */
  private convertStringToStatus(statusString: string): Status | null {
    const statusMap: Record<string, Status> = {
      active: Status.ACTIVE,
      inactive: Status.INACTIVE,
      expired: Status.EXPIRED,
      cancelled: Status.CANCELLED,
      finished: Status.FINISHED
    }

    const normalizedStatus = statusString.toLowerCase().trim()
    return statusMap[normalizedStatus] || null
  }

  /**
   * Valida un archivo CSV de presupuestos sin importar
   * @param filePath - Ruta del archivo CSV
   * @returns Promise<ImportResult> - Resultado de la validación
   */
  async validateCSV(filePath: string): Promise<ImportResult> {
    const startTime = Date.now()
    const result: ImportResult = {
      entityType: EntityType.BUDGET,
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
      const parseResult = await this.csvParser.parseCSV<BudgetImportData>(
        filePath,
        EntityType.BUDGET
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
        const existingUsers = await this.userRepository.findAllActive()
        const existingBudgets = await this.budgetRepository.findAllActive()
        const existingInterests = await this.interestRepository.findAll()

        const existingUserIds = existingUsers.map((user) => user.id)
        const existingBudgetIds = existingBudgets.map((budget) => budget.id)
        const existingInterestTerms = existingInterests.map((interest) => interest.paymentTerm)

        await this.dataValidator.initializeContext({
          userIds: existingUserIds,
          budgetIds: existingBudgetIds,
          interestTerms: existingInterestTerms
        })

        // Validar datos
        const validationResult = await this.dataValidator.validateBudgets(parseResult.data)

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
