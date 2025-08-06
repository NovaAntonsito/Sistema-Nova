/**
 * Pruebas unitarias para ValidationUtils
 * Cumple con requisitos: 1.3, 2.3, 2.4, 3.3, 4.3, 4.4, 6.1, 6.2, 6.3
 */

import { describe, it, expect } from 'vitest'
import { ValidationUtils, DEFAULT_VALIDATION_RULES } from '../ValidationUtils'
import { EntityType } from '../../types/import.types'

describe('ValidationUtils', () => {
  describe('isValidUUID', () => {
    it('should validate correct UUID v4', () => {
      const validUUID = '123e4567-e89b-42d3-a456-426614174000'
      expect(ValidationUtils.isValidUUID(validUUID)).toBe(true)
    })

    it('should reject invalid UUID format', () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        '',
        'not-a-uuid-at-all'
      ]

      invalidUUIDs.forEach((uuid) => {
        expect(ValidationUtils.isValidUUID(uuid)).toBe(false)
      })
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ]

      validEmails.forEach((email) => {
        expect(ValidationUtils.isValidEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user space@domain.com',
        'user@domain..com',
        ''
      ]

      invalidEmails.forEach((email) => {
        expect(ValidationUtils.isValidEmail(email)).toBe(false)
      })
    })

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      expect(ValidationUtils.isValidEmail(longEmail)).toBe(false)
    })
  })

  describe('isValidPhone', () => {
    it('should validate correct phone formats', () => {
      const validPhones = [
        '+1234567890',
        '(555) 123-4567',
        '555-123-4567',
        '555 123 4567',
        '5551234567'
      ]

      validPhones.forEach((phone) => {
        expect(ValidationUtils.isValidPhone(phone)).toBe(true)
      })
    })

    it('should reject invalid phone formats', () => {
      const invalidPhones = [
        'abc123',
        '123',
        '123456789012345678901', // Muy largo
        'phone-number',
        ''
      ]

      invalidPhones.forEach((phone) => {
        expect(ValidationUtils.isValidPhone(phone)).toBe(false)
      })
    })

    it('should respect custom validation rules', () => {
      const customRules = {
        ...DEFAULT_VALIDATION_RULES,
        phoneMinLength: 10,
        phoneMaxLength: 15
      }

      expect(ValidationUtils.isValidPhone('123456789', customRules)).toBe(false) // Muy corto
      expect(ValidationUtils.isValidPhone('1234567890', customRules)).toBe(true)
      expect(ValidationUtils.isValidPhone('12345678901234567890', customRules)).toBe(false) // Muy largo
    })
  })

  describe('isValidISODate', () => {
    it('should validate correct ISO date formats', () => {
      const validDates = [
        '2023-01-01T00:00:00.000Z',
        '2023-12-31T23:59:59.999Z',
        '2023-06-15T12:30:45.123Z',
        '2023-01-01'
      ]

      validDates.forEach((date) => {
        expect(ValidationUtils.isValidISODate(date)).toBe(true)
      })
    })

    it('should reject invalid date formats', () => {
      const invalidDates = [
        'invalid-date',
        '2023-13-01', // Mes inválido
        '2023-01-32', // Día inválido
        '2023/01/01', // Formato incorrecto
        '',
        null,
        undefined
      ]

      invalidDates.forEach((date) => {
        expect(ValidationUtils.isValidISODate(date as any)).toBe(false)
      })
    })
  })

  describe('isInRange', () => {
    it('should validate numbers within range', () => {
      expect(ValidationUtils.isInRange(5, 0, 10)).toBe(true)
      expect(ValidationUtils.isInRange(0, 0, 10)).toBe(true)
      expect(ValidationUtils.isInRange(10, 0, 10)).toBe(true)
    })

    it('should reject numbers outside range', () => {
      expect(ValidationUtils.isInRange(-1, 0, 10)).toBe(false)
      expect(ValidationUtils.isInRange(11, 0, 10)).toBe(false)
      expect(ValidationUtils.isInRange(NaN, 0, 10)).toBe(false)
    })
  })

  describe('isPositiveNumber', () => {
    it('should validate positive numbers', () => {
      expect(ValidationUtils.isPositiveNumber(1)).toBe(true)
      expect(ValidationUtils.isPositiveNumber(0.1)).toBe(true)
      expect(ValidationUtils.isPositiveNumber(1000)).toBe(true)
    })

    it('should reject non-positive numbers', () => {
      expect(ValidationUtils.isPositiveNumber(0)).toBe(false)
      expect(ValidationUtils.isPositiveNumber(-1)).toBe(false)
      expect(ValidationUtils.isPositiveNumber(NaN)).toBe(false)
      expect(ValidationUtils.isPositiveNumber('1' as any)).toBe(false)
    })
  })

  describe('isNonNegativeNumber', () => {
    it('should validate non-negative numbers', () => {
      expect(ValidationUtils.isNonNegativeNumber(0)).toBe(true)
      expect(ValidationUtils.isNonNegativeNumber(1)).toBe(true)
      expect(ValidationUtils.isNonNegativeNumber(0.1)).toBe(true)
    })

    it('should reject negative numbers', () => {
      expect(ValidationUtils.isNonNegativeNumber(-1)).toBe(false)
      expect(ValidationUtils.isNonNegativeNumber(-0.1)).toBe(false)
      expect(ValidationUtils.isNonNegativeNumber(NaN)).toBe(false)
    })
  })

  describe('isInAllowedValues', () => {
    it('should validate values in allowed list', () => {
      const allowedValues = ['active', 'inactive', 'pending']

      expect(ValidationUtils.isInAllowedValues('active', allowedValues)).toBe(true)
      expect(ValidationUtils.isInAllowedValues('inactive', allowedValues)).toBe(true)
      expect(ValidationUtils.isInAllowedValues('pending', allowedValues)).toBe(true)
    })

    it('should reject values not in allowed list', () => {
      const allowedValues = ['active', 'inactive', 'pending']

      expect(ValidationUtils.isInAllowedValues('invalid', allowedValues)).toBe(false)
      expect(ValidationUtils.isInAllowedValues('', allowedValues)).toBe(false)
    })
  })

  describe('isValidStringLength', () => {
    it('should validate strings within length range', () => {
      expect(ValidationUtils.isValidStringLength('hello', 1, 10)).toBe(true)
      expect(ValidationUtils.isValidStringLength('a', 1, 10)).toBe(true)
      expect(ValidationUtils.isValidStringLength('1234567890', 1, 10)).toBe(true)
    })

    it('should reject strings outside length range', () => {
      expect(ValidationUtils.isValidStringLength('', 1, 10)).toBe(false)
      expect(ValidationUtils.isValidStringLength('12345678901', 1, 10)).toBe(false)
    })
  })

  describe('sanitizeString', () => {
    it('should remove control characters', () => {
      const input = 'hello\x00world\x1F'
      const result = ValidationUtils.sanitizeString(input)
      expect(result).toBe('helloworld')
    })

    it('should replace dangerous CSV characters', () => {
      const input = 'hello"world\ntest\r'
      const result = ValidationUtils.sanitizeString(input)
      expect(result).toBe('hello world test')
    })

    it('should trim whitespace', () => {
      const input = '  hello world  '
      const result = ValidationUtils.sanitizeString(input)
      expect(result).toBe('hello world')
    })

    it('should handle non-string values', () => {
      expect(ValidationUtils.sanitizeString(123 as any)).toBe('123')
      expect(ValidationUtils.sanitizeString(null as any)).toBe('null')
    })
  })

  describe('createValidationError', () => {
    it('should create validation error with correct structure', () => {
      const error = ValidationUtils.createValidationError(
        5,
        'email',
        'invalid@',
        'Invalid email format',
        'INVALID_EMAIL'
      )

      expect(error).toEqual({
        line: 5,
        field: 'email',
        value: 'invalid@',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL'
      })
    })
  })

  describe('createValidationWarning', () => {
    it('should create validation warning with correct structure', () => {
      const warning = ValidationUtils.createValidationWarning(
        3,
        'phone',
        '123',
        'Phone number may be too short',
        'SHORT_PHONE'
      )

      expect(warning).toEqual({
        line: 3,
        field: 'phone',
        value: '123',
        message: 'Phone number may be too short',
        code: 'SHORT_PHONE'
      })
    })
  })

  describe('validateRequiredFields', () => {
    it('should detect missing required fields', () => {
      const data = {
        name: 'John',
        email: '',
        phone: null,
        age: undefined
      }
      const requiredFields = ['name', 'email', 'phone', 'age']

      const errors = ValidationUtils.validateRequiredFields(data, requiredFields, 2)

      expect(errors).toHaveLength(3)
      expect(errors.map((e) => e.field)).toEqual(['email', 'phone', 'age'])
      expect(errors.every((e) => e.code === 'REQUIRED_FIELD_MISSING')).toBe(true)
      expect(errors.every((e) => e.line === 2)).toBe(true)
    })

    it('should pass when all required fields are present', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        phone: '123456789'
      }
      const requiredFields = ['name', 'email', 'phone']

      const errors = ValidationUtils.validateRequiredFields(data, requiredFields, 2)

      expect(errors).toHaveLength(0)
    })
  })

  describe('validateDataTypes', () => {
    it('should validate correct data types', () => {
      const data = {
        name: 'John',
        age: 30,
        active: true,
        createdAt: '2023-01-01T00:00:00.000Z'
      }
      const typeDefinitions = {
        name: 'string' as const,
        age: 'number' as const,
        active: 'boolean' as const,
        createdAt: 'date' as const
      }

      const errors = ValidationUtils.validateDataTypes(data, typeDefinitions, 2)

      expect(errors).toHaveLength(0)
    })

    it('should detect incorrect data types', () => {
      const data = {
        name: 123,
        age: 'thirty',
        active: 'true',
        createdAt: 'invalid-date'
      }
      const typeDefinitions = {
        name: 'string' as const,
        age: 'number' as const,
        active: 'boolean' as const,
        createdAt: 'date' as const
      }

      const errors = ValidationUtils.validateDataTypes(data, typeDefinitions, 2)

      expect(errors).toHaveLength(4)
      expect(errors.every((e) => e.code === 'INVALID_DATA_TYPE')).toBe(true)
    })

    it('should skip validation for undefined/null values', () => {
      const data = {
        name: undefined,
        age: null
      }
      const typeDefinitions = {
        name: 'string' as const,
        age: 'number' as const
      }

      const errors = ValidationUtils.validateDataTypes(data, typeDefinitions, 2)

      expect(errors).toHaveLength(0)
    })
  })

  describe('getEntityValidationSchema', () => {
    it('should return correct schema for USER entity', () => {
      const schema = ValidationUtils.getEntityValidationSchema(EntityType.USER)

      expect(schema.requiredFields).toContain('id')
      expect(schema.requiredFields).toContain('nombre')
      expect(schema.requiredFields).toContain('email')
      expect(schema.typeDefinitions.id).toBe('string')
      expect(schema.typeDefinitions.isDeleted).toBe('boolean')
      expect(schema.typeDefinitions.createdAt).toBe('date')
    })

    it('should return correct schema for BUDGET entity', () => {
      const schema = ValidationUtils.getEntityValidationSchema(EntityType.BUDGET)

      expect(schema.requiredFields).toContain('id')
      expect(schema.requiredFields).toContain('totalAmount')
      expect(schema.requiredFields).toContain('userId')
      expect(schema.typeDefinitions.totalAmount).toBe('number')
      expect(schema.typeDefinitions._creationDate).toBe('date')
    })

    it('should return correct schema for QUOTA entity', () => {
      const schema = ValidationUtils.getEntityValidationSchema(EntityType.QUOTA)

      expect(schema.requiredFields).toContain('id')
      expect(schema.requiredFields).toContain('amount')
      expect(schema.requiredFields).toContain('budgetId')
      expect(schema.typeDefinitions.amount).toBe('number')
    })

    it('should return correct schema for INTEREST entity', () => {
      const schema = ValidationUtils.getEntityValidationSchema(EntityType.INTEREST)

      expect(schema.requiredFields).toContain('id')
      expect(schema.requiredFields).toContain('paymentTerm')
      expect(schema.requiredFields).toContain('interestPercentage')
      expect(schema.typeDefinitions.paymentTerm).toBe('number')
      expect(schema.typeDefinitions.interestPercentage).toBe('number')
    })

    it('should return empty schema for unknown entity type', () => {
      const schema = ValidationUtils.getEntityValidationSchema('unknown' as EntityType)

      expect(schema.requiredFields).toHaveLength(0)
      expect(schema.optionalFields).toHaveLength(0)
      expect(Object.keys(schema.typeDefinitions)).toHaveLength(0)
    })
  })

  describe('formatValidationErrors', () => {
    it('should format errors grouped by line', () => {
      const errors = [
        ValidationUtils.createValidationError(
          2,
          'email',
          'invalid',
          'Invalid email',
          'INVALID_EMAIL'
        ),
        ValidationUtils.createValidationError(2, 'phone', '123', 'Invalid phone', 'INVALID_PHONE'),
        ValidationUtils.createValidationError(3, 'name', '', 'Missing name', 'REQUIRED_FIELD')
      ]

      const formatted = ValidationUtils.formatValidationErrors(errors)

      expect(formatted).toContain('Línea 2:')
      expect(formatted).toContain('- email: Invalid email')
      expect(formatted).toContain('- phone: Invalid phone')
      expect(formatted).toContain('Línea 3:')
      expect(formatted).toContain('- name: Missing name')
    })

    it('should handle empty errors array', () => {
      const formatted = ValidationUtils.formatValidationErrors([])
      expect(formatted).toBe('No hay errores de validación')
    })
  })

  describe('formatValidationWarnings', () => {
    it('should format warnings grouped by line', () => {
      const warnings = [
        ValidationUtils.createValidationWarning(2, 'phone', '123456', 'Short phone', 'SHORT_PHONE'),
        ValidationUtils.createValidationWarning(
          3,
          'email',
          'test@test',
          'Suspicious email',
          'SUSPICIOUS_EMAIL'
        )
      ]

      const formatted = ValidationUtils.formatValidationWarnings(warnings)

      expect(formatted).toContain('Línea 2:')
      expect(formatted).toContain('- phone: Short phone')
      expect(formatted).toContain('Línea 3:')
      expect(formatted).toContain('- email: Suspicious email')
    })

    it('should handle empty warnings array', () => {
      const formatted = ValidationUtils.formatValidationWarnings([])
      expect(formatted).toBe('No hay advertencias de validación')
    })
  })
})
