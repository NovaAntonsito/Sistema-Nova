# Sistema de Importación de CSV - Documentación de API

## Introducción

El Sistema de Importación de CSV proporciona capacidades completas para restaurar datos del sistema desde archivos CSV exportados previamente. Este sistema está diseñado para trabajar en conjunto con el sistema de exportación existente, garantizando la continuidad del negocio y la recuperación ante desastres.

## Arquitectura

El sistema sigue una arquitectura modular con los siguientes componentes principales:

- **ImportController**: Controlador principal que expone las APIs IPC
- **ImportService**: Servicio principal que coordina todas las operaciones
- **Importadores específicos**: UserImporter, BudgetImporter, QuotaImporter, InterestImporter
- **Utilidades**: CsvParser, DataValidator, BackupManager, ImportReporter
- **Seguridad**: SecurityValidationService para validación de archivos

## APIs Disponibles

### 1. Importación Individual por Entidad

#### Importar Usuarios

```typescript
// IPC Channel: 'import:users'
const result = await window.electron.ipcRenderer.invoke('import:users', filePath)

// Parámetros:
// - filePath: string - Ruta del archivo users.csv

// Respuesta: ApiResponse<ImportResult>
interface ImportResult {
  entityType: EntityType
  totalRecords: number
  successfulImports: number
  failedImports: number
  updatedRecords: number
  createdRecords: number
  errors: ImportError[]
  warnings: ImportWarning[]
  duration: number
}
```

#### Importar Presupuestos

```typescript
// IPC Channel: 'import:budgets'
const result = await window.electron.ipcRenderer.invoke('import:budgets', filePath)

// Parámetros:
// - filePath: string - Ruta del archivo budgets.csv

// Respuesta: ApiResponse<ImportResult>
```

#### Importar Cuotas

```typescript
// IPC Channel: 'import:quotas'
const result = await window.electron.ipcRenderer.invoke('import:quotas', filePath)

// Parámetros:
// - filePath: string - Ruta del archivo quotas.csv

// Respuesta: ApiResponse<ImportResult>
```

#### Importar Configuraciones de Interés

```typescript
// IPC Channel: 'import:interests'
const result = await window.electron.ipcRenderer.invoke('import:interests', filePath)

// Parámetros:
// - filePath: string - Ruta del archivo interests.csv

// Respuesta: ApiResponse<ImportResult>
```

### 2. Importación Completa desde ZIP

```typescript
// IPC Channel: 'import:complete'
const result = await window.electron.ipcRenderer.invoke('import:complete', zipFilePath)

// Parámetros:
// - zipFilePath: string - Ruta del archivo ZIP con todos los CSVs

// Respuesta: ApiResponse<CompleteImportResult>
interface CompleteImportResult {
  importId: string
  overallSuccess: boolean
  results: ImportResult[]
  backupId: string
  totalDuration: number
  report: ImportReport
}
```

### 3. Validación de Archivos

#### Validar Archivo CSV

```typescript
// IPC Channel: 'import:validate-csv'
const result = await window.electron.ipcRenderer.invoke('import:validate-csv', filePath, entityType)

// Parámetros:
// - filePath: string - Ruta del archivo CSV
// - entityType: EntityType - Tipo de entidad ('users', 'budgets', 'quotas', 'interests')

// Respuesta: ApiResponse<ValidationResult>
interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}
```

#### Validar Archivo ZIP

```typescript
// IPC Channel: 'import:validate-zip'
const result = await window.electron.ipcRenderer.invoke('import:validate-zip', zipFilePath)

// Parámetros:
// - zipFilePath: string - Ruta del archivo ZIP

// Respuesta: ApiResponse<ValidationResult>
```

### 4. Gestión de Respaldos

#### Crear Respaldo

```typescript
// IPC Channel: 'import:create-backup'
const result = await window.electron.ipcRenderer.invoke('import:create-backup', description)

// Parámetros:
// - description?: string - Descripción opcional del respaldo

// Respuesta: ApiResponse<string> - ID del respaldo creado
```

#### Realizar Rollback

```typescript
// IPC Channel: 'import:rollback'
const result = await window.electron.ipcRenderer.invoke('import:rollback', backupId)

// Parámetros:
// - backupId: string - ID del respaldo al cual revertir

// Respuesta: ApiResponse<void>
```

### 5. Configuración del Sistema

#### Obtener Configuración

```typescript
// IPC Channel: 'import:get-config'
const result = await window.electron.ipcRenderer.invoke('import:get-config')

// Respuesta: ApiResponse<ImportConfig>
interface ImportConfig {
  batchSize: number
  maxFileSize: number
  backupRetentionDays: number
  tempDirectory: string
  enableAutoRollback: boolean
  validationLevel: 'strict' | 'lenient'
  // ... más opciones de configuración
}
```

#### Actualizar Configuración

```typescript
// IPC Channel: 'import:update-config'
const result = await window.electron.ipcRenderer.invoke('import:update-config', updates)

// Parámetros:
// - updates: Partial<ImportConfig> - Actualizaciones parciales de configuración

// Respuesta: ApiResponse<void>
```

### 6. Métricas de Rendimiento

```typescript
// IPC Channel: 'import:get-metrics'
const result = await window.electron.ipcRenderer.invoke('import:get-metrics')

// Respuesta: ApiResponse<PerformanceMetrics>
interface PerformanceMetrics {
  importId?: string
  totalDuration?: number
  totalRecords?: number
  recordsPerSecond?: number
  memoryUsage?: number
  // ... más métricas
}
```

## Tipos de Datos

### EntityType

```typescript
enum EntityType {
  USER = 'users',
  BUDGET = 'budgets',
  QUOTA = 'quotas',
  INTEREST = 'interests'
}
```

### ImportError

```typescript
interface ImportError {
  line: number
  message: string
  code: string
  field?: string
  value?: any
}
```

### ImportWarning

```typescript
interface ImportWarning {
  line: number
  message: string
  code: string
  field?: string
  value?: any
}
```

### ValidationError

```typescript
interface ValidationError {
  line: number
  field: string
  value: any
  message: string
  code: string
}
```

### ValidationWarning

```typescript
interface ValidationWarning {
  line: number
  field: string
  value: any
  message: string
  code: string
}
```

## Formatos de Archivo Esperados

### users.csv

```csv
id,nombre,email,phoneNumber,isDeleted,createdAt,updatedAt
1,Juan Pérez,juan@email.com,123456789,false,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z
```

### budgets.csv

```csv
id,_creationDate,_expirationDate,currentStatus,totalAmount,currentInterest,paymentTerm,code,userId,isDeleted,updatedAt
1,2024-01-01T00:00:00.000Z,2024-12-31T00:00:00.000Z,active,10000,5.5,12,BUD001,1,false,2024-01-01T00:00:00.000Z
```

### quotas.csv

```csv
id,_creationDate,amount,budgetId,isDeleted
1,2024-01-01T00:00:00.000Z,833.33,1,false
```

### interests.csv

```csv
id,paymentTerm,interestPercentage,isActive,createdAt,updatedAt
1,12,5.5,true,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z
```

## Manejo de Errores

El sistema utiliza una jerarquía de excepciones específicas:

- **ImportException**: Error general de importación
- **CSVParseException**: Error de parsing de CSV
- **ValidationException**: Error de validación de datos
- **ReferentialIntegrityException**: Error de integridad referencial
- **BackupException**: Error en operaciones de respaldo
- **FileNotFoundException**: Archivo no encontrado
- **ZipExtractionException**: Error en extracción de ZIP

Todas las respuestas siguen el formato estándar `ApiResponse<T>`:

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  message: string
  error?: {
    code: string
    message: string
    details?: any
  }
}
```

## Consideraciones de Seguridad

1. **Validación de Archivos**: Todos los archivos pasan por validación de seguridad antes del procesamiento
2. **Límites de Tamaño**: Se aplican límites configurables de tamaño de archivo
3. **Sanitización**: Los datos de entrada son sanitizados para prevenir inyecciones
4. **Validación de Rutas**: Se previene path traversal en la extracción de archivos ZIP
5. **Respaldos Automáticos**: Se crean respaldos automáticos antes de cada importación

## Optimizaciones de Rendimiento

- **Procesamiento por Lotes**: Para archivos medianos
- **Streaming**: Para archivos grandes (>10MB por defecto)
- **Transacciones Optimizadas**: Uso eficiente de transacciones de base de datos
- **Configuración Adaptativa**: Configuración automática basada en el tamaño del archivo
- **Métricas en Tiempo Real**: Monitoreo de rendimiento durante la importación

## Ejemplos de Uso Común

### Importación Completa con Validación Previa

```typescript
async function importCompleteData(zipFilePath: string) {
  try {
    // 1. Validar archivo ZIP
    const validation = await window.electron.ipcRenderer.invoke('import:validate-zip', zipFilePath)
    if (!validation.success || !validation.data.isValid) {
      console.error('Archivo ZIP inválido:', validation.data.errors)
      return
    }

    // 2. Crear respaldo
    const backup = await window.electron.ipcRenderer.invoke(
      'import:create-backup',
      'Antes de importación completa'
    )
    if (!backup.success) {
      console.error('Error creando respaldo:', backup.error)
      return
    }

    // 3. Realizar importación
    const result = await window.electron.ipcRenderer.invoke('import:complete', zipFilePath)
    if (result.success) {
      console.log('Importación exitosa:', result.data)
    } else {
      console.error('Error en importación:', result.error)

      // 4. Rollback en caso de error
      await window.electron.ipcRenderer.invoke('import:rollback', backup.data)
    }
  } catch (error) {
    console.error('Error inesperado:', error)
  }
}
```

### Importación Individual con Manejo de Errores

```typescript
async function importUsers(filePath: string) {
  try {
    // 1. Validar archivo CSV
    const validation = await window.electron.ipcRenderer.invoke(
      'import:validate-csv',
      filePath,
      'users'
    )
    if (!validation.success || !validation.data.isValid) {
      console.error('Errores de validación:', validation.data.errors)
      return
    }

    // 2. Importar usuarios
    const result = await window.electron.ipcRenderer.invoke('import:users', filePath)
    if (result.success) {
      console.log(`Importados ${result.data.successfulImports} usuarios exitosamente`)
      if (result.data.errors.length > 0) {
        console.warn('Errores durante la importación:', result.data.errors)
      }
    } else {
      console.error('Error en importación:', result.error)
    }
  } catch (error) {
    console.error('Error inesperado:', error)
  }
}
```

### Configuración Personalizada

```typescript
async function configureImportSystem() {
  // Obtener configuración actual
  const currentConfig = await window.electron.ipcRenderer.invoke('import:get-config')

  // Actualizar configuración
  const updates = {
    batchSize: 2000,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    enableAutoRollback: true,
    validationLevel: 'strict' as const
  }

  await window.electron.ipcRenderer.invoke('import:update-config', updates)
  console.log('Configuración actualizada')
}
```

## Integración con el Sistema Existente

El sistema de importación se integra perfectamente con la arquitectura existente:

1. **Controladores**: Sigue el mismo patrón que ExportController
2. **IPC**: Utiliza el mismo sistema de comunicación IPC
3. **Repositorios**: Reutiliza los repositorios existentes
4. **Tipos**: Comparte tipos con el sistema de exportación
5. **Respuestas**: Utiliza el mismo formato de respuesta estándar

Para más información sobre la implementación interna, consulte el código fuente en `src/main/database/services/ImportService.ts`.
