# Referencia Rápida - API de Importación

## Canales IPC Disponibles

### Importación Individual

```typescript
// Usuarios
'import:users' → (filePath: string) → ApiResponse<ImportResult>

// Presupuestos
'import:budgets' → (filePath: string) → ApiResponse<ImportResult>

// Cuotas
'import:quotas' → (filePath: string) → ApiResponse<ImportResult>

// Intereses
'import:interests' → (filePath: string) → ApiResponse<ImportResult>
```

### Importación Completa

```typescript
// Desde ZIP
'import:complete' → (zipFilePath: string) → ApiResponse<CompleteImportResult>
```

### Validación

```typescript
// Validar CSV
'import:validate-csv' → (filePath: string, entityType: EntityType) → ApiResponse<ValidationResult>

// Validar ZIP
'import:validate-zip' → (zipFilePath: string) → ApiResponse<ValidationResult>
```

### Respaldos

```typescript
// Crear respaldo
'import:create-backup' → (description?: string) → ApiResponse<string>

// Rollback
'import:rollback' → (backupId: string) → ApiResponse<void>
```

### Configuración

```typescript
// Obtener configuración
'import:get-config' → () → ApiResponse<ImportConfig>

// Actualizar configuración
'import:update-config' → (updates: Partial<ImportConfig>) → ApiResponse<void>

// Obtener métricas
'import:get-metrics' → () → ApiResponse<PerformanceMetrics>
```

## Tipos Principales

### ImportResult

```typescript
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

### CompleteImportResult

```typescript
interface CompleteImportResult {
  importId: string
  overallSuccess: boolean
  results: ImportResult[]
  backupId: string
  totalDuration: number
  report: ImportReport
}
```

### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}
```

## Ejemplos de Uso Rápido

### Importación Básica

```typescript
const result = await window.electron.ipcRenderer.invoke('import:users', '/path/to/users.csv')
if (result.success) {
  console.log(`Importados: ${result.data.successfulImports}`)
}
```

### Importación Completa con Validación

```typescript
// 1. Validar
const validation = await window.electron.ipcRenderer.invoke('import:validate-zip', zipPath)
if (!validation.data.isValid) return

// 2. Crear respaldo
const backup = await window.electron.ipcRenderer.invoke('import:create-backup')

// 3. Importar
const result = await window.electron.ipcRenderer.invoke('import:complete', zipPath)
```

### Configuración Rápida

```typescript
await window.electron.ipcRenderer.invoke('import:update-config', {
  batchSize: 2000,
  enableAutoRollback: true,
  validationLevel: 'strict'
})
```

## Códigos de Error Comunes

- `CSV_PARSE_ERROR`: Error parsing CSV
- `VALIDATION_ERROR`: Error de validación
- `REFERENTIAL_INTEGRITY_ERROR`: Error de integridad referencial
- `BACKUP_ERROR`: Error en respaldo
- `FILE_NOT_FOUND`: Archivo no encontrado
- `ZIP_EXTRACTION_ERROR`: Error extrayendo ZIP
- `SECURITY_ERROR`: Error de seguridad

## Formatos de Archivo

### users.csv

```csv
id,nombre,email,phoneNumber,isDeleted,createdAt,updatedAt
```

### budgets.csv

```csv
id,_creationDate,_expirationDate,currentStatus,totalAmount,currentInterest,paymentTerm,code,userId,isDeleted,updatedAt
```

### quotas.csv

```csv
id,_creationDate,amount,budgetId,isDeleted
```

### interests.csv

```csv
id,paymentTerm,interestPercentage,isActive,createdAt,updatedAt
```
