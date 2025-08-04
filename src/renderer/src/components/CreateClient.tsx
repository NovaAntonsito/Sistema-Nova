import React, { useState } from 'react'
import { extractErrorMessage, getFriendlyErrorMessage } from '../utils/errorUtils'

interface CreateClientProps {
  onBack: () => void
  onClientCreated: () => void
}

const CreateClient: React.FC<CreateClientProps> = ({ onBack, onClientCreated }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    phoneNumber: '',
    address: '',
    documentNumber: '',
    requiresLogin: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!formData.nombre.trim()) {
      errors.push('El nombre es requerido')
    }

    if (!formData.phoneNumber.trim()) {
      errors.push('El teléfono es requerido')
    }

    // Validar email si se proporciona
    if (formData.email.trim() && !isValidEmail(formData.email.trim())) {
      errors.push('El email debe tener un formato válido')
    }

    // Si requiere login, email es obligatorio
    if (formData.requiresLogin && !formData.email.trim()) {
      errors.push('El email es requerido para usuarios con acceso al sistema')
    }

    return errors
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
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

      const clientData = {
        ...formData,
        userType: 'client',
        // Limpiar campos vacíos para evitar problemas
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim() || undefined,
        email: formData.email.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim(),
        address: formData.address.trim() || undefined,
        documentNumber: formData.documentNumber.trim() || undefined
      }

      console.log('Enviando datos del cliente:', clientData)
      const result = await window.electron.ipcRenderer.invoke('user:create', clientData)
      console.log('Resultado:', result)

      if (result && result.success) {
        setSuccess('Cliente creado exitosamente')
        setFormData({
          nombre: '',
          apellido: '',
          email: '',
          phoneNumber: '',
          address: '',
          documentNumber: '',
          requiresLogin: false
        })
        setTimeout(() => {
          onClientCreated()
        }, 2000)
      } else {
        const errorMessage = extractErrorMessage(result, 'Error desconocido al crear cliente')
        console.error('Error del backend:', result)
        setError(errorMessage)
      }
    } catch (error) {
      console.error('Error creando cliente:', error)
      const errorMessage = getFriendlyErrorMessage(error)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <button className="back-btn" onClick={onBack}>
          ← Volver
        </button>
        <h2>Crear Nuevo Cliente</h2>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="client-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="nombre">Nombre *</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="apellido">Apellido</label>
            <input
              type="text"
              id="apellido"
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="phoneNumber">Teléfono *</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="documentNumber">Documento</label>
            <input
              type="text"
              id="documentNumber"
              name="documentNumber"
              value={formData.documentNumber}
              onChange={handleChange}
              placeholder="DNI, Cédula, etc."
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="address">Dirección</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={3}
            disabled={isLoading}
          />
        </div>

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="requiresLogin"
              checked={formData.requiresLogin}
              onChange={handleChange}
              disabled={isLoading}
            />
            <span>El cliente requiere acceso al sistema</span>
          </label>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onBack} disabled={isLoading}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Creando...' : 'Crear Cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateClient
