import { resolve, normalize } from 'path'
import { ExportLogger } from './exportLogger'


export interface SecurityValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedValue?: any
}
export class SecurityValidator {
  private static instance: SecurityValidator
  private logger: ExportLogger

  private constructor() {
    this.logger = ExportLogger.getInstance()
  }

  /**
   * Obtiene la instancia singleton del validador
   * Porfin hice bien un singleton
   */
  static getInstance(): SecurityValidator {
    if (!SecurityValidator.instance) {
      SecurityValidator.instance = new SecurityValidator()
    }
    return SecurityValidator.instance
  }

  /**
   * Valida una ruta de archivo de forma integral
   * @param filePath - Ruta a validar
   * @param allowedBasePath - Directorio base permitido
   * @param operation - Nombre de la operación para logging
   * @returns SecurityValidationResult
   */
  validateFilePath(
    filePath: string,
    allowedBasePath: string,
    operation: string
  ): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      // Validar que la ruta no esté vacía
      if (!filePath || typeof filePath !== 'string' || filePath.trim().length === 0) {
        result.errors.push('La ruta del archivo no puede estar vacía')
        result.isValid = false
        return result
      }

      // Normalizar la ruta
      const normalizedPath = normalize(filePath)
      const resolvedPath = resolve(normalizedPath)
      const resolvedBasePath = resolve(allowedBasePath)

      // Verificar path traversal
      if (normalizedPath.includes('..')) {
        result.errors.push('La ruta contiene secuencias de path traversal (..) no permitidas')
        result.isValid = false
      }

      // Verificar que esté dentro del directorio permitido
      if (!resolvedPath.startsWith(resolvedBasePath)) {
        result.errors.push(`La ruta está fuera del directorio permitido: ${allowedBasePath}`)
        result.isValid = false
      }

      // Verificar caracteres peligrosos
      const dangerousChars = /[<>:"|?*\x00-\x1f]/
      if (dangerousChars.test(filePath)) {
        result.errors.push('La ruta contiene caracteres no válidos')
        result.isValid = false
      }

      // Verificar nombres reservados de Windows
      const pathParts = normalizedPath.split(/[/\\]/)
      const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i
      for (const part of pathParts) {
        if (reservedNames.test(part)) {
          result.errors.push(`La ruta contiene un nombre reservado del sistema: ${part}`)
          result.isValid = false
        }
      }

      // Verificar longitud de la ruta
      if (resolvedPath.length > 260) {
        result.warnings.push('La ruta es muy larga y puede causar problemas en Windows')
      }

      result.sanitizedValue = normalizedPath

      // Log del resultado
      this.logger.logSecurityValidation(
        operation,
        'file-path-validation',
        result.isValid,
        result.errors.join('; ')
      )
    } catch (error) {
      result.errors.push(
        `Error validando ruta: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
      result.isValid = false
    }

    return result
  }

  /**
   * Valida y sanitiza un nombre de archivo
   * @param filename - Nombre de archivo a validar
   * @param operation - Nombre de la operación para logging
   * @returns SecurityValidationResult
   */
  validateFilename(filename: string, operation: string): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      // Validar que el nombre no esté vacío
      if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
        result.errors.push('El nombre del archivo no puede estar vacío')
        result.isValid = false
        return result
      }

      let sanitizedFilename = filename

      // Verificar caracteres peligrosos
      const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/g
      if (dangerousChars.test(filename)) {
        sanitizedFilename = filename.replace(dangerousChars, '_')
        result.warnings.push('Se reemplazaron caracteres no válidos en el nombre del archivo')
      }

      // Verificar que no empiece con punto
      if (sanitizedFilename.startsWith('.')) {
        sanitizedFilename = '_' + sanitizedFilename
        result.warnings.push('Se agregó prefijo al nombre que empezaba con punto')
      }

      // Verificar nombres reservados
      const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i
      if (reservedNames.test(sanitizedFilename)) {
        sanitizedFilename = '_' + sanitizedFilename
        result.warnings.push('Se agregó prefijo a nombre reservado del sistema')
      }

      // Verificar longitud
      if (sanitizedFilename.length > 100) {
        sanitizedFilename = sanitizedFilename.substring(0, 100)
        result.warnings.push('Se truncó el nombre del archivo por longitud excesiva')
      }

      // Verificar que no termine con punto
      if (sanitizedFilename.endsWith('.')) {
        sanitizedFilename = sanitizedFilename.slice(0, -1) + '_'
        result.warnings.push('Se reemplazó punto final en el nombre del archivo')
      }

      result.sanitizedValue = sanitizedFilename

      // Log del resultado
      this.logger.logSecurityValidation(
        operation,
        'filename-validation',
        result.isValid,
        `Original: ${filename}, Sanitized: ${sanitizedFilename}`
      )
    } catch (error) {
      result.errors.push(
        `Error validando nombre de archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
      result.isValid = false
    }

    return result
  }

  /**
   * Valida datos de entrada para prevenir inyección de código
   * @param data - Datos a validar
   * @param operation - Nombre de la operación para logging
   * @returns SecurityValidationResult
   */
  validateDataForCSV(data: any[], operation: string): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      if (!Array.isArray(data)) {
        result.errors.push('Los datos deben ser un array')
        result.isValid = false
        return result
      }

      let suspiciousCount = 0
      const sanitizedData = data.map((row, index) => {
        if (typeof row !== 'object' || row === null) {
          return row
        }

        const sanitizedRow: any = {}
        for (const [key, value] of Object.entries(row)) {
          if (typeof value === 'string') {
            // Detectar posibles inyecciones de fórmulas
            if (this.containsFormulaInjection(value)) {
              suspiciousCount++
              sanitizedRow[key] = this.sanitizeFormulaInjection(value)
            } else {
              sanitizedRow[key] = value
            }
          } else {
            sanitizedRow[key] = value
          }
        }
        return sanitizedRow
      })

      if (suspiciousCount > 0) {
        result.warnings.push(
          `Se detectaron y sanitizaron ${suspiciousCount} valores con posible inyección de fórmulas`
        )
      }

      result.sanitizedValue = sanitizedData

      // Log del resultado
      this.logger.logSecurityValidation(
        operation,
        'csv-data-validation',
        result.isValid,
        `Registros procesados: ${data.length}, Valores sanitizados: ${suspiciousCount}`
      )
    } catch (error) {
      result.errors.push(
        `Error validando datos CSV: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
      result.isValid = false
    }

    return result
  }

  /**
   * Detecta posible inyección de fórmulas en valores de texto
   * @param value - Valor a verificar
   * @returns boolean - True si contiene posible inyección
   */
  private containsFormulaInjection(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false
    }

    // Caracteres que pueden iniciar fórmulas peligrosas
    const dangerousStarters = ['=', '+', '-', '@', '\t', '\r']
    return dangerousStarters.some((starter) => value.startsWith(starter))
  }

  /**
   * Sanitiza valores que contienen posible inyección de fórmulas
   * @param value - Valor a sanitizar
   * @returns string - Valor sanitizado
   */
  private sanitizeFormulaInjection(value: string): string {
    if (!value || typeof value !== 'string') {
      return value
    }

    // Si empieza con carácter peligroso, agregar comilla simple
    const dangerousStarters = ['=', '+', '-', '@', '\t', '\r']
    if (dangerousStarters.some((starter) => value.startsWith(starter))) {
      return `'${value}`
    }

    return value
  }

  /**
   * Valida límites de memoria y recursos
   * @param recordCount - Número de registros
   * @param estimatedSize - Tamaño estimado en bytes
   * @param operation - Nombre de la operación para logging
   * @returns SecurityValidationResult
   */
  validateResourceLimits(
    recordCount: number,
    estimatedSize: number,
    operation: string
  ): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      // Límites configurables (estos deberían venir de configuración)
      const MAX_RECORDS = 100000
      const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

      if (recordCount > MAX_RECORDS) {
        result.errors.push(
          `Número de registros (${recordCount}) excede el límite máximo (${MAX_RECORDS})`
        )
        result.isValid = false
      }

      if (estimatedSize > MAX_SIZE_BYTES) {
        result.errors.push(
          `Tamaño estimado (${(estimatedSize / 1024 / 1024).toFixed(2)}MB) excede el límite máximo (${MAX_SIZE_BYTES / 1024 / 1024}MB)`
        )
        result.isValid = false
      }

      // Advertencias para valores altos pero dentro del límite
      if (recordCount > MAX_RECORDS * 0.8) {
        result.warnings.push(`Número de registros cercano al límite máximo`)
      }

      if (estimatedSize > MAX_SIZE_BYTES * 0.8) {
        result.warnings.push(`Tamaño estimado cercano al límite máximo`)
      }

      // Log del resultado
      this.logger.logSecurityValidation(
        operation,
        'resource-limits-validation',
        result.isValid,
        `Records: ${recordCount}, Size: ${(estimatedSize / 1024 / 1024).toFixed(2)}MB`
      )
    } catch (error) {
      result.errors.push(
        `Error validando límites de recursos: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
      result.isValid = false
    }

    return result
  }

  /**
   * Realiza una validación completa de seguridad para una operación de exportación
   * @param params - Parámetros de la operación
   * @returns SecurityValidationResult
   */
  validateExportOperation(params: {
    filePath?: string
    filename?: string
    data?: any[]
    recordCount?: number
    estimatedSize?: number
    allowedBasePath?: string
    operation: string
  }): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    // Validar ruta de archivo si se proporciona
    if (params.filePath && params.allowedBasePath) {
      const pathResult = this.validateFilePath(
        params.filePath,
        params.allowedBasePath,
        params.operation
      )
      result.errors.push(...pathResult.errors)
      result.warnings.push(...pathResult.warnings)
      if (!pathResult.isValid) {
        result.isValid = false
      }
    }

    // Validar nombre de archivo si se proporciona
    if (params.filename) {
      const filenameResult = this.validateFilename(params.filename, params.operation)
      result.errors.push(...filenameResult.errors)
      result.warnings.push(...filenameResult.warnings)
      if (!filenameResult.isValid) {
        result.isValid = false
      }
    }

    // Validar datos si se proporcionan
    if (params.data) {
      const dataResult = this.validateDataForCSV(params.data, params.operation)
      result.errors.push(...dataResult.errors)
      result.warnings.push(...dataResult.warnings)
      if (!dataResult.isValid) {
        result.isValid = false
      }
    }

    // Validar límites de recursos si se proporcionan
    if (params.recordCount !== undefined && params.estimatedSize !== undefined) {
      const resourceResult = this.validateResourceLimits(
        params.recordCount,
        params.estimatedSize,
        params.operation
      )
      result.errors.push(...resourceResult.errors)
      result.warnings.push(...resourceResult.warnings)
      if (!resourceResult.isValid) {
        result.isValid = false
      }
    }

    return result
  }
}
