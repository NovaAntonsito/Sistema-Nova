import { useState, useEffect } from 'react'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import Home from './components/Home'
import Toolbar from './components/Toolbar'
import CreateClient from './components/CreateClient'
import CreateBudget from './components/CreateBudget'
import ViewClients from './components/ViewClients'
import ViewBudgets from './components/ViewBudgets'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

interface User {
  id: string
  nombre: string
  email: string
  phoneNumber: string
  createdAt: string
  updatedAt: string
}

type AppView =
  | 'login'
  | 'register'
  | 'home'
  | 'createClient'
  | 'createBudget'
  | 'viewClients'
  | 'viewBudgets'

function App(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<AppView>('login')
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verificar si el usuario ya está autenticado al cargar la app
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Manejar clases CSS del body según la vista actual
  useEffect(() => {
    const body = document.body
    if (currentView === 'login' || currentView === 'register') {
      body.classList.add('auth-mode')
    } else {
      body.classList.remove('auth-mode')
    }

    // Cleanup al desmontar el componente
    return () => {
      body.classList.remove('auth-mode')
    }
  }, [currentView])

  const checkAuthStatus = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('auth:getCurrentUser')
      if (result.success && result.data) {
        setUser(result.data)
        setCurrentView('home')
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginSuccess = (userData: User) => {
    setUser(userData)
    setCurrentView('home')
  }

  const handleRegisterSuccess = (userData: User) => {
    setUser(userData)
    setCurrentView('home')
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

  const handleGoHome = () => {
    setCurrentView('home')
  }

  const handleCreateClient = () => {
    setCurrentView('createClient')
  }

  const handleCreateBudget = () => {
    setCurrentView('createBudget')
  }

  const handleViewClients = () => {
    setCurrentView('viewClients')
  }

  const handleViewBudgets = () => {
    setCurrentView('viewBudgets')
  }

  const handleClientCreated = () => {
    // Opcional: mostrar mensaje de éxito y volver al home
    setCurrentView('home')
  }

  const handleBudgetCreated = () => {
    // Opcional: mostrar mensaje de éxito y volver al home
    setCurrentView('home')
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

  // Vistas de autenticación (sin toolbar)
  if (currentView === 'login' || currentView === 'register') {
    return (
      <div className="app-container auth-view">
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
      </div>
    )
  }

  // Vistas principales (con toolbar)
  return (
    <ErrorBoundary>
      <div className="app-container">
        {user && (
          <Toolbar
            onCreateClient={handleCreateClient}
            onCreateBudget={handleCreateBudget}
            onGoHome={handleGoHome}
            onLogout={handleLogout}
            userName={user.nombre}
          />
        )}

        <div className="main-content">
          <ErrorBoundary>
            {currentView === 'home' && user && (
              <Home
                onCreateClient={handleCreateClient}
                onCreateBudget={handleCreateBudget}
                onViewBudgets={handleViewBudgets}
                onViewClients={handleViewClients}
                userName={user.nombre}
              />
            )}

            {currentView === 'createClient' && (
              <CreateClient onBack={handleGoHome} onClientCreated={handleClientCreated} />
            )}

            {currentView === 'createBudget' && (
              <CreateBudget onBack={handleGoHome} onBudgetCreated={handleBudgetCreated} />
            )}

            {currentView === 'viewClients' && <ViewClients onBack={handleGoHome} />}

            {currentView === 'viewBudgets' && <ViewBudgets onBack={handleGoHome} />}
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
