import { UserController } from './UserController'
import { BudgetController } from './BudgetController'
import { InterestController } from './InterestController'
import { ExportController } from './ExportController'

export { UserController, BudgetController, InterestController, ExportController }

// Controller manager to initialize and cleanup all controllers
export class ControllerManager {
  private userController: UserController | null = null
  private budgetController: BudgetController | null = null
  private interestController: InterestController | null = null
  private exportController: ExportController | null = null

  constructor() {
    try {
      console.log('Initializing UserController...')
      this.userController = new UserController()
      console.log('UserController initialized successfully')

      console.log('Initializing BudgetController...')
      this.budgetController = new BudgetController()
      console.log('BudgetController initialized successfully')

      console.log('Initializing InterestController...')
      this.interestController = new InterestController()
      console.log('InterestController initialized successfully')

      console.log('Initializing ExportController...')
      this.exportController = new ExportController()
      console.log('ExportController initialized successfully')
    } catch (error) {
      console.error('Error initializing controllers:', error)
      throw error
    }
  }

  /**
   * Cleanup all controllers by removing their IPC handlers
   */
  public cleanup(): void {
    try {
      if (this.userController) {
        this.userController.cleanup()
      }
      if (this.budgetController) {
        this.budgetController.cleanup()
      }
      if (this.interestController) {
        this.interestController.cleanup()
      }
      if (this.exportController) {
        this.exportController.cleanup()
      }
    } catch (error) {
      console.error('Error cleaning up controllers:', error)
    }
  }
}
