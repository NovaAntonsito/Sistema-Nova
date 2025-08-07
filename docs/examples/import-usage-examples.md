# Ejemplos de Uso del Sistema de Importación

## Introducción

Este documento proporciona ejemplos prácticos y casos de uso comunes para el Sistema de Importación de CSV. Los ejemplos están diseñados para ayudar a los desarrolladores a integrar rápidamente las funcionalidades de importación en sus aplicaciones.

## Casos de Uso Comunes

### 1. Restauración Completa del Sistema

**Escenario**: Restaurar todos los datos del sistema desde un archivo ZIP de respaldo.

```typescript
import { ImportService } from '../services/ImportService'

class SystemRestoreService {
  private importService: ImportService

  constructor() {
    this.importService = new ImportService()
  }

  /**
   * Restaura completamente el sistema desde un archivo ZIP
   */
  async restoreSystemFromBackup(zipFilePath: string): Promise<void> {
    try {
      console.log('Iniciando restauración completa del sistema...')

      // 1. Validar archivo ZIP antes de proceder
      const validation = await window.electron.ipcRenderer.invoke(
        'import:validate-zip',
        zipFilePath
      )

      if (!validation.success || !validation.data.isValid) {
        throw new Error(
          `Archivo ZIP inválido: ${validation.data.errors.map((e) => e.message).join(', ')}`
        )
      }

      // 2. Crear respaldo de seguridad antes de la restauración
      const backupResult = await window.electron.ipcRenderer.invoke(
        'import:create-backup',
        `Respaldo antes de restauración - ${new Date().toISOString()}`
      )

      if (!backupResult.success) {
        throw new Error(`Error creando respaldo: ${backupResult.error?.message}`)
      }

      const backupId = backupResult.data
      console.log(`Respaldo creado: ${backupId}`)

      // 3. Realizar importación completa
      const importResult = await window.electron.ipcRenderer.invoke('import:complete', zipFilePath)

      if (!importResult.success) {
        console.error('Error en importación, realizando rollback...')
        await window.electron.ipcRenderer.invoke('import:rollback', backupId)
        throw new Error(`Error en importación: ${importResult.error?.message}`)
      }

      // 4. Verificar resultados
      const result = importResult.data
      console.log('Restauración completada:')
      console.log(`- ID de importación: ${result.importId}`)
      console.log(`- Éxito general: ${result.overallSuccess}`)
      console.log(`- Duración total: ${result.totalDuration}ms`)

      // 5. Mostrar estadísticas por entidad
      result.results.forEach((entityResult) => {
        console.log(`${entityResult.entityType}:`)
        console.log(`  - Total: ${entityResult.totalRecords}`)
        console.log(`  - Exitosos: ${entityResult.successfulImports}`)
        console.log(`  - Fallidos: ${entityResult.failedImports}`)
        console.log(`  - Actualizados: ${entityResult.updatedRecords}`)
        console.log(`  - Creados: ${entityResult.createdRecords}`)
      })

      // 6. Reportar errores si los hay
      const totalErrors = result.results.reduce((sum, r) => sum + r.errors.length, 0)
      if (totalErrors > 0) {
        console.warn(`Se encontraron ${totalErrors} errores durante la importación`)
        result.results.forEach((entityResult) => {
          if (entityResult.errors.length > 0) {
            console.warn(`Errores en ${entityResult.entityType}:`, entityResult.errors)
          }
        })
      }
    } catch (error) {
      console.error('Error en restauración del sistema:', error)
      throw error
    }
  }
}
```

### 2. Importación Incremental de Usuarios

**Escenario**: Importar nuevos usuarios desde un archivo CSV sin afectar datos existentes.

```typescript
class UserImportService {
  /**
   * Importa usuarios de forma incremental con validación previa
   */
  async importUsersIncremental(csvFilePath: string): Promise<void> {
    try {
      console.log('Iniciando importación incremental de usuarios...')

      // 1. Validar formato y contenido del archivo
      const validation = await window.electron.ipcRenderer.invoke(
        'import:validate-csv',
        csvFilePath,
        'users'
      )

      if (!validation.success || !validation.data.isValid) {
        console.error('Errores de validación encontrados:')
        validation.data.errors.forEach((error) => {
          console.error(`Línea ${error.line}: ${error.message}`)
        })
        throw new Error('Archivo CSV inválido')
      }

      // 2. Mostrar advertencias si las hay
      if (validation.data.warnings.length > 0) {
        console.warn('Advertencias encontradas:')
        validation.data.warnings.forEach((warning) => {
          console.warn(`Línea ${warning.line}: ${warning.message}`)
        })
      }

      // 3. Crear respaldo antes de la importación
      const backupResult = await window.electron.ipcRenderer.invoke(
        'import:create-backup',
        'Respaldo antes de importación incremental de usuarios'
      )

      if (!backupResult.success) {
        throw new Error(`Error creando respaldo: ${backupResult.error?.message}`)
      }

      // 4. Realizar importación
      const importResult = await window.electron.ipcRenderer.invoke('import:users', csvFilePath)

      if (!importResult.success) {
        console.error('Error en importación, realizando rollback...')
        await window.electron.ipcRenderer.invoke('import:rollback', backupResult.data)
        throw new Error(`Error importando usuarios: ${importResult.error?.message}`)
      }

      // 5. Procesar resultados
      const result = importResult.data
      console.log('Importación de usuarios completada:')
      console.log(`- Total de registros procesados: ${result.totalRecords}`)
      console.log(`- Usuarios creados: ${result.createdRecords}`)
      console.log(`- Usuarios actualizados: ${result.updatedRecords}`)
      console.log(`- Importaciones exitosas: ${result.successfulImports}`)
      console.log(`- Importaciones fallidas: ${result.failedImports}`)
      console.log(`- Duración: ${result.duration}ms`)

      // 6. Reportar errores específicos
      if (result.errors.length > 0) {
        console.warn('Errores encontrados durante la importación:')
        result.errors.forEach((error) => {
          console.warn(`Línea ${error.line}: ${error.message} (Código: ${error.code})`)
        })
      }

      // 7. Reportar advertencias
      if (result.warnings.length > 0) {
        console.info('Advertencias durante la importación:')
        result.warnings.forEach((warning) => {
          console.info(`Línea ${warning.line}: ${warning.message}`)
        })
      }
    } catch (error) {
      console.error('Error en importación incremental de usuarios:', error)
      throw error
    }
  }
}
```

### 3. Migración de Datos con Validación Estricta

**Escenario**: Migrar datos desde un sistema externo con validación estricta y manejo de errores detallado.

```typescript
class DataMigrationService {
  /**
   * Migra datos con validación estricta y reporte detallado
   */
  async migrateDataWithStrictValidation(files: {
    users: string
    interests: string
    budgets: string
    quotas: string
  }): Promise<void> {
    const migrationReport = {
      startTime: new Date(),
      results: [] as any[],
      errors: [] as any[],
      backupId: ''
    }

    try {
      console.log('Iniciando migración de datos con validación estricta...')

      // 1. Configurar validación estricta
      await window.electron.ipcRenderer.invoke('import:update-config', {
        validationLevel: 'strict',
        enableAutoRollback: true,
        batchSize: 500 // Lotes más pequeños para mejor control
      })

      // 2. Crear respaldo antes de la migración
      const backupResult = await window.electron.ipcRenderer.invoke(
        'import:create-backup',
        `Migración de datos - ${migrationReport.startTime.toISOString()}`
      )

      if (!backupResult.success) {
        throw new Error(`Error creando respaldo: ${backupResult.error?.message}`)
      }

      migrationReport.backupId = backupResult.data
      console.log(`Respaldo creado: ${migrationReport.backupId}`)

      // 3. Validar todos los archivos antes de importar
      const validationPromises = [
        { type: 'users', file: files.users },
        { type: 'interests', file: files.interests },
        { type: 'budgets', file: files.budgets },
        { type: 'quotas', file: files.quotas }
      ].map(async ({ type, file }) => {
        const validation = await window.electron.ipcRenderer.invoke(
          'import:validate-csv',
          file,
          type
        )
        return { type, file, validation: validation.data }
      })

      const validations = await Promise.all(validationPromises)

      // 4. Verificar que todos los archivos sean válidos
      const invalidFiles = validations.filter((v) => !v.validation.isValid)
      if (invalidFiles.length > 0) {
        console.error('Archivos inválidos encontrados:')
        invalidFiles.forEach(({ type, validation }) => {
          console.error(`${type}:`)
          validation.errors.forEach((error) => {
            console.error(`  Línea ${error.line}: ${error.message}`)
          })
        })
        throw new Error('Validación fallida - archivos inválidos')
      }

      // 5. Importar en orden correcto (respetando dependencias)
      const importOrder = [
        { type: 'users', file: files.users, channel: 'import:users' },
        { type: 'interests', file: files.interests, channel: 'import:interests' },
        { type: 'budgets', file: files.budgets, channel: 'import:budgets' },
        { type: 'quotas', file: files.quotas, channel: 'import:quotas' }
      ]

      for (const { type, file, channel } of importOrder) {
        console.log(`Importando ${type}...`)

        const importResult = await window.electron.ipcRenderer.invoke(channel, file)

        if (!importResult.success) {
          migrationReport.errors.push({
            entity: type,
            error: importResult.error?.message,
            timestamp: new Date()
          })
          throw new Error(`Error importando ${type}: ${importResult.error?.message}`)
        }

        migrationReport.results.push({
          entity: type,
          result: importResult.data,
          timestamp: new Date()
        })

        console.log(
          `${type} importado exitosamente: ${importResult.data.successfulImports} registros`
        )
      }

      // 6. Generar reporte final
      migrationReport.endTime = new Date()
      await this.generateMigrationReport(migrationReport)

      console.log('Migración completada exitosamente')
    } catch (error) {
      console.error('Error en migración, realizando rollback...')

      if (migrationReport.backupId) {
        try {
          await window.electron.ipcRenderer.invoke('import:rollback', migrationReport.backupId)
          console.log('Rollback completado exitosamente')
        } catch (rollbackError) {
          console.error('Error en rollback:', rollbackError)
        }
      }

      migrationReport.errors.push({
        entity: 'migration',
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date()
      })

      await this.generateMigrationReport(migrationReport)
      throw error
    }
  }

  private async generateMigrationReport(report: any): Promise<void> {
    const reportContent = {
      migration: {
        startTime: report.startTime,
        endTime: report.endTime || new Date(),
        duration: report.endTime ? report.endTime.getTime() - report.startTime.getTime() : null,
        backupId: report.backupId
      },
      results: report.results,
      errors: report.errors,
      summary: {
        totalEntities: report.results.length,
        successfulEntities: report.results.filter((r) => r.result.errors.length === 0).length,
        totalRecords: report.results.reduce((sum, r) => sum + r.result.totalRecords, 0),
        successfulRecords: report.results.reduce((sum, r) => sum + r.result.successfulImports, 0),
        failedRecords: report.results.reduce((sum, r) => sum + r.result.failedImports, 0)
      }
    }

    console.log('Reporte de migración:', JSON.stringify(reportContent, null, 2))
  }
}
```

### 4. Importación con Monitoreo de Progreso

**Escenario**: Importar archivos grandes con monitoreo de progreso en tiempo real.

```typescript
class ProgressAwareImportService {
  private progressCallback?: (progress: any) => void

  setProgressCallback(callback: (progress: any) => void): void {
    this.progressCallback = callback
  }

  /**
   * Importa datos con monitoreo de progreso
   */
  async importWithProgress(zipFilePath: string): Promise<void> {
    try {
      console.log('Iniciando importación con monitoreo de progreso...')

      // 1. Configurar para habilitar reporte de progreso
      await window.electron.ipcRenderer.invoke('import:update-config', {
        enableProgressReporting: true,
        progressReportInterval: 1000, // Cada segundo
        enablePerformanceMetrics: true
      })

      // 2. Validar archivo
      const validation = await window.electron.ipcRenderer.invoke(
        'import:validate-zip',
        zipFilePath
      )
      if (!validation.success || !validation.data.isValid) {
        throw new Error('Archivo ZIP inválido')
      }

      // 3. Crear respaldo
      const backupResult = await window.electron.ipcRenderer.invoke('import:create-backup')
      if (!backupResult.success) {
        throw new Error('Error creando respaldo')
      }

      // 4. Iniciar importación
      this.reportProgress({ phase: 'starting', progress: 0 })

      const importResult = await window.electron.ipcRenderer.invoke('import:complete', zipFilePath)

      if (!importResult.success) {
        this.reportProgress({ phase: 'error', progress: 0, error: importResult.error?.message })
        await window.electron.ipcRenderer.invoke('import:rollback', backupResult.data)
        throw new Error(`Error en importación: ${importResult.error?.message}`)
      }

      // 5. Obtener métricas finales
      const metricsResult = await window.electron.ipcRenderer.invoke('import:get-metrics')
      if (metricsResult.success) {
        this.reportProgress({
          phase: 'completed',
          progress: 100,
          metrics: metricsResult.data,
          result: importResult.data
        })
      }

      console.log('Importación completada con éxito')
    } catch (error) {
      this.reportProgress({
        phase: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Error desconocido'
      })
      throw error
    }
  }

  private reportProgress(progress: any): void {
    if (this.progressCallback) {
      this.progressCallback(progress)
    }
    console.log('Progreso:', progress)
  }
}

// Ejemplo de uso
const importService = new ProgressAwareImportService()

importService.setProgressCallback((progress) => {
  switch (progress.phase) {
    case 'starting':
      console.log('Iniciando importación...')
      break
    case 'processing':
      console.log(`Procesando: ${progress.progress}% - ${progress.currentEntity}`)
      break
    case 'completed':
      console.log('Importación completada')
      console.log('Métricas:', progress.metrics)
      break
    case 'error':
      console.error('Error en importación:', progress.error)
      break
  }
})

// Usar el servicio
await importService.importWithProgress('/path/to/backup.zip')
```

### 5. Importación Condicional con Filtros

**Escenario**: Importar solo ciertos registros basados en criterios específicos.

```typescript
class ConditionalImportService {
  /**
   * Importa usuarios con filtros específicos
   */
  async importUsersWithFilters(
    csvFilePath: string,
    filters: {
      onlyActive?: boolean
      emailDomains?: string[]
      createdAfter?: Date
    }
  ): Promise<void> {
    try {
      console.log('Iniciando importación condicional de usuarios...')

      // 1. Validar archivo
      const validation = await window.electron.ipcRenderer.invoke(
        'import:validate-csv',
        csvFilePath,
        'users'
      )
      if (!validation.success || !validation.data.isValid) {
        throw new Error('Archivo CSV inválido')
      }

      // 2. Configurar validación personalizada si es necesario
      if (filters.onlyActive) {
        await window.electron.ipcRenderer.invoke('import:update-config', {
          validationLevel: 'strict'
        })
      }

      // 3. Crear respaldo
      const backupResult = await window.electron.ipcRenderer.invoke(
        'import:create-backup',
        'Importación condicional de usuarios'
      )
      if (!backupResult.success) {
        throw new Error('Error creando respaldo')
      }

      // 4. Realizar importación
      const importResult = await window.electron.ipcRenderer.invoke('import:users', csvFilePath)

      if (!importResult.success) {
        await window.electron.ipcRenderer.invoke('import:rollback', backupResult.data)
        throw new Error(`Error en importación: ${importResult.error?.message}`)
      }

      // 5. Procesar resultados y aplicar filtros post-importación si es necesario
      const result = importResult.data
      console.log('Importación condicional completada:')
      console.log(`- Registros procesados: ${result.totalRecords}`)
      console.log(`- Registros importados: ${result.successfulImports}`)
      console.log(`- Registros rechazados: ${result.failedImports}`)

      // 6. Reportar registros filtrados
      if (result.warnings.length > 0) {
        console.log('Registros filtrados:')
        result.warnings.forEach((warning) => {
          if (warning.code === 'FILTERED_RECORD') {
            console.log(`- Línea ${warning.line}: ${warning.message}`)
          }
        })
      }
    } catch (error) {
      console.error('Error en importación condicional:', error)
      throw error
    }
  }
}
```

## Utilidades de Apoyo

### Validador de Archivos Pre-Importación

```typescript
class ImportFileValidator {
  /**
   * Valida múltiples archivos antes de la importación
   */
  async validateImportFiles(files: { [key: string]: string }): Promise<{
    isValid: boolean
    results: { [key: string]: any }
    summary: any
  }> {
    const results: { [key: string]: any } = {}
    let totalErrors = 0
    let totalWarnings = 0

    for (const [entityType, filePath] of Object.entries(files)) {
      try {
        const validation = await window.electron.ipcRenderer.invoke(
          'import:validate-csv',
          filePath,
          entityType
        )
        results[entityType] = validation.data
        totalErrors += validation.data.errors.length
        totalWarnings += validation.data.warnings.length
      } catch (error) {
        results[entityType] = {
          isValid: false,
          errors: [
            { line: 0, message: `Error validando archivo: ${error}`, code: 'VALIDATION_ERROR' }
          ],
          warnings: []
        }
        totalErrors++
      }
    }

    return {
      isValid: totalErrors === 0,
      results,
      summary: {
        totalFiles: Object.keys(files).length,
        validFiles: Object.values(results).filter((r) => r.isValid).length,
        totalErrors,
        totalWarnings
      }
    }
  }
}
```

### Generador de Reportes de Importación

```typescript
class ImportReportGenerator {
  /**
   * Genera un reporte HTML de la importación
   */
  generateHTMLReport(importResult: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte de Importación</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .success { color: green; }
          .error { color: red; }
          .warning { color: orange; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Reporte de Importación</h1>
        <h2>Resumen</h2>
        <p><strong>ID de Importación:</strong> ${importResult.importId}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Duración:</strong> ${importResult.totalDuration}ms</p>
        <p class="${importResult.overallSuccess ? 'success' : 'error'}">
          <strong>Estado:</strong> ${importResult.overallSuccess ? 'Exitoso' : 'Con errores'}
        </p>
        
        <h2>Resultados por Entidad</h2>
        <table>
          <tr>
            <th>Entidad</th>
            <th>Total</th>
            <th>Exitosos</th>
            <th>Fallidos</th>
            <th>Creados</th>
            <th>Actualizados</th>
            <th>Errores</th>
          </tr>
          ${importResult.results
            .map(
              (result) => `
            <tr>
              <td>${result.entityType}</td>
              <td>${result.totalRecords}</td>
              <td class="success">${result.successfulImports}</td>
              <td class="error">${result.failedImports}</td>
              <td>${result.createdRecords}</td>
              <td>${result.updatedRecords}</td>
              <td>${result.errors.length}</td>
            </tr>
          `
            )
            .join('')}
        </table>
        
        ${
          importResult.results.some((r) => r.errors.length > 0)
            ? `
          <h2>Errores Detallados</h2>
          ${importResult.results
            .map((result) =>
              result.errors.length > 0
                ? `
              <h3>${result.entityType}</h3>
              <ul>
                ${result.errors
                  .map(
                    (error) => `
                  <li class="error">Línea ${error.line}: ${error.message} (${error.code})</li>
                `
                  )
                  .join('')}
              </ul>
            `
                : ''
            )
            .join('')}
        `
            : ''
        }
      </body>
      </html>
    `
  }
}
```

## Mejores Prácticas

1. **Siempre validar antes de importar**: Use las APIs de validación antes de realizar importaciones
2. **Crear respaldos**: Siempre cree respaldos antes de importaciones importantes
3. **Manejar errores apropiadamente**: Implemente manejo de errores robusto con rollback
4. **Monitorear progreso**: Use callbacks de progreso para archivos grandes
5. **Configurar apropiadamente**: Ajuste la configuración según el tamaño y tipo de datos
6. **Reportar resultados**: Genere reportes detallados para auditoría
7. **Validar integridad**: Verifique la integridad de los datos después de la importación

Estos ejemplos proporcionan una base sólida para implementar funcionalidades de importación robustas y confiables en su aplicación.
