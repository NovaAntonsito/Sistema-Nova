import React, { useState, useEffect } from 'react'
import { extractErrorMessage, getFriendlyErrorMessage } from '../utils/errorUtils'

interface Client {
  id: string
  nombre: string
  apellido?: string
  phoneNumber: string
}

interface CreateBudgetProps {
  onBack: () => void
  onBudgetCreated: () => void
}

const CreateBudget: React.FC<CreateBudgetProps> = ({ onBack, onBudgetCreated }) => {
  const [clients, setClients] = useState<Client[]>([])
  const [formData, setFormData] = useState({
    userId: '',
    baseAmount: '',
    paymentTerm: '',
    customExpirationDate: '',
    code: ''
  })
  const [calculatedInterest, setCalculatedInterest] = useState<number | null>(null)
  const [calculatedTotal, setCalculatedTotal] = useState<number | null>(null)
  const [calculatedExpirationDate, setCalculatedExpirationDate] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      console.log('Cargando clientes...')
      const result = await window.electron.ipcRenderer.invoke('user:getClients')
      console.log('Resultado de clientes:', result)

      if (result && result.success) {
        if (Array.isArray(result.data) && result.data.length > 0) {
          setClients(result.data)
          console.log(`${result.data.length} clientes cargados`)
        } else {
          setClients([])
          setError('No hay clientes registrados. Crea un cliente primero.')
        }
      } else {
        const errorMessage = extractErrorMessage(result, 'Error desconocido al cargar clientes')
        console.error('Error del backend:', result)
        setError(errorMessage)
      }
    } catch (error) {
      console.error('Error cargando clientes:', error)
      const errorMessage = getFriendlyErrorMessage(error)
      setError(errorMessage)
    } finally {
      setLoadingClients(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))

    // Si cambió el plazo de pago, recalcular interés y fecha de expiración
    if (name === 'paymentTerm' && value) {
      calculateInterestAndTotal(parseInt(value), parseFloat(formData.baseAmount) || 0)
      calculateExpirationDate(parseInt(value))
    }
    if (name === 'baseAmount' && value) {
      calculateInterestAndTotal(parseInt(formData.paymentTerm) || 0, parseFloat(value))
    }

    if (error) setError('')
    if (success) setSuccess('')
  }

  const calculateInterestAndTotal = (paymentTerm: number, baseAmount: number) => {
    if (!paymentTerm || !baseAmount) {
      setCalculatedInterest(null)
      setCalculatedTotal(null)
      return
    }

    try {
      // Tasas de interés según el plazo
      const interestRates = {
        1: 2.5, // 1 mes - 2.5%
        3: 5.0, // 3 meses - 5.0%
        6: 8.0, // 6 meses - 8.0%
        12: 12.0, // 12 meses - 12.0%
        18: 15.0, // 18 meses - 15.0%
        24: 18.0, // 24 meses - 18.0%
        36: 22.0, // 36 meses - 22.0%
        48: 25.0 // 48 meses - 25.0%
      }

      const interestRate = interestRates[paymentTerm as keyof typeof interestRates] || 10.0
      const totalAmount = baseAmount * (1 + interestRate / 100)

      setCalculatedInterest(interestRate)
      setCalculatedTotal(totalAmount)
    } catch (error) {
      console.error('Error calculando interés:', error)
      setCalculatedInterest(10.0)
      setCalculatedTotal(baseAmount * 1.1)
    }
  }

  const calculateExpirationDate = (paymentTerm: number) => {
    if (!paymentTerm) {
      setCalculatedExpirationDate('')
      return
    }

    try {
      // Calcular fecha de expiración basándose en el plazo de pago
      const expirationDate = new Date()
      expirationDate.setMonth(expirationDate.getMonth() + paymentTerm)

      // Formatear para mostrar y para el input date
      const formattedDate = expirationDate.toISOString().split('T')[0]
      setCalculatedExpirationDate(formattedDate)

      // Actualizar el campo customExpirationDate automáticamente
      setFormData((prev) => ({
        ...prev,
        customExpirationDate: formattedDate
      }))
    } catch (error) {
      console.error('Error calculando fecha de expiración:', error)
      setCalculatedExpirationDate('')
    }
  }

  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!formData.userId) {
      errors.push('Debe seleccionar un cliente')
    }

    if (!formData.baseAmount || parseFloat(formData.baseAmount) <= 0) {
      errors.push('El monto base debe ser mayor a 0')
    }

    if (!formData.paymentTerm || parseInt(formData.paymentTerm) <= 0) {
      errors.push('El plazo de pago debe ser mayor a 0')
    }

    // Validar que el plazo de pago sea uno de los valores permitidos
    const allowedTerms = [1, 3, 6, 12, 18, 24, 36, 48]
    if (!allowedTerms.includes(parseInt(formData.paymentTerm))) {
      errors.push('El plazo de pago debe ser uno de los valores permitidos')
    }

    // Validar fecha de expiración personalizada si se proporciona
    if (formData.customExpirationDate) {
      const customDate = new Date(formData.customExpirationDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (isNaN(customDate.getTime())) {
        errors.push('La fecha de expiración no es válida')
      } else if (customDate <= today) {
        errors.push('La fecha de expiración debe ser futura')
      }
    }

    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      // Validar formulario
      const validationErrors = validateForm()
      if (validationErrors.length > 0) {
        setError(validationErrors.join(', '))
        setIsLoading(false)
        return
      }

      console.log('Enviando datos del presupuesto:', formData)

      // Usar la fecha de expiración calculada basándose en el plazo de pago
      let expirationDate: Date
      if (formData.customExpirationDate) {
        expirationDate = new Date(formData.customExpirationDate)
      } else {
        // Calcular basándose en el plazo de pago
        expirationDate = new Date()
        expirationDate.setMonth(expirationDate.getMonth() + parseInt(formData.paymentTerm))
      }

      // Preparar datos según el DTO esperado
      const budgetData = {
        userId: formData.userId,
        baseAmount: parseFloat(formData.baseAmount),
        paymentTerm: parseInt(formData.paymentTerm),
        _expirationDate: expirationDate.toISOString(), // Enviar como string ISO
        code: formData.code.trim() || undefined // Opcional
      }

      console.log('Datos procesados:', budgetData)
      console.log('Fecha de expiración calculada:', expirationDate)

      const result = await window.electron.ipcRenderer.invoke('budget:create', budgetData)
      console.log('Resultado del backend:', result)

      if (result && result.success) {
        setSuccess('Presupuesto creado exitosamente')
        setFormData({
          userId: '',
          baseAmount: '',
          paymentTerm: '',
          customExpirationDate: '',
          code: ''
        })
        setCalculatedInterest(null)
        setCalculatedTotal(null)
        setCalculatedExpirationDate('')
        setTimeout(() => {
          onBudgetCreated()
        }, 2000)
      } else {
        console.error('Error del backend completo:', result)
        console.error('Tipo de result:', typeof result)
        console.error('Propiedades de result:', Object.keys(result || {}))

        const errorMessage = extractErrorMessage(result, 'Error desconocido al crear presupuesto')
        console.error('Mensaje de error extraído:', errorMessage)
        setError(errorMessage)
      }
    } catch (error) {
      console.error('Error creando presupuesto:', error)
      const errorMessage = getFriendlyErrorMessage(error)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getClientDisplayName = (client: Client) => {
    return client.apellido ? `${client.nombre} ${client.apellido}` : client.nombre
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <button className="back-btn" onClick={onBack}>
          ← Volver
        </button>
        <h2>Crear Nuevo Presupuesto</h2>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="budget-form two-column-form">
        <div className="form-columns">
          {/* Columna Izquierda - Datos Básicos */}
          <div className="form-column">
            <h3>👤 Cliente y Monto</h3>

            <div className="form-group">
              <label htmlFor="userId">Cliente *</label>
              {loadingClients ? (
                <div className="loading-message">
                  <span className="loading-spinner"></span>
                  Cargando clientes...
                </div>
              ) : (
                <select
                  id="userId"
                  name="userId"
                  value={formData.userId}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                >
                  <option value="">Seleccionar cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {getClientDisplayName(client)} - {client.phoneNumber}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="baseAmount">Monto Base *</label>
              <input
                type="number"
                id="baseAmount"
                name="baseAmount"
                value={formData.baseAmount}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                disabled={isLoading}
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="paymentTerm">Plazo de Pago *</label>
              <select
                id="paymentTerm"
                name="paymentTerm"
                value={formData.paymentTerm}
                onChange={handleChange}
                required
                disabled={isLoading}
              >
                <option value="">Seleccionar plazo</option>
                <option value="1">1 mes (2.5% interés)</option>
                <option value="3">3 meses (5.0% interés)</option>
                <option value="6">6 meses (8.0% interés)</option>
                <option value="12">12 meses (12.0% interés)</option>
                <option value="18">18 meses (15.0% interés)</option>
                <option value="24">24 meses (18.0% interés)</option>
                <option value="36">36 meses (22.0% interés)</option>
                <option value="48">48 meses (25.0% interés)</option>
              </select>
            </div>

            {calculatedInterest !== null && (
              <div className="form-group">
                <label>Interés Calculado</label>
                <div className="calculated-field highlight">{calculatedInterest}%</div>
              </div>
            )}
          </div>

          {/* Columna Derecha - Configuración */}
          <div className="form-column">
            <h3>⚙️ Configuración</h3>

            <div className="form-group">
              <label htmlFor="code">Código del Presupuesto</label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="Opcional - Se generará automáticamente"
              />
              <small className="form-help">Si no se especifica, se generará automáticamente</small>
            </div>

            <div className="form-group">
              <label htmlFor="customExpirationDate">Fecha de Expiración</label>
              <input
                type="date"
                id="customExpirationDate"
                name="customExpirationDate"
                value={formData.customExpirationDate}
                onChange={handleChange}
                disabled={isLoading}
                min={new Date().toISOString().split('T')[0]}
                className={calculatedExpirationDate ? 'auto-calculated' : ''}
              />
              <small className={`form-help ${calculatedExpirationDate ? 'calculated' : ''}`}>
                {calculatedExpirationDate
                  ? `Calculada automáticamente: ${parseInt(formData.paymentTerm || '0')} meses desde hoy`
                  : 'Se calculará automáticamente según el plazo de pago'}
              </small>
            </div>

            {/* Información calculada */}
            {calculatedTotal !== null && (
              <div className="calculation-summary">
                <h4>📊 Resumen de Cálculos</h4>
                <div className="calc-row">
                  <span>Monto Base:</span>
                  <strong>${parseFloat(formData.baseAmount || '0').toFixed(2)}</strong>
                </div>
                <div className="calc-row">
                  <span>Interés ({calculatedInterest}%):</span>
                  <strong>
                    ${(calculatedTotal - parseFloat(formData.baseAmount || '0')).toFixed(2)}
                  </strong>
                </div>
                <div className="calc-row total">
                  <span>Total a Pagar:</span>
                  <strong>${calculatedTotal.toFixed(2)}</strong>
                </div>
                <div className="calc-row">
                  <span>Cuota Mensual:</span>
                  <strong>
                    ${(calculatedTotal / parseInt(formData.paymentTerm || '1')).toFixed(2)}
                  </strong>
                </div>
                {calculatedExpirationDate && (
                  <div className="calc-row">
                    <span>Fecha de Expiración:</span>
                    <strong>
                      {new Date(calculatedExpirationDate).toLocaleDateString('es-ES')}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="form-actions-full">
          <button type="button" onClick={onBack} disabled={isLoading}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={isLoading || loadingClients}>
            {isLoading ? 'Creando...' : 'Crear Presupuesto'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateBudget
