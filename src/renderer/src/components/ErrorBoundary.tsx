import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>¡Oops! Algo salió mal</h2>
            <p>Ha ocurrido un error inesperado en la aplicación.</p>
            <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
              <summary>Detalles del error</summary>
              {this.state.error && this.state.error.toString()}
            </details>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="btn-primary"
              style={{ marginTop: '15px' }}
            >
              Intentar de nuevo
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary"
              style={{ marginTop: '10px', marginLeft: '10px' }}
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
