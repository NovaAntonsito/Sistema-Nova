import React, { useState, useRef } from 'react'
import Modal from '../common/Modal'
import { useNotification } from '../../hooks/useNotification'
import { 
  importUsers, 
  importBudgets, 
  importQuotas, 
  importInterests, 
  importComplete,
  validateCSVFile,
  validateZipFile,
  createBackup,
  rollbackToBackup,
  EntityType
} from '../../services/ImportService'
import './ImportDialog.css'

interface ImportOptions {
  users: boolean
  budgets: boolean
  quotas: boolean
  interests: boolean
  complete: boolean
}

interface ImportProgress {
  phase: string
  currentStep: number
  totalSteps: number
  message: string
  percentage: number
}

interface ImportError {
  type: string
  message: string
  details?: string[]
}

interface ImportSummary {
  totalRecords: number
  successfulImports: number
  failedImports: number
  updatedRecords: number
  createdRecords: number
  errors: ImportError[]
  warnings: string[]
  backupId?: string
  canRollback: boolean
}

interface ImportDialogProps {
  isOpen: boolean
  onClose: () => void
}

const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose }) => {
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    users: false,
    budgets: false,
    quotas: false,
    interests: false,
    complete: false
  })
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File | null }>({
    users: null,
    budgets: null,
    quotas: null,
    interests: null,
    complete: null
  })
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    phase: '',
    currentStep: 0,
    totalSteps: 0,
    message: '',
    percentage: 0
  })
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [isRollingBack, setIsRollingBack] = useState(false)
  const [dragActive, setDragActive] = useState<string | null>(null)
  const { addNotification } = useNotification()

  // File input refs
  const fileInputRefs = {
    users: useRef<HTMLInputElement>(null),
    budgets: useRef<HTMLInputElement>(null),
    quotas: useRef<HTMLInputElement>(null),
    interests: useRef<HTMLInputElement>(null),
    complete: useRef<HTMLInputElement>(null)
  }

  const handleOptionChange = (option: keyof ImportOptions) => {
    setImportOptions(prev => {
      const newOptions = { ...prev, [option]: !prev[option] }
      
      // If complete is selected, unselect all others
      if (option === 'complete' && newOptions.complete) {
        return {
          users: false,
          budgets: false,
          quotas: false,
          interests: false,
          complete: true
        }
      }
      
      // If any individual option is selected, unselect complete
      if (option !== 'complete' && newOptions[option]) {
        newOptions.complete = false
      }
      
      return newOptions
    })

    // Clear file if option is unchecked
    if (!importOptions[option]) {
      setSelectedFiles(prev => ({ ...prev, [option]: null }))
    }
  }

  const validateFileType = (file: File, expectedType: 'csv' | 'zip'): boolean => {
    const fileExtension = file.name.toLowerCase().split('.').pop()
    
    if (expectedType === 'csv') {
      return fileExtension === 'csv' || file.type === 'text/csv'
    } else if (expectedType === 'zip') {
      return fileExtension === 'zip' || file.type === 'application/zip'
    }
    
    return false
  }

  const handleFileSelect = (option: keyof ImportOptions, file: File) => {
    const expectedType = option === 'complete' ? 'zip' : 'csv'
    
    if (!validateFileType(file, expectedType)) {
      addNotification({
        type: 'error',
        message: `Tipo de archivo inválido. Se esperaba un archivo ${expectedType.toUpperCase()}.`
      })
      return
    }

    setSelectedFiles(prev => ({ ...prev, [option]: file }))
    
    // Auto-select the option if a file is selected
    if (!importOptions[option]) {
      handleOptionChange(option)
    }
  }

  const handleFileInputChange = (option: keyof ImportOptions) => {
    const input = fileInputRefs[option].current
    if (input?.files && input.files[0]) {
      handleFileSelect(option, input.files[0])
    }
  }

  const handleDragEnter = (e: React.DragEvent, option: keyof ImportOptions) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(option)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent, option: keyof ImportOptions) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(null)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(option, files[0])
    }
  }

  const updateProgress = (phase: string, currentStep: number, totalSteps: number, message: string) => {
    const percentage = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0
    setImportProgress({
      phase,
      currentStep,
      totalSteps,
      message,
      percentage
    })
  }

  const handleImport = async () => {
    const selectedOptions = Object.entries(importOptions).filter(([_, selected]) => selected)
    
    if (selectedOptions.length === 0) {
      addNotification({
        type: 'warning',
        message: 'Por favor selecciona al menos una opción de importación'
      })
      return
    }

    // Validate that files are selected for each option
    const missingFiles = selectedOptions.filter(([option]) => !selectedFiles[option])
    if (missingFiles.length > 0) {
      const missingFileNames = missingFiles.map(([option]) => option).join(', ')
      addNotification({
        type: 'warning',
        message: `Por favor selecciona archivos para: ${missingFileNames}`
      })
      return
    }

    setIsImporting(true)
    setShowSummary(false)
    setImportSummary(null)
    updateProgress('Iniciando', 0, 0, 'Preparando importación...')

    let backupId: string | undefined

    try {
      // Create backup before import
      updateProgress('Respaldo', 1, 0, 'Creando respaldo de seguridad...')
      const backupResponse = await createBackup('Respaldo antes de importación')
      
      if (backupResponse.success && backupResponse.data) {
        backupId = backupResponse.data
        console.log('Backup created:', backupId)
      } else {
        throw new Error(`Error creando respaldo: ${backupResponse.error || 'Error desconocido'}`)
      }

      const importPromises: Promise<{ type: string; response: any }>[] = []
      const totalSteps = importOptions.complete ? 4 : selectedOptions.length * 2 + 1 // backup + validation + import for each
      let currentStep = 1 // Already completed backup step

      if (importOptions.complete && selectedFiles.complete) {
        updateProgress('Validación', ++currentStep, totalSteps, 'Validando archivo ZIP...')
        
        // First validate the ZIP file
        const validationResponse = await validateZipFile((selectedFiles.complete as any).path || '')
        if (!validationResponse.success || !validationResponse.data?.isValid) {
          const errors = validationResponse.data?.errors || []
          const errorMessages = errors.map(error => error.message).join(', ')
          const validationErrors = errors.map(error => ({
            type: 'validation',
            message: error.message,
            details: [error.field, error.value?.toString()].filter(Boolean)
          }))
          
          setImportSummary({
            totalRecords: 0,
            successfulImports: 0,
            failedImports: 0,
            updatedRecords: 0,
            createdRecords: 0,
            errors: validationErrors,
            warnings: [],
            backupId,
            canRollback: !!backupId
          })
          setShowSummary(true)
          throw new Error(`Archivo ZIP inválido: ${errorMessages}`)
        }

        updateProgress('Importación', ++currentStep, totalSteps, 'Importando datos completos...')
        importPromises.push(
          importComplete((selectedFiles.complete as any).path || '').then(response => ({
            type: 'complete',
            response
          }))
        )
      } else {
        // Individual imports with detailed progress tracking
        const importTasks = [
          { option: 'users', file: selectedFiles.users, label: 'usuarios', entityType: 'users' as EntityType, importFn: importUsers },
          { option: 'budgets', file: selectedFiles.budgets, label: 'presupuestos', entityType: 'budgets' as EntityType, importFn: importBudgets },
          { option: 'quotas', file: selectedFiles.quotas, label: 'cuotas', entityType: 'quotas' as EntityType, importFn: importQuotas },
          { option: 'interests', file: selectedFiles.interests, label: 'configuraciones de interés', entityType: 'interests' as EntityType, importFn: importInterests }
        ]

        for (const task of importTasks) {
          if (importOptions[task.option as keyof ImportOptions] && task.file) {
            // Validation step
            updateProgress('Validación', ++currentStep, totalSteps, `Validando archivo de ${task.label}...`)
            const validationResponse = await validateCSVFile((task.file as any).path || '', task.entityType)
            
            if (!validationResponse.success || !validationResponse.data?.isValid) {
              const errors = validationResponse.data?.errors || []
              const errorMessages = errors.map(error => error.message).join(', ')
              const validationErrors = errors.map(error => ({
                type: 'validation',
                message: error.message,
                details: [error.field, error.value?.toString()].filter(Boolean)
              }))
              
              setImportSummary({
                totalRecords: 0,
                successfulImports: 0,
                failedImports: 0,
                updatedRecords: 0,
                createdRecords: 0,
                errors: validationErrors,
                warnings: [],
                backupId,
                canRollback: !!backupId
              })
              setShowSummary(true)
              throw new Error(`Archivo de ${task.label} inválido: ${errorMessages}`)
            }

            // Import step
            updateProgress('Importación', ++currentStep, totalSteps, `Importando ${task.label}...`)
            importPromises.push(
              task.importFn((task.file as any).path || '').then(response => ({
                type: task.option,
                response
              }))
            )
          }
        }
      }

      updateProgress('Procesando', totalSteps, totalSteps, 'Finalizando importación...')
      const results = await Promise.all(importPromises)
      
      // Process results and create summary
      const summary: ImportSummary = {
        totalRecords: 0,
        successfulImports: 0,
        failedImports: 0,
        updatedRecords: 0,
        createdRecords: 0,
        errors: [],
        warnings: [],
        backupId,
        canRollback: !!backupId
      }

      const failedImports = results.filter(result => !result.response.success)
      
      if (failedImports.length > 0) {
        // Process failed imports
        failedImports.forEach(failed => {
          summary.errors.push({
            type: failed.type,
            message: failed.response.error || 'Error desconocido',
            details: failed.response.details || []
          })
        })
      }

      // Process successful imports
      const successfulImports = results.filter(result => result.response.success)
      successfulImports.forEach(result => {
        const data = result.response.data
        if (data) {
          if (Array.isArray(data)) {
            // Complete import returns array of results
            data.forEach(item => {
              summary.totalRecords += item.totalRecords || 0
              summary.successfulImports += item.successfulImports || 0
              summary.failedImports += item.failedImports || 0
              summary.updatedRecords += item.updatedRecords || 0
              summary.createdRecords += item.createdRecords || 0
              
              // Add errors and warnings
              if (item.errors) {
                item.errors.forEach((error: any) => {
                  summary.errors.push({
                    type: result.type,
                    message: error.message,
                    details: [error.code, `Línea ${error.line}`].filter(Boolean)
                  })
                })
              }
              
              if (item.warnings) {
                item.warnings.forEach((warning: any) => {
                  summary.warnings.push(`${result.type}: ${warning.message} (Línea ${warning.line})`)
                })
              }
            })
          } else {
            // Individual import
            summary.totalRecords += data.totalRecords || 0
            summary.successfulImports += data.successfulImports || 0
            summary.failedImports += data.failedImports || 0
            summary.updatedRecords += data.updatedRecords || 0
            summary.createdRecords += data.createdRecords || 0
            
            // Add errors and warnings
            if (data.errors) {
              data.errors.forEach((error: any) => {
                summary.errors.push({
                  type: result.type,
                  message: error.message,
                  details: [error.code, `Línea ${error.line}`].filter(Boolean)
                })
              })
            }
            
            if (data.warnings) {
              data.warnings.forEach((warning: any) => {
                summary.warnings.push(`${result.type}: ${warning.message} (Línea ${warning.line})`)
              })
            }
          }
        }
      })

      setImportSummary(summary)
      setShowSummary(true)
      
      if (failedImports.length > 0) {
        addNotification({
          type: 'error',
          message: `Importación completada con errores. Revisa el resumen para más detalles.`
        })
      } else {
        addNotification({
          type: 'success',
          message: `Importación exitosa: ${summary.successfulImports} registro(s) importado(s)`
        })
      }
      
    } catch (error) {
      console.error('Import error:', error)
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error inesperado durante la importación'
      })
    } finally {
      setIsImporting(false)
      updateProgress('', 0, 0, '')
    }
  }

  const handleClose = () => {
    if (!isImporting) {
      setImportOptions({
        users: false,
        budgets: false,
        quotas: false,
        interests: false,
        complete: false
      })
      setSelectedFiles({
        users: null,
        budgets: null,
        quotas: null,
        interests: null,
        complete: null
      })
      setImportProgress({
        phase: '',
        currentStep: 0,
        totalSteps: 0,
        message: '',
        percentage: 0
      })
      setImportSummary(null)
      setShowSummary(false)
      onClose()
    }
  }

  const handleNewImport = () => {
    setImportOptions({
      users: false,
      budgets: false,
      quotas: false,
      interests: false,
      complete: false
    })
    setSelectedFiles({
      users: null,
      budgets: null,
      quotas: null,
      interests: null,
      complete: null
    })
    setImportSummary(null)
    setShowSummary(false)
  }

  const handleRollback = async () => {
    if (!importSummary?.backupId) {
      addNotification({
        type: 'error',
        message: 'No hay respaldo disponible para realizar rollback'
      })
      return
    }

    setIsRollingBack(true)
    
    try {
      const response = await rollbackToBackup(importSummary.backupId)
      
      if (response.success) {
        addNotification({
          type: 'success',
          message: 'Rollback realizado exitosamente. Los datos han sido restaurados al estado anterior.'
        })
        
        // Update summary to reflect rollback
        setImportSummary(prev => prev ? {
          ...prev,
          canRollback: false
        } : null)
      } else {
        addNotification({
          type: 'error',
          message: `Error en rollback: ${response.error || 'Error desconocido'}`
        })
      }
    } catch (error) {
      console.error('Rollback error:', error)
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error inesperado durante el rollback'
      })
    } finally {
      setIsRollingBack(false)
    }
  }

  const renderFileUploadArea = (option: keyof ImportOptions, label: string, description: string, fileType: 'csv' | 'zip') => {
    const isActive = dragActive === option
    const hasFile = selectedFiles[option] !== null
    const isDisabled = isImporting || (option !== 'complete' && importOptions.complete) || (option === 'complete' && Object.values(importOptions).slice(0, 4).some(v => v))

    return (
      <div className={`import-dialog__file-area ${isActive ? 'import-dialog__file-area--active' : ''} ${hasFile ? 'import-dialog__file-area--has-file' : ''} ${isDisabled ? 'import-dialog__file-area--disabled' : ''}`}>
        <label className="import-dialog__option">
          <input
            type="checkbox"
            checked={importOptions[option]}
            onChange={() => handleOptionChange(option)}
            disabled={isDisabled}
          />
          <span className="import-dialog__option-text">
            <strong>{label}</strong>
            <small>{description}</small>
          </span>
        </label>

        {importOptions[option] && (
          <div
            className="import-dialog__drop-zone"
            onDragEnter={(e) => handleDragEnter(e, option)}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, option)}
            onClick={() => fileInputRefs[option].current?.click()}
          >
            <input
              ref={fileInputRefs[option]}
              type="file"
              accept={fileType === 'csv' ? '.csv,text/csv' : '.zip,application/zip'}
              onChange={() => handleFileInputChange(option)}
              style={{ display: 'none' }}
              disabled={isImporting}
            />
            
            {hasFile ? (
              <div className="import-dialog__file-selected">
                <div className="import-dialog__file-icon">📄</div>
                <div className="import-dialog__file-info">
                  <div className="import-dialog__file-name">{selectedFiles[option]?.name}</div>
                  <div className="import-dialog__file-size">
                    {selectedFiles[option] ? Math.round(selectedFiles[option]!.size / 1024) : 0} KB
                  </div>
                </div>
                <button
                  type="button"
                  className="import-dialog__file-remove"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFiles(prev => ({ ...prev, [option]: null }))
                  }}
                  disabled={isImporting}
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="import-dialog__drop-content">
                <div className="import-dialog__drop-icon">📁</div>
                <div className="import-dialog__drop-text">
                  <strong>Arrastra tu archivo {fileType.toUpperCase()} aquí</strong>
                  <span>o haz clic para seleccionar</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Importar Datos"
      size="large"
    >
      <div className="import-dialog">
        <div className="import-dialog__content">
          <p className="import-dialog__description">
            Selecciona los datos que deseas importar. Puedes importar archivos CSV individuales o un archivo ZIP completo.
          </p>

          <div className="import-dialog__options">
            <div className="import-dialog__section">
              <h3 className="import-dialog__section-title">Importación Individual</h3>
              
              {renderFileUploadArea('users', 'Usuarios', 'Importar usuarios desde archivo CSV', 'csv')}
              {renderFileUploadArea('budgets', 'Presupuestos', 'Importar presupuestos desde archivo CSV', 'csv')}
              {renderFileUploadArea('quotas', 'Cuotas', 'Importar cuotas desde archivo CSV', 'csv')}
              {renderFileUploadArea('interests', 'Configuraciones de Interés', 'Importar configuraciones de interés desde archivo CSV', 'csv')}
            </div>

            <div className="import-dialog__divider">
              <span>o</span>
            </div>

            <div className="import-dialog__section">
              <h3 className="import-dialog__section-title">Importación Completa</h3>
              
              {renderFileUploadArea('complete', 'Importación Completa', 'Importar todos los datos desde un archivo ZIP', 'zip')}
            </div>
          </div>

          {isImporting && (
            <div className="import-dialog__progress">
              <div className="import-dialog__progress-header">
                <span className="import-dialog__progress-phase">{importProgress.phase}</span>
                {importProgress.totalSteps > 0 && (
                  <span className="import-dialog__progress-steps">
                    {importProgress.currentStep} de {importProgress.totalSteps}
                  </span>
                )}
              </div>
              <div className="import-dialog__progress-bar">
                <div 
                  className="import-dialog__progress-indicator"
                  style={{ width: `${importProgress.percentage}%` }}
                ></div>
              </div>
              <p className="import-dialog__progress-text">{importProgress.message}</p>
            </div>
          )}

          {showSummary && importSummary && (
            <div className="import-dialog__summary">
              <h3 className="import-dialog__summary-title">
                {importSummary.errors.length > 0 ? 'Resumen de Importación (Con Errores)' : 'Resumen de Importación Exitosa'}
              </h3>
              
              <div className="import-dialog__summary-stats">
                <div className="import-dialog__stat">
                  <span className="import-dialog__stat-label">Total de registros:</span>
                  <span className="import-dialog__stat-value">{importSummary.totalRecords}</span>
                </div>
                <div className="import-dialog__stat import-dialog__stat--success">
                  <span className="import-dialog__stat-label">Importados exitosamente:</span>
                  <span className="import-dialog__stat-value">{importSummary.successfulImports}</span>
                </div>
                <div className="import-dialog__stat import-dialog__stat--error">
                  <span className="import-dialog__stat-label">Fallos:</span>
                  <span className="import-dialog__stat-value">{importSummary.failedImports}</span>
                </div>
                <div className="import-dialog__stat">
                  <span className="import-dialog__stat-label">Registros creados:</span>
                  <span className="import-dialog__stat-value">{importSummary.createdRecords}</span>
                </div>
                <div className="import-dialog__stat">
                  <span className="import-dialog__stat-label">Registros actualizados:</span>
                  <span className="import-dialog__stat-value">{importSummary.updatedRecords}</span>
                </div>
              </div>

              {importSummary.errors.length > 0 && (
                <div className="import-dialog__errors">
                  <h4 className="import-dialog__errors-title">Errores encontrados:</h4>
                  <div className="import-dialog__errors-list">
                    {importSummary.errors.map((error, index) => (
                      <div key={index} className="import-dialog__error-item">
                        <div className="import-dialog__error-type">{error.type}</div>
                        <div className="import-dialog__error-message">{error.message}</div>
                        {error.details && error.details.length > 0 && (
                          <div className="import-dialog__error-details">
                            {error.details.join(' - ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importSummary.warnings.length > 0 && (
                <div className="import-dialog__warnings">
                  <h4 className="import-dialog__warnings-title">Advertencias:</h4>
                  <div className="import-dialog__warnings-list">
                    {importSummary.warnings.map((warning, index) => (
                      <div key={index} className="import-dialog__warning-item">
                        {warning}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importSummary.backupId && (
                <div className="import-dialog__backup-info">
                  <h4 className="import-dialog__backup-title">Información de Respaldo:</h4>
                  <div className="import-dialog__backup-details">
                    <div className="import-dialog__backup-id">
                      <strong>ID de Respaldo:</strong> {importSummary.backupId}
                    </div>
                    <div className="import-dialog__backup-note">
                      Se creó un respaldo automático antes de la importación. 
                      {importSummary.canRollback ? ' Puedes usar el botón de rollback para restaurar los datos.' : ' El rollback ya no está disponible.'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="import-dialog__actions">
          {showSummary ? (
            <>
              {importSummary?.canRollback && (
                <button
                  type="button"
                  className="import-dialog__button import-dialog__button--danger"
                  onClick={handleRollback}
                  disabled={isImporting || isRollingBack}
                >
                  {isRollingBack ? 'Realizando Rollback...' : 'Rollback'}
                </button>
              )}
              <button
                type="button"
                className="import-dialog__button import-dialog__button--secondary"
                onClick={handleNewImport}
                disabled={isImporting || isRollingBack}
              >
                Nueva Importación
              </button>
              <button
                type="button"
                className="import-dialog__button import-dialog__button--primary"
                onClick={handleClose}
                disabled={isImporting || isRollingBack}
              >
                Cerrar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="import-dialog__button import-dialog__button--secondary"
                onClick={handleClose}
                disabled={isImporting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="import-dialog__button import-dialog__button--primary"
                onClick={handleImport}
                disabled={isImporting}
              >
                {isImporting ? 'Importando...' : 'Importar'}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default ImportDialog