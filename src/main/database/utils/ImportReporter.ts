/**
 * Generador de reportes para el sistema de importación
 * Cumple con requisitos: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs'
import { join, dirname } from 'path'
import { app } from 'electron'
import {
  ImportResult,
  CompleteImportResult,
  ImportReport,
  EntityStats,
  ImportError,
  ImportWarning,
  EntityType
} from '../types/import.types'

/**
 * Reporte de errores específico
 */
export interface ErrorReport {
  reportId: string
  generatedAt: Date
  totalErrors: number
  totalWarnings: number
  errorsByEntity: Record<EntityType, number>
  errorsByType: Record<string, number>
  warningsByEntity: Record<EntityType, number>
  warningsByType: Record<string, number>
  detailedErrors: ImportError[]
  detailedWarnings: ImportWarning[]
  summary: string
}

/**
 * Reporte de rendimiento
 */
export interface PerformanceReport {
  reportId: string
  importId: string
  generatedAt: Date
  totalDuration: number
  averageRecordsPerSecond: number
  peakMemoryUsage?: number
  entityPerformance: EntityPerformanceStats[]
  bottlenecks: PerformanceBottleneck[]
  recommendations: string[]
}

/**
 * Estadísticas de rendimiento por entidad
 */
export interface EntityPerformanceStats {
  entityType: EntityType
  totalRecords: number
  duration: number
  recordsPerSecond: number
  averageRecordSize: number
  validationTime: number
  insertionTime: number
  updateTime: number
}

/**
 * Cuello de botella de rendimiento
 */
export interface PerformanceBottleneck {
  type: 'validation' | 'insertion' | 'update' | 'parsing' | 'io'
  entityType?: EntityType
  description: string
  impact: 'low' | 'medium' | 'high'
  suggestion: string
}

/**
 * Métricas detalladas de importación
 */
export interface ImportMetrics {
  importId: string
  timestamp: Date
  entityType: EntityType
  operation: 'parse' | 'validate' | 'insert' | 'update'
  duration: number
  recordsProcessed: number
  memoryUsage?: number
  success: boolean
  errorCount: number
}

/**
 * Configuración del reporte
 */
export interface ReportConfig {
  outputDirectory: string
  logsDirectory: string
  includeDetailedErrors: boolean
  includeWarnings: boolean
  generateSummary: boolean
  generatePerformanceReport: boolean
  enableMetricsCollection: boolean
  auditLogRetentionDays: number
}

/**
 * Generador de reportes de importación
 */
export class ImportReporter {
  private config: ReportConfig
  private metrics: ImportMetrics[] = []

  constructor(config?: Partial<ReportConfig>) {
    const userDataPath = app ? app.getPath('userData') : process.cwd()

    this.config = {
      outputDirectory: join(userDataPath, 'import-reports'),
      logsDirectory: join(userDataPath, 'logs'),
      includeDetailedErrors: true,
      includeWarnings: true,
      generateSummary: true,
      generatePerformanceReport: true,
      enableMetricsCollection: true,
      auditLogRetentionDays: 90,
      ...config
    }

    this.ensureDirectories()
  }

  /**
   * Genera un reporte completo de importación
   * @param result - Resultado de importación completa
   * @returns Promise<ImportReport> - Reporte generado
   */
  async generateImportReport(result: CompleteImportResult): Promise<ImportReport> {
    const report: ImportReport = {
      importId: result.importId,
      startTime: new Date(Date.now() - result.totalDuration),
      endTime: new Date(),
      totalDuration: result.totalDuration,
      entitiesProcessed: this.generateEntityStats(result.results),
      errorsCount: this.countTotalErrors(result.results),
      warningsCount: this.countTotalWarnings(result.results),
      successfulImports: this.countSuccessfulImports(result.results),
      failedImports: this.countFailedImports(result.results)
    }

    // Guardar reporte en archivo
    if (this.config.generateSummary) {
      await this.saveReportToFile(report, `import_report_${result.importId}.json`)
    }

    return report
  }

  /**
   * Genera un reporte de errores detallado
   * Cumple con requisito 8.3: Crear reportes de errores con detalles específicos
   * @param errors - Array de errores de importación
   * @param warnings - Array de advertencias de importación
   * @param importId - ID de la importación
   * @returns Promise<ErrorReport> - Reporte de errores
   */
  async generateErrorReport(
    errors: ImportError[],
    importId: string,
    warnings: ImportWarning[] = []
  ): Promise<ErrorReport> {
    const reportId = `error_report_${importId}_${Date.now()}`

    const report: ErrorReport = {
      reportId,
      generatedAt: new Date(),
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      errorsByEntity: this.groupErrorsByEntity(errors),
      errorsByType: this.groupErrorsByType(errors),
      warningsByEntity: this.groupWarningsByEntity(warnings),
      warningsByType: this.groupWarningsByType(warnings),
      detailedErrors: errors,
      detailedWarnings: warnings,
      summary: this.generateErrorSummary(errors, warnings)
    }

    // Guardar reporte de errores
    if (this.config.includeDetailedErrors) {
      await this.saveErrorReportToFile(report, `${reportId}.json`)
    }

    // Escribir errores al log de errores
    await this.writeErrorsToLog(errors, warnings, importId)

    return report
  }

  /**
   * Genera estadísticas por entidad
   * @param results - Resultados de importación por entidad
   * @returns EntityStats[] - Estadísticas por entidad
   */
  generateEntityStats(results: ImportResult[]): EntityStats[] {
    return results.map((result) => ({
      entityType: result.entityType,
      totalRecords: result.totalRecords,
      successfulImports: result.successfulImports,
      failedImports: result.failedImports,
      updatedRecords: result.updatedRecords,
      createdRecords: result.createdRecords,
      duration: result.duration
    }))
  }

  /**
   * Guarda un reporte en archivo JSON
   * @param report - Reporte a guardar
   * @param fileName - Nombre del archivo
   */
  async saveReportToFile(report: ImportReport, fileName: string): Promise<void> {
    try {
      const filePath = join(this.config.outputDirectory, fileName)
      const reportJson = JSON.stringify(report, null, 2)

      writeFileSync(filePath, reportJson, 'utf8')
      console.log(`Reporte de importación guardado: ${filePath}`)
    } catch (error) {
      console.error(`Error guardando reporte: ${error}`)
      throw new Error(
        `Error guardando reporte: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Guarda un reporte de errores en archivo
   * @param report - Reporte de errores
   * @param fileName - Nombre del archivo
   */
  async saveErrorReportToFile(report: ErrorReport, fileName: string): Promise<void> {
    try {
      const filePath = join(this.config.outputDirectory, fileName)
      const reportJson = JSON.stringify(report, null, 2)

      writeFileSync(filePath, reportJson, 'utf8')
      console.log(`Reporte de errores guardado: ${filePath}`)
    } catch (error) {
      console.error(`Error guardando reporte de errores: ${error}`)
      throw new Error(
        `Error guardando reporte de errores: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Genera un reporte de texto legible para humanos
   * Cumple con requisito 8.1: Generar reportes detallados
   * @param report - Reporte de importación
   * @param performanceReport - Reporte de rendimiento opcional
   * @returns string - Reporte en formato texto
   */
  generateHumanReadableReport(report: ImportReport, performanceReport?: PerformanceReport): string {
    const lines: string[] = []

    lines.push('='.repeat(70))
    lines.push('REPORTE COMPLETO DE IMPORTACIÓN')
    lines.push('='.repeat(70))
    lines.push('')

    // Información general
    lines.push(`ID de Importación: ${report.importId}`)
    lines.push(`Fecha de Inicio: ${report.startTime.toLocaleString()}`)
    lines.push(`Fecha de Fin: ${report.endTime.toLocaleString()}`)
    lines.push(`Duración Total: ${this.formatDuration(report.totalDuration)}`)
    lines.push('')

    // Resumen general
    lines.push('RESUMEN GENERAL:')
    lines.push('-'.repeat(50))
    lines.push(`- Importaciones Exitosas: ${report.successfulImports}`)
    lines.push(`- Importaciones Fallidas: ${report.failedImports}`)
    lines.push(`- Total de Errores: ${report.errorsCount}`)
    lines.push(`- Total de Advertencias: ${report.warningsCount}`)

    const totalRecords = report.entitiesProcessed.reduce((sum, e) => sum + e.totalRecords, 0)
    const successRate =
      totalRecords > 0 ? Math.round((report.successfulImports / totalRecords) * 100) : 0
    lines.push(`- Tasa de Éxito: ${successRate}%`)
    lines.push('')

    // Estadísticas por entidad
    lines.push('ESTADÍSTICAS POR ENTIDAD:')
    lines.push('-'.repeat(50))

    for (const entityStat of report.entitiesProcessed) {
      const entitySuccessRate =
        entityStat.totalRecords > 0
          ? Math.round((entityStat.successfulImports / entityStat.totalRecords) * 100)
          : 0
      const recordsPerSecond =
        entityStat.duration > 0
          ? Math.round((entityStat.totalRecords / entityStat.duration) * 1000)
          : 0

      lines.push(`${entityStat.entityType.toUpperCase()}:`)
      lines.push(`  - Total de Registros: ${entityStat.totalRecords}`)
      lines.push(`  - Exitosos: ${entityStat.successfulImports}`)
      lines.push(`  - Fallidos: ${entityStat.failedImports}`)
      lines.push(`  - Creados: ${entityStat.createdRecords}`)
      lines.push(`  - Actualizados: ${entityStat.updatedRecords}`)
      lines.push(`  - Duración: ${this.formatDuration(entityStat.duration)}`)
      lines.push(`  - Velocidad: ${recordsPerSecond} registros/segundo`)
      lines.push(`  - Tasa de Éxito: ${entitySuccessRate}%`)
      lines.push('')
    }

    // Información de rendimiento si está disponible
    if (performanceReport) {
      lines.push('ANÁLISIS DE RENDIMIENTO:')
      lines.push('-'.repeat(50))
      lines.push(
        `- Velocidad Promedio: ${performanceReport.averageRecordsPerSecond} registros/segundo`
      )

      if (performanceReport.bottlenecks.length > 0) {
        lines.push('- Cuellos de Botella Detectados:')
        for (const bottleneck of performanceReport.bottlenecks) {
          lines.push(`  * ${bottleneck.description} (Impacto: ${bottleneck.impact})`)
          lines.push(`    Sugerencia: ${bottleneck.suggestion}`)
        }
      }

      if (performanceReport.recommendations.length > 0) {
        lines.push('- Recomendaciones:')
        for (const recommendation of performanceReport.recommendations) {
          lines.push(`  * ${recommendation}`)
        }
      }
      lines.push('')
    }

    // Pie del reporte
    lines.push('='.repeat(70))
    lines.push(`Reporte generado el ${new Date().toLocaleString()}`)
    lines.push('='.repeat(70))

    return lines.join('\n')
  }

  /**
   * Genera un reporte de rendimiento detallado
   * Cumple con requisito 8.5: Generar reportes de tiempo de importación y rendimiento
   * @param result - Resultado de importación completa
   * @returns Promise<PerformanceReport> - Reporte de rendimiento
   */
  async generatePerformanceReport(result: CompleteImportResult): Promise<PerformanceReport> {
    const reportId = `performance_report_${result.importId}_${Date.now()}`
    const totalRecords = result.results.reduce((sum, r) => sum + r.totalRecords, 0)

    const entityPerformance: EntityPerformanceStats[] = result.results.map((r) => ({
      entityType: r.entityType,
      totalRecords: r.totalRecords,
      duration: r.duration,
      recordsPerSecond: r.duration > 0 ? Math.round((r.totalRecords / r.duration) * 1000) : 0,
      averageRecordSize: this.calculateAverageRecordSize(r.entityType),
      validationTime: this.getMetricsDuration(result.importId, r.entityType, 'validate'),
      insertionTime: this.getMetricsDuration(result.importId, r.entityType, 'insert'),
      updateTime: this.getMetricsDuration(result.importId, r.entityType, 'update')
    }))

    const bottlenecks = this.identifyBottlenecks(entityPerformance)
    const recommendations = this.generatePerformanceRecommendations(entityPerformance, bottlenecks)

    const report: PerformanceReport = {
      reportId,
      importId: result.importId,
      generatedAt: new Date(),
      totalDuration: result.totalDuration,
      averageRecordsPerSecond:
        result.totalDuration > 0 ? Math.round((totalRecords / result.totalDuration) * 1000) : 0,
      entityPerformance,
      bottlenecks,
      recommendations
    }

    // Guardar reporte de rendimiento
    if (this.config.generatePerformanceReport) {
      await this.savePerformanceReportToFile(report, `${reportId}.json`)
    }

    // Escribir métricas al log de métricas
    await this.writeMetricsToLog(result)

    return report
  }

  /**
   * Recolecta métricas durante la importación
   * @param importId - ID de la importación
   * @param entityType - Tipo de entidad
   * @param operation - Operación realizada
   * @param duration - Duración en milisegundos
   * @param recordsProcessed - Número de registros procesados
   * @param success - Si la operación fue exitosa
   * @param errorCount - Número de errores
   */
  collectMetrics(
    importId: string,
    entityType: EntityType,
    operation: 'parse' | 'validate' | 'insert' | 'update',
    duration: number,
    recordsProcessed: number,
    success: boolean,
    errorCount: number = 0
  ): void {
    if (!this.config.enableMetricsCollection) return

    const metric: ImportMetrics = {
      importId,
      timestamp: new Date(),
      entityType,
      operation,
      duration,
      recordsProcessed,
      success,
      errorCount
    }

    this.metrics.push(metric)
  }

  /**
   * Genera un log de auditoría completo para la importación
   * Cumple con requisito 8.4: Implementar guardado de logs de auditoría
   * @param result - Resultado de importación completa
   * @param backupId - ID del respaldo creado
   */
  async generateAuditLog(result: CompleteImportResult, backupId: string): Promise<void> {
    try {
      const auditLogPath = join(this.config.logsDirectory, 'import-audit.log')
      const timestamp = new Date().toISOString()

      // Entrada principal de auditoría
      const mainLogEntry = [
        `[${timestamp}] IMPORT_COMPLETED`,
        `ImportID=${result.importId}`,
        `BackupID=${backupId}`,
        `Success=${result.overallSuccess}`,
        `Duration=${result.totalDuration}ms`,
        `TotalRecords=${result.results.reduce((sum, r) => sum + r.totalRecords, 0)}`,
        `SuccessfulImports=${result.results.reduce((sum, r) => sum + r.successfulImports, 0)}`,
        `FailedImports=${result.results.reduce((sum, r) => sum + r.failedImports, 0)}`,
        `ErrorsCount=${result.results.reduce((sum, r) => sum + r.errors.length, 0)}`,
        `WarningsCount=${result.results.reduce((sum, r) => sum + r.warnings.length, 0)}`
      ].join(' | ')

      // Entradas detalladas por entidad
      const entityEntries = result.results.map((r) => {
        return [
          `[${timestamp}] ENTITY_PROCESSED`,
          `ImportID=${result.importId}`,
          `EntityType=${r.entityType}`,
          `TotalRecords=${r.totalRecords}`,
          `Successful=${r.successfulImports}`,
          `Failed=${r.failedImports}`,
          `Created=${r.createdRecords}`,
          `Updated=${r.updatedRecords}`,
          `Duration=${r.duration}ms`,
          `ErrorsCount=${r.errors.length}`,
          `WarningsCount=${r.warnings.length}`
        ].join(' | ')
      })

      // Escribir todas las entradas al log de auditoría
      const allEntries = [mainLogEntry, ...entityEntries].join('\n') + '\n'
      appendFileSync(auditLogPath, allEntries, 'utf8')

      console.log(`Log de auditoría actualizado: ${auditLogPath}`)
    } catch (error) {
      console.error(`Error escribiendo log de auditoría: ${error}`)
    }
  }

  /**
   * Escribe errores y advertencias al log de errores
   * @param errors - Errores de importación
   * @param warnings - Advertencias de importación
   * @param importId - ID de la importación
   */
  private async writeErrorsToLog(
    errors: ImportError[],
    warnings: ImportWarning[],
    importId: string
  ): Promise<void> {
    try {
      const errorLogPath = join(this.config.logsDirectory, 'import-errors.log')
      const timestamp = new Date().toISOString()

      const logEntries: string[] = []

      // Escribir errores
      for (const error of errors) {
        const entry = [
          `[${timestamp}] ERROR`,
          `ImportID=${importId}`,
          `Line=${error.line}`,
          `Field=${error.field || 'unknown'}`,
          `Code=${error.code}`,
          `Message=${error.message}`,
          `Value=${JSON.stringify(error.value)}`
        ].join(' | ')
        logEntries.push(entry)
      }

      // Escribir advertencias si están habilitadas
      if (this.config.includeWarnings) {
        for (const warning of warnings) {
          const entry = [
            `[${timestamp}] WARNING`,
            `ImportID=${importId}`,
            `Line=${warning.line}`,
            `Field=${warning.field || 'unknown'}`,
            `Code=${warning.code}`,
            `Message=${warning.message}`,
            `Value=${JSON.stringify(warning.value)}`
          ].join(' | ')
          logEntries.push(entry)
        }
      }

      if (logEntries.length > 0) {
        appendFileSync(errorLogPath, logEntries.join('\n') + '\n', 'utf8')
      }
    } catch (error) {
      console.error(`Error escribiendo log de errores: ${error}`)
    }
  }

  /**
   * Escribe métricas de rendimiento al log de métricas
   * @param result - Resultado de importación completa
   */
  private async writeMetricsToLog(result: CompleteImportResult): Promise<void> {
    try {
      const metricsLogPath = join(this.config.logsDirectory, 'import-metrics.log')
      const timestamp = new Date().toISOString()

      const logEntries: string[] = []

      // Métricas generales
      const generalEntry = [
        `[${timestamp}] IMPORT_METRICS`,
        `ImportID=${result.importId}`,
        `TotalDuration=${result.totalDuration}ms`,
        `TotalRecords=${result.results.reduce((sum, r) => sum + r.totalRecords, 0)}`,
        `OverallRecordsPerSecond=${Math.round(
          (result.results.reduce((sum, r) => sum + r.totalRecords, 0) / result.totalDuration) * 1000
        )}`,
        `Success=${result.overallSuccess}`
      ].join(' | ')
      logEntries.push(generalEntry)

      // Métricas por entidad
      for (const entityResult of result.results) {
        const entityEntry = [
          `[${timestamp}] ENTITY_METRICS`,
          `ImportID=${result.importId}`,
          `EntityType=${entityResult.entityType}`,
          `Duration=${entityResult.duration}ms`,
          `TotalRecords=${entityResult.totalRecords}`,
          `RecordsPerSecond=${
            entityResult.duration > 0
              ? Math.round((entityResult.totalRecords / entityResult.duration) * 1000)
              : 0
          }`,
          `SuccessRate=${
            entityResult.totalRecords > 0
              ? Math.round((entityResult.successfulImports / entityResult.totalRecords) * 100)
              : 0
          }%`
        ].join(' | ')
        logEntries.push(entityEntry)
      }

      appendFileSync(metricsLogPath, logEntries.join('\n') + '\n', 'utf8')
    } catch (error) {
      console.error(`Error escribiendo log de métricas: ${error}`)
    }
  }

  /**
   * Guarda un reporte de rendimiento en archivo
   * @param report - Reporte de rendimiento
   * @param fileName - Nombre del archivo
   */
  async savePerformanceReportToFile(report: PerformanceReport, fileName: string): Promise<void> {
    try {
      const filePath = join(this.config.outputDirectory, fileName)
      const reportJson = JSON.stringify(report, null, 2)

      writeFileSync(filePath, reportJson, 'utf8')
      console.log(`Reporte de rendimiento guardado: ${filePath}`)
    } catch (error) {
      console.error(`Error guardando reporte de rendimiento: ${error}`)
      throw new Error(
        `Error guardando reporte de rendimiento: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`
      )
    }
  }

  /**
   * Limpia logs antiguos según la configuración de retención
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')

      const logFiles = ['import-audit.log', 'import-errors.log', 'import-metrics.log']
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.config.auditLogRetentionDays)

      for (const logFile of logFiles) {
        const logPath = join(this.config.logsDirectory, logFile)

        try {
          const stats = await fs.stat(logPath)
          if (stats.mtime < cutoffDate) {
            // Crear archivo de respaldo antes de limpiar
            const backupPath = join(
              this.config.logsDirectory,
              `${path.parse(logFile).name}_backup_${Date.now()}.log`
            )
            await fs.copyFile(logPath, backupPath)

            // Limpiar el archivo original
            await fs.writeFile(logPath, '', 'utf8')
            console.log(`Log limpiado: ${logFile}, respaldo creado: ${backupPath}`)
          }
        } catch (error) {
          // El archivo no existe, continuar
        }
      }
    } catch (error) {
      console.error(`Error limpiando logs antiguos: ${error}`)
    }
  }

  // Métodos privados

  private ensureDirectories(): void {
    if (!existsSync(this.config.outputDirectory)) {
      mkdirSync(this.config.outputDirectory, { recursive: true })
    }
    if (!existsSync(this.config.logsDirectory)) {
      mkdirSync(this.config.logsDirectory, { recursive: true })
    }
  }

  private countTotalErrors(results: ImportResult[]): number {
    return results.reduce((total, result) => total + result.errors.length, 0)
  }

  private countTotalWarnings(results: ImportResult[]): number {
    return results.reduce((total, result) => total + result.warnings.length, 0)
  }

  private countSuccessfulImports(results: ImportResult[]): number {
    return results.reduce((total, result) => total + result.successfulImports, 0)
  }

  private countFailedImports(results: ImportResult[]): number {
    return results.reduce((total, result) => total + result.failedImports, 0)
  }

  private groupErrorsByEntity(errors: ImportError[]): Record<EntityType, number> {
    const grouped: Record<EntityType, number> = {
      [EntityType.USER]: 0,
      [EntityType.BUDGET]: 0,
      [EntityType.QUOTA]: 0,
      [EntityType.INTEREST]: 0
    }

    // Agrupar errores por tipo de entidad basado en el contexto del error
    for (const error of errors) {
      // Intentar determinar el tipo de entidad basado en el prefijo del código de error
      if (error.code.startsWith('USER_') || error.message.toLowerCase().includes('usuario')) {
        grouped[EntityType.USER]++
      } else if (
        error.code.startsWith('BUDGET_') ||
        error.message.toLowerCase().includes('presupuesto')
      ) {
        grouped[EntityType.BUDGET]++
      } else if (error.code.startsWith('QUOTA_') || error.message.toLowerCase().includes('cuota')) {
        grouped[EntityType.QUOTA]++
      } else if (
        error.code.startsWith('INTEREST_') ||
        error.message.toLowerCase().includes('interés')
      ) {
        grouped[EntityType.INTEREST]++
      }
      // Si no coincide con ningún patrón, no se cuenta en ninguna entidad específica
    }

    return grouped
  }

  private groupWarningsByEntity(warnings: ImportWarning[]): Record<EntityType, number> {
    const grouped: Record<EntityType, number> = {
      [EntityType.USER]: 0,
      [EntityType.BUDGET]: 0,
      [EntityType.QUOTA]: 0,
      [EntityType.INTEREST]: 0
    }

    // Agrupar advertencias por tipo de entidad
    for (const warning of warnings) {
      if (warning.code.startsWith('USER_') || warning.message.toLowerCase().includes('usuario')) {
        grouped[EntityType.USER]++
      } else if (
        warning.code.startsWith('BUDGET_') ||
        warning.message.toLowerCase().includes('presupuesto')
      ) {
        grouped[EntityType.BUDGET]++
      } else if (
        warning.code.startsWith('QUOTA_') ||
        warning.message.toLowerCase().includes('cuota')
      ) {
        grouped[EntityType.QUOTA]++
      } else if (
        warning.code.startsWith('INTEREST_') ||
        warning.message.toLowerCase().includes('interés')
      ) {
        grouped[EntityType.INTEREST]++
      }
    }

    return grouped
  }

  private groupWarningsByType(warnings: ImportWarning[]): Record<string, number> {
    const grouped: Record<string, number> = {}

    for (const warning of warnings) {
      const code = warning.code || 'UNKNOWN'
      grouped[code] = (grouped[code] || 0) + 1
    }

    return grouped
  }

  private groupErrorsByType(errors: ImportError[]): Record<string, number> {
    const grouped: Record<string, number> = {}

    for (const error of errors) {
      const code = error.code || 'UNKNOWN'
      grouped[code] = (grouped[code] || 0) + 1
    }

    return grouped
  }

  private generateErrorSummary(errors: ImportError[], warnings: ImportWarning[] = []): string {
    const summary: string[] = []

    if (errors.length === 0 && warnings.length === 0) {
      return 'No se encontraron errores ni advertencias durante la importación.'
    }

    if (errors.length > 0) {
      const errorsByType = this.groupErrorsByType(errors)
      const errorsByEntity = this.groupErrorsByEntity(errors)

      summary.push(`Se encontraron ${errors.length} errores durante la importación:`)
      summary.push('')
      summary.push('Por tipo de error:')
      for (const [errorType, count] of Object.entries(errorsByType)) {
        summary.push(`  - ${errorType}: ${count} errores`)
      }
      summary.push('')
      summary.push('Por entidad:')
      for (const [entityType, count] of Object.entries(errorsByEntity)) {
        if (count > 0) {
          summary.push(`  - ${entityType}: ${count} errores`)
        }
      }
    }

    if (warnings.length > 0) {
      const warningsByType = this.groupWarningsByType(warnings)
      const warningsByEntity = this.groupWarningsByEntity(warnings)

      if (errors.length > 0) summary.push('')
      summary.push(`Se encontraron ${warnings.length} advertencias durante la importación:`)
      summary.push('')
      summary.push('Por tipo de advertencia:')
      for (const [warningType, count] of Object.entries(warningsByType)) {
        summary.push(`  - ${warningType}: ${count} advertencias`)
      }
      summary.push('')
      summary.push('Por entidad:')
      for (const [entityType, count] of Object.entries(warningsByEntity)) {
        if (count > 0) {
          summary.push(`  - ${entityType}: ${count} advertencias`)
        }
      }
    }

    return summary.join('\n')
  }

  private calculateAverageRecordSize(entityType: EntityType): number {
    // Estimación del tamaño promedio de registro por tipo de entidad (en bytes)
    switch (entityType) {
      case EntityType.USER:
        return 150 // nombre, email, teléfono, etc.
      case EntityType.BUDGET:
        return 200 // fechas, montos, códigos, etc.
      case EntityType.QUOTA:
        return 100 // fecha, monto, referencia
      case EntityType.INTEREST:
        return 80 // términos, porcentajes
      default:
        return 100
    }
  }

  private getMetricsDuration(
    importId: string,
    entityType: EntityType,
    operation: 'parse' | 'validate' | 'insert' | 'update'
  ): number {
    const relevantMetrics = this.metrics.filter(
      (m) => m.importId === importId && m.entityType === entityType && m.operation === operation
    )
    return relevantMetrics.reduce((sum, m) => sum + m.duration, 0)
  }

  private identifyBottlenecks(
    entityPerformance: EntityPerformanceStats[]
  ): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = []

    for (const perf of entityPerformance) {
      // Identificar operaciones lentas
      if (perf.recordsPerSecond < 100) {
        bottlenecks.push({
          type: 'insertion',
          entityType: perf.entityType,
          description: `Baja velocidad de procesamiento para ${perf.entityType}: ${perf.recordsPerSecond} registros/segundo`,
          impact: perf.recordsPerSecond <= 50 ? 'high' : 'medium',
          suggestion: 'Considerar procesamiento por lotes más grandes o optimización de consultas'
        })
      }

      // Identificar validación lenta
      if (perf.validationTime > perf.duration * 0.5) {
        bottlenecks.push({
          type: 'validation',
          entityType: perf.entityType,
          description: `Validación lenta para ${perf.entityType}: ${Math.round(
            (perf.validationTime / perf.duration) * 100
          )}% del tiempo total`,
          impact: 'medium',
          suggestion: 'Optimizar reglas de validación o implementar validación en paralelo'
        })
      }
    }

    return bottlenecks
  }

  private generatePerformanceRecommendations(
    entityPerformance: EntityPerformanceStats[],
    bottlenecks: PerformanceBottleneck[]
  ): string[] {
    const recommendations: string[] = []

    // Recomendaciones generales
    const totalRecords = entityPerformance.reduce((sum, p) => sum + p.totalRecords, 0)
    const totalDuration = entityPerformance.reduce((sum, p) => sum + p.duration, 0)
    const overallSpeed = totalDuration > 0 ? (totalRecords / totalDuration) * 1000 : 0

    if (overallSpeed < 500) {
      recommendations.push(
        'Considerar aumentar el tamaño de lote para mejorar el rendimiento general'
      )
    }

    if (bottlenecks.length > 0) {
      recommendations.push('Se detectaron cuellos de botella que requieren atención')
    }

    // Recomendaciones específicas por cuello de botella
    const highImpactBottlenecks = bottlenecks.filter((b) => b.impact === 'high')
    if (highImpactBottlenecks.length > 0) {
      recommendations.push('Priorizar la resolución de cuellos de botella de alto impacto')
    }

    // Recomendaciones por entidad
    for (const perf of entityPerformance) {
      if (perf.recordsPerSecond < 100) {
        recommendations.push(
          `Optimizar importación de ${perf.entityType}: actualmente ${perf.recordsPerSecond} registros/segundo`
        )
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('El rendimiento de importación está dentro de los parámetros esperados')
    }

    return recommendations
  }

  private formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`
    }

    const seconds = Math.floor(milliseconds / 1000)
    const remainingMs = milliseconds % 1000

    if (seconds < 60) {
      return `${seconds}.${remainingMs.toString().padStart(3, '0')}s`
    }

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${minutes}m ${remainingSeconds}s`
  }
}
