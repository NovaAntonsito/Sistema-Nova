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

    // Get clients handler
    ipcMain.handle('user:getClients', async (): Promise<ApiResponse> => {
      try {
        const clients = await this.userService.getClients()
        return ResponseFormatter.success(clients)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Get admins handler
    ipcMain.handle('user:getAdmins', async (): Promise<ApiResponse> => {
      try {
        const admins = await this.userService.getAdmins()
        return ResponseFormatter.success(admins)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Get employees handler
    ipcMain.handle('user:getEmployees', async (): Promise<ApiResponse> => {
      try {
        const employees = await this.userService.getEmployees()
        return ResponseFormatter.success(employees)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Search by document number handler
    ipcMain.handle(
      'user:searchByDocument',
      async (_, documentNumber: string): Promise<ApiResponse> => {
        try {
          const user = await this.userService.searchByDocumentNumber(documentNumber)
          return ResponseFormatter.success(user)
        } catch (error) {
          return ResponseFormatter.error(error as Error)
        }
      }
    )

    // Search by phone number handler
    ipcMain.handle('user:searchByPhone', async (_, phoneNumber: string): Promise<ApiResponse> => {
      try {
        const user = await this.userService.searchByPhoneNumber(phoneNumber)
        return ResponseFormatter.success(user)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Search by full name handler
    ipcMain.handle('user:searchByFullName', async (_, searchTerm: string): Promise<ApiResponse> => {
      try {
        const users = await this.userService.searchByFullName(searchTerm)
        return ResponseFormatter.success(users)
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    // Get user statistics handler
    ipcMain.handle('user:getStatistics', async (): Promise<ApiResponse> => {
      try {
        console.log('Handler user:getStatistics called')
        const stats = await this.userService.getUserStatistics()
        console.log('Stats retrieved:', stats)
        return ResponseFormatter.success(stats)
      } catch (error) {
        console.error('Error in user:getStatistics handler:', error)
        return ResponseFormatter.error(error as Error)
      }
    })

    // Change user status handlers
    ipcMain.handle('user:activate', async (_, id: string): Promise<ApiResponse> => {
      try {
        const user = await this.userService.activateUser(id)
        return ResponseFormatter.success(user, 'Usuario activado exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    ipcMain.handle('user:deactivate', async (_, id: string): Promise<ApiResponse> => {
      try {
        const user = await this.userService.deactivateUser(id)
        return ResponseFormatter.success(user, 'Usuario desactivado exitosamente')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })

    ipcMain.handle('user:suspend', async (_, id: string): Promise<ApiResponse> => {
      try {
        const user = await this.userService.suspendUser(id)
        return ResponseFormatter.success(user, 'Usuario suspendido exitosamente')
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
    ipcMain.removeAllListeners('user:getClients')
    ipcMain.removeAllListeners('user:getAdmins')
    ipcMain.removeAllListeners('user:getEmployees')
    ipcMain.removeAllListeners('user:searchByDocument')
    ipcMain.removeAllListeners('user:searchByPhone')
    ipcMain.removeAllListeners('user:searchByFullName')
    ipcMain.removeAllListeners('user:getStatistics')
    ipcMain.removeAllListeners('user:activate')
    ipcMain.removeAllListeners('user:deactivate')
    ipcMain.removeAllListeners('user:suspend')
  }
}
