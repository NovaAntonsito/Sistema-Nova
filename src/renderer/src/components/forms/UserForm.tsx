import React, { useState, useEffect } from 'react'
import {
  createUser,
  updateUser,
  User,
  CreateUserDto,
  UpdateUserDto
} from '../../services/UserService'
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
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Real-time validation for touched fields
    if (touched[field]) {
      const errors = validateField(field, value)
      setFieldErrors((prev) => ({ ...prev, [field]: errors }))
    }
  }

  const handleBlur = (field: keyof UserFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const errors = validateField(field, formData[field])
    setFieldErrors((prev) => ({ ...prev, [field]: errors }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    const validation = validateUserForm(formData)
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
          acc[key] = validateField(key as keyof UserFormData, formData[key as keyof UserFormData])
          return acc
        },
        {} as Record<string, string[]>
      )
      setFieldErrors(errors)

      addNotification({
        type: 'error',
        message: 'Por favor corrige los errores en el formulario'
      })

      // Focus first field with error
      const firstErrorField = Object.keys(errors).find((key) => errors[key].length > 0)
      if (firstErrorField) {
        const fieldElement = document.getElementById(firstErrorField)
        fieldElement?.focus()
      }
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
        const successMessage = user
          ? 'Usuario actualizado exitosamente'
          : 'Usuario creado exitosamente'
        addNotification({
          type: 'success',
          message: successMessage
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
    const fieldId = field
    const errorId = `${field}-error`

    return (
      <div className="form-field">
        <label htmlFor={fieldId} className="form-label">
          {label}
          {required && (
            <span className="required" aria-label="requerido">
              *
            </span>
          )}
        </label>
        <input
          id={fieldId}
          type={type}
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          onBlur={() => handleBlur(field)}
          className={`form-input ${hasError ? 'form-input--error' : ''}`}
          disabled={isLoading}
          required={required}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
        />
        {hasError && (
          <div id={errorId} className="form-error" role="alert" aria-live="polite">
            {fieldErrors[field].map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="user-form" noValidate aria-labelledby="form-title">
      <div className="form-header">
        <h2 id="form-title">{user ? 'Editar Usuario' : 'Crear Usuario'}</h2>
      </div>

      <fieldset className="form-body" disabled={isLoading}>
        <legend className="sr-only">Información del usuario</legend>

        <div className="form-row">
          <div className="form-col">{renderField('nombre', 'Nombre')}</div>
          <div className="form-col">{renderField('apellido', 'Apellido')}</div>
        </div>

        <div className="form-row">
          <div className="form-col">{renderField('email', 'Email', 'email')}</div>
          <div className="form-col">{renderField('telefono', 'Teléfono', 'tel')}</div>
        </div>

        <div className="form-row">
          <div className="form-col-full">
            {renderField('direccion', 'Dirección', 'text', false)}
          </div>
        </div>
      </fieldset>

      <div className="form-actions" role="group" aria-label="Acciones del formulario">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn--secondary"
            disabled={isLoading}
            aria-label="Cancelar y cerrar formulario"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={isLoading}
          aria-label={
            isLoading ? 'Procesando solicitud' : user ? 'Actualizar usuario' : 'Crear nuevo usuario'
          }
        >
          {isLoading ? (
            <>
              <span className="sr-only">Procesando solicitud</span>
              <span aria-hidden="true">Procesando...</span>
            </>
          ) : user ? (
            'Actualizar'
          ) : (
            'Crear'
          )}
        </button>
      </div>

      {isLoading && (
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          Procesando formulario, por favor espere
        </div>
      )}
    </form>
  )
}

export default UserForm
