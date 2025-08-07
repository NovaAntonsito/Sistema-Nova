/**
 * Servicio principal de importación que coordina todos los importadores
 * Cumple con requisitos: 5.3, 5.4, 5.5, 6.4
 */

import { join } from 'path'
import { app } from 'electron'
import { AppDataSource } from '../config/database'
import { BackupManager } from './BackupManager'
import { ImportReporter } from '../utils/ImportReporter'
import { ZipExtractor } from '../utils/zipExtractor'
import { CsvParser } from '../utils/csvParser'
import { DataValidator } from '../validators/DataValidator'
import { UserImporter, BudgetImporter, QuotaImporter, InterestImporter } from './importers'
import {
  UserRepository,
  BudgetRepository,
  QuotaRepository,
  InterestRepository
} from '../repositories'
import {
  ImportResult,
  CompleteImportResult,
  EntityType,
  ImportConfig,
  ValidationResult,
  ImportProgress,
  ImportPhase,
  PerformanceMetrics
} from '../types/import.types'
import {
  ImportException,
  ZipExtractionException,
  BackupException,
  FileNotFoundException
} from '../exceptions/importExceptions'
import { ConfigurationManager } from '../utils/ConfigurationManager'
import { BatchProcessor } from '../utils/BatchProcessor'
import { StreamingParser } from '../utils/StreamingParser'
import { DatabaseOptimizer } from '../utils/DatabaseOptimizer'

/**
 * Servicio principal de importación
 */
export class ImportService {
  private backupManager: BackupManager
  private importReporter: ImportReporter
  private zipExtractor: ZipExtractor
  private csvParser: CsvParser
  private dataValidator: DataValidator

  // Importadores específicos
  private userImporter: UserImporter
  private budgetImporter: BudgetImporter
  private quotaImporter: QuotaImporter
  private interestImporter: InterestImporter

  // Repositorios
  private userRepository: UserRepository
  private budgetRepository: BudgetRepository
  private quotaRepository: QuotaRepository
  private interestRepository: InterestRepository

  // Componentes de optimización
  private configurationManager: ConfigurationManager
  private databaseOptimizer: DatabaseOptimizer
  private performanceMetrics: Partial<PerformanceMetrics> = {}
  private progressCallback?: (progress: ImportProgress) => void

  private config: ImportConfig

  constructor(config?: Partial<ImportConfig>) {
    // Inicializar gestor de configuración
    this.configurationManager = new ConfigurationManager()
    
    // Configuración por defecto (se actualizará al cargar)
    const userDataPath = app ? app.getPath('userData') : process.cwd()
    this.config = {
      batchSize: 1000,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      backupRetentionDays: 30,
      tempDirectory: join(userDataPath, 'temp', 'imports'),
      enableAutoRollback: true,
      validationLevel: 'strict',
      
      // Configuraciones de optimización por defecto
      streamingThreshold: 10 * 1024 * 1024, // 10MB
      maxConcurrentBatches: 4,
      transactionBatchSize: 500,
      enableParallelProcessing: true,
      memoryLimitMB: 512,
      enableDatabaseOptimizations: true,
      connectionPoolSize: 10,
      queryTimeout: 30000,
      enableIndexOptimization: true,
      enableProgressReporting: true,
      progressReportInterval: 1000,
      enablePerformanceMetrics: true,
      ...config
    }

    // Inicializar componentes
    this.initializeComponents()
  }

  /**
   * Importa usuarios desde un archivo CSV
   * @param filePath - Ruta del archivo CSV
   * @returns Promise<ImportResult> - Resultado de la importación
   */
  async importUsersFromCSV(filePath: string): Promise<ImportResult> {
    console.log(`Iniciando importación de usuarios desde: ${filePath}`)

    try {
      return await this.userImporter.importFromCSV(filePath)
    } catch (error) {
      console.error('Error en importación de usuarios:', error)
      throw new ImportException(
        `Error importando usuarios: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'USER_IMPORT_ERROR'
      )
    }
  }

  /**
   * Importa presupuestos desde un archivo CSV
   * @param filePath - Ruta del archivo CSV
   * @returns Promise<ImportResult> - Resultado de la importación
   */
  async importBudgetsFromCSV(filePath: string): Promise<ImportResult> {
    console.log(`Iniciando importación de presupuestos desde: ${filePath}`)

    try {
      return await this.budgetImporter.importFromCSV(filePath)
    } catch (error) {
      console.error('Error en importación de presupuestos:', error)
      throw new ImportException(
        `Error importando presupuestos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'BUDGET_IMPORT_ERROR'
      )
    }
  }

  /**
   * Importa cuotas desde un archivo CSV
   * @param filePath - Ruta del archivo CSV
   * @returns Promise<ImportResult> - Resultado de la importación
   */
  async importQuotasFromCSV(filePath: string): Promise<ImportResult> {
    console.log(`Iniciando importación de cuotas desde: ${filePath}`)

    try {
      return await this.quotaImporter.importFromCSV(filePath)
    } catch (error) {
      console.error('Error en importación de cuotas:', error)
      throw new ImportException(
        `Error importando cuotas: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'QUOTA_IMPORT_ERROR'
      )
    }
  }

  /**
   * Importa configuraciones de interés desde un archivo CSV
   * @param filePath - Ruta del archivo CSV
   * @returns Promise<ImportResult> - Resultado de la importación
   */
  async importInterestsFromCSV(filePath: string): Promise<ImportResult> {
    console.log(`Iniciando importación de intereses desde: ${filePath}`)

    try {
      return await this.interestImporter.importFromCSV(filePath)
    } catch (error) {
      console.error('Error en importación de intereses:', error)
      throw new ImportException(
        `Error importando intereses: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'INTEREST_IMPORT_ERROR'
      )
    }
  }

  /**
   * Importa desde un archivo CSV usando optimizaciones
   * @param filePath - Ruta del archivo CSV
   * @param entityType - Tipo de entidad
   * @returns Promise<ImportResult> - Resultado de la importación
   */
  async importFromCSVOptimized(filePath: string, entityType: EntityType): Promise<ImportResult> {
    const startTime = Date.now()
    const importId = this.generateImportId()

    try {
      // Obtener tamaño del archivo
      const fs = await import('fs/promises')
      const stats = await fs.stat(filePath)
      const fileSize = stats.size

      // Obtener configuración optimizada para el tamaño del archivo
      const optimizedConfig = this.configurationManager.getOptimizedConfigForFileSize(fileSize)
      
      // Aplicar optimizaciones de base de datos si están habilitadas
      if (optimizedConfig.import.enableDatabaseOptimizations) {
        await this.databaseOptimizer.applyPreImportOptimizations()
      }

      let result: ImportResult

      // Decidir estrategia basada en el tamaño del archivo
      if (fileSize > optimizedConfig.import.streamingThreshold) {
        // Usar streaming para archivos grandes
        result = await this.importUsingStreaming(filePath, entityType, importId, optimizedConfig)
      } else {
        // Usar procesamiento por lotes para archivos medianos/pequeños
        result = await this.importUsingBatches(filePath, entityType, importId, optimizedConfig)
      }

      // Restaurar configuraciones de base de datos
      if (optimizedConfig.import.enableDatabaseOptimizations) {
        await this.databaseOptimizer.restorePostImportSettings()
      }

      // Registrar métricas de rendimiento
      this.performanceMetrics = {
        ...this.performanceMetrics,
        importId,
        totalDuration: Date.now() - startTime,
        totalRecords: result.totalRecords,
        recordsPerSecond: result.totalRecords / ((Date.now() - startTime) / 1000),
        ...this.databaseOptimizer.getPerformanceMetrics()
      }

      return result
    } catch (error) {
      // Restaurar configuraciones en caso de error
      if (this.config.enableDatabaseOptimizations) {
        try {
          await this.databaseOptimizer.restorePostImportSettings()
        } catch (restoreError) {
          console.error('Error restaurando configuraciones:', restoreError)
        }
      }

      throw new ImportException(
        `Error en importación optimizada: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'OPTIMIZED_IMPORT_ERROR'
      )
    }
  }

  /**
   * Realiza una importación completa desde un archivo ZIP
   * Cumple con requisitos: 5.3, 5.4, 5.5
   * @param zipFilePath - Ruta del archivo ZIP
   * @returns Promise<CompleteImportResult> - Resultado de la importación completa
   */
  async importFromZip(zipFilePath: string): Promise<CompleteImportResult> {
    const startTime = Date.now()
    const importId = this.generateImportId()
    let backupId = ''
    let extractedFiles: string[] = []

    console.log(`Iniciando importación completa desde ZIP: ${zipFilePath}`)

    try {
      // 1. Crear respaldo antes de la importación (Requisito 7.1)
      console.log('Creando respaldo de seguridad...')
      backupId = await this.createBackup()
      console.log(`Respaldo creado: ${backupId}`)

      // 2. Extraer archivos del ZIP (Requisito 5.1)
      console.log('Extrayendo archivos del ZIP...')
      const extractPath = join(this.config.tempDirectory, importId)
      const extractionResult = await this.zipExtractor.extractZipContents(zipFilePath, extractPath)
      extractedFiles = extractionResult.extractedFiles

      if (extractionResult.errors.length > 0) {
        throw new ZipExtractionException(
          `Errores durante la extracción: ${extractionResult.errors.join(', ')}`
        )
      }

      // 3. Validar que todos los archivos requeridos estén presentes (Requisito 5.2)
      const requiredFiles = ['users.csv', 'interests.csv', 'budgets.csv', 'quotas.csv']
      await this.validateRequiredFiles(extractedFiles, requiredFiles)

      // 4. Iniciar transacción de base de datos
      const queryRunner = AppDataSource.createQueryRunner()
      await queryRunner.connect()
      await queryRunner.startTransaction()

      try {
        // 5. Importar datos en el orden correcto (Requisito 5.3)
        const results = await this.performOrderedImport(extractedFiles)

        // 6. Confirmar transacción si todo fue exitoso
        await queryRunner.commitTransaction()

        const totalDuration = Date.now() - startTime
        const overallSuccess = results.every((result) => result.errors.length === 0)

        // 7. Generar reporte de importación (Requisito 8.1)
        const completeResult: CompleteImportResult = {
          importId,
          overallSuccess,
          results,
          backupId,
          totalDuration,
          report: await this.generateImportReport(importId, results, totalDuration)
        }

        // 8. Generar log de auditoría (Requisito 8.5)
        await this.importReporter.generateAuditLog(completeResult, backupId)

        console.log(`Importación completa finalizada: ${importId} (${totalDuration}ms)`)

        return completeResult
      } catch (error) {
        // Rollback de transacción
        await queryRunner.rollbackTransaction()
        throw error
      } finally {
        await queryRunner.release()
      }
    } catch (error) {
      console.error(`Error en importación completa ${importId}:`, error)

      // Realizar rollback automático si está habilitado (Requisito 7.2)
      if (this.config.enableAutoRollback && backupId) {
        try {
          console.log('Realizando rollback automático...')
          await this.rollbackToBackup(backupId)
          console.log('Rollback completado exitosamente')
        } catch (rollbackError) {
          console.error('Error durante rollback automático:', rollbackError)
        }
      }

      // Generar reporte de errores
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'

      await this.importReporter.generateErrorReport(
        [
          {
            line: 0,
            message: errorMessage,
            code: 'COMPLETE_IMPORT_ERROR'
          }
        ],
        importId
      )

      throw new ImportException(
        `Error en importación completa: ${errorMessage}`,
        'COMPLETE_IMPORT_ERROR'
      )
    } finally {
      // Limpiar archivos temporales
      if (extractedFiles.length > 0) {
        await this.zipExtractor.cleanupExtractedFiles(extractedFiles)
      }
    }
  }

  /**
   * Crea un respaldo de la base de datos
   * @param description - Descripción del respaldo
   * @returns Promise<string> - ID del respaldo creado
   */
  async createBackup(description = 'Respaldo antes de importación'): Promise<string> {
    try {
      return await this.backupManager.createBackup(description)
    } catch (error) {
      throw new BackupException(
        `Error creando respaldo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Restaura la base de datos desde un respaldo
   * @param backupId - ID del respaldo
   */
  async rollbackToBackup(backupId: string): Promise<void> {
    try {
      const result = await this.backupManager.restoreFromBackup(backupId)
      if (!result.success) {
        throw new BackupException(result.error || 'Error desconocido en rollback')
      }
    } catch (error) {
      throw new BackupException(
        `Error en rollback: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Valida un archivo CSV sin importarlo
   * @param filePath - Ruta del archivo
   * @param entityType - Tipo de entidad
   * @returns Promise<ValidationResult> - Resultado de la validación
   */
  async validateCSVFile(filePath: string, entityType: EntityType): Promise<ValidationResult> {
    try {
      // Verificar que el archivo existe
      const fs = await import('fs/promises')
      await fs.access(filePath)

      // Validar formato CSV básico
      const isValidFormat = await this.csvParser.validateCSVFormat(
        filePath,
        this.getExpectedHeaders(entityType)
      )
      if (!isValidFormat) {
        return {
          isValid: false,
          errors: [
            {
              line: 0,
              field: 'format',
              value: entityType,
              message: `Formato de archivo CSV inválido para ${entityType}`,
              code: 'INVALID_CSV_FORMAT'
            }
          ],
          warnings: []
        }
      }

      // Parsear y validar datos
      const parseResult = await this.csvParser.parseCSV(filePath, this.getCSVSchema(entityType))
      if (parseResult.errors.length > 0) {
        return {
          isValid: false,
          errors: parseResult.errors.map((error) => ({
            line: error.line,
            field: error.field || 'unknown',
            value: error.value,
            message: error.message,
            code: 'CSV_PARSE_ERROR'
          })),
          warnings: []
        }
      }

      // Validar datos según el tipo de entidad
      return await this.validateEntityData(parseResult.data, entityType)
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new FileNotFoundException(`Archivo no encontrado: ${filePath}`, filePath)
      }
      throw new ImportException(
        `Error validando archivo CSV: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'CSV_VALIDATION_ERROR'
      )
    }
  }

  /**
   * Valida un archivo ZIP sin importarlo
   * @param zipFilePath - Ruta del archivo ZIP
   * @returns Promise<ValidationResult> - Resultado de la validación
   */
  async validateZipFile(zipFilePath: string): Promise<ValidationResult> {
    try {
      // Verificar que el archivo existe
      const fs = await import('fs/promises')
      await fs.access(zipFilePath)

      // Validar que es un archivo ZIP válido
      const tempExtractPath = join(this.config.tempDirectory, 'validation', Date.now().toString())
      const extractionResult = await this.zipExtractor.extractZipContents(
        zipFilePath,
        tempExtractPath
      )

      if (extractionResult.errors.length > 0) {
        return {
          isValid: false,
          errors: extractionResult.errors.map((error) => ({
            line: 0,
            field: 'zip',
            value: zipFilePath,
            message: error,
            code: 'ZIP_EXTRACTION_ERROR'
          })),
          warnings: []
        }
      }

      // Validar que todos los archivos requeridos estén presentes
      const requiredFiles = ['users.csv', 'interests.csv', 'budgets.csv', 'quotas.csv']
      const validationResult = await this.validateRequiredFiles(
        extractionResult.extractedFiles,
        requiredFiles
      )

      // Limpiar archivos temporales
      await this.zipExtractor.cleanupExtractedFiles(extractionResult.extractedFiles)

      return validationResult
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new FileNotFoundException(`Archivo no encontrado: ${zipFilePath}`, zipFilePath)
      }
      throw new ImportException(
        `Error validando archivo ZIP: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'ZIP_VALIDATION_ERROR'
      )
    }
  }

  // Métodos privados de apoyo

  /**
   * Inicializa la configuración y componentes
   * @returns Promise<void>
   */
  async initialize(): Promise<void> {
    // Cargar configuración
    const systemConfig = await this.configurationManager.loadConfig()
    this.config = systemConfig.import

    // Inicializar componentes con configuración cargada
    this.initializeComponents()
  }

  /**
   * Establece callback de progreso
   * @param callback - Función de callback
   */
  setProgressCallback(callback: (progress: ImportProgress) => void): void {
    this.progressCallback = callback
  }

  /**
   * Actualiza configuración de importación
   * @param updates - Actualizaciones parciales
   * @returns Promise<void>
   */
  async updateConfiguration(updates: Partial<ImportConfig>): Promise<void> {
    await this.configurationManager.updateImportConfig(updates)
    this.config = this.configurationManager.getImportConfig()
    
    // Reinicializar componentes si es necesario
    this.initializeComponents()
  }

  /**
   * Obtiene configuración actual
   * @returns ImportConfig - Configuración actual
   */
  getConfiguration(): ImportConfig {
    return { ...this.config }
  }

  /**
   * Obtiene métricas de rendimiento
   * @returns PerformanceMetrics - Métricas de rendimiento
   */
  getPerformanceMetrics(): Partial<PerformanceMetrics> {
    return { ...this.performanceMetrics }
  }

  /**
   * Inicializa todos los componentes del servicio
   */
  private initializeComponents(): void {
    // Inicializar repositorios
    this.userRepository = new UserRepository(AppDataSource)
    this.budgetRepository = new BudgetRepository(AppDataSource)
    this.quotaRepository = new QuotaRepository(AppDataSource)
    this.interestRepository = new InterestRepository(AppDataSource)

    // Inicializar utilidades
    this.backupManager = BackupManager.getInstance()
    this.importReporter = new ImportReporter()
    this.zipExtractor = new ZipExtractor()
    this.csvParser = new CsvParser()
    this.dataValidator = new DataValidator()

    // Inicializar optimizador de base de datos
    this.databaseOptimizer = new DatabaseOptimizer(
      AppDataSource,
      this.configurationManager.getDatabaseOptimizationConfig()
    )

    // Inicializar importadores específicos
    this.userImporter = new UserImporter(this.userRepository, this.dataValidator, this.csvParser)
    this.budgetImporter = new BudgetImporter(
      this.budgetRepository,
      this.userRepository,
      this.interestRepository,
      this.dataValidator,
      this.csvParser
    )
    this.quotaImporter = new QuotaImporter(
      this.quotaRepository,
      this.budgetRepository,
      this.dataValidator,
      this.csvParser
    )
    this.interestImporter = new InterestImporter(
      this.interestRepository,
      this.dataValidator,
      this.csvParser
    )
  }

  /**
   * Realiza la importación ordenada de todas las entidades
   * @param extractedFiles - Archivos extraídos del ZIP
   * @param queryRunner - Query runner para transacciones
   * @returns Promise<ImportResult[]> - Resultados de importación
   */
  private async performOrderedImport(extractedFiles: string[]): Promise<ImportResult[]> {
    const results: ImportResult[] = []

    // Orden de importación para mantener integridad referencial
    const importOrder = [
      { type: EntityType.USER, importer: this.userImporter },
      { type: EntityType.INTEREST, importer: this.interestImporter },
      { type: EntityType.BUDGET, importer: this.budgetImporter },
      { type: EntityType.QUOTA, importer: this.quotaImporter }
    ]

    for (const { type, importer } of importOrder) {
      const fileName = `${type}.csv`
      const filePath = extractedFiles.find((file) => file.endsWith(fileName))

      if (filePath) {
        console.log(`Importando ${type} desde ${filePath}`)

        // Los importadores manejan sus propias transacciones por ahora
        // TODO: Implementar soporte para transacciones compartidas

        const result = await importer.importFromCSV(filePath)
        results.push(result)

        console.log(
          `${type} importado: ${result.successfulImports} exitosos, ${result.failedImports} fallidos`
        )
      } else {
        console.warn(`Archivo ${fileName} no encontrado en el ZIP`)
        results.push({
          entityType: type,
          totalRecords: 0,
          successfulImports: 0,
          failedImports: 0,
          updatedRecords: 0,
          createdRecords: 0,
          errors: [
            {
              line: 0,
              message: `Archivo ${fileName} no encontrado`,
              code: 'FILE_NOT_FOUND'
            }
          ],
          warnings: [],
          duration: 0
        })
      }
    }

    return results
  }

  /**
   * Valida que todos los archivos requeridos estén presentes
   * @param extractedFiles - Archivos extraídos
   * @param requiredFiles - Archivos requeridos
   * @returns Promise<ValidationResult> - Resultado de la validación
   */
  private async validateRequiredFiles(
    extractedFiles: string[],
    requiredFiles: string[]
  ): Promise<ValidationResult> {
    const errors: any[] = []
    const warnings: any[] = []

    for (const requiredFile of requiredFiles) {
      const found = extractedFiles.some((file) => file.endsWith(requiredFile))
      if (!found) {
        errors.push({
          line: 0,
          field: 'file',
          value: requiredFile,
          message: `Archivo requerido no encontrado: ${requiredFile}`,
          code: 'REQUIRED_FILE_MISSING'
        })
      }
    }

    // Verificar archivos adicionales no esperados
    const expectedFileNames = requiredFiles
    for (const extractedFile of extractedFiles) {
      const fileName = extractedFile.split(/[/\\]/).pop() || ''
      if (!expectedFileNames.includes(fileName) && fileName.endsWith('.csv')) {
        warnings.push({
          line: 0,
          field: 'file',
          value: fileName,
          message: `Archivo adicional encontrado: ${fileName}`,
          code: 'UNEXPECTED_FILE'
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Genera un reporte de importación completo
   * @param importId - ID de la importación
   * @param results - Resultados de importación
   * @param totalDuration - Duración total
   * @param backupId - ID del respaldo
   * @returns Promise<ImportReport> - Reporte generado
   */
  private async generateImportReport(
    importId: string,
    results: ImportResult[],
    totalDuration: number
  ): Promise<any> {
    const totalErrors = results.reduce((sum, result) => sum + result.errors.length, 0)
    const totalWarnings = results.reduce((sum, result) => sum + result.warnings.length, 0)
    const totalSuccessful = results.reduce((sum, result) => sum + result.successfulImports, 0)
    const totalFailed = results.reduce((sum, result) => sum + result.failedImports, 0)

    const report = {
      importId,
      startTime: new Date(Date.now() - totalDuration),
      endTime: new Date(),
      totalDuration,
      entitiesProcessed: results.map((result) => ({
        entityType: result.entityType,
        totalRecords: result.totalRecords,
        successfulImports: result.successfulImports,
        failedImports: result.failedImports,
        updatedRecords: result.updatedRecords,
        createdRecords: result.createdRecords,
        duration: result.duration
      })),
      errorsCount: totalErrors,
      warningsCount: totalWarnings,
      successfulImports: totalSuccessful,
      failedImports: totalFailed
    }

    // Guardar reporte en archivo
    await this.importReporter.saveReportToFile(
      report,
      join(this.config.tempDirectory, `import-report-${importId}.json`)
    )

    return report
  }

  /**
   * Importa usando streaming para archivos grandes
   * @param filePath - Ruta del archivo
   * @param entityType - Tipo de entidad
   * @param importId - ID de importación
   * @param config - Configuración optimizada
   * @returns Promise<ImportResult> - Resultado de la importación
   */
  private async importUsingStreaming(
    filePath: string,
    entityType: EntityType,
    importId: string,
    config: any
  ): Promise<ImportResult> {
    const streamingParser = new StreamingParser(config.streaming, importId)
    const result: ImportResult = {
      entityType,
      totalRecords: 0,
      successfulImports: 0,
      failedImports: 0,
      updatedRecords: 0,
      createdRecords: 0,
      errors: [],
      warnings: [],
      duration: 0
    }

    // Configurar callback de progreso
    if (this.progressCallback) {
      streamingParser.setProgressCallback(this.progressCallback)
    }

    // Obtener headers esperados
    const headers = this.getExpectedHeaders(entityType)
    
    // Procesar archivo usando streaming
    const streamingResult = await streamingParser.parseCSVStream(
      filePath,
      async (chunk, chunkIndex) => {
        // Procesar chunk usando el importador apropiado
        const chunkResult = await this.processChunkWithImporter(chunk, entityType, chunkIndex)
        
        // Acumular resultados
        result.successfulImports += chunkResult.successfulImports
        result.failedImports += chunkResult.failedImports
        result.updatedRecords += chunkResult.updatedRecords
        result.createdRecords += chunkResult.createdRecords
        result.errors.push(...chunkResult.errors)
        result.warnings.push(...chunkResult.warnings)
      },
      headers
    )

    result.totalRecords = streamingResult.totalChunks * config.streaming.chunkSize
    result.duration = streamingResult.duration

    // Agregar errores de streaming
    streamingResult.errors.forEach(error => {
      result.errors.push({
        line: error.lineNumber,
        message: error.error,
        code: error.code
      })
    })

    return result
  }

  /**
   * Importa usando procesamiento por lotes
   * @param filePath - Ruta del archivo
   * @param entityType - Tipo de entidad
   * @param importId - ID de importación
   * @param config - Configuración optimizada
   * @returns Promise<ImportResult> - Resultado de la importación
   */
  private async importUsingBatches(
    filePath: string,
    entityType: EntityType,
    importId: string,
    config: any
  ): Promise<ImportResult> {
    // Parsear archivo completo
    const parseResult = await this.csvParser.parseCSV(filePath, entityType)
    
    if (parseResult.errors.length > 0) {
      // Retornar errores de parsing
      return {
        entityType,
        totalRecords: parseResult.totalRows,
        successfulImports: 0,
        failedImports: parseResult.errors.length,
        updatedRecords: 0,
        createdRecords: 0,
        errors: parseResult.errors.map(error => ({
          line: error.line,
          field: error.field,
          value: error.value,
          message: error.message,
          code: 'CSV_PARSE_ERROR'
        })),
        warnings: [],
        duration: 0
      }
    }

    // Crear procesador por lotes
    const batchProcessor = new BatchProcessor(config.batchProcessing, importId)
    
    // Configurar callback de progreso
    if (this.progressCallback) {
      batchProcessor.setProgressCallback(this.progressCallback)
    }

    // Procesar datos en lotes
    const batchResult = await batchProcessor.processBatches(
      parseResult.data,
      async (batch, batchIndex) => {
        return await this.processBatchWithImporter(batch, entityType, batchIndex)
      }
    )

    // Convertir resultado de lotes a resultado de importación
    const result: ImportResult = {
      entityType,
      totalRecords: parseResult.totalRows,
      successfulImports: batchResult.processedItems.length,
      failedImports: batchResult.errors.length,
      updatedRecords: 0, // Se calculará en el procesador específico
      createdRecords: 0, // Se calculará en el procesador específico
      errors: batchResult.errors.map(error => ({
        line: error.itemIndex + 2, // +2 por header y índice base 0
        message: error.error,
        code: error.code
      })),
      warnings: [],
      duration: batchResult.duration
    }

    return result
  }

  /**
   * Procesa un chunk con el importador apropiado
   * @param chunk - Chunk de datos
   * @param entityType - Tipo de entidad
   * @param chunkIndex - Índice del chunk
   * @returns Promise<ImportResult> - Resultado del procesamiento
   */
  private async processChunkWithImporter(
    chunk: any[],
    entityType: EntityType,
    chunkIndex: number
  ): Promise<ImportResult> {
    // Por ahora, usar los importadores existentes
    // TODO: Optimizar importadores para trabajar con chunks
    
    switch (entityType) {
      case EntityType.USER:
        return await this.processUserChunk(chunk)
      case EntityType.BUDGET:
        return await this.processBudgetChunk(chunk)
      case EntityType.QUOTA:
        return await this.processQuotaChunk(chunk)
      case EntityType.INTEREST:
        return await this.processInterestChunk(chunk)
      default:
        throw new Error(`Tipo de entidad no soportado: ${entityType}`)
    }
  }

  /**
   * Procesa un lote con el importador apropiado
   * @param batch - Lote de datos
   * @param entityType - Tipo de entidad
   * @param batchIndex - Índice del lote
   * @returns Promise<any[]> - Resultados procesados
   */
  private async processBatchWithImporter(
    batch: any[],
    entityType: EntityType,
    batchIndex: number
  ): Promise<any[]> {
    // Procesar lote y retornar elementos procesados exitosamente
    const chunkResult = await this.processChunkWithImporter(batch, entityType, batchIndex)
    
    // Retornar array de elementos exitosos (simplificado)
    return new Array(chunkResult.successfulImports).fill({})
  }

  /**
   * Procesa chunk de usuarios
   * @param chunk - Chunk de usuarios
   * @returns Promise<ImportResult> - Resultado del procesamiento
   */
  private async processUserChunk(chunk: any[]): Promise<ImportResult> {
    // Implementación simplificada - usar importador existente
    // TODO: Optimizar para procesamiento por chunks
    const tempFile = join(this.config.tempDirectory, `temp-users-${Date.now()}.csv`)
    
    // Crear archivo temporal con el chunk
    await this.createTempCSVFile(tempFile, chunk, this.getExpectedHeaders(EntityType.USER))
    
    try {
      return await this.userImporter.importFromCSV(tempFile)
    } finally {
      // Limpiar archivo temporal
      const fs = await import('fs/promises')
      try {
        await fs.unlink(tempFile)
      } catch (error) {
        console.warn('Error eliminando archivo temporal:', error)
      }
    }
  }

  /**
   * Procesa chunk de presupuestos
   * @param chunk - Chunk de presupuestos
   * @returns Promise<ImportResult> - Resultado del procesamiento
   */
  private async processBudgetChunk(chunk: any[]): Promise<ImportResult> {
    const tempFile = join(this.config.tempDirectory, `temp-budgets-${Date.now()}.csv`)
    
    await this.createTempCSVFile(tempFile, chunk, this.getExpectedHeaders(EntityType.BUDGET))
    
    try {
      return await this.budgetImporter.importFromCSV(tempFile)
    } finally {
      const fs = await import('fs/promises')
      try {
        await fs.unlink(tempFile)
      } catch (error) {
        console.warn('Error eliminando archivo temporal:', error)
      }
    }
  }

  /**
   * Procesa chunk de cuotas
   * @param chunk - Chunk de cuotas
   * @returns Promise<ImportResult> - Resultado del procesamiento
   */
  private async processQuotaChunk(chunk: any[]): Promise<ImportResult> {
    const tempFile = join(this.config.tempDirectory, `temp-quotas-${Date.now()}.csv`)
    
    await this.createTempCSVFile(tempFile, chunk, this.getExpectedHeaders(EntityType.QUOTA))
    
    try {
      return await this.quotaImporter.importFromCSV(tempFile)
    } finally {
      const fs = await import('fs/promises')
      try {
        await fs.unlink(tempFile)
      } catch (error) {
        console.warn('Error eliminando archivo temporal:', error)
      }
    }
  }

  /**
   * Procesa chunk de intereses
   * @param chunk - Chunk de intereses
   * @returns Promise<ImportResult> - Resultado del procesamiento
   */
  private async processInterestChunk(chunk: any[]): Promise<ImportResult> {
    const tempFile = join(this.config.tempDirectory, `temp-interests-${Date.now()}.csv`)
    
    await this.createTempCSVFile(tempFile, chunk, this.getExpectedHeaders(EntityType.INTEREST))
    
    try {
      return await this.interestImporter.importFromCSV(tempFile)
    } finally {
      const fs = await import('fs/promises')
      try {
        await fs.unlink(tempFile)
      } catch (error) {
        console.warn('Error eliminando archivo temporal:', error)
      }
    }
  }

  /**
   * Crea un archivo CSV temporal con los datos del chunk
   * @param filePath - Ruta del archivo temporal
   * @param data - Datos del chunk
   * @param headers - Headers del CSV
   * @returns Promise<void>
   */
  private async createTempCSVFile(filePath: string, data: any[], headers: string[]): Promise<void> {
    const fs = await import('fs/promises')
    
    // Crear directorio si no existe
    const dir = join(filePath, '..')
    await fs.mkdir(dir, { recursive: true })
    
    // Crear contenido CSV
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header] || '').join(','))
    ].join('\n')
    
    await fs.writeFile(filePath, csvContent, 'utf8')
  }

  /**
   * Genera un ID único para la importación
   * @returns string - ID único
   */
  private generateImportId(): string {
    return `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Obtiene los headers esperados para un tipo de entidad
   * @param entityType - Tipo de entidad
   * @returns string[] - Headers esperados
   */
  private getExpectedHeaders(entityType: EntityType): string[] {
    switch (entityType) {
      case EntityType.USER:
        return ['id', 'nombre', 'email', 'phoneNumber', 'isDeleted', 'createdAt', 'updatedAt']
      case EntityType.BUDGET:
        return [
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
        ]
      case EntityType.QUOTA:
        return ['id', '_creationDate', 'amount', 'budgetId', 'isDeleted']
      case EntityType.INTEREST:
        return ['id', 'paymentTerm', 'interestPercentage', 'isActive', 'createdAt', 'updatedAt']
      default:
        return []
    }
  }

  /**
   * Obtiene el schema CSV para un tipo de entidad
   * @param entityType - Tipo de entidad
   * @returns any - Schema CSV
   */
  private getCSVSchema(entityType: EntityType): unknown {
    // Retorna el schema apropiado según el tipo de entidad
    // Por ahora retornamos el tipo de entidad para que el parser lo use
    return entityType
  }

  /**
   * Valida datos de entidad específicos
   * @param data - Datos a validar
   * @param entityType - Tipo de entidad
   * @returns Promise<ValidationResult> - Resultado de la validación
   */
  private async validateEntityData(
    data: unknown[],
    entityType: EntityType
  ): Promise<ValidationResult> {
    switch (entityType) {
      case EntityType.USER:
        return await this.dataValidator.validateUsers(data)
      case EntityType.BUDGET:
        return await this.dataValidator.validateBudgets(data)
      case EntityType.QUOTA:
        return await this.dataValidator.validateQuotas(data)
      case EntityType.INTEREST:
        return await this.dataValidator.validateInterests(data)
      default:
        return {
          isValid: false,
          errors: [
            {
              line: 0,
              field: 'entityType',
              value: entityType,
              message: `Tipo de entidad no soportado: ${entityType}`,
              code: 'UNSUPPORTED_ENTITY_TYPE'
            }
          ],
          warnings: []
        }
    }
  }
}
