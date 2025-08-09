import { resolve, normalize, extname } from 'path'
import { statSync } from 'fs'
import { ExportLogger } from './exportLogger'

export interface SecurityValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedValue?: any
}

export interface FileTypeValidationConfig {
  allowedExtensions: string[]
  allowedMimeTypes?: string[]
  maxFileSize: number
  enableMimeTypeCheck: boolean
}

export interface SecurityConfig {
  fileValidation: FileTypeValidationConfig
  pathValidation: {
    allowedBasePaths: string[]
    preventPathTraversal: boolean
    maxPathLength: number
  }
  dataValidation: {
    enableSanitization: boolean
    maxStringLength: number
    preventScriptInjection: boolean
  }
}
export class SecurityValidator {
  private static instance: SecurityValidator
  private logger: ExportLogger
  private config: SecurityConfig

  private constructor() {
    this.logger = ExportLogger.getInstance()
    this.config = this.getDefaultSecurityConfig()
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
      const sanitizedData = data.map((row, _index) => {
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

  /**
   * Valida el tipo de archivo permitido
   * @param filePath - Ruta del archivo a validar
   * @param operation - Nombre de la operación para logging
   * @returns SecurityValidationResult
   */
  validateFileType(filePath: string, operation: string): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      if (!filePath || typeof filePath !== 'string') {
        result.errors.push('La ruta del archivo no puede estar vacía')
        result.isValid = false
        return result
      }

      // Obtener extensión del archivo
      const fileExtension = extname(filePath).toLowerCase()

      if (!fileExtension) {
        result.errors.push('El archivo debe tener una extensión válida')
        result.isValid = false
        return result
      }

      // Validar extensión permitida
      if (!this.config.fileValidation.allowedExtensions.includes(fileExtension)) {
        result.errors.push(
          `Tipo de archivo no permitido: ${fileExtension}. ` +
            `Tipos permitidos: ${this.config.fileValidation.allowedExtensions.join(', ')}`
        )
        result.isValid = false
      }

      // Validar extensiones peligrosas específicas
      const dangerousExtensions = [
        '.exe',
        '.bat',
        '.cmd',
        '.com',
        '.scr',
        '.pif',
        '.vbs',
        '.js',
        '.jar',
        '.app',
        '.deb',
        '.pkg',
        '.dmg'
      ]
      if (dangerousExtensions.includes(fileExtension)) {
        result.errors.push(`Extensión de archivo peligrosa detectada: ${fileExtension}`)
        result.isValid = false
      }

      // Log del resultado
      this.logger.logSecurityValidation(
        operation,
        'file-type-validation',
        result.isValid,
        `Extension: ${fileExtension}, Allowed: ${this.config.fileValidation.allowedExtensions.join(', ')}`
      )
    } catch (error) {
      result.errors.push(
        `Error validando tipo de archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
      result.isValid = false
    }

    return result
  }

  /**
   * Valida el tamaño del archivo
   * @param filePath - Ruta del archivo a validar
   * @param operation - Nombre de la operación para logging
   * @returns SecurityValidationResult
   */
  validateFileSize(filePath: string, operation: string): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      if (!filePath || typeof filePath !== 'string') {
        result.errors.push('La ruta del archivo no puede estar vacía')
        result.isValid = false
        return result
      }

      // Obtener estadísticas del archivo
      const stats = statSync(filePath)
      const fileSizeBytes = stats.size
      const maxSizeBytes = this.config.fileValidation.maxFileSize

      // Validar tamaño máximo
      if (fileSizeBytes > maxSizeBytes) {
        result.errors.push(
          `El archivo excede el tamaño máximo permitido. ` +
            `Tamaño: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB, ` +
            `Máximo: ${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB`
        )
        result.isValid = false
      }

      // Advertencia para archivos grandes (80% del límite)
      const warningThreshold = maxSizeBytes * 0.8
      if (fileSizeBytes > warningThreshold && fileSizeBytes <= maxSizeBytes) {
        result.warnings.push(
          `El archivo es grande (${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB). ` +
            `Considere dividirlo en archivos más pequeños para mejor rendimiento.`
        )
      }

      // Validar que el archivo no esté vacío
      if (fileSizeBytes === 0) {
        result.errors.push('El archivo está vacío')
        result.isValid = false
      }

      // Log del resultado
      this.logger.logSecurityValidation(
        operation,
        'file-size-validation',
        result.isValid,
        `Size: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB, Max: ${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB`
      )
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        result.errors.push('El archivo no existe')
      } else {
        result.errors.push(
          `Error validando tamaño de archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
        )
      }
      result.isValid = false
    }

    return result
  }

  /**
   * Valida y sanitiza datos de entrada para prevenir inyecciones
   * @param data - Datos a validar y sanitizar
   * @param operation - Nombre de la operación para logging
   * @returns SecurityValidationResult
   */
  sanitizeInputData(data: any, operation: string): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      if (data === null || data === undefined) {
        result.sanitizedValue = data
        return result
      }

      let sanitizedData = data
      let sanitizationCount = 0

      if (typeof data === 'string') {
        sanitizedData = this.sanitizeString(data)
        if (sanitizedData !== data) {
          sanitizationCount++
        }
      } else if (Array.isArray(data)) {
        sanitizedData = data.map((item, index) => {
          const itemResult = this.sanitizeInputData(item, `${operation}-item-${index}`)
          if (itemResult.sanitizedValue !== item) {
            sanitizationCount++
          }
          return itemResult.sanitizedValue
        })
      } else if (typeof data === 'object') {
        sanitizedData = {}
        for (const [key, value] of Object.entries(data)) {
          const keyResult = this.sanitizeInputData(key, `${operation}-key`)
          const valueResult = this.sanitizeInputData(value, `${operation}-value`)

          if (keyResult.sanitizedValue !== key || valueResult.sanitizedValue !== value) {
            sanitizationCount++
          }

          sanitizedData[keyResult.sanitizedValue] = valueResult.sanitizedValue
        }
      }

      if (sanitizationCount > 0) {
        result.warnings.push(
          `Se sanitizaron ${sanitizationCount} valores para prevenir inyecciones de código`
        )
      }

      result.sanitizedValue = sanitizedData

      // Log del resultado
      this.logger.logSecurityValidation(
        operation,
        'input-data-sanitization',
        result.isValid,
        `Sanitized values: ${sanitizationCount}`
      )
    } catch (error) {
      result.errors.push(
        `Error sanitizando datos de entrada: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
      result.isValid = false
    }

    return result
  }

  /**
   * Valida rutas de archivos para prevenir path traversal
   * @param filePath - Ruta a validar
   * @param allowedBasePath - Directorio base permitido
   * @param operation - Nombre de la operación para logging
   * @returns SecurityValidationResult
   */
  validatePathTraversal(
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
      if (!filePath || typeof filePath !== 'string') {
        result.errors.push('La ruta del archivo no puede estar vacía')
        result.isValid = false
        return result
      }

      // Normalizar rutas
      const normalizedPath = normalize(filePath)
      const resolvedPath = resolve(normalizedPath)
      const resolvedBasePath = resolve(allowedBasePath)

      // Verificar path traversal explícito
      if (normalizedPath.includes('..')) {
        result.errors.push('La ruta contiene secuencias de path traversal (..) no permitidas')
        result.isValid = false
      }

      // Verificar que esté dentro del directorio permitido
      if (!resolvedPath.startsWith(resolvedBasePath)) {
        result.errors.push(
          `La ruta está fuera del directorio permitido. ` +
            `Ruta: ${resolvedPath}, Permitido: ${resolvedBasePath}`
        )
        result.isValid = false
      }

      // Verificar patrones de path traversal codificados
      const encodedTraversalPatterns = [
        '%2e%2e%2f', // ../
        '%2e%2e%5c', // ..\
        '%2e%2e/', // ../
        '%2e%2e\\', // ..\
        '..%2f', // ../
        '..%5c', // ..\
        '%252e%252e%252f' // doble codificación
      ]

      const lowerPath = filePath.toLowerCase()
      for (const pattern of encodedTraversalPatterns) {
        if (lowerPath.includes(pattern)) {
          result.errors.push(`Patrón de path traversal codificado detectado: ${pattern}`)
          result.isValid = false
        }
      }

      // Verificar caracteres nulos y de control
      if (/[\x00-\x1f]/.test(filePath)) {
        result.errors.push('La ruta contiene caracteres de control no válidos')
        result.isValid = false
      }

      // Verificar longitud máxima de ruta
      if (resolvedPath.length > this.config.pathValidation.maxPathLength) {
        result.errors.push(
          `La ruta excede la longitud máxima permitida (${this.config.pathValidation.maxPathLength} caracteres)`
        )
        result.isValid = false
      }

      result.sanitizedValue = normalizedPath

      // Log del resultado
      this.logger.logSecurityValidation(
        operation,
        'path-traversal-validation',
        result.isValid,
        `Path: ${filePath}, Base: ${allowedBasePath}`
      )
    } catch (error) {
      result.errors.push(
        `Error validando path traversal: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
      result.isValid = false
    }

    return result
  }

  /**
   * Realiza una validación completa de seguridad para importación
   * @param params - Parámetros de la operación de importación
   * @returns SecurityValidationResult
   */
  validateImportSecurity(params: {
    filePath: string
    allowedBasePath: string
    operation: string
    validateContent?: boolean
    data?: any
  }): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      // 1. Validar tipo de archivo
      const fileTypeResult = this.validateFileType(params.filePath, params.operation)
      result.errors.push(...fileTypeResult.errors)
      result.warnings.push(...fileTypeResult.warnings)
      if (!fileTypeResult.isValid) {
        result.isValid = false
      }

      // 2. Validar tamaño de archivo
      const fileSizeResult = this.validateFileSize(params.filePath, params.operation)
      result.errors.push(...fileSizeResult.errors)
      result.warnings.push(...fileSizeResult.warnings)
      if (!fileSizeResult.isValid) {
        result.isValid = false
      }

      // 3. Validar path traversal
      const pathResult = this.validatePathTraversal(
        params.filePath,
        params.allowedBasePath,
        params.operation
      )
      result.errors.push(...pathResult.errors)
      result.warnings.push(...pathResult.warnings)
      if (!pathResult.isValid) {
        result.isValid = false
      }

      // 4. Validar contenido si se proporciona
      if (params.validateContent && params.data) {
        const dataResult = this.sanitizeInputData(params.data, params.operation)
        result.errors.push(...dataResult.errors)
        result.warnings.push(...dataResult.warnings)
        result.sanitizedValue = dataResult.sanitizedValue
        if (!dataResult.isValid) {
          result.isValid = false
        }
      }

      // Log del resultado general
      this.logger.logSecurityValidation(
        params.operation,
        'complete-import-security-validation',
        result.isValid,
        `File: ${params.filePath}, Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`
      )
    } catch (error) {
      result.errors.push(
        `Error en validación completa de seguridad: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
      result.isValid = false
    }

    return result
  }

  /**
   * Actualiza la configuración de seguridad
   * @param newConfig - Nueva configuración parcial
   */
  updateSecurityConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      fileValidation: {
        ...this.config.fileValidation,
        ...newConfig.fileValidation
      },
      pathValidation: {
        ...this.config.pathValidation,
        ...newConfig.pathValidation
      },
      dataValidation: {
        ...this.config.dataValidation,
        ...newConfig.dataValidation
      }
    }
  }

  /**
   * Obtiene la configuración actual de seguridad
   * @returns SecurityConfig - Configuración actual
   */
  getSecurityConfig(): SecurityConfig {
    return { ...this.config }
  }

  // Métodos privados de apoyo

  /**
   * Obtiene la configuración de seguridad por defecto
   * @returns SecurityConfig - Configuración por defecto
   */
  private getDefaultSecurityConfig(): SecurityConfig {
    return {
      fileValidation: {
        allowedExtensions: ['.csv', '.zip'],
        allowedMimeTypes: ['text/csv', 'application/zip', 'application/x-zip-compressed'],
        maxFileSize: 50 * 1024 * 1024, // 50MB
        enableMimeTypeCheck: false // Deshabilitado por defecto para evitar dependencias adicionales
      },
      pathValidation: {
        allowedBasePaths: ['temp/imports', 'temp/exports', 'uploads'],
        preventPathTraversal: true,
        maxPathLength: 260 // Límite de Windows
      },
      dataValidation: {
        enableSanitization: true,
        maxStringLength: 10000,
        preventScriptInjection: true
      }
    }
  }

  /**
   * Sanitiza una cadena de texto
   * @param value - Valor a sanitizar
   * @returns string - Valor sanitizado
   */
  private sanitizeString(value: string): string {
    if (!value || typeof value !== 'string') {
      return value
    }

    let sanitized = value

    // Limitar longitud
    if (sanitized.length > this.config.dataValidation.maxStringLength) {
      sanitized = sanitized.substring(0, this.config.dataValidation.maxStringLength)
    }

    if (this.config.dataValidation.preventScriptInjection) {
      // Prevenir inyección de scripts
      sanitized = sanitized
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remover tags script
        .replace(/javascript:/gi, '') // Remover javascript:
        .replace(/on\w+\s*=/gi, '') // Remover event handlers
        .replace(/expression\s*\(/gi, '') // Remover CSS expressions
        .replace(/vbscript:/gi, '') // Remover vbscript:
        .replace(/data:text\/html/gi, '') // Remover data URLs HTML

      // Escapar caracteres HTML peligrosos
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
    }

    // Sanitizar para CSV (prevenir inyección de fórmulas)
    if (this.containsFormulaInjection(sanitized)) {
      sanitized = this.sanitizeFormulaInjection(sanitized)
    }

    return sanitized
  }
}
