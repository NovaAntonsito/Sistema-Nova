import { describe, it, expect } from 'vitest'

describe('Export Utilities Exports', () => {
  it('should export all utilities from utils index', async () => {
    const utilsModule = await import('../index')
    
    // Verificar que todas las utilidades están exportadas
    expect(utilsModule.CsvGenerator).toBeDefined()
    expect(utilsModule.ZipGenerator).toBeDefined()
    expect(utilsModule.FileUtils).toBeDefined()
    expect(utilsModule.ExportException).toBeDefined()
    expect(utilsModule.FileWriteException).toBeDefined()
    expect(utilsModule.DataRetrievalException).toBeDefined()
    expect(utilsModule.ZipCreationException).toBeDefined()
    expect(utilsModule.FileCleanupException).toBeDefined()
  })

  it('should export all utilities from main database index', async () => {
    const databaseModule = await import('../../index')
    
    // Verificar que las utilidades están disponibles desde el índice principal
    expect(databaseModule.CsvGenerator).toBeDefined()
    expect(databaseModule.ZipGenerator).toBeDefined()
    expect(databaseModule.FileUtils).toBeDefined()
    expect(databaseModule.ExportException).toBeDefined()
  })

  it('should be able to instantiate utilities', async () => {
    const { CsvGenerator, ZipGenerator } = await import('../index')
    
    const csvGenerator = new CsvGenerator()
    const zipGenerator = new ZipGenerator()
    
    expect(csvGenerator).toBeInstanceOf(CsvGenerator)
    expect(zipGenerator).toBeInstanceOf(ZipGenerator)
    
    // Verificar que los métodos están disponibles
    expect(typeof csvGenerator.generateCSV).toBe('function')
    expect(typeof csvGenerator.escapeCSVValue).toBe('function')
    expect(typeof zipGenerator.createZip).toBe('function')
    expect(typeof zipGenerator.createMetadata).toBe('function')
  })
})