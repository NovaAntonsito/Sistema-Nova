/**
 * Configuración para el sistema de exportación
 * Define límites de memoria, timeouts y otras restricciones de seguridad
 */
export interface ExportConfig {
  // Límites de memoria
  MAX_RECORDS_PER_EXPORT: number
  MAX_FILE_SIZE_MB: number
  MAX_ZIP_SIZE_MB: number

  // Timeouts
  EXPORT_TIMEOUT_MS: number
  DATABASE_QUERY_TIMEOUT_MS: number
  FILE_WRITE_TIMEOUT_MS: number

  // Rutas y directorios
  TEMP_DIR: string
  EXPORT_DIR: string

  // Limpieza automática
  CLEANUP_INTERVAL_MS: number
  MAX_FILE_AGE_MS: number

  // Seguridad
  ALLOWED_FILE_EXTENSIONS: string[]
  MAX_FILENAME_LENGTH: number
  MAX_PATH_LENGTH: number
}

/**
 * Configuración por defecto para exportaciones
 */
export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  // Límites de memoria (Requisito 6.1)
  MAX_RECORDS_PER_EXPORT: 100000,
  MAX_FILE_SIZE_MB: 50,
  MAX_ZIP_SIZE_MB: 200,

  // Timeouts (Requisito 6.3)
  EXPORT_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutos
  DATABASE_QUERY_TIMEOUT_MS: 2 * 60 * 1000, // 2 minutos
  FILE_WRITE_TIMEOUT_MS: 30 * 1000, // 30 segundos

  // Rutas y directorios
  TEMP_DIR: 'temp/exports',
  EXPORT_DIR: 'exports',

  // Limpieza automática
  CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // 1 hora
  MAX_FILE_AGE_MS: 24 * 60 * 60 * 1000, // 24 horas

  // Seguridad
  ALLOWED_FILE_EXTENSIONS: ['.csv', '.zip', '.json'],
  MAX_FILENAME_LENGTH: 100,
  MAX_PATH_LENGTH: 260 // Límite de Windows
}

/**
 * Clase para gestionar la configuración de exportación
 */
export class ExportConfigManager {
  private static instance: ExportConfigManager
  private config: ExportConfig

  private constructor() {
    this.config = { ...DEFAULT_EXPORT_CONFIG }
    this.loadEnvironmentOverrides()
  }

  /**
   * Obtiene la instancia singleton del gestor de configuración
   */
  static getInstance(): ExportConfigManager {
    if (!ExportConfigManager.instance) {
      ExportConfigManager.instance = new ExportConfigManager()
    }
    return ExportConfigManager.instance
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): ExportConfig {
    return { ...this.config }
  }

  /**
   * Actualiza un valor de configuración
   */
  updateConfig(key: keyof ExportConfig, value: any): void {
    this.config[key] = value
  }

  /**
   * Valida que un número de registros esté dentro del límite
   */
  validateRecordCount(count: number): void {
    if (count > this.config.MAX_RECORDS_PER_EXPORT) {
      throw new Error(
        `Número de registros (${count}) excede el límite máximo (${this.config.MAX_RECORDS_PER_EXPORT})`
      )
    }
  }

  /**
   * Valida que un tamaño de archivo esté dentro del límite
   */
  validateFileSize(sizeBytes: number): void {
    const sizeMB = sizeBytes / (1024 * 1024)
    if (sizeMB > this.config.MAX_FILE_SIZE_MB) {
      throw new Error(
        `Tamaño de archivo (${sizeMB.toFixed(2)}MB) excede el límite máximo (${this.config.MAX_FILE_SIZE_MB}MB)`
      )
    }
  }

  /**
   * Valida que un tamaño de ZIP esté dentro del límite
   */
  validateZipSize(sizeBytes: number): void {
    const sizeMB = sizeBytes / (1024 * 1024)
    if (sizeMB > this.config.MAX_ZIP_SIZE_MB) {
      throw new Error(
        `Tamaño de ZIP (${sizeMB.toFixed(2)}MB) excede el límite máximo (${this.config.MAX_ZIP_SIZE_MB}MB)`
      )
    }
  }

  /**
   * Crea un timeout para operaciones
   */
  createTimeout(operation: string): NodeJS.Timeout {
    const timeout = setTimeout(() => {
      throw new Error(
        `Operación '${operation}' excedió el tiempo límite (${this.config.EXPORT_TIMEOUT_MS}ms)`
      )
    }, this.config.EXPORT_TIMEOUT_MS)

    return timeout
  }

  /**
   * Crea un timeout específico para consultas de base de datos
   */
  createDatabaseTimeout(): NodeJS.Timeout {
    const timeout = setTimeout(() => {
      throw new Error(
        `Consulta de base de datos excedió el tiempo límite (${this.config.DATABASE_QUERY_TIMEOUT_MS}ms)`
      )
    }, this.config.DATABASE_QUERY_TIMEOUT_MS)

    return timeout
  }

  /**
   * Carga configuraciones desde variables de entorno
   */
  private loadEnvironmentOverrides(): void {
    const envMappings: Record<string, keyof ExportConfig> = {
      EXPORT_MAX_RECORDS: 'MAX_RECORDS_PER_EXPORT',
      EXPORT_MAX_FILE_SIZE_MB: 'MAX_FILE_SIZE_MB',
      EXPORT_MAX_ZIP_SIZE_MB: 'MAX_ZIP_SIZE_MB',
      EXPORT_TIMEOUT_MS: 'EXPORT_TIMEOUT_MS',
      EXPORT_TEMP_DIR: 'TEMP_DIR',
      EXPORT_DIR: 'EXPORT_DIR'
    }

    for (const [envVar, configKey] of Object.entries(envMappings)) {
      const envValue = process.env[envVar]
      if (envValue) {
        if (typeof this.config[configKey] === 'number') {
          const numValue = parseInt(envValue, 10)
          if (!isNaN(numValue)) {
            this.config[configKey] = numValue as any
          }
        } else {
          this.config[configKey] = envValue as any
        }
      }
    }
  }
}
