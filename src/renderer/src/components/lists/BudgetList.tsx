import React, { useState, useEffect, useMemo } from 'react'
import { 
  getAllBudgets, 
  deleteBudget,
  Budget 
} from '../../services/BudgetService'
import { getAllUsers, User } from '../../services/UserService'
import { Status } from '../../services/BudgetService'
import { useNotification } from '../../hooks/useNotification'
import './BudgetList.css'

interface BudgetListProps {
  onBudgetEdit?: (budget: Budget) => void
  onBudgetSelect?: (budget: Budget) => void
  refreshTrigger?: number // Used to trigger refresh from parent
}

const BudgetList: React.FC<BudgetListProps> = ({ onBudgetEdit, onBudgetSelect, refreshTrigger }) => {
  const { addNotification } = useNotification()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<Status | 'ALL'>('ALL')
  const [userFilter, setUserFilter] = useState<string>('ALL')
  const [sortField, setSortField] = useState<keyof Budget>('_creationDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Load budgets and users on component mount and when refreshTrigger changes
  useEffect(() => {
    loadData()
  }, [refreshTrigger])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load budgets and users in parallel
      const [budgetsResult, usersResult] = await Promise.all([
        getAllBudgets(),
        getAllUsers()
      ])

      if (budgetsResult.success && budgetsResult.data) {
        setBudgets(budgetsResult.data)
      } else {
        addNotification({
          type: 'error',
          message: budgetsResult.error || 'Error al cargar presupuestos'
        })
      }

      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data)
      } else {
        addNotification({
          type: 'error',
          message: usersResult.error || 'Error al cargar usuarios'
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
      addNotification({
        type: 'error',
        message: 'Error inesperado al cargar datos'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (budget: Budget) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el presupuesto "${budget.code}"?`)) {
      return
    }

    try {
      const result = await deleteBudget(budget.id)
      if (result.success) {
        addNotification({
          type: 'success',
          message: 'Presupuesto eliminado exitosamente'
        })
        // Remove budget from local state
        setBudgets(prev => prev.filter(b => b.id !== budget.id))
      } else {
        addNotification({
          type: 'error',
          message: result.error || 'Error al eliminar presupuesto'
        })
      }
    } catch (error) {
      console.error('Error deleting budget:', error)
      addNotification({
        type: 'error',
        message: 'Error inesperado al eliminar presupuesto'
      })
    }
  }

  const handleSort = (field: keyof Budget) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filter and sort budgets
  const filteredAndSortedBudgets = useMemo(() => {
    let filtered = budgets

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = budgets.filter(budget =>
        budget.code.toLowerCase().includes(term) ||
        budget.user?.nombre.toLowerCase().includes(term) ||
        budget.user?.email.toLowerCase().includes(term)
      )
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(budget => budget.currentStatus === statusFilter)
    }

    // Apply user filter
    if (userFilter !== 'ALL') {
      filtered = filtered.filter(budget => budget.user?.id === userFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle nested user fields
      if (sortField === 'user') {
        aValue = a.user?.nombre || ''
        bValue = b.user?.nombre || ''
      }

      // Handle date fields
      if (sortField === '_creationDate' || sortField === '_expirationDate' || sortField === 'updatedAt') {
        aValue = new Date(aValue as string).getTime()
        bValue = new Date(bValue as string).getTime()
      }

      // Handle string fields
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1
      }
      return 0
    })

    return filtered
  }, [budgets, searchTerm, statusFilter, userFilter, sortField, sortDirection])

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    })
  }

  const getStatusBadge = (status: Status) => {
    const statusConfig = {
      [Status.ACTIVE]: { label: 'Activo', className: 'status-active' },
      [Status.EXPIRED]: { label: 'Vencido', className: 'status-expired' },
      [Status.FINISHED]: { label: 'Terminado', className: 'status-finished' }
    }

    const config = statusConfig[status]
    return (
      <span className={`status-badge ${config.className}`}>
        {config.label}
      </span>
    )
  }

  const getSortIcon = (field: keyof Budget) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  if (isLoading) {
    return (
      <div className="budget-list">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando presupuestos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="budget-list">
      <div className="budget-list-header">
        <h3>Lista de Presupuestos ({budgets.length})</h3>
        <div className="budget-list-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Buscar por código, usuario o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-container">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Status | 'ALL')}
              className="filter-select"
            >
              <option value="ALL">Todos los estados</option>
              <option value={Status.ACTIVE}>Activo</option>
              <option value={Status.EXPIRED}>Vencido</option>
              <option value={Status.FINISHED}>Terminado</option>
            </select>
          </div>
          <div className="filter-container">
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">Todos los usuarios</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.nombre}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={loadData}
            className="btn btn--secondary btn--small"
            disabled={isLoading}
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {filteredAndSortedBudgets.length === 0 ? (
        <div className="empty-state">
          {searchTerm || statusFilter !== 'ALL' || userFilter !== 'ALL' ? (
            <p>No se encontraron presupuestos que coincidan con los filtros aplicados</p>
          ) : (
            <p>No hay presupuestos registrados</p>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="budget-table">
            <thead>
              <tr>
                <th
                  className="sortable"
                  onClick={() => handleSort('code')}
                >
                  Código {getSortIcon('code')}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort('user' as keyof Budget)}
                >
                  Usuario {getSortIcon('user' as keyof Budget)}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort('totalAmount')}
                >
                  Monto Total {getSortIcon('totalAmount')}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort('paymentTerm')}
                >
                  Plazo {getSortIcon('paymentTerm')}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort('currentStatus')}
                >
                  Estado {getSortIcon('currentStatus')}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort('_expirationDate')}
                >
                  Fecha Expiración {getSortIcon('_expirationDate')}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort('_creationDate')}
                >
                  Fecha Creación {getSortIcon('_creationDate')}
                </th>
                <th className="actions-column">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedBudgets.map(budget => (
                <tr
                  key={budget.id}
                  className="budget-row"
                  onClick={() => onBudgetSelect && onBudgetSelect(budget)}
                >
                  <td className="budget-code">{budget.code}</td>
                  <td className="budget-user">
                    <div className="user-info">
                      <div className="user-name">{budget.user?.nombre || 'N/A'}</div>
                      <div className="user-email">{budget.user?.email || ''}</div>
                    </div>
                  </td>
                  <td className="budget-amount">{formatCurrency(budget.totalAmount)}</td>
                  <td className="budget-term">{budget.paymentTerm} meses</td>
                  <td className="budget-status">{getStatusBadge(budget.currentStatus)}</td>
                  <td className="budget-expiration">{formatDate(budget._expirationDate)}</td>
                  <td className="budget-creation">{formatDate(budget._creationDate)}</td>
                  <td className="budget-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onBudgetEdit && onBudgetEdit(budget)
                      }}
                      className="btn btn--small btn--primary"
                      title="Editar presupuesto"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(budget)
                      }}
                      className="btn btn--small btn--danger"
                      title="Eliminar presupuesto"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default BudgetList