import { UserController } from './UserController'
import { BudgetController } from './BudgetController'
import { InterestController } from './InterestController'
import { AuthController } from './AuthController'

export { UserController, BudgetController, InterestController, AuthController }

// Controller manager to initialize and cleanup all controllers
export class ControllerManager {
  private userController: UserController | null = null
  private budgetController: BudgetController | null = null
  private interestController: InterestController | null = null
  private authController: AuthController | null = null

  constructor() {
    try {
      console.log('Inicializando AuthController...')
      this.authController = new AuthController()
      console.log('AuthController inicializado exitosamente')

      console.log('Inicializando UserController...')
      this.userController = new UserController()
      console.log('UserController inicializado exitosamente')

      console.log('Inicializando BudgetController...')
      this.budgetController = new BudgetController()
      console.log('BudgetController inicializado exitosamente')

      console.log('Inicializando InterestController...')
      this.interestController = new InterestController()
      console.log('InterestController inicializado exitosamente')
    } catch (error) {
      console.error('Error inicializando controladores:', error)
      throw error
    }
  }

  /**
   * Limpia todos los controladores removiendo sus handlers IPC
   */
  public cleanup(): void {
    try {
      if (this.authController) {
        this.authController.cleanup()
      }
      if (this.userController) {
        this.userController.cleanup()
      }
      if (this.budgetController) {
        this.budgetController.cleanup()
      }
      if (this.interestController) {
        this.interestController.cleanup()
      }
    } catch (error) {
      console.error('Error limpiando controladores:', error)
    }
  }
}
