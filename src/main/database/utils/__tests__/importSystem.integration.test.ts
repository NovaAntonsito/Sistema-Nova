import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { CsvParser } from '../csvParser'
import { ZipExtractor } from '../zipExtractor'
import { EntityType } from '../../types/import.types'

describe('Import System Integration', () => {
  let csvParser: CsvParser
  let zipExtractor: ZipExtractor
  let testDir: string

  beforeEach(() => {
    csvParser = new CsvParser()
    zipExtractor = new ZipExtractor()
    testDir = join(process.cwd(), 'temp', 'test-integration')
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('CSV Parser and ZIP Extractor Integration', () => {
    it('should validate CSV schemas for all entity types', () => {
      // Test that all entity types have valid schemas
      const entityTypes = [
        EntityType.USER,
        EntityType.BUDGET,
        EntityType.QUOTA,
        EntityType.INTEREST
      ]

      entityTypes.forEach((entityType) => {
        const schema = csvParser.getSchema(entityType)
        expect(schema.entityType).toBe(entityType)
        expect(schema.requiredHeaders).toBeDefined()
        expect(schema.requiredHeaders.length).toBeGreaterThan(0)
      })
    })

    it('should handle different CSV formats correctly', async () => {
      // Test CSV with different line endings and encodings
      const csvContent = [
        'id,nombre,email,phoneNumber,isDeleted,createdAt,updatedAt',
        'user1,"Juan Pérez",juan@example.com,123456789,false,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z',
        'user2,"María García",maria@example.com,987654321,true,2024-01-02T00:00:00.000Z,2024-01-02T00:00:00.000Z'
      ].join('\r\n') // Windows line endings

      const filePath = join(testDir, 'users-windows.csv')
      writeFileSync(filePath, csvContent, 'utf8')

      const result = await csvParser.parseCSV(filePath, EntityType.USER)

      expect(result.totalRows).toBe(2)
      expect(result.validRows).toBe(2)
      expect(result.errors).toHaveLength(0)
      expect(result.data[0].nombre).toBe('Juan Pérez')
      expect(result.data[1].nombre).toBe('María García')
    })

    it('should validate file extensions correctly', () => {
      expect(csvParser.isCSVFile('test.csv')).toBe(true)
      expect(csvParser.isCSVFile('test.CSV')).toBe(true)
      expect(csvParser.isCSVFile('test.txt')).toBe(false)
      expect(csvParser.isCSVFile('test')).toBe(false)
    })

    it('should handle empty CSV files gracefully', async () => {
      const filePath = join(testDir, 'empty.csv')
      writeFileSync(filePath, '', 'utf8')

      await expect(csvParser.parseCSV(filePath, EntityType.USER)).rejects.toThrow(
        'Archivo CSV vacío'
      )
    })

    it('should validate budget CSV with numeric fields', async () => {
      const csvContent = [
        'id,_creationDate,_expirationDate,currentStatus,totalAmount,currentInterest,paymentTerm,code,userId,isDeleted,updatedAt',
        'budget1,2024-01-01T00:00:00.000Z,2024-12-31T00:00:00.000Z,ACTIVE,1000.50,5.25,12,BUD001,user1,false,2024-01-01T00:00:00.000Z'
      ].join('\n')

      const filePath = join(testDir, 'budgets.csv')
      writeFileSync(filePath, csvContent, 'utf8')

      const result = await csvParser.parseCSV(filePath, EntityType.BUDGET)

      expect(result.totalRows).toBe(1)
      expect(result.validRows).toBe(1)
      expect(result.errors).toHaveLength(0)
      expect(result.data[0].totalAmount).toBe(1000.5)
      expect(result.data[0].currentInterest).toBe(5.25)
      expect(result.data[0].paymentTerm).toBe(12)
    })

    it('should handle CSV with quoted fields containing commas', async () => {
      const csvContent = [
        'id,nombre,email,phoneNumber,isDeleted,createdAt,updatedAt',
        'user1,"García, Juan",juan@example.com,123456789,false,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z'
      ].join('\n')

      const filePath = join(testDir, 'users-quoted.csv')
      writeFileSync(filePath, csvContent, 'utf8')

      const result = await csvParser.parseCSV(filePath, EntityType.USER)

      expect(result.totalRows).toBe(1)
      expect(result.validRows).toBe(1)
      expect(result.data[0].nombre).toBe('García, Juan')
    })
  })

  describe('Error Handling Integration', () => {
    it('should provide detailed error information for validation failures', async () => {
      const csvContent = [
        'id,nombre,email,phoneNumber,isDeleted,createdAt,updatedAt',
        'user1,Juan Pérez,invalid-email,123456789,invalid-boolean,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z'
      ].join('\n')

      const filePath = join(testDir, 'users-invalid.csv')
      writeFileSync(filePath, csvContent, 'utf8')

      const result = await csvParser.parseCSV(filePath, EntityType.USER)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].line).toBe(2)
      expect(result.errors[0].message).toContain('invalid-email')
      expect(result.errors[0].message).toContain('invalid-boolean')
    })

    it('should handle missing required headers', async () => {
      const csvContent = [
        'id,nombre,email', // Missing required headers
        'user1,Juan Pérez,juan@example.com'
      ].join('\n')

      const filePath = join(testDir, 'users-missing-headers.csv')
      writeFileSync(filePath, csvContent, 'utf8')

      await expect(csvParser.parseCSV(filePath, EntityType.USER)).rejects.toThrow(
        'Headers faltantes'
      )
    })
  })
})
