# Sistema de Importación de CSV - Documentación

## Introducción

El Sistema de Importación de CSV es un componente integral del proyecto Sistema Nova que proporciona capacidades completas de restauración de datos desde archivos CSV exportados previamente. Este sistema está diseñado para trabajar en perfecta armonía con el sistema de exportación existente.

## Estructura de la Documentación

### 📚 [API Documentation](./api/import-system.md)

Documentación completa de todas las APIs disponibles, incluyendo:

- Canales IPC y sus parámetros
- Tipos de datos y interfaces
- Formatos de respuesta
- Manejo de errores
- Consideraciones de seguridad

### 💡 [Ejemplos de Uso](./examples/import-usage-examples.md)

Ejemplos prácticos y casos de uso comunes:

- Restauración completa del sistema
- Importación incremental
- Migración de datos con validación estricta
- Importación con monitoreo de progreso
- Importación condicional con filtros

### 🔧 [Guía de Integración](./integration/import-system-integration.md)

Guía detallada sobre cómo integrar el sistema con la arquitectura existente:

- Arquitectura de integración
- Reutilización de componentes
- Configuración del sistema
- Puntos de extensión
- Testing de integración

### ⚡ [Referencia Rápida](./quick-reference/import-api-reference.md)

Referencia rápida para desarrolladores:

- Canales IPC disponibles
- Tipos principales
- Ejemplos de uso rápido
- Códigos de error comunes
- Formatos de archivo

## Características Principales

### ✅ Funcionalidades Implementadas

- **Importación Individual**: Por tipo de entidad (usuarios, presupuestos, cuotas, intereses)
- **Importación Completa**: Desde archivos ZIP con todos los datos
- **Validación Robusta**: Validación de formato, contenido e integridad referencial
- **Respaldos Automáticos**: Creación automática de respaldos antes de importaciones
- **Rollback Automático**: Reversión automática en caso de errores
- **Reportes Detallados**: Generación de reportes de importación y auditoría
- **Optimización de Rendimiento**: Procesamiento por lotes y streaming para archivos grandes
- **Seguridad**: Validación de archivos y sanitización de datos

### 🔒 Seguridad

- Validación de tipos de archivo permitidos
- Límites de tamaño de archivo configurables
- Sanitización de datos de entrada
- Prevención de path traversal
- Logs de auditoría completos

### ⚡ Rendimiento

- Procesamiento por lotes configurable
- Streaming para archivos grandes
- Optimizaciones de base de datos
- Métricas de rendimiento en tiempo real
- Configuración adaptativa basada en tamaño de archivo

## Integración con el Sistema Existente

El sistema se integra perfectamente con la arquitectura existente:

```
Sistema Nova
├── Controllers (Existentes + ImportController)
├── Services (Existentes + ImportService)
├── Repositories (Reutilizados)
├── Database Config (Reutilizada)
├── Entities (Reutilizadas)
└── Response Format (Reutilizado)
```

### Componentes Nuevos

- `ImportController`: Controlador IPC para operaciones de importación
- `ImportService`: Servicio principal que coordina todas las operaciones
- `ImportReporter`: Generador de reportes de importación
- `DataValidator`: Validador de datos específico para importación
- `BackupManager`: Gestor de respaldos y rollback

### Componentes Reutilizados

- Todos los repositorios existentes
- Configuración de base de datos
- Entidades y modelos de datos
- Sistema de respuestas estándar
- Utilidades existentes

## Inicio Rápido

### 1. Importación Básica

```typescript
// Importar usuarios desde CSV
const result = await window.electron.ipcRenderer.invoke('import:users', '/path/to/users.csv')
console.log(`Importados: ${result.data.successfulImports} usuarios`)
```

### 2. Importación Completa

```typescript
// Importar todos los datos desde ZIP
const result = await window.electron.ipcRenderer.invoke('import:complete', '/path/to/backup.zip')
console.log(`Importación ${result.data.overallSuccess ? 'exitosa' : 'con errores'}`)
```

### 3. Validación Previa

```typescript
// Validar archivo antes de importar
const validation = await window.electron.ipcRenderer.invoke(
  'import:validate-csv',
  filePath,
  'users'
)
if (validation.data.isValid) {
  // Proceder con importación
}
```

## Requisitos del Sistema

### Dependencias

- Node.js 16+
- Electron 13+
- TypeScript 4.5+
- SQLite3 (via better-sqlite3)
- TypeORM 0.3+

### Archivos Requeridos

- `csv-parser`: Para parsing de archivos CSV
- `yauzl`: Para extracción de archivos ZIP
- Todas las dependencias existentes del proyecto

## Estado del Proyecto

### ✅ Completado

- [x] Estructura base y utilidades de parsing
- [x] Sistema de validación de datos
- [x] Sistema de respaldo y rollback
- [x] Importadores específicos por entidad
- [x] ImportService principal
- [x] Sistema de reportes
- [x] Sistema de configuración y optimización
- [x] Validaciones de seguridad
- [x] **Integración con sistema existente**
- [x] **Documentación de API**
- [x] **Ejemplos de uso**

### 🔄 Pendiente

- [ ] Suite completa de pruebas unitarias
- [ ] Pruebas de integración
- [ ] Testing end-to-end

## Contribución

Para contribuir al sistema de importación:

1. Revise la [Guía de Integración](./integration/import-system-integration.md)
2. Consulte los [Ejemplos de Uso](./examples/import-usage-examples.md)
3. Use la [Referencia Rápida](./quick-reference/import-api-reference.md) para desarrollo
4. Siga los patrones establecidos en el código existente

## Soporte

Para soporte técnico o preguntas sobre el sistema:

1. Consulte la documentación completa
2. Revise los ejemplos de uso común
3. Verifique los códigos de error en la referencia rápida
4. Consulte los logs de importación para diagnóstico

## Licencia

Este sistema forma parte del proyecto Sistema Nova y está sujeto a la misma licencia del proyecto principal.
