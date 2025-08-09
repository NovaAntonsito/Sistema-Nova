/**
 * Importador específico para usuarios desde CSV
 * Cumple con requisitos: 1.1, 1.2, 1.3, 1.4
 */

import { UserRepository } from '../../repositories/UserRepository'
import { DataValidator } from '../../validators/DataValidator'
import { CsvParser } from '../../utils/csvParser'
import { User } from '../../entities/User'
import { UserImportData, ImportResult, EntityType } from '../../types/import.types'

/**
 * Importador específico para usuarios
 */
export class UserImporter {
  constructor(
    private userRepository: UserRepository,
    private dataValidator: DataValidator,
    private csvParser: CsvParser
  ) {}

  /**
   * Importa usuarios desde un archivo CSV
   * @param filePath - Ruta del archivo CSV
   * @returns Promise<ImportResult> - Resultado de la importación
   */
  async importFromCSV(filePath: string): Promise<ImportResult> {
    const startTime = Date.now()
    const result: ImportResult = {
      entityType: EntityType.USER,
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
      const parseResult = await this.csvParser.parseCSV<UserImportData>(filePath, EntityType.USER)
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
      const existingUserIds = existingUsers.map((user) => user.id)

      await this.dataValidator.initializeContext({
        userIds: existingUserIds
      })

      // 3. Validar datos
      const validationResult = await this.dataValidator.validateUsers(parseResult.data)

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

      // 4. Procesar usuarios válidos
      for (let i = 0; i < parseResult.data.length; i++) {
        const userData = parseResult.data[i]
        const lineNumber = i + 2 // +2 porque línea 1 es header y arrays empiezan en 0

        try {
          // Verificar si hay errores de validación para esta línea
          const hasValidationErrors = result.errors.some((error) => error.line === lineNumber)
          if (hasValidationErrors) {
            result.failedImports++
            continue
          }

          // Procesar usuario
          const importSuccess = await this.processUser(userData, lineNumber, result)
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
              error instanceof Error ? error.message : 'Error desconocido procesando usuario',
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
   * Procesa un usuario individual
   * @param userData - Datos del usuario a procesar
   * @param lineNumber - Número de línea en el CSV
   * @param result - Resultado de importación para agregar errores/advertencias
   * @returns Promise<boolean> - True si el procesamiento fue exitoso
   */
  private async processUser(
    userData: UserImportData,
    lineNumber: number,
    result: ImportResult
  ): Promise<boolean> {
    try {
      // Verificar si el usuario ya existe por ID
      const existingUserById = await this.userRepository.findActiveById(userData.id)

      if (existingUserById) {
        // Usuario existe - actualizar
        return await this.updateExistingUser(existingUserById, userData, lineNumber, result)
      } else {
        // Usuario no existe - crear nuevo
        return await this.createNewUser(userData, lineNumber, result)
      }
    } catch (error) {
      result.errors.push({
        line: lineNumber,
        message: error instanceof Error ? error.message : 'Error procesando usuario',
        code: 'USER_PROCESSING_ERROR'
      })
      return false
    }
  }

  /**
   * Actualiza un usuario existente
   * @param existingUser - Usuario existente en la base de datos
   * @param userData - Nuevos datos del usuario
   * @param lineNumber - Número de línea en el CSV
   * @param result - Resultado de importación
   * @returns Promise<boolean> - True si la actualización fue exitosa
   */
  private async updateExistingUser(
    existingUser: User,
    userData: UserImportData,
    lineNumber: number,
    result: ImportResult
  ): Promise<boolean> {
    try {
      // Verificar si el email cambió y si el nuevo email ya existe
      if (userData.email !== existingUser.email) {
        const emailExists = await this.userRepository.emailExists(userData.email, existingUser.id)
        if (emailExists) {
          result.errors.push({
            line: lineNumber,
            field: 'email',
            value: userData.email,
            message: 'Email ya existe en otro usuario',
            code: 'DUPLICATE_EMAIL'
          })
          return false
        }
      }

      // Actualizar campos
      existingUser.nombre = userData.nombre
      existingUser.email = userData.email
      existingUser.phoneNumber = userData.phoneNumber
      existingUser.isDeleted = userData.isDeleted

      // Actualizar fechas si son válidas
      if (userData.createdAt) {
        const createdAt = new Date(userData.createdAt)
        if (!isNaN(createdAt.getTime())) {
          existingUser.createdAt = createdAt
        }
      }

      if (userData.updatedAt) {
        const updatedAt = new Date(userData.updatedAt)
        if (!isNaN(updatedAt.getTime())) {
          existingUser.updatedAt = updatedAt
        }
      }

      await this.userRepository.save(existingUser)
      result.updatedRecords++

      return true
    } catch (error) {
      result.errors.push({
        line: lineNumber,
        message: `Error actualizando usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        code: 'USER_UPDATE_ERROR'
      })
      return false
    }
  }

  /**
   * Crea un nuevo usuario
   * @param userData - Datos del usuario a crear
   * @param lineNumber - Número de línea en el CSV
   * @param result - Resultado de importación
   * @returns Promise<boolean> - True si la creación fue exitosa
   */
  private async createNewUser(
    userData: UserImportData,
    lineNumber: number,
    result: ImportResult
  ): Promise<boolean> {
    try {
      // Verificar que el email no exista
      const emailExists = await this.userRepository.emailExists(userData.email)
      if (emailExists) {
        result.errors.push({
          line: lineNumber,
          field: 'email',
          value: userData.email,
          message: 'Email ya existe en la base de datos',
          code: 'DUPLICATE_EMAIL'
        })
        return false
      }

      // Crear nuevo usuario
      const newUser = new User()
      newUser.id = userData.id
      newUser.nombre = userData.nombre
      newUser.email = userData.email
      newUser.phoneNumber = userData.phoneNumber
      newUser.isDeleted = userData.isDeleted

      // Establecer fechas
      if (userData.createdAt) {
        const createdAt = new Date(userData.createdAt)
        if (!isNaN(createdAt.getTime())) {
          newUser.createdAt = createdAt
        }
      }

      if (userData.updatedAt) {
        const updatedAt = new Date(userData.updatedAt)
        if (!isNaN(updatedAt.getTime())) {
          newUser.updatedAt = updatedAt
        }
      }

      await this.userRepository.save(newUser)
      result.createdRecords++

      return true
    } catch (error) {
      result.errors.push({
        line: lineNumber,
        message: `Error creando usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        code: 'USER_CREATE_ERROR'
      })
      return false
    }
  }

  /**
   * Valida un archivo CSV de usuarios sin importar
   * @param filePath - Ruta del archivo CSV
   * @returns Promise<ImportResult> - Resultado de la validación
   */
  async validateCSV(filePath: string): Promise<ImportResult> {
    const startTime = Date.now()
    const result: ImportResult = {
      entityType: EntityType.USER,
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
      const parseResult = await this.csvParser.parseCSV<UserImportData>(filePath, EntityType.USER)
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
        const existingUserIds = existingUsers.map((user) => user.id)

        await this.dataValidator.initializeContext({
          userIds: existingUserIds
        })

        // Validar datos
        const validationResult = await this.dataValidator.validateUsers(parseResult.data)

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
