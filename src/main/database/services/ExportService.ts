import { UserRepository } from '../repositories/UserRepository'
import { BudgetRepository } from '../repositories/BudgetRepository'
import { QuotaRepository } from '../repositories/QuotaRepository'
import { InterestRepository } from '../repositories/InterestRepository'
import { CsvGenerator } from '../utils/csvGenerator'
import { ZipGenerator, ExportMetadata } from '../utils/zipGenerator'
import {
  DataRetrievalException,
  FileWriteException,
  ExportException
} from '../utils/exportExceptions'
import { join } from 'path'

/**
 * Interfaz para el resultado de exportación completa
 */
export interface ExportResult {
  zipFilePath: string
  metadata: ExportMetadata
}

/**
 * Servicio de exportación que maneja la lógica de negocio para exportar datos a CSV
 */
export class ExportService {
  private csvGenerator: CsvGenerator
  private zipGenerator: ZipGenerator

  constructor(
    private userRepository: UserRepository,
    private budgetRepository: BudgetRepository,
    private quotaRepository: QuotaRepository,
    private interestRepository: InterestRepository
  ) {
    this.csvGenerator = new CsvGenerator()
    this.zipGenerator = new ZipGenerator()
  }

  /**
   * Exporta todos los usuarios (activos y eliminados lógicamente) a CSV
   * @returns Promise<string> - Ruta del archivo CSV generado
   */
  async exportUsersToCSV(): Promise<string> {
    try {
      // Obtener todos los usuarios incluyendo eliminados lógicamente
      const users = await this.userRepository.find({
        order: { createdAt: 'ASC' }
      })

      if (!users || users.length === 0) {
        throw new DataRetrievalException(
          'usuarios',
          new Error('No se encontraron usuarios para exportar')
        )
      }

      const headers = [
        'id',
        'nombre',
        'email',
        'phoneNumber',
        'isDeleted',
        'createdAt',
        'updatedAt'
      ]

      // Mapear datos para CSV
      const csvData = users.map((user) => ({
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isDeleted: user.isDeleted,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))

      // Generar archivo CSV
      const filePath = await this.csvGenerator.generateCSV(csvData, headers, 'users')
      return filePath
    } catch (error) {
      if (error instanceof DataRetrievalException) {
        throw error
      }
      throw new DataRetrievalException('usuarios', error as Error)
    }
  }

  /**
   * Exporta todos los presupuestos (activos y eliminados lógicamente) a CSV
   * @returns Promise<string> - Ruta del archivo CSV generado
   */
  async exportBudgetsToCSV(): Promise<string> {
    try {
      // Obtener todos los presupuestos incluyendo eliminados lógicamente con relación de usuario
      const budgets = await this.budgetRepository.find({
        relations: ['user'],
        order: { _creationDate: 'ASC' }
      })

      if (!budgets || budgets.length === 0) {
        throw new DataRetrievalException(
          'presupuestos',
          new Error('No se encontraron presupuestos para exportar')
        )
      }

      const headers = [
        'id',
        '_creationDate',
        '_expirationDate',
        'currentStatus',
        'totalAmount',
        'currentInterest',
        'paymentTerm',
        'code',
        'userId',
        'isDeleted',
        'updatedAt'
      ]

      // Mapear datos para CSV
      const csvData = budgets.map((budget) => ({
        id: budget.id,
        _creationDate: budget._creationDate,
        _expirationDate: budget._expirationDate,
        currentStatus: budget.currentStatus,
        totalAmount: budget.totalAmount,
        currentInterest: budget.currentInterest,
        paymentTerm: budget.paymentTerm,
        code: budget.code,
        userId: budget.user?.id || null,
        isDeleted: budget.isDeleted,
        updatedAt: budget.updatedAt
      }))

      // Generar archivo CSV
      const filePath = await this.csvGenerator.generateCSV(csvData, headers, 'budgets')
      return filePath
    } catch (error) {
      if (error instanceof DataRetrievalException) {
        throw error
      }
      throw new DataRetrievalException('presupuestos', error as Error)
    }
  }

  /**
   * Exporta todas las cuotas a CSV con relaciones a presupuestos
   * @returns Promise<string> - Ruta del archivo CSV generado
   */
  async exportQuotasToCSV(): Promise<string> {
    try {
      // Obtener todas las cuotas con relación de presupuesto, ordenadas por fecha de creación (requisito 3.4)
      const quotas = await this.quotaRepository.find({
        relations: ['budget'],
        order: { _creationDate: 'ASC' }
      })

      if (!quotas || quotas.length === 0) {
        throw new DataRetrievalException(
          'cuotas',
          new Error('No se encontraron cuotas para exportar')
        )
      }

      const headers = ['id', '_creationDate', 'amount', 'budgetId', 'isDeleted']

      // Mapear datos para CSV
      const csvData = quotas.map((quota) => ({
        id: quota.id,
        _creationDate: quota._creationDate,
        amount: quota.amount,
        budgetId: quota.budget?.id || null,
        isDeleted: false // Por defecto false ya que las cuotas no tienen eliminación lógica actualmente
      }))

      // Generar archivo CSV
      const filePath = await this.csvGenerator.generateCSV(csvData, headers, 'quotas')
      return filePath
    } catch (error) {
      if (error instanceof DataRetrievalException) {
        throw error
      }
      throw new DataRetrievalException('cuotas', error as Error)
    }
  }

  /**
   * Exporta todas las configuraciones de interés a CSV
   * @returns Promise<string> - Ruta del archivo CSV generado
   */
  async exportInterestsToCSV(): Promise<string> {
    try {
      const interests = await this.interestRepository.find({
        order: { paymentTerm: 'ASC' }
      })

      if (!interests || interests.length === 0) {
        throw new DataRetrievalException(
          'intereses',
          new Error('No se encontraron configuraciones de interés para exportar')
        )
      }

      const headers = [
        'id',
        'paymentTerm',
        'interestPercentage',
        'isActive',
        'createdAt',
        'updatedAt'
      ]

      // Mapear datos para CSV
      const csvData = interests.map((interest) => ({
        id: interest.id,
        paymentTerm: interest.paymentTerm,
        interestPercentage: interest.interest,
        isActive: true, // Por defecto true ya que no hay campo isActive en la entidad actual
        createdAt: interest.createdAt,
        updatedAt: interest.updatedAt
      }))

      // Generar archivo CSV
      const filePath = await this.csvGenerator.generateCSV(csvData, headers, 'interests')
      return filePath
    } catch (error) {
      if (error instanceof DataRetrievalException) {
        throw error
      }
      throw new DataRetrievalException('intereses', error as Error)
    }
  }

  /**
   * Realiza una exportación completa de todos los datos en un archivo ZIP
   * @returns Promise<ExportResult> - Resultado con ruta del ZIP y metadatos
   */
  async exportCompleteData(): Promise<ExportResult> {
    const tempFiles: string[] = []

    try {
      console.log('Iniciando exportación completa de datos...')

      const usersFile = await this.exportUsersToCSV()
      const budgetsFile = await this.exportBudgetsToCSV()
      const quotasFile = await this.exportQuotasToCSV()
      const interestsFile = await this.exportInterestsToCSV()

      tempFiles.push(usersFile, budgetsFile, quotasFile, interestsFile)
      console.log('Archivos CSV individuales generados exitosamente')

      // Obtener conteos para metadatos
      const userCount = await this.userRepository.count()
      const budgetCount = await this.budgetRepository.count()
      const quotaCount = await this.quotaRepository.count()
      const interestCount = await this.interestRepository.count()

      // Calcular tamaño total de archivos
      const totalSize = await this.zipGenerator.calculateTotalSize(tempFiles)

      const metadata = this.zipGenerator.createMetadata(
        {
          users: userCount,
          budgets: budgetCount,
          quotas: quotaCount,
          interests: interestCount
        },
        totalSize
      )

      const metadataPath = await this.createMetadataFile(metadata)
      tempFiles.push(metadataPath)

      const zipPath = join('temp/exports', `complete_export_${Date.now()}.zip`)
      const zipFilePath = await this.zipGenerator.createZip(tempFiles, zipPath)

      console.log(`Exportación completa finalizada: ${zipFilePath}`)

      await this.cleanupTempFiles(tempFiles)

      // Retornar resultado (requisito 5.3)
      return {
        zipFilePath,
        metadata
      }
    } catch (error) {
      await this.cleanupTempFiles(tempFiles)

      if (error instanceof ExportException) {
        throw error
      }
      throw new ExportException(
        `Error en exportación completa: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    }
  }

  /**
   * Crea un archivo de metadatos JSON temporal
   * @param metadata - Metadatos de la exportación
   * @returns Promise<string> - Ruta del archivo de metadatos creado
   */
  private async createMetadataFile(metadata: ExportMetadata): Promise<string> {
    try {
      const fs = await import('fs/promises')
      const metadataPath = join('temp/exports', 'metadata.json')

      const metadataContent = JSON.stringify(metadata, null, 2)

      await fs.writeFile(metadataPath, metadataContent, 'utf8')

      console.log(`Archivo de metadatos creado: ${metadataPath}`)
      return metadataPath
    } catch (error) {
      throw new FileWriteException(
        'metadata.json',
        error instanceof Error ? error : new Error('Error desconocido')
      )
    }
  }

  /**
   * Limpia archivos temporales de forma segura
   * @param files - Array de rutas de archivos a limpiar
   */
  private async cleanupTempFiles(files: string[]): Promise<void> {
    if (!files || files.length === 0) {
      return
    }

    const fs = await import('fs/promises')
    let cleanedCount = 0
    let failedCount = 0

    for (const file of files) {
      try {
        // Verificar si el archivo existe antes de intentar eliminarlo
        await fs.access(file)
        await fs.unlink(file)
        cleanedCount++
        console.log(`Archivo temporal eliminado: ${file}`)
      } catch (error) {
        failedCount++
        // Continuar con la limpieza aunque falle un archivo
        console.warn(`No se pudo eliminar archivo temporal: ${file}`, error)
      }
    }

    console.log(`Limpieza completada: ${cleanedCount} archivos eliminados, ${failedCount} fallos`)
  }

  /**
   * Obtiene estadísticas de exportación para una entidad específica
   * @param entityType - Tipo de entidad ('users', 'budgets', 'quotas', 'interests')
   * @returns Promise<number> - Número de registros
   */
  async getExportStats(entityType: 'users' | 'budgets' | 'quotas' | 'interests'): Promise<number> {
    try {
      switch (entityType) {
        case 'users':
          return await this.userRepository.count()
        case 'budgets':
          return await this.budgetRepository.count()
        case 'quotas':
          return await this.quotaRepository.count()
        case 'interests':
          return await this.interestRepository.count()
        default:
          throw new Error(`Tipo de entidad no válido: ${entityType}`)
      }
    } catch (error) {
      throw new DataRetrievalException(`estadísticas de ${entityType}`, error as Error)
    }
  }
}
