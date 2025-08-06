import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

/**
 * Niveles de logging disponibles
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  AUDIT = 'AUDIT'
}

/**
 * Interfaz para entradas de log
 */
export interface LogEntry {
  timestamp: Date
  level: LogLevel
  operation: string
  message: string
  metadata?: Record<string, any>
  userId?: string
  sessionId?: string
  duration?: number
  error?: Error
}

/**
 * Interfaz para métricas de exportación
 */
export interface ExportMetrics {
  operation: string
  startTime: Date
  endTime?: Date
  duration?: number
  recordCount?: number
  fileSize?: number
  success: boolean
  errorMessage?: string
}

/**
 * Logger especializado para operaciones de exportación
 * Proporciona logging detallado para auditoría y debugging
 */
export class ExportLogger {
  private static instance: ExportLogger
  private logDir: string
  private auditLogPath: string
  private errorLogPath: string
  private metricsLogPath: string

  private constructor() {
    this.logDir = 'logs'
    this.auditLogPath = join(this.logDir, 'export-audit.log')
    this.errorLogPath = join(this.logDir, 'export-errors.log')
    this.metricsLogPath = join(this.logDir, 'export-metrics.log')

    this.ensureLogDirectory()
  }

  /**
   * Obtiene la instancia singleton del logger
   */
  static getInstance(): ExportLogger {
    if (!ExportLogger.instance) {
      ExportLogger.instance = new ExportLogger()
    }
    return ExportLogger.instance
  }

  /**
   * Registra una operación de exportación iniciada
   */
  logExportStart(operation: string, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.AUDIT,
      operation,
      message: `Iniciando operación de exportación: ${operation}`,
      metadata
    })
  }

  /**
   * Registra una operación de exportación completada exitosamente
   */
  logExportSuccess(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.AUDIT,
      operation,
      message: `Operación de exportación completada exitosamente: ${operation}`,
      duration,
      metadata
    })

    // También registrar métricas
    this.logMetrics({
      operation,
      startTime: new Date(Date.now() - duration),
      endTime: new Date(),
      duration,
      success: true,
      ...metadata
    })
  }

  /**
   * Registra un error en operación de exportación
   */
  logExportError(
    operation: string,
    error: Error,
    duration?: number,
    metadata?: Record<string, any>
  ): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.ERROR,
      operation,
      message: `Error en operación de exportación: ${operation}`,
      error,
      duration,
      metadata
    })

    // También registrar métricas de error
    this.logMetrics({
      operation,
      startTime: new Date(Date.now() - (duration || 0)),
      endTime: new Date(),
      duration,
      success: false,
      errorMessage: error.message
    })
  }

  /**
   * Registra información de validación de seguridad
   */
  logSecurityValidation(
    operation: string,
    validationType: string,
    success: boolean,
    details?: string
  ): void {
    this.log({
      timestamp: new Date(),
      level: success ? LogLevel.INFO : LogLevel.WARN,
      operation,
      message: `Validación de seguridad ${validationType}: ${success ? 'EXITOSA' : 'FALLIDA'}`,
      metadata: {
        validationType,
        success,
        details
      }
    })
  }

  /**
   * Registra acceso a archivos
   */
  logFileAccess(
    operation: string,
    filePath: string,
    action: 'CREATE' | 'READ' | 'WRITE' | 'DELETE',
    success: boolean,
    fileSize?: number
  ): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.AUDIT,
      operation,
      message: `Acceso a archivo: ${action} ${filePath}`,
      metadata: {
        filePath,
        action,
        success,
        fileSize
      }
    })
  }

  /**
   * Registra operaciones de base de datos
   */
  logDatabaseOperation(
    operation: string,
    entity: string,
    action: string,
    recordCount?: number,
    duration?: number
  ): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      operation,
      message: `Operación de base de datos: ${action} en ${entity}`,
      duration,
      metadata: {
        entity,
        action,
        recordCount
      }
    })
  }

  /**
   * Registra limpieza de archivos temporales
   */
  logCleanup(
    operation: string,
    filesDeleted: number,
    filesFailed: number,
    totalSize?: number
  ): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      operation,
      message: `Limpieza de archivos temporales completada`,
      metadata: {
        filesDeleted,
        filesFailed,
        totalSize
      }
    })
  }

  /**
   * Registra violaciones de límites de configuración
   */
  logLimitViolation(
    operation: string,
    limitType: string,
    currentValue: number,
    maxValue: number
  ): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.WARN,
      operation,
      message: `Violación de límite: ${limitType}`,
      metadata: {
        limitType,
        currentValue,
        maxValue,
        violation: true
      }
    })
  }

  /**
   * Registra información de rendimiento
   */
  logPerformance(
    operation: string,
    metrics: {
      memoryUsage?: number
      cpuUsage?: number
      duration: number
      recordsProcessed?: number
      throughput?: number
    }
  ): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      operation,
      message: `Métricas de rendimiento para ${operation}`,
      duration: metrics.duration,
      metadata: metrics
    })
  }

  /**
   * Método principal de logging
   */
  private log(entry: LogEntry): void {
    const logLine = this.formatLogEntry(entry)

    // Escribir a consola para desarrollo
    console.log(logLine)

    // Escribir a archivo de auditoría
    this.writeToFile(this.auditLogPath, logLine)

    // Si es un error, también escribir al log de errores
    if (entry.level === LogLevel.ERROR) {
      this.writeToFile(this.errorLogPath, logLine)
    }
  }

  /**
   * Registra métricas de exportación
   */
  private logMetrics(metrics: ExportMetrics): void {
    const metricsLine = JSON.stringify({
      ...metrics,
      timestamp: new Date().toISOString()
    })

    this.writeToFile(this.metricsLogPath, metricsLine)
  }

  /**
   * Formatea una entrada de log
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const level = entry.level.padEnd(5)
    const operation = entry.operation.padEnd(20)

    let logLine = `[${timestamp}] ${level} [${operation}] ${entry.message}`

    if (entry.duration !== undefined) {
      logLine += ` (${entry.duration}ms)`
    }

    if (entry.metadata) {
      logLine += ` | Metadata: ${JSON.stringify(entry.metadata)}`
    }

    if (entry.error) {
      logLine += ` | Error: ${entry.error.message}`
      if (entry.error.stack) {
        logLine += ` | Stack: ${entry.error.stack}`
      }
    }

    return logLine
  }

  /**
   * Escribe una línea a un archivo de log
   */
  private writeToFile(filePath: string, content: string): void {
    try {
      const logLine = content + '\n'

      if (existsSync(filePath)) {
        appendFileSync(filePath, logLine, 'utf8')
      } else {
        writeFileSync(filePath, logLine, 'utf8')
      }
    } catch (error) {
      // Si no se puede escribir al log, al menos mostrar en consola
      console.error('Error escribiendo al log:', error)
      console.error('Contenido del log:', content)
    }
  }

  /**
   * Asegura que el directorio de logs exista
   */
  private ensureLogDirectory(): void {
    try {
      if (!existsSync(this.logDir)) {
        mkdirSync(this.logDir, { recursive: true })
      }
    } catch (error) {
      console.error('Error creando directorio de logs:', error)
    }
  }

  /**
   * Obtiene estadísticas de los logs
   */
  getLogStats(): {
    auditLogSize: number
    errorLogSize: number
    metricsLogSize: number
    lastAuditEntry?: Date
    lastErrorEntry?: Date
  } {
    const fs = require('fs')

    const stats = {
      auditLogSize: 0,
      errorLogSize: 0,
      metricsLogSize: 0,
      lastAuditEntry: undefined as Date | undefined,
      lastErrorEntry: undefined as Date | undefined
    }

    try {
      if (existsSync(this.auditLogPath)) {
        const auditStats = fs.statSync(this.auditLogPath)
        stats.auditLogSize = auditStats.size
        stats.lastAuditEntry = auditStats.mtime
      }

      if (existsSync(this.errorLogPath)) {
        const errorStats = fs.statSync(this.errorLogPath)
        stats.errorLogSize = errorStats.size
        stats.lastErrorEntry = errorStats.mtime
      }

      if (existsSync(this.metricsLogPath)) {
        const metricsStats = fs.statSync(this.metricsLogPath)
        stats.metricsLogSize = metricsStats.size
      }
    } catch (error) {
      console.error('Error obteniendo estadísticas de logs:', error)
    }

    return stats
  }

  /**
   * Limpia logs antiguos
   */
  cleanupOldLogs(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): void {
    // Implementación básica - en producción se podría rotar logs
    const now = Date.now()
    const fs = require('fs')

    const logFiles = [this.auditLogPath, this.errorLogPath, this.metricsLogPath]

    for (const logFile of logFiles) {
      try {
        if (existsSync(logFile)) {
          const stats = fs.statSync(logFile)
          const fileAge = now - stats.mtime.getTime()

          if (fileAge > maxAgeMs) {
            // En lugar de eliminar, podríamos archivar
            console.log(`Log file ${logFile} is older than ${maxAgeMs}ms, consider archiving`)
          }
        }
      } catch (error) {
        console.error(`Error checking log file ${logFile}:`, error)
      }
    }
  }
}
