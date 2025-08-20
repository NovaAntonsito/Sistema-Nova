import { UserResponseDto, CreateUserDto, UpdateUserDto } from '@dto/user.dto'

const GetUsers: UserResponseDto[] = async () => {
  try {
    const result: UserResponseDto[] = await window.electron.ipcRenderer.invoke('user:getAll')
    console.log('Resultado de obtener usuarios:', result)
    return result
  } catch (error: any) {
    console.error('Error al obtener usuarios:', error)
    return { error: error.message }
  }
}

const CreateUser = async (user: CreateUserDto): Promise<CreateUserDto> => {
  try {
    const result: CreateUserDto = await window.electron.ipcRenderer.invoke('user:create', user)
    console.log('Resultado de crear usuario:', result)
    return result
  } catch (error: any) {
    console.error('Error al crear usuario:', error)
    return { error: error.message }
  }
}

const UpdateUser = async (user: UpdateUserDto): Promise<UpdateUserDto> => {
  try {
    const result: UpdateUserDto = await window.electron.ipcRenderer.invoke('user:update', user)
    console.log('Resultado de actualizar usuario:', result)
    return result
  } catch (error: any) {
    console.error('Error al actualizar usuario:', error)
    return { error: error.message }
  }
}

const getUserbyId = async (id: string): Promise<UserResponseDto> => {
  try {
    const result: UserResponseDto = await window.electron.ipcRenderer.invoke('user:getById', id)
    console.log('Resultado de obtener usuario por ID:', result)
    return result
  } catch (error: any) {
    console.error('Error al obtener usuario por ID:', error)
    return { error: error.message }
  }
}

const deleteUser = async (id: string): Promise<void> => {
  try {
    await window.electron.ipcRenderer.invoke('user:delete', id)
    console.log('Usuario eliminado con ID:', id)
  } catch (error: any) {
    console.error('Error al eliminar usuario:', error)
    return { error: error.message }
  }
}

export { GetUsers, CreateUser, UpdateUser, getUserbyId, deleteUser }
