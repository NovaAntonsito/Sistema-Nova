import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createInterest,
  updateInterest,
  getInterestById,
  paymentTermExists,
  CreateInterestDto,
  UpdateInterestDto,
  Interest
} from '../../services/InterestService'
import { LoadingSpinner } from '../../components/common'
import './InterestCreateView.css'

const InterestCreateView: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState<CreateInterestDto>({
    paymentTerm: 0,
    interest: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isEditing && id) {
      loadInterest(id)
    }
  }, [isEditing, id])

  const loadInterest = async (interestId: string) => {
    try {
      setLoading(true)
      const response = await getInterestById(interestId)
      if (response.success && response.data) {
        setFormData({
          paymentTerm: response.data.paymentTerm,
          interest: response.data.interest
        })
      } else {
        setError(response.error || 'Error al cargar configuración de interés')
      }
    } catch (err) {
      setError('Error al cargar configuración de interés')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = async (): Promise<boolean> => {
    const errors: Record<string, string> = {}

    // Validar plazo de pago
    if (!formData.paymentTerm || formData.paymentTerm <= 0) {
      errors.paymentTerm = 'El plazo de pago debe ser un número positivo'
    } else if (!Number.isInteger(formData.paymentTerm)) {
      errors.paymentTerm = 'El plazo de pago debe ser un número entero'
    } else if (!isEditing) {
      // Solo verificar duplicados al crear
      try {
        const existsResponse = await paymentTermExists(formData.paymentTerm)
        if (existsResponse.success && existsResponse.data?.exists) {
          errors.paymentTerm = 'Ya existe una configuración para este plazo de pago'
        }
      } catch (err) {
        // Continuar sin validación de duplicados si hay error
      }
    }

    // Validar tasa de interés
    if (formData.interest === undefined || formData.interest === null) {
      errors.interest = 'La tasa de interés es requerida'
    } else if (formData.interest < 0) {
      errors.interest = 'La tasa de interés no puede ser negativa'
    } else if (formData.interest > 100) {
      errors.interest = 'La tasa de interés no puede exceder el 100%'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!(await validateForm())) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      let response
      if (isEditing && id) {
        const updateData: UpdateInterestDto = {
          paymentTerm: formData.paymentTerm,
          interest: formData.interest
        }
        response = await updateInterest(id, updateData)
      } else {
        response = await createInterest(formData)
      }

      if (response.success) {
        navigate('/interests')
      } else {
        setError(response.error || `Error al ${isEditing ? 'actualizar' : 'crear'} configuración de interés`)
      }
    } catch (err) {
      setError(`Error al ${isEditing ? 'actualizar' : 'crear'} configuración de interés`)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CreateInterestDto, value: string) => {
    const numericValue = parseFloat(value) || 0
    setFormData(prev => ({
      ...prev,
      [field]: numericValue
    }))
    
    // Limpiar error de validación cuando el usuario empiece a escribir
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  if (loading && isEditing) {
    return <LoadingSpinner size="large" message="Cargando configuración de interés..." />
  }

  return (
    <div className="interest-create-view">
      <div className="view-header">
        <h1>{isEditing ? 'Editar' : 'Nueva'} Configuración de Interés</h1>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/interests')}
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

      <div className="form-container">
        <form onSubmit={handleSubmit} className="interest-form">
          <div className="form-group">
            <label htmlFor="paymentTerm">
              Plazo de Pago (meses) <span className="required">*</span>
            </label>
            <input
              type="number"
              id="paymentTerm"
              min="1"
              step="1"
              value={formData.paymentTerm || ''}
              onChange={(e) => handleInputChange('paymentTerm', e.target.value)}
              className={validationErrors.paymentTerm ? 'error' : ''}
              disabled={loading}
            />
            {validationErrors.paymentTerm && (
              <span className="error-text">{validationErrors.paymentTerm}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="interest">
              Tasa de Interés (%) <span className="required">*</span>
            </label>
            <input
              type="number"
              id="interest"
              min="0"
              max="100"
              step="0.01"
              value={formData.interest || ''}
              onChange={(e) => handleInputChange('interest', e.target.value)}
              className={validationErrors.interest ? 'error' : ''}
              disabled={loading}
            />
            {validationErrors.interest && (
              <span className="error-text">{validationErrors.interest}</span>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/interests')}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InterestCreateView