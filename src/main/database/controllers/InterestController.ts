import { ipcMain } from 'electron'
import { InterestService } from '../services/InterestService'
import { InterestRepository } from '../repositories/InterestRepository'
import { AppDataSource } from '../config/database'
import { CreateInterestDto, UpdateInterestDto } from '../dto/interest.dto'
import { ResponseFormatter, ApiResponse } from '../responses'

export class InterestController {
  private interestService: InterestService

  constructor() {
    try {
      // Initialize repository and service
      console.log('Creating InterestRepository...')
      const interestRepository = new InterestRepository(AppDataSource)
      console.log('InterestRepository created successfully')

      console.log('Creating InterestService...')
      this.interestService = new InterestService(interestRepository)
      console.log('InterestService created successfully')

      // Register IPC handlers
      console.log('Registering InterestController IPC handlers...')
      this.registerHandlers()
      console.log('InterestController initialized successfully')
    } catch (error) {
      console.error('Error in InterestController constructor:', error)
      throw error
    }
  }

  private registerHandlers(): void {
    // Create interest configuration handler
    ipcMain.handle(
      'interest:create',
      async (_, createInterestDto: CreateInterestDto): Promise<ApiResponse> => {
        try {
          const interest = await this.interestService.createInterest(createInterestDto)
          return ResponseFormatter.success(interest, 'Configuración de interés creada exitosamente')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Get all interest configurations handler
    ipcMain.handle('interest:getAll', async (): Promise<ApiResponse> => {
      try {
        const interests = await this.interestService.getAllInterests()
        return ResponseFormatter.success(interests)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Get interest configuration by ID handler
    ipcMain.handle('interest:getById', async (_, id: string): Promise<ApiResponse> => {
      try {
        const interest = await this.interestService.getInterestById(id)
        return ResponseFormatter.success(interest)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Get interest configuration by payment term handler
    ipcMain.handle(
      'interest:getByPaymentTerm',
      async (_, paymentTerm: number): Promise<ApiResponse> => {
        try {
          const interest = await this.interestService.getInterestByPaymentTerm(paymentTerm)
          return ResponseFormatter.success(interest)
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Get interest rate by payment term handler
    ipcMain.handle(
      'interest:getInterestRateByPaymentTerm',
      async (_, paymentTerm: number): Promise<ApiResponse> => {
        try {
          const interestRate = await this.interestService.getInterestRateByPaymentTerm(paymentTerm)
          return ResponseFormatter.success({ interestRate })
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Update interest configuration handler
    ipcMain.handle(
      'interest:update',
      async (_, id: string, updateInterestDto: UpdateInterestDto): Promise<ApiResponse> => {
        try {
          const interest = await this.interestService.updateInterest(id, updateInterestDto)
          return ResponseFormatter.success(
            interest,
            'Configuración de interés actualizada exitosamente'
          )
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Update interest rate by payment term handler
    ipcMain.handle(
      'interest:updateRateByPaymentTerm',
      async (_, paymentTerm: number, interestRate: number): Promise<ApiResponse> => {
        try {
          const interest = await this.interestService.updateInterestRateByPaymentTerm(
            paymentTerm,
            interestRate
          )
          return ResponseFormatter.success(interest, 'Tasa de interés actualizada exitosamente')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Delete interest configuration handler
    ipcMain.handle('interest:delete', async (_, id: string): Promise<ApiResponse> => {
      try {
        await this.interestService.deleteInterest(id)
        return ResponseFormatter.success(null, 'Configuración de interés eliminada exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Delete interest configuration by payment term handler
    ipcMain.handle(
      'interest:deleteByPaymentTerm',
      async (_, paymentTerm: number): Promise<ApiResponse> => {
        try {
          await this.interestService.deleteByPaymentTerm(paymentTerm)
          return ResponseFormatter.success(null, 'Configuración de interés eliminada exitosamente')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Get available payment terms handler
    ipcMain.handle('interest:getAvailablePaymentTerms', async (): Promise<ApiResponse> => {
      try {
        const paymentTerms = await this.interestService.getAvailablePaymentTerms()
        return ResponseFormatter.success(paymentTerms)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Get interests by payment term range handler
    ipcMain.handle(
      'interest:getByPaymentTermRange',
      async (_, minTerm: number, maxTerm: number): Promise<ApiResponse> => {
        try {
          const interests = await this.interestService.getInterestsByPaymentTermRange(
            minTerm,
            maxTerm
          )
          return ResponseFormatter.success(interests)
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Check if payment term exists handler
    ipcMain.handle(
      'interest:paymentTermExists',
      async (_, paymentTerm: number): Promise<ApiResponse> => {
        try {
          const exists = await this.interestService.paymentTermExists(paymentTerm)
          return ResponseFormatter.success({ exists })
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Create default interest configurations handler
    ipcMain.handle('interest:createDefaults', async (): Promise<ApiResponse> => {
      try {
        const defaultConfigurations =
          await this.interestService.createDefaultInterestConfigurations()
        return ResponseFormatter.success(
          defaultConfigurations,
          `${defaultConfigurations.length} configuraciones por defecto creadas`
        )
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })
  }

  /**
   * Cleanup method to remove IPC handlers
   */
  public cleanup(): void {
    ipcMain.removeAllListeners('interest:create')
    ipcMain.removeAllListeners('interest:getAll')
    ipcMain.removeAllListeners('interest:getById')
    ipcMain.removeAllListeners('interest:getByPaymentTerm')
    ipcMain.removeAllListeners('interest:getInterestRateByPaymentTerm')
    ipcMain.removeAllListeners('interest:update')
    ipcMain.removeAllListeners('interest:updateRateByPaymentTerm')
    ipcMain.removeAllListeners('interest:delete')
    ipcMain.removeAllListeners('interest:deleteByPaymentTerm')
    ipcMain.removeAllListeners('interest:getAvailablePaymentTerms')
    ipcMain.removeAllListeners('interest:getByPaymentTermRange')
    ipcMain.removeAllListeners('interest:paymentTermExists')
    ipcMain.removeAllListeners('interest:createDefaults')
  }
}
