import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllBudgets, Budget } from '../../services/BudgetService'
import { LoadingSpinner } from '../../components/common'
import './QuotaListView.css'

const QuotaListView: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadBudgets()
  }, [])

  const loadBudgets = async () => {
    try {
      setLoading(true)
      const response = await getAllBudgets()
      if (response.success) {
        setBudgets(response.data || [])
      } else {
        setError(response.error || 'Error al cargar presupuestos')
      }
    } catch (err) {
      setError('Error al cargar presupuestos')
    } finally {
      setLoading(false)
    }
  }

  const getTotalQuotas = (budget: Budget): number => {
    return budget.quotaList?.length || 0
  }

  const getTotalQuotaAmount = (budget: Budget): number => {
    return budget.quotaList?.reduce((sum, quota) => sum + quota.amount, 0) || 0
  }

  if (loading) {
    return <LoadingSpinner size="large" message="Cargando presupuestos..." />
  }

  return (
    <div className="quota-list-view">
      <div className="view-header">
        <h1>Gestión de Cuotas</h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/quotas/create')}
        >
          Agregar Cuota
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="quota-container">
        {budgets.length === 0 ? (
          <div className="empty-state">
            <h3>No hay presupuestos disponibles</h3>
            <p>Debe crear presupuestos antes de poder gestionar cuotas.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/budgets/create')}
            >
              Crear Presupuesto
            </button>
          </div>
        ) : (
          <div className="budgets-grid">
            {budgets.map((budget) => (
              <div key={budget.id} className="budget-card">
                <div className="budget-header">
                  <h3>Presupuesto {budget.code}</h3>
                  <span className={`status-badge status-${budget.currentStatus.toLowerCase()}`}>
                    {budget.currentStatus}
                  </span>
                </div>
                
                <div className="budget-info">
                  <div className="info-item">
                    <span className="label">Usuario:</span>
                    <span className="value">{budget.user?.nombre || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Monto Total:</span>
                    <span className="value">${budget.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Plazo:</span>
                    <span className="value">{budget.paymentTerm} meses</span>
                  </div>
                </div>

                <div className="quota-summary">
                  <div className="summary-item">
                    <span className="label">Cuotas Pagadas:</span>
                    <span className="value">{getTotalQuotas(budget)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Total Pagado:</span>
                    <span className="value">${getTotalQuotaAmount(budget).toLocaleString()}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Saldo Pendiente:</span>
                    <span className="value">
                      ${(budget.totalAmount - getTotalQuotaAmount(budget)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="quota-actions">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setSelectedBudget(budget)}
                  >
                    Ver Cuotas
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate(`/quotas/create?budgetId=${budget.id}`)}
                  >
                    Agregar Cuota
                  </button>
                </div>

                {budget.quotaList && budget.quotaList.length > 0 && (
                  <div className="quota-list">
                    <h4>Últimas Cuotas:</h4>
                    {budget.quotaList.slice(-3).map((quota) => (
                      <div key={quota.id} className="quota-item">
                        <span className="quota-date">
                          {new Date(quota._creationDate).toLocaleDateString()}
                        </span>
                        <span className="quota-amount">
                          ${quota.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para ver todas las cuotas */}
      {selectedBudget && (
        <div className="modal-overlay" onClick={() => setSelectedBudget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cuotas del Presupuesto {selectedBudget.code}</h3>
              <button
                className="modal-close"
                onClick={() => setSelectedBudget(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {selectedBudget.quotaList && selectedBudget.quotaList.length > 0 ? (
                <div className="quota-details-list">
                  {selectedBudget.quotaList.map((quota) => (
                    <div key={quota.id} className="quota-detail-item">
                      <div className="quota-detail-date">
                        {new Date(quota._creationDate).toLocaleDateString()}
                      </div>
                      <div className="quota-detail-amount">
                        ${quota.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No hay cuotas registradas para este presupuesto.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuotaListView