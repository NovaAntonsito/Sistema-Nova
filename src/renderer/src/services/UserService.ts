import { User, UserFormData, ApiResponse } from '../types'

/**
 * UserService - Frontend service for user-related IPC communication
 * Handles all user operations between frontend and backend
 */
class UserService {
  /**
   * Create a new user
   */
  async createUser(userData: UserFormData): Promise<ApiResponse<User>> {
    try {
      // Map frontend form data to backend DTO format
      const createUserDto = {
        nombre: userData.nombre,
        email: userData.email,
        phoneNumber: userData.telefono || ''
      }
      
      const response = await window.electron.ipcRenderer.invoke('user:create', createUserDto)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error creating user'
      }
    }
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<ApiResponse<User[]>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('user:getAll')
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error fetching users'
      }
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<ApiResponse<User>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('user:getById', id)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error fetching user'
      }
    }
  }

  /**
   * Search user by email
   */
  async searchByEmail(email: string): Promise<ApiResponse<User>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('user:searchByEmail', email)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error searching user by email'
      }
    }
  }

  /**
   * Search users by name
   */
  async searchByName(nombre: string): Promise<ApiResponse<User[]>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('user:searchByNombre', nombre)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error searching users by name'
      }
    }
  }

  /**
   * Update user
   */
  async updateUser(id: string, userData: Partial<UserFormData>): Promise<ApiResponse<User>> {
    try {
      // Map frontend form data to backend DTO format
      const updateUserDto: any = {}
      if (userData.nombre !== undefined) updateUserDto.nombre = userData.nombre
      if (userData.email !== undefined) updateUserDto.email = userData.email
      if (userData.telefono !== undefined) updateUserDto.phoneNumber = userData.telefono

      const response = await window.electron.ipcRenderer.invoke('user:update', id, updateUserDto)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error updating user'
      }
    }
  }

  /**
   * Delete user (logical deletion)
   */
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('user:delete', id)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error deleting user'
      }
    }
  }

  /**
   * Restore deleted user
   */
  async restoreUser(id: string): Promise<ApiResponse<User>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('user:restore', id)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error restoring user'
      }
    }
  }
}

// Export singleton instance
export const userService = new UserService()
export default userService
