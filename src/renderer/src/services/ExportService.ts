import { ApiResponse, ExportOptions } from '../types'

/**
 * Export result interface
 */
export interface ExportResult {
  zipFilePath: string
  files: {
    users?: string
    budgets?: string
    quotas?: string
    interests?: string
  }
  summary: {
    totalFiles: number
    totalRecords: number
    exportedAt: Date
  }
}

/**
 * Export progress interface
 */
export interface ExportProgress {
  exportId: string
  entityType: string
  currentPhase: 'preparing' | 'exporting' | 'writing' | 'complete'
  totalRecords: number
  processedRecords: number
  currentSpeed: number
  estimatedTimeRemaining: number
  message: string
}

/**
 * File download result interface
 */
export interface FileDownloadResult {
  success: boolean
  filePath?: string
  fileName?: string
  error?: string
}

/**
 * ExportService - Frontend service for export-related IPC communication
 * Handles all export operations between frontend and backend
 */
class ExportService {
  private progressCallbacks: Map<string, (progress: ExportProgress) => void> = new Map()
  private downloadCallbacks: Map<string, (result: FileDownloadResult) => void> = new Map()
  /**
   * Export users to CSV
   */
  async exportUsers(): Promise<ApiResponse<string>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('export:users')

      // Handle file download if export was successful
      if (response.success && response.data) {
        await this.handleFileDownload(response.data, 'users.csv')
      }

      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error exporting users'
      }
    }
  }

  /**
   * Export budgets to CSV
   */
  async exportBudgets(): Promise<ApiResponse<string>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('export:budgets')

      // Handle file download if export was successful
      if (response.success && response.data) {
        await this.handleFileDownload(response.data, 'budgets.csv')
      }

      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error exporting budgets'
      }
    }
  }

  /**
   * Export quotas to CSV
   */
  async exportQuotas(): Promise<ApiResponse<string>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('export:quotas')

      // Handle file download if export was successful
      if (response.success && response.data) {
        await this.handleFileDownload(response.data, 'quotas.csv')
      }

      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error exporting quotas'
      }
    }
  }

  /**
   * Export interests to CSV
   */
  async exportInterests(): Promise<ApiResponse<string>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('export:interests')

      // Handle file download if export was successful
      if (response.success && response.data) {
        await this.handleFileDownload(response.data, 'interests.csv')
      }

      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error exporting interests'
      }
    }
  }

  /**
   * Export complete data (all entities in a ZIP file)
   */
  async exportComplete(): Promise<ApiResponse<ExportResult>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('export:complete')

      // Handle file download if export was successful
      if (response.success && response.data) {
        await this.handleFileDownload(response.data.zipFilePath, 'complete_export.zip')
      }

      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error exporting complete data'
      }
    }
  }

  /**
   * Export selected data based on options
   */
  async exportSelected(
    options: ExportOptions
  ): Promise<ApiResponse<{ files: string[]; message: string }>> {
    try {
      const exportPromises: Promise<ApiResponse<string>>[] = []
      const exportedFiles: string[] = []
      const errors: string[] = []

      // Export users if selected
      if (options.users) {
        exportPromises.push(this.exportUsers())
      }

      // Export budgets if selected
      if (options.budgets) {
        exportPromises.push(this.exportBudgets())
      }

      // Export quotas if selected
      if (options.quotas) {
        exportPromises.push(this.exportQuotas())
      }

      // Export interests if selected
      if (options.interests) {
        exportPromises.push(this.exportInterests())
      }

      // If complete export is selected, use the complete export method
      if (options.complete) {
        const completeResult = await this.exportComplete()
        if (completeResult.success && completeResult.data) {
          return {
            success: true,
            data: {
              files: [completeResult.data.zipFilePath],
              message: 'Complete export successful'
            }
          }
        } else {
          return {
            success: false,
            error: completeResult.error || 'Complete export failed'
          }
        }
      }

      // Wait for all individual exports to complete
      const results = await Promise.all(exportPromises)

      // Process results
      results.forEach((result, index) => {
        if (result.success && result.data) {
          exportedFiles.push(result.data)
        } else {
          errors.push(result.error || `Export ${index + 1} failed`)
        }
      })

      if (errors.length > 0) {
        return {
          success: false,
          error: `Some exports failed: ${errors.join(', ')}`
        }
      }

      return {
        success: true,
        data: {
          files: exportedFiles,
          message: `Successfully exported ${exportedFiles.length} files`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error exporting selected data'
      }
    }
  }

  /**
   * Get export statistics for a specific entity type
   */
  async getExportStats(
    entityType: 'users' | 'budgets' | 'quotas' | 'interests'
  ): Promise<ApiResponse<number>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('export:stats', entityType)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error getting export statistics'
      }
    }
  }

  /**
   * Handle file download for exported CSV files
   */
  private async handleFileDownload(
    filePath: string,
    defaultFileName: string
  ): Promise<FileDownloadResult> {
    try {
      // Request the backend to prepare the file for download
      const downloadResult = await window.electron.ipcRenderer.invoke(
        'export:prepareDownload',
        filePath
      )

      if (downloadResult.success) {
        // Trigger download callback if registered
        const downloadId = `download_${Date.now()}`
        const callback = this.downloadCallbacks.get(downloadId)
        if (callback) {
          callback({
            success: true,
            filePath: downloadResult.data.filePath,
            fileName: downloadResult.data.fileName || defaultFileName
          })
        }

        return {
          success: true,
          filePath: downloadResult.data.filePath,
          fileName: downloadResult.data.fileName || defaultFileName
        }
      } else {
        return {
          success: false,
          error: downloadResult.error || 'Failed to prepare file for download'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error handling file download'
      }
    }
  }

  /**
   * Download file helper - opens the file location in the system file explorer
   */
  async openFileLocation(filePath: string): Promise<void> {
    try {
      // Use Electron's shell to show the file in the system file explorer
      await window.electron.ipcRenderer.invoke('shell:showItemInFolder', filePath)
    } catch (error) {
      console.error('Error opening file location:', error)
    }
  }

  /**
   * Download file directly to user's Downloads folder
   */
  async downloadFile(filePath: string, fileName?: string): Promise<FileDownloadResult> {
    try {
      const response = await window.electron.ipcRenderer.invoke('export:downloadFile', {
        filePath,
        fileName
      })

      return {
        success: response.success,
        filePath: response.data?.downloadPath,
        fileName: response.data?.fileName,
        error: response.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error downloading file'
      }
    }
  }

  /**
   * Set up progress tracking for export operations
   */
  onExportProgress(exportId: string, callback: (progress: ExportProgress) => void): void {
    this.progressCallbacks.set(exportId, callback)

    // Listen for progress updates from backend
    window.electron.ipcRenderer.on(`export:progress:${exportId}`, (_, progress: ExportProgress) => {
      callback(progress)
    })
  }

  /**
   * Remove progress tracking for specific export
   */
  removeExportProgressListener(exportId: string): void {
    this.progressCallbacks.delete(exportId)
    window.electron.ipcRenderer.removeAllListeners(`export:progress:${exportId}`)
  }

  /**
   * Remove all export progress listeners
   */
  removeAllExportProgressListeners(): void {
    this.progressCallbacks.clear()
    window.electron.ipcRenderer.removeAllListeners('export:progress')
  }

  /**
   * Get export progress status
   */
  async getExportProgress(exportId: string): Promise<ApiResponse<ExportProgress>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('export:getProgress', exportId)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error getting export progress'
      }
    }
  }

  /**
   * Cancel ongoing export operation
   */
  async cancelExport(exportId: string): Promise<ApiResponse<void>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('export:cancel', exportId)

      // Clean up progress listener for cancelled export
      this.removeExportProgressListener(exportId)

      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error canceling export'
      }
    }
  }

  /**
   * Set up file download callback
   */
  onFileDownload(downloadId: string, callback: (result: FileDownloadResult) => void): void {
    this.downloadCallbacks.set(downloadId, callback)
  }

  /**
   * Remove file download callback
   */
  removeFileDownloadCallback(downloadId: string): void {
    this.downloadCallbacks.delete(downloadId)
  }

  /**
   * Export with progress tracking
   */
  async exportWithProgress(
    entityType: 'users' | 'budgets' | 'quotas' | 'interests' | 'complete',
    progressCallback?: (progress: ExportProgress) => void
  ): Promise<ApiResponse<string | ExportResult>> {
    try {
      // Generate unique export ID
      const exportId = `export_${entityType}_${Date.now()}`

      // Set up progress tracking if callback provided
      if (progressCallback) {
        this.onExportProgress(exportId, progressCallback)
      }

      // Start export with progress tracking
      const response = await window.electron.ipcRenderer.invoke('export:withProgress', {
        entityType,
        exportId
      })

      // Handle file download if export was successful
      if (response.success && response.data) {
        const fileName = entityType === 'complete' ? 'complete_export.zip' : `${entityType}.csv`
        const filePath = entityType === 'complete' ? response.data.zipFilePath : response.data
        await this.handleFileDownload(filePath, fileName)
      }

      // Clean up progress listener
      if (progressCallback) {
        this.removeExportProgressListener(exportId)
      }

      return response
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : `Error exporting ${entityType} with progress`
      }
    }
  }

  /**
   * Get available export formats
   */
  async getExportFormats(): Promise<ApiResponse<string[]>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('export:getFormats')
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error getting export formats'
      }
    }
  }

  /**
   * Get export history
   */
  async getExportHistory(): Promise<ApiResponse<any[]>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('export:getHistory')
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error getting export history'
      }
    }
  }

  /**
   * Validate export options
   */
  validateExportOptions(options: ExportOptions): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check if at least one option is selected
    const hasSelection =
      options.users || options.budgets || options.quotas || options.interests || options.complete

    if (!hasSelection) {
      errors.push('At least one export option must be selected')
    }

    // If complete is selected, warn about other selections being ignored
    if (
      options.complete &&
      (options.users || options.budgets || options.quotas || options.interests)
    ) {
      errors.push('When complete export is selected, individual options are ignored')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Clean up all callbacks and listeners
   */
  cleanup(): void {
    this.progressCallbacks.clear()
    this.downloadCallbacks.clear()

    // Remove all export-related listeners
    window.electron.ipcRenderer.removeAllListeners('export:progress')
    window.electron.ipcRenderer.removeAllListeners('export:download')
  }
}

// Export singleton instance
export const exportService = new ExportService()
export default exportService
