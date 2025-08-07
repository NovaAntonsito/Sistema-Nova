import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'
import './Toolbar.css'

export interface ToolbarProps {
  onCreateUser?: () => void
  onCreateBudget?: () => void
  onExport?: () => void
  onImport?: () => void
}

const Toolbar: React.FC<ToolbarProps> = ({ onCreateUser, onCreateBudget, onExport, onImport }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleCreateUser = () => {
    if (onCreateUser) {
      onCreateUser()
    } else {
      navigate(ROUTES.USERS)
    }
  }

  const handleCreateBudget = () => {
    if (onCreateBudget) {
      onCreateBudget()
    } else {
      navigate(ROUTES.BUDGETS)
    }
  }

  const handleExport = () => {
    if (onExport) {
      onExport()
    } else {
      navigate(ROUTES.IMPORT_EXPORT)
    }
  }

  const handleImport = () => {
    if (onImport) {
      onImport()
    } else {
      navigate(ROUTES.IMPORT_EXPORT)
    }
  }

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <div className="toolbar">
      <div className="toolbar-container">
        <div className="toolbar-brand">
          <button
            className="toolbar-brand-button"
            onClick={() => navigate(ROUTES.HOME)}
            aria-label="Ir al inicio"
          >
            <span className="toolbar-brand-text">Sistema Nova</span>
          </button>
        </div>

        <nav className="toolbar-nav" role="navigation" aria-label="Navegación principal">
          <div className="toolbar-actions">
            <button
              className={`toolbar-button ${isActive(ROUTES.USERS) ? 'active' : ''}`}
              onClick={handleCreateUser}
              aria-label="Creación de usuarios"
              title="Creación de usuarios"
            >
              <span className="toolbar-button-icon">👤</span>
              <span className="toolbar-button-text">Usuarios</span>
            </button>

            <button
              className={`toolbar-button ${isActive(ROUTES.BUDGETS) ? 'active' : ''}`}
              onClick={handleCreateBudget}
              aria-label="Creación de presupuestos"
              title="Creación de presupuestos"
            >
              <span className="toolbar-button-icon">💰</span>
              <span className="toolbar-button-text">Presupuestos</span>
            </button>

            <button
              className={`toolbar-button ${isActive(ROUTES.IMPORT_EXPORT) ? 'active' : ''}`}
              onClick={handleExport}
              aria-label="Exportación de datos"
              title="Exportación de datos"
            >
              <span className="toolbar-button-icon">📤</span>
              <span className="toolbar-button-text">Exportar</span>
            </button>

            <button
              className={`toolbar-button ${isActive(ROUTES.IMPORT_EXPORT) ? 'active' : ''}`}
              onClick={handleImport}
              aria-label="Importación de datos"
              title="Importación de datos"
            >
              <span className="toolbar-button-icon">📥</span>
              <span className="toolbar-button-text">Importar</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}

export default Toolbar
