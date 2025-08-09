import { mkdirSync, existsSync, createWriteStream } from 'fs'
import { join, dirname, basename } from 'path'
import * as yauzl from 'yauzl'
import {
  ZipExtractionException,
  FileNotFoundException,
  InvalidFileFormatException
} from '../exceptions/importExceptions'

/**
 * Resultado de extracción de ZIP
 */
export interface ExtractionResult {
  extractedFiles: string[]
  extractPath: string
  totalFiles: number
  errors: string[]
}

/**
 * Información de archivo extraído
 */
export interface ExtractedFileInfo {
  originalName: string
  extractedPath: string
  size: number
}

/**
 * Extractor de archivos ZIP para el sistema de importación
 */
export class ZipExtractor {
  private readonly MAX_EXTRACTED_SIZE = 200 * 1024 * 1024 // 200MB
  private readonly ALLOWED_EXTENSIONS = ['.csv', '.json']

  /**
   * Extrae el contenido de un archivo ZIP a un directorio temporal
   * @param zipFilePath - Ruta del archivo ZIP
   * @param extractPath - Directorio donde extraer los archivos
   * @returns Promise<ExtractionResult> - Resultado de la extracción
   */
  async extractZipContents(zipFilePath: string, extractPath: string): Promise<ExtractionResult> {
    const result: ExtractionResult = {
      extractedFiles: [],
      extractPath,
      totalFiles: 0,
      errors: []
    }

    return new Promise((resolve, reject) => {
      try {
        // Validar que el archivo ZIP existe
        if (!existsSync(zipFilePath)) {
          throw new FileNotFoundException(`Archivo ZIP no encontrado: ${zipFilePath}`, zipFilePath)
        }

        // Validar extensión del archivo
        if (!zipFilePath.toLowerCase().endsWith('.zip')) {
          throw new InvalidFileFormatException(
            'El archivo debe tener extensión .zip',
            '.zip',
            zipFilePath.split('.').pop()
          )
        }

        // Crear directorio de extracción si no existe
        if (!existsSync(extractPath)) {
          mkdirSync(extractPath, { recursive: true })
        }

        console.log(`Extrayendo archivo ZIP: ${zipFilePath} -> ${extractPath}`)

        // Abrir archivo ZIP usando yauzl
        yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipfile) => {
          if (err) {
            result.errors.push(err.message)
            reject(
              new ZipExtractionException(`Error abriendo archivo ZIP: ${err.message}`, zipFilePath)
            )
            return
          }

          if (!zipfile) {
            const error = 'No se pudo abrir el archivo ZIP'
            result.errors.push(error)
            reject(new ZipExtractionException(error, zipFilePath))
            return
          }

          result.totalFiles = zipfile.entryCount

          zipfile.readEntry()

          zipfile.on('entry', (entry) => {
            // Validar que no sea un directorio
            if (/\/$/.test(entry.fileName)) {
              // Es un directorio, continuar con el siguiente
              zipfile.readEntry()
              return
            }

            // Validar extensión del archivo
            const fileExtension = '.' + entry.fileName.split('.').pop()?.toLowerCase()
            if (!this.ALLOWED_EXTENSIONS.includes(fileExtension)) {
              console.warn(`Archivo con extensión no permitida ignorado: ${entry.fileName}`)
              zipfile.readEntry()
              return
            }

            // Validar tamaño del archivo
            if (entry.uncompressedSize > this.MAX_EXTRACTED_SIZE) {
              const error = `Archivo demasiado grande: ${entry.fileName} (${entry.uncompressedSize} bytes)`
              result.errors.push(error)
              zipfile.readEntry()
              return
            }

            // Extraer archivo
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                result.errors.push(`Error extrayendo ${entry.fileName}: ${err.message}`)
                zipfile.readEntry()
                return
              }

              if (!readStream) {
                result.errors.push(`No se pudo crear stream para ${entry.fileName}`)
                zipfile.readEntry()
                return
              }

              // Crear ruta de archivo extraído
              const extractedFilePath = join(extractPath, entry.fileName)

              // Crear directorio si es necesario
              mkdirSync(dirname(extractedFilePath), { recursive: true })

              // Crear stream de escritura
              const writeStream = createWriteStream(extractedFilePath)

              writeStream.on('close', () => {
                result.extractedFiles.push(extractedFilePath)
                console.log(`Archivo extraído: ${entry.fileName}`)
                zipfile.readEntry()
              })

              writeStream.on('error', (err) => {
                result.errors.push(`Error escribiendo ${entry.fileName}: ${err.message}`)
                zipfile.readEntry()
              })

              // Pipe del stream de lectura al de escritura
              readStream.pipe(writeStream)
            })
          })

          zipfile.on('end', () => {
            console.log(`Extracción completada: ${result.extractedFiles.length} archivos extraídos`)
            resolve(result)
          })

          zipfile.on('error', (err) => {
            result.errors.push(err.message)
            reject(
              new ZipExtractionException(
                `Error procesando archivo ZIP: ${err.message}`,
                zipFilePath
              )
            )
          })
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        result.errors.push(errorMessage)

        if (
          error instanceof ZipExtractionException ||
          error instanceof FileNotFoundException ||
          error instanceof InvalidFileFormatException
        ) {
          reject(error)
        } else {
          reject(
            new ZipExtractionException(`Error extrayendo archivo ZIP: ${errorMessage}`, zipFilePath)
          )
        }
      }
    })
  }

  /**
   * Valida que un archivo ZIP contenga los archivos CSV esperados
   * @param zipFilePath - Ruta del archivo ZIP
   * @param expectedFiles - Nombres de archivos esperados
   * @returns Promise<boolean> - True si contiene todos los archivos esperados
   */
  async validateZipContents(zipFilePath: string, expectedFiles: string[]): Promise<boolean> {
    try {
      const tempExtractPath = join(process.cwd(), 'temp', 'validation', Date.now().toString())
      const result = await this.extractZipContents(zipFilePath, tempExtractPath)

      const extractedFileNames = result.extractedFiles.map((filePath) => basename(filePath))

      // Verificar que todos los archivos esperados estén presentes
      const missingFiles = expectedFiles.filter(
        (expected) =>
          !extractedFileNames.some(
            (extracted) => extracted.toLowerCase() === expected.toLowerCase()
          )
      )

      // Limpiar archivos temporales
      await this.cleanupExtractedFiles(result.extractedFiles)

      return missingFiles.length === 0
    } catch (error) {
      console.warn(`Error validando contenido del ZIP: ${error}`)
      return false
    }
  }

  /**
   * Obtiene la lista de archivos en un ZIP sin extraerlos
   * @param zipFilePath - Ruta del archivo ZIP
   * @returns Promise<string[]> - Lista de nombres de archivos
   */
  async listZipContents(zipFilePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      try {
        if (!existsSync(zipFilePath)) {
          throw new FileNotFoundException(`Archivo ZIP no encontrado: ${zipFilePath}`, zipFilePath)
        }

        const fileNames: string[] = []

        yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipfile) => {
          if (err) {
            reject(
              new ZipExtractionException(`Error abriendo archivo ZIP: ${err.message}`, zipFilePath)
            )
            return
          }

          if (!zipfile) {
            reject(new ZipExtractionException('No se pudo abrir el archivo ZIP', zipFilePath))
            return
          }

          zipfile.readEntry()

          zipfile.on('entry', (entry) => {
            // Solo agregar archivos, no directorios
            if (!/\/$/.test(entry.fileName)) {
              fileNames.push(entry.fileName)
            }
            zipfile.readEntry()
          })

          zipfile.on('end', () => {
            resolve(fileNames)
          })

          zipfile.on('error', (err) => {
            reject(
              new ZipExtractionException(
                `Error procesando archivo ZIP: ${err.message}`,
                zipFilePath
              )
            )
          })
        })
      } catch (error) {
        if (error instanceof FileNotFoundException) {
          reject(error)
        } else {
          reject(
            new ZipExtractionException(
              `Error listando contenido del ZIP: ${error instanceof Error ? error.message : 'Error desconocido'}`,
              zipFilePath
            )
          )
        }
      }
    })
  }

  /**
   * Limpia archivos extraídos temporalmente
   * @param filePaths - Array de rutas de archivos a eliminar
   */
  async cleanupExtractedFiles(filePaths: string[]): Promise<void> {
    const fs = await import('fs/promises')

    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath)
      } catch (error) {
        console.warn(`No se pudo eliminar archivo temporal: ${filePath}`, error)
      }
    }

    // Intentar eliminar directorios vacíos
    const directories = new Set(filePaths.map((filePath) => dirname(filePath)))
    for (const dir of directories) {
      try {
        await fs.rmdir(dir)
      } catch (error) {
        // Ignorar errores al eliminar directorios (pueden no estar vacíos)
      }
    }
  }
}
