import { BaseException } from '../exceptions'

export interface SuccessResponse<T = any> {
  success: true
  data: T
  message?: string
  timestamp: string
}

export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

// Response formatting functions
export class ResponseFormatter {
  static success<T>(data: T, message?: string): SuccessResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    }
  }

  static error(error: Error | BaseException): ErrorResponse {
    if (error instanceof BaseException) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        },
        timestamp: new Date().toISOString()
      }
    }

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      timestamp: new Date().toISOString()
    }
  }

  static customError(code: string, message: string, details?: any): ErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      timestamp: new Date().toISOString()
    }
  }

  static validationError(field: string, message: string, value?: any): ErrorResponse {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: `Validation failed for field '${field}': ${message}`,
        details: {
          field,
          value,
          message
        }
      },
      timestamp: new Date().toISOString()
    }
  }

  static notFound(resource: string, identifier: string): ErrorResponse {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `${resource} not found with identifier: ${identifier}`,
        details: {
          resource,
          identifier
        }
      },
      timestamp: new Date().toISOString()
    }
  }

  static unauthorized(message: string = 'Unauthorized access'): ErrorResponse {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message,
        details: null
      },
      timestamp: new Date().toISOString()
    }
  }

  static forbidden(message: string = 'Access forbidden'): ErrorResponse {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message,
        details: null
      },
      timestamp: new Date().toISOString()
    }
  }

  static badRequest(message: string, details?: any): ErrorResponse {
    return {
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message,
        details
      },
      timestamp: new Date().toISOString()
    }
  }
}

export const createSuccessResponse = ResponseFormatter.success
export const createErrorResponse = ResponseFormatter.error
export const createValidationError = ResponseFormatter.validationError
export const createNotFoundError = ResponseFormatter.notFound

export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true
}

export function isErrorResponse(response: ApiResponse): response is ErrorResponse {
  return response.success === false
}

export async function wrapAsyncOperation<T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<ApiResponse<T>> {
  try {
    const result = await operation()
    return ResponseFormatter.success(result)
  } catch (error) {
    if (error instanceof Error) {
      return ResponseFormatter.error(error)
    }
    return ResponseFormatter.customError(
      'UNKNOWN_ERROR',
      errorMessage || 'An unknown error occurred',
      error
    )
  }
}

// Response wrapper for sync operations
export function wrapSyncOperation<T>(operation: () => T, errorMessage?: string): ApiResponse<T> {
  try {
    const result = operation()
    return ResponseFormatter.success(result)
  } catch (error) {
    if (error instanceof Error) {
      return ResponseFormatter.error(error)
    }
    return ResponseFormatter.customError(
      'UNKNOWN_ERROR',
      errorMessage || 'An unknown error occurred',
      error
    )
  }
}
