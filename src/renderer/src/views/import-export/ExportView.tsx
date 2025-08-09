import React, { useState } from 'react'
import { ExportDialog } from '../../components/forms'

const ExportView: React.FC = () => {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)

  const handleOpenExportDialog = () => {
    setIsExportDialogOpen(true)
  }

  const handleCloseExportDialog = () => {
    setIsExportDialogOpen(false)
  }

  return (
    <div style={{ padding: '8px' }}>
      <div style={{ width: '100%', margin: '0' }}>
        <h2 style={{ marginBottom: '16px', color: '#1f2937' }}>Exportación de Datos</h2>
        <p style={{ marginBottom: '24px', color: '#6b7280', lineHeight: '1.5' }}>
          Utiliza esta funcionalidad para exportar los datos del sistema en formato CSV. Puedes
          exportar usuarios, presupuestos, cuotas, configuraciones de interés o todos los datos
          juntos.
        </p>

        <button
          onClick={handleOpenExportDialog}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6'
          }}
        >
          Abrir Exportador
        </button>

        <ExportDialog isOpen={isExportDialogOpen} onClose={handleCloseExportDialog} />
      </div>
    </div>
  )
}

export default ExportView
