import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

/**
 * Utilidad para generar archivos CSV con escape apropiado de datos
 * Cumple con los requisitos 1.3, 7.1, 7.2, 7.3, 7.4
 */
export class CsvGenerator {
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
    try {
      // Crear directorio si no existe
      mkdirSync(outputDir, { recursive: true })
      
      const filePath = join(outputDir, `${filename}.csv`)
      
      // Generar contenido CSV
      const csvContent = this.buildCSVContent(data, headers)
      
      // Escribir archivo con codificación UTF-8
      writeFileSync(filePath, csvContent, { encoding: 'utf8' })
      
      return filePath
    } catch (error) {
      throw new Error(`Error generando archivo CSV ${filename}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
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
      const values = headers.map(header => {
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
   * Cumple con requisitos 7.2 y 7.3
   * @param value - Valor a escapar
   * @returns string - Valor escapado para CSV
   */
  escapeCSVValue(value: any): string {
    // Manejar valores nulos como campos vacíos (Requisito 7.3)
    if (value === null || value === undefined) {
      return ''
    }
    
    // Convertir a string
    let stringValue = String(value)
    
    // Formatear fechas si es necesario
    if (value instanceof Date) {
      stringValue = this.formatDate(value)
    }
    
    // Si contiene coma, comilla doble o salto de línea, debe ir entre comillas
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      // Escapar comillas dobles duplicándolas (Requisito 7.2)
      stringValue = stringValue.replace(/"/g, '""')
      // Envolver en comillas dobles
      return `"${stringValue}"`
    }
    
    return stringValue
  }

  /**
   * Formatea fechas en formato ISO 8601
   * Cumple con requisito 2.4
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
    const uniqueHeaders = new Set(headers.filter(h => h && h.trim().length > 0))
    return uniqueHeaders.size === headers.length
  }

  /**
   * Obtiene estadísticas del archivo CSV generado
   * @param data - Datos utilizados para generar el CSV
   * @param headers - Encabezados utilizados
   * @returns object - Estadísticas del archivo
   */
  getCSVStats<T>(data: T[], headers: string[]): { rows: number; columns: number; estimatedSize: number } {
    const rows = data.length + 1 // +1 por los encabezados
    const columns = headers.length
    
    // Estimación aproximada del tamaño en bytes
    const headerSize = headers.join(',').length + 2 // +2 por CRLF
    const avgRowSize = data.length > 0 
      ? Math.ceil(JSON.stringify(data[0]).length * 1.2) // Factor de escape
      : 50
    const estimatedSize = headerSize + (avgRowSize * data.length)
    
    return { rows, columns, estimatedSize }
  }
}