import React from 'react'

interface ToolbarProps {
  onCreateClient: () => void
  onCreateBudget: () => void
  onGoHome: () => void
  onLogout: () => void
  userName: string
}

const Toolbar: React.FC<ToolbarProps> = ({
  onCreateClient,
  onCreateBudget,
  onGoHome,
  onLogout,
  userName
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-btn home-btn" onClick={onGoHome}>
          🏠 Inicio
        </button>
        <button className="toolbar-btn" onClick={onCreateClient}>
          👤 Crear Cliente
        </button>
        <button className="toolbar-btn" onClick={onCreateBudget}>
          📋 Crear Presupuesto
        </button>
      </div>

      <div className="toolbar-right">
        <span className="user-welcome">Bienvenido, {userName}</span>
        <button className="toolbar-btn logout-btn" onClick={onLogout}>
          🚪 Cerrar Sesión
        </button>
      </div>
    </div>
  )
}

export default Toolbar
