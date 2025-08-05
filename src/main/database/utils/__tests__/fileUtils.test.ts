import { describe, it, expect, afterEach } from 'vitest'
import { FileUtils } from '../fileUtils'
import { existsSync, writeFileSync, rmSync, mkdirSync } from 'fs'
import { join } from 'path'

describe('FileUtils', () => {
  const testDir = 'temp/test-file-utils'

  afterEach(() => {
    // Limpiar archivos de prueba
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('createTempDirectory', () => {
    it('should create temporary directory', () => {
      const dirPath = FileUtils.createTempDirectory('test-subdir')
      expect(existsSync(dirPath)).toBe(true)
    })
  })

  describe('generateTempFilePath', () => {
    it('should generate unique file paths', () => {
      const path1 = FileUtils.generateTempFilePath('test', 'csv')
      const path2 = FileUtils.generateTempFilePath('test', 'csv')

      expect(path1).not.toBe(path2)
      expect(path1.endsWith('.csv')).toBe(true)
      expect(path2.endsWith('.csv')).toBe(true)
    })
  })

  describe('fileExists', () => {
    it('should return true for existing files', () => {
      const testFile = join(testDir, 'test.txt')
      mkdirSync(testDir, { recursive: true })
      writeFileSync(testFile, 'test content')

      expect(FileUtils.fileExists(testFile)).toBe(true)
    })

    it('should return false for non-existing files', () => {
      expect(FileUtils.fileExists('non-existing-file.txt')).toBe(false)
    })
  })

  describe('getFileSize', () => {
    it('should return correct file size', () => {
      const testFile = join(testDir, 'test.txt')
      const content = 'test content'

      mkdirSync(testDir, { recursive: true })
      writeFileSync(testFile, content)

      const size = FileUtils.getFileSize(testFile)
      expect(size).toBe(content.length)
    })

    it('should return 0 for non-existing files', () => {
      expect(FileUtils.getFileSize('non-existing-file.txt')).toBe(0)
    })
  })

  describe('getFileInfo', () => {
    it('should return file information for existing files', () => {
      const testFile = join(testDir, 'test.txt')
      const content = 'test content'

      mkdirSync(testDir, { recursive: true })
      writeFileSync(testFile, content)

      const info = FileUtils.getFileInfo(testFile)

      expect(info).not.toBeNull()
      expect(info?.exists).toBe(true)
      expect(info?.size).toBe(content.length)
      expect(info?.path).toBe(testFile)
    })

    it('should return null for non-existing files', () => {
      const info = FileUtils.getFileInfo('non-existing-file.txt')
      expect(info).toBeNull()
    })
  })

  describe('isPathSafe', () => {
    it('should validate safe paths', () => {
      const safePath = join('temp/exports', 'test.csv')
      expect(FileUtils.isPathSafe(safePath, 'temp/exports')).toBe(true)
    })

    it('should reject unsafe paths', () => {
      const unsafePath = '../../../etc/passwd'
      expect(FileUtils.isPathSafe(unsafePath, 'temp/exports')).toBe(false)
    })
  })

  describe('deleteFiles', () => {
    it('should delete existing files', async () => {
      const testFile1 = join(testDir, 'test1.txt')
      const testFile2 = join(testDir, 'test2.txt')

      mkdirSync(testDir, { recursive: true })
      writeFileSync(testFile1, 'content1')
      writeFileSync(testFile2, 'content2')

      const deletedCount = await FileUtils.deleteFiles([testFile1, testFile2])

      expect(deletedCount).toBe(2)
      expect(FileUtils.fileExists(testFile1)).toBe(false)
      expect(FileUtils.fileExists(testFile2)).toBe(false)
    })
  })

  describe('getTempDirectoryStats', () => {
    it('should return directory statistics', () => {
      const stats = FileUtils.getTempDirectoryStats()

      expect(stats).toHaveProperty('exists')
      expect(stats).toHaveProperty('fileCount')
      expect(stats).toHaveProperty('totalSize')
    })
  })
})
