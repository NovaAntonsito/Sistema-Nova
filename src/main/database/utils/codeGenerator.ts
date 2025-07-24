import { Repository } from 'typeorm'
import { Budget } from '../entities/Budget'

/**
 * Genera códigos alfanuméricos secuenciales en formato: 001A, 002A, etc.
 */
export class CodeGenerator {
  private budgetRepository: Repository<Budget>

  constructor(budgetRepository: Repository<Budget>) {
    this.budgetRepository = budgetRepository
  }

  /**
   * Genera el siguiente código de presupuesto secuencial
   * @returns Promise<string> - Siguiente código secuencial (ej., "001A", "002A")
   */
  async generateNextCode(): Promise<string> {
    // Obtiene el último código de presupuesto para determinar el siguiente número de secuencia
    const latestBudget = await this.budgetRepository
      .createQueryBuilder('budget')
      .where('budget.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('budget.code', 'DESC')
      .getOne()

    let nextNumber = 1

    if (latestBudget && latestBudget.code) {
      // Extrae la parte numérica del código (ej., "001A" -> 1)
      const numericPart = latestBudget.code.replace(/[A-Z]/g, '')
      const currentNumber = parseInt(numericPart, 10)

      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1
      }
    }

    // Formatea el número con ceros a la izquierda y agrega 'A'
    const formattedNumber = nextNumber.toString().padStart(3, '0')
    return `${formattedNumber}A`
  }

  /**
   * Valida si un código está disponible (no está en uso)
   * @param code - El código a validar
   * @returns Promise<boolean> - True si el código está disponible, false si está duplicado
   */
  async isCodeAvailable(code: string): Promise<boolean> {
    const existingBudget = await this.budgetRepository
      .createQueryBuilder('budget')
      .where('budget.code = :code', { code })
      .andWhere('budget.isDeleted = :isDeleted', { isDeleted: false })
      .getOne()

    return !existingBudget
  }

  /**
   * Genera un código de presupuesto, automáticamente o valida una anulación manual
   * @param manualCode - Código manual opcional para anular el automático
   * @returns Promise<string> - El código generado o validado
   * @throws Error si el código manual ya está en uso
   */
  async generateBudgetCode(manualCode?: string): Promise<string> {
    if (manualCode) {
      // Valida la anulación del código manual
      const isAvailable = await this.isCodeAvailable(manualCode)
      if (!isAvailable) {
        throw new Error(`Budget code '${manualCode}' is already in use`)
      }
      return manualCode
    }

    // Genera el siguiente código secuencial
    return await this.generateNextCode()
  }

  /**
   * Valida el formato del código (debe ser alfanumérico)
   * @param code - El código a validar
   * @returns boolean - True si el formato es válido
   */
  validateCodeFormat(code: string): boolean {
    // Permite códigos alfanuméricos con longitud razonable
    const codeRegex = /^[A-Z0-9]{3,10}$/
    return codeRegex.test(code.toUpperCase())
  }
}
