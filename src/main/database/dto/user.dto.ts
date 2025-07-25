export interface CreateUserDto {
  nombre: string
  email: string
  password: string
  phoneNumber: string
}

export interface UpdateUserDto {
  nombre?: string
  email?: string
  password?: string
  phoneNumber?: string
}

export interface UserResponseDto {
  id: string
  nombre: string
  email: string
  phoneNumber: string
  budgetList?: BudgetResponseDto[]
  createdAt: Date
  updatedAt: Date
}

interface BudgetResponseDto {
  id: string
  _creationDate: Date
  _expirationDate: Date
  currentStatus: string
  totalAmount: number
  currentInterest: number
  paymentTerm: number
  code: string
}

export const validateCreateUserDto = (dto: CreateUserDto): string[] => {
  const errors: string[] = []

  if (!dto.nombre || dto.nombre.trim().length === 0) {
    errors.push('El nombre del presupuestario es requerido')
  }

  if (!dto.email || dto.email.trim().length === 0) {
    errors.push('El email es requerido')
  } else if (!isValidEmail(dto.email)) {
    errors.push('Debe ser un email valido')
  }

  if (!dto.password || dto.password.trim().length === 0) {
    errors.push('La contraseña es requerida')
  } else if (!isValidPassword(dto.password)) {
    errors.push('La contraseña debe tener 8 caracteres, una mayuscula y un numero')
  }

  if (!dto.phoneNumber || dto.phoneNumber.trim().length === 0) {
    errors.push('El numero de telefono es requerido')
  }

  return errors
}

export const validateUpdateUserDto = (dto: UpdateUserDto): string[] => {
  const errors: string[] = []

  if (dto.email !== undefined && (!dto.email || dto.email.trim().length === 0)) {
    errors.push('El email es requerido si se actualiza')
  } else if (dto.email && !isValidEmail(dto.email)) {
    errors.push('Debe ser un email valido')
  }

  if (dto.nombre !== undefined && (!dto.nombre || dto.nombre.trim().length === 0)) {
    errors.push('El nombre del presupuestario es requerido si se actualiza')
  }

  if (dto.phoneNumber !== undefined && (!dto.phoneNumber || dto.phoneNumber.trim().length === 0)) {
    errors.push('El numero de telefono es requerido si se actualiza')
  }

  return errors
}

// Regex de mierda por dios
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

//Gracias stackoverflow por existir, odio los regex por dios
const isValidPassword = (password: string): boolean => {
  // Mínimo 8 caracteres, al menos una letra y un número
  const passRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&.-]{8,}$/
  return passRegex.test(password)
}
