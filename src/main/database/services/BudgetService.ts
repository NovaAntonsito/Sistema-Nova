import { BudgetRepository } from '../repositories/BudgetRepository'
import { UserRepository } from '../repositories/UserRepository'
import { InterestRepository } from '../repositories/InterestRepository'
import { QuotaRepository } from '../repositories/QuotaRepository'
import { Budget } from '../entities/Budget'
import { Quota } from '../entities/Quota'
import { Status } from '../entities/Status'
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetResponseDto,
  validateCreateBudgetDto,
  validateUpdateBudgetDto
} from '../dto/budget.dto'
import { CodeGenerator } from '../utils/codeGenerator'
import { InterestCalculator } from '../utils/interestCalculator'
import { StatusManager } from '../utils/statusManager'

export class BudgetNotFoundException extends Error {
  constructor(id: string) {
    super(`Presupuesto con ID ${id} no encontrado`)
    this.name = 'BudgetNotFoundException'
  }
}

export class UserNotFoundException extends Error {
  constructor(id: string) {
    super(`Usuario con ID ${id} no encontrado`)
    this.name = 'UserNotFoundException'
  }
}

export class InterestNotFoundException extends Error {
  constructor(paymentTerm: number) {
    super(`Configuración de interés para plazo ${paymentTerm} no encontrada`)
    this.name = 'InterestNotFoundException'
  }
}

export class DuplicateCodeException extends Error {
  constructor(code: string) {
    super(`Ya existe un presupuesto con el código ${code}`)
    this.name = 'DuplicateCodeException'
  }
}

export class ValidationException extends Error {
  constructor(errors: string[]) {
    super(`Errores de validación: ${errors.join(', ')}`)
    this.name = 'ValidationException'
  }
}

export class BudgetService {
  private codeGenerator: CodeGenerator
  private statusManager: StatusManager

  constructor(
    private budgetRepository: BudgetRepository,
    private userRepository: UserRepository,
    private interestRepository: InterestRepository,
    private quotaRepository: QuotaRepository
  ) {
    this.codeGenerator = new CodeGenerator(budgetRepository)
    this.statusManager = new StatusManager(budgetRepository)
  }

  /**
   * Crea un nuevo presupuesto con cálculo automático de interés
   */
  async createBudget(createBudgetDto: CreateBudgetDto): Promise<BudgetResponseDto> {
    // Validar datos de entrada
    const validationErrors = validateCreateBudgetDto(createBudgetDto)
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors)
    }

    // Verificar que el usuario existe
    const user = await this.userRepository.findActiveById(createBudgetDto.userId)
    if (!user) {
      throw new UserNotFoundException(createBudgetDto.userId)
    }

    // Obtener la tasa de interés para el plazo de pago
    const interestRate = await this.interestRepository.getInterestRateByPaymentTerm(
      createBudgetDto.paymentTerm
    )
    if (interestRate === null) {
      throw new InterestNotFoundException(createBudgetDto.paymentTerm)
    }

    // Generar código del presupuesto
    const code = await this.codeGenerator.generateBudgetCode(createBudgetDto.code)

    // Calcular monto total con interés
    const totalAmount = InterestCalculator.calculateTotalAmount(
      createBudgetDto.baseAmount,
      interestRate
    )

    // Crear presupuesto
    const budget = new Budget()
    budget._expirationDate = createBudgetDto._expirationDate
    budget.currentStatus = Status.ACTIVE // Requirement 2.4
    budget.totalAmount = totalAmount
    budget.currentInterest = interestRate
    budget.paymentTerm = createBudgetDto.paymentTerm
    budget.code = code
    budget.quotaList = [] // Requirement 2.5
    budget.user = user

    const savedBudget = await this.budgetRepository.save(budget)
    return this.mapToResponseDto(savedBudget)
  }

  /**
   * Obtiene todos los presupuestos activos
   */
  async getAllBudgets(): Promise<BudgetResponseDto[]> {
    const budgets = await this.budgetRepository.findAllActive()
    return budgets.map((budget) => this.mapToResponseDto(budget))
  }

  /**
   * Obtiene un presupuesto por ID
   */
  async getBudgetById(id: string): Promise<BudgetResponseDto> {
    const budget = await this.budgetRepository.findActiveById(id)
    if (!budget) {
      throw new BudgetNotFoundException(id)
    }
    return this.mapToResponseDto(budget)
  }

  /**
   * Busca presupuesto por código
   */
  async searchByCode(code: string): Promise<BudgetResponseDto | null> {
    const budget = await this.budgetRepository.findByCode(code.trim())
    return budget ? this.mapToResponseDto(budget) : null
  }

  /**
   * Obtiene presupuestos por usuario
   */
  async getBudgetsByUserId(userId: string): Promise<BudgetResponseDto[]> {
    const budgets = await this.budgetRepository.findByUserId(userId)
    return budgets.map((budget) => this.mapToResponseDto(budget))
  }

  /**
   * Obtiene presupuestos por estado
   */
  async getBudgetsByStatus(status: Status): Promise<BudgetResponseDto[]> {
    const budgets = await this.budgetRepository.findByStatus(status)
    return budgets.map((budget) => this.mapToResponseDto(budget))
  }

  /**
   * Actualiza un presupuesto (solo permite agregar cuotas)
   */
  async updateBudget(id: string, updateBudgetDto: UpdateBudgetDto): Promise<BudgetResponseDto> {
    // Validar datos de entrada
    const validationErrors = validateUpdateBudgetDto(updateBudgetDto)
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors)
    }

    // Verificar que el presupuesto existe
    const existingBudget = await this.budgetRepository.findActiveById(id)
    if (!existingBudget) {
      throw new BudgetNotFoundException(id)
    }

    // Solo se permite agregar cuotas después de la creación (Requirement 2.7, 2.8)
    if (updateBudgetDto.quotaToAdd) {
      await this.addQuotaToBudget(id, updateBudgetDto.quotaToAdd.amount)
    }

    // Obtener el presupuesto actualizado
    const updatedBudget = await this.budgetRepository.findActiveById(id)
    return this.mapToResponseDto(updatedBudget!)
  }

  /**
   * Agrega una cuota a un presupuesto existente
   */
  async addQuotaToBudget(budgetId: string, amount: number): Promise<void> {
    // Verificar que el presupuesto existe
    const budget = await this.budgetRepository.findActiveById(budgetId)
    if (!budget) {
      throw new BudgetNotFoundException(budgetId)
    }

    // Crear nueva cuota
    const quota = new Quota()
    quota.amount = amount
    quota.budget = budget

    await this.quotaRepository.save(quota)

    // Verificar si el presupuesto debe marcarse como terminado
    await this.statusManager.updateToFinishedIfComplete(budgetId)
  }

  /**
   * Elimina lógicamente un presupuesto
   */
  async deleteBudget(id: string): Promise<void> {
    const budget = await this.budgetRepository.findActiveById(id)
    if (!budget) {
      throw new BudgetNotFoundException(id)
    }

    await this.budgetRepository.logicalDelete(id)
  }

  /**
   * Actualiza presupuestos vencidos
   */
  async updateExpiredBudgets(): Promise<number> {
    return await this.statusManager.updateExpiredBudgets()
  }

  /**
   * Realiza mantenimiento de estados de presupuestos
   */
  async performStatusMaintenance(): Promise<{ expired: number; finished: number }> {
    return await this.statusManager.performStatusMaintenance()
  }

  /**
   * Obtiene resumen de estados de presupuestos
   */
  async getStatusSummary(): Promise<Record<Status, number>> {
    return await this.statusManager.getStatusSummary()
  }

  /**
   * Verifica si un código está disponible
   */
  async isCodeAvailable(code: string): Promise<boolean> {
    return await this.codeGenerator.isCodeAvailable(code)
  }

  /**
   * Genera el siguiente código disponible
   */
  async generateNextCode(): Promise<string> {
    return await this.codeGenerator.generateNextCode()
  }

  /**
   * Calcula el monto total con interés
   */
  calculateTotalAmount(baseAmount: number, interestPercentage: number): number {
    return InterestCalculator.calculateTotalAmount(baseAmount, interestPercentage)
  }

  /**
   * Calcula el pago mensual
   */
  calculateMonthlyPayment(totalAmount: number, paymentTerm: number): number {
    return InterestCalculator.calculateMonthlyPayment(totalAmount, paymentTerm)
  }

  /**
   * Mapea una entidad Budget a BudgetResponseDto
   */
  private mapToResponseDto(budget: Budget): BudgetResponseDto {
    return {
      id: budget.id,
      _creationDate: budget._creationDate,
      _expirationDate: budget._expirationDate,
      currentStatus: budget.currentStatus,
      totalAmount: budget.totalAmount,
      currentInterest: budget.currentInterest,
      paymentTerm: budget.paymentTerm,
      code: budget.code,
      quotaList: budget.quotaList?.map((quota) => ({
        id: quota.id,
        _creationDate: quota._creationDate,
        amount: quota.amount
      })),
      user: budget.user
        ? {
            id: budget.user.id,
            nombre: budget.user.nombre,
            email: budget.user.email,
            phoneNumber: budget.user.phoneNumber
          }
        : undefined,
      updatedAt: budget.updatedAt
    }
  }
}
