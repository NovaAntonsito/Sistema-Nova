import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ZipGenerator } from '../zipGenerator'
import { existsSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

describe('ZipGenerator', () => {
  let zipGenerator: ZipGenerator
  const testDir = 'temp/test-zip'

  beforeEach(() => {
    zipGenerator = new ZipGenerator()
  })

  afterEach(() => {
    // Limpiar archivos de prueba
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('createMetadata', () => {
    it('should create metadata with correct structure', () => {
      const totalRecords = { users: 10, budgets: 20, quotas: 30, interests: 5 }
      const fileSize = 1024

      const metadata = zipGenerator.createMetadata(totalRecords, fileSize)

      expect(metadata).toHaveProperty('exportDate')
      expect(metadata).toHaveProperty('totalRecords')
      expect(metadata).toHaveProperty('fileSize')
      expect(metadata).toHaveProperty('version')
      expect(metadata.totalRecords).toEqual(totalRecords)
      expect(metadata.fileSize).toBe(fileSize)
      expect(metadata.version).toBe('1.0.0')
    })
  })

  describe('calculateTotalSize', () => {
    it('should calculate total size of files', async () => {
      mkdirSync(testDir, { recursive: true })

      const file1 = join(testDir, 'test1.txt')
      const file2 = join(testDir, 'test2.txt')
      const content1 = 'Hello World'
      const content2 = 'Test Content'

      writeFileSync(file1, content1)
      writeFileSync(file2, content2)

      const totalSize = await zipGenerator.calculateTotalSize([file1, file2])

      expect(totalSize).toBe(content1.length + content2.length)
    })

    it('should handle non-existent files gracefully', async () => {
      const totalSize = await zipGenerator.calculateTotalSize(['non-existent.txt'])
      expect(totalSize).toBe(0)
    })
  })

  describe('validateFiles', () => {
    it('should return true for existing files', async () => {
      mkdirSync(testDir, { recursive: true })

      const file1 = join(testDir, 'test1.txt')
      writeFileSync(file1, 'content')

      const isValid = await zipGenerator.validateFiles([file1])
      expect(isValid).toBe(true)
    })

    it('should return false for non-existing files', async () => {
      const isValid = await zipGenerator.validateFiles(['non-existent.txt'])
      expect(isValid).toBe(false)
    })
  })

  describe('getFilesInfo', () => {
    it('should return correct file information', async () => {
      mkdirSync(testDir, { recursive: true })

      const file1 = join(testDir, 'test1.txt')
      const content = 'test content'
      writeFileSync(file1, content)

      const filesInfo = await zipGenerator.getFilesInfo([file1])

      expect(filesInfo).toHaveLength(1)
      expect(filesInfo[0].path).toBe(file1)
      expect(filesInfo[0].name).toBe('test1.txt')
      expect(filesInfo[0].size).toBe(content.length)
      expect(filesInfo[0].exists).toBe(true)
    })

    it('should handle non-existing files', async () => {
      const filesInfo = await zipGenerator.getFilesInfo(['non-existent.txt'])

      expect(filesInfo).toHaveLength(1)
      expect(filesInfo[0].exists).toBe(false)
      expect(filesInfo[0].size).toBe(0)
    })
  })

  describe('createZip', () => {
    it('should create zip file with multiple files', async () => {
      mkdirSync(testDir, { recursive: true })

      const file1 = join(testDir, 'test1.csv')
      const file2 = join(testDir, 'test2.csv')
      const zipPath = join(testDir, 'test.zip')

      writeFileSync(file1, 'id,name\n1,John')
      writeFileSync(file2, 'id,amount\n1,100')

      const resultPath = await zipGenerator.createZip([file1, file2], zipPath)

      expect(resultPath).toBe(zipPath)
      expect(existsSync(zipPath)).toBe(true)
    })
  })
})
