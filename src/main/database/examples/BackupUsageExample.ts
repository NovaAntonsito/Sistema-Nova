/**
 * Ejemplo de uso del BackupManager en el sistema de importación
 * Demuestra cómo integrar respaldos en el flujo de importación
 */

import { BackupManager } from '../services/BackupManager'
import { BackupException } from '../exceptions/importExceptions'

/**
 * Ejemplo de flujo de importación con respaldo automático
 */
export class ImportWithBackupExample {
  private backupManager: BackupManager

  constructor() {
    this.backupManager = BackupManager.getInstance()
  }

  /**
   * Simula una importación completa con respaldo y rollback automático
   */
  async performImportWithBackup(importData: any): Promise<void> {
    let backupId: string | null = null

    try {
      console.log('=== Iniciando importación con respaldo ===')

      // 1. Crear respaldo antes de la importación (Requisito 7.1)
      console.log('📦 Creando respaldo antes de importación...')
      backupId = await this.backupManager.createBackup(
        `Respaldo antes de importación - ${new Date().toISOString()}`
      )
      console.log(`✅ Respaldo creado: ${backupId}`)

      // 2. Simular proceso de importación
      console.log('📥 Iniciando proceso de importación...')
      await this.simulateImportProcess(importData)
      console.log('✅ Importación completada exitosamente')

      // 3. Mantener respaldo por período configurable (Requisito 7.3)
      console.log('📋 Respaldo mantenido para auditoría')
    } catch (error) {
      console.error('❌ Error durante importación:', error)

      if (backupId) {
        // 4. Rollback automático en caso de error (Requisito 7.2)
        console.log('🔄 Iniciando rollback automático...')
        const rollbackResult = await this.backupManager.restoreFromBackup(backupId)

        if (rollbackResult.success) {
          console.log(`✅ Rollback completado exitosamente en ${rollbackResult.duration}ms`)
          console.log(`📊 Tablas restauradas: ${rollbackResult.restoredTables.join(', ')}`)
        } else {
          console.error('❌ Error en rollback:', rollbackResult.error)
          throw new Error(
            `Fallo crítico: Error en importación y rollback - ${rollbackResult.error}`
          )
        }
      }

      throw error
    }
  }

  /**
   * Ejemplo de gestión de múltiples respaldos
   */
  async manageBackups(): Promise<void> {
    console.log('=== Gestión de respaldos ===')

    // Listar respaldos existentes
    const backups = await this.backupManager.listBackups()
    console.log(`📋 Respaldos disponibles: ${backups.length}`)

    backups.forEach((backup, index) => {
      console.log(`  ${index + 1}. ${backup.id}`)
      console.log(`     Fecha: ${backup.createdAt.toLocaleString()}`)
      console.log(`     Tamaño: ${(backup.size / 1024).toFixed(2)} KB`)
      console.log(`     Descripción: ${backup.description}`)
      console.log('')
    })

    // Limpieza automática de respaldos antiguos (Requisito 7.5)
    console.log('🧹 Ejecutando limpieza de respaldos antiguos...')
    await this.backupManager.cleanupOldBackups()
    console.log('✅ Limpieza completada')

    // Verificar respaldos después de limpieza
    const backupsAfterCleanup = await this.backupManager.listBackups()
    console.log(`📋 Respaldos después de limpieza: ${backupsAfterCleanup.length}`)
  }

  /**
   * Ejemplo de rollback manual
   */
  async performManualRollback(backupId: string): Promise<void> {
    console.log(`=== Rollback manual a respaldo ${backupId} ===`)

    try {
      // Rollback manual (Requisito 7.4)
      const rollbackResult = await this.backupManager.restoreFromBackup(backupId)

      if (rollbackResult.success) {
        console.log('✅ Rollback manual completado exitosamente')
        console.log(`⏱️  Duración: ${rollbackResult.duration}ms`)
        console.log(`📊 Tablas restauradas: ${rollbackResult.restoredTables.join(', ')}`)
      } else {
        console.error('❌ Error en rollback manual:', rollbackResult.error)
      }
    } catch (error) {
      console.error('❌ Excepción durante rollback manual:', error)
    }
  }

  /**
   * Simula un proceso de importación que puede fallar
   */
  private async simulateImportProcess(importData: any): Promise<void> {
    // Simular procesamiento
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Simular diferentes escenarios
    if (importData.shouldFail) {
      throw new Error('Error simulado durante importación')
    }

    if (importData.shouldFailAfterPartialImport) {
      // Simular importación parcial antes del fallo
      console.log('📝 Importando usuarios...')
      await new Promise((resolve) => setTimeout(resolve, 50))
      console.log('📝 Importando presupuestos...')
      await new Promise((resolve) => setTimeout(resolve, 50))

      throw new Error('Error después de importación parcial')
    }

    // Importación exitosa
    console.log('📝 Importando usuarios...')
    await new Promise((resolve) => setTimeout(resolve, 30))
    console.log('📝 Importando presupuestos...')
    await new Promise((resolve) => setTimeout(resolve, 30))
    console.log('📝 Importando cuotas...')
    await new Promise((resolve) => setTimeout(resolve, 30))
    console.log('📝 Importando configuraciones de interés...')
    await new Promise((resolve) => setTimeout(resolve, 30))
  }
}

/**
 * Función de demostración
 */
export async function demonstrateBackupSystem(): Promise<void> {
  const importExample = new ImportWithBackupExample()

  try {
    console.log('🚀 Demostración del sistema de respaldo\n')

    // Ejemplo 1: Importación exitosa
    console.log('--- Ejemplo 1: Importación exitosa ---')
    await importExample.performImportWithBackup({ shouldFail: false })
    console.log('')

    // Ejemplo 2: Importación con fallo y rollback
    console.log('--- Ejemplo 2: Importación con fallo y rollback ---')
    try {
      await importExample.performImportWithBackup({ shouldFail: true })
    } catch (error) {
      console.log('🔄 Importación falló pero rollback fue exitoso')
    }
    console.log('')

    // Ejemplo 3: Gestión de respaldos
    console.log('--- Ejemplo 3: Gestión de respaldos ---')
    await importExample.manageBackups()
    console.log('')

    console.log('✅ Demostración completada exitosamente')
  } catch (error) {
    console.error('❌ Error en demostración:', error)
  }
}

// Ejecutar demostración si el archivo se ejecuta directamente
if (require.main === module) {
  demonstrateBackupSystem().catch(console.error)
}
