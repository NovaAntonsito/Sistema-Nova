import React, { useState, useEffect } from 'react'

interface Budget {
  id: string
  code: string
  totalAmount: number
  currentInterest: number
  paymentTerm: number
  currentStatus: string
  _creationDate: string
  _expirationDate: string
  user: {
    id: string
    nombre: string
    apellido?: string
    phoneNumber: string
  }
}

interface ViewBudgetsProps {
  onBack: () => void
}

const ViewBudgets: React.FC<ViewBudgetsProps> = ({ onBack }) => {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [filteredBudgets, setFilteredBudgets] = useState<Budget[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadBudgets()
  }, [])

  useEffect(() => {
    filterBudgets()
  }, [budgets, searchTerm, statusFilter])

  const loadBudgets = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('budget:getAll')
      if (result.success) {
        setBudgets(result.data)
      } else {
        setError('Error al cargar presupuestos')
      }
    } catch (error) {
      console.error('Error cargando presupuestos:', error)
      setError('Error de conexión al cargar presupuestos')
    } finally {
      setIsLoading(false)
    }
  }

  const filterBudgets = () => {
    let filtered = budgets

    // Filtrar por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter((budget) => budget.currentStatus === statusFilter)
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter((budget) => {
        const clientName = `${budget.user.nombre} ${budget.user.apellido || ''}`.toLowerCase()
        const code = budget.code.toLowerCase()
        const phone = budget.user.phoneNumber.toLowerCase()

        return clientName.includes(search) || code.includes(search) || phone.includes(search)
      })
    }

    setFilteredBudgets(filtered)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value)
  }

  const getClientDisplayName = (user: Budget['user']) => {
    return user.apellido ? `${user.nombre} ${user.apellido}` : user.nombre
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-active'
      case 'pending':
        return 'status-pending'
      case 'completed':
        return 'status-completed'
      case 'cancelled':
        return 'status-cancelled'
      default:
        return 'status-default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Activo'
      case 'pending':
        return 'Pendiente'
      case 'completed':
        return 'Completado'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="view-container">
        <div className="form-header">
          <button className="back-btn" onClick={onBack}>
            ← Volver
          </button>
          <h2>Cargando presupuestos...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="view-container">
      <div className="form-header">
        <button className="back-btn" onClick={onBack}>
          ← Volver
        </button>
        <h2>Gestión de Presupuestos</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="filters-section">
        <div className="search-section">
          <input
            type="text"
            placeholder="Buscar por cliente, código o teléfono..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="status-filter"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="pending">Pendientes</option>
            <option value="completed">Completados</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>

        <div className="results-count">
          {filteredBudgets.length} presupuesto{filteredBudgets.length !== 1 ? 's' : ''} encontrado
          {filteredBudgets.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="budgets-grid">
        {filteredBudgets.length === 0 ? (
          <div className="no-results">
            {searchTerm || statusFilter !== 'all'
              ? 'No se encontraron presupuestos con ese criterio'
              : 'No hay presupuestos registrados'}
          </div>
        ) : (
          filteredBudgets.map((budget) => (
            <div key={budget.id} className="budget-card">
              <div className="budget-header">
                <div>
                  <h3>#{budget.code}</h3>
                  <p className="client-name">{getClientDisplayName(budget.user)}</p>
                </div>
                <span className={`status-badge ${getStatusColor(budget.currentStatus)}`}>
                  {getStatusText(budget.currentStatus)}
                </span>
              </div>

              <div className="budget-details">
                <div className="detail-row">
                  <div className="detail-item">
                    <strong>💰 Monto:</strong> {formatCurrency(budget.totalAmount)}
                  </div>
                  <div className="detail-item">
                    <strong>📈 Interés:</strong> {budget.currentInterest}%
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-item">
                    <strong>📅 Plazo:</strong> {budget.paymentTerm} meses
                  </div>
                  <div className="detail-item">
                    <strong>📞 Teléfono:</strong> {budget.user.phoneNumber}
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-item">
                    <strong>🗓️ Creado:</strong> {formatDate(budget._creationDate)}
                  </div>
                  <div className="detail-item">
                    <strong>⏰ Vence:</strong> {formatDate(budget._expirationDate)}
                  </div>
                </div>
              </div>

              <div className="budget-actions">
                <button className="btn-secondary">Editar</button>
                <button className="btn-primary">Ver Detalles</button>
                <button className="btn-info">Generar PDF</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ViewBudgets
