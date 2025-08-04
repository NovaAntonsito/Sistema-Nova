import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CsvGenerator } from '../csvGenerator'
import { existsSync, rmSync, readFileSync } from 'fs'

describe('CsvGenerator', () => {
  let csvGenerator: CsvGenerator
  const testOutputDir = 'temp/test-exports'

  beforeEach(() => {
    csvGenerator = new CsvGenerator()
  })

  afterEach(() => {
    // Limpiar archivos de prueba
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true })
    }
  })

  describe('escapeCSVValue', () => {
    it('should handle null and undefined values', () => {
      expect(csvGenerator.escapeCSVValue(null)).toBe('')
      expect(csvGenerator.escapeCSVValue(undefined)).toBe('')
    })

    it('should escape values with commas', () => {
      expect(csvGenerator.escapeCSVValue('Hello, World')).toBe('"Hello, World"')
    })

    it('should escape values with quotes', () => {
      expect(csvGenerator.escapeCSVValue('Say "Hello"')).toBe('"Say ""Hello"""')
    })

    it('should handle simple values without escaping', () => {
      expect(csvGenerator.escapeCSVValue('SimpleValue')).toBe('SimpleValue')
      expect(csvGenerator.escapeCSVValue(123)).toBe('123')
    })

    it('should format dates correctly', () => {
      const testDate = new Date('2025-01-08T10:30:00.000Z')
      expect(csvGenerator.escapeCSVValue(testDate)).toBe('2025-01-08T10:30:00.000Z')
    })
  })

  describe('formatDate', () => {
    it('should format dates in ISO 8601 format', () => {
      const testDate = new Date('2025-01-08T10:30:00.000Z')
      expect(csvGenerator.formatDate(testDate)).toBe('2025-01-08T10:30:00.000Z')
    })
  })

  describe('validateHeaders', () => {
    it('should validate correct headers', () => {
      expect(csvGenerator.validateHeaders(['id', 'name', 'email'])).toBe(true)
    })

    it('should reject empty headers array', () => {
      expect(csvGenerator.validateHeaders([])).toBe(false)
    })

    it('should reject headers with empty values', () => {
      expect(csvGenerator.validateHeaders(['id', '', 'email'])).toBe(false)
    })

    it('should reject duplicate headers', () => {
      expect(csvGenerator.validateHeaders(['id', 'name', 'id'])).toBe(false)
    })
  })

  describe('generateCSV', () => {
    it('should generate CSV file with correct content', async () => {
      const testData = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
      ]
      const headers = ['id', 'name', 'email']

      const filePath = await csvGenerator.generateCSV(testData, headers, 'test-users', testOutputDir)

      expect(existsSync(filePath)).toBe(true)

      const content = readFileSync(filePath, 'utf8')
      const lines = content.split('\r\n')

      expect(lines[0]).toBe('id,name,email')
      expect(lines[1]).toBe('1,John Doe,john@example.com')
      expect(lines[2]).toBe('2,Jane Smith,jane@example.com')
    })

    it('should handle data with special characters', async () => {
      const testData = [
        { id: 1, name: 'John, Jr.', comment: 'Says "Hello"' },
      ]
      const headers = ['id', 'name', 'comment']

      const filePath = await csvGenerator.generateCSV(testData, headers, 'test-special', testOutputDir)
      const content = readFileSync(filePath, 'utf8')
      const lines = content.split('\r\n')

      expect(lines[1]).toBe('1,"John, Jr.","Says ""Hello"""')
    })
  })

  describe('getCSVStats', () => {
    it('should return correct statistics', () => {
      const testData = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ]
      const headers = ['id', 'name']

      const stats = csvGenerator.getCSVStats(testData, headers)

      expect(stats.rows).toBe(3) // 2 data rows + 1 header row
      expect(stats.columns).toBe(2)
      expect(stats.estimatedSize).toBeGreaterThan(0)
    })
  })
})