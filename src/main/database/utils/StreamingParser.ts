/**
 * Parser de streaming para archivos CSV muy grandes
 * Cumple con requisitos: Optimización de rendimiento
 */

import { createReadStream } from 'fs'
import { Transform, pipeline } from 'stream'
import { promisify } from 'util'
import { parse } from 'csv-parse'
import { EventEmitter } from 'events'
import {
  StreamingConfig,
  StreamingResult,
  StreamingError,
  MemoryUsage,
  ImportProgress,
  ImportPhase
} from '../types/import.types'

const pipelineAsync = promisify(pipeline)

/**
 * Función de procesamiento de chunk
 */
export type ChunkProcessor<T> = (chunk: T[], chunkIndex: number) => Promise<void>

/**
 * Función de callback de progreso
 */
export type StreamingProgressCallback = (progress: ImportProgress) => void

/**
 * Parser de streaming optimizado para archivos grandes
 */
export class StreamingParser<T> extends EventEmitter {
  private config: StreamingConfig
  private progressCallback?: StreamingProgressCallback
  private importId: string
  private totalLines = 0
  private processedLines = 0
  private currentChunk = 0
  private errors: StreamingError[] = []
  private startTime = 0

  constructor(config: StreamingConfig, importId: string) {
    super()
    this.config = config
    this.importId = importId
  }

  /**
   * Establece el callback de progreso
   * @param callback - Función de callback
   */
  setProgressCallback(callback: StreamingProgressCallback): void {
    this.progressCallback = callback
  }

  /**
   * Parsea un archivo CSV usando streaming
   * @param filePath - Ruta del archivo CSV
   * @param processor - Función de procesamiento de chunks
   * @param headers - Headers esperados del CSV
   * @returns Promise<StreamingResult> - Resultado del streaming
   */
  async parseCSVStream(
    filePath: string,
    processor: ChunkProcessor<T>,
    headers: string[]
  ): Promise<StreamingResult> {
    this.startTime = Date.now()
    this.totalLines = await this.countLines(filePath)
    this.processedLines = 0
    this.currentChunk = 0
    this.errors = []

    const result: StreamingResult = {
      totalChunks: Math.ceil(this.totalLines / this.config.chunkSize),
      processedChunks: 0,
      errors: [],
      duration: 0,
      memoryUsage: this.getMemoryUsage()
    }

    try {
      this.reportProgress(ImportPhase.PARSING, 0)

      await this.processFileStream(filePath, processor, headers, result)

      result.duration = Date.now() - this.startTime
      result.errors = this.errors
      result.memoryUsage = this.getMemoryUsage()

      this.emit('completed', result)
      return result
    } catch (error) {
      result.duration = Date.now() - this.startTime
      result.errors = this.errors

      this.emit('error', error, result)
      throw error
    }
  }

  /**
   * Procesa el archivo usando streams
   * @param filePath - Ruta del archivo
   * @param processor - Función de procesamiento
   * @param headers - Headers esperados
   * @param result - Resultado acumulativo
   */
  private async processFileStream(
    filePath: string,
    processor: ChunkProcessor<T>,
    headers: string[],
    result: StreamingResult
  ): Promise<void> {
    let currentChunkData: T[] = []
    let lineNumber = 0
    let isFirstLine = true

    // Crear stream de lectura
    const readStream = createReadStream(filePath, {
      encoding: 'utf8',
      highWaterMark: this.config.bufferSize
    })

    // Crear parser CSV
    const csvParser = parse({
      columns: false, // Manejamos headers manualmente
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true
    })

    // Crear transform stream para procesamiento por chunks
    const chunkProcessor = new Transform({
      objectMode: true,
      transform: async (record: string[], encoding, callback) => {
        try {
          lineNumber++

          // Saltar header
          if (isFirstLine) {
            isFirstLine = false
            this.validateHeaders(record, headers, lineNumber)
            callback()
            return
          }

          // Convertir record a objeto
          const rowData = this.recordToObject(record, headers, lineNumber)
          if (rowData) {
            currentChunkData.push(rowData)
          }

          // Procesar chunk cuando alcance el tamaño configurado
          if (currentChunkData.length >= this.config.chunkSize) {
            await this.processChunk(currentChunkData, processor, result)
            currentChunkData = []

            // Verificar límite de memoria
            if (this.config.memoryLimitMB > 0) {
              const memUsage = this.getMemoryUsage()
              const memUsageMB = memUsage.heapUsed / (1024 * 1024)

              if (memUsageMB > this.config.memoryLimitMB) {
                // Forzar garbage collection si está disponible
                if (global.gc) {
                  global.gc()
                }

                // Si aún excede el límite, pausar brevemente
                const newMemUsage = this.getMemoryUsage()
                const newMemUsageMB = newMemUsage.heapUsed / (1024 * 1024)

                if (newMemUsageMB > this.config.memoryLimitMB && this.config.enableBackpressure) {
                  await this.sleep(100) // Pausa de 100ms
                }
              }
            }
          }

          callback()
        } catch (error) {
          this.errors.push({
            chunkIndex: this.currentChunk,
            lineNumber,
            error: error instanceof Error ? error.message : 'Error desconocido',
            code: 'STREAMING_PARSE_ERROR'
          })
          callback()
        }
      },

      flush: async (callback) => {
        // Procesar chunk final si tiene datos
        if (currentChunkData.length > 0) {
          await this.processChunk(currentChunkData, processor, result)
        }
        callback()
      }
    })

    // Configurar pipeline
    await pipelineAsync(readStream, csvParser, chunkProcessor)
  }

  /**
   * Procesa un chunk de datos
   * @param chunkData - Datos del chunk
   * @param processor - Función de procesamiento
   * @param result - Resultado acumulativo
   */
  private async processChunk(
    chunkData: T[],
    processor: ChunkProcessor<T>,
    result: StreamingResult
  ): Promise<void> {
    const chunkStartTime = Date.now()

    try {
      await processor(chunkData, this.currentChunk)
      result.processedChunks++

      this.processedLines += chunkData.length
      this.currentChunk++

      const chunkDuration = Date.now() - chunkStartTime

      this.emit('chunkProcessed', {
        chunkIndex: this.currentChunk - 1,
        chunkSize: chunkData.length,
        duration: chunkDuration,
        memoryUsage: this.getMemoryUsage()
      })

      // Reportar progreso
      this.reportProgress(ImportPhase.PROCESSING, this.processedLines)
    } catch (error) {
      this.errors.push({
        chunkIndex: this.currentChunk,
        lineNumber: 0, // Error a nivel de chunk
        error: error instanceof Error ? error.message : 'Error desconocido',
        code: 'CHUNK_PROCESSING_ERROR'
      })

      this.emit('chunkFailed', {
        chunkIndex: this.currentChunk,
        error: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  }

  /**
   * Valida que los headers coincidan con los esperados
   * @param record - Record del header
   * @param expectedHeaders - Headers esperados
   * @param lineNumber - Número de línea
   */
  private validateHeaders(record: string[], expectedHeaders: string[], lineNumber: number): void {
    if (record.length !== expectedHeaders.length) {
      throw new Error(
        `Número incorrecto de columnas en línea ${lineNumber}. Esperado: ${expectedHeaders.length}, Encontrado: ${record.length}`
      )
    }

    for (let i = 0; i < expectedHeaders.length; i++) {
      if (record[i].trim() !== expectedHeaders[i]) {
        throw new Error(
          `Header incorrecto en columna ${i + 1}. Esperado: "${expectedHeaders[i]}", Encontrado: "${record[i]}"`
        )
      }
    }
  }

  /**
   * Convierte un record CSV a objeto
   * @param record - Record CSV
   * @param headers - Headers del CSV
   * @param lineNumber - Número de línea
   * @returns T | null - Objeto convertido o null si hay error
   */
  private recordToObject(record: string[], headers: string[], lineNumber: number): T | null {
    try {
      if (record.length !== headers.length) {
        this.errors.push({
          chunkIndex: this.currentChunk,
          lineNumber,
          error: `Número incorrecto de columnas. Esperado: ${headers.length}, Encontrado: ${record.length}`,
          code: 'COLUMN_COUNT_MISMATCH'
        })
        return null
      }

      const obj: any = {}
      for (let i = 0; i < headers.length; i++) {
        obj[headers[i]] = record[i]?.trim() || ''
      }

      return obj as T
    } catch (error) {
      this.errors.push({
        chunkIndex: this.currentChunk,
        lineNumber,
        error: error instanceof Error ? error.message : 'Error convirtiendo record',
        code: 'RECORD_CONVERSION_ERROR'
      })
      return null
    }
  }

  /**
   * Cuenta las líneas de un archivo
   * @param filePath - Ruta del archivo
   * @returns Promise<number> - Número de líneas
   */
  private async countLines(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let lineCount = 0
      const readStream = createReadStream(filePath, { encoding: 'utf8' })

      readStream.on('data', (chunk: string) => {
        lineCount += chunk.split('\n').length - 1
      })

      readStream.on('end', () => {
        resolve(Math.max(0, lineCount - 1)) // -1 para excluir header
      })

      readStream.on('error', reject)
    })
  }

  /**
   * Reporta el progreso del streaming
   * @param phase - Fase actual
   * @param processedRecords - Registros procesados
   */
  private reportProgress(phase: ImportPhase, processedRecords: number): void {
    const currentTime = Date.now()
    const elapsedTime = currentTime - this.startTime
    const speed = elapsedTime > 0 ? processedRecords / (elapsedTime / 1000) : 0
    const remainingRecords = this.totalLines - processedRecords
    const estimatedTimeRemaining = speed > 0 ? (remainingRecords / speed) * 1000 : 0

    const progress: ImportProgress = {
      importId: this.importId,
      currentPhase: phase,
      totalRecords: this.totalLines,
      processedRecords,
      successfulRecords: processedRecords - this.errors.length,
      failedRecords: this.errors.length,
      currentBatch: this.currentChunk,
      totalBatches: Math.ceil(this.totalLines / this.config.chunkSize),
      estimatedTimeRemaining,
      currentSpeed: speed
    }

    if (this.progressCallback) {
      this.progressCallback(progress)
    }
    this.emit('progress', progress)
  }

  /**
   * Obtiene el uso actual de memoria
   * @returns MemoryUsage - Información de memoria
   */
  private getMemoryUsage(): MemoryUsage {
    const memUsage = process.memoryUsage()
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    }
  }

  /**
   * Pausa la ejecución por el tiempo especificado
   * @param ms - Milisegundos a pausar
   * @returns Promise<void>
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Obtiene estadísticas del streaming
   * @returns object - Estadísticas
   */
  getStats() {
    return {
      totalLines: this.totalLines,
      processedLines: this.processedLines,
      currentChunk: this.currentChunk,
      errorsCount: this.errors.length,
      memoryUsage: this.getMemoryUsage(),
      elapsedTime: Date.now() - this.startTime
    }
  }
}
