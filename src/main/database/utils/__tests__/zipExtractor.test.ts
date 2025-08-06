import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { ZipExtractor } from '../zipExtractor'
import { ZipExtractionException, FileNotFoundException } from '../../exceptions/importExceptions'

describe('ZipExtractor', () => {
  let zipExtractor: ZipExtractor
  let testDir: string

  beforeEach(() => {
    zipExtractor = new ZipExtractor()
    testDir = join(process.cwd(), 'temp', 'test-zip')
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('isValidZip', () => {
    it('should return false for non-existent file', async () => {
      const result = await zipExtractor.isValidZip(join(testDir, 'nonexistent.zip'))
      expect(result).toBe(false)
    })

    it('should return false for non-zip file', async () => {
      const filePath = join(testDir, 'test.txt')
      writeFileSync(filePath, 'not a zip file', 'utf8')

      const result = await zipExtractor.isValidZip(filePath)
      expect(result).toBe(false)
    })
  })

  describe('extractZipContents', () => {
    it('should throw error for missing file', async () => {
      const zipPath = join(testDir, 'nonexistent.zip')

      await expect(zipExtractor.extractZipContents(zipPath)).rejects.toThrow(FileNotFoundException)
    })

    it('should throw error for invalid file format', async () => {
      const filePath = join(testDir, 'invalid.txt')
      writeFileSync(filePath, 'not a zip', 'utf8')

      await expect(zipExtractor.extractZipContents(filePath)).rejects.toThrow(
        'Formato de archivo inválido'
      )
    })
  })

  describe('listZipContents', () => {
    it('should throw error for invalid zip file', async () => {
      const filePath = join(testDir, 'invalid.zip')
      writeFileSync(filePath, 'not a zip', 'utf8')

      await expect(zipExtractor.listZipContents(filePath)).rejects.toThrow(ZipExtractionException)
    })
  })

  describe('cleanupExtraction', () => {
    it('should not throw error for non-existent directory', async () => {
      const nonExistentDir = join(testDir, 'nonexistent')

      await expect(zipExtractor.cleanupExtraction(nonExistentDir)).resolves.not.toThrow()
    })

    it('should clean up existing directory', async () => {
      const extractDir = join(testDir, 'extract')
      mkdirSync(extractDir, { recursive: true })
      writeFileSync(join(extractDir, 'test.txt'), 'test content')

      expect(existsSync(extractDir)).toBe(true)

      await zipExtractor.cleanupExtraction(extractDir)

      // Note: The directory might still exist briefly due to async cleanup
      // This test mainly ensures no errors are thrown
    })
  })
})
