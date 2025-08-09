import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAllBudgets, getBudgetById, Budget } from '../../services/BudgetService'
import { createQuota, CreateQuotaDto } from '../../services/QuotaService'
import { LoadingSpinner } from '../../components/common'
import './QuotaCreateView.css'

const QuotaCreateView: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedBudgetId = searchParams.get('budgetId')

  const [budgets, setBudgets] = useState<Budget[]>([])
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [formData, setFormData] = useState<CreateQuotaDto>({
    amount: 0,
    budgetId: preselectedBudgetId || ''
  })
  const [loading, setLoading] = useState(false)
  const [loadingBudgets, setLoadingBudgets] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadBudgets()
  }, [])

  useEffect(() => {
    if (preselectedBudgetId && budgets.length > 0) {
      const budget = budgets.find(b => b.id === preselectedBudgetId)
      if (budget) {
        setSelectedBudget(budget)
        setFormData(prev => ({ ...prev, budgetId: preselectedBudgetId }))
      }
    }
  }, [preselectedBudgetId, budgets])

  const loadBudgets = async () => {
    try {
      setLoadingBudgets(true)
      const response = await getAllBudgets()
      if (response.success) {
        // Filtrar solo presupuestos activos
        const activeBudgets = (response.data || []).filter(
          budget => budget.currentStatus === 'ACTIVE'
        )
        setBudgets(activeBudgets)
      } else {
        setError(response.error || 'Error al cargar presupuestos')
      }
    } catch (err) {
      setError('Error al cargar presupuestos')
    } finally {
      setLoadingBudgets(false)
    }
  }

  const handleBudgetChange = async (budgetId: string) => {
    setFormData(prev => ({ ...prev, budgetId }))
    
    if (budgetId) {
      try {
        const response = await getBudgetById(budgetId)
        if (response.success && response.data) {
          setSelectedBudget(response.data)
        }
      } catch (err) {
        console.error('Error loading budget details:', err)
      }
    } else {
      setSelectedBudget(null)
    }

    // Limpiar error de validación
    if (validationErrors.budgetId) {
      setValidationErrors(prev => ({ ...prev, budgetId: '' }))
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Validar presupuesto seleccionado
    if (!formData.budgetId) {
      errors.budgetId = 'Debe seleccionar un presupuesto'
    }

    // Validar monto
    if (!formData.amount || formData.amount <= 0) {
      errors.amount = 'El monto debe ser mayor a 0'
    } else if (selectedBudget) {
      const totalPaid = selectedBudget.quotaList?.reduce((sum, quota) => sum + quota.amount, 0) || 0
      const remainingAmount = selectedBudget.totalAmount - totalPaid
      
      if (formData.amount > remainingAmount) {
        errors.amount = `El monto no puede exceder el saldo pendiente ($${remainingAmount.toLocaleString()})`
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await createQuota(formData)

      if (response.success) {
        navigate('/quotas')
      } else {
        setError(response.error || 'Error al crear cuota')
      }
    } catch (err) {
      setError('Error al crear cuota')
    } finally {
      setLoading(false)
    }
  }

  const handleAmountChange = (value: string) => {
    const numericValue = parseFloat(value) || 0
    setFormData(prev => ({ ...prev, amount: numericValue }))
    
    // Limpiar error de validación
    if (validationErrors.amount) {
      setValidationErrors(prev => ({ ...prev, amount: '' }))
    }
  }

  const getTotalPaid = (): number => {
    return selectedBudget?.quotaList?.reduce((sum, quota) => sum + quota.amount, 0) || 0
  }

  const getRemainingAmount = (): number => {
    if (!selectedBudget) return 0
    return selectedBudget.totalAmount - getTotalPaid()
  }

  const getMonthlyPayment = (): number => {
    if (!selectedBudget) return 0
    return selectedBudget.totalAmount / selectedBudget.paymentTerm
  }

  if (loadingBudgets) {
    return <LoadingSpinner size="large" message="Cargando presupuestos..." />
  }

  return (
    <div className="quota-create-view">
      <div className="view-header">
        <h1>Agregar Nueva Cuota</h1>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/quotas')}
        >
          Volver
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="empty-state">
          <h3>No hay presupuestos activos disponibles</h3>
          <p>Debe tener presupuestos activos para poder agregar cuotas.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/budgets/create')}
          >
            Crear Presupuesto
          </button>
        </div>
      ) : (
        <div className="form-container">
          <form onSubmit={handleSubmit} className="quota-form">
            <div className="form-group">
              <label htmlFor="budgetId">
                Presupuesto <span className="required">*</span>
              </label>
              <select
                id="budgetId"
                value={formData.budgetId}
                onChange={(e) => handleBudgetChange(e.target.value)}
                className={validationErrors.budgetId ? 'error' : ''}
                disabled={loading}
              >
                <option value="">Seleccionar presupuesto...</option>
                {budgets.map((budget) => (
                  <option key={budget.id} value={budget.id}>
                    {budget.code} - {budget.user?.nombre} - ${budget.totalAmount.toLocaleString()}
                  </option>
                ))}
              </select>
              {validationErrors.budgetId && (
                <span className="error-text">{validationErrors.budgetId}</span>
              )}
            </div>

            {selectedBudget && (
              <div className="budget-details">
                <h3>Detalles del Presupuesto</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="label">Código:</span>
                    <span className="value">{selectedBudget.code}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Usuario:</span>
                    <span className="value">{selectedBudget.user?.nombre}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Monto Total:</span>
                    <span className="value">${selectedBudget.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Plazo:</span>
                    <span className="value">{selectedBudget.paymentTerm} meses</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Cuota Mensual Sugerida:</span>
                    <span className="value">${getMonthlyPayment().toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Total Pagado:</span>
                    <span className="value">${getTotalPaid().toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Saldo Pendiente:</span>
                    <span className="value highlight">${getRemainingAmount().toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Cuotas Pagadas:</span>
                    <span className="value">{selectedBudget.quotaList?.length || 0}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="amount">
                Monto de la Cuota <span className="required">*</span>
              </label>
              <div className="amount-input-container">
                <span className="currency-symbol">$</span>
                <input
                  type="number"
                  id="amount"
                  min="0.01"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className={validationErrors.amount ? 'error' : ''}
                  disabled={loading || !selectedBudget}
                  placeholder="0.00"
                />
              </div>
              {validationErrors.amount && (
                <span className="error-text">{validationErrors.amount}</span>
              )}
              {selectedBudget && (
                <div className="amount-suggestions">
                  <button
                    type="button"
                    className="suggestion-btn"
                    onClick={() => handleAmountChange(getMonthlyPayment().toString())}
                    disabled={loading}
                  >
                    Cuota Mensual (${getMonthlyPayment().toLocaleString()})
                  </button>
                  <button
                    type="button"
                    className="suggestion-btn"
                    onClick={() => handleAmountChange(getRemainingAmount().toString())}
                    disabled={loading}
                  >
                    Saldo Completo (${getRemainingAmount().toLocaleString()})
                  </button>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/quotas')}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !selectedBudget}
              >
                {loading ? 'Creando...' : 'Crear Cuota'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default QuotaCreateView