/**
 * Optimizador de base de datos para importaciones
 * Cumple con requisitos: Optimización de rendimiento
 */

import { DataSource, QueryRunner, EntityManager } from 'typeorm'
import { EventEmitter } from 'events'
import { ImportConfig, PerformanceMetrics } from '../types/import.types'

/**
 * Configuración de optimización de base de datos
 */
export interface DatabaseOptimizationConfig {
  enableBatchInserts: boolean
  batchSize: number
  enableTransactionOptimization: boolean
  disableIndexesDuringImport: boolean
  enableConnectionPooling: boolean
  maxConnections: number
  queryTimeout: number
  enableQueryLogging: boolean
}

/**
 * Resultado de optimización
 */
export interface OptimizationResult {
  optimizationsApplied: string[]
  performanceGain: number
  memoryUsage: number
  queryCount: number
  averageQueryTime: number
}

/**
 * Optimizador de base de datos
 */
export class DatabaseOptimizer extends EventEmitter {
  private dataSource: DataSource
  private config: DatabaseOptimizationConfig
  private originalIndexes: Map<string, any[]> = new Map()
  private queryMetrics: {
    totalQueries: number
    totalTime: number
    queries: Array<{ query: string; time: number; timestamp: Date }>
  } = {
    totalQueries: 0,
    totalTime: 0,
    queries: []
  }

  constructor(dataSource: DataSource, config: DatabaseOptimizationConfig) {
    super()
    this.dataSource = dataSource
    this.config = config
  }

  /**
   * Aplica optimizaciones antes de la importación
   * @returns Promise<OptimizationResult> - Resultado de las optimizaciones
   */
  async applyPreImportOptimizations(): Promise<OptimizationResult> {
    const startTime = Date.now()
    const optimizationsApplied: string[] = []

    try {
      // Deshabilitar índices si está configurado
      if (this.config.disableIndexesDuringImport) {
        await this.disableIndexes()
        optimizationsApplied.push('indexes_disabled')
      }

      // Configurar pool de conexiones
      if (this.config.enableConnectionPooling) {
        await this.optimizeConnectionPool()
        optimizationsApplied.push('connection_pool_optimized')
      }

      // Configurar parámetros de transacción
      if (this.config.enableTransactionOptimization) {
        await this.optimizeTransactionSettings()
        optimizationsApplied.push('transaction_settings_optimized')
      }

      // Configurar logging de queries
      if (this.config.enableQueryLogging) {
        this.enableQueryLogging()
        optimizationsApplied.push('query_logging_enabled')
      }

      const duration = Date.now() - startTime

      this.emit('optimizationsApplied', {
        optimizations: optimizationsApplied,
        duration
      })

      return {
        optimizationsApplied,
        performanceGain: 0, // Se calculará después de la importación
        memoryUsage: process.memoryUsage().heapUsed,
        queryCount: 0,
        averageQueryTime: 0
      }
    } catch (error) {
      this.emit('optimizationError', error)
      throw error
    }
  }

  /**
   * Restaura configuraciones después de la importación
   * @returns Promise<void>
   */
  async restorePostImportSettings(): Promise<void> {
    try {
      // Rehabilitar índices
      if (this.config.disableIndexesDuringImport) {
        await this.enableIndexes()
      }

      // Restaurar configuraciones de transacción
      if (this.config.enableTransactionOptimization) {
        await this.restoreTransactionSettings()
      }

      this.emit('settingsRestored')
    } catch (error) {
      this.emit('restoreError', error)
      throw error
    }
  }

  /**
   * Crea un QueryRunner optimizado para lotes
   * @returns Promise<QueryRunner> - QueryRunner optimizado
   */
  async createOptimizedQueryRunner(): Promise<QueryRunner> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()

    // Configurar timeout personalizado
    if (this.config.queryTimeout > 0) {
      await queryRunner.query(`SET statement_timeout = ${this.config.queryTimeout}`)
    }

    return queryRunner
  }

  /**
   * Ejecuta una operación por lotes optimizada
   * @param entities - Entidades a procesar
   * @param operation - Operación a ejecutar
   * @param entityManager - Entity manager
   * @returns Promise<T[]> - Resultados de la operación
   */
  async executeBatchOperation<T>(
    entities: T[],
    operation: 'insert' | 'update' | 'upsert',
    entityManager: EntityManager,
    entityClass: any
  ): Promise<T[]> {
    const startTime = Date.now()
    const results: T[] = []

    try {
      if (this.config.enableBatchInserts && entities.length > this.config.batchSize) {
        // Procesar en lotes
        for (let i = 0; i < entities.length; i += this.config.batchSize) {
          const batch = entities.slice(i, i + this.config.batchSize)
          const batchResults = await this.executeSingleBatch(
            batch,
            operation,
            entityManager,
            entityClass
          )
          results.push(...batchResults)

          // Emitir progreso
          this.emit('batchProcessed', {
            processed: i + batch.length,
            total: entities.length,
            batchSize: batch.length
          })
        }
      } else {
        // Procesar todo de una vez
        const batchResults = await this.executeSingleBatch(
          entities,
          operation,
          entityManager,
          entityClass
        )
        results.push(...batchResults)
      }

      const duration = Date.now() - startTime
      this.recordQueryMetrics('batch_operation', duration)

      return results
    } catch (error) {
      this.emit('batchError', error)
      throw error
    }
  }

  /**
   * Ejecuta un lote individual
   * @param batch - Lote de entidades
   * @param operation - Operación a ejecutar
   * @param entityManager - Entity manager
   * @param entityClass - Clase de la entidad
   * @returns Promise<T[]> - Resultados del lote
   */
  private async executeSingleBatch<T>(
    batch: T[],
    operation: 'insert' | 'update' | 'upsert',
    entityManager: EntityManager,
    entityClass: any
  ): Promise<T[]> {
    const startTime = Date.now()

    try {
      let results: T[] = []

      switch (operation) {
        case 'insert':
          const insertResult = await entityManager.insert(entityClass, batch)
          results = batch // Para inserts, retornamos las entidades originales
          break

        case 'update':
          // Para updates, necesitamos procesar uno por uno o usar upsert
          for (const entity of batch) {
            await entityManager.save(entityClass, entity)
            results.push(entity)
          }
          break

        case 'upsert':
          // Usar upsert nativo si está disponible
          if (entityManager.upsert) {
            await entityManager.upsert(entityClass, batch, ['id'])
            results = batch
          } else {
            // Fallback a save individual
            for (const entity of batch) {
              const saved = await entityManager.save(entityClass, entity)
              results.push(saved)
            }
          }
          break
      }

      const duration = Date.now() - startTime
      this.recordQueryMetrics(`${operation}_batch`, duration)

      return results
    } catch (error) {
      const duration = Date.now() - startTime
      this.recordQueryMetrics(`${operation}_batch_error`, duration)
      throw error
    }
  }

  /**
   * Deshabilita índices para mejorar rendimiento de inserción
   * @returns Promise<void>
   */
  private async disableIndexes(): Promise<void> {
    const queryRunner = await this.createOptimizedQueryRunner()

    try {
      // Obtener información de índices existentes
      const tables = ['users', 'budgets', 'quotas', 'interests']

      for (const tableName of tables) {
        const indexes = await queryRunner.query(
          `
          SELECT indexname, indexdef 
          FROM pg_indexes 
          WHERE tablename = $1 AND indexname NOT LIKE '%_pkey'
        `,
          [tableName]
        )

        if (indexes.length > 0) {
          this.originalIndexes.set(tableName, indexes)

          // Eliminar índices temporalmente
          for (const index of indexes) {
            await queryRunner.query(`DROP INDEX IF EXISTS ${index.indexname}`)
          }
        }
      }

      this.emit('indexesDisabled', {
        tables: Array.from(this.originalIndexes.keys()),
        indexCount: Array.from(this.originalIndexes.values()).flat().length
      })
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * Rehabilita índices después de la importación
   * @returns Promise<void>
   */
  private async enableIndexes(): Promise<void> {
    const queryRunner = await this.createOptimizedQueryRunner()

    try {
      for (const [tableName, indexes] of this.originalIndexes.entries()) {
        for (const index of indexes) {
          await queryRunner.query(index.indexdef)
        }
      }

      this.emit('indexesEnabled', {
        tables: Array.from(this.originalIndexes.keys()),
        indexCount: Array.from(this.originalIndexes.values()).flat().length
      })

      this.originalIndexes.clear()
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * Optimiza el pool de conexiones
   * @returns Promise<void>
   */
  private async optimizeConnectionPool(): Promise<void> {
    // Configurar pool de conexiones si es posible
    if (this.dataSource.options.type === 'postgres') {
      // Para PostgreSQL, podemos ajustar configuraciones
      const queryRunner = await this.createOptimizedQueryRunner()

      try {
        // Configuraciones de rendimiento para PostgreSQL
        await queryRunner.query('SET synchronous_commit = OFF')
        await queryRunner.query('SET wal_buffers = 16MB')
        await queryRunner.query('SET checkpoint_segments = 32')
        await queryRunner.query('SET checkpoint_completion_target = 0.9')

        this.emit('connectionPoolOptimized')
      } finally {
        await queryRunner.release()
      }
    }
  }

  /**
   * Optimiza configuraciones de transacción
   * @returns Promise<void>
   */
  private async optimizeTransactionSettings(): Promise<void> {
    const queryRunner = await this.createOptimizedQueryRunner()

    try {
      // Configuraciones de transacción para mejor rendimiento
      await queryRunner.query("SET transaction_isolation = 'READ COMMITTED'")
      await queryRunner.query('SET lock_timeout = 30000') // 30 segundos

      this.emit('transactionSettingsOptimized')
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * Restaura configuraciones de transacción
   * @returns Promise<void>
   */
  private async restoreTransactionSettings(): Promise<void> {
    const queryRunner = await this.createOptimizedQueryRunner()

    try {
      // Restaurar configuraciones por defecto
      await queryRunner.query('SET synchronous_commit = ON')
      await queryRunner.query("SET transaction_isolation = 'READ COMMITTED'")

      this.emit('transactionSettingsRestored')
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * Habilita logging de queries para métricas
   */
  private enableQueryLogging(): void {
    // Interceptar queries para métricas
    const originalQuery = this.dataSource.createQueryRunner().query

    this.dataSource.createQueryRunner().query = async function (query: string, parameters?: any[]) {
      const startTime = Date.now()
      try {
        const result = await originalQuery.call(this, query, parameters)
        const duration = Date.now() - startTime

        // Registrar métrica
        this.recordQueryMetrics(query, duration)

        return result
      } catch (error) {
        const duration = Date.now() - startTime
        this.recordQueryMetrics(`ERROR: ${query}`, duration)
        throw error
      }
    }.bind(this)
  }

  /**
   * Registra métricas de queries
   * @param query - Query ejecutada
   * @param duration - Duración en ms
   */
  private recordQueryMetrics(query: string, duration: number): void {
    this.queryMetrics.totalQueries++
    this.queryMetrics.totalTime += duration
    this.queryMetrics.queries.push({
      query: query.substring(0, 100), // Limitar longitud
      time: duration,
      timestamp: new Date()
    })

    // Mantener solo las últimas 1000 queries
    if (this.queryMetrics.queries.length > 1000) {
      this.queryMetrics.queries = this.queryMetrics.queries.slice(-1000)
    }
  }

  /**
   * Obtiene métricas de rendimiento de la base de datos
   * @returns PerformanceMetrics - Métricas de rendimiento
   */
  getPerformanceMetrics(): Partial<PerformanceMetrics> {
    const averageQueryTime =
      this.queryMetrics.totalQueries > 0
        ? this.queryMetrics.totalTime / this.queryMetrics.totalQueries
        : 0

    return {
      totalQueries: this.queryMetrics.totalQueries,
      averageQueryTime,
      transactionCount: 0, // Se actualizará externamente
      averageTransactionTime: 0 // Se actualizará externamente
    }
  }

  /**
   * Limpia métricas y recursos
   */
  cleanup(): void {
    this.queryMetrics = {
      totalQueries: 0,
      totalTime: 0,
      queries: []
    }
    this.originalIndexes.clear()
  }
}
