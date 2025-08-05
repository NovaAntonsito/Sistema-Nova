import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExportService } from '../ExportService'
import { UserRepository } from '../../repositories/UserRepository'
import { BudgetRepository } from '../../repositories/BudgetRepository'
import { QuotaRepository } from '../../repositories/QuotaRepository'
import { InterestRepository } from '../../repositories/InterestRepository'
import { User } from '../../entities/User'
import { Budget } from '../../entities/Budget'
import { Quota } from '../../entities/Quota'
import { Interest } from '../../entities/Interest'
import { Status } from '../../entities/Status'

// Mock repositories
const mockUserRepository = {
  find: vi.fn(),
  count: vi.fn()
} as unknown as UserRepository

const mockBudgetRepository = {
  find: vi.fn(),
  count: vi.fn()
} as unknown as BudgetRepository

const mockQuotaRepository = {
  find: vi.fn(),
  count: vi.fn()
} as unknown as QuotaRepository

const mockInterestRepository = {
  find: vi.fn(),
  count: vi.fn()
} as unknown as InterestRepository

describe('ExportService', () => {
  let exportService: ExportService

  beforeEach(() => {
    exportService = new ExportService(
      mockUserRepository,
      mockBudgetRepository,
      mockQuotaRepository,
      mockInterestRepository
    )
    vi.clearAllMocks()
  })

  describe('exportUsersToCSV', () => {
    it('should export users to CSV successfully', async () => {
      // Arrange
      const mockUsers: User[] = [
        {
          id: '1',
          nombre: 'Test User',
          email: 'test@example.com',
          phoneNumber: '123456789',
          isDeleted: false,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          budgetList: []
        }
      ] as User[]

      ;(mockUserRepository.find as any).mockResolvedValue(mockUsers)

      // Act
      const result = await exportService.exportUsersToCSV()

      // Assert
      expect(result).toContain('users.csv')
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' }
      })
    })

    it('should throw DataRetrievalException when no users found', async () => {
      // Arrange
      ;(mockUserRepository.find as any).mockResolvedValue([])

      // Act & Assert
      await expect(exportService.exportUsersToCSV()).rejects.toThrow(
        'Error obteniendo datos de usuarios'
      )
    })
  })

  describe('exportBudgetsToCSV', () => {
    it('should export budgets to CSV successfully', async () => {
      // Arrange
      const mockBudgets: Budget[] = [
        {
          id: '1',
          _creationDate: new Date('2024-01-01'),
          _expirationDate: new Date('2024-12-31'),
          currentStatus: Status.ACTIVE,
          totalAmount: 1000,
          currentInterest: 5.5,
          paymentTerm: 12,
          code: 'TEST001',
          isDeleted: false,
          updatedAt: new Date('2024-01-01'),
          user: { id: 'user1' } as User,
          quotaList: []
        }
      ] as Budget[]

      ;(mockBudgetRepository.find as any).mockResolvedValue(mockBudgets)

      // Act
      const result = await exportService.exportBudgetsToCSV()

      // Assert
      expect(result).toContain('budgets.csv')
      expect(mockBudgetRepository.find).toHaveBeenCalledWith({
        relations: ['user'],
        order: { _creationDate: 'ASC' }
      })
    })
  })

  describe('exportQuotasToCSV', () => {
    it('should export quotas to CSV successfully', async () => {
      // Arrange
      const mockQuotas: Quota[] = [
        {
          id: '1',
          _creationDate: new Date('2024-01-01'),
          amount: 100,
          budget: { id: 'budget1' } as Budget
        }
      ] as Quota[]

      ;(mockQuotaRepository.find as any).mockResolvedValue(mockQuotas)

      // Act
      const result = await exportService.exportQuotasToCSV()

      // Assert
      expect(result).toContain('quotas.csv')
      expect(mockQuotaRepository.find).toHaveBeenCalledWith({
        relations: ['budget'],
        order: { _creationDate: 'ASC' }
      })
    })
  })

  describe('exportInterestsToCSV', () => {
    it('should export interests to CSV successfully', async () => {
      // Arrange
      const mockInterests: Interest[] = [
        {
          id: '1',
          paymentTerm: 12,
          interest: 5.5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ] as Interest[]

      ;(mockInterestRepository.find as any).mockResolvedValue(mockInterests)

      // Act
      const result = await exportService.exportInterestsToCSV()

      // Assert
      expect(result).toContain('interests.csv')
      expect(mockInterestRepository.find).toHaveBeenCalledWith({
        order: { paymentTerm: 'ASC' }
      })
    })
  })

  describe('exportCompleteData', () => {
    it('should export complete data to ZIP successfully', async () => {
      // Arrange
      const mockUsers: User[] = [
        {
          id: '1',
          nombre: 'Test User',
          email: 'test@example.com',
          phoneNumber: '123456789',
          isDeleted: false,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          budgetList: []
        }
      ] as User[]

      const mockBudgets: Budget[] = [
        {
          id: '1',
          _creationDate: new Date('2024-01-01'),
          _expirationDate: new Date('2024-12-31'),
          currentStatus: Status.ACTIVE,
          totalAmount: 1000,
          currentInterest: 5.5,
          paymentTerm: 12,
          code: 'TEST001',
          isDeleted: false,
          updatedAt: new Date('2024-01-01'),
          user: { id: 'user1' } as User,
          quotaList: []
        }
      ] as Budget[]

      const mockQuotas: Quota[] = [
        {
          id: '1',
          _creationDate: new Date('2024-01-01'),
          amount: 100,
          budget: { id: 'budget1' } as Budget
        }
      ] as Quota[]

      const mockInterests: Interest[] = [
        {
          id: '1',
          paymentTerm: 12,
          interest: 5.5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ] as Interest[]

      // Mock repository responses
      ;(mockUserRepository.find as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsers)
      ;(mockBudgetRepository.find as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockBudgets
      )
      ;(mockQuotaRepository.find as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockQuotas
      )
      ;(mockInterestRepository.find as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInterests
      )

      // Mock count responses
      ;(mockUserRepository.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(1)
      ;(mockBudgetRepository.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(1)
      ;(mockQuotaRepository.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(1)
      ;(mockInterestRepository.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(1)

      // Act
      const result = await exportService.exportCompleteData()

      // Assert
      expect(result).toBeDefined()
      expect(result.zipFilePath).toContain('complete_export_')
      expect(result.zipFilePath).toContain('.zip')
      expect(result.metadata).toBeDefined()
      expect(result.metadata.totalRecords.users).toBe(1)
      expect(result.metadata.totalRecords.budgets).toBe(1)
      expect(result.metadata.totalRecords.quotas).toBe(1)
      expect(result.metadata.totalRecords.interests).toBe(1)
      expect(result.metadata.exportDate).toBeInstanceOf(Date)
      expect(result.metadata.version).toBe('1.0.0')
    })

    it('should cleanup temp files on error', async () => {
      // Arrange
      ;(mockUserRepository.find as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database error')
      )

      // Act & Assert
      await expect(exportService.exportCompleteData()).rejects.toThrow(
        'Error obteniendo datos de usuarios'
      )
    })
  })

  describe('getExportStats', () => {
    it('should return correct stats for users', async () => {
      // Arrange
      ;(mockUserRepository.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(10)

      // Act
      const result = await exportService.getExportStats('users')

      // Assert
      expect(result).toBe(10)
      expect(mockUserRepository.count).toHaveBeenCalled()
    })

    it('should throw error for invalid entity type', async () => {
      // Act & Assert
      await expect(exportService.getExportStats('invalid' as never)).rejects.toThrow(
        'Error obteniendo datos de estadísticas de invalid'
      )
    })
  })
})
