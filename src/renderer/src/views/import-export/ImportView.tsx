import React, { useState } from 'react'
import { ImportDialog } from '../../components/forms'

const ImportView: React.FC = () => {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  const handleOpenImportDialog = () => {
    setIsImportDialogOpen(true)
  }

  const handleCloseImportDialog = () => {
    setIsImportDialogOpen(false)
  }

  return (
    <div style={{ padding: '8px' }}>
      <div style={{ width: '100%', margin: '0' }}>
        <h2 style={{ marginBottom: '16px', color: '#1f2937' }}>Importación de Datos</h2>
        <p style={{ marginBottom: '24px', color: '#6b7280', lineHeight: '1.5' }}>
          Utiliza esta funcionalidad para importar datos al sistema desde archivos CSV o ZIP. Puedes
          importar usuarios, presupuestos, cuotas, configuraciones de interés o todos los datos
          juntos.
        </p>

        <button
          onClick={handleOpenImportDialog}
          style={{
            backgroundColor: '#10b981',
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
            e.currentTarget.style.backgroundColor = '#059669'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#10b981'
          }}
        >
          Abrir Importador
        </button>

        <ImportDialog isOpen={isImportDialogOpen} onClose={handleCloseImportDialog} />
      </div>
    </div>
  )
}

export default ImportView
