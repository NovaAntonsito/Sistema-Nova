import { ApiResponse } from '../types'
import { IPC_CHANNELS } from '../utils/constants'

/**
 * Import types - matching backend types
 */
export interface ImportResult {
  entityType: string
  totalRecords: number
  successfulImports: number
  failedImports: number
  updatedRecords: number
  createdRecords: number
  errors: ImportError[]
  warnings: ImportWarning[]
  duration: number
}

export interface CompleteImportResult {
  importId: string
  overallSuccess: boolean
  results: ImportResult[]
  backupId: string
  totalDuration: number
  report: ImportReport
}

export interface ImportError {
  line: number
  field?: string
  value?: unknown
  message: string
  code: string
}

export interface ImportWarning {
  line: number
  field?: string
  value?: unknown
  message: string
  code: string
}

export interface ImportReport {
  importId: string
  startTime: Date
  endTime: Date
  totalDuration: number
  entitiesProcessed: ImportEntitySummary[]
  errorsCount: number
  warningsCount: number
  successfulImports: number
  failedImports: number
}

export interface ImportEntitySummary {
  entityType: string
  totalRecords: number
  successfulRecords: number
  failedRecords: number
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  line: number
  field: string
  value: unknown
  message: string
  code: string
}

export interface ValidationWarning {
  line: number
  field: string
  value: unknown
  message: string
  code: string
}

export interface ImportConfig {
  batchSize: number
  maxFileSize: number
  backupRetentionDays: number
  tempDirectory: string
  enableAutoRollback: boolean
  validationLevel: 'strict' | 'lenient'
  streamingThreshold: number
  maxConcurrentBatches: number
  transactionBatchSize: number
  enableParallelProcessing: boolean
  memoryLimitMB: number
  enableDatabaseOptimizations: boolean
  connectionPoolSize: number
  queryTimeout: number
  enableIndexOptimization: boolean
  enableProgressReporting: boolean
  progressReportInterval: number
  enablePerformanceMetrics: boolean
}

export interface ImportProgress {
  importId: string
  currentPhase: string
  totalRecords: number
  processedRecords: number
  successfulRecords: number
  failedRecords: number
  currentBatch: number
  totalBatches: number
  estimatedTimeRemaining: number
  currentSpeed: number
}

export interface PerformanceMetrics {
  importId: string
  totalDuration: number
  averageRecordsPerSecond: number
  peakMemoryUsage: number
  databaseOperationTime: number
  fileProcessingTime: number
  validationTime: number
}

/**
 * ImportService - Frontend service for import-related IPC communication
 * Handles all import operations between frontend and backend
 */
class ImportService {
  private progressCallbacks: Map<string, (progress: ImportProgress) => void> = new Map()

  /**
   * Import users from CSV file
   */
  async importUsers(filePath: string): Promise<ApiResponse<ImportResult>> {
    try {
      const response = await window.electron.ipcRenderer.invoke(IPC_CHANNELS.IMPORT_USERS, filePath)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error importing users'
      }
    }
  }

  /**
   * Import budgets from CSV file
   */
  async importBudgets(filePath: string): Promise<ApiResponse<ImportResult>> {
    try {
      const response = await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.IMPORT_BUDGETS,
        filePath
      )
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error importing budgets'
      }
    }
  }

  /**
   * Import quotas from CSV file
   */
  async importQuotas(filePath: string): Promise<ApiResponse<ImportResult>> {
    try {
      const response = await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.IMPORT_QUOTAS,
        filePath
      )
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error importing quotas'
      }
    }
  }

  /**
   * Import interests from CSV file
   */
  async importInterests(filePath: string): Promise<ApiResponse<ImportResult>> {
    try {
      const response = await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.IMPORT_INTERESTS,
        filePath
      )
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error importing interests'
      }
    }
  }

  /**
   * Import complete data from ZIP file
   */
  async importComplete(zipFilePath: string): Promise<ApiResponse<CompleteImportResult>> {
    try {
      const response = await window.electron.ipcRenderer.invoke(
        IPC_CHANNELS.IMPORT_COMPLETE,
        zipFilePath
      )
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error importing complete data'
      }
    }
  }

  /**
   * Validate CSV file before import
   */
  async validateCSVFile(
    filePath: string,
    entityType: 'users' | 'budgets' | 'quotas' | 'interests'
  ): Promise<ApiResponse<ValidationResult>> {
    try {
      const response = await window.electron.ipcRenderer.invoke(
        'import:validate-csv',
        filePath,
        entityType
      )
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error validating CSV file'
      }
    }
  }

  /**
   * Validate ZIP file before import
   */
  async validateZipFile(zipFilePath: string): Promise<ApiResponse<ValidationResult>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('import:validate-zip', zipFilePath)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error validating ZIP file'
      }
    }
  }

  /**
   * Create backup before import
   */
  async createBackup(description?: string): Promise<ApiResponse<string>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('import:create-backup', description)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error creating backup'
      }
    }
  }

  /**
   * Rollback to backup
   */
  async rollbackToBackup(backupId: string): Promise<ApiResponse<void>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('import:rollback', backupId)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error rolling back to backup'
      }
    }
  }

  /**
   * Get import configuration
   */
  async getConfiguration(): Promise<ApiResponse<ImportConfig>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('import:get-config')
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error getting import configuration'
      }
    }
  }

  /**
   * Update import configuration
   */
  async updateConfiguration(updates: Partial<ImportConfig>): Promise<ApiResponse<void>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('import:update-config', updates)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error updating import configuration'
      }
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<ApiResponse<PerformanceMetrics>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('import:get-metrics')
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error getting performance metrics'
      }
    }
  }

  /**
   * Handle file upload and validation
   */
  async handleFileUpload(
    file: File,
    entityType: 'users' | 'budgets' | 'quotas' | 'interests' | 'complete'
  ): Promise<{
    isValid: boolean
    filePath?: string
    errors?: string[]
    warnings?: string[]
  }> {
    try {
      // Validate file type and size
      const validationResult = this.validateFileType(file, entityType)
      if (!validationResult.isValid) {
        return validationResult
      }

      // Save file to temporary location
      const tempFilePath = await this.saveFileToTemp(file)

      // Validate the file content
      let validationResponse: ApiResponse<ValidationResult>
      if (entityType === 'complete') {
        validationResponse = await this.validateZipFile(tempFilePath)
      } else {
        validationResponse = await this.validateCSVFile(tempFilePath, entityType)
      }

      if (!validationResponse.success) {
        return {
          isValid: false,
          errors: [validationResponse.error || 'Validation failed']
        }
      }

      const validation = validationResponse.data!
      if (!validation.isValid) {
        return {
          isValid: false,
          errors: validation.errors.map((e) => e.message),
          warnings: validation.warnings.map((w) => w.message)
        }
      }

      return {
        isValid: true,
        filePath: tempFilePath,
        warnings: validation.warnings.map((w) => w.message)
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'File upload failed']
      }
    }
  }

  /**
   * Save file to temporary location
   */
  private async saveFileToTemp(file: File): Promise<string> {
    try {
      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      // Request backend to save file to temp location
      const response = await window.electron.ipcRenderer.invoke(
        'import:save-temp-file',
        file.name,
        buffer
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to save file')
      }

      return response.data
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to save file to temporary location'
      )
    }
  }

  /**
   * Validate file type and size
   */
  private validateFileType(
    file: File,
    entityType: 'users' | 'budgets' | 'quotas' | 'interests' | 'complete'
  ): {
    isValid: boolean
    errors?: string[]
  } {
    const errors: string[] = []

    // Check if file exists
    if (!file) {
      errors.push('No file selected')
      return { isValid: false, errors }
    }

    // Check file size (50MB limit for ZIP, 10MB for CSV)
    const maxSize = entityType === 'complete' ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      const limitMB = entityType === 'complete' ? '50MB' : '10MB'
      errors.push(`File size exceeds ${limitMB} limit`)
    }

    // Check minimum file size (empty files)
    if (file.size === 0) {
      errors.push('File is empty')
    }

    // Check file type
    if (entityType === 'complete') {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        errors.push('Complete import requires a ZIP file (.zip)')
      }
      if (!file.type.includes('zip') && file.type !== 'application/zip') {
        errors.push('Invalid file type. Expected ZIP file')
      }
    } else {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        errors.push('Individual imports require CSV files (.csv)')
      }
      if (
        !file.type.includes('csv') &&
        file.type !== 'text/csv' &&
        file.type !== 'application/csv'
      ) {
        errors.push('Invalid file type. Expected CSV file')
      }
    }

    // Check file name for invalid characters
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(file.name)) {
      errors.push('File name contains invalid characters')
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  /**
   * Set up progress tracking for import operations
   */
  onImportProgress(importId: string, callback: (progress: ImportProgress) => void): void {
    this.progressCallbacks.set(importId, callback)

    // Listen for progress updates from backend
    window.electron.ipcRenderer.on(`import:progress:${importId}`, (_, progress: ImportProgress) => {
      callback(progress)
    })
  }

  /**
   * Remove progress tracking
   */
  removeProgressListener(importId: string): void {
    this.progressCallbacks.delete(importId)
    window.electron.ipcRenderer.removeAllListeners(`import:progress:${importId}`)
  }

  /**
   * Start import with progress tracking
   */
  async startImportWithProgress(
    filePath: string,
    entityType: 'users' | 'budgets' | 'quotas' | 'interests' | 'complete',
    onProgress?: (progress: ImportProgress) => void,
    onError?: (error: string) => void
  ): Promise<ApiResponse<ImportResult | CompleteImportResult>> {
    try {
      let response: ApiResponse<ImportResult | CompleteImportResult>

      // Set up progress tracking if callback provided
      if (onProgress) {
        const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        this.onImportProgress(importId, onProgress)

        // Set up error handling
        if (onError) {
          window.electron.ipcRenderer.on(`import:error:${importId}`, (_, error: string) => {
            onError(error)
          })
        }
      }

      // Start the appropriate import
      switch (entityType) {
        case 'users':
          response = await this.importUsers(filePath)
          break
        case 'budgets':
          response = await this.importBudgets(filePath)
          break
        case 'quotas':
          response = await this.importQuotas(filePath)
          break
        case 'interests':
          response = await this.importInterests(filePath)
          break
        case 'complete':
          response = await this.importComplete(filePath)
          break
        default:
          throw new Error(`Unsupported entity type: ${entityType}`)
      }

      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed'
      }
    }
  }

  /**
   * Validate and prepare file for import
   */
  async validateAndPrepareFile(
    file: File,
    entityType: 'users' | 'budgets' | 'quotas' | 'interests' | 'complete'
  ): Promise<{
    isValid: boolean
    filePath?: string
    errors?: string[]
    warnings?: string[]
    summary?: {
      fileName: string
      fileSize: string
      estimatedRecords?: number
    }
  }> {
    try {
      // First validate file type and size
      const typeValidation = this.validateFileType(file, entityType)
      if (!typeValidation.isValid) {
        return typeValidation
      }

      // Handle file upload
      const uploadResult = await this.handleFileUpload(file, entityType)
      if (!uploadResult.isValid) {
        return uploadResult
      }

      // Get file summary
      const summary = {
        fileName: file.name,
        fileSize: this.formatFileSize(file.size),
        estimatedRecords: await this.estimateRecordCount(uploadResult.filePath!, entityType)
      }

      return {
        isValid: true,
        filePath: uploadResult.filePath,
        warnings: uploadResult.warnings,
        summary
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'File preparation failed']
      }
    }
  }

  /**
   * Estimate record count from file
   */
  private async estimateRecordCount(
    filePath: string,
    entityType: 'users' | 'budgets' | 'quotas' | 'interests' | 'complete'
  ): Promise<number | undefined> {
    try {
      const response = await window.electron.ipcRenderer.invoke(
        'import:estimate-records',
        filePath,
        entityType
      )
      return response.success ? response.data : undefined
    } catch {
      return undefined
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Get import status
   */
  async getImportStatus(importId: string): Promise<ApiResponse<ImportProgress>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('import:get-status', importId)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error getting import status'
      }
    }
  }

  /**
   * Cancel ongoing import
   */
  async cancelImport(importId: string): Promise<ApiResponse<void>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('import:cancel', importId)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error canceling import'
      }
    }
  }

  /**
   * Get import history
   */
  async getImportHistory(limit = 10): Promise<ApiResponse<ImportReport[]>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('import:get-history', limit)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error getting import history'
      }
    }
  }

  /**
   * Delete temporary files
   */
  async cleanupTempFiles(): Promise<ApiResponse<void>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('import:cleanup-temp')
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error cleaning up temporary files'
      }
    }
  }

  /**
   * Get supported file formats
   */
  getSupportedFormats(entityType: 'users' | 'budgets' | 'quotas' | 'interests' | 'complete'): {
    extensions: string[]
    mimeTypes: string[]
    description: string
  } {
    if (entityType === 'complete') {
      return {
        extensions: ['.zip'],
        mimeTypes: ['application/zip', 'application/x-zip-compressed'],
        description: 'ZIP archive containing CSV files for complete data import'
      }
    }

    return {
      extensions: ['.csv'],
      mimeTypes: ['text/csv', 'application/csv', 'text/plain'],
      description: `CSV file for ${entityType} import`
    }
  }

  /**
   * Validate import data integrity
   */
  async validateDataIntegrity(
    filePath: string,
    entityType: 'users' | 'budgets' | 'quotas' | 'interests'
  ): Promise<
    ApiResponse<{
      isValid: boolean
      issues: Array<{
        type: 'error' | 'warning'
        message: string
        line?: number
        field?: string
      }>
    }>
  > {
    try {
      const response = await window.electron.ipcRenderer.invoke(
        'import:validate-integrity',
        filePath,
        entityType
      )
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error validating data integrity'
      }
    }
  }

  /**
   * Clean up all progress listeners and resources
   */
  cleanup(): void {
    // Clear all progress callbacks
    this.progressCallbacks.clear()

    // Remove all import-related listeners
    window.electron.ipcRenderer.removeAllListeners('import:progress')
    window.electron.ipcRenderer.removeAllListeners('import:error')
    window.electron.ipcRenderer.removeAllListeners('import:complete')

    // Clean up temporary files
    this.cleanupTempFiles().catch(() => {
      // Ignore cleanup errors during shutdown
    })
  }
}

// Export singleton instance
export const importService = new ImportService()
export default importService
