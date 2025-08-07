# Guía de Integración del Sistema de Importación

## Introducción

Esta guía explica cómo integrar el Sistema de Importación de CSV con la arquitectura existente del proyecto Sistema Nova. El sistema está diseñado para trabajar de manera transparente con los componentes existentes.

## Arquitectura de Integración

### Componentes Integrados

```
┌─────────────────────────────────────────────────────────────┐
│                    Aplicación Electron                      │
├─────────────────────────────────────────────────────────────┤
│  Renderer Process          │         Main Process           │
│  ┌─────────────────────┐   │  ┌─────────────────────────┐   │
│  │   React Frontend    │   │  │   ImportController      │   │
│  │                     │   │  │                         │   │
│  │  - Import UI        │◄──┼──┤  - IPC Handlers         │   │
│  │  - Progress Display │   │  │  - Error Handling       │   │
│  │  - File Selection   │   │  │  - Response Formatting  │   │
│  └─────────────────────┘   │  └─────────────────────────┘   │
│                             │              │                │
│                             │              ▼                │
│                             │  ┌─────────────────────────┐   │
│                             │  │    ImportService        │   │
│                             │  │                         │   │
│                             │  │  - Business Logic       │   │
│                             │  │  - Coordination         │   │
│                             │  │  - Transaction Mgmt     │   │
│                             │  └─────────────────────────┘   │
│                             │              │                │
│                             │              ▼                │
│                             │  ┌─────────────────────────┐   │
│                             │  │   Existing Components   │   │
│                             │  │                         │   │
│                             │  │  - Repositories         │   │
│                             │  │  - Database Config      │   │
│                             │  │  - Entity Models        │   │
│                             │  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Integración Paso a Paso

### 1. Controlador Integrado

El `ImportController` sigue el mismo patrón que los controladores existentes:

```typescript
// src/main/database/controllers/ImportController.ts
export class ImportController {
  private importService: ImportService

  constructor() {
    this.importService = new ImportService()
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // Registra handlers IPC siguiendo el patrón existente
    ipcMain.handle('import:complete', async (_, zipFilePath: string) => {
      try {
        const result = await this.importService.importFromZip(zipFilePath)
        return ResponseFormatter.success(result, 'Importación completada')
      } catch (error) {
        return ResponseFormatter.error(error as Error)
      }
    })
  }
}
```

### 2. Integración con ControllerManager

````typescript
// src/main/database/controllers/index.ts
export class ControllerManager {
  private importController: ImportController | null = null

  constructor() {
    // ... otros controladores
    this.importController = new ImportController()
  }

  public cleanup(): void {
    // ... cleanup de otros controladores
    if (this.importController) {
      this.importController.cleanup()
    }
  }
}
```### 3
. Reutilización de Componentes Existentes

El sistema reutiliza componentes existentes para mantener consistencia:

```typescript
// Repositorios existentes
import { UserRepository, BudgetRepository, QuotaRepository, InterestRepository } from '../repositories'

// Configuración de base de datos existente
import { AppDataSource } from '../config/database'

// Formato de respuesta estándar
import { ResponseFormatter, ApiResponse } from '../responses'

// Tipos y entidades existentes
import { User, Budget, Quota, Interest } from '../entities'
````

### 4. Integración con el Frontend

#### Preload Script (si es necesario)

```typescript
// src/preload/index.ts
const api = {
  // APIs de importación
  importUsers: (filePath: string) => ipcRenderer.invoke('import:users', filePath),
  importComplete: (zipPath: string) => ipcRenderer.invoke('import:complete', zipPath),
  validateCSV: (filePath: string, type: string) =>
    ipcRenderer.invoke('import:validate-csv', filePath, type)
  // ... más APIs
}
```

#### Componente React de Ejemplo

```typescript
// src/renderer/src/components/ImportManager.tsx
import React, { useState } from 'react'

export const ImportManager: React.FC = () => {
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleImportComplete = async (zipFile: File) => {
    setImporting(true)
    try {
      const result = await window.electron.ipcRenderer.invoke('import:complete', zipFile.path)
      if (result.success) {
        console.log('Importación exitosa:', result.data)
      } else {
        console.error('Error en importación:', result.error)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <h2>Importar Datos</h2>
      <input
        type="file"
        accept=".zip"
        onChange={(e) => e.target.files?.[0] && handleImportComplete(e.target.files[0])}
        disabled={importing}
      />
      {importing && <div>Importando... {progress}%</div>}
    </div>
  )
}
```

## Configuración del Sistema

### Variables de Entorno

```env
# .env
IMPORT_TEMP_DIR=./temp/imports
IMPORT_MAX_FILE_SIZE=52428800
IMPORT_BATCH_SIZE=1000
IMPORT_BACKUP_RETENTION_DAYS=30
```

### Configuración de TypeScript

```json
// tsconfig.json - Ya configurado en el proyecto
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true
  }
}
```

## Flujo de Datos

### 1. Importación Completa

```
Usuario → Frontend → IPC → ImportController → ImportService → Repositorios → Base de Datos
                                    ↓
                            BackupManager (Respaldo)
                                    ↓
                            ImportReporter (Reportes)
```

### 2. Validación de Archivos

```
Archivo → SecurityValidationService → CsvParser → DataValidator → ValidationResult
```

### 3. Manejo de Errores

```
Error → ImportException → ImportController → ResponseFormatter → Frontend
                ↓
        BackupManager (Rollback automático)
```

## Puntos de Extensión

### 1. Nuevos Tipos de Entidad

Para agregar soporte para nuevas entidades:

```typescript
// 1. Crear importador específico
export class NewEntityImporter extends BaseImporter<NewEntity> {
  // Implementar lógica específica
}

// 2. Agregar al ImportService
private newEntityImporter: NewEntityImporter

// 3. Agregar método público
async importNewEntityFromCSV(filePath: string): Promise<ImportResult> {
  return await this.newEntityImporter.importFromCSV(filePath)
}

// 4. Agregar handler en ImportController
ipcMain.handle('import:new-entity', async (_, filePath: string) => {
  // Handler implementation
})
```

### 2. Validaciones Personalizadas

```typescript
// Extender DataValidator
export class CustomDataValidator extends DataValidator {
  async validateCustomRules(data: any[]): Promise<ValidationResult> {
    // Implementar validaciones personalizadas
  }
}
```

### 3. Formatos de Archivo Adicionales

```typescript
// Crear nuevo parser
export class ExcelParser implements FileParser {
  async parseFile(filePath: string): Promise<ParseResult> {
    // Implementar parsing de Excel
  }
}
```

## Monitoreo y Logging

### Integración con Sistema de Logs Existente

```typescript
// src/main/database/utils/importLogger.ts
export class ImportLogger {
  static logImportStart(importId: string, type: string): void {
    console.log(`[IMPORT-${importId}] Iniciando importación de ${type}`)
  }

  static logImportComplete(importId: string, result: ImportResult): void {
    console.log(
      `[IMPORT-${importId}] Completado: ${result.successfulImports} exitosos, ${result.failedImports} fallidos`
    )
  }

  static logError(importId: string, error: Error): void {
    console.error(`[IMPORT-${importId}] Error:`, error)
  }
}
```

## Testing de Integración

### Configuración de Pruebas

```typescript
// tests/integration/import.test.ts
import { ImportService } from '../../src/main/database/services/ImportService'
import { testDatabase } from '../setup/database'

describe('Import Integration Tests', () => {
  let importService: ImportService

  beforeEach(async () => {
    await testDatabase.initialize()
    importService = new ImportService()
  })

  it('should integrate with existing repositories', async () => {
    // Test integration
  })
})
```

## Migración y Compatibilidad

### Migración desde Versiones Anteriores

```typescript
// src/main/database/migrations/import-system-migration.ts
export class ImportSystemMigration {
  async migrate(): Promise<void> {
    // Migrar configuraciones existentes
    // Actualizar esquemas de base de datos si es necesario
    // Migrar archivos de configuración
  }
}
```

### Compatibilidad con Exportaciones Existentes

El sistema está diseñado para ser compatible con el formato de exportación existente:

```typescript
// Formato compatible con ExportService
interface ExportedData {
  users: UserExportData[]
  budgets: BudgetExportData[]
  quotas: QuotaExportData[]
  interests: InterestExportData[]
}
```

## Consideraciones de Rendimiento

### Optimizaciones Aplicadas

1. **Reutilización de Conexiones**: Usa el AppDataSource existente
2. **Transacciones Eficientes**: Integra con el sistema de transacciones existente
3. **Memoria Compartida**: Reutiliza instancias de repositorios
4. **Cache de Configuración**: Usa el sistema de configuración existente

### Métricas de Rendimiento

```typescript
// Integración con métricas existentes
const metrics = await importService.getPerformanceMetrics()
console.log('Rendimiento de importación:', {
  recordsPerSecond: metrics.recordsPerSecond,
  memoryUsage: metrics.memoryUsage,
  databaseConnections: metrics.databaseConnections
})
```

## Seguridad

### Integración con Seguridad Existente

- Reutiliza validaciones de seguridad existentes
- Integra con el sistema de permisos actual
- Mantiene logs de auditoría consistentes

### Validaciones de Seguridad Específicas

```typescript
// Validaciones adicionales para importación
export class ImportSecurityValidator {
  async validateImportPermissions(userId: string): Promise<boolean> {
    // Verificar permisos de importación
  }

  async validateFileIntegrity(filePath: string): Promise<boolean> {
    // Verificar integridad del archivo
  }
}
```

## Conclusión

El Sistema de Importación se integra de manera transparente con la arquitectura existente, siguiendo los patrones establecidos y reutilizando componentes existentes. Esta integración garantiza:

- **Consistencia**: Mismo patrón que otros controladores
- **Reutilización**: Aprovecha componentes existentes
- **Mantenibilidad**: Código organizado y bien estructurado
- **Escalabilidad**: Fácil extensión para nuevas funcionalidades
- **Compatibilidad**: Funciona con el sistema de exportación existente

La implementación está lista para uso en producción y puede ser extendida según las necesidades futuras del proyecto.
