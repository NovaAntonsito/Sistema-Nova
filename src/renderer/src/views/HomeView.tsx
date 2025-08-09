import React from 'react'
import { useNavigate } from 'react-router-dom'
import './HomeView.css'

const HomeView: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="home-view">
      <div className="home-container">
        <h1 className="home-title">Sistema Nova - Entorno de Pruebas</h1>
        <p className="home-subtitle">
          Selecciona una opción para comenzar a probar las funcionalidades del sistema
        </p>

        <div className="home-buttons">
          <button className="home-btn home-btn-primary" onClick={() => navigate('/users/create')}>
            <span className="btn-icon">👤</span>
            <div className="btn-content">
              <h3>Creación de usuarios</h3>
              <p>Crear y gestionar usuarios del sistema</p>
            </div>
          </button>

          <button className="home-btn home-btn-primary" onClick={() => navigate('/budgets/create')}>
            <span className="btn-icon">💰</span>
            <div className="btn-content">
              <h3>Creación de Presupuestos</h3>
              <p>Crear y gestionar presupuestos</p>
            </div>
          </button>

          <button className="home-btn home-btn-primary" onClick={() => navigate('/interests')}>
            <span className="btn-icon">📈</span>
            <div className="btn-content">
              <h3>Configuración de Interés</h3>
              <p>Gestionar tasas de interés por plazo</p>
            </div>
          </button>

          <button className="home-btn home-btn-primary" onClick={() => navigate('/quotas')}>
            <span className="btn-icon">💳</span>
            <div className="btn-content">
              <h3>Gestión de Cuotas</h3>
              <p>Administrar pagos de presupuestos</p>
            </div>
          </button>

          <button className="home-btn home-btn-secondary" onClick={() => navigate('/users')}>
            <span className="btn-icon">👥</span>
            <div className="btn-content">
              <h3>Vistas de usuarios</h3>
              <p>Ver y administrar usuarios existentes</p>
            </div>
          </button>

          <button className="home-btn home-btn-secondary" onClick={() => navigate('/budgets')}>
            <span className="btn-icon">📊</span>
            <div className="btn-content">
              <h3>Vistas de Presupuestos</h3>
              <p>Ver y administrar presupuestos existentes</p>
            </div>
          </button>

          <button className="home-btn home-btn-secondary" onClick={() => navigate('/export')}>
            <span className="btn-icon">📤</span>
            <div className="btn-content">
              <h3>Exportar Datos</h3>
              <p>Exportar información del sistema</p>
            </div>
          </button>

          <button className="home-btn home-btn-secondary" onClick={() => navigate('/import')}>
            <span className="btn-icon">📥</span>
            <div className="btn-content">
              <h3>Importar Datos</h3>
              <p>Importar información al sistema</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default HomeView
