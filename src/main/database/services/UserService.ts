import { UserRepository } from '../repositories/UserRepository'
import { User, UserType, UserStatus } from '../entities/User'
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  validateCreateUserDto,
  validateUpdateUserDto
} from '../dto/user.dto'

export class UserNotFoundException extends Error {
  constructor(id: string) {
    super(`Usuario con ID ${id} no encontrado`)
    this.name = 'UserNotFoundException'
  }
}

export class DuplicateEmailException extends Error {
  constructor(email: string) {
    super(`Ya existe un usuario con el email ${email}`)
    this.name = 'DuplicateEmailException'
  }
}

export class ValidationException extends Error {
  constructor(errors: string[]) {
    super(`Errores de validación: ${errors.join(', ')}`)
    this.name = 'ValidationException'
  }
}

export class UserService {
  constructor(private userRepository: UserRepository) {}

  /**
   * Crea un nuevo usuario
   */
  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    console.log('Entre al service')
    // Validar datos de entrada
    const validationErrors = validateCreateUserDto(createUserDto)
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors)
    }
    console.log('Entre al service 2')

    // Verificar que el email no exista (solo si se proporciona)
    if (createUserDto.email) {
      const emailExists = await this.userRepository.emailExists(createUserDto.email)
      if (emailExists) {
        throw new DuplicateEmailException(createUserDto.email)
      }
    }

    const user = new User()
    user.nombre = createUserDto.nombre.trim()
    user.apellido = createUserDto.apellido?.trim()
    user.email = createUserDto.email?.trim().toLowerCase()
    user.password = createUserDto.password?.trim()
    user.phoneNumber = createUserDto.phoneNumber.trim()
    user.address = createUserDto.address?.trim()
    user.documentNumber = createUserDto.documentNumber?.trim()
    user.userType = (createUserDto.userType as UserType) || UserType.CLIENT
    user.requiresLogin = createUserDto.requiresLogin || false
    user.budgetList = []

    const savedUser = await this.userRepository.save(user)
    return this.mapToResponseDto(savedUser)
  }

  /**
   * Obtiene todos los usuarios activos
   */
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAllActive()
    return users.map((user) => this.mapToResponseDto(user))
  }

  /**
   * Obtiene un usuario por ID
   */
  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findActiveById(id)
    if (!user) {
      throw new UserNotFoundException(id)
    }
    return this.mapToResponseDto(user)
  }

  /**
   * Busca usuarios por email
   */
  async searchByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findByEmail(email.trim().toLowerCase())
    return user ? this.mapToResponseDto(user) : null
  }

  /**
   * Busca usuarios por nombre
   */
  async searchByNombre(nombre: string): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findByNombre(nombre.trim())
    return users.map((user) => this.mapToResponseDto(user))
  }

  /**
   * Actualiza un usuario
   */
  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    // Validar datos de entrada
    const validationErrors = validateUpdateUserDto(updateUserDto)
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors)
    }

    // Verificar que el usuario existe
    const existingUser = await this.userRepository.findActiveById(id)
    if (!existingUser) {
      throw new UserNotFoundException(id)
    }

    // Verificar email único si se está actualizando
    if (updateUserDto.email) {
      const emailExists = await this.userRepository.emailExists(
        updateUserDto.email.trim().toLowerCase(),
        id
      )
      if (emailExists) {
        throw new DuplicateEmailException(updateUserDto.email)
      }
    }

    // Actualizar campos proporcionados
    if (updateUserDto.nombre !== undefined) {
      existingUser.nombre = updateUserDto.nombre.trim()
    }
    if (updateUserDto.email !== undefined) {
      existingUser.email = updateUserDto.email.trim().toLowerCase()
    }
    if (updateUserDto.phoneNumber !== undefined) {
      existingUser.phoneNumber = updateUserDto.phoneNumber.trim()
    }

    const updatedUser = await this.userRepository.save(existingUser)
    return this.mapToResponseDto(updatedUser)
  }

  /**
   * Elimina lógicamente un usuario
   */
  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findActiveById(id)
    if (!user) {
      throw new UserNotFoundException(id)
    }

    await this.userRepository.logicalDelete(id)
  }

  /**
   * Restaura un usuario eliminado lógicamente
   */
  async restoreUser(id: string): Promise<UserResponseDto> {
    await this.userRepository.restoreUser(id)
    const user = await this.userRepository.findActiveById(id)
    if (!user) {
      throw new UserNotFoundException(id)
    }
    return this.mapToResponseDto(user)
  }

  /**
   * Obtiene usuarios por tipo
   */
  async getUsersByType(userType: UserType): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findByUserType(userType)
    return users.map((user) => this.mapToResponseDto(user))
  }

  /**
   * Obtiene usuarios por estado
   */
  async getUsersByStatus(status: UserStatus): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findByStatus(status)
    return users.map((user) => this.mapToResponseDto(user))
  }

  /**
   * Obtiene solo clientes
   */
  async getClients(): Promise<UserResponseDto[]> {
    return this.getUsersByType(UserType.CLIENT)
  }

  /**
   * Obtiene solo administradores
   */
  async getAdmins(): Promise<UserResponseDto[]> {
    return this.getUsersByType(UserType.ADMIN)
  }

  /**
   * Obtiene solo empleados
   */
  async getEmployees(): Promise<UserResponseDto[]> {
    return this.getUsersByType(UserType.EMPLOYEE)
  }

  /**
   * Busca usuario por número de documento
   */
  async searchByDocumentNumber(documentNumber: string): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findByDocumentNumber(documentNumber.trim())
    return user ? this.mapToResponseDto(user) : null
  }

  /**
   * Busca usuario por teléfono
   */
  async searchByPhoneNumber(phoneNumber: string): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findByPhoneNumber(phoneNumber.trim())
    return user ? this.mapToResponseDto(user) : null
  }

  /**
   * Busca usuarios por nombre completo
   */
  async searchByFullName(searchTerm: string): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findByFullName(searchTerm.trim())
    return users.map((user) => this.mapToResponseDto(user))
  }

  /**
   * Obtiene estadísticas de usuarios
   */
  async getUserStatistics(): Promise<{
    total: number
    active: number
    clients: number
    admins: number
    employees: number
    withLogin: number
  }> {
    return await this.userRepository.getUserStats()
  }

  /**
   * Cambia el estado de un usuario
   */
  async changeUserStatus(id: string, status: UserStatus): Promise<UserResponseDto> {
    const user = await this.userRepository.findActiveById(id)
    if (!user) {
      throw new UserNotFoundException(id)
    }

    user.status = status
    const updatedUser = await this.userRepository.save(user)
    return this.mapToResponseDto(updatedUser)
  }

  /**
   * Activa un usuario
   */
  async activateUser(id: string): Promise<UserResponseDto> {
    return this.changeUserStatus(id, UserStatus.ACTIVE)
  }

  /**
   * Desactiva un usuario
   */
  async deactivateUser(id: string): Promise<UserResponseDto> {
    return this.changeUserStatus(id, UserStatus.INACTIVE)
  }

  /**
   * Suspende un usuario
   */
  async suspendUser(id: string): Promise<UserResponseDto> {
    return this.changeUserStatus(id, UserStatus.SUSPENDED)
  }

  /**
   * Mapea una entidad User a UserResponseDto
   */
  private mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      documentNumber: user.documentNumber,
      userType: user.userType,
      status: user.status,
      requiresLogin: user.requiresLogin,
      budgetList: user.budgetList?.map((budget) => ({
        id: budget.id,
        _creationDate: budget._creationDate,
        _expirationDate: budget._expirationDate,
        currentStatus: budget.currentStatus,
        totalAmount: budget.totalAmount,
        currentInterest: budget.currentInterest,
        paymentTerm: budget.paymentTerm,
        code: budget.code
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  }
}
