import React, { useState, useEffect } from 'react'

interface UserStats {
  total: number
  active: number
  clients: number
  admins: number
  employees: number
  withLogin: number
}

const HomeStats: React.FC = () => {
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    clients: 0,
    admins: 0,
    employees: 0,
    withLogin: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // Intentar cargar estadísticas reales
      const result = await window.electron.ipcRenderer.invoke('user:getStatistics')
      if (result && result.success) {
        setStats(result.data)
        setError(false)
      } else {
        console.warn('Statistics handler not available, using fallback')
        await loadFallbackStats()
      }
    } catch (error) {
      console.warn('Statistics handler not available, using fallback:', error)
      await loadFallbackStats()
    } finally {
      setLoading(false)
    }
  }

  const loadFallbackStats = async () => {
    try {
      // Cargar estadísticas básicas usando endpoints existentes
      const clientsResult = await window.electron.ipcRenderer.invoke('user:getClients')
      const allUsersResult = await window.electron.ipcRenderer.invoke('user:getAll')

      if (clientsResult?.success && allUsersResult?.success) {
        const clients = clientsResult.data?.length || 0
        const total = allUsersResult.data?.length || 0
        const active = allUsersResult.data?.filter((u: any) => u.status === 'active')?.length || 0
        const withLogin = allUsersResult.data?.filter((u: any) => u.requiresLogin)?.length || 0

        setStats({
          total,
          active,
          clients,
          admins: 0, // No podemos calcular esto fácilmente
          employees: 0, // No podemos calcular esto fácilmente
          withLogin
        })
        setError(false)
      } else {
        setError(true)
      }
    } catch (err) {
      console.error('Error loading fallback stats:', err)
      setError(true)
    }
  }

  if (loading) {
    return (
      <div className="home-stats">
        <div className="stat-card">
          <h4>Cargando estadísticas...</h4>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="home-stats">
        <div className="stat-card">
          <h4>Estadísticas del Sistema</h4>
          <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
            No se pudieron cargar las estadísticas
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="home-stats">
      <div className="stat-card">
        <h4>Estadísticas del Sistema</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">{stats.clients}</span>
            <span className="stat-label">Clientes</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.active}</span>
            <span className="stat-label">Usuarios Activos</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.withLogin}</span>
            <span className="stat-label">Con Acceso al Sistema</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface HomeProps {
  onCreateClient: () => void
  onCreateBudget: () => void
  onViewBudgets: () => void
  onViewClients: () => void
  userName: string
}

const Home: React.FC<HomeProps> = ({
  onCreateClient,
  onCreateBudget,
  onViewBudgets,
  onViewClients,
  userName
}) => {
  return (
    <div className="home-container">
      <div className="home-header">
        <h1>Sistema de Gestión N.O.V.A</h1>
        <p>Panel Principal - Bienvenido {userName}</p>
      </div>

      <div className="home-actions">
        <div className="action-card" onClick={onCreateClient}>
          <div className="action-icon">👤</div>
          <h3>Crear Cliente</h3>
          <p>Registrar un nuevo cliente en el sistema</p>
        </div>

        <div className="action-card" onClick={onCreateBudget}>
          <div className="action-icon">📋</div>
          <h3>Crear Presupuesto</h3>
          <p>Generar un nuevo presupuesto para un cliente</p>
        </div>

        <div className="action-card" onClick={onViewBudgets}>
          <div className="action-icon">📊</div>
          <h3>Ver Presupuestos</h3>
          <p>Consultar y gestionar presupuestos existentes</p>
        </div>

        <div className="action-card" onClick={onViewClients}>
          <div className="action-icon">👥</div>
          <h3>Ver Clientes</h3>
          <p>Consultar y gestionar información de clientes</p>
        </div>
      </div>

      <HomeStats />
    </div>
  )
}

export default Home
