// User data types
export interface CreateUserDto {
  nombre: string
  email: string
  phoneNumber: string
}

export interface UpdateUserDto {
  nombre?: string
  email?: string
  phoneNumber?: string
}

export interface User {
  id: string
  nombre: string
  email: string
  phoneNumber: string
  createdAt: Date
  updatedAt: Date
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// User service methods
const createUser = async (userData: CreateUserDto): Promise<ApiResponse<User>> => {
  return await window.electron.ipcRenderer.invoke('user:create', userData)
}

const getAllUsers = async (): Promise<ApiResponse<User[]>> => {
  return await window.electron.ipcRenderer.invoke('user:getAll')
}

const getUserById = async (id: string): Promise<ApiResponse<User>> => {
  return await window.electron.ipcRenderer.invoke('user:getById', id)
}

const updateUser = async (id: string, userData: UpdateUserDto): Promise<ApiResponse<User>> => {
  return await window.electron.ipcRenderer.invoke('user:update', id, userData)
}

const deleteUser = async (id: string): Promise<ApiResponse<null>> => {
  return await window.electron.ipcRenderer.invoke('user:delete', id)
}

const searchByEmail = async (email: string): Promise<ApiResponse<User>> => {
  return await window.electron.ipcRenderer.invoke('user:searchByEmail', email)
}

const searchByNombre = async (nombre: string): Promise<ApiResponse<User[]>> => {
  return await window.electron.ipcRenderer.invoke('user:searchByNombre', nombre)
}

export {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  searchByEmail,
  searchByNombre
}
