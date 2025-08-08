import React, { useState, useEffect } from 'react'
import { createUser, updateUser, User, CreateUserDto, UpdateUserDto } from '../../services/UserService'
import { validateUserForm, validateField, UserFormData } from '../../utils/validation'
import { useNotification } from '../../hooks/useNotification'
import './UserForm.css'

interface UserFormProps {
  user?: User | null
  onSubmit?: (user: User) => void
  onCancel?: () => void
  onSuccess?: (user: User) => void
}

const UserForm: React.FC<UserFormProps> = ({ user, onSubmit, onCancel, onSuccess }) => {
  const { addNotification } = useNotification()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<UserFormData>({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    direccion: ''
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Initialize form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre || '',
        apellido: '', // Note: backend only has 'nombre', we'll combine for display
        email: user.email || '',
        telefono: user.phoneNumber || '',
        direccion: ''
      })
    } else {
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        direccion: ''
      })
    }
    setFieldErrors({})
    setTouched({})
  }, [user])

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Real-time validation for touched fields
    if (touched[field]) {
      const errors = validateField(field, value)
      setFieldErrors(prev => ({ ...prev, [field]: errors }))
    }
  }

  const handleBlur = (field: keyof UserFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const errors = validateField(field, formData[field])
    setFieldErrors(prev => ({ ...prev, [field]: errors }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all fields
    const validation = validateUserForm(formData)
    if (!validation.isValid) {
      // Set all fields as touched to show errors
      const allTouched = Object.keys(formData).reduce((acc, key) => {
        acc[key] = true
        return acc
      }, {} as Record<string, boolean>)
      setTouched(allTouched)
      
      // Set field errors
      const errors = Object.keys(formData).reduce((acc, key) => {
        acc[key] = validateField(key as keyof UserFormData, formData[key as keyof UserFormData])
        return acc
      }, {} as Record<string, string[]>)
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
      
      if (user) {
        // Update existing user
        const updateData: UpdateUserDto = {
          nombre: `${formData.nombre} ${formData.apellido}`.trim(),
          email: formData.email,
          phoneNumber: formData.telefono
        }
        result = await updateUser(user.id, updateData)
      } else {
        // Create new user
        const createData: CreateUserDto = {
          nombre: `${formData.nombre} ${formData.apellido}`.trim(),
          email: formData.email,
          phoneNumber: formData.telefono
        }
        result = await createUser(createData)
      }

      if (result.success && result.data) {
        addNotification({
          type: 'success',
          message: user ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente'
        })
        
        if (onSubmit) {
          onSubmit(result.data)
        }
        if (onSuccess) {
          onSuccess(result.data)
        }
        
        // Reset form if creating new user
        if (!user) {
          setFormData({
            nombre: '',
            apellido: '',
            email: '',
            telefono: '',
            direccion: ''
          })
          setFieldErrors({})
          setTouched({})
        }
      } else {
        addNotification({
          type: 'error',
          message: result.error || 'Error al procesar la solicitud'
        })
      }
    } catch (error) {
      console.error('Error submitting user form:', error)
      addNotification({
        type: 'error',
        message: 'Error inesperado al procesar la solicitud'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderField = (
    field: keyof UserFormData,
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

  return (
    <form onSubmit={handleSubmit} className="user-form">
      <div className="form-header">
        <h2>{user ? 'Editar Usuario' : 'Crear Usuario'}</h2>
      </div>
      
      <div className="form-body">
        <div className="form-row">
          <div className="form-col">
            {renderField('nombre', 'Nombre')}
          </div>
          <div className="form-col">
            {renderField('apellido', 'Apellido')}
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-col">
            {renderField('email', 'Email', 'email')}
          </div>
          <div className="form-col">
            {renderField('telefono', 'Teléfono', 'tel')}
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-col-full">
            {renderField('direccion', 'Dirección', 'text', false)}
          </div>
        </div>
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
        <button
          type="submit"
          className="btn btn--primary"
          disabled={isLoading}
        >
          {isLoading ? 'Procesando...' : (user ? 'Actualizar' : 'Crear')}
        </button>
      </div>
    </form>
  )
}

export default UserForm