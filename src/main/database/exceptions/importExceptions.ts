/**
 * Excepciones específicas para el sistema de importación
 * Cumple con requisitos de manejo básico de errores de parsing
 */

/**
 * Excepción base para errores de importación
 */
export class ImportException extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'ImportException'
  }
}

/**
 * Excepción para errores de parsing de CSV
 */
export class CSVParseException extends ImportException {
  constructor(
    message: string,
    public line: number,
    public column?: number
  ) {
    super(message, 'CSV_PARSE_ERROR')
    this.name = 'CSVParseException'
  }
}

/**
 * Excepción para errores de validación
 */
export class ValidationException extends ImportException {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationException'
  }
}

/**
 * Excepción para errores de integridad referencial
 */
export class ReferentialIntegrityException extends ImportException {
  constructor(
    message: string,
    public entityType: string,
    public referenceId: string
  ) {
    super(message, 'REFERENTIAL_INTEGRITY_ERROR')
    this.name = 'ReferentialIntegrityException'
  }
}

/**
 * Excepción para errores de respaldo
 */
export class BackupException extends ImportException {
  constructor(message: string) {
    super(message, 'BACKUP_ERROR')
    this.name = 'BackupException'
  }
}

/**
 * Excepción para errores de extracción de ZIP
 */
export class ZipExtractionException extends ImportException {
  constructor(
    message: string,
    public filePath?: string
  ) {
    super(message, 'ZIP_EXTRACTION_ERROR')
    this.name = 'ZipExtractionException'
  }
}

/**
 * Excepción para archivos no encontrados
 */
export class FileNotFoundException extends ImportException {
  constructor(
    message: string,
    public filePath: string
  ) {
    super(message, 'FILE_NOT_FOUND')
    this.name = 'FileNotFoundException'
  }
}

/**
 * Excepción para formato de archivo inválido
 */
export class InvalidFileFormatException extends ImportException {
  constructor(
    message: string,
    public expectedFormat: string,
    public actualFormat?: string
  ) {
    super(message, 'INVALID_FILE_FORMAT')
    this.name = 'InvalidFileFormatException'
  }
}
