import { ipcMain, dialog, BrowserWindow } from 'electron'
import { ExportService, ExportResult } from '../services/ExportService'
import { UserRepository } from '../repositories/UserRepository'
import { BudgetRepository } from '../repositories/BudgetRepository'
import { QuotaRepository } from '../repositories/QuotaRepository'
import { InterestRepository } from '../repositories/InterestRepository'
import { AppDataSource } from '../config/database'
import { ResponseFormatter, ApiResponse } from '../responses'

export class ExportController {
  private exportService: ExportService

  constructor() {
    try {
      // Initialize repositories and service
      console.log('Creating ExportController repositories...')
      const userRepository = new UserRepository(AppDataSource)
      const budgetRepository = new BudgetRepository(AppDataSource)
      const quotaRepository = new QuotaRepository(AppDataSource)
      const interestRepository = new InterestRepository(AppDataSource)

      console.log('Creating ExportService...')
      this.exportService = new ExportService(
        userRepository,
        budgetRepository,
        quotaRepository,
        interestRepository
      )

      // Register IPC handlers
      console.log('Registering ExportController IPC handlers...')
      this.registerHandlers()
      console.log('ExportController initialized successfully')
    } catch (error) {
      console.error('Error in ExportController constructor:', error)
      throw error
    }
  }

  private registerHandlers(): void {
    // Export users to CSV handler
    ipcMain.handle('export:users', async (_, savePath?: string): Promise<ApiResponse<string>> => {
      try {
        const filePath = await this.exportService.exportUsersToCSV(savePath)
        return ResponseFormatter.success(filePath, 'Usuarios exportados exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Export budgets to CSV handler
    ipcMain.handle('export:budgets', async (_, savePath?: string): Promise<ApiResponse<string>> => {
      try {
        const filePath = await this.exportService.exportBudgetsToCSV(savePath)
        return ResponseFormatter.success(filePath, 'Presupuestos exportados exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    ipcMain.handle('export:quotas', async (_, savePath?: string): Promise<ApiResponse<string>> => {
      try {
        const filePath = await this.exportService.exportQuotasToCSV(savePath)
        return ResponseFormatter.success(filePath, 'Cuotas exportadas exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    ipcMain.handle(
      'export:interests',
      async (_, savePath?: string): Promise<ApiResponse<string>> => {
        try {
          const filePath = await this.exportService.exportInterestsToCSV(savePath)
          return ResponseFormatter.success(
            filePath,
            'Configuraciones de interés exportadas exitosamente'
          )
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    ipcMain.handle(
      'export:complete',
      async (_, savePath?: string): Promise<ApiResponse<ExportResult>> => {
        try {
          const result = await this.exportService.exportCompleteData(savePath)
          return ResponseFormatter.success(result, 'Exportación completa realizada exitosamente')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Get export statistics handler (optional utility)
    ipcMain.handle(
      'export:stats',
      async (
        _,
        entityType: 'users' | 'budgets' | 'quotas' | 'interests'
      ): Promise<ApiResponse<number>> => {
        try {
          const count = await this.exportService.getExportStats(entityType)
          return ResponseFormatter.success(count, `Estadísticas de ${entityType} obtenidas`)
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Show save dialog handler
    ipcMain.handle(
      'dialog:showSaveDialog',
      async (
        event,
        options: {
          title?: string
          defaultPath?: string
          filters?: Array<{ name: string; extensions: string[] }>
        }
      ): Promise<ApiResponse<string | null>> => {
        try {
          const window = BrowserWindow.fromWebContents(event.sender)
          if (!window) {
            return ResponseFormatter.error(new Error('No se pudo encontrar la ventana'))
          }

          const result = await dialog.showSaveDialog(window, {
            title: options.title || 'Guardar archivo',
            defaultPath: options.defaultPath,
            filters: options.filters || [
              { name: 'Archivos CSV', extensions: ['csv'] },
              { name: 'Archivos ZIP', extensions: ['zip'] },
              { name: 'Todos los archivos', extensions: ['*'] }
            ]
          })

          if (result.canceled) {
            return ResponseFormatter.success(null, 'Operación cancelada por el usuario')
          }

          return ResponseFormatter.success(result.filePath, 'Ruta seleccionada exitosamente')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )
  }

  /**
   * Cleanup method to remove IPC handlers
   */
  public cleanup(): void {
    ipcMain.removeAllListeners('export:users')
    ipcMain.removeAllListeners('export:budgets')
    ipcMain.removeAllListeners('export:quotas')
    ipcMain.removeAllListeners('export:interests')
    ipcMain.removeAllListeners('export:complete')
    ipcMain.removeAllListeners('export:stats')
    ipcMain.removeAllListeners('dialog:showSaveDialog')
  }
}
