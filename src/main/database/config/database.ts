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
      console.log('Database connection established successfully')

      // Crear datos iniciales
      await createInitialData()
    }
  } catch (error) {
    console.error('Error during database initialization:', error)
    throw error
  }
}

const createInitialData = async (): Promise<void> => {
  try {
    // Crear usuario mock
    await createMockUser()

    // Crear datos de interés iniciales
    await createInitialInterestRates()
  } catch (error) {
    console.error('Error creando datos iniciales:', error)
  }
}

const createMockUser = async (): Promise<void> => {
  try {
    const userRepository = AppDataSource.getRepository(User)

    // Verificar si ya existe un usuario con el email root@root.com
    const existingUser = await userRepository.findOne({
      where: { email: 'root@root.com' }
    })

    if (!existingUser) {
      // Crear el usuario mock
      const mockUser = new User()
      mockUser.nombre = 'admin'
      mockUser.email = 'root@root.com'
      mockUser.password = 'root' // Se hasheará automáticamente por el hook @BeforeInsert
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

const createInitialInterestRates = async (): Promise<void> => {
  try {
    const interestRepository = AppDataSource.getRepository(Interest)

    // Verificar si ya existen datos de interés
    const existingInterests = await interestRepository.count()

    if (existingInterests === 0) {
      // Crear tasas de interés iniciales
      const interestRates = [
        { paymentTerm: 1, interest: 2.5 }, // 1 mes - 2.5%
        { paymentTerm: 3, interest: 5.0 }, // 3 meses - 5.0%
        { paymentTerm: 6, interest: 8.0 }, // 6 meses - 8.0%
        { paymentTerm: 12, interest: 12.0 }, // 12 meses - 12.0%
        { paymentTerm: 18, interest: 15.0 }, // 18 meses - 15.0%
        { paymentTerm: 24, interest: 18.0 }, // 24 meses - 18.0%
        { paymentTerm: 36, interest: 22.0 }, // 36 meses - 22.0%
        { paymentTerm: 48, interest: 25.0 } // 48 meses - 25.0%
      ]

      for (const rate of interestRates) {
        const interest = new Interest()
        interest.paymentTerm = rate.paymentTerm
        interest.interest = rate.interest
        await interestRepository.save(interest)
      }

      console.log(`${interestRates.length} tasas de interés creadas exitosamente`)
    } else {
      console.log('Tasas de interés ya existen, omitiendo creación')
    }
  } catch (error) {
    console.error('Error creando tasas de interés:', error)
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
