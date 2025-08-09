/**
 * Procesador por lotes para optimizar importaciones grandes
 * Cumple con requisitos: Optimización de rendimiento
 */

import { EventEmitter } from 'events'
import {
  BatchProcessingConfig,
  BatchProcessingResult,
  ImportProgress,
  ImportPhase,
  PerformanceMetrics,
  MemoryUsage
} from '../types/import.types'

/**
 * Función de procesamiento por lotes
 */
export type BatchProcessorFunction<T, R> = (batch: T[], batchIndex: number) => Promise<R[]>

/**
 * Función de callback de progreso
 */
export type ProgressCallback = (progress: ImportProgress) => void

/**
 * Procesador por lotes optimizado
 */
export class BatchProcessor<T, R> extends EventEmitter {
  private config: BatchProcessingConfig
  private progressCallback?: ProgressCallback
  private performanceMetrics: Partial<PerformanceMetrics> = {}
  private importId: string

  constructor(config: BatchProcessingConfig, importId: string) {
    super()
    this.config = config
    this.importId = importId
  }

  /**
   * Establece el callback de progreso
   * @param callback - Función de callback
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback
  }

  /**
   * Procesa elementos en lotes
   * @param items - Elementos a procesar
   * @param processor - Función de procesamiento
   * @returns Promise<BatchProcessingResult<R>> - Resultado del procesamiento
   */
  async processBatches(
    items: T[],
    processor: BatchProcessor<T, R>
  ): Promise<BatchProcessingResult<R>> {
    const startTime = Date.now()
    this.performanceMetrics.startTime = new Date(startTime)
    this.performanceMetrics.totalRecords = items.length

    const result: BatchProcessingResult<R> = {
      processedItems: [],
      errors: [],
      totalBatches: Math.ceil(items.length / this.config.batchSize),
      successfulBatches: 0,
      failedBatches: 0,
      duration: 0
    }

    try {
      // Dividir elementos en lotes
      const batches = this.createBatches(items)
      result.totalBatches = batches.length

      this.reportProgress({
        importId: this.importId,
        currentPhase: ImportPhase.PROCESSING,
        totalRecords: items.length,
        processedRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        currentBatch: 0,
        totalBatches: batches.length,
        estimatedTimeRemaining: 0,
        currentSpeed: 0
      })

      if (this.config.enableParallelProcessing && this.config.maxConcurrentBatches > 1) {
        // Procesamiento paralelo
        await this.processParallelBatches(batches, processor, result)
      } else {
        // Procesamiento secuencial
        await this.processSequentialBatches(batches, processor, result)
      }

      const endTime = Date.now()
      result.duration = endTime - startTime

      this.performanceMetrics.endTime = new Date(endTime)
      this.performanceMetrics.totalDuration = result.duration
      this.performanceMetrics.recordsPerSecond = items.length / (result.duration / 1000)
      this.performanceMetrics.batchesProcessed = result.successfulBatches

      this.emit('completed', result, this.performanceMetrics)

      return result
    } catch (error) {
      const endTime = Date.now()
      result.duration = endTime - startTime

      this.emit('error', error, result)
      throw error
    }
  }

  /**
   * Crea lotes de elementos
   * @param items - Elementos a dividir
   * @returns T[][] - Array de lotes
   */
  private createBatches(items: T[]): T[][] {
    const batches: T[][] = []
    const batchSize = this.config.batchSize

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }

    return batches
  }

  /**
   * Procesa lotes de forma secuencial
   * @param batches - Lotes a procesar
   * @param processor - Función de procesamiento
   * @param result - Resultado acumulativo
   */
  private async processSequentialBatches(
    batches: T[][],
    processor: BatchProcessor<T, R>,
    result: BatchProcessingResult<R>
  ): Promise<void> {
    const batchTimes: number[] = []

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const batchStartTime = Date.now()

      try {
        const batchResult = await (processor as any)(batch, i)
        result.processedItems.push(...batchResult)
        result.successfulBatches++

        const batchTime = Date.now() - batchStartTime
        batchTimes.push(batchTime)

        // Reportar progreso
        const processedRecords = (i + 1) * this.config.batchSize
        const averageBatchTime = batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length
        const remainingBatches = batches.length - (i + 1)
        const estimatedTimeRemaining = remainingBatches * averageBatchTime

        this.reportProgress({
          importId: this.importId,
          currentPhase: ImportPhase.PROCESSING,
          totalRecords: this.performanceMetrics.totalRecords || 0,
          processedRecords: Math.min(processedRecords, this.performanceMetrics.totalRecords || 0),
          successfulRecords: result.processedItems.length,
          failedRecords: result.errors.length,
          currentBatch: i + 1,
          totalBatches: batches.length,
          estimatedTimeRemaining,
          currentSpeed: batch.length / (batchTime / 1000)
        })

        this.emit('batchCompleted', {
          batchIndex: i,
          batchSize: batch.length,
          duration: batchTime,
          memoryUsage: this.getMemoryUsage()
        })
      } catch (error) {
        result.failedBatches++

        // Agregar errores para todos los elementos del lote
        for (let j = 0; j < batch.length; j++) {
          result.errors.push({
            batchIndex: i,
            itemIndex: j,
            error: error instanceof Error ? error.message : 'Error desconocido',
            code: 'BATCH_PROCESSING_ERROR'
          })
        }

        this.emit('batchFailed', {
          batchIndex: i,
          error: error instanceof Error ? error.message : 'Error desconocido'
        })
      }
    }

    // Calcular métricas finales
    if (batchTimes.length > 0) {
      this.performanceMetrics.averageBatchTime =
        batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length
    }
  }

  /**
   * Procesa lotes de forma paralela
   * @param batches - Lotes a procesar
   * @param processor - Función de procesamiento
   * @param result - Resultado acumulativo
   */
  private async processParallelBatches(
    batches: T[][],
    processor: BatchProcessor<T, R>,
    result: BatchProcessingResult<R>
  ): Promise<void> {
    const concurrency = Math.min(this.config.maxConcurrentBatches, batches.length)
    const batchTimes: number[] = []
    let processedBatches = 0

    // Procesar lotes en grupos concurrentes
    for (let i = 0; i < batches.length; i += concurrency) {
      const batchGroup = batches.slice(i, i + concurrency)
      const batchPromises = batchGroup.map(async (batch, groupIndex) => {
        const batchIndex = i + groupIndex
        const batchStartTime = Date.now()

        try {
          const batchResult = await (processor as any)(batch, batchIndex)
          const batchTime = Date.now() - batchStartTime
          batchTimes.push(batchTime)

          this.emit('batchCompleted', {
            batchIndex,
            batchSize: batch.length,
            duration: batchTime,
            memoryUsage: this.getMemoryUsage()
          })

          return {
            success: true,
            batchIndex,
            result: batchResult,
            duration: batchTime
          }
        } catch (error) {
          this.emit('batchFailed', {
            batchIndex,
            error: error instanceof Error ? error.message : 'Error desconocido'
          })

          return {
            success: false,
            batchIndex,
            error: error instanceof Error ? error.message : 'Error desconocido',
            batch
          }
        }
      })

      // Esperar a que se completen todos los lotes del grupo
      const batchResults = await Promise.all(batchPromises)

      // Procesar resultados
      for (const batchResult of batchResults) {
        if (batchResult.success) {
          result.processedItems.push(...(batchResult as any).result)
          result.successfulBatches++
        } else {
          result.failedBatches++
          const failedBatch = (batchResult as any).batch

          // Agregar errores para todos los elementos del lote fallido
          for (let j = 0; j < failedBatch.length; j++) {
            result.errors.push({
              batchIndex: batchResult.batchIndex,
              itemIndex: j,
              error: (batchResult as unknown).error,
              code: 'BATCH_PROCESSING_ERROR'
            })
          }
        }
      }

      processedBatches += batchGroup.length

      // Reportar progreso
      const processedRecords = processedBatches * this.config.batchSize
      const averageBatchTime =
        batchTimes.length > 0 ? batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length : 0
      const remainingBatches = batches.length - processedBatches
      const estimatedTimeRemaining = (remainingBatches * averageBatchTime) / concurrency

      this.reportProgress({
        importId: this.importId,
        currentPhase: ImportPhase.PROCESSING,
        totalRecords: this.performanceMetrics.totalRecords || 0,
        processedRecords: Math.min(processedRecords, this.performanceMetrics.totalRecords || 0),
        successfulRecords: result.processedItems.length,
        failedRecords: result.errors.length,
        currentBatch: processedBatches,
        totalBatches: batches.length,
        estimatedTimeRemaining,
        currentSpeed:
          batchGroup.reduce((sum, batch) => sum + batch.length, 0) /
          (batchTimes[batchTimes.length - 1] / 1000 || 1)
      })
    }

    // Calcular métricas finales
    if (batchTimes.length > 0) {
      this.performanceMetrics.averageBatchTime =
        batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length
    }
  }

  /**
   * Reporta el progreso de la importación
   * @param progress - Información de progreso
   */
  private reportProgress(progress: ImportProgress): void {
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
   * Obtiene las métricas de rendimiento
   * @returns PerformanceMetrics - Métricas de rendimiento
   */
  getPerformanceMetrics(): Partial<PerformanceMetrics> {
    return {
      ...this.performanceMetrics,
      peakMemoryUsage: this.getMemoryUsage(),
      averageMemoryUsage: this.getMemoryUsage() // Simplificado por ahora
    }
  }
}
