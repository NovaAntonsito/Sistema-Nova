import { ipcMain } from 'electron'
import { ImportService } from '../services/ImportService'
import { ResponseFormatter, ApiResponse } from '../responses'
import {
  ImportResult,
  CompleteImportResult,
  EntityType,
  ValidationResult,
  ImportConfig
} from '../types/import.types'

/**
 * Controlador para operaciones de importación
 * Integra el ImportService con la arquitectura existente del sistema
 */
export class ImportController {
  private importService: ImportService

  constructor() {
    try {
      console.log('Creating ImportService...')
      this.importService = new ImportService()

      // Register IPC handlers
      console.log('Registering ImportController IPC handlers...')
      this.registerHandlers()
      console.log('ImportController initialized successfully')
    } catch (error) {
      console.error('Error in ImportController constructor:', error)
      throw error
    }
  }

  private registerHandlers(): void {
    // Import users from CSV handler
    ipcMain.handle(
      'import:users',
      async (_, filePath: string): Promise<ApiResponse<ImportResult>> => {
        try {
          const result = await this.importService.importUsersFromCSV(filePath)
          return ResponseFormatter.success(result, 'Usuarios importados exitosamente')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Import budgets from CSV handler
    ipcMain.handle(
      'import:budgets',
      async (_, filePath: string): Promise<ApiResponse<ImportResult>> => {
        try {
          const result = await this.importService.importBudgetsFromCSV(filePath)
          return ResponseFormatter.success(result, 'Presupuestos importados exitosamente')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Import quotas from CSV handler
    ipcMain.handle(
      'import:quotas',
      async (_, filePath: string): Promise<ApiResponse<ImportResult>> => {
        try {
          const result = await this.importService.importQuotasFromCSV(filePath)
          return ResponseFormatter.success(result, 'Cuotas importadas exitosamente')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Import interests from CSV handler
    ipcMain.handle(
      'import:interests',
      async (_, filePath: string): Promise<ApiResponse<ImportResult>> => {
        try {
          const result = await this.importService.importInterestsFromCSV(filePath)
          return ResponseFormatter.success(
            result,
            'Configuraciones de interés importadas exitosamente'
          )
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Import complete data from ZIP handler
    ipcMain.handle(
      'import:complete',
      async (_, zipFilePath: string): Promise<ApiResponse<CompleteImportResult>> => {
        try {
          const result = await this.importService.importFromZip(zipFilePath)
          return ResponseFormatter.success(result, 'Importación completa realizada exitosamente')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Validate CSV file handler
    ipcMain.handle(
      'import:validate-csv',
      async (
        _,
        filePath: string,
        entityType: EntityType
      ): Promise<ApiResponse<ValidationResult>> => {
        try {
          const result = await this.importService.validateCSVFile(filePath, entityType)
          return ResponseFormatter.success(result, 'Validación de archivo CSV completada')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Validate ZIP file handler
    ipcMain.handle(
      'import:validate-zip',
      async (_, zipFilePath: string): Promise<ApiResponse<ValidationResult>> => {
        try {
          const result = await this.importService.validateZipFile(zipFilePath)
          return ResponseFormatter.success(result, 'Validación de archivo ZIP completada')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Create backup handler
    ipcMain.handle(
      'import:create-backup',
      async (_, description?: string): Promise<ApiResponse<string>> => {
        try {
          const backupId = await this.importService.createBackup(description)
          return ResponseFormatter.success(backupId, 'Respaldo creado exitosamente')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Rollback to backup handler
    ipcMain.handle('import:rollback', async (_, backupId: string): Promise<ApiResponse<void>> => {
      try {
        await this.importService.rollbackToBackup(backupId)
        return ResponseFormatter.success(undefined, 'Rollback realizado exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Get import configuration handler
    ipcMain.handle('import:get-config', async (): Promise<ApiResponse<ImportConfig>> => {
      try {
        const config = this.importService.getConfiguration()
        return ResponseFormatter.success(config, 'Configuración de importación obtenida')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Update import configuration handler
    ipcMain.handle(
      'import:update-config',
      async (_, updates: Partial<ImportConfig>): Promise<ApiResponse<void>> => {
        try {
          await this.importService.updateConfiguration(updates)
          return ResponseFormatter.success(undefined, 'Configuración de importación actualizada')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Get performance metrics handler
    ipcMain.handle('import:get-metrics', async (): Promise<ApiResponse<any>> => {
      try {
        const metrics = this.importService.getPerformanceMetrics()
        return ResponseFormatter.success(metrics, 'Métricas de rendimiento obtenidas')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })
  }

  /**
   * Cleanup method to remove IPC handlers
   */
  public cleanup(): void {
    ipcMain.removeAllListeners('import:users')
    ipcMain.removeAllListeners('import:budgets')
    ipcMain.removeAllListeners('import:quotas')
    ipcMain.removeAllListeners('import:interests')
    ipcMain.removeAllListeners('import:complete')
    ipcMain.removeAllListeners('import:validate-csv')
    ipcMain.removeAllListeners('import:validate-zip')
    ipcMain.removeAllListeners('import:create-backup')
    ipcMain.removeAllListeners('import:rollback')
    ipcMain.removeAllListeners('import:get-config')
    ipcMain.removeAllListeners('import:update-config')
    ipcMain.removeAllListeners('import:get-metrics')
  }
}
