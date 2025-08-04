import { describe, it, expect, afterEach } from 'vitest'
import { CsvGenerator, ZipGenerator, FileUtils } from '../index'
import { existsSync, rmSync } from 'fs'

describe('Export Utilities Integration', () => {
    const testDir = 'temp/integration-test'

    afterEach(() => {
        // Limpiar archivos de prueba
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true })
        }
    })

    it('should work together to create CSV and ZIP files', async () => {
        // 1. Crear datos de prueba
        const testData = [
            { id: 1, name: 'John Doe', email: 'john@example.com', createdAt: new Date('2025-01-01') },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date('2025-01-02') }
        ]
        const headers = ['id', 'name', 'email', 'createdAt']

        // 2. Generar CSV usando CsvGenerator
        const csvGenerator = new CsvGenerator()
        const csvPath = await csvGenerator.generateCSV(testData, headers, 'users', testDir)

        // 3. Verificar que el CSV se creó correctamente
        expect(FileUtils.fileExists(csvPath)).toBe(true)
        expect(FileUtils.getFileSize(csvPath)).toBeGreaterThan(0)

        // 4. Crear ZIP usando ZipGenerator
        const zipGenerator = new ZipGenerator()
        const zipPath = FileUtils.generateTempFilePath('export', 'zip', testDir)
        const resultZipPath = await zipGenerator.createZip([csvPath], zipPath)

        // 5. Verificar que el ZIP se creó correctamente
        expect(FileUtils.fileExists(resultZipPath)).toBe(true)
        expect(FileUtils.getFileSize(resultZipPath)).toBeGreaterThan(0)

        // 6. Obtener estadísticas
        const csvStats = csvGenerator.getCSVStats(testData, headers)
        expect(csvStats.rows).toBe(3) // 2 data rows + 1 header
        expect(csvStats.columns).toBe(4)

        // 7. Crear metadatos
        const metadata = zipGenerator.createMetadata(
            { users: testData.length, budgets: 0, quotas: 0, interests: 0 },
            FileUtils.getFileSize(resultZipPath)
        )
        expect(metadata.totalRecords.users).toBe(2)

        // 8. Limpiar archivos
        const deletedCount = await FileUtils.deleteFiles([csvPath, resultZipPath])
        expect(deletedCount).toBe(2)
    })

    it('should handle CSV with special characters and create valid ZIP', async () => {
        const testData = [
            { id: 1, name: 'José María', comment: 'Dice "Hola, mundo"' },
            { id: 2, name: 'François', comment: 'come trabas como embape!' }
        ]
        const headers = ['id', 'name', 'comment']

        const csvGenerator = new CsvGenerator()
        const csvPath = await csvGenerator.generateCSV(testData, headers, 'special-chars', testDir)

    // Verificar que el archivo CSV maneja correctamente los caracteres especiales
        expect(FileUtils.fileExists(csvPath)).toBe(true)

        const zipGenerator = new ZipGenerator()
        const zipPath = FileUtils.generateTempFilePath('special-export', 'zip', testDir)
        const resultZipPath = await zipGenerator.createZip([csvPath], zipPath)

        expect(FileUtils.fileExists(resultZipPath)).toBe(true)
    })

    it('should validate file paths for security', () => {
        // Probar validación de rutas seguras
        expect(FileUtils.isPathSafe('temp/exports/file.csv', 'temp/exports')).toBe(true)
        expect(FileUtils.isPathSafe('../../../etc/passwd', 'temp/exports')).toBe(false)
        expect(FileUtils.isPathSafe('temp/exports/../../../etc/passwd', 'temp/exports')).toBe(false)
    })
})