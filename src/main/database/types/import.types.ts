/**
 * Tipos base para el sistema de importación de CSV
 * Cumple con requisitos: 1.5, 2.5, 3.5, 4.5, 5.1, 5.2
 */

/**
 * Tipos de entidades que pueden ser importadas
 */
export enum EntityType {
  USER = 'user',
  BUDGET = 'budget',
  QUOTA = 'quota',
  INTEREST = 'interest'
}

/**
 * Datos de importación para usuarios
 */
export interface UserImportData {
  id: string
  nombre: string
  email: string
  phoneNumber: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Datos de importación para presupuestos
 */
export interface BudgetImportData {
  id: string
  _creationDate: string
  _expirationDate: string
  currentStatus: string
  totalAmount: number
  currentInterest: number
  paymentTerm: number
  code: string
  userId: string
  isDeleted: boolean
  updatedAt: string
}

/**
 * Datos de importación para cuotas
 */
export interface QuotaImportData {
  id: string
  _creationDate: string
  amount: number
  budgetId: string
  isDeleted: boolean
}

/**
 * Datos de importación para configuraciones de interés
 */
export interface InterestImportData {
  id: string
  paymentTerm: number
  interestPercentage: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Unión de todos los tipos de datos de importación
 */
export type ImportData = UserImportData | BudgetImportData | QuotaImportData | InterestImportData

/**
 * Resultado del parsing de CSV
 */
export interface ParseResult<T> {
  data: T[]
  errors: ParseError[]
  totalRows: number
  validRows: number
}

/**
 * Error de parsing
 */
export interface ParseError {
  line: number
  column?: number
  field?: string
  message: string
  value?: any
}

/**
 * Resultado de validación
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

/**
 * Error de validación
 */
export interface ValidationError {
  line: number
  field: string
  value: any
  message: string
  code: string
}

/**
 * Advertencia de validación
 */
export interface ValidationWarning {
  line: number
  field: string
  value: any
  message: string
  code: string
}

/**
 * Resultado de importación
 */
export interface ImportResult {
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

/**
 * Error de importación
 */
export interface ImportError {
  line: number
  field?: string
  value?: any
  message: string
  code: string
}

/**
 * Advertencia de importación
 */
export interface ImportWarning {
  line: number
  field?: string
  value?: any
  message: string
  code: string
}

/**
 * Resultado de importación completa
 */
export interface CompleteImportResult {
  importId: string
  overallSuccess: boolean
  results: ImportResult[]
  backupId: string
  totalDuration: number
  report: ImportReport
}

/**
 * Reporte de importación
 */
export interface ImportReport {
  importId: string
  startTime: Date
  endTime: Date
  totalDuration: number
  entitiesProcessed: EntityStats[]
  errorsCount: number
  warningsCount: number
  successfulImports: number
  failedImports: number
}

/**
 * Estadísticas por entidad
 */
export interface EntityStats {
  entityType: EntityType
  totalRecords: number
  successfulImports: number
  failedImports: number
  updatedRecords: number
  createdRecords: number
  duration: number
}

/**
 * Esquema de CSV para validación
 */
export interface CSVSchema {
  entityType: EntityType
  requiredHeaders: string[]
  optionalHeaders?: string[]
  fieldValidators?: Record<string, (value: any) => boolean>
}

/**
 * Configuración de importación
 */
export interface ImportConfig {
  batchSize: number
  maxFileSize: number
  backupRetentionDays: number
  tempDirectory: string
  enableAutoRollback: boolean
  validationLevel: 'strict' | 'lenient'
}
