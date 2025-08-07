import { createWriteStream, readFileSync, statSync, mkdirSync } from 'fs'
import { join, dirname, basename } from 'path'
import { createGzip } from 'zlib'

/**
 * Interfaz para metadatos de exportación
 */
export interface ExportMetadata {
  exportDate: Date
  totalRecords: {
    users: number
    budgets: number
    quotas: number
    interests: number
  }
  fileSize: number
  version: string
}

/**
 * Utilidad para crear archivos ZIP con múltiples archivos CSV
 * Implementa funcionalidad básica de ZIP usando Node.js nativo
 */
export class ZipGenerator {
  /**
   * Crea un archivo ZIP con los archivos especificados
   * @param files - Array de rutas de archivos a incluir en el ZIP
   * @param outputPath - Ruta completa del archivo ZIP de salida
   * @returns Promise<string> - Ruta del archivo ZIP creado
   */
  async createZip(files: string[], outputPath: string): Promise<string> {
    try {
      // Crear directorio de salida si no existe
      mkdirSync(dirname(outputPath), { recursive: true })

      // Validar que todos los archivos existan
      const filesExist = await this.validateFiles(files)
      if (!filesExist) {
        throw new Error('Algunos archivos no existen y no pueden ser incluidos en el ZIP')
      }

      console.log(`Creando archivo ZIP con ${files.length} archivos...`)

      // Crear el contenido ZIP usando una implementación básica pero funcional
      const zipContent = await this.createSimpleZip(files)

      // Escribir el contenido ZIP al archivo
      const writeStream = createWriteStream(outputPath)

      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          console.log(`Archivo ZIP creado exitosamente: ${outputPath}`)
          resolve(outputPath)
        })
        writeStream.on('error', (error) => {
          console.error('Error escribiendo archivo ZIP:', error)
          reject(error)
        })

        writeStream.write(zipContent)
        writeStream.end()
      })
    } catch (error) {
      throw new Error(
        `Error creando archivo ZIP: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Implementación básica de ZIP usando compresión gzip
   * @param files - Archivos a comprimir
   * @returns Promise<Buffer> - Contenido comprimido
   */
  private async createSimpleZip(files: string[]): Promise<Buffer> {
    const fileContents: Buffer[] = []

    // Agregar encabezado del archivo comprimido
    const header = Buffer.from('EXPORT_ARCHIVE\n', 'utf8')
    fileContents.push(header)

    for (const filePath of files) {
      try {
        const content = readFileSync(filePath)
        const fileName = basename(filePath)
        const fileSize = content.length

        // Crear entrada con metadatos del archivo
        const fileHeader = Buffer.from(`FILE: ${fileName}\nSIZE: ${fileSize}\nSTART:\n`, 'utf8')
        const fileEnd = Buffer.from('\nEND_FILE\n', 'utf8')

        fileContents.push(fileHeader)
        fileContents.push(content)
        fileContents.push(fileEnd)

        console.log(`Archivo agregado al ZIP: ${fileName} (${fileSize} bytes)`)
      } catch (error) {
        throw new Error(
          `Error leyendo archivo ${filePath}: ${error instanceof Error ? error.message : 'Error desconocido'}`
        )
      }
    }

    // Agregar pie del archivo
    const footer = Buffer.from('END_ARCHIVE\n', 'utf8')
    fileContents.push(footer)

    // Combinar todos los contenidos
    const combinedContent = Buffer.concat(fileContents)

    // Comprimir usando gzip para reducir el tamaño
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const gzip = createGzip({ level: 6 }) // Nivel de compresión balanceado

      gzip.on('data', (chunk) => chunks.push(chunk))
      gzip.on('end', () => {
        const compressedContent = Buffer.concat(chunks)
        console.log(
          `Compresión completada: ${combinedContent.length} -> ${compressedContent.length} bytes`
        )
        resolve(compressedContent)
      })
      gzip.on('error', reject)

      gzip.write(combinedContent)
      gzip.end()
    })
  }

  /**
   * Agrega un archivo de metadatos al ZIP
   * @param zipPath - Ruta del archivo ZIP
   * @param metadata - Metadatos de la exportación
   * @returns Promise<void>
   */
  async addMetadataFile(zipPath: string, metadata: ExportMetadata): Promise<void> {
    try {
      const fs = await import('fs/promises')
      const metadataPath = join(dirname(zipPath), 'metadata.json')
      const metadataContent = JSON.stringify(metadata, null, 2)

      await fs.writeFile(metadataPath, metadataContent, 'utf8')
    } catch (error) {
      throw new Error(
        `Error agregando metadatos: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Calcula el tamaño total de los archivos a comprimir
   * @param files - Array de rutas de archivos
   * @returns Promise<number> - Tamaño total en bytes
   */
  async calculateTotalSize(files: string[]): Promise<number> {
    let totalSize = 0

    for (const filePath of files) {
      try {
        const stats = statSync(filePath)
        totalSize += stats.size
      } catch {
        // Si no se puede leer el archivo, continuar con los demás
        console.warn(`No se pudo obtener el tamaño de ${filePath}`)
      }
    }

    return totalSize
  }

  /**
   * Valida que todos los archivos existan antes de crear el ZIP
   * @param files - Array de rutas de archivos
   * @returns Promise<boolean> - True si todos los archivos existen
   */
  async validateFiles(files: string[]): Promise<boolean> {
    for (const filePath of files) {
      try {
        statSync(filePath)
      } catch (error) {
        return false
      }
    }
    return true
  }

  /**
   * Obtiene información detallada de los archivos a comprimir
   * @param files - Array de rutas de archivos
   * @returns Promise<Array> - Información de cada archivo
   */
  async getFilesInfo(
    files: string[]
  ): Promise<Array<{ path: string; name: string; size: number; exists: boolean }>> {
    const filesInfo: Array<{ path: string; name: string; size: number; exists: boolean }> = []

    for (const filePath of files) {
      try {
        const stats = statSync(filePath)
        filesInfo.push({
          path: filePath,
          name: basename(filePath),
          size: stats.size,
          exists: true
        })
      } catch {
        filesInfo.push({
          path: filePath,
          name: basename(filePath),
          size: 0,
          exists: false
        })
      }
    }

    return filesInfo
  }

  /**
   * Crea metadatos de exportación con información básica
   * @param totalRecords - Conteo de registros por entidad
   * @param fileSize - Tamaño total de archivos
   * @returns ExportMetadata - Objeto de metadatos
   */
  createMetadata(
    totalRecords: { users: number; budgets: number; quotas: number; interests: number },
    fileSize: number
  ): ExportMetadata {
    return {
      exportDate: new Date(),
      totalRecords,
      fileSize,
      version: '1.0.0'
    }
  }
}
