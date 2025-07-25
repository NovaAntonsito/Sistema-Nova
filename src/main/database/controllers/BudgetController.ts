import { ipcMain } from 'electron'
import { BudgetService } from '../services/BudgetService'
import { BudgetRepository } from '../repositories/BudgetRepository'
import { UserRepository } from '../repositories/UserRepository'
import { InterestRepository } from '../repositories/InterestRepository'
import { QuotaRepository } from '../repositories/QuotaRepository'
import { AppDataSource } from '../config/database'
import { CreateBudgetDto, UpdateBudgetDto } from '../dto/budget.dto'
import { Status } from '../entities/Status'
import { ResponseFormatter, ApiResponse } from '../responses'

export class BudgetController {
  private budgetService: BudgetService

  constructor() {
    try {
      // Initialize repositories and service
      console.log('Creating BudgetController repositories...')
      const budgetRepository = new BudgetRepository(AppDataSource)
      const userRepository = new UserRepository(AppDataSource)
      const interestRepository = new InterestRepository(AppDataSource)
      const quotaRepository = new QuotaRepository(AppDataSource)

      console.log('Creating BudgetService...')
      this.budgetService = new BudgetService(
        budgetRepository,
        userRepository,
        interestRepository,
        quotaRepository
      )

      // Register IPC handlers
      console.log('Registering BudgetController IPC handlers...')
      this.registerHandlers()
      console.log('BudgetController initialized successfully')
    } catch (error) {
      console.error('Error in BudgetController constructor:', error)
      throw error
    }
  }

  private registerHandlers(): void {
    // Create budget handler
    ipcMain.handle(
      'budget:create',
      async (_, createBudgetDto: CreateBudgetDto): Promise<ApiResponse> => {
        try {
          const budget = await this.budgetService.createBudget(createBudgetDto)
          return ResponseFormatter.success(budget, 'Presupuesto creado exitosamente')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Get all budgets handler
    ipcMain.handle('budget:getAll', async (): Promise<ApiResponse> => {
      try {
        const budgets = await this.budgetService.getAllBudgets()
        return ResponseFormatter.success(budgets)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Get budget by ID handler
    ipcMain.handle('budget:getById', async (_, id: string): Promise<ApiResponse> => {
      try {
        const budget = await this.budgetService.getBudgetById(id)
        return ResponseFormatter.success(budget)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Search budget by code handler
    ipcMain.handle('budget:searchByCode', async (_, code: string): Promise<ApiResponse> => {
      try {
        const budget = await this.budgetService.searchByCode(code)
        return ResponseFormatter.success(budget)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Get budgets by user ID handler
    ipcMain.handle('budget:getByUserId', async (_, userId: string): Promise<ApiResponse> => {
      try {
        const budgets = await this.budgetService.getBudgetsByUserId(userId)
        return ResponseFormatter.success(budgets)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Get budgets by status handler
    ipcMain.handle('budget:getByStatus', async (_, status: Status): Promise<ApiResponse> => {
      try {
        const budgets = await this.budgetService.getBudgetsByStatus(status)
        return ResponseFormatter.success(budgets)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Update budget handler (add quota to existing budget)
    ipcMain.handle(
      'budget:update',
      async (_, id: string, updateBudgetDto: UpdateBudgetDto): Promise<ApiResponse> => {
        try {
          const budget = await this.budgetService.updateBudget(id, updateBudgetDto)
          return ResponseFormatter.success(budget, 'Presupuesto actualizado exitosamente')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Add quota to budget handler
    ipcMain.handle(
      'budget:addQuota',
      async (_, budgetId: string, amount: number): Promise<ApiResponse> => {
        try {
          await this.budgetService.addQuotaToBudget(budgetId, amount)
          return ResponseFormatter.success(null, 'Cuota agregada exitosamente')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Delete budget handler (logical deletion)
    ipcMain.handle('budget:delete', async (_, id: string): Promise<ApiResponse> => {
      try {
        await this.budgetService.deleteBudget(id)
        return ResponseFormatter.success(null, 'Presupuesto eliminado exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Update expired budgets handler
    ipcMain.handle('budget:updateExpired', async (): Promise<ApiResponse> => {
      try {
        const updatedCount = await this.budgetService.updateExpiredBudgets()
        return ResponseFormatter.success(
          { updatedCount },
          `${updatedCount} presupuestos actualizados a estado vencido`
        )
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Perform status maintenance handler
    ipcMain.handle('budget:performStatusMaintenance', async (): Promise<ApiResponse> => {
      try {
        const result = await this.budgetService.performStatusMaintenance()
        return ResponseFormatter.success(
          result,
          `Mantenimiento completado: ${result.expired} vencidos, ${result.finished} terminados`
        )
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Get status summary handler
    ipcMain.handle('budget:getStatusSummary', async (): Promise<ApiResponse> => {
      try {
        const summary = await this.budgetService.getStatusSummary()
        return ResponseFormatter.success(summary)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Check code availability handler
    ipcMain.handle('budget:isCodeAvailable', async (_, code: string): Promise<ApiResponse> => {
      try {
        const isAvailable = await this.budgetService.isCodeAvailable(code)
        return ResponseFormatter.success({ isAvailable })
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Generate next code handler
    ipcMain.handle('budget:generateNextCode', async (): Promise<ApiResponse> => {
      try {
        const nextCode = await this.budgetService.generateNextCode()
        return ResponseFormatter.success({ nextCode })
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Calculate total amount handler
    ipcMain.handle(
      'budget:calculateTotalAmount',
      async (_, baseAmount: number, interestPercentage: number): Promise<ApiResponse> => {
        try {
          const totalAmount = this.budgetService.calculateTotalAmount(
            baseAmount,
            interestPercentage
          )
          return ResponseFormatter.success({ totalAmount })
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Calculate monthly payment handler
    ipcMain.handle(
      'budget:calculateMonthlyPayment',
      async (_, totalAmount: number, paymentTerm: number): Promise<ApiResponse> => {
        try {
          const monthlyPayment = this.budgetService.calculateMonthlyPayment(
            totalAmount,
            paymentTerm
          )
          return ResponseFormatter.success({ monthlyPayment })
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
    ipcMain.removeAllListeners('budget:create')
    ipcMain.removeAllListeners('budget:getAll')
    ipcMain.removeAllListeners('budget:getById')
    ipcMain.removeAllListeners('budget:searchByCode')
    ipcMain.removeAllListeners('budget:getByUserId')
    ipcMain.removeAllListeners('budget:getByStatus')
    ipcMain.removeAllListeners('budget:update')
    ipcMain.removeAllListeners('budget:addQuota')
    ipcMain.removeAllListeners('budget:delete')
    ipcMain.removeAllListeners('budget:updateExpired')
    ipcMain.removeAllListeners('budget:performStatusMaintenance')
    ipcMain.removeAllListeners('budget:getStatusSummary')
    ipcMain.removeAllListeners('budget:isCodeAvailable')
    ipcMain.removeAllListeners('budget:generateNextCode')
    ipcMain.removeAllListeners('budget:calculateTotalAmount')
    ipcMain.removeAllListeners('budget:calculateMonthlyPayment')
  }
}
