/**
 * Extrae un mensaje de error legible de diferentes tipos de objetos de error
 */
export const extractErrorMessage = (
  error: unknown,
  defaultMessage = 'Error desconocido'
): string => {
  if (!error) {
    return defaultMessage
  }

  // Si es un string, devolverlo directamente
  if (typeof error === 'string') {
    return error
  }

  // Si es un objeto con propiedades de error
  if (typeof error === 'object') {
    const errorObj = error as any

    // Intentar extraer mensaje de diferentes propiedades comunes
    if (errorObj.message && typeof errorObj.message === 'string') {
      return errorObj.message
    }

    if (errorObj.error) {
      if (typeof errorObj.error === 'string') {
        return errorObj.error
      }
      if (errorObj.error.message && typeof errorObj.error.message === 'string') {
        return errorObj.error.message
      }
    }

    if (errorObj.data && errorObj.data.message) {
      return errorObj.data.message
    }

    // Si tiene una propiedad 'errors' que es un array
    if (Array.isArray(errorObj.errors) && errorObj.errors.length > 0) {
      return errorObj.errors.join(', ')
    }

    // Como último recurso, convertir a JSON
    try {
      return JSON.stringify(errorObj)
    } catch {
      return defaultMessage
    }
  }

  return defaultMessage
}

/**
 * Determina si un error es de tipo "handler no disponible"
 */
export const isHandlerNotAvailableError = (error: unknown): boolean => {
  const message = extractErrorMessage(error).toLowerCase()
  return (
    message.includes('handler') ||
    message.includes('no handler registered') ||
    message.includes('service not available')
  )
}

/**
 * Determina si un error es de tipo "conexión"
 */
export const isConnectionError = (error: unknown): boolean => {
  const message = extractErrorMessage(error).toLowerCase()
  return (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('fetch') ||
    message.includes('timeout')
  )
}

/**
 * Obtiene un mensaje de error amigable para el usuario
 */
export const getFriendlyErrorMessage = (error: unknown): string => {
  if (isHandlerNotAvailableError(error)) {
    return 'El servicio no está disponible. Intenta reiniciar la aplicación.'
  }

  if (isConnectionError(error)) {
    return 'Error de conexión. Verifica tu conexión a internet.'
  }

  const message = extractErrorMessage(error)

  // Si el mensaje es muy técnico o es JSON, dar un mensaje más amigable
  if (message.startsWith('{') || message.includes('TypeError') || message.includes('undefined')) {
    return 'Ha ocurrido un error inesperado. Intenta nuevamente.'
  }

  return message
}

export default {
  extractErrorMessage,
  isHandlerNotAvailableError,
  isConnectionError,
  getFriendlyErrorMessage
}
