import Versions from './components/Versions'
import UsersView from './views/UsersView'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

function App(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'dashboard'>('login')
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verificar si el usuario ya está autenticado al cargar la app
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('auth:getCurrentUser')
      if (result.success && result.data) {
        setUser(result.data)
        setCurrentView('dashboard')
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginSuccess = (userData: User) => {
    setUser(userData)
    setCurrentView('dashboard')
  }

  const handleRegisterSuccess = (userData: User) => {
    setUser(userData)
    setCurrentView('dashboard')
  }

  const handleLogout = async () => {
    try {
      await window.electron.ipcRenderer.invoke('auth:logout')
      setUser(null)
      setCurrentView('login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading">
          <h2>Cargando...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {currentView === 'login' && (
        <LoginForm
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => setCurrentView('register')}
        />
      )}

      {currentView === 'register' && (
        <RegisterForm
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={() => setCurrentView('login')}
        />
      )}

      {currentView === 'dashboard' && user && <Dashboard user={user} onLogout={handleLogout} />}
    </div>
  )
}

export default App
