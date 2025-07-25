import { ipcMain } from 'electron'
import { UserService } from '../services/UserService'
import { UserRepository } from '../repositories/UserRepository'
import { AppDataSource } from '../config/database'
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto'
import { ResponseFormatter, ApiResponse } from '../responses'

export class UserController {
  private userService: UserService

  constructor() {
    try {
      // Initialize repository and service
      console.log('Creating UserRepository...')
      const userRepository = new UserRepository(AppDataSource)
      console.log('UserRepository created successfully')

      console.log('Creating UserService...')
      this.userService = new UserService(userRepository)
      console.log('UserService created successfully')

      // Register IPC handlers
      console.log('Registering IPC handlers...')
      this.registerHandlers()
      console.log('IPC handlers registered successfully')
    } catch (error) {
      console.error('Error in UserController constructor:', error)
      throw error
    }
  }

  private registerHandlers(): void {
    // Create user handler
    ipcMain.handle('user:create', async (_, createUserDto: CreateUserDto): Promise<ApiResponse> => {
      try {
        const user = await this.userService.createUser(createUserDto)
        return ResponseFormatter.success(user, 'Usuario creado exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Get all users handler
    ipcMain.handle('user:getAll', async (): Promise<ApiResponse> => {
      try {
        const users = await this.userService.getAllUsers()
        return ResponseFormatter.success(users)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Get user by ID handler
    ipcMain.handle('user:getById', async (_, id: string): Promise<ApiResponse> => {
      try {
        const user = await this.userService.getUserById(id)
        return ResponseFormatter.success(user)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Search user by email handler
    ipcMain.handle('user:searchByEmail', async (_, email: string): Promise<ApiResponse> => {
      try {
        const user = await this.userService.searchByEmail(email)
        return ResponseFormatter.success(user)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Search users by nombre handler
    ipcMain.handle('user:searchByNombre', async (_, nombre: string): Promise<ApiResponse> => {
      try {
        const users = await this.userService.searchByNombre(nombre)
        return ResponseFormatter.success(users)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Update user handler
    ipcMain.handle(
      'user:update',
      async (_, id: string, updateUserDto: UpdateUserDto): Promise<ApiResponse> => {
        try {
          const user = await this.userService.updateUser(id, updateUserDto)
          return ResponseFormatter.success(user, 'Usuario actualizado exitosamente')
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Delete user handler (logical deletion)
    ipcMain.handle('user:delete', async (_, id: string): Promise<ApiResponse> => {
      try {
        await this.userService.deleteUser(id)
        return ResponseFormatter.success(null, 'Usuario eliminado exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Restore user handler
    ipcMain.handle('user:restore', async (_, id: string): Promise<ApiResponse> => {
      try {
        const user = await this.userService.restoreUser(id)
        return ResponseFormatter.success(user, 'Usuario restaurado exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })
  }

  /**
   * Cleanup method to remove IPC handlers
   */
  public cleanup(): void {
    ipcMain.removeAllListeners('user:create')
    ipcMain.removeAllListeners('user:getAll')
    ipcMain.removeAllListeners('user:getById')
    ipcMain.removeAllListeners('user:searchByEmail')
    ipcMain.removeAllListeners('user:searchByNombre')
    ipcMain.removeAllListeners('user:update')
    ipcMain.removeAllListeners('user:delete')
    ipcMain.removeAllListeners('user:restore')
  }
}
