import { mkdirSync, rmSync, existsSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'

/**
 * Utilidades para manejo de archivos temporales y limpieza
 * Proporciona funciones seguras para crear, gestionar y limpiar archivos temporales
 */
export class FileUtils {
  private static readonly DEFAULT_TEMP_DIR = 'temp/exports'
  private static readonly CLEANUP_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 horas

  /**
   * Crea un directorio temporal para exportaciones
   * @param subDir - Subdirectorio opcional dentro del directorio temporal
   * @returns string - Ruta completa del directorio creado
   */
  static createTempDirectory(subDir?: string): string {
    const baseDir = resolve(FileUtils.DEFAULT_TEMP_DIR)
    const fullPath = subDir ? join(baseDir, subDir) : baseDir

    try {
      mkdirSync(fullPath, { recursive: true })
      return fullPath
    } catch (error) {
      throw new Error(
        `Error creando directorio temporal ${fullPath}: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Genera una ruta única para archivo temporal
   * @param filename - Nombre base del archivo
   * @param extension - Extensión del archivo (sin punto)
   * @param subDir - Subdirectorio opcional
   * @returns string - Ruta completa única para el archivo
   */
  static generateTempFilePath(filename: string, extension: string, subDir?: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const uniqueFilename = `${filename}_${timestamp}_${random}.${extension}`

    const tempDir = FileUtils.createTempDirectory(subDir)
    return join(tempDir, uniqueFilename)
  }

  /**
   * Limpia archivos temporales antiguos
   * @param maxAgeMs - Edad máxima en milisegundos (por defecto 24 horas)
   * @param directory - Directorio a limpiar (por defecto el directorio temporal)
   * @returns Promise<number> - Número de archivos eliminados
   */
  static async cleanupTempFiles(
    maxAgeMs: number = FileUtils.CLEANUP_MAX_AGE_MS,
    directory: string = FileUtils.DEFAULT_TEMP_DIR
  ): Promise<number> {
    if (!existsSync(directory)) {
      return 0
    }

    let deletedCount = 0
    const now = Date.now()

    try {
      const files = readdirSync(directory, { withFileTypes: true })

      for (const file of files) {
        const filePath = join(directory, file.name)

        if (file.isFile()) {
          try {
            const stats = statSync(filePath)
            const fileAge = now - stats.mtime.getTime()

            if (fileAge > maxAgeMs) {
              unlinkSync(filePath)
              deletedCount++
            }
          } catch (error) {
            // Si no se puede procesar el archivo, continuar con el siguiente
            console.warn(`No se pudo procesar archivo ${filePath}:`, error)
          }
        } else if (file.isDirectory()) {
          // Recursivamente limpiar subdirectorios
          const subDirDeleted = await FileUtils.cleanupTempFiles(maxAgeMs, filePath)
          deletedCount += subDirDeleted

          // Intentar eliminar directorio si está vacío
          try {
            const remainingFiles = readdirSync(filePath)
            if (remainingFiles.length === 0) {
              rmSync(filePath, { recursive: true })
            }
          } catch (error) {
            // Ignorar errores al eliminar directorios
          }
        }
      }
    } catch (error) {
      throw new Error(
        `Error limpiando archivos temporales: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }

    return deletedCount
  }

  /**
   * Elimina archivos específicos de forma segura
   * @param filePaths - Array de rutas de archivos a eliminar
   * @returns Promise<number> - Número de archivos eliminados exitosamente
   */
  static async deleteFiles(filePaths: string[]): Promise<number> {
    let deletedCount = 0

    for (const filePath of filePaths) {
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath)
          deletedCount++
        }
      } catch (error) {
        console.warn(`No se pudo eliminar archivo ${filePath}:`, error)
      }
    }

    return deletedCount
  }

  /**
   * Elimina un directorio y todo su contenido de forma segura
   * @param directoryPath - Ruta del directorio a eliminar
   * @returns Promise<boolean> - True si se eliminó exitosamente
   */
  static async deleteDirectory(directoryPath: string): Promise<boolean> {
    try {
      if (existsSync(directoryPath)) {
        rmSync(directoryPath, { recursive: true, force: true })
        return true
      }
      return false
    } catch (error) {
      console.warn(`No se pudo eliminar directorio ${directoryPath}:`, error)
      return false
    }
  }

  /**
   * Verifica si un archivo existe y es accesible
   * @param filePath - Ruta del archivo a verificar
   * @returns boolean - True si el archivo existe y es accesible
   */
  static fileExists(filePath: string): boolean {
    try {
      return existsSync(filePath) && statSync(filePath).isFile()
    } catch (error) {
      return false
    }
  }

  /**
   * Obtiene el tamaño de un archivo en bytes
   * @param filePath - Ruta del archivo
   * @returns number - Tamaño en bytes, 0 si no se puede acceder
   */
  static getFileSize(filePath: string): number {
    try {
      if (FileUtils.fileExists(filePath)) {
        return statSync(filePath).size
      }
      return 0
    } catch (error) {
      return 0
    }
  }

  /**
   * Obtiene información detallada de un archivo
   * @param filePath - Ruta del archivo
   * @returns object - Información del archivo o null si no existe
   */
  static getFileInfo(filePath: string): {
    path: string
    size: number
    created: Date
    modified: Date
    exists: boolean
  } | null {
    try {
      if (!FileUtils.fileExists(filePath)) {
        return null
      }

      const stats = statSync(filePath)
      return {
        path: filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        exists: true
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Valida que una ruta sea segura
   * @param filePath - Ruta a validar
   * @param allowedBasePath - Ruta base permitida
   * @returns boolean - True si la ruta es segura
   */
  static isPathSafe(
    filePath: string,
    allowedBasePath: string = FileUtils.DEFAULT_TEMP_DIR
  ): boolean {
    try {
      const resolvedPath = resolve(filePath)
      const resolvedBasePath = resolve(allowedBasePath)

      return resolvedPath.startsWith(resolvedBasePath)
    } catch (error) {
      return false
    }
  }

  /**
   * Crea una estructura de directorios de forma segura
   * @param paths - Array de rutas de directorios a crear
   * @returns Promise<string[]> - Array de directorios creados exitosamente
   */
  static async createDirectories(paths: string[]): Promise<string[]> {
    const createdPaths: string[] = []

    for (const path of paths) {
      try {
        mkdirSync(path, { recursive: true })
        createdPaths.push(path)
      } catch (error) {
        console.warn(`No se pudo crear directorio ${path}:`, error)
      }
    }

    return createdPaths
  }

  /**
   * Obtiene el directorio temporal del sistema
   * @returns string - Ruta del directorio temporal del sistema
   */
  static getSystemTempDir(): string {
    return tmpdir()
  }

  /**
   * Obtiene estadísticas del directorio temporal de exportaciones
   * @returns object - Estadísticas del directorio
   * Que metodo de mierda, me da siempre error en el controller
   * TODO: Reworkear esto, no se como pero hacerlo
   */
  static getTempDirectoryStats(): {
    exists: boolean
    fileCount: number
    totalSize: number
    oldestFile?: Date
    newestFile?: Date
  } {
    const tempDir = resolve(FileUtils.DEFAULT_TEMP_DIR)

    if (!existsSync(tempDir)) {
      return {
        exists: false,
        fileCount: 0,
        totalSize: 0
      }
    }

    try {
      const files = readdirSync(tempDir, { withFileTypes: true })
      let fileCount = 0
      let totalSize = 0
      let oldestFile: Date | undefined
      let newestFile: Date | undefined

      for (const file of files) {
        if (file.isFile()) {
          const filePath = join(tempDir, file.name)
          const stats = statSync(filePath)

          fileCount++
          totalSize += stats.size

          if (!oldestFile || stats.mtime < oldestFile) {
            oldestFile = stats.mtime
          }

          if (!newestFile || stats.mtime > newestFile) {
            newestFile = stats.mtime
          }
        }
      }

      return {
        exists: true,
        fileCount,
        totalSize,
        oldestFile,
        newestFile
      }
    } catch (error) {
      return {
        exists: true,
        fileCount: 0,
        totalSize: 0
      }
    }
  }
}
