import { UserRepository } from '../repositories/UserRepository'
import { User } from '../entities/User'
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
    // Validar datos de entrada
    const validationErrors = validateCreateUserDto(createUserDto)
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors)
    }

    // Verificar que el email no exista
    const emailExists = await this.userRepository.emailExists(createUserDto.email)
    if (emailExists) {
      throw new DuplicateEmailException(createUserDto.email)
    }

    // Crear usuario
    const user = new User()
    user.nombre = createUserDto.nombre.trim()
    user.email = createUserDto.email.trim().toLowerCase()
    user.phoneNumber = createUserDto.phoneNumber.trim()
    user.budgetList = [] // Inicializar array vacío como especifica el requirement 1.2

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
   * Mapea una entidad User a UserResponseDto
   */
  private mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      phoneNumber: user.phoneNumber,
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
