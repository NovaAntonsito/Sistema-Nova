import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname, basename } from 'path'
import { createGunzip } from 'zlib'
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

      // Leer y descomprimir el archivo ZIP
      const compressedContent = readFileSync(zipFilePath)
      const decompressedContent = await this.decompressContent(compressedContent)

      // Parsear el contenido del archivo
      const extractedFiles = await this.parseArchiveContent(decompressedContent, extractPath)

      result.extractedFiles = extractedFiles
      result.totalFiles = extractedFiles.length

      console.log(`Extracción completada: ${result.totalFiles} archivos extraídos`)

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      result.errors.push(errorMessage)

      if (
        error instanceof ZipExtractionException ||
        error instanceof FileNotFoundException ||
        error instanceof InvalidFileFormatException
      ) {
        throw error
      }

      throw new ZipExtractionException(`Error extrayendo archivo ZIP: ${errorMessage}`, zipFilePath)
    }
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
    try {
      if (!existsSync(zipFilePath)) {
        throw new FileNotFoundException(`Archivo ZIP no encontrado: ${zipFilePath}`, zipFilePath)
      }

      const compressedContent = readFileSync(zipFilePath)
      const decompressedContent = await this.decompressContent(compressedContent)

      return this.parseFileList(decompressedContent)
    } catch (error) {
      if (error instanceof FileNotFoundException) {
        throw error
      }
      throw new ZipExtractionException(
        `Error listando contenido del ZIP: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        zipFilePath
      )
    }
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

  // Métodos privados

  /**
   * Descomprime el contenido usando gzip
   * @param compressedContent - Contenido comprimido
   * @returns Promise<Buffer> - Contenido descomprimido
   */
  private async decompressContent(compressedContent: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const gunzip = createGunzip()

      gunzip.on('data', (chunk) => chunks.push(chunk))
      gunzip.on('end', () => {
        const decompressedContent = Buffer.concat(chunks)

        // Validar tamaño descomprimido
        if (decompressedContent.length > this.MAX_EXTRACTED_SIZE) {
          reject(
            new ZipExtractionException(
              `Archivo descomprimido demasiado grande: ${decompressedContent.length} bytes. Máximo: ${this.MAX_EXTRACTED_SIZE} bytes`
            )
          )
          return
        }

        resolve(decompressedContent)
      })
      gunzip.on('error', (error) => {
        reject(new ZipExtractionException(`Error descomprimiendo archivo: ${error.message}`))
      })

      gunzip.write(compressedContent)
      gunzip.end()
    })
  }

  /**
   * Parsea el contenido del archivo y extrae los archivos individuales
   * @param content - Contenido descomprimido
   * @param extractPath - Directorio de extracción
   * @returns Promise<string[]> - Array de rutas de archivos extraídos
   */
  private async parseArchiveContent(content: Buffer, extractPath: string): Promise<string[]> {
    const extractedFiles: string[] = []
    const contentStr = content.toString('utf8')

    // Validar formato del archivo
    if (!contentStr.startsWith('EXPORT_ARCHIVE\n')) {
      throw new ZipExtractionException('Formato de archivo ZIP inválido')
    }

    const lines = contentStr.split('\n')
    let currentFile: { name: string; size: number; content: string } | null = null
    let collectingContent = false
    let contentLines: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.startsWith('FILE: ')) {
        // Nuevo archivo encontrado
        const fileName = line.substring(6).trim()
        currentFile = { name: fileName, size: 0, content: '' }
        collectingContent = false
        contentLines = []
      } else if (line.startsWith('SIZE: ') && currentFile) {
        // Tamaño del archivo
        currentFile.size = parseInt(line.substring(6).trim())
      } else if (line === 'START:' && currentFile) {
        // Inicio del contenido del archivo
        collectingContent = true
      } else if (line === 'END_FILE' && currentFile && collectingContent) {
        // Fin del archivo actual
        currentFile.content = contentLines.join('\n')

        // Validar extensión del archivo
        const fileExtension = '.' + currentFile.name.split('.').pop()?.toLowerCase()
        if (!this.ALLOWED_EXTENSIONS.includes(fileExtension)) {
          console.warn(`Archivo con extensión no permitida ignorado: ${currentFile.name}`)
          currentFile = null
          collectingContent = false
          contentLines = []
          continue
        }

        // Escribir archivo extraído
        const extractedFilePath = join(extractPath, currentFile.name)

        try {
          // Crear directorio si es necesario
          mkdirSync(dirname(extractedFilePath), { recursive: true })

          // Escribir contenido del archivo
          writeFileSync(extractedFilePath, currentFile.content, 'utf8')
          extractedFiles.push(extractedFilePath)

          console.log(`Archivo extraído: ${currentFile.name} (${currentFile.size} bytes)`)
        } catch (error) {
          throw new ZipExtractionException(
            `Error escribiendo archivo extraído ${currentFile.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`
          )
        }

        currentFile = null
        collectingContent = false
        contentLines = []
      } else if (collectingContent) {
        // Recopilar líneas del contenido del archivo
        contentLines.push(line)
      }
    }

    return extractedFiles
  }

  /**
   * Parsea la lista de archivos sin extraerlos
   * @param content - Contenido descomprimido
   * @returns string[] - Lista de nombres de archivos
   */
  private parseFileList(content: Buffer): string[] {
    const fileNames: string[] = []
    const contentStr = content.toString('utf8')

    if (!contentStr.startsWith('EXPORT_ARCHIVE\n')) {
      throw new ZipExtractionException('Formato de archivo ZIP inválido')
    }

    const lines = contentStr.split('\n')

    for (const line of lines) {
      if (line.startsWith('FILE: ')) {
        const fileName = line.substring(6).trim()
        fileNames.push(fileName)
      }
    }

    return fileNames
  }
}
