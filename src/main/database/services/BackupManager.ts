/**
 * Gestor de respaldos para el sistema de importación
 * Cumple con requisitos: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import { app } from 'electron'
import { AppDataSource } from '../config/database'
import { BackupException } from '../exceptions/importExceptions'
import {
  BackupInfo,
  BackupResult,
  RollbackResult,
  BackupConfig,
  BackupMetadata
} from '../types/backup.types'

export class BackupManager {
  private static instance: BackupManager
  private config: BackupConfig
  private cleanupTimer?: NodeJS.Timeout

  private constructor(config?: Partial<BackupConfig>) {
    this.config = { ...this.getDefaultConfig(), ...config }
    this.initializeBackupDirectory()
    this.startCleanupTimer()
  }

  /**
   * Obtiene la instancia singleton del BackupManager
   */
  static getInstance(config?: Partial<BackupConfig>): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager(config)
    }
    return BackupManager.instance
  }

  /**
   * Resetea la instancia singleton (solo para testing)
   */
  static resetInstance(): void {
    if (BackupManager.instance) {
      BackupManager.instance.shutdown()
      BackupManager.instance = undefined as any
    }
  }

  /**
   * Crea un respaldo de la base de datos
   * Requisito 7.1: Crear respaldo automático antes de importaciones
   */
  async createBackup(description = 'Respaldo automático antes de importación'): Promise<string> {
    const startTime = Date.now()
    const backupId = this.generateBackupId()

    try {
      console.log(`Iniciando creación de respaldo: ${backupId}`)

      // Crear directorio de respaldo si no existe
      await this.ensureBackupDirectory()

      // Obtener ruta del archivo de respaldo
      const backupFilePath = this.getBackupFilePath(backupId)

      // Crear respaldo de la base de datos SQLite
      await this.createSQLiteBackup(backupFilePath)

      // Obtener información del archivo
      const stats = await fs.stat(backupFilePath)
      const checksum = await this.calculateChecksum(backupFilePath)

      // Crear metadatos del respaldo
      const metadata: BackupMetadata = {
        id: backupId,
        createdAt: new Date(),
        description,
        tables: await this.getTableNames(),
        recordCounts: await this.getRecordCounts(),
        size: stats.size,
        checksum,
        version: '1.0'
      }

      // Guardar metadatos
      await this.saveBackupMetadata(backupId, metadata)

      const duration = Date.now() - startTime
      console.log(`Respaldo creado exitosamente: ${backupId} (${duration}ms)`)

      return backupId
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`Error creando respaldo ${backupId}:`, error)
      throw new BackupException(
        `Error creando respaldo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Restaura la base de datos desde un respaldo
   * Requisito 7.2: Rollback automático en caso de errores
   */
  async restoreFromBackup(backupId: string): Promise<RollbackResult> {
    const startTime = Date.now()

    try {
      console.log(`Iniciando rollback desde respaldo: ${backupId}`)

      // Verificar que el respaldo existe
      const backupExists = await this.backupExists(backupId)
      if (!backupExists) {
        throw new BackupException(`Respaldo no encontrado: ${backupId}`)
      }

      // Obtener metadatos del respaldo
      const metadata = await this.getBackupMetadata(backupId)

      // Validar integridad del respaldo
      await this.validateBackupIntegrity(backupId, metadata)

      // Cerrar conexiones existentes
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy()
      }

      // Restaurar archivo de base de datos
      const backupFilePath = this.getBackupFilePath(backupId)
      const currentDbPath = this.getCurrentDatabasePath()

      // Crear respaldo del estado actual antes de restaurar
      const emergencyBackupPath = `${currentDbPath}.emergency.${Date.now()}`
      try {
        await fs.copyFile(currentDbPath, emergencyBackupPath)
      } catch (error) {
        console.warn('No se pudo crear respaldo de emergencia:', error)
      }

      // Restaurar desde respaldo
      await fs.copyFile(backupFilePath, currentDbPath)

      // Reinicializar conexión a la base de datos
      await AppDataSource.initialize()

      const duration = Date.now() - startTime
      console.log(`Rollback completado exitosamente desde ${backupId} (${duration}ms)`)

      return {
        success: true,
        backupId,
        restoredTables: metadata.tables,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`Error en rollback desde ${backupId}:`, error)

      return {
        success: false,
        backupId,
        restoredTables: [],
        duration,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * Lista todos los respaldos disponibles
   * Requisito 7.3: Mantener respaldo por período configurable
   */
  async listBackups(): Promise<BackupInfo[]> {
    try {
      await this.ensureBackupDirectory()

      const backupDir = this.config.backupDirectory
      const files = await fs.readdir(backupDir)

      const backups: BackupInfo[] = []

      for (const file of files) {
        if (file.endsWith('.db')) {
          const backupId = file.replace('.db', '')
          try {
            const metadata = await this.getBackupMetadata(backupId)
            const filePath = this.getBackupFilePath(backupId)
            const stats = await fs.stat(filePath)

            backups.push({
              id: backupId,
              createdAt: metadata.createdAt,
              size: stats.size,
              description: metadata.description,
              filePath,
              checksum: metadata.checksum
            })
          } catch (error) {
            console.warn(`Error leyendo metadatos para respaldo ${backupId}:`, error)
          }
        }
      }

      // Ordenar por fecha de creación (más reciente primero)
      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    } catch (error) {
      console.error('Error listando respaldos:', error)
      throw new BackupException(
        `Error listando respaldos: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Elimina un respaldo específico
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      const backupFilePath = this.getBackupFilePath(backupId)
      const metadataFilePath = this.getMetadataFilePath(backupId)

      // Eliminar archivo de respaldo
      try {
        await fs.unlink(backupFilePath)
      } catch (error) {
        console.warn(`Error eliminando archivo de respaldo ${backupFilePath}:`, error)
      }

      // Eliminar archivo de metadatos
      try {
        await fs.unlink(metadataFilePath)
      } catch (error) {
        console.warn(`Error eliminando metadatos ${metadataFilePath}:`, error)
      }

      console.log(`Respaldo eliminado: ${backupId}`)
    } catch (error) {
      console.error(`Error eliminando respaldo ${backupId}:`, error)
      throw new BackupException(
        `Error eliminando respaldo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Limpia respaldos antiguos automáticamente
   * Requisito 7.5: Sistema de limpieza automática de respaldos antiguos
   */
  async cleanupOldBackups(): Promise<void> {
    try {
      console.log('Iniciando limpieza de respaldos antiguos...')

      const backups = await this.listBackups()
      const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000)

      let deletedCount = 0

      for (const backup of backups) {
        if (backup.createdAt < cutoffDate) {
          try {
            await this.deleteBackup(backup.id)
            deletedCount++
          } catch (error) {
            console.error(`Error eliminando respaldo antiguo ${backup.id}:`, error)
          }
        }
      }

      console.log(`Limpieza completada. Respaldos eliminados: ${deletedCount}`)
    } catch (error) {
      console.error('Error en limpieza de respaldos:', error)
    }
  }

  /**
   * Detiene el gestor de respaldos y limpia recursos
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    console.log('BackupManager detenido')
  }

  // Métodos privados

  private getDefaultConfig(): BackupConfig {
    const userDataPath = app ? app.getPath('userData') : process.cwd()

    return {
      backupDirectory: path.join(userDataPath, 'backups'),
      retentionDays: 30,
      compressionEnabled: false,
      checksumValidation: true,
      maxBackupSize: 100 * 1024 * 1024, // 100MB
      cleanupInterval: 24 * 60 * 60 * 1000 // 24 horas
    }
  }

  private async initializeBackupDirectory(): Promise<void> {
    try {
      await this.ensureBackupDirectory()
    } catch (error) {
      console.error('Error inicializando directorio de respaldos:', error)
    }
  }

  private startCleanupTimer(): void {
    // Ejecutar limpieza cada 24 horas
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldBackups().catch((error) => {
        console.error('Error en limpieza automática:', error)
      })
    }, this.config.cleanupInterval)
  }

  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const random = Math.random().toString(36).substring(2, 8)
    return `backup-${timestamp}-${random}`
  }

  private getBackupFilePath(backupId: string): string {
    return path.join(this.config.backupDirectory, `${backupId}.db`)
  }

  private getMetadataFilePath(backupId: string): string {
    return path.join(this.config.backupDirectory, `${backupId}.metadata.json`)
  }

  private getCurrentDatabasePath(): string {
    const userDataPath = app ? app.getPath('userData') : process.cwd()
    return path.join(userDataPath, 'SQLiteDB')
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.access(this.config.backupDirectory)
    } catch {
      await fs.mkdir(this.config.backupDirectory, { recursive: true })
    }
  }

  private async createSQLiteBackup(backupFilePath: string): Promise<void> {
    const currentDbPath = this.getCurrentDatabasePath()

    try {
      await fs.copyFile(currentDbPath, backupFilePath)
    } catch (error) {
      throw new BackupException(
        `Error copiando base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    if (!this.config.checksumValidation) {
      return ''
    }

    try {
      const fileBuffer = await fs.readFile(filePath)
      return crypto.createHash('sha256').update(fileBuffer).digest('hex')
    } catch (error) {
      console.warn(`Error calculando checksum para ${filePath}:`, error)
      return ''
    }
  }

  private async getTableNames(): Promise<string[]> {
    try {
      if (!AppDataSource.isInitialized) {
        return []
      }

      const queryRunner = AppDataSource.createQueryRunner()
      const result = await queryRunner.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      )
      await queryRunner.release()

      return result.map((row: any) => row.name)
    } catch (error) {
      console.warn('Error obteniendo nombres de tablas:', error)
      return []
    }
  }

  private async getRecordCounts(): Promise<Record<string, number>> {
    try {
      if (!AppDataSource.isInitialized) {
        return {}
      }

      const tableNames = await this.getTableNames()
      const counts: Record<string, number> = {}

      const queryRunner = AppDataSource.createQueryRunner()

      for (const tableName of tableNames) {
        try {
          const result = await queryRunner.query(`SELECT COUNT(*) as count FROM "${tableName}"`)
          counts[tableName] = result[0]?.count || 0
        } catch (error) {
          console.warn(`Error contando registros en tabla ${tableName}:`, error)
          counts[tableName] = 0
        }
      }

      await queryRunner.release()
      return counts
    } catch (error) {
      console.warn('Error obteniendo conteos de registros:', error)
      return {}
    }
  }

  private async saveBackupMetadata(backupId: string, metadata: BackupMetadata): Promise<void> {
    const metadataFilePath = this.getMetadataFilePath(backupId)
    const metadataJson = JSON.stringify(metadata, null, 2)

    try {
      await fs.writeFile(metadataFilePath, metadataJson, 'utf8')
    } catch (error) {
      throw new BackupException(
        `Error guardando metadatos: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  private async getBackupMetadata(backupId: string): Promise<BackupMetadata> {
    const metadataFilePath = this.getMetadataFilePath(backupId)

    try {
      const metadataJson = await fs.readFile(metadataFilePath, 'utf8')
      const metadata = JSON.parse(metadataJson)

      // Convertir fecha de string a Date si es necesario
      if (typeof metadata.createdAt === 'string') {
        metadata.createdAt = new Date(metadata.createdAt)
      }

      return metadata
    } catch (error) {
      throw new BackupException(
        `Error leyendo metadatos para ${backupId}: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  private async backupExists(backupId: string): Promise<boolean> {
    try {
      const backupFilePath = this.getBackupFilePath(backupId)
      await fs.access(backupFilePath)
      return true
    } catch {
      return false
    }
  }

  private async validateBackupIntegrity(backupId: string, metadata: BackupMetadata): Promise<void> {
    if (!this.config.checksumValidation || !metadata.checksum) {
      return
    }

    const backupFilePath = this.getBackupFilePath(backupId)
    const currentChecksum = await this.calculateChecksum(backupFilePath)

    if (currentChecksum !== metadata.checksum) {
      throw new BackupException(`Integridad del respaldo comprometida: ${backupId}`)
    }
  }
}
