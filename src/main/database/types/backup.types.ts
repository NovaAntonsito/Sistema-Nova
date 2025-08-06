/**
 * Tipos para el sistema de respaldo y rollback
 * Cumple con requisitos: 7.1, 7.2, 7.3, 7.4, 7.5
 */

/**
 * Información de un respaldo
 */
export interface BackupInfo {
  id: string
  createdAt: Date
  size: number
  description: string
  filePath: string
  checksum?: string
}

/**
 * Resultado de operación de respaldo
 */
export interface BackupResult {
  success: boolean
  backupId?: string
  filePath?: string
  size?: number
  duration: number
  error?: string
}

/**
 * Resultado de operación de rollback
 */
export interface RollbackResult {
  success: boolean
  backupId: string
  restoredTables: string[]
  duration: number
  error?: string
}

/**
 * Configuración del sistema de respaldo
 */
export interface BackupConfig {
  backupDirectory: string
  retentionDays: number
  compressionEnabled: boolean
  checksumValidation: boolean
  maxBackupSize: number
  cleanupInterval: number
}

/**
 * Metadatos de respaldo
 */
export interface BackupMetadata {
  id: string
  createdAt: Date
  description: string
  tables: string[]
  recordCounts: Record<string, number>
  size: number
  checksum?: string
  version: string
}
