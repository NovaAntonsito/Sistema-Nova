/**
 * Pruebas unitarias para ValidationService
 * Cumple con requisitos: 1.3, 2.3, 2.4, 3.3, 4.3, 4.4, 6.1, 6.2, 6.3
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ValidationService, DEFAULT_VALIDATION_CONFIG } from '../ValidationService'
import { DataValidationException } from '../ValidationExceptions'
import {
  UserImportData,
  BudgetImportData,
  QuotaImportData,
  InterestImportData,
  ImportConfig
} from '../../types/import.types'

describe('ValidationService', () => {
  let validationService: ValidationService

  beforeEach(() => {
    validationService = new ValidationService(DEFAULT_VALIDATION_CONFIG)
  })

  describe('validateImportData', () => {
    it('should validate complete import data successfully', async () => {
      const users: UserImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          nombre: 'Juan Pérez',
          email: 'juan@example.com',
          phoneNumber: '+1234567890',
          isDeleted: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const interests: InterestImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          paymentTerm: 12,
          interestPercentage: 5.5,
          isActive: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const budgets: BudgetImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          _creationDate: '2023-01-01T00:00:00.000Z',
          _expirationDate: '2023-12-31T00:00:00.000Z',
          currentStatus: 'active',
          totalAmount: 10000,
          currentInterest: 5.5,
          paymentTerm: 12,
          code: 'BUDGET001',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          isDeleted: false,
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const quotas: QuotaImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          _creationDate: '2023-01-01T00:00:00.000Z',
          amount: 1000,
          budgetId: '123e4567-e89b-12d3-a456-426614174001',
          isDeleted: false
        }
      ]

      const result = await validationService.validateImportData({
        users,
        interests,
        budgets,
        quotas
      })

      expect(result.overallValid).toBe(true)
      expect(result.totalErrors).toBe(0)
      expect(result.totalWarnings).toBe(0)
      expect(result.entityResults.size).toBe(4)
      expect(result.validationDuration).toBeGreaterThan(0)
    })

    it('should detect errors across multiple entities', async () => {
      const users: UserImportData[] = [
        {
          id: 'invalid-uuid',
          nombre: 'Juan Pérez',
          email: 'invalid-email',
          phoneNumber: '+1234567890',
          isDeleted: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const budgets: BudgetImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          _creationDate: '2023-01-01T00:00:00.000Z',
          _expirationDate: '2023-12-31T00:00:00.000Z',
          currentStatus: 'active',
          totalAmount: -1000, // Monto inválido
          currentInterest: 5.5,
          paymentTerm: 12,
          code: 'BUDGET001',
          userId: 'non-existent-user',
          isDeleted: false,
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const result = await validationService.validateImportData({
        users,
        budgets
      })

      expect(result.overallValid).toBe(false)
      expect(result.totalErrors).toBeGreaterThan(0)
      expect(result.entityResults.size).toBe(2)
    })

    it('should handle empty data gracefully', async () => {
      const result = await validationService.validateImportData({})

      expect(result.overallValid).toBe(true)
      expect(result.totalErrors).toBe(0)
      expect(result.entityResults.size).toBe(0)
    })
  })

  describe('strict mode', () => {
    it('should throw exception in strict mode when validation fails', async () => {
      const strictService = new ValidationService({
        ...DEFAULT_VALIDATION_CONFIG,
        strictMode: true
      })

      const users: UserImportData[] = [
        {
          id: 'invalid-uuid',
          nombre: 'Juan Pérez',
          email: 'juan@example.com',
          phoneNumber: '+1234567890',
          isDeleted: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      await expect(strictService.validateUsers(users)).rejects.toThrow(DataValidationException)
    })

    it('should not throw exception in lenient mode', async () => {
      const lenientService = new ValidationService({
        ...DEFAULT_VALIDATION_CONFIG,
        strictMode: false
      })

      const users: UserImportData[] = [
        {
          id: 'invalid-uuid',
          nombre: 'Juan Pérez',
          email: 'juan@example.com',
          phoneNumber: '+1234567890',
          isDeleted: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const result = await lenientService.validateUsers(users)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('error limiting', () => {
    it('should limit errors per entity', async () => {
      const limitedService = new ValidationService({
        ...DEFAULT_VALIDATION_CONFIG,
        maxErrorsPerEntity: 2,
        strictMode: false
      })

      // Crear datos con múltiples errores
      const users: UserImportData[] = Array.from({ length: 5 }, (_, i) => ({
        id: `invalid-uuid-${i}`,
        nombre: '',
        email: 'invalid-email',
        phoneNumber: '+1234567890',
        isDeleted: false,
        createdAt: 'invalid-date',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }))

      const result = await limitedService.validateUsers(users)

      expect(result.errors.length).toBeLessThanOrEqual(2)
      expect(result.warnings.some((w) => w.code === 'ERRORS_TRUNCATED')).toBe(true)
    })
  })

  describe('generateValidationReport', () => {
    it('should generate comprehensive validation report', async () => {
      const users: UserImportData[] = [
        {
          id: 'invalid-uuid',
          nombre: 'Juan Pérez',
          email: 'invalid-email',
          phoneNumber: '+1234567890',
          isDeleted: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const result = await validationService.validateImportData({ users })
      const report = validationService.generateValidationReport(result)

      expect(report).toContain('REPORTE DE VALIDACIÓN')
      expect(report).toContain('Estado general: INVÁLIDO')
      expect(report).toContain('USER')
      expect(report).toContain('Errores encontrados:')
    })
  })

  describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig = {
        maxErrorsPerEntity: 50,
        strictMode: false
      }

      validationService.updateConfig(newConfig)
      const currentConfig = validationService.getConfig()

      expect(currentConfig.maxErrorsPerEntity).toBe(50)
      expect(currentConfig.strictMode).toBe(false)
    })

    it('should get current configuration', () => {
      const config = validationService.getConfig()

      expect(config).toEqual(DEFAULT_VALIDATION_CONFIG)
    })
  })

  describe('context management', () => {
    it('should initialize with existing data', async () => {
      await validationService.initialize({
        userIds: ['user1', 'user2'],
        budgetIds: ['budget1'],
        interestTerms: [12, 24]
      })

      const stats = validationService.getValidationStats()

      expect(stats.existingUsers).toBe(2)
      expect(stats.existingBudgets).toBe(1)
      expect(stats.existingInterests).toBe(2)
    })

    it('should reset context', () => {
      validationService.resetContext()
      const stats = validationService.getValidationStats()

      expect(stats.existingUsers).toBe(0)
      expect(stats.existingBudgets).toBe(0)
      expect(stats.existingInterests).toBe(0)
    })
  })

  describe('validateImportConfig', () => {
    it('should validate correct import configuration', () => {
      const config: ImportConfig = {
        batchSize: 1000,
        maxFileSize: 10 * 1024 * 1024,
        backupRetentionDays: 30,
        tempDirectory: '/tmp/import',
        enableAutoRollback: true,
        validationLevel: 'strict'
      }

      const result = ValidationService.validateImportConfig(config)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid batch size', () => {
      const config: ImportConfig = {
        batchSize: -1,
        maxFileSize: 10 * 1024 * 1024,
        backupRetentionDays: 30,
        tempDirectory: '/tmp/import',
        enableAutoRollback: true,
        validationLevel: 'strict'
      }

      const result = ValidationService.validateImportConfig(config)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_BATCH_SIZE')
    })

    it('should detect invalid validation level', () => {
      const config: ImportConfig = {
        batchSize: 1000,
        maxFileSize: 10 * 1024 * 1024,
        backupRetentionDays: 30,
        tempDirectory: '/tmp/import',
        enableAutoRollback: true,
        validationLevel: 'invalid' as any
      }

      const result = ValidationService.validateImportConfig(config)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_VALIDATION_LEVEL')
    })

    it('should generate warnings for large values', () => {
      const config: ImportConfig = {
        batchSize: 20000, // Muy grande
        maxFileSize: 200 * 1024 * 1024, // Muy grande
        backupRetentionDays: 30,
        tempDirectory: '/tmp/import',
        enableAutoRollback: true,
        validationLevel: 'strict'
      }

      const result = ValidationService.validateImportConfig(config)

      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(2)
      expect(result.warnings.some((w) => w.code === 'LARGE_BATCH_SIZE')).toBe(true)
      expect(result.warnings.some((w) => w.code === 'LARGE_MAX_FILE_SIZE')).toBe(true)
    })
  })
})
