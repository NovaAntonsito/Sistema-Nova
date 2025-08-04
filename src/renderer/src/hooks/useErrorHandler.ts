import { useState, useCallback } from 'react'

interface ErrorState {
  error: string | null
  isLoading: boolean
}

interface UseErrorHandlerReturn {
  error: string | null
  isLoading: boolean
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  handleAsync: <T>(
    asyncFn: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ) => Promise<void>
  clearError: () => void
}

export const useErrorHandler = (initialLoading = false): UseErrorHandlerReturn => {
  const [state, setState] = useState<ErrorState>({
    error: null,
    isLoading: initialLoading
  })

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }))
  }, [])

  const setLoading = useCallback((isLoading: boolean) => {
    setState((prev) => ({ ...prev, isLoading }))
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  const handleAsync = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      onSuccess?: (result: T) => void,
      onError?: (error: Error) => void
    ) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await asyncFn()
        onSuccess?.(result)
      } catch (error) {
        const errorMessage = getErrorMessage(error)
        setState((prev) => ({ ...prev, error: errorMessage }))
        onError?.(error as Error)
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    },
    []
  )

  return {
    error: state.error,
    isLoading: state.isLoading,
    setError,
    setLoading,
    handleAsync,
    clearError
  }
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes('handler')) {
      return 'El servicio no está disponible. Intenta reiniciar la aplicación.'
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Error de conexión. Verifica tu conexión a internet.'
    }
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Ha ocurrido un error inesperado'
}

export default useErrorHandler
