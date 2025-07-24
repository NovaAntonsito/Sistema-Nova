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
  database: path.join(getUserDataPath(), 'budget-management.db'),
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
    }
  } catch (error) {
    console.error('Error during database initialization:', error)
    throw error
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
