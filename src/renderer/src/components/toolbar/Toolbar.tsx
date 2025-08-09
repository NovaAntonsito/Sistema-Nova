import React from 'react'
import { useNavigate } from 'react-router-dom'
import './Toolbar.css'

interface ToolbarProps {
  onCreateUser?: () => void
  onCreateBudget?: () => void
  onManageInterests?: () => void
  onManageQuotas?: () => void
  onExport?: () => void
  onImport?: () => void
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onCreateUser, 
  onCreateBudget, 
  onManageInterests, 
  onManageQuotas, 
  onExport, 
  onImport 
}) => {
  const navigate = useNavigate()

  const handleCreateUser = () => {
    if (onCreateUser) {
      onCreateUser()
    } else {
      navigate('/users/create')
    }
  }

  const handleCreateBudget = () => {
    if (onCreateBudget) {
      onCreateBudget()
    } else {
      navigate('/budgets/create')
    }
  }

  const handleExport = () => {
    if (onExport) {
      onExport()
    } else {
      navigate('/export')
    }
  }

  const handleImport = () => {
    if (onImport) {
      onImport()
    } else {
      navigate('/import')
    }
  }

  const handleManageInterests = () => {
    if (onManageInterests) {
      onManageInterests()
    } else {
      navigate('/interests')
    }
  }

  const handleManageQuotas = () => {
    if (onManageQuotas) {
      onManageQuotas()
    } else {
      navigate('/quotas')
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar-container">
        <div className="toolbar-brand">
          <h1 onClick={() => navigate('/')} className="toolbar-title">
            Sistema Nova
          </h1>
        </div>

        <div className="toolbar-actions">
          <button
            className="toolbar-btn toolbar-btn-primary"
            onClick={handleCreateUser}
            title="Crear nuevo usuario"
          >
            <span className="btn-icon">👤</span>
            <span className="btn-text">Creación de usuarios</span>
          </button>

          <button
            className="toolbar-btn toolbar-btn-primary"
            onClick={handleCreateBudget}
            title="Crear nuevo presupuesto"
          >
            <span className="btn-icon">💰</span>
            <span className="btn-text">Creación de Presupuestos</span>
          </button>

          <button
            className="toolbar-btn toolbar-btn-primary"
            onClick={handleManageInterests}
            title="Gestionar configuraciones de interés"
          >
            <span className="btn-icon">📊</span>
            <span className="btn-text">Configuración de Interés</span>
          </button>

          <button
            className="toolbar-btn toolbar-btn-primary"
            onClick={handleManageQuotas}
            title="Gestionar cuotas de presupuestos"
          >
            <span className="btn-icon">💳</span>
            <span className="btn-text">Gestión de Cuotas</span>
          </button>

          <button
            className="toolbar-btn toolbar-btn-secondary"
            onClick={handleExport}
            title="Exportar datos"
          >
            <span className="btn-icon">📤</span>
            <span className="btn-text">Exportación</span>
          </button>

          <button
            className="toolbar-btn toolbar-btn-secondary"
            onClick={handleImport}
            title="Importar datos"
          >
            <span className="btn-icon">📥</span>
            <span className="btn-text">Importación</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Toolbar
