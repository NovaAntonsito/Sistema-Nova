import { readFileSync } from 'fs'
import {
  ParseResult,
  ParseError,
  CSVSchema,
  EntityType,
  UserImportData,
  BudgetImportData,
  QuotaImportData,
  InterestImportData
} from '../types/import.types'
import {
  ImportException,
  CSVParseException,
  InvalidFileFormatException,
  FileNotFoundException
} from '../exceptions/importExceptions'
import { existsSync, statSync } from 'fs'

/**
 * Parser de archivos CSV con capacidades de validación de formato
 * Cumple con requisitos: 1.5, 2.5, 3.5, 4.5, 5.1, 5.2
 */
export class CsvParser {
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
  private readonly SUPPORTED_ENCODINGS = ['utf8', 'utf-8', 'latin1']

  /**
   * Esquemas de CSV para cada tipo de entidad
   */
  private readonly schemas: Record<EntityType, CSVSchema> = {
    [EntityType.USER]: {
      entityType: EntityType.USER,
      requiredHeaders: [
        'id',
        'nombre',
        'email',
        'phoneNumber',
        'isDeleted',
        'createdAt',
        'updatedAt'
      ],
      fieldValidators: {
        email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        isDeleted: (value: string) => ['true', 'false'].includes(value.toLowerCase())
      }
    },
    [EntityType.BUDGET]: {
      entityType: EntityType.BUDGET,
      requiredHeaders: [
        'id',
        '_creationDate',
        '_expirationDate',
        'currentStatus',
        'totalAmount',
        'currentInterest',
        'paymentTerm',
        'code',
        'userId',
        'isDeleted',
        'updatedAt'
      ],
      fieldValidators: {
        totalAmount: (value: string) => !isNaN(parseFloat(value)) && parseFloat(value) >= 0,
        currentInterest: (value: string) => !isNaN(parseFloat(value)) && parseFloat(value) >= 0,
        paymentTerm: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
        isDeleted: (value: string) => ['true', 'false'].includes(value.toLowerCase())
      }
    },
    [EntityType.QUOTA]: {
      entityType: EntityType.QUOTA,
      requiredHeaders: ['id', '_creationDate', 'amount', 'budgetId', 'isDeleted'],
      fieldValidators: {
        amount: (value: string) => !isNaN(parseFloat(value)) && parseFloat(value) >= 0,
        isDeleted: (value: string) => ['true', 'false'].includes(value.toLowerCase())
      }
    },
    [EntityType.INTEREST]: {
      entityType: EntityType.INTEREST,
      requiredHeaders: [
        'id',
        'paymentTerm',
        'interestPercentage',
        'isActive',
        'createdAt',
        'updatedAt'
      ],
      fieldValidators: {
        paymentTerm: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
        interestPercentage: (value: string) => !isNaN(parseFloat(value)) && parseFloat(value) >= 0,
        isActive: (value: string) => ['true', 'false'].includes(value.toLowerCase())
      }
    }
  }

  /**
   * Parsea un archivo CSV y retorna los datos validados
   * @param filePath - Ruta del archivo CSV
   * @param entityType - Tipo de entidad a parsear
   * @returns Promise<ParseResult<T>> - Resultado del parsing
   */
  async parseCSV<T>(filePath: string, entityType: EntityType): Promise<ParseResult<T>> {
    const startTime = Date.now()
    const errors: ParseError[] = []
    const data: T[] = []
    let totalRows = 0
    let validRows = 0

    try {
      // Validar que el archivo existe
      if (!existsSync(filePath)) {
        throw new FileNotFoundException(`Archivo no encontrado: ${filePath}`, filePath)
      }

      // Validar tamaño del archivo
      const stats = statSync(filePath)
      if (stats.size > this.MAX_FILE_SIZE) {
        throw new InvalidFileFormatException(
          `Archivo demasiado grande: ${stats.size} bytes. Máximo permitido: ${this.MAX_FILE_SIZE} bytes`,
          'csv'
        )
      }

      // Validar formato del archivo
      if (!filePath.toLowerCase().endsWith('.csv')) {
        throw new InvalidFileFormatException(
          `Formato de archivo inválido. Se esperaba .csv`,
          'csv',
          filePath.split('.').pop()
        )
      }

      const schema = this.schemas[entityType]
      if (!schema) {
        throw new InvalidFileFormatException(
          `Tipo de entidad no soportado: ${entityType}`,
          'supported entity type'
        )
      }

      // Leer y parsear el archivo CSV
      const content = readFileSync(filePath, 'utf8')
      const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '')

      if (lines.length === 0) {
        throw new CSVParseException('Archivo CSV vacío', 0)
      }

      // Parsear headers
      const headers = this.parseCSVLine(lines[0])
      this.validateCSVHeaders(headers, schema)

      // Parsear datos
      for (let i = 1; i < lines.length; i++) {
        const lineNumber = i + 1
        totalRows++

        try {
          const values = this.parseCSVLine(lines[i])
          if (values.length === 0) continue // Saltar líneas vacías

          // Crear objeto con headers como keys
          const row: any = {}
          headers.forEach((header, index) => {
            row[header] = values[index] || ''
          })

          const validatedRow = this.validateAndTransformRow(row, schema, lineNumber)
          if (validatedRow) {
            data.push(validatedRow as T)
            validRows++
          }
        } catch (error) {
          if (error instanceof CSVParseException) {
            errors.push({
              line: error.line,
              column: error.column,
              message: error.message,
              value: lines[i]
            })
          } else {
            errors.push({
              line: lineNumber,
              message: error instanceof Error ? error.message : 'Error desconocido',
              value: lines[i]
            })
          }
        }
      }

      const duration = Date.now() - startTime
      console.log(`CSV parseado en ${duration}ms: ${validRows}/${totalRows} filas válidas`)

      return {
        data,
        errors,
        totalRows,
        validRows
      }
    } catch (error) {
      if (error instanceof ImportException) {
        throw error
      }
      throw new CSVParseException(
        `Error parseando archivo CSV: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        0
      )
    }
  }

  /**
   * Valida que el formato del CSV sea correcto
   * @param filePath - Ruta del archivo
   * @param expectedHeaders - Headers esperados
   * @returns Promise<boolean> - True si el formato es válido
   */
  async validateCSVFormat(filePath: string, expectedHeaders: string[]): Promise<boolean> {
    try {
      if (!existsSync(filePath)) {
        return false
      }

      const content = readFileSync(filePath, 'utf8')
      const lines = content.split(/\r?\n/)

      if (lines.length === 0) {
        return false
      }

      const headers = this.parseCSVLine(lines[0])
      const normalizedHeaders = headers.map((h) => h.trim().toLowerCase())
      const normalizedExpected = expectedHeaders.map((h) => h.trim().toLowerCase())

      return normalizedExpected.every((expected) => normalizedHeaders.includes(expected))
    } catch {
      return false
    }
  }

  /**
   * Valida los headers del CSV contra el esquema
   * @param headers - Headers del archivo CSV
   * @param schema - Esquema de validación
   */
  private validateCSVHeaders(headers: string[], schema: CSVSchema): void {
    const normalizedHeaders = headers.map((h) => h.trim())
    const missingHeaders: string[] = []

    // Verificar headers requeridos
    for (const requiredHeader of schema.requiredHeaders) {
      if (!normalizedHeaders.includes(requiredHeader)) {
        missingHeaders.push(requiredHeader)
      }
    }

    if (missingHeaders.length > 0) {
      throw new CSVParseException(`Headers faltantes: ${missingHeaders.join(', ')}`, 1)
    }

    // Verificar headers duplicados
    const duplicates = normalizedHeaders.filter(
      (header, index) => normalizedHeaders.indexOf(header) !== index
    )

    if (duplicates.length > 0) {
      throw new CSVParseException(`Headers duplicados: ${duplicates.join(', ')}`, 1)
    }
  }

  /**
   * Valida y transforma una fila de datos
   * @param row - Fila de datos del CSV
   * @param schema - Esquema de validación
   * @param lineNumber - Número de línea
   * @returns Datos transformados o null si hay errores críticos
   */
  private validateAndTransformRow(
    row: any,
    schema: CSVSchema,
    lineNumber: number
  ): UserImportData | BudgetImportData | QuotaImportData | InterestImportData | null {
    const errors: string[] = []

    // Validar campos requeridos
    for (const requiredField of schema.requiredHeaders) {
      const value = row[requiredField]

      if (value === undefined || value === null || value === '') {
        errors.push(`Campo requerido '${requiredField}' está vacío`)
        continue
      }

      // Aplicar validadores específicos si existen
      if (schema.fieldValidators && schema.fieldValidators[requiredField]) {
        const validator = schema.fieldValidators[requiredField]
        if (!validator(value)) {
          errors.push(`Valor inválido para '${requiredField}': ${value}`)
        }
      }
    }

    if (errors.length > 0) {
      throw new CSVParseException(
        `Errores de validación en línea ${lineNumber}: ${errors.join(', ')}`,
        lineNumber
      )
    }

    // Transformar datos según el tipo de entidad
    return this.transformRowData(row, schema.entityType)
  }

  /**
   * Transforma los datos de una fila según el tipo de entidad
   * @param row - Datos de la fila
   * @param entityType - Tipo de entidad
   * @returns Datos transformados
   */
  private transformRowData(
    row: any,
    entityType: EntityType
  ): UserImportData | BudgetImportData | QuotaImportData | InterestImportData {
    switch (entityType) {
      case EntityType.USER:
        return {
          id: row.id,
          nombre: row.nombre,
          email: row.email,
          phoneNumber: row.phoneNumber,
          isDeleted: row.isDeleted.toLowerCase() === 'true',
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        } as UserImportData

      case EntityType.BUDGET:
        return {
          id: row.id,
          _creationDate: row._creationDate,
          _expirationDate: row._expirationDate,
          currentStatus: row.currentStatus,
          totalAmount: parseFloat(row.totalAmount),
          currentInterest: parseFloat(row.currentInterest),
          paymentTerm: parseInt(row.paymentTerm),
          code: row.code,
          userId: row.userId,
          isDeleted: row.isDeleted.toLowerCase() === 'true',
          updatedAt: row.updatedAt
        } as BudgetImportData

      case EntityType.QUOTA:
        return {
          id: row.id,
          _creationDate: row._creationDate,
          amount: parseFloat(row.amount),
          budgetId: row.budgetId,
          isDeleted: row.isDeleted.toLowerCase() === 'true'
        } as QuotaImportData

      case EntityType.INTEREST:
        return {
          id: row.id,
          paymentTerm: parseInt(row.paymentTerm),
          interestPercentage: parseFloat(row.interestPercentage),
          isActive: row.isActive.toLowerCase() === 'true',
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        } as InterestImportData

      default:
        throw new Error(`Tipo de entidad no soportado: ${entityType}`)
    }
  }

  /**
   * Obtiene el esquema para un tipo de entidad
   * @param entityType - Tipo de entidad
   * @returns Esquema de CSV
   */
  getSchema(entityType: EntityType): CSVSchema {
    const schema = this.schemas[entityType]
    if (!schema) {
      throw new Error(`Esquema no encontrado para tipo de entidad: ${entityType}`)
    }
    return schema
  }

  /**
   * Valida que un archivo tenga la extensión CSV
   * @param filePath - Ruta del archivo
   * @returns boolean - True si tiene extensión CSV
   */
  isCSVFile(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.csv')
  }

  /**
   * Parsea una línea CSV simple (sin soporte completo para comillas complejas)
   * @param line - Línea CSV a parsear
   * @returns Array de valores
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Comilla escapada
          current += '"'
          i++ // Saltar la siguiente comilla
        } else {
          // Cambiar estado de comillas
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // Separador encontrado fuera de comillas
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    // Agregar el último valor
    result.push(current.trim())

    return result
  }
}
