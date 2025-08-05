import { writeFileSync, mkdirSync } from 'fs'
import { join, resolve, normalize } from 'path'
import { ExportConfigManager } from '../config/exportConfig'
import { ExportLogger } from './exportLogger'

export class CsvGenerator {
  private configManager: ExportConfigManager
  private logger: ExportLogger

  constructor() {
    this.configManager = ExportConfigManager.getInstance()
    this.logger = ExportLogger.getInstance()
  }
  /**
   * Genera un archivo CSV a partir de datos y encabezados
   * @param data - Array de objetos con los datos a exportar
   * @param headers - Array con los nombres de las columnas
   * @param filename - Nombre del archivo (sin extensión)
   * @param outputDir - Directorio de salida (opcional, por defecto temp/exports)
   * @returns Promise<string> - Ruta completa del archivo generado
   */
  async generateCSV<T extends Record<string, any>>(
    data: T[],
    headers: string[],
    filename: string,
    outputDir: string = 'temp/exports'
  ): Promise<string> {
    const startTime = Date.now()
    const operation = `generateCSV-${filename}`
    let timeout: NodeJS.Timeout | null = null

    try {
      // Iniciar logging de la operación
      this.logger.logExportStart(operation, {
        filename,
        recordCount: data.length,
        headerCount: headers.length,
        outputDir
      })

      // Crear timeout para la operación
      timeout = this.configManager.createTimeout('generateCSV')

      // Validar parámetros de entrada
      this.validateInputParameters(data, headers, filename, outputDir)
      this.logger.logSecurityValidation(operation, 'input-parameters', true)

      // Validar límites de memoria y registros
      try {
        this.configManager.validateRecordCount(data.length)
        this.logger.logSecurityValidation(operation, 'record-count-limit', true)
      } catch (error) {
        this.logger.logLimitViolation(operation, 'record-count', data.length, this.configManager.getConfig().MAX_RECORDS_PER_EXPORT)
        throw error
      }

      // Validar y sanitizar rutas
      const safeOutputDir = this.validateAndSanitizePath(outputDir)
      const safeFilename = this.sanitizeFilename(filename)
      this.logger.logSecurityValidation(operation, 'path-sanitization', true, `${safeOutputDir}/${safeFilename}`)

      // Crear directorio si no existe
      mkdirSync(safeOutputDir, { recursive: true })

      const filePath = join(safeOutputDir, `${safeFilename}.csv`)

      // Validar que la ruta final sea segura
      this.validateFinalPath(filePath, safeOutputDir)
      this.logger.logSecurityValidation(operation, 'final-path-validation', true, filePath)

      // Generar contenido CSV
      const csvContent = this.buildCSVContent(data, headers)

      // Validar tamaño del contenido antes de escribir
      const contentSizeBytes = Buffer.byteLength(csvContent, 'utf8')
      try {
        this.configManager.validateFileSize(contentSizeBytes)
        this.logger.logSecurityValidation(operation, 'file-size-limit', true, `${(contentSizeBytes / 1024 / 1024).toFixed(2)}MB`)
      } catch (error) {
        this.logger.logLimitViolation(operation, 'file-size', contentSizeBytes, this.configManager.getConfig().MAX_FILE_SIZE_MB * 1024 * 1024)
        throw error
      }

      // Escribir archivo con codificación UTF-8
      writeFileSync(filePath, csvContent, { encoding: 'utf8' })
      this.logger.logFileAccess(operation, filePath, 'CREATE', true, contentSizeBytes)

      // Limpiar timeout
      if (timeout) {
        clearTimeout(timeout)
      }

      const duration = Date.now() - startTime
      this.logger.logExportSuccess(operation, duration, {
        filePath,
        fileSize: contentSizeBytes,
        recordCount: data.length
      })

      this.logger.logPerformance(operation, {
        duration,
        recordsProcessed: data.length,
        throughput: data.length / (duration / 1000) // registros por segundo
      })

      return filePath
    } catch (error) {
      // Limpiar timeout en caso de error
      if (timeout) {
        clearTimeout(timeout)
      }

      const duration = Date.now() - startTime
      this.logger.logExportError(operation, error as Error, duration, {
        filename,
        recordCount: data.length,
        outputDir
      })

      throw new Error(
        `Error generando archivo CSV ${filename}: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Valida los parámetros de entrada para la generación de CSV
   * @param data - Datos a validar
   * @param headers - Encabezados a validar
   * @param filename - Nombre de archivo a validar
   * @param outputDir - Directorio de salida a validar
   */
  private validateInputParameters<T>(
    data: T[],
    headers: string[],
    filename: string,
    outputDir: string
  ): void {
    if (!Array.isArray(data)) {
      throw new Error('Los datos deben ser un array')
    }

    if (!Array.isArray(headers) || headers.length === 0) {
      throw new Error('Los encabezados deben ser un array no vacío')
    }

    if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
      throw new Error('El nombre de archivo debe ser una cadena no vacía')
    }

    if (!outputDir || typeof outputDir !== 'string' || outputDir.trim().length === 0) {
      throw new Error('El directorio de salida debe ser una cadena no vacía')
    }
  }

  /**
   * Valida y sanitiza una ruta de directorio
   * @param path - Ruta a validar y sanitizar
   * @returns string - Ruta sanitizada y validada
   */
  private validateAndSanitizePath(path: string): string {
    // Normalizar la ruta para resolver .. y .
    const normalizedPath = normalize(path)

    // Resolver a ruta absoluta
    const resolvedPath = resolve(normalizedPath)

    // Validar que no contenga caracteres peligrosos
    const dangerousPatterns = [
      /\.\./,  // Path traversal
      /[<>:"|?*]/,  // Caracteres inválidos en Windows
      /[\x00-\x1f]/,  // Caracteres de control
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(normalizedPath)) {
        throw new Error(`Ruta contiene caracteres no válidos: ${path}`)
      }
    }

    // Validar que esté dentro del directorio de trabajo permitido
    const workingDir = resolve(process.cwd())
    if (!resolvedPath.startsWith(workingDir)) {
      throw new Error(`Ruta fuera del directorio de trabajo permitido: ${path}`)
    }

    return normalizedPath
  }

  /**
   * Sanitiza un nombre de archivo
   * @param filename - Nombre de archivo a sanitizar
   * @returns string - Nombre de archivo sanitizado
   */
  private sanitizeFilename(filename: string): string {
    const config = this.configManager.getConfig()
    
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Reemplazar caracteres inválidos
      .replace(/^\.+/, '_') // No permitir nombres que empiecen con puntos
      .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
      .substring(0, config.MAX_FILENAME_LENGTH) // Limitar longitud según configuración
      .trim()
  }

  /**
   * Valida que la ruta final del archivo sea segura
   * @param filePath - Ruta completa del archivo
   * @param expectedDir - Directorio esperado
   */
  private validateFinalPath(filePath: string, expectedDir: string): void {
    const resolvedFilePath = resolve(filePath)
    const resolvedExpectedDir = resolve(expectedDir)

    if (!resolvedFilePath.startsWith(resolvedExpectedDir)) {
      throw new Error('La ruta del archivo no está dentro del directorio esperado')
    }

    // Validar extensión
    if (!filePath.toLowerCase().endsWith('.csv')) {
      throw new Error('El archivo debe tener extensión .csv')
    }
  }

  /**
   * Construye el contenido completo del CSV
   * @param data - Datos a incluir
   * @param headers - Encabezados de columnas
   * @returns string - Contenido CSV completo
   */
  private buildCSVContent<T extends Record<string, any>>(data: T[], headers: string[]): string {
    const lines: string[] = []

    // Agregar encabezados (Requisito 1.1)
    lines.push(headers.join(','))

    // Agregar filas de datos
    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header]
        return this.escapeCSVValue(value)
      })
      lines.push(values.join(','))
    }

    // Usar terminadores de línea estándar CRLF en Windows (Requisito 7.4)
    return lines.join('\r\n')
  }

  /**
   * Escapa apropiadamente los valores para CSV
   * Maneja comas, comillas, saltos de línea y valores nulos
   * Incluye sanitización de seguridad para prevenir inyección de código
   * @param value - Valor a escapar
   * @returns string - Valor escapado para CSV
   */
  escapeCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return ''
    }

    // Convertir a string
    let stringValue = String(value)

    // Formatear fechas si es necesario
    if (value instanceof Date) {
      stringValue = this.formatDate(value)
    }

    // Sanitización de seguridad - prevenir inyección de fórmulas
    stringValue = this.sanitizeForCSV(stringValue)

    // Si contiene coma, comilla doble o salto de línea, debe ir entre comillas
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r')
    ) {
      stringValue = stringValue.replace(/"/g, '""')
      return `"${stringValue}"`
    }

    return stringValue
  }

  /**
   * Sanitiza valores para prevenir inyección de código en CSV
   * Previene inyección de fórmulas en Excel y otras aplicaciones
   * @param value - Valor a sanitizar
   * @returns string - Valor sanitizado
   */
  private sanitizeForCSV(value: string): string {
    if (!value || typeof value !== 'string') {
      return value
    }

    // Caracteres peligrosos que pueden iniciar fórmulas
    const dangerousChars = ['=', '+', '-', '@', '\t', '\r']
    
    // Si el valor comienza con un carácter peligroso, agregar comilla simple
    if (dangerousChars.some(char => value.startsWith(char))) {
      return `'${value}`
    }

    // Remover caracteres de control peligrosos
    return value
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Caracteres de control
      .replace(/\x00/g, '') // Null bytes
      .trim() // Espacios al inicio y final
  }

  /**
   * @param date - Fecha a formatear
   * @returns string - Fecha en formato ISO 8601
   */
  formatDate(date: Date): string {
    return date.toISOString()
  }

  /**
   * Valida que los encabezados sean válidos para CSV
   * @param headers - Array de encabezados a validar
   * @returns boolean - True si todos los encabezados son válidos
   */
  validateHeaders(headers: string[]): boolean {
    if (!headers || headers.length === 0) {
      return false
    }

    // Verificar que no haya encabezados vacíos o duplicados
    const uniqueHeaders = new Set(headers.filter((h) => h && h.trim().length > 0))
    return uniqueHeaders.size === headers.length
  }

  /**
   * Obtiene estadísticas del archivo CSV generado
   * @param data - Datos utilizados para generar el CSV
   * @param headers - Encabezados utilizados
   * @returns object - Estadísticas del archivo
   */
  getCSVStats<T>(
    data: T[],
    headers: string[]
  ): { rows: number; columns: number; estimatedSize: number } {
    const rows = data.length + 1 // +1 por los encabezados
    const columns = headers.length

    // Estimación aproximada del tamaño en bytes
    const headerSize = headers.join(',').length + 2
    const avgRowSize =
      data.length > 0
        ? Math.ceil(JSON.stringify(data[0]).length * 1.2) // Factor de escape
        : 50
    const estimatedSize = headerSize + avgRowSize * data.length

    return { rows, columns, estimatedSize }
  }
}
