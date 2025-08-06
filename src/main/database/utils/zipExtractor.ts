import { createWriteStream, mkdirSync, existsSync } from 'fs'
import { join, dirname, basename, resolve, normalize } from 'path'
import { open, Entry } from 'yauzl'
import { ZipExtractionException, FileNotFoundException } from '../exceptions/importExceptions'

/**
 * Utilidad para extracción de archivos ZIP
 * Cumple con requisitos: 5.1, 5.2 - extracción de archivos ZIP
 */
export class ZipExtractor {
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
  private readonly MAX_EXTRACTED_SIZE = 500 * 1024 * 1024 // 500MB total
  private readonly ALLOWED_EXTENSIONS = ['.csv', '.json', '.txt']
  private readonly TEMP_DIR = 'temp/imports'

  /**
   * Extrae el contenido de un archivo ZIP a un directorio temporal
   * @param zipFilePath - Ruta del archivo ZIP
   * @param extractPath - Directorio de extracción (opcional)
   * @returns Promise<string[]> - Array de rutas de archivos extraídos
   */
  async extractZipContents(zipFilePath: string, extractPath?: string): Promise<string[]> {
    const startTime = Date.now()

    try {
      // Validar que el archivo ZIP existe
      if (!existsSync(zipFilePath)) {
        throw new FileNotFoundException(`Archivo ZIP no encontrado: ${zipFilePath}`, zipFilePath)
      }

      // Validar extensión del archivo
      if (!zipFilePath.toLowerCase().endsWith('.zip')) {
        throw new ZipExtractionException(
          `Formato de archivo inválido. Se esperaba .zip, recibido: ${basename(zipFilePath)}`,
          zipFilePath
        )
      }

      // Determinar directorio de extracción
      const targetDir = extractPath || join(this.TEMP_DIR, `extract_${Date.now()}`)
      const safeTargetDir = this.validateAndSanitizePath(targetDir)

      // Crear directorio de extracción
      mkdirSync(safeTargetDir, { recursive: true })

      // Extraer archivos
      const extractedFiles = await this.performExtraction(zipFilePath, safeTargetDir)

      const duration = Date.now() - startTime
      console.log(`ZIP extraído en ${duration}ms: ${extractedFiles.length} archivos`)

      return extractedFiles
    } catch (error) {
      if (error instanceof ZipExtractionException || error instanceof FileNotFoundException) {
        throw error
      }
      throw new ZipExtractionException(
        `Error extrayendo archivo ZIP: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        zipFilePath
      )
    }
  }

  /**
   * Realiza la extracción del archivo ZIP
   * @param zipFilePath - Ruta del archivo ZIP
   * @param targetDir - Directorio de destino
   * @returns Promise<string[]> - Archivos extraídos
   */
  private async performExtraction(zipFilePath: string, targetDir: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const extractedFiles: string[] = []
      let totalExtractedSize = 0

      open(zipFilePath, { lazyEntries: true }, (err, zipfile) => {
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

        zipfile.on('entry', (entry: Entry) => {
          try {
            // Validar entrada
            this.validateEntry(entry, totalExtractedSize)

            // Si es un directorio, continuar con la siguiente entrada
            if (entry.fileName.endsWith('/')) {
              zipfile.readEntry()
              return
            }

            // Validar extensión del archivo
            if (!this.isAllowedFile(entry.fileName)) {
              console.warn(`Archivo ignorado (extensión no permitida): ${entry.fileName}`)
              zipfile.readEntry()
              return
            }

            // Determinar ruta de destino segura
            const outputPath = this.getSecureOutputPath(entry.fileName, targetDir)

            // Crear directorio padre si no existe
            mkdirSync(dirname(outputPath), { recursive: true })

            // Extraer archivo
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                reject(
                  new ZipExtractionException(`Error leyendo entrada: ${err.message}`, zipFilePath)
                )
                return
              }

              if (!readStream) {
                reject(
                  new ZipExtractionException('No se pudo crear stream de lectura', zipFilePath)
                )
                return
              }

              const writeStream = createWriteStream(outputPath)
              let extractedSize = 0

              readStream.on('data', (chunk: Buffer) => {
                extractedSize += chunk.length
                totalExtractedSize += chunk.length

                // Verificar límites de tamaño
                if (extractedSize > this.MAX_FILE_SIZE) {
                  writeStream.destroy()
                  reject(
                    new ZipExtractionException(
                      `Archivo demasiado grande: ${entry.fileName} (${extractedSize} bytes)`,
                      zipFilePath
                    )
                  )
                  return
                }

                if (totalExtractedSize > this.MAX_EXTRACTED_SIZE) {
                  writeStream.destroy()
                  reject(
                    new ZipExtractionException(
                      `Tamaño total de extracción excedido: ${totalExtractedSize} bytes`,
                      zipFilePath
                    )
                  )
                  return
                }
              })

              readStream.on('end', () => {
                writeStream.end()
              })

              writeStream.on('finish', () => {
                extractedFiles.push(outputPath)
                console.log(`Archivo extraído: ${entry.fileName} -> ${outputPath}`)
                zipfile.readEntry()
              })

              writeStream.on('error', (error) => {
                reject(
                  new ZipExtractionException(
                    `Error escribiendo archivo: ${error.message}`,
                    zipFilePath
                  )
                )
              })

              readStream.pipe(writeStream)
            })
          } catch (error) {
            reject(error)
          }
        })

        zipfile.on('end', () => {
          resolve(extractedFiles)
        })

        zipfile.on('error', (error) => {
          reject(new ZipExtractionException(`Error procesando ZIP: ${error.message}`, zipFilePath))
        })
      })
    })
  }

  /**
   * Valida una entrada del ZIP
   * @param entry - Entrada del ZIP
   * @param currentTotalSize - Tamaño total actual extraído
   */
  private validateEntry(entry: Entry, currentTotalSize: number): void {
    // Validar tamaño de archivo individual
    if (entry.uncompressedSize > this.MAX_FILE_SIZE) {
      throw new ZipExtractionException(
        `Archivo demasiado grande en ZIP: ${entry.fileName} (${entry.uncompressedSize} bytes)`
      )
    }

    // Validar tamaño total
    if (currentTotalSize + entry.uncompressedSize > this.MAX_EXTRACTED_SIZE) {
      throw new ZipExtractionException(
        `Tamaño total de extracción excedería el límite: ${currentTotalSize + entry.uncompressedSize} bytes`
      )
    }

    // Validar nombre de archivo para prevenir path traversal
    if (
      entry.fileName.includes('..') ||
      entry.fileName.includes('\\..\\') ||
      entry.fileName.includes('/../')
    ) {
      throw new ZipExtractionException(`Nombre de archivo peligroso detectado: ${entry.fileName}`)
    }
  }

  /**
   * Verifica si un archivo tiene una extensión permitida
   * @param fileName - Nombre del archivo
   * @returns boolean - True si la extensión está permitida
   */
  private isAllowedFile(fileName: string): boolean {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    return this.ALLOWED_EXTENSIONS.includes(extension)
  }

  /**
   * Obtiene una ruta de salida segura para un archivo
   * @param fileName - Nombre del archivo en el ZIP
   * @param targetDir - Directorio de destino
   * @returns string - Ruta segura de salida
   */
  private getSecureOutputPath(fileName: string, targetDir: string): string {
    // Sanitizar nombre de archivo
    const safeName = basename(fileName)
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/^\.+/, '_')
      .trim()

    if (!safeName || safeName === '_') {
      throw new ZipExtractionException(`Nombre de archivo inválido: ${fileName}`)
    }

    const outputPath = join(targetDir, safeName)
    const resolvedPath = resolve(outputPath)
    const resolvedTargetDir = resolve(targetDir)

    // Verificar que la ruta esté dentro del directorio de destino
    if (!resolvedPath.startsWith(resolvedTargetDir)) {
      throw new ZipExtractionException(`Intento de path traversal detectado: ${fileName}`)
    }

    return outputPath
  }

  /**
   * Valida y sanitiza una ruta de directorio
   * @param path - Ruta a validar
   * @returns string - Ruta sanitizada
   */
  private validateAndSanitizePath(path: string): string {
    const normalizedPath = normalize(path)
    const resolvedPath = resolve(normalizedPath)

    // Validar que no contenga caracteres peligrosos
    if (normalizedPath.includes('..')) {
      throw new ZipExtractionException(`Ruta contiene path traversal: ${path}`)
    }

    // Validar que esté dentro del directorio de trabajo
    const workingDir = resolve(process.cwd())
    if (!resolvedPath.startsWith(workingDir)) {
      throw new ZipExtractionException(`Ruta fuera del directorio de trabajo: ${path}`)
    }

    return normalizedPath
  }

  /**
   * Verifica si un archivo es un ZIP válido
   * @param filePath - Ruta del archivo
   * @returns Promise<boolean> - True si es un ZIP válido
   */
  async isValidZip(filePath: string): Promise<boolean> {
    try {
      if (!existsSync(filePath)) {
        return false
      }

      return new Promise<boolean>((resolve) => {
        open(filePath, { lazyEntries: true }, (err, zipfile) => {
          if (err || !zipfile) {
            resolve(false)
            return
          }

          zipfile.on('entry', () => {
            zipfile.close()
            resolve(true)
          })

          zipfile.on('end', () => {
            resolve(true)
          })

          zipfile.on('error', () => {
            resolve(false)
          })

          zipfile.readEntry()
        })
      })
    } catch {
      return false
    }
  }

  /**
   * Lista el contenido de un archivo ZIP sin extraerlo
   * @param zipFilePath - Ruta del archivo ZIP
   * @returns Promise<string[]> - Lista de archivos en el ZIP
   */
  async listZipContents(zipFilePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const files: string[] = []

      open(zipFilePath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(new ZipExtractionException(`Error abriendo ZIP: ${err.message}`, zipFilePath))
          return
        }

        if (!zipfile) {
          reject(new ZipExtractionException('No se pudo abrir el archivo ZIP', zipFilePath))
          return
        }

        zipfile.readEntry()

        zipfile.on('entry', (entry: Entry) => {
          if (!entry.fileName.endsWith('/')) {
            files.push(entry.fileName)
          }
          zipfile.readEntry()
        })

        zipfile.on('end', () => {
          resolve(files)
        })

        zipfile.on('error', (error) => {
          reject(
            new ZipExtractionException(`Error listando contenido: ${error.message}`, zipFilePath)
          )
        })
      })
    })
  }

  /**
   * Limpia archivos temporales de extracción
   * @param extractPath - Directorio de extracción a limpiar
   */
  async cleanupExtraction(extractPath: string): Promise<void> {
    try {
      const fs = await import('fs/promises')
      if (existsSync(extractPath)) {
        await fs.rm(extractPath, { recursive: true, force: true })
        console.log(`Directorio temporal limpiado: ${extractPath}`)
      }
    } catch (error) {
      console.warn(
        `Error limpiando directorio temporal: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }
}
