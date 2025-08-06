import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { CsvParser } from '../csvParser'
import { EntityType } from '../../types/import.types'
import { CSVParseException, FileNotFoundException } from '../../exceptions/importExceptions'

describe('CsvParser', () => {
  let csvParser: CsvParser
  let testDir: string

  beforeEach(() => {
    csvParser = new CsvParser()
    testDir = join(process.cwd(), 'temp', 'test-csv')
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('parseCSV', () => {
    it('should parse valid user CSV file', async () => {
      const csvContent = [
        'id,nombre,email,phoneNumber,isDeleted,createdAt,updatedAt',
        'user1,Juan Pérez,juan@example.com,123456789,false,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z',
        'user2,María García,maria@example.com,987654321,true,2024-01-02T00:00:00.000Z,2024-01-02T00:00:00.000Z'
      ].join('\n')

      const filePath = join(testDir, 'users.csv')
      writeFileSync(filePath, csvContent, 'utf8')

      const result = await csvParser.parseCSV(filePath, EntityType.USER)

      expect(result.totalRows).toBe(2)
      expect(result.validRows).toBe(2)
      expect(result.errors).toHaveLength(0)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({
        id: 'user1',
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        phoneNumber: '123456789',
        isDeleted: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      })
    })

    it('should handle CSV with validation errors', async () => {
      const csvContent = [
        'id,nombre,email,phoneNumber,isDeleted,createdAt,updatedAt',
        'user1,Juan Pérez,invalid-email,123456789,false,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z',
        ',María García,maria@example.com,987654321,true,2024-01-02T00:00:00.000Z,2024-01-02T00:00:00.000Z'
      ].join('\n')

      const filePath = join(testDir, 'users-invalid.csv')
      writeFileSync(filePath, csvContent, 'utf8')

      const result = await csvParser.parseCSV(filePath, EntityType.USER)

      expect(result.totalRows).toBe(2)
      expect(result.validRows).toBe(0)
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0].message).toContain('invalid-email')
      expect(result.errors[1].message).toContain('está vacío')
    })

    it('should throw error for missing file', async () => {
      const filePath = join(testDir, 'nonexistent.csv')

      await expect(csvParser.parseCSV(filePath, EntityType.USER)).rejects.toThrow(
        FileNotFoundException
      )
    })

    it('should throw error for invalid file format', async () => {
      const filePath = join(testDir, 'invalid.txt')
      writeFileSync(filePath, 'some content', 'utf8')

      await expect(csvParser.parseCSV(filePath, EntityType.USER)).rejects.toThrow(
        'Formato de archivo inválido'
      )
    })
  })

  describe('validateCSVFormat', () => {
    it('should validate correct CSV format', async () => {
      const csvContent = [
        'id,nombre,email,phoneNumber,isDeleted,createdAt,updatedAt',
        'user1,Juan Pérez,juan@example.com,123456789,false,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z'
      ].join('\n')

      const filePath = join(testDir, 'valid.csv')
      writeFileSync(filePath, csvContent, 'utf8')

      const isValid = await csvParser.validateCSVFormat(filePath, [
        'id',
        'nombre',
        'email',
        'phoneNumber',
        'isDeleted',
        'createdAt',
        'updatedAt'
      ])

      expect(isValid).toBe(true)
    })

    it('should reject CSV with missing headers', async () => {
      const csvContent = ['id,nombre,email', 'user1,Juan Pérez,juan@example.com'].join('\n')

      const filePath = join(testDir, 'incomplete.csv')
      writeFileSync(filePath, csvContent, 'utf8')

      const isValid = await csvParser.validateCSVFormat(filePath, [
        'id',
        'nombre',
        'email',
        'phoneNumber',
        'isDeleted',
        'createdAt',
        'updatedAt'
      ])

      expect(isValid).toBe(false)
    })
  })

  describe('getSchema', () => {
    it('should return correct schema for user entity', () => {
      const schema = csvParser.getSchema(EntityType.USER)

      expect(schema.entityType).toBe(EntityType.USER)
      expect(schema.requiredHeaders).toContain('id')
      expect(schema.requiredHeaders).toContain('email')
      expect(schema.fieldValidators?.email).toBeDefined()
    })

    it('should throw error for unsupported entity type', () => {
      expect(() => csvParser.getSchema('invalid' as EntityType)).toThrow('Esquema no encontrado')
    })
  })

  describe('isCSVFile', () => {
    it('should return true for CSV files', () => {
      expect(csvParser.isCSVFile('test.csv')).toBe(true)
      expect(csvParser.isCSVFile('TEST.CSV')).toBe(true)
    })

    it('should return false for non-CSV files', () => {
      expect(csvParser.isCSVFile('test.txt')).toBe(false)
      expect(csvParser.isCSVFile('test.xlsx')).toBe(false)
    })
  })
})
