import { DataSource } from 'typeorm'
import { User } from '../entities'
import { Budget } from '../entities'
import { Quota } from '../entities'
import { Interest } from '../entities'
import * as path from 'path'
import { app } from 'electron'

// Get the user data directory for storing the database
const getUserDataPath = (): string => {
  if (app) {
    return app.getPath('userData')
  }
  // Fallback for development/testing
  return process.cwd()
}

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: path.join(getUserDataPath(), 'SQLiteDB'),
  entities: [User, Budget, Quota, Interest],
  synchronize: true, // Auto-create tables in development
  logging: process.env.NODE_ENV === 'development',
  migrations: [],
  subscribers: []
})

export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
      console.log('Base de datos inicializada')
      await createMockUser()
    }
  } catch (error) {
    console.error('Error during database initialization:', error)
    throw error
  }
}
const createMockUser = async (): Promise<void> => {
  try {
    const userRepository = AppDataSource.getRepository(User)
    const existingUser = await userRepository.findOne({
      where: { email: 'root@root.com' }
    })

    if (!existingUser) {
      const mockUser = new User()
      mockUser.nombre = 'admin'
      mockUser.email = 'root@root.com'
      mockUser.password = 'root'
      mockUser.phoneNumber = '1234567890'
      mockUser.budgetList = []

      await userRepository.save(mockUser)
      console.log('Usuario mock creado exitosamente: admin (root@root.com)')
    } else {
      console.log('Usuario mock ya existe, omitiendo creación')
    }
  } catch (error) {
    console.error('Error creando usuario mock:', error)
  }
}

export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy()
      console.log('Database connection closed successfully')
    }
  } catch (error) {
    console.error('Error during database closure:', error)
    throw error
  }
}
