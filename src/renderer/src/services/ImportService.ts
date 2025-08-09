// Import data types
export interface ImportResult {
  entityType: string
  totalRecords: number
  successfulImports: number
  failedImports: number
  updatedRecords: number
  createdRecords: number
  errors: Array<{
    line: number
    message: string
    code: string
  }>
  warnings: Array<{
    line: number
    message: string
    code: string
  }>
  duration: number
}

export interface CompleteImportResult {
  importId: string
  overallSuccess: boolean
  results: ImportResult[]
  backupId: string
  totalDuration: number
  report: any
}

export interface ValidationResult {
  isValid: boolean
  errors: Array<{
    line: number
    field: string
    value: any
    message: string
    code: string
  }>
  warnings: Array<{
    line: number
    field: string
    value: any
    message: string
    code: string
  }>
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export type EntityType = 'users' | 'budgets' | 'quotas' | 'interests'

// Import service methods
const importUsers = async (filePath: string): Promise<ApiResponse<ImportResult>> => {
  return await window.electron.ipcRenderer.invoke('import:users', filePath)
}

const importBudgets = async (filePath: string): Promise<ApiResponse<ImportResult>> => {
  return await window.electron.ipcRenderer.invoke('import:budgets', filePath)
}

const importQuotas = async (filePath: string): Promise<ApiResponse<ImportResult>> => {
  return await window.electron.ipcRenderer.invoke('import:quotas', filePath)
}

const importInterests = async (filePath: string): Promise<ApiResponse<ImportResult>> => {
  return await window.electron.ipcRenderer.invoke('import:interests', filePath)
}

const importComplete = async (zipFilePath: string): Promise<ApiResponse<CompleteImportResult>> => {
  return await window.electron.ipcRenderer.invoke('import:complete', zipFilePath)
}

const validateCSVFile = async (
  filePath: string,
  entityType: EntityType
): Promise<ApiResponse<ValidationResult>> => {
  return await window.electron.ipcRenderer.invoke('import:validate-csv', filePath, entityType)
}

const validateZipFile = async (zipFilePath: string): Promise<ApiResponse<ValidationResult>> => {
  return await window.electron.ipcRenderer.invoke('import:validate-zip', zipFilePath)
}

const createBackup = async (description?: string): Promise<ApiResponse<string>> => {
  return await window.electron.ipcRenderer.invoke('import:create-backup', description)
}

const rollbackToBackup = async (backupId: string): Promise<ApiResponse<void>> => {
  return await window.electron.ipcRenderer.invoke('import:rollback', backupId)
}

export {
  importUsers,
  importBudgets,
  importQuotas,
  importInterests,
  importComplete,
  validateCSVFile,
  validateZipFile,
  createBackup,
  rollbackToBackup
}
