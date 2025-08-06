/**
 * Pruebas para BackupManager
 * Verifica funcionalidad de respaldo y rollback
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import { BackupManager } from '../BackupManager'
import { BackupException } from '../../exceptions/importExceptions'
import { AppDataSource } from '../../config/database'

// Mock de electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-app-data')
  }
}))

// Mock del AppDataSource
vi.mock('../../config/database', () => ({
  AppDataSource: {
    isInitialized: true,
    initialize: vi.fn(),
    destroy: vi.fn(),
    createQueryRunner: vi.fn(() => ({
      query: vi.fn(),
      release: vi.fn()
    }))
  }
}))

describe('BackupManager', () => {
  let testBackupDir: string
  let testDbPath: string

  beforeAll(async () => {
    // Configurar directorio de prueba
    testBackupDir = path.join('/tmp', 'test-backups-' + Date.now())
    testDbPath = path.join('/tmp/test-app-data', 'SQLiteDB')

    // Crear directorios de prueba
    await fs.mkdir(path.dirname(testDbPath), { recursive: true })
    await fs.mkdir(testBackupDir, { recursive: true })

    // Crear archivo de base de datos de prueba
    await fs.writeFile(testDbPath, 'test database content')
  })

  beforeEach(() => {
    // Resetear instancia singleton
    BackupManager.resetInstance()

    // Mock de métodos del QueryRunner
    const mockQueryRunner = {
      query: vi.fn().mockImplementation((query: string) => {
        if (query.includes('sqlite_master')) {
          return Promise.resolve([
            { name: 'user' },
            { name: 'budget' },
            { name: 'quota' },
            { name: 'interest' }
          ])
        }
        if (query.includes('COUNT(*)')) {
          return Promise.resolve([{ count: 10 }])
        }
        return Promise.resolve([])
      }),
      release: vi.fn()
    }

    vi.mocked(AppDataSource.createQueryRunner).mockReturnValue(mockQueryRunner)
  })

  afterEach(async () => {
    // Limpiar archivos de prueba
    try {
      const files = await fs.readdir(testBackupDir)
      for (const file of files) {
        await fs.unlink(path.join(testBackupDir, file))
      }
    } catch (error) {
      // Ignorar errores de limpieza
    }

    BackupManager.resetInstance()
  })

  afterAll(async () => {
    // Limpiar directorios de prueba
    try {
      await fs.rm(testBackupDir, { recursive: true, force: true })
      await fs.rm(path.dirname(testDbPath), { recursive: true, force: true })
    } catch (error) {
      // Ignorar errores de limpieza
    }
  })

  describe('createBackup', () => {
    it('debería crear un respaldo exitosamente', async () => {
      const backupManager = BackupManager.getInstance({
        backupDirectory: testBackupDir,
        retentionDays: 30,
        compressionEnabled: false,
        checksumValidation: true,
        maxBackupSize: 100 * 1024 * 1024,
        cleanupInterval: 24 * 60 * 60 * 1000
      })

      const backupId = await backupManager.createBackup('Respaldo de prueba')

      expect(backupId).toBeDefined()
      expect(backupId).toMatch(/^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{6}$/)

      // Verificar que se crearon los archivos
      const backupFilePath = path.join(testBackupDir, `${backupId}.db`)
      const metadataFilePath = path.join(testBackupDir, `${backupId}.metadata.json`)

      const backupExists = await fs
        .access(backupFilePath)
        .then(() => true)
        .catch(() => false)
      const metadataExists = await fs
        .access(metadataFilePath)
        .then(() => true)
        .catch(() => false)

      expect(backupExists).toBe(true)
      expect(metadataExists).toBe(true)
    })

    it('debería crear metadatos correctos', async () => {
      const backupManager = BackupManager.getInstance({
        backupDirectory: testBackupDir,
        retentionDays: 30,
        compressionEnabled: false,
        checksumValidation: true,
        maxBackupSize: 100 * 1024 * 1024,
        cleanupInterval: 24 * 60 * 60 * 1000
      })

      const description = 'Respaldo con metadatos de prueba'
      const backupId = await backupManager.createBackup(description)

      const metadataFilePath = path.join(testBackupDir, `${backupId}.metadata.json`)
      const metadataContent = await fs.readFile(metadataFilePath, 'utf8')
      const metadata = JSON.parse(metadataContent)

      expect(metadata.id).toBe(backupId)
      expect(metadata.description).toBe(description)
      expect(metadata.tables).toEqual(['user', 'budget', 'quota', 'interest'])
      expect(metadata.recordCounts).toEqual({
        user: 10,
        budget: 10,
        quota: 10,
        interest: 10
      })
      expect(metadata.version).toBe('1.0')
      expect(metadata.size).toBeGreaterThan(0)
    })
  })

  describe('listBackups', () => {
    it('debería listar respaldos existentes', async () => {
      const backupManager = BackupManager.getInstance({
        backupDirectory: testBackupDir,
        retentionDays: 30,
        compressionEnabled: false,
        checksumValidation: true,
        maxBackupSize: 100 * 1024 * 1024,
        cleanupInterval: 24 * 60 * 60 * 1000
      })

      // Crear algunos respaldos
      const backupId1 = await backupManager.createBackup('Respaldo 1')
      const backupId2 = await backupManager.createBackup('Respaldo 2')

      const backups = await backupManager.listBackups()

      expect(backups).toHaveLength(2)
      expect(backups.map((b) => b.id)).toContain(backupId1)
      expect(backups.map((b) => b.id)).toContain(backupId2)

      // Verificar que están ordenados por fecha (más reciente primero)
      expect(backups[0].createdAt.getTime()).toBeGreaterThanOrEqual(backups[1].createdAt.getTime())
    })

    it('debería retornar lista vacía si no hay respaldos', async () => {
      const backupManager = BackupManager.getInstance({
        backupDirectory: testBackupDir,
        retentionDays: 30,
        compressionEnabled: false,
        checksumValidation: true,
        maxBackupSize: 100 * 1024 * 1024,
        cleanupInterval: 24 * 60 * 60 * 1000
      })

      const backups = await backupManager.listBackups()
      expect(backups).toHaveLength(0)
    })
  })

  describe('deleteBackup', () => {
    it('debería eliminar un respaldo exitosamente', async () => {
      const backupManager = BackupManager.getInstance({
        backupDirectory: testBackupDir,
        retentionDays: 30,
        compressionEnabled: false,
        checksumValidation: true,
        maxBackupSize: 100 * 1024 * 1024,
        cleanupInterval: 24 * 60 * 60 * 1000
      })

      const backupId = await backupManager.createBackup('Respaldo a eliminar')

      // Verificar que existe
      let backups = await backupManager.listBackups()
      expect(backups).toHaveLength(1)

      // Eliminar
      await backupManager.deleteBackup(backupId)

      // Verificar que se eliminó
      backups = await backupManager.listBackups()
      expect(backups).toHaveLength(0)
    })

    it('debería manejar eliminación de respaldo inexistente', async () => {
      const backupManager = BackupManager.getInstance({
        backupDirectory: testBackupDir,
        retentionDays: 30,
        compressionEnabled: false,
        checksumValidation: true,
        maxBackupSize: 100 * 1024 * 1024,
        cleanupInterval: 24 * 60 * 60 * 1000
      })

      // No debería lanzar error al eliminar respaldo inexistente
      await expect(backupManager.deleteBackup('inexistente')).resolves.not.toThrow()
    })
  })

  describe('restoreFromBackup', () => {
    it('debería restaurar desde respaldo exitosamente', async () => {
      const backupManager = BackupManager.getInstance({
        backupDirectory: testBackupDir,
        retentionDays: 30,
        compressionEnabled: false,
        checksumValidation: true,
        maxBackupSize: 100 * 1024 * 1024,
        cleanupInterval: 24 * 60 * 60 * 1000
      })

      const backupId = await backupManager.createBackup('Respaldo para restaurar')

      const result = await backupManager.restoreFromBackup(backupId)

      expect(result.success).toBe(true)
      expect(result.backupId).toBe(backupId)
      expect(result.restoredTables).toEqual(['user', 'budget', 'quota', 'interest'])
      expect(result.duration).toBeGreaterThan(0)
      expect(result.error).toBeUndefined()
    })

    it('debería fallar al restaurar respaldo inexistente', async () => {
      const backupManager = BackupManager.getInstance({
        backupDirectory: testBackupDir,
        retentionDays: 30,
        compressionEnabled: false,
        checksumValidation: true,
        maxBackupSize: 100 * 1024 * 1024,
        cleanupInterval: 24 * 60 * 60 * 1000
      })

      const result = await backupManager.restoreFromBackup('inexistente')

      expect(result.success).toBe(false)
      expect(result.backupId).toBe('inexistente')
      expect(result.error).toContain('Respaldo no encontrado')
    })
  })

  describe('cleanupOldBackups', () => {
    it('debería mantener respaldos recientes', async () => {
      const backupManager = BackupManager.getInstance({
        backupDirectory: testBackupDir,
        retentionDays: 30,
        compressionEnabled: false,
        checksumValidation: true,
        maxBackupSize: 100 * 1024 * 1024,
        cleanupInterval: 24 * 60 * 60 * 1000
      })

      const backupId = await backupManager.createBackup('Respaldo reciente')

      // Verificar que existe
      let backups = await backupManager.listBackups()
      expect(backups).toHaveLength(1)

      // Ejecutar limpieza
      await backupManager.cleanupOldBackups()

      // Verificar que se mantiene
      backups = await backupManager.listBackups()
      expect(backups).toHaveLength(1)
      expect(backups[0].id).toBe(backupId)
    })
  })

  describe('singleton pattern', () => {
    it('debería retornar la misma instancia', () => {
      const instance1 = BackupManager.getInstance({
        backupDirectory: testBackupDir,
        retentionDays: 30,
        compressionEnabled: false,
        checksumValidation: true,
        maxBackupSize: 100 * 1024 * 1024,
        cleanupInterval: 24 * 60 * 60 * 1000
      })
      const instance2 = BackupManager.getInstance()

      expect(instance1).toBe(instance2)
    })
  })
})
