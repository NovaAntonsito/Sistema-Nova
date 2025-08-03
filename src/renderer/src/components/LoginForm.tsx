import { useState } from 'react'
import { UserResponseDto } from 'src/main/database/dto/user.dto'

interface LoginFormProps {
  onLoginSuccess: (user: UserResponseDto) => void
  onSwitchToRegister: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await window.electron.ipcRenderer.invoke('auth:login', formData)

      if (result.success) {
        onLoginSuccess(result.data)
      } else {
        setError(result.error || 'Error al iniciar sesión')
      }
    } catch (error) {
      console.error('Error en login:', error)
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1>Iniciar Sesión</h1>
        <p>Sistema de Gestión de Presupuestos</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="tu@email.com"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Tu contraseña"
            disabled={isLoading}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </button>
      </form>

      <div className="switch-form">
        <p>¿No tienes una cuenta?</p>
        <button type="button" onClick={onSwitchToRegister} disabled={isLoading}>
          Registrarse
        </button>
      </div>
    </div>
  )
}

export default LoginForm
