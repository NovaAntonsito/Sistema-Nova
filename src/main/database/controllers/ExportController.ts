import { ipcMain } from 'electron'
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
    ipcMain.handle('export:users', async (): Promise<ApiResponse<string>> => {
      try {
        const filePath = await this.exportService.exportUsersToCSV()
        return ResponseFormatter.success(filePath, 'Usuarios exportados exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Export budgets to CSV handler
    ipcMain.handle('export:budgets', async (): Promise<ApiResponse<string>> => {
      try {
        const filePath = await this.exportService.exportBudgetsToCSV()
        return ResponseFormatter.success(filePath, 'Presupuestos exportados exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    ipcMain.handle('export:quotas', async (): Promise<ApiResponse<string>> => {
      try {
        const filePath = await this.exportService.exportQuotasToCSV()
        return ResponseFormatter.success(filePath, 'Cuotas exportadas exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    ipcMain.handle('export:interests', async (): Promise<ApiResponse<string>> => {
      try {
        const filePath = await this.exportService.exportInterestsToCSV()
        return ResponseFormatter.success(
          filePath,
          'Configuraciones de interés exportadas exitosamente'
        )
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    ipcMain.handle('export:complete', async (): Promise<ApiResponse<ExportResult>> => {
      try {
        const result = await this.exportService.exportCompleteData()
        return ResponseFormatter.success(result, 'Exportación completa realizada exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

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
  }
}
