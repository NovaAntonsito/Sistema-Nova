import { createWriteStream, statSync, mkdirSync, existsSync } from 'fs'
import { join, dirname, basename } from 'path'
import archiver from 'archiver'

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
 * Implementa funcionalidad de ZIP usando la librería archiver
 */
export class ZipGenerator {
  /**
   * Crea un archivo ZIP con los archivos especificados
   * @param files - Array de rutas de archivos a incluir en el ZIP
   * @param outputPath - Ruta completa del archivo ZIP de salida
   * @returns Promise<string> - Ruta del archivo ZIP creado
   */
  async createZip(files: string[], outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Crear directorio de salida si no existe
        const outputDir = dirname(outputPath)
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true })
          console.log(`Directorio creado: ${outputDir}`)
        }

        console.log(`Iniciando creación de ZIP: ${outputPath}`)

        // Crear el archivo ZIP
        const archive = archiver('zip', {
          zlib: { level: 9 } // Máxima compresión
        })

        const output = createWriteStream(outputPath)
        archive.pipe(output)

        console.log(`Stream de salida configurado para: ${outputPath}`)

        // Manejar eventos
        output.on('close', () => {
          const totalBytes = archive.pointer()
          console.log(`ZIP creado exitosamente: ${outputPath} (${totalBytes} bytes)`)
          resolve(outputPath)
        })

        output.on('error', (error) => {
          console.error('Error en stream de salida:', error)
          reject(error)
        })

        archive.on('error', (error) => {
          console.error('Error en archiver:', error)
          reject(error)
        })

        archive.on('warning', (warning) => {
          console.warn('Advertencia en archiver:', warning)
        })

        // Agregar archivos al ZIP
        console.log(`Agregando ${files.length} archivos al ZIP`)
        for (const filePath of files) {
          console.log(`Verificando archivo: ${filePath}`)
          if (existsSync(filePath)) {
            const fileName = basename(filePath)
            archive.file(filePath, { name: fileName })
            console.log(`Archivo agregado al ZIP: ${fileName}`)
          } else {
            console.warn(`Archivo no encontrado: ${filePath}`)
            reject(new Error(`Archivo requerido no encontrado: ${filePath}`))
            return
          }
        }

        // Finalizar el archivo ZIP
        console.log('Finalizando archivo ZIP...')
        archive.finalize()
      } catch (error) {
        console.error('Error en createZip:', error)
        reject(
          new Error(
            `Error creando archivo ZIP: ${error instanceof Error ? error.message : 'Error desconocido'}`
          )
        )
      }
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
      } catch {
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
