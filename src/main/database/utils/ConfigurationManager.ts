/**
 * Gestor de configuración para optimizaciones de importación
 * Cumple con requisitos: Optimización de rendimiento
 */

import { join } from 'path'
import { app } from 'electron'
import { promises as fs } from 'fs'
import { EventEmitter } from 'events'
import {
  ImportConfig,
  BatchProcessingConfig,
  StreamingConfig
} from '../types/import.types'
import { DatabaseOptimizationConfig } from './DatabaseOptimizer'

/**
 * Configuración completa del sistema
 */
export interface SystemConfig {
  import: ImportConfig
  batchProcessing: BatchProcessingConfig
  streaming: StreamingConfig
  databaseOptimization: DatabaseOptimizationConfig
}

/**
 * Configuración por defecto
 */
const DEFAULT_CONFIG: SystemConfig = {
  import: {
    batchSize: 1000,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    backupRetentionDays: 30,
    tempDirectory: '',
    enableAutoRollback: true,
    validationLevel: 'strict',
    
    // Configuraciones de optimización
    streamingThreshold: 10 * 1024 * 1024, // 10MB
    maxConcurrentBatches: 4,
    transactionBatchSize: 500,
    enableParallelProcessing: true,
    memoryLimitMB: 512,
    
    // Configuraciones de rendimiento
    enableDatabaseOptimizations: true,
    connectionPoolSize: 10,
    queryTimeout: 30000, // 30 segundos
    enableIndexOptimization: true,
    
    // Configuraciones de monitoreo
    enableProgressReporting: true,
    progressReportInterval: 1000, // 1 segundo
    enablePerformanceMetrics: true
  },
  
  batchProcessing: {
    batchSize: 1000,
    maxConcurrentBatches: 4,
    enableParallelProcessing: true,
    transactionBatchSize: 500
  },
  
  streaming: {
    chunkSize: 1000,
    memoryLimitMB: 512,
    enableBackpressure: true,
    bufferSize: 64 * 1024 // 64KB
  },
  
  databaseOptimization: {
    enableBatchInserts: true,
    batchSize: 1000,
    enableTransactionOptimization: true,
    disableIndexesDuringImport: true,
    enableConnectionPooling: true,
    maxConnections: 10,
    queryTimeout: 30000,
    enableQueryLogging: false
  }
}

/**
 * Gestor de configuración
 */
export class ConfigurationManager extends EventEmitter {
  private config: SystemConfig
  private configFilePath: string
  private isLoaded = false

  constructor() {
    super()
    this.config = { ...DEFAULT_CONFIG }
    
    // Establecer directorio temporal por defecto
    const userDataPath = app ? app.getPath('userData') : process.cwd()
    this.configFilePath = join(userDataPath, 'import-config.json')
    this.config.import.tempDirectory = join(userDataPath, 'temp', 'imports')
  }

  /**
   * Carga la configuración desde archivo
   * @returns Promise<SystemConfig> - Configuración cargada
   */
  async loadConfig(): Promise<SystemConfig> {
    try {
      const configExists = await this.fileExists(this.configFilePath)
      
      if (configExists) {
        const configData = await fs.readFile(this.configFilePath, 'utf8')
        const savedConfig = JSON.parse(configData)
        
        // Combinar configuración guardada con valores por defecto
        this.config = this.mergeConfigs(DEFAULT_CONFIG, savedConfig)
        
        this.emit('configLoaded', this.config)
      } else {
        // Crear archivo de configuración por defecto
        await this.saveConfig()
        this.emit('configCreated', this.config)
      }
      
      this.isLoaded = true
      return this.config
    } catch (error) {
      console.error('Error cargando configuración:', error)
      this.emit('configError', error)
      
      // Usar configuración por defecto en caso de error
      this.isLoaded = true
      return this.config
    }
  }

  /**
   * Guarda la configuración actual en archivo
   * @returns Promise<void>
   */
  async saveConfig(): Promise<void> {
    try {
      // Crear directorio si no existe
      const configDir = join(this.configFilePath, '..')
      await fs.mkdir(configDir, { recursive: true })
      
      // Guardar configuración
      const configData = JSON.stringify(this.config, null, 2)
      await fs.writeFile(this.configFilePath, configData, 'utf8')
      
      this.emit('configSaved', this.config)
    } catch (error) {
      console.error('Error guardando configuración:', error)
      this.emit('configSaveError', error)
      throw error
    }
  }

  /**
   * Obtiene la configuración actual
   * @returns SystemConfig - Configuración actual
   */
  getConfig(): SystemConfig {
    if (!this.isLoaded) {
      console.warn('Configuración no cargada, usando valores por defecto')
    }
    return { ...this.config }
  }

  /**
   * Obtiene configuración de importación
   * @returns ImportConfig - Configuración de importación
   */
  getImportConfig(): ImportConfig {
    return { ...this.config.import }
  }

  /**
   * Obtiene configuración de procesamiento por lotes
   * @returns BatchProcessingConfig - Configuración de lotes
   */
  getBatchProcessingConfig(): BatchProcessingConfig {
    return { ...this.config.batchProcessing }
  }

  /**
   * Obtiene configuración de streaming
   * @returns StreamingConfig - Configuración de streaming
   */
  getStreamingConfig(): StreamingConfig {
    return { ...this.config.streaming }
  }

  /**
   * Obtiene configuración de optimización de base de datos
   * @returns DatabaseOptimizationConfig - Configuración de BD
   */
  getDatabaseOptimizationConfig(): DatabaseOptimizationConfig {
    return { ...this.config.databaseOptimization }
  }

  /**
   * Actualiza configuración de importación
   * @param updates - Actualizaciones parciales
   * @returns Promise<void>
   */
  async updateImportConfig(updates: Partial<ImportConfig>): Promise<void> {
    this.config.import = { ...this.config.import, ...updates }
    
    // Sincronizar configuraciones relacionadas
    this.syncRelatedConfigs()
    
    await this.saveConfig()
    this.emit('importConfigUpdated', this.config.import)
  }

  /**
   * Actualiza configuración de procesamiento por lotes
   * @param updates - Actualizaciones parciales
   * @returns Promise<void>
   */
  async updateBatchProcessingConfig(updates: Partial<BatchProcessingConfig>): Promise<void> {
    this.config.batchProcessing = { ...this.config.batchProcessing, ...updates }
    
    // Sincronizar con configuración de importación
    this.config.import.batchSize = this.config.batchProcessing.batchSize
    this.config.import.maxConcurrentBatches = this.config.batchProcessing.maxConcurrentBatches
    this.config.import.enableParallelProcessing = this.config.batchProcessing.enableParallelProcessing
    this.config.import.transactionBatchSize = this.config.batchProcessing.transactionBatchSize
    
    await this.saveConfig()
    this.emit('batchConfigUpdated', this.config.batchProcessing)
  }

  /**
   * Actualiza configuración de streaming
   * @param updates - Actualizaciones parciales
   * @returns Promise<void>
   */
  async updateStreamingConfig(updates: Partial<StreamingConfig>): Promise<void> {
    this.config.streaming = { ...this.config.streaming, ...updates }
    
    // Sincronizar con configuración de importación
    this.config.import.memoryLimitMB = this.config.streaming.memoryLimitMB
    
    await this.saveConfig()
    this.emit('streamingConfigUpdated', this.config.streaming)
  }

  /**
   * Actualiza configuración de optimización de base de datos
   * @param updates - Actualizaciones parciales
   * @returns Promise<void>
   */
  async updateDatabaseOptimizationConfig(updates: Partial<DatabaseOptimizationConfig>): Promise<void> {
    this.config.databaseOptimization = { ...this.config.databaseOptimization, ...updates }
    
    // Sincronizar con configuración de importación
    this.config.import.connectionPoolSize = this.config.databaseOptimization.maxConnections
    this.config.import.queryTimeout = this.config.databaseOptimization.queryTimeout
    this.config.import.enableDatabaseOptimizations = this.config.databaseOptimization.enableBatchInserts
    
    await this.saveConfig()
    this.emit('databaseConfigUpdated', this.config.databaseOptimization)
  }

  /**
   * Restaura configuración por defecto
   * @returns Promise<void>
   */
  async resetToDefaults(): Promise<void> {
    const userDataPath = app ? app.getPath('userData') : process.cwd()
    const tempDir = join(userDataPath, 'temp', 'imports')
    
    this.config = { ...DEFAULT_CONFIG }
    this.config.import.tempDirectory = tempDir
    
    await this.saveConfig()
    this.emit('configReset', this.config)
  }

  /**
   * Valida la configuración actual
   * @returns ValidationResult - Resultado de la validación
   */
  validateConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    // Validar configuración de importación
    if (this.config.import.batchSize <= 0) {
      errors.push('El tamaño de lote debe ser mayor a 0')
    }
    
    if (this.config.import.maxFileSize <= 0) {
      errors.push('El tamaño máximo de archivo debe ser mayor a 0')
    }
    
    if (this.config.import.streamingThreshold > this.config.import.maxFileSize) {
      warnings.push('El umbral de streaming es mayor que el tamaño máximo de archivo')
    }
    
    if (this.config.import.memoryLimitMB <= 0) {
      errors.push('El límite de memoria debe ser mayor a 0')
    }

    // Validar configuración de lotes
    if (this.config.batchProcessing.maxConcurrentBatches <= 0) {
      errors.push('El número máximo de lotes concurrentes debe ser mayor a 0')
    }
    
    if (this.config.batchProcessing.transactionBatchSize > this.config.batchProcessing.batchSize) {
      warnings.push('El tamaño de lote de transacción es mayor que el tamaño de lote general')
    }

    // Validar configuración de streaming
    if (this.config.streaming.chunkSize <= 0) {
      errors.push('El tamaño de chunk debe ser mayor a 0')
    }
    
    if (this.config.streaming.bufferSize <= 0) {
      errors.push('El tamaño de buffer debe ser mayor a 0')
    }

    // Validar configuración de base de datos
    if (this.config.databaseOptimization.maxConnections <= 0) {
      errors.push('El número máximo de conexiones debe ser mayor a 0')
    }
    
    if (this.config.databaseOptimization.queryTimeout <= 0) {
      errors.push('El timeout de query debe ser mayor a 0')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Obtiene configuración optimizada para un tamaño de archivo específico
   * @param fileSizeBytes - Tamaño del archivo en bytes
   * @returns SystemConfig - Configuración optimizada
   */
  getOptimizedConfigForFileSize(fileSizeBytes: number): SystemConfig {
    const config = { ...this.config }

    // Ajustar configuración basada en el tamaño del archivo
    if (fileSizeBytes > config.import.streamingThreshold) {
      // Archivo grande - usar streaming
      config.streaming.chunkSize = Math.min(1000, Math.max(100, Math.floor(fileSizeBytes / (1024 * 1024))))
      config.import.enableParallelProcessing = true
      config.import.maxConcurrentBatches = Math.min(8, Math.max(2, Math.floor(fileSizeBytes / (10 * 1024 * 1024))))
    } else {
      // Archivo pequeño - procesamiento normal
      config.import.batchSize = Math.min(2000, Math.max(100, Math.floor(fileSizeBytes / 1000)))
      config.import.maxConcurrentBatches = Math.min(4, Math.max(1, Math.floor(fileSizeBytes / (5 * 1024 * 1024))))
    }

    // Ajustar límite de memoria basado en el tamaño del archivo
    const recommendedMemoryMB = Math.min(1024, Math.max(256, Math.floor(fileSizeBytes / (1024 * 1024)) * 2))
    config.import.memoryLimitMB = Math.max(config.import.memoryLimitMB, recommendedMemoryMB)
    config.streaming.memoryLimitMB = config.import.memoryLimitMB

    return config
  }

  /**
   * Combina configuraciones
   * @param defaultConfig - Configuración por defecto
   * @param savedConfig - Configuración guardada
   * @returns SystemConfig - Configuración combinada
   */
  private mergeConfigs(defaultConfig: SystemConfig, savedConfig: any): SystemConfig {
    return {
      import: { ...defaultConfig.import, ...savedConfig.import },
      batchProcessing: { ...defaultConfig.batchProcessing, ...savedConfig.batchProcessing },
      streaming: { ...defaultConfig.streaming, ...savedConfig.streaming },
      databaseOptimization: { ...defaultConfig.databaseOptimization, ...savedConfig.databaseOptimization }
    }
  }

  /**
   * Sincroniza configuraciones relacionadas
   */
  private syncRelatedConfigs(): void {
    // Sincronizar tamaños de lote
    this.config.batchProcessing.batchSize = this.config.import.batchSize
    this.config.databaseOptimization.batchSize = this.config.import.batchSize
    
    // Sincronizar configuraciones de memoria
    this.config.streaming.memoryLimitMB = this.config.import.memoryLimitMB
    
    // Sincronizar configuraciones de base de datos
    this.config.databaseOptimization.maxConnections = this.config.import.connectionPoolSize
    this.config.databaseOptimization.queryTimeout = this.config.import.queryTimeout
  }

  /**
   * Verifica si un archivo existe
   * @param filePath - Ruta del archivo
   * @returns Promise<boolean> - True si existe
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }
}