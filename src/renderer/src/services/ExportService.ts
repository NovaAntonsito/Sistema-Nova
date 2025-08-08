// Export data types
export interface ExportResult {
  zipFilePath: string
  metadata: {
    exportDate: string
    totalFiles: number
    totalRecords: number
    files: Array<{
      name: string
      recordCount: number
    }>
  }
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Export service methods with custom save location
const exportUsers = async (savePath?: string): Promise<ApiResponse<string>> => {
  return await window.electron.ipcRenderer.invoke('export:users', savePath)
}

const exportBudgets = async (savePath?: string): Promise<ApiResponse<string>> => {
  return await window.electron.ipcRenderer.invoke('export:budgets', savePath)
}

const exportQuotas = async (savePath?: string): Promise<ApiResponse<string>> => {
  return await window.electron.ipcRenderer.invoke('export:quotas', savePath)
}

const exportInterests = async (savePath?: string): Promise<ApiResponse<string>> => {
  return await window.electron.ipcRenderer.invoke('export:interests', savePath)
}

const exportComplete = async (savePath?: string): Promise<ApiResponse<ExportResult>> => {
  return await window.electron.ipcRenderer.invoke('export:complete', savePath)
}

// Show save dialog for file selection
const showSaveDialog = async (options: {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}): Promise<ApiResponse<string | null>> => {
  return await window.electron.ipcRenderer.invoke('dialog:showSaveDialog', options)
}

const getExportStats = async (entityType: 'users' | 'budgets' | 'quotas' | 'interests'): Promise<ApiResponse<number>> => {
  return await window.electron.ipcRenderer.invoke('export:stats', entityType)
}

export { 
  exportUsers,
  exportBudgets,
  exportQuotas,
  exportInterests,
  exportComplete,
  getExportStats
}