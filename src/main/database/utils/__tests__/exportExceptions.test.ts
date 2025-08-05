import { describe, it, expect } from 'vitest'
import {
  ExportException,
  FileWriteException,
  DataRetrievalException,
  ZipCreationException,
  FileCleanupException
} from '../exportExceptions'

describe('Export Exceptions', () => {
  describe('ExportException', () => {
    it('should create exception with message and details', () => {
      const details = { test: 'data' }
      const exception = new ExportException('Test error', details)

      expect(exception).toBeInstanceOf(Error)
      expect(exception.message).toBe('Test error')
      expect(exception.code).toBe('EXPORT_ERROR')
      expect(exception.details).toEqual(details)
      expect(exception.name).toBe('ExportException')
    })
  })

  describe('FileWriteException', () => {
    it('should create exception with file path', () => {
      const filePath = '/path/to/file.csv'
      const exception = new FileWriteException(filePath)

      expect(exception).toBeInstanceOf(ExportException)
      expect(exception.message).toBe(`Error escribiendo archivo: ${filePath}`)
      expect(exception.details.filePath).toBe(filePath)
    })

    it('should include cause error message when provided', () => {
      const filePath = '/path/to/file.csv'
      const cause = new Error('Permission denied')
      const exception = new FileWriteException(filePath, cause)

      expect(exception.details.cause).toBe('Permission denied')
    })
  })

  describe('DataRetrievalException', () => {
    it('should create exception with entity name', () => {
      const entity = 'users'
      const exception = new DataRetrievalException(entity)

      expect(exception).toBeInstanceOf(ExportException)
      expect(exception.message).toBe(`Error obteniendo datos de ${entity}`)
      expect(exception.details.entity).toBe(entity)
    })

    it('should include cause error message when provided', () => {
      const entity = 'budgets'
      const cause = new Error('Database connection failed')
      const exception = new DataRetrievalException(entity, cause)

      expect(exception.details.cause).toBe('Database connection failed')
    })
  })

  describe('ZipCreationException', () => {
    it('should create exception with zip path', () => {
      const zipPath = '/path/to/export.zip'
      const exception = new ZipCreationException(zipPath)

      expect(exception).toBeInstanceOf(ExportException)
      expect(exception.message).toBe(`Error creando archivo ZIP: ${zipPath}`)
      expect(exception.details.zipPath).toBe(zipPath)
    })
  })

  describe('FileCleanupException', () => {
    it('should create exception with directory path', () => {
      const directory = '/temp/exports'
      const exception = new FileCleanupException(directory)

      expect(exception).toBeInstanceOf(ExportException)
      expect(exception.message).toBe(`Error limpiando archivos temporales en: ${directory}`)
      expect(exception.details.directory).toBe(directory)
    })
  })
})
