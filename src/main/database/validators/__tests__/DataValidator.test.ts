/**
 * Pruebas unitarias para DataValidator
 * Cumple con requisitos: 1.3, 2.3, 2.4, 3.3, 4.3, 4.4, 6.1, 6.2, 6.3
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DataValidator } from '../DataValidator'
import {
  UserImportData,
  BudgetImportData,
  QuotaImportData,
  InterestImportData
} from '../../types/import.types'

describe('DataValidator', () => {
  let validator: DataValidator

  beforeEach(() => {
    validator = new DataValidator()
  })

  describe('validateUsers', () => {
    it('should validate correct user data', async () => {
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

      const result = await validator.validateUsers(users)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should detect invalid email format', async () => {
      const users: UserImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          nombre: 'Juan Pérez',
          email: 'invalid-email',
          phoneNumber: '+1234567890',
          isDeleted: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const result = await validator.validateUsers(users)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_EMAIL_FORMAT')
      expect(result.errors[0].field).toBe('email')
      expect(result.errors[0].line).toBe(2)
    })

    it('should detect duplicate emails', async () => {
      const users: UserImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          nombre: 'Juan Pérez',
          email: 'juan@example.com',
          phoneNumber: '+1234567890',
          isDeleted: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          nombre: 'María García',
          email: 'juan@example.com', // Email duplicado
          phoneNumber: '+1234567891',
          isDeleted: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const result = await validator.validateUsers(users)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('DUPLICATE_EMAIL')
      expect(result.errors[0].field).toBe('email')
      expect(result.errors[0].line).toBe(3)
    })

    it('should detect invalid UUID format', async () => {
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

      const result = await validator.validateUsers(users)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_ID_FORMAT')
      expect(result.errors[0].field).toBe('id')
    })

    it('should detect missing required fields', async () => {
      const users: UserImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          nombre: '',
          email: 'juan@example.com',
          phoneNumber: '+1234567890',
          isDeleted: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const result = await validator.validateUsers(users)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('REQUIRED_FIELD_MISSING')
      expect(result.errors[0].field).toBe('nombre')
    })

    it('should detect invalid date format', async () => {
      const users: UserImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          nombre: 'Juan Pérez',
          email: 'juan@example.com',
          phoneNumber: '+1234567890',
          isDeleted: false,
          createdAt: 'invalid-date',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const result = await validator.validateUsers(users)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_DATE_FORMAT')
      expect(result.errors[0].field).toBe('createdAt')
    })
  })

  describe('validateBudgets', () => {
    beforeEach(async () => {
      // Inicializar contexto con usuarios existentes
      await validator.initializeContext({
        userIds: ['123e4567-e89b-12d3-a456-426614174000']
      })
    })

    it('should validate correct budget data', async () => {
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

      const result = await validator.validateBudgets(budgets)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect referential integrity error', async () => {
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
          userId: 'non-existent-user-id',
          isDeleted: false,
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const result = await validator.validateBudgets(budgets)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('REFERENTIAL_INTEGRITY_ERROR')
      expect(result.errors[0].field).toBe('userId')
    })

    it('should detect duplicate budget codes', async () => {
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
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          _creationDate: '2023-01-01T00:00:00.000Z',
          _expirationDate: '2023-12-31T00:00:00.000Z',
          currentStatus: 'active',
          totalAmount: 15000,
          currentInterest: 6.0,
          paymentTerm: 24,
          code: 'BUDGET001', // Código duplicado
          userId: '123e4567-e89b-12d3-a456-426614174000',
          isDeleted: false,
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const result = await validator.validateBudgets(budgets)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('DUPLICATE_CODE')
      expect(result.errors[0].field).toBe('code')
      expect(result.errors[0].line).toBe(3)
    })

    it('should detect invalid amounts', async () => {
      const budgets: BudgetImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          _creationDate: '2023-01-01T00:00:00.000Z',
          _expirationDate: '2023-12-31T00:00:00.000Z',
          currentStatus: 'active',
          totalAmount: -1000, // Monto negativo
          currentInterest: 5.5,
          paymentTerm: 12,
          code: 'BUDGET001',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          isDeleted: false,
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const result = await validator.validateBudgets(budgets)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_AMOUNT')
      expect(result.errors[0].field).toBe('totalAmount')
    })

    it('should detect invalid status', async () => {
      const budgets: BudgetImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          _creationDate: '2023-01-01T00:00:00.000Z',
          _expirationDate: '2023-12-31T00:00:00.000Z',
          currentStatus: 'invalid-status',
          totalAmount: 10000,
          currentInterest: 5.5,
          paymentTerm: 12,
          code: 'BUDGET001',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          isDeleted: false,
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const result = await validator.validateBudgets(budgets)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_STATUS')
      expect(result.errors[0].field).toBe('currentStatus')
    })
  })

  describe('validateQuotas', () => {
    beforeEach(async () => {
      // Inicializar contexto con presupuestos existentes
      await validator.initializeContext({
        budgetIds: ['123e4567-e89b-12d3-a456-426614174001']
      })
    })

    it('should validate correct quota data', async () => {
      const quotas: QuotaImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          _creationDate: '2023-01-01T00:00:00.000Z',
          amount: 1000,
          budgetId: '123e4567-e89b-12d3-a456-426614174001',
          isDeleted: false
        }
      ]

      const result = await validator.validateQuotas(quotas)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect referential integrity error with budget', async () => {
      const quotas: QuotaImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          _creationDate: '2023-01-01T00:00:00.000Z',
          amount: 1000,
          budgetId: 'non-existent-budget-id',
          isDeleted: false
        }
      ]

      const result = await validator.validateQuotas(quotas)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('REFERENTIAL_INTEGRITY_ERROR')
      expect(result.errors[0].field).toBe('budgetId')
    })

    it('should detect invalid quota amount', async () => {
      const quotas: QuotaImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          _creationDate: '2023-01-01T00:00:00.000Z',
          amount: -500, // Monto negativo
          budgetId: '123e4567-e89b-12d3-a456-426614174001',
          isDeleted: false
        }
      ]

      const result = await validator.validateQuotas(quotas)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_QUOTA_AMOUNT')
      expect(result.errors[0].field).toBe('amount')
    })
  })

  describe('validateInterests', () => {
    it('should validate correct interest data', async () => {
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

      const result = await validator.validateInterests(interests)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect duplicate payment terms', async () => {
      const interests: InterestImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          paymentTerm: 12,
          interestPercentage: 5.5,
          isActive: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174004',
          paymentTerm: 12, // Término duplicado
          interestPercentage: 6.0,
          isActive: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const result = await validator.validateInterests(interests)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('DUPLICATE_PAYMENT_TERM')
      expect(result.errors[0].field).toBe('paymentTerm')
      expect(result.errors[0].line).toBe(3)
    })

    it('should detect invalid interest percentage', async () => {
      const interests: InterestImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          paymentTerm: 12,
          interestPercentage: 150, // Porcentaje inválido
          isActive: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const result = await validator.validateInterests(interests)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_INTEREST_PERCENTAGE')
      expect(result.errors[0].field).toBe('interestPercentage')
    })

    it('should detect invalid payment term', async () => {
      const interests: InterestImportData[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          paymentTerm: -5, // Término negativo
          interestPercentage: 5.5,
          isActive: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]

      const result = await validator.validateInterests(interests)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_PAYMENT_TERM')
      expect(result.errors[0].field).toBe('paymentTerm')
    })
  })

  describe('validateReferentialIntegrity', () => {
    it('should validate complete referential integrity', async () => {
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

      // Primero validar entidades individuales para construir contexto
      await validator.validateUsers(users)
      await validator.validateInterests(interests)
      await validator.validateBudgets(budgets)
      await validator.validateQuotas(quotas)

      const result = await validator.validateReferentialIntegrity({
        users,
        interests,
        budgets,
        quotas
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('context management', () => {
    it('should initialize context with existing data', async () => {
      await validator.initializeContext({
        userIds: ['user1', 'user2'],
        budgetIds: ['budget1'],
        interestTerms: [12, 24]
      })

      const stats = validator.getContextStats()

      expect(stats.existingUsers).toBe(2)
      expect(stats.existingBudgets).toBe(1)
      expect(stats.existingInterests).toBe(2)
    })

    it('should reset context', () => {
      validator.resetContext()
      const stats = validator.getContextStats()

      expect(stats.existingUsers).toBe(0)
      expect(stats.existingBudgets).toBe(0)
      expect(stats.existingInterests).toBe(0)
      expect(stats.importedUsers).toBe(0)
      expect(stats.importedBudgets).toBe(0)
      expect(stats.importedInterests).toBe(0)
    })
  })
})
