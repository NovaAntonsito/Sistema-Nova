/**
 * Servicio de validación de seguridad para importaciones
 * Cumple con requisitos: Consideraciones de seguridad
 */

import { SecurityValidator, SecurityValidationResult } from '../utils/securityValidator'
import {
  SecurityValidationException,
  InvalidFileTypeException,
  FileSizeExceededException,
  PathTraversalException
} from '../exceptions/importExceptions'
import { ExportLogger } from '../utils/exportLogger'

/**
 * Servicio que centraliza todas las validaciones de seguridad para importaciones
 */
export class SecurityValidationService {
  private securityValidator: SecurityValidator
  private logger: ExportLogger

  constructor() {
    this.securityValidator = SecurityValidator.getInstance()
    this.logger = ExportLogger.getInstance()
  }

  /**
   * Valida la seguridad completa de un archivo antes de la importación
   * @param filePath - Ruta del archivo a validar
   * @param allowedBasePath - Directorio base permitido
   * @param operation - Nombre de la operación
   * @returns Promise<SecurityValidationResult>
   */
  async validateFileForImport(
    filePath: string,
    allowedBasePath: string,
    operation: string
  ): Promise<SecurityValidationResult> {
    this.logger.logInfo(`Iniciando validación de seguridad para: ${filePath}`)

    try {
      // Realizar validación completa de seguridad
      const result = this.securityValidator.validateImportSecurity({
        filePath,
        allowedBasePath,
        operation,
        validateContent: false
      })

      // Lanzar excepciones específicas si hay errores críticos
      if (!result.isValid) {
        await this.handleSecurityErrors(result, filePath, operation)
      }

      this.logger.logInfo(
        `Validación de seguridad completada para: ${filePath}. ` +
          `Errores: ${result.errors.length}, Advertencias: ${result.warnings.length}`
      )

      return result
    } catch (error) {
      this.logger.logError(`Error en validación de seguridad: ${error}`)
      throw error
    }
  }

  /**
   * Valida y sanitiza datos de contenido
   * @param data - Datos a validar
   * @param operation - Nombre de la operación
   * @returns Promise<SecurityValidationResult>
   */
  async validateAndSanitizeData(data: any, operation: string): Promise<SecurityValidationResult> {
    this.logger.logInfo(`Iniciando sanitización de datos para: ${operation}`)

    try {
      const result = this.securityValidator.sanitizeInputData(data, operation)

      this.logger.logInfo(
        `Sanitización completada para: ${operation}. ` +
          `Errores: ${result.errors.length}, Advertencias: ${result.warnings.length}`
      )

      return result
    } catch (error) {
      this.logger.logError(`Error en sanitización de datos: ${error}`)
      throw new SecurityValidationException(
        `Error sanitizando datos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'data-sanitization'
      )
    }
  }

  /**
   * Valida específicamente el tipo de archivo
   * @param filePath - Ruta del archivo
   * @param operation - Nombre de la operación
   * @returns Promise<SecurityValidationResult>
   */
  async validateFileType(filePath: string, operation: string): Promise<SecurityValidationResult> {
    try {
      const result = this.securityValidator.validateFileType(filePath, operation)

      if (!result.isValid) {
        const fileExtension = filePath.split('.').pop()?.toLowerCase() || ''
        const config = this.securityValidator.getSecurityConfig()

        throw new InvalidFileTypeException(
          result.errors.join('; '),
          fileExtension,
          config.fileValidation.allowedExtensions
        )
      }

      return result
    } catch (error) {
      if (error instanceof InvalidFileTypeException) {
        throw error
      }
      throw new SecurityValidationException(
        `Error validando tipo de archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'file-type-validation',
        filePath
      )
    }
  }

  /**
   * Valida específicamente el tamaño del archivo
   * @param filePath - Ruta del archivo
   * @param operation - Nombre de la operación
   * @returns Promise<SecurityValidationResult>
   */
  async validateFileSize(filePath: string, operation: string): Promise<SecurityValidationResult> {
    try {
      const result = this.securityValidator.validateFileSize(filePath, operation)

      if (!result.isValid) {
        const fs = await import('fs/promises')
        const stats = await fs.stat(filePath)
        const config = this.securityValidator.getSecurityConfig()

        throw new FileSizeExceededException(
          result.errors.join('; '),
          stats.size,
          config.fileValidation.maxFileSize
        )
      }

      return result
    } catch (error) {
      if (error instanceof FileSizeExceededException) {
        throw error
      }
      throw new SecurityValidationException(
        `Error validando tamaño de archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'file-size-validation',
        filePath
      )
    }
  }

  /**
   * Valida específicamente path traversal
   * @param filePath - Ruta del archivo
   * @param allowedBasePath - Directorio base permitido
   * @param operation - Nombre de la operación
   * @returns Promise<SecurityValidationResult>
   */
  async validatePathTraversal(
    filePath: string,
    allowedBasePath: string,
    operation: string
  ): Promise<SecurityValidationResult> {
    try {
      const result = this.securityValidator.validatePathTraversal(
        filePath,
        allowedBasePath,
        operation
      )

      if (!result.isValid) {
        throw new PathTraversalException(result.errors.join('; '), filePath, allowedBasePath)
      }

      return result
    } catch (error) {
      if (error instanceof PathTraversalException) {
        throw error
      }
      throw new SecurityValidationException(
        `Error validando path traversal: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'path-traversal-validation',
        filePath
      )
    }
  }

  /**
   * Valida un archivo ZIP antes de la extracción
   * @param zipFilePath - Ruta del archivo ZIP
   * @param allowedBasePath - Directorio base permitido
   * @param operation - Nombre de la operación
   * @returns Promise<SecurityValidationResult>
   */
  async validateZipFile(
    zipFilePath: string,
    allowedBasePath: string,
    operation: string
  ): Promise<SecurityValidationResult> {
    this.logger.logInfo(`Validando archivo ZIP: ${zipFilePath}`)

    try {
      // Validar el archivo ZIP como archivo normal
      const fileResult = await this.validateFileForImport(
        zipFilePath,
        allowedBasePath,
        `${operation}-zip-validation`
      )

      if (!fileResult.isValid) {
        return fileResult
      }

      // Validaciones adicionales específicas para ZIP
      const result: SecurityValidationResult = {
        isValid: true,
        errors: [...fileResult.errors],
        warnings: [...fileResult.warnings]
      }

      // Verificar que la extensión sea .zip
      if (!zipFilePath.toLowerCase().endsWith('.zip')) {
        result.errors.push('El archivo debe tener extensión .zip')
        result.isValid = false
      }

      this.logger.logInfo(
        `Validación de ZIP completada: ${zipFilePath}. ` +
          `Válido: ${result.isValid}, Errores: ${result.errors.length}`
      )

      return result
    } catch (error) {
      this.logger.logError(`Error validando archivo ZIP: ${error}`)
      throw error
    }
  }

  /**
   * Obtiene la configuración actual de seguridad
   * @returns Configuración de seguridad
   */
  getSecurityConfiguration() {
    return this.securityValidator.getSecurityConfig()
  }

  /**
   * Actualiza la configuración de seguridad
   * @param config - Nueva configuración parcial
   */
  updateSecurityConfiguration(config: any) {
    this.securityValidator.updateSecurityConfig(config)
    this.logger.logInfo('Configuración de seguridad actualizada')
  }

  // Métodos privados

  /**
   * Maneja errores de seguridad y lanza excepciones específicas
   * @param result - Resultado de validación
   * @param filePath - Ruta del archivo
   * @param operation - Operación
   */
  private async handleSecurityErrors(
    result: SecurityValidationResult,
    filePath: string,
    operation: string
  ): Promise<void> {
    // Buscar tipos específicos de errores para lanzar excepciones apropiadas
    const errors = result.errors

    // Errores de tipo de archivo
    const fileTypeErrors = errors.filter(
      (error) =>
        error.includes('Tipo de archivo no permitido') ||
        error.includes('extensión de archivo peligrosa')
    )
    if (fileTypeErrors.length > 0) {
      const fileExtension = filePath.split('.').pop()?.toLowerCase() || ''
      const config = this.securityValidator.getSecurityConfig()
      throw new InvalidFileTypeException(
        fileTypeErrors.join('; '),
        fileExtension,
        config.fileValidation.allowedExtensions
      )
    }

    // Errores de tamaño de archivo
    const fileSizeErrors = errors.filter((error) => error.includes('excede el tamaño máximo'))
    if (fileSizeErrors.length > 0) {
      try {
        const fs = await import('fs/promises')
        const stats = await fs.stat(filePath)
        const config = this.securityValidator.getSecurityConfig()
        throw new FileSizeExceededException(
          fileSizeErrors.join('; '),
          stats.size,
          config.fileValidation.maxFileSize
        )
      } catch (statError) {
        // Si no se puede obtener el tamaño, lanzar excepción genérica
        throw new SecurityValidationException(
          fileSizeErrors.join('; '),
          'file-size-validation',
          filePath
        )
      }
    }

    // Errores de path traversal
    const pathTraversalErrors = errors.filter(
      (error) =>
        error.includes('path traversal') || error.includes('fuera del directorio permitido')
    )
    if (pathTraversalErrors.length > 0) {
      throw new PathTraversalException(
        pathTraversalErrors.join('; '),
        filePath,
        'directorio-permitido'
      )
    }

    // Error genérico de seguridad
    throw new SecurityValidationException(
      errors.join('; '),
      'general-security-validation',
      filePath
    )
  }
}
