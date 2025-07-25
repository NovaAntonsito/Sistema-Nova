import { ipcMain } from 'electron'
import { AuthService, LoginCredentials, RegisterCredentials } from '../services/AuthService'
import { ResponseFormatter, ApiResponse } from '../responses'

export class AuthController {
  private authService: AuthService

  constructor() {
    try {
      console.log('Creando AuthService...')
      this.authService = new AuthService()
      console.log('AuthService creado exitosamente')

      // Registrar handlers IPC
      console.log('Registrando handlers IPC de AuthController...')
      this.registerHandlers()
      console.log('AuthController inicializado exitosamente')
    } catch (error) {
      console.error('Error en constructor de AuthController:', error)
      throw error
    }
  }

  private registerHandlers(): void {
    // Handler de login
    ipcMain.handle('auth:login', async (_, credentials: LoginCredentials): Promise<ApiResponse> => {
      try {
        const result = await this.authService.login(credentials)
        if (result.success) {
          return ResponseFormatter.success(result.user, result.message)
        } else {
          return ResponseFormatter.customError(
            'AUTH_LOGIN_FAILED',
            result.error || 'Error de autenticación'
          )
        }
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Handler de registro
    ipcMain.handle(
      'auth:register',
      async (_, credentials: RegisterCredentials): Promise<ApiResponse> => {
        try {
          const result = await this.authService.register(credentials)
          if (result.success) {
            return ResponseFormatter.success(result.user, result.message)
          } else {
            return ResponseFormatter.customError(
              'AUTH_REGISTER_FAILED',
              result.error || 'Error de registro'
            )
          }
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Handler de logout
    ipcMain.handle('auth:logout', async (): Promise<ApiResponse> => {
      try {
        await this.authService.logout()
        return ResponseFormatter.success(null, 'Sesión cerrada exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Handler para obtener usuario actual
    ipcMain.handle('auth:getCurrentUser', async (): Promise<ApiResponse> => {
      try {
        const user = await this.authService.getCurrentUser()
        return ResponseFormatter.success(user)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Handler para verificar si está autenticado
    ipcMain.handle('auth:isAuthenticated', async (): Promise<ApiResponse> => {
      try {
        const isAuthenticated = this.authService.isAuthenticated()
        return ResponseFormatter.success({ isAuthenticated })
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Handler para cambiar contraseña
    ipcMain.handle(
      'auth:changePassword',
      async (_, currentPassword: string, newPassword: string): Promise<ApiResponse> => {
        try {
          const result = await this.authService.changePassword(currentPassword, newPassword)
          if (result.success) {
            return ResponseFormatter.success(null, result.message)
          } else {
            return ResponseFormatter.customError(
              'AUTH_PASSWORD_CHANGE_FAILED',
              result.error || 'Error al cambiar contraseña'
            )
          }
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Handler para actualizar perfil
    ipcMain.handle(
      'auth:updateProfile',
      async (_, updates: { nombre?: string; phoneNumber?: string }): Promise<ApiResponse> => {
        try {
          const result = await this.authService.updateProfile(updates)
          if (result.success) {
            return ResponseFormatter.success(result.user, result.message)
          } else {
            return ResponseFormatter.customError(
              'AUTH_PROFILE_UPDATE_FAILED',
              result.error || 'Error al actualizar perfil'
            )
          }
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )
  }

  /**
   * Método de limpieza para remover handlers IPC
   */
  public cleanup(): void {
    ipcMain.removeAllListeners('auth:login')
    ipcMain.removeAllListeners('auth:register')
    ipcMain.removeAllListeners('auth:logout')
    ipcMain.removeAllListeners('auth:getCurrentUser')
    ipcMain.removeAllListeners('auth:isAuthenticated')
    ipcMain.removeAllListeners('auth:changePassword')
    ipcMain.removeAllListeners('auth:updateProfile')
  }
}
