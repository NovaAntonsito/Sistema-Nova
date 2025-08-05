import { BaseException } from '../exceptions'

/**
 * Excepción base para errores de exportación
 */
export class ExportException extends BaseException {
  constructor(message: string, details?: any) {
    super(message, 'EXPORT_ERROR', details)
  }
}

/**
 * Excepción para errores de escritura de archivos
 */
export class FileWriteException extends ExportException {
  constructor(filePath: string, cause?: Error) {
    super(`Error escribiendo archivo: ${filePath}`, { filePath, cause: cause?.message })
  }
}

/**
 * Excepción para errores de obtención de datos
 */
export class DataRetrievalException extends ExportException {
  constructor(entity: string, cause?: Error) {
    super(`Error obteniendo datos de ${entity}`, { entity, cause: cause?.message })
  }
}

/**
 * Excepción para errores de compresión ZIP
 */
export class ZipCreationException extends ExportException {
  constructor(zipPath: string, cause?: Error) {
    super(`Error creando archivo ZIP: ${zipPath}`, { zipPath, cause: cause?.message })
  }
}

/**
 * Excepción para errores de limpieza de archivos temporales
 */
export class FileCleanupException extends ExportException {
  constructor(directory: string, cause?: Error) {
    super(`Error limpiando archivos temporales en: ${directory}`, {
      directory,
      cause: cause?.message
    })
  }
}
