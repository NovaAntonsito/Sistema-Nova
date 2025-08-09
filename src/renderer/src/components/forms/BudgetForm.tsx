import React, { useState, useEffect } from 'react'
import {
  createBudget,
  updateBudget,
  Budget,
  CreateBudgetDto,
  UpdateBudgetDto,
  calculateTotalAmount,
  calculateMonthlyPayment,
  isCodeAvailable
} from '../../services/BudgetService'
import { getAllUsers, User } from '../../services/UserService'
import { validateBudgetForm, validateBudgetField, BudgetFormData } from '../../utils/validation'
import { useNotification } from '../../hooks/useNotification'
import './BudgetForm.css'

interface BudgetFormProps {
  budget?: Budget | null
  onSubmit?: (budget: Budget) => void
  onCancel?: () => void
  onSuccess?: (budget: Budget) => void
}

const BudgetForm: React.FC<BudgetFormProps> = ({ budget, onSubmit, onCancel, onSuccess }) => {
  const { addNotification } = useNotification()
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [calculatedValues, setCalculatedValues] = useState({
    totalAmount: 0,
    monthlyPayment: 0
  })

  const [formData, setFormData] = useState<BudgetFormData>({
    code: '',
    baseAmount: '',
    interestPercentage: '',
    paymentTerm: '',
    userId: '',
    _expirationDate: ''
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Load users on component mount
  useEffect(() => {
    loadUsers()
  }, [])

  // Initialize form data when budget prop changes
  useEffect(() => {
    if (budget) {
      const expirationDate = new Date(budget._expirationDate)
      const formattedDate = expirationDate.toISOString().split('T')[0]

      setFormData({
        code: budget.code || '',
        baseAmount: '', // Base amount is not directly available, would need to calculate
        interestPercentage: budget.currentInterest?.toString() || '',
        paymentTerm: budget.paymentTerm?.toString() || '',
        userId: budget.user?.id || '',
        _expirationDate: formattedDate
      })

      setCalculatedValues({
        totalAmount: budget.totalAmount || 0,
        monthlyPayment: 0 // Will be calculated
      })
    } else {
      setFormData({
        code: '',
        baseAmount: '',
        interestPercentage: '',
        paymentTerm: '',
        userId: '',
        _expirationDate: ''
      })
      setCalculatedValues({
        totalAmount: 0,
        monthlyPayment: 0
      })
    }
    setFieldErrors({})
    setTouched({})
  }, [budget])

  // Real-time calculation when relevant fields change
  useEffect(() => {
    const baseAmount = parseFloat(formData.baseAmount)
    const interestPercentage = parseFloat(formData.interestPercentage)
    const paymentTerm = parseInt(formData.paymentTerm)

    if (
      !isNaN(baseAmount) &&
      !isNaN(interestPercentage) &&
      !isNaN(paymentTerm) &&
      baseAmount > 0 &&
      interestPercentage >= 0 &&
      paymentTerm > 0
    ) {
      calculateTotalAmountAsync(baseAmount, interestPercentage)
    } else {
      setCalculatedValues((prev) => ({ ...prev, totalAmount: 0, monthlyPayment: 0 }))
    }
  }, [formData.baseAmount, formData.interestPercentage, formData.paymentTerm])

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      const result = await getAllUsers()
      if (result.success && result.data) {
        setUsers(result.data)
      } else {
        addNotification({
          type: 'error',
          message: 'Error al cargar usuarios'
        })
      }
    } catch (error) {
      console.error('Error loading users:', error)
      addNotification({
        type: 'error',
        message: 'Error inesperado al cargar usuarios'
      })
    } finally {
      setLoadingUsers(false)
    }
  }

  const calculateTotalAmountAsync = async (baseAmount: number, interestPercentage: number) => {
    try {
      const result = await calculateTotalAmount(baseAmount, interestPercentage)
      if (result.success && result.data) {
        const totalAmount = result.data.totalAmount
        setCalculatedValues((prev) => ({ ...prev, totalAmount }))

        // Calculate monthly payment if payment term is available
        const paymentTerm = parseInt(formData.paymentTerm)
        if (!isNaN(paymentTerm) && paymentTerm > 0) {
          calculateMonthlyPaymentAsync(totalAmount, paymentTerm)
        }
      }
    } catch (error) {
      console.error('Error calculating total amount:', error)
    }
  }

  const calculateMonthlyPaymentAsync = async (totalAmount: number, paymentTerm: number) => {
    try {
      const result = await calculateMonthlyPayment(totalAmount, paymentTerm)
      if (result.success && result.data) {
        setCalculatedValues((prev) => ({ ...prev, monthlyPayment: result.data!.monthlyPayment }))
      }
    } catch (error) {
      console.error('Error calculating monthly payment:', error)
    }
  }

  const handleInputChange = (field: keyof BudgetFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Real-time validation for touched fields
    if (touched[field]) {
      const errors = validateBudgetField(field, value)
      setFieldErrors((prev) => ({ ...prev, [field]: errors }))
    }

    // Special handling for code field - check availability
    if (field === 'code' && value.trim().length >= 3) {
      checkCodeAvailability(value.trim())
    }
  }

  const checkCodeAvailability = async (code: string) => {
    try {
      const result = await isCodeAvailable(code)
      if (result.success && result.data) {
        if (!result.data.isAvailable && (!budget || budget.code !== code)) {
          setFieldErrors((prev) => ({
            ...prev,
            code: ['Este código ya está en uso']
          }))
        }
      }
    } catch (error) {
      console.error('Error checking code availability:', error)
    }
  }

  const handleBlur = (field: keyof BudgetFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const errors = validateBudgetField(field, formData[field])
    setFieldErrors((prev) => ({ ...prev, [field]: errors }))
  }

  const handleUserSearch = (searchTerm: string) => {
    setUserSearchTerm(searchTerm)
    setShowUserDropdown(true)
  }

  const selectUser = (user: User) => {
    setFormData((prev) => ({ ...prev, userId: user.id }))
    setUserSearchTerm(user.nombre)
    setShowUserDropdown(false)

    // Clear user field errors
    setFieldErrors((prev) => ({ ...prev, userId: [] }))
  }

  const filteredUsers = users.filter(
    (user) =>
      user.nombre.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  )

  const selectedUser = users.find((user) => user.id === formData.userId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    const validation = validateBudgetForm(formData)
    if (!validation.isValid) {
      // Set all fields as touched to show errors
      const allTouched = Object.keys(formData).reduce(
        (acc, key) => {
          acc[key] = true
          return acc
        },
        {} as Record<string, boolean>
      )
      setTouched(allTouched)

      // Set field errors
      const errors = Object.keys(formData).reduce(
        (acc, key) => {
          acc[key] = validateBudgetField(
            key as keyof BudgetFormData,
            formData[key as keyof BudgetFormData]
          )
          return acc
        },
        {} as Record<string, string[]>
      )
      setFieldErrors(errors)

      addNotification({
        type: 'error',
        message: 'Por favor corrige los errores en el formulario'
      })
      return
    }

    setIsLoading(true)

    try {
      let result

      if (budget) {
        // Update existing budget (limited functionality)
        const updateData: UpdateBudgetDto = {
          // Note: The backend only supports adding quotas, not updating budget details
        }
        result = await updateBudget(budget.id, updateData)
      } else {
        // Create new budget
        const createData: CreateBudgetDto = {
          code: formData.code.trim(),
          baseAmount: parseFloat(formData.baseAmount),
          paymentTerm: parseInt(formData.paymentTerm),
          userId: formData.userId,
          _expirationDate: new Date(formData._expirationDate)
        }
        result = await createBudget(createData)
      }

      if (result.success && result.data) {
        addNotification({
          type: 'success',
          message: budget
            ? 'Presupuesto actualizado exitosamente'
            : 'Presupuesto creado exitosamente'
        })

        if (onSubmit) {
          onSubmit(result.data)
        }
        if (onSuccess) {
          onSuccess(result.data)
        }

        // Reset form if creating new budget
        if (!budget) {
          setFormData({
            code: '',
            baseAmount: '',
            interestPercentage: '',
            paymentTerm: '',
            userId: '',
            _expirationDate: ''
          })
          setFieldErrors({})
          setTouched({})
          setUserSearchTerm('')
          setCalculatedValues({ totalAmount: 0, monthlyPayment: 0 })
        }
      } else {
        addNotification({
          type: 'error',
          message: result.error || 'Error al procesar la solicitud'
        })
      }
    } catch (error) {
      console.error('Error submitting budget form:', error)
      addNotification({
        type: 'error',
        message: 'Error inesperado al procesar la solicitud'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderField = (
    field: keyof BudgetFormData,
    label: string,
    type: string = 'text',
    required: boolean = true
  ) => {
    const hasError = fieldErrors[field] && fieldErrors[field].length > 0

    return (
      <div className="form-field">
        <label htmlFor={field} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
        <input
          id={field}
          type={type}
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          onBlur={() => handleBlur(field)}
          className={`form-input ${hasError ? 'form-input--error' : ''}`}
          disabled={isLoading}
          aria-describedby={hasError ? `${field}-error` : undefined}
        />
        {hasError && (
          <div id={`${field}-error`} className="form-error">
            {fieldErrors[field].map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderUserSelect = () => {
    const hasError = fieldErrors.userId && fieldErrors.userId.length > 0

    return (
      <div className="form-field">
        <label htmlFor="userId" className="form-label">
          Usuario
          <span className="required">*</span>
        </label>
        <div className="user-select-container">
          <input
            id="userId"
            type="text"
            value={selectedUser ? selectedUser.nombre : userSearchTerm}
            onChange={(e) => handleUserSearch(e.target.value)}
            onFocus={() => setShowUserDropdown(true)}
            onBlur={() => {
              // Delay hiding dropdown to allow selection
              setTimeout(() => setShowUserDropdown(false), 200)
              handleBlur('userId')
            }}
            className={`form-input ${hasError ? 'form-input--error' : ''}`}
            disabled={isLoading || loadingUsers}
            placeholder={loadingUsers ? 'Cargando usuarios...' : 'Buscar usuario...'}
            aria-describedby={hasError ? 'userId-error' : undefined}
          />
          {showUserDropdown && filteredUsers.length > 0 && (
            <div className="user-dropdown">
              {filteredUsers.slice(0, 10).map((user) => (
                <div key={user.id} className="user-dropdown-item" onClick={() => selectUser(user)}>
                  <div className="user-name">{user.nombre}</div>
                  <div className="user-email">{user.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {hasError && (
          <div id="userId-error" className="form-error">
            {fieldErrors.userId.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="budget-form">
      <div className="form-header">
        <h2>{budget ? 'Editar Presupuesto' : 'Crear Presupuesto'}</h2>
      </div>

      <div className="form-body">
        <div className="form-row">
          <div className="form-col">{renderField('code', 'Código')}</div>
          <div className="form-col">{renderField('baseAmount', 'Monto Base', 'number')}</div>
        </div>

        <div className="form-row">
          <div className="form-col">
            {renderField('interestPercentage', 'Porcentaje de Interés (%)', 'number')}
          </div>
          <div className="form-col">
            {renderField('paymentTerm', 'Plazo de Pago (meses)', 'number')}
          </div>
        </div>

        <div className="form-row">
          <div className="form-col">{renderUserSelect()}</div>
          <div className="form-col">
            {renderField('_expirationDate', 'Fecha de Expiración', 'date')}
          </div>
        </div>

        {/* Calculated values display */}
        {(calculatedValues.totalAmount > 0 || calculatedValues.monthlyPayment > 0) && (
          <div className="calculated-values">
            <h3>Valores Calculados</h3>
            <div className="form-row">
              <div className="form-col">
                <div className="calculated-field">
                  <label className="form-label">Monto Total</label>
                  <div className="calculated-value">
                    $
                    {calculatedValues.totalAmount.toLocaleString('es-ES', {
                      minimumFractionDigits: 2
                    })}
                  </div>
                </div>
              </div>
              <div className="form-col">
                <div className="calculated-field">
                  <label className="form-label">Pago Mensual</label>
                  <div className="calculated-value">
                    $
                    {calculatedValues.monthlyPayment.toLocaleString('es-ES', {
                      minimumFractionDigits: 2
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn--secondary"
            disabled={isLoading}
          >
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={isLoading}>
          {isLoading ? 'Procesando...' : budget ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  )
}

export default BudgetForm
