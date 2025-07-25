import { UserRepository } from '../repositories/UserRepository'
import { User } from '../entities/User'
import { AppDataSource } from '../config/database'
import { UserNotFoundException, ValidationException } from '../exceptions'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  nombre: string
  email: string
  password: string
  phoneNumber: string
}

export interface AuthUserDto {
  id: string
  nombre: string
  email: string
  phoneNumber: string
  createdAt: Date
  updatedAt: Date
}

export interface AuthResult {
  success: boolean
  user?: AuthUserDto
  message?: string
  error?: string
}

export class AuthService {
  private userRepository: UserRepository
  private currentUser: User | null = null

  constructor() {
    this.userRepository = new UserRepository(AppDataSource)
  }

  /**
   * Autentica un usuario con email y contraseña
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const { email, password } = credentials

      // Validar entrada
      if (!email || !password) {
        return {
          success: false,
          error: 'El email y la contraseña son requeridos'
        }
      }

      // Buscar usuario por email (excluyendo eliminados)
      const user = await this.userRepository.findByEmail(email.trim().toLowerCase())

      if (!user) {
        return {
          success: false,
          error: 'Email o contraseña incorrectos'
        }
      }

      // Validar contraseña
      const isPasswordValid = await user.validatePassword(password)
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Email o contraseña incorrectos'
        }
      }

      // Establecer usuario actual
      this.currentUser = user

      return {
        success: true,
        user: this.mapToAuthUserDto(user),
        message: 'Inicio de sesión exitoso'
      }
    } catch (error) {
      console.error('Error en AuthService.login:', error)
      return {
        success: false,
        error: 'Ocurrió un error durante el inicio de sesión'
      }
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async register(credentials: RegisterCredentials): Promise<AuthResult> {
    try {
      const { nombre, email, password, phoneNumber } = credentials

      // Validar entrada
      const validationErrors = this.validateRegisterCredentials(credentials)
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: validationErrors.join(', ')
        }
      }

      // Verificar que el email no exista
      const emailExists = await this.userRepository.emailExists(email.trim().toLowerCase())
      if (emailExists) {
        return {
          success: false,
          error: 'Ya existe un usuario con este email'
        }
      }

      // Crear nuevo usuario
      const user = new User()
      user.nombre = nombre.trim()
      user.email = email.trim().toLowerCase()
      user.password = password // Se hasheará automáticamente por @BeforeInsert
      user.phoneNumber = phoneNumber.trim()
      user.budgetList = []

      const savedUser = await this.userRepository.save(user)

      // Establecer usuario actual
      this.currentUser = savedUser

      return {
        success: true,
        user: this.mapToAuthUserDto(savedUser),
        message: 'Usuario registrado exitosamente'
      }
    } catch (error) {
      console.error('Error en AuthService.register:', error)
      return {
        success: false,
        error: 'Ocurrió un error durante el registro'
      }
    }
  }

  /**
   * Cierra la sesión del usuario actual
   */
  async logout(): Promise<void> {
    this.currentUser = null
  }

  /**
   * Obtiene el usuario actualmente autenticado
   */
  async getCurrentUser(): Promise<AuthUserDto | null> {
    if (!this.currentUser) {
      return null
    }

    // Refrescar datos del usuario desde la base de datos
    try {
      const freshUser = await this.userRepository.findActiveById(this.currentUser.id)
      if (freshUser) {
        this.currentUser = freshUser
        return this.mapToAuthUserDto(freshUser)
      } else {
        // Usuario fue eliminado, cerrar sesión
        this.currentUser = null
        return null
      }
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error)
      return null
    }
  }

  /**
   * Verifica si hay un usuario autenticado
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null
  }

  /**
   * Cambia la contraseña del usuario actual
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
    try {
      if (!this.currentUser) {
        return {
          success: false,
          error: 'No hay usuario autenticado'
        }
      }

      // Validar contraseña actual
      const isCurrentPasswordValid = await this.currentUser.validatePassword(currentPassword)
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'La contraseña actual es incorrecta'
        }
      }

      // Validar nueva contraseña
      if (!newPassword || newPassword.length < 6) {
        return {
          success: false,
          error: 'La nueva contraseña debe tener al menos 6 caracteres'
        }
      }

      // Actualizar contraseña
      this.currentUser.password = newPassword // Se hasheará automáticamente por @BeforeUpdate
      await this.userRepository.save(this.currentUser)

      return {
        success: true,
        message: 'Contraseña cambiada exitosamente'
      }
    } catch (error) {
      console.error('Error cambiando contraseña:', error)
      return {
        success: false,
        error: 'Ocurrió un error al cambiar la contraseña'
      }
    }
  }

  /**
   * Actualiza el perfil del usuario actual
   */
  async updateProfile(updates: { nombre?: string; phoneNumber?: string }): Promise<AuthResult> {
    try {
      if (!this.currentUser) {
        return {
          success: false,
          error: 'No hay usuario autenticado'
        }
      }

      // Validar entrada
      if (updates.nombre !== undefined && (!updates.nombre || updates.nombre.trim().length === 0)) {
        return {
          success: false,
          error: 'El nombre no puede estar vacío'
        }
      }

      if (
        updates.phoneNumber !== undefined &&
        (!updates.phoneNumber || updates.phoneNumber.trim().length === 0)
      ) {
        return {
          success: false,
          error: 'El número de teléfono no puede estar vacío'
        }
      }

      // Actualizar campos
      if (updates.nombre !== undefined) {
        this.currentUser.nombre = updates.nombre.trim()
      }
      if (updates.phoneNumber !== undefined) {
        this.currentUser.phoneNumber = updates.phoneNumber.trim()
      }

      const updatedUser = await this.userRepository.save(this.currentUser)
      this.currentUser = updatedUser

      return {
        success: true,
        user: this.mapToAuthUserDto(updatedUser),
        message: 'Perfil actualizado exitosamente'
      }
    } catch (error) {
      console.error('Error actualizando perfil:', error)
      return {
        success: false,
        error: 'Ocurrió un error al actualizar el perfil'
      }
    }
  }

  /**
   * Valida las credenciales de registro
   */
  private validateRegisterCredentials(credentials: RegisterCredentials): string[] {
    const errors: string[] = []

    if (!credentials.nombre || credentials.nombre.trim().length === 0) {
      errors.push('El nombre es requerido')
    }

    if (!credentials.email || credentials.email.trim().length === 0) {
      errors.push('El email es requerido')
    } else if (!this.isValidEmail(credentials.email)) {
      errors.push('Debe ser un email válido')
    }

    if (!credentials.password || credentials.password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres')
    }

    if (!credentials.phoneNumber || credentials.phoneNumber.trim().length === 0) {
      errors.push('El número de teléfono es requerido')
    }

    return errors
  }

  /**
   * Valida formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Mapea una entidad User a AuthUserDto
   */
  private mapToAuthUserDto(user: User): AuthUserDto {
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      phoneNumber: user.phoneNumber,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  }
}
