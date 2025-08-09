import React, { useState } from 'react'
import Modal from '../common/Modal'
import { useNotification } from '../../hooks/useNotification'
import {
  exportUsers,
  exportBudgets,
  exportQuotas,
  exportInterests,
  exportComplete,
  showSaveDialog
} from '../../services/ExportService'
import './ExportDialog.css'

interface ExportOptions {
  users: boolean
  budgets: boolean
  quotas: boolean
  interests: boolean
  complete: boolean
}

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    users: false,
    budgets: false,
    quotas: false,
    interests: false,
    complete: false
  })
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<string>('')
  const [selectedPath, setSelectedPath] = useState<string>('')
  const { addNotification } = useNotification()

  const handleOptionChange = (option: keyof ExportOptions) => {
    setExportOptions((prev) => {
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
  }

  const handleSelectLocation = async () => {
    try {
      const isCompleteExport = exportOptions.complete
      const filters = isCompleteExport
        ? [{ name: 'Archivos ZIP', extensions: ['zip'] }]
        : [{ name: 'Archivos CSV', extensions: ['csv'] }]

      const result = await showSaveDialog({
        title: 'Seleccionar ubicación para guardar',
        defaultPath: isCompleteExport ? 'exportacion_completa.zip' : 'exportacion.csv',
        filters
      })

      if (result.success && result.data) {
        setSelectedPath(result.data)
      }
    } catch (error) {
      console.error('Error selecting save location:', error)
      addNotification({
        type: 'error',
        message: 'Error al seleccionar ubicación de guardado'
      })
    }
  }

  const handleExport = async () => {
    const selectedOptions = Object.entries(exportOptions).filter(([_, selected]) => selected)

    if (selectedOptions.length === 0) {
      addNotification({
        type: 'warning',
        message: 'Por favor selecciona al menos una opción de exportación'
      })

      return
    }

    // Si no se ha seleccionado una ubicación, usar la predeterminada
    let savePath = selectedPath || undefined

    setIsExporting(true)
    setExportProgress('Iniciando exportación...')

    try {
      const exportPromises: Promise<{ type: string; response: any }>[] = []

      if (exportOptions.complete) {
        setExportProgress('Exportando datos completos...')
        exportPromises.push(
          exportComplete(savePath).then((response) => ({
            type: 'complete',
            response
          }))
        )
      } else {
        if (exportOptions.users) {
          setExportProgress('Exportando usuarios...')
          const userPath = savePath ? savePath.replace(/\.[^/.]+$/, '_usuarios.csv') : undefined
          exportPromises.push(
            exportUsers(userPath).then((response) => ({
              type: 'users',
              response
            }))
          )
        }

        if (exportOptions.budgets) {
          setExportProgress('Exportando presupuestos...')
          const budgetPath = savePath
            ? savePath.replace(/\.[^/.]+$/, '_presupuestos.csv')
            : undefined
          exportPromises.push(
            exportBudgets(budgetPath).then((response) => ({
              type: 'budgets',
              response
            }))
          )
        }

        if (exportOptions.quotas) {
          setExportProgress('Exportando cuotas...')
          const quotaPath = savePath ? savePath.replace(/\.[^/.]+$/, '_cuotas.csv') : undefined
          exportPromises.push(
            exportQuotas(quotaPath).then((response) => ({
              type: 'quotas',
              response
            }))
          )
        }

        if (exportOptions.interests) {
          setExportProgress('Exportando configuraciones de interés...')
          const interestPath = savePath
            ? savePath.replace(/\.[^/.]+$/, '_intereses.csv')
            : undefined
          exportPromises.push(
            exportInterests(interestPath).then((response) => ({
              type: 'interests',
              response
            }))
          )
        }
      }

      const results = await Promise.all(exportPromises)

      // Check if all exports were successful
      const failedExports = results.filter((result) => !result.response.success)

      if (failedExports.length > 0) {
        const errorMessages = failedExports
          .map((failed) => `${failed.type}: ${failed.response.error || 'Error desconocido'}`)
          .join(', ')

        addNotification({
          type: 'error',
          message: `Error en exportación: ${errorMessages}`
        })
      } else {
        const successCount = results.length
        const exportTypes = results.map((result) => result.type).join(', ')

        addNotification({
          type: 'success',
          message: `Exportación exitosa: ${successCount} archivo(s) generado(s) (${exportTypes})`
        })

        // Reset form and close dialog
        setExportOptions({
          users: false,
          budgets: false,
          quotas: false,
          interests: false,
          complete: false
        })
        setSelectedPath('')
        onClose()
      }
    } catch (error) {
      console.error('Export error:', error)
      addNotification({
        type: 'error',
        message: 'Error inesperado durante la exportación'
      })
    } finally {
      setIsExporting(false)
      setExportProgress('')
    }
  }

  const handleClose = () => {
    if (!isExporting) {
      setExportOptions({
        users: false,
        budgets: false,
        quotas: false,
        interests: false,
        complete: false
      })
      setExportProgress('')
      setSelectedPath('')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Exportar Datos" size="medium">
      <div className="export-dialog">
        <div className="export-dialog__content">
          <p className="export-dialog__description">
            Selecciona los datos que deseas exportar. Los archivos se guardarán en formato CSV.
          </p>

          <div className="export-dialog__location">
            <h3 className="export-dialog__section-title">Ubicación de Guardado</h3>
            <div className="export-dialog__location-controls">
              <button
                type="button"
                className="export-dialog__location-button"
                onClick={handleSelectLocation}
                disabled={isExporting}
                aria-label="Seleccionar ubicación donde guardar los archivos"
              >
                📁 Seleccionar Ubicación
              </button>
              {selectedPath && (
                <div className="export-dialog__selected-path">
                  <span className="export-dialog__path-label">Guardar en:</span>
                  <span className="export-dialog__path-value" title={selectedPath}>
                    {selectedPath}
                  </span>
                </div>
              )}
              {!selectedPath && (
                <small className="export-dialog__path-hint">
                  Si no seleccionas una ubicación, se usará la carpeta predeterminada
                </small>
              )}
            </div>
          </div>

          <div className="export-dialog__options">
            <div className="export-dialog__section">
              <h3 className="export-dialog__section-title">Exportación Individual</h3>

              <label className="export-dialog__option">
                <input
                  type="checkbox"
                  checked={exportOptions.users}
                  onChange={() => handleOptionChange('users')}
                  disabled={isExporting || exportOptions.complete}
                />
                <span className="export-dialog__option-text">
                  <strong>Usuarios</strong>
                  <small>Exportar todos los usuarios registrados</small>
                </span>
              </label>

              <label className="export-dialog__option">
                <input
                  type="checkbox"
                  checked={exportOptions.budgets}
                  onChange={() => handleOptionChange('budgets')}
                  disabled={isExporting || exportOptions.complete}
                />
                <span className="export-dialog__option-text">
                  <strong>Presupuestos</strong>
                  <small>Exportar todos los presupuestos</small>
                </span>
              </label>

              <label className="export-dialog__option">
                <input
                  type="checkbox"
                  checked={exportOptions.quotas}
                  onChange={() => handleOptionChange('quotas')}
                  disabled={isExporting || exportOptions.complete}
                />
                <span className="export-dialog__option-text">
                  <strong>Cuotas</strong>
                  <small>Exportar todas las cuotas de presupuestos</small>
                </span>
              </label>

              <label className="export-dialog__option">
                <input
                  type="checkbox"
                  checked={exportOptions.interests}
                  onChange={() => handleOptionChange('interests')}
                  disabled={isExporting || exportOptions.complete}
                />
                <span className="export-dialog__option-text">
                  <strong>Configuraciones de Interés</strong>
                  <small>Exportar configuraciones de tasas de interés</small>
                </span>
              </label>
            </div>

            <div className="export-dialog__divider">
              <span>o</span>
            </div>

            <div className="export-dialog__section">
              <h3 className="export-dialog__section-title">Exportación Completa</h3>

              <label className="export-dialog__option export-dialog__option--complete">
                <input
                  type="checkbox"
                  checked={exportOptions.complete}
                  onChange={() => handleOptionChange('complete')}
                  disabled={isExporting}
                />
                <span className="export-dialog__option-text">
                  <strong>Exportación Completa</strong>
                  <small>Exportar todos los datos en un archivo ZIP</small>
                </span>
              </label>
            </div>
          </div>

          {isExporting && (
            <div className="export-dialog__progress">
              <div className="export-dialog__progress-bar">
                <div className="export-dialog__progress-indicator"></div>
              </div>
              <p className="export-dialog__progress-text">{exportProgress}</p>
            </div>
          )}
        </div>

        <div className="export-dialog__actions">
          <button
            type="button"
            className="export-dialog__button export-dialog__button--secondary"
            onClick={handleClose}
            disabled={isExporting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="export-dialog__button export-dialog__button--primary"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exportando...' : 'Exportar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ExportDialog
