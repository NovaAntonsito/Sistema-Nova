/**
 * Sistema de validación de datos para importación CSV
 * Cumple con requisitos: 1.3, 2.3, 2.4, 3.3, 4.3, 4.4, 6.1, 6.2, 6.3
 */

import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  UserImportData,
  BudgetImportData,
  QuotaImportData,
  InterestImportData,
  EntityType
} from '../types/import.types'

/**
 * Contexto de validación para mantener referencias entre entidades
 */
interface ValidationContext {
  existingUserIds: Set<string>
  existingBudgetIds: Set<string>
  existingInterestTerms: Set<number>
  importedUserIds: Set<string>
  importedBudgetIds: Set<string>
  importedInterestTerms: Set<number>
  userEmails: Map<string, number> // email -> line number
  budgetCodes: Map<string, number> // code -> line number
  interestTerms: Map<number, number> // term -> line number
}

/**
 * Validador de datos para importación CSV
 */
export class DataValidator {
  private context: ValidationContext

  constructor() {
    this.context = this.createEmptyContext()
  }

  /**
   * Crea un contexto de validación vacío
   */
  private createEmptyContext(): ValidationContext {
    return {
      existingUserIds: new Set(),
      existingBudgetIds: new Set(),
      existingInterestTerms: new Set(),
      importedUserIds: new Set(),
      importedBudgetIds: new Set(),
      importedInterestTerms: new Set(),
      userEmails: new Map(),
      budgetCodes: new Map(),
      interestTerms: new Map()
    }
  }

  /**
   * Inicializa el contexto con datos existentes en la base de datos
   */
  async initializeContext(existingData: {
    userIds?: string[]
    budgetIds?: string[]
    interestTerms?: number[]
  }): Promise<void> {
    this.context = this.createEmptyContext()

    if (existingData.userIds) {
      existingData.userIds.forEach((id) => this.context.existingUserIds.add(id))
    }

    if (existingData.budgetIds) {
      existingData.budgetIds.forEach((id) => this.context.existingBudgetIds.add(id))
    }

    if (existingData.interestTerms) {
      existingData.interestTerms.forEach((term) => this.context.existingInterestTerms.add(term))
    }
  }

  /**
   * Valida datos de usuarios
   */
  async validateUsers(users: UserImportData[]): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const lineNumber = i + 2 // +2 porque línea 1 es header y arrays empiezan en 0

      // Validar campos requeridos
      this.validateRequiredFields(user, lineNumber, result, [
        'id',
        'nombre',
        'email',
        'phoneNumber',
        'isDeleted',
        'createdAt',
        'updatedAt'
      ])

      // Validar formato de ID
      if (user.id && !this.isValidId(user.id)) {
        this.addError(
          result,
          lineNumber,
          'id',
          user.id,
          'ID debe ser un UUID válido',
          'INVALID_ID_FORMAT'
        )
      }

      // Validar formato de email
      if (user.email && !this.isValidEmail(user.email)) {
        this.addError(
          result,
          lineNumber,
          'email',
          user.email,
          'Formato de email inválido',
          'INVALID_EMAIL_FORMAT'
        )
      }

      // Validar unicidad de email
      if (user.email) {
        const existingLine = this.context.userEmails.get(user.email)
        if (existingLine) {
          this.addError(
            result,
            lineNumber,
            'email',
            user.email,
            `Email duplicado, ya existe en línea ${existingLine}`,
            'DUPLICATE_EMAIL'
          )
        } else {
          this.context.userEmails.set(user.email, lineNumber)
        }
      }

      // Validar formato de teléfono
      if (user.phoneNumber && !this.isValidPhoneNumber(user.phoneNumber)) {
        this.addWarning(
          result,
          lineNumber,
          'phoneNumber',
          user.phoneNumber,
          'Formato de teléfono puede ser inválido',
          'PHONE_FORMAT_WARNING'
        )
      }

      // Validar formato de fechas
      if (user.createdAt && !this.isValidDateString(user.createdAt)) {
        this.addError(
          result,
          lineNumber,
          'createdAt',
          user.createdAt,
          'Formato de fecha inválido',
          'INVALID_DATE_FORMAT'
        )
      }

      if (user.updatedAt && !this.isValidDateString(user.updatedAt)) {
        this.addError(
          result,
          lineNumber,
          'updatedAt',
          user.updatedAt,
          'Formato de fecha inválido',
          'INVALID_DATE_FORMAT'
        )
      }

      // Validar tipo booleano
      if (typeof user.isDeleted !== 'boolean') {
        this.addError(
          result,
          lineNumber,
          'isDeleted',
          user.isDeleted,
          'isDeleted debe ser true o false',
          'INVALID_BOOLEAN'
        )
      }

      // Agregar ID al contexto si es válido
      if (user.id && this.isValidId(user.id)) {
        this.context.importedUserIds.add(user.id)
      }
    }

    result.isValid = result.errors.length === 0
    return result
  }

  /**
   * Valida datos de presupuestos
   */
  async validateBudgets(budgets: BudgetImportData[]): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    for (let i = 0; i < budgets.length; i++) {
      const budget = budgets[i]
      const lineNumber = i + 2

      // Validar campos requeridos
      this.validateRequiredFields(budget, lineNumber, result, [
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
      ])

      // Validar formato de ID
      if (budget.id && !this.isValidId(budget.id)) {
        this.addError(
          result,
          lineNumber,
          'id',
          budget.id,
          'ID debe ser un UUID válido',
          'INVALID_ID_FORMAT'
        )
      }

      // Validar integridad referencial con usuarios
      if (budget.userId) {
        if (
          !this.context.existingUserIds.has(budget.userId) &&
          !this.context.importedUserIds.has(budget.userId)
        ) {
          this.addError(
            result,
            lineNumber,
            'userId',
            budget.userId,
            'Usuario referenciado no existe',
            'REFERENTIAL_INTEGRITY_ERROR'
          )
        }
      }

      // Validar unicidad de código
      if (budget.code) {
        const existingLine = this.context.budgetCodes.get(budget.code)
        if (existingLine) {
          this.addError(
            result,
            lineNumber,
            'code',
            budget.code,
            `Código de presupuesto duplicado, ya existe en línea ${existingLine}`,
            'DUPLICATE_CODE'
          )
        } else {
          this.context.budgetCodes.set(budget.code, lineNumber)
        }
      }

      // Validar formato de fechas
      if (budget._creationDate && !this.isValidDateString(budget._creationDate)) {
        this.addError(
          result,
          lineNumber,
          '_creationDate',
          budget._creationDate,
          'Formato de fecha de creación inválido',
          'INVALID_DATE_FORMAT'
        )
      }

      if (budget._expirationDate && !this.isValidDateString(budget._expirationDate)) {
        this.addError(
          result,
          lineNumber,
          '_expirationDate',
          budget._expirationDate,
          'Formato de fecha de expiración inválido',
          'INVALID_DATE_FORMAT'
        )
      }

      // Validar montos
      if (typeof budget.totalAmount !== 'number' || budget.totalAmount < 0) {
        this.addError(
          result,
          lineNumber,
          'totalAmount',
          budget.totalAmount,
          'Monto total debe ser un número positivo',
          'INVALID_AMOUNT'
        )
      }

      if (typeof budget.currentInterest !== 'number' || budget.currentInterest < 0) {
        this.addError(
          result,
          lineNumber,
          'currentInterest',
          budget.currentInterest,
          'Interés actual debe ser un número positivo',
          'INVALID_INTEREST'
        )
      }

      // Validar término de pago
      if (typeof budget.paymentTerm !== 'number' || budget.paymentTerm <= 0) {
        this.addError(
          result,
          lineNumber,
          'paymentTerm',
          budget.paymentTerm,
          'Término de pago debe ser un número positivo',
          'INVALID_PAYMENT_TERM'
        )
      }

      // Validar estado
      const validStatuses = ['active', 'inactive', 'expired', 'cancelled']
      if (budget.currentStatus && !validStatuses.includes(budget.currentStatus)) {
        this.addError(
          result,
          lineNumber,
          'currentStatus',
          budget.currentStatus,
          `Estado debe ser uno de: ${validStatuses.join(', ')}`,
          'INVALID_STATUS'
        )
      }

      // Validar tipo booleano
      if (typeof budget.isDeleted !== 'boolean') {
        this.addError(
          result,
          lineNumber,
          'isDeleted',
          budget.isDeleted,
          'isDeleted debe ser true o false',
          'INVALID_BOOLEAN'
        )
      }

      // Agregar ID al contexto si es válido
      if (budget.id && this.isValidId(budget.id)) {
        this.context.importedBudgetIds.add(budget.id)
      }
    }

    result.isValid = result.errors.length === 0
    return result
  }

  /**
   * Valida datos de cuotas
   */
  async validateQuotas(quotas: QuotaImportData[]): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    for (let i = 0; i < quotas.length; i++) {
      const quota = quotas[i]
      const lineNumber = i + 2

      // Validar campos requeridos
      this.validateRequiredFields(quota, lineNumber, result, [
        'id',
        '_creationDate',
        'amount',
        'budgetId',
        'isDeleted'
      ])

      // Validar formato de ID
      if (quota.id && !this.isValidId(quota.id)) {
        this.addError(
          result,
          lineNumber,
          'id',
          quota.id,
          'ID debe ser un UUID válido',
          'INVALID_ID_FORMAT'
        )
      }

      // Validar integridad referencial con presupuestos
      if (quota.budgetId) {
        if (
          !this.context.existingBudgetIds.has(quota.budgetId) &&
          !this.context.importedBudgetIds.has(quota.budgetId)
        ) {
          this.addError(
            result,
            lineNumber,
            'budgetId',
            quota.budgetId,
            'Presupuesto referenciado no existe',
            'REFERENTIAL_INTEGRITY_ERROR'
          )
        }
      }

      // Validar formato de fecha
      if (quota._creationDate && !this.isValidDateString(quota._creationDate)) {
        this.addError(
          result,
          lineNumber,
          '_creationDate',
          quota._creationDate,
          'Formato de fecha de creación inválido',
          'INVALID_DATE_FORMAT'
        )
      }

      // Validar monto
      if (typeof quota.amount !== 'number' || quota.amount <= 0) {
        this.addError(
          result,
          lineNumber,
          'amount',
          quota.amount,
          'Monto de cuota debe ser un número positivo',
          'INVALID_QUOTA_AMOUNT'
        )
      }

      // Validar tipo booleano
      if (typeof quota.isDeleted !== 'boolean') {
        this.addError(
          result,
          lineNumber,
          'isDeleted',
          quota.isDeleted,
          'isDeleted debe ser true o false',
          'INVALID_BOOLEAN'
        )
      }
    }

    result.isValid = result.errors.length === 0
    return result
  }

  /**
   * Valida datos de configuraciones de interés
   */
  async validateInterests(interests: InterestImportData[]): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    for (let i = 0; i < interests.length; i++) {
      const interest = interests[i]
      const lineNumber = i + 2

      // Validar campos requeridos
      this.validateRequiredFields(interest, lineNumber, result, [
        'id',
        'paymentTerm',
        'interestPercentage',
        'isActive',
        'createdAt',
        'updatedAt'
      ])

      // Validar formato de ID
      if (interest.id && !this.isValidId(interest.id)) {
        this.addError(
          result,
          lineNumber,
          'id',
          interest.id,
          'ID debe ser un UUID válido',
          'INVALID_ID_FORMAT'
        )
      }

      // Validar unicidad de término de pago
      if (typeof interest.paymentTerm === 'number') {
        const existingLine = this.context.interestTerms.get(interest.paymentTerm)
        if (existingLine) {
          this.addError(
            result,
            lineNumber,
            'paymentTerm',
            interest.paymentTerm,
            `Término de pago duplicado, ya existe en línea ${existingLine}`,
            'DUPLICATE_PAYMENT_TERM'
          )
        } else {
          this.context.interestTerms.set(interest.paymentTerm, lineNumber)
        }
      }

      // Validar término de pago
      if (typeof interest.paymentTerm !== 'number' || interest.paymentTerm <= 0) {
        this.addError(
          result,
          lineNumber,
          'paymentTerm',
          interest.paymentTerm,
          'Término de pago debe ser un número positivo',
          'INVALID_PAYMENT_TERM'
        )
      }

      // Validar porcentaje de interés
      if (
        typeof interest.interestPercentage !== 'number' ||
        interest.interestPercentage < 0 ||
        interest.interestPercentage > 100
      ) {
        this.addError(
          result,
          lineNumber,
          'interestPercentage',
          interest.interestPercentage,
          'Porcentaje de interés debe estar entre 0 y 100',
          'INVALID_INTEREST_PERCENTAGE'
        )
      }

      // Validar formato de fechas
      if (interest.createdAt && !this.isValidDateString(interest.createdAt)) {
        this.addError(
          result,
          lineNumber,
          'createdAt',
          interest.createdAt,
          'Formato de fecha inválido',
          'INVALID_DATE_FORMAT'
        )
      }

      if (interest.updatedAt && !this.isValidDateString(interest.updatedAt)) {
        this.addError(
          result,
          lineNumber,
          'updatedAt',
          interest.updatedAt,
          'Formato de fecha inválido',
          'INVALID_DATE_FORMAT'
        )
      }

      // Validar tipo booleano
      if (typeof interest.isActive !== 'boolean') {
        this.addError(
          result,
          lineNumber,
          'isActive',
          interest.isActive,
          'isActive debe ser true o false',
          'INVALID_BOOLEAN'
        )
      }

      // Agregar término al contexto si es válido
      if (typeof interest.paymentTerm === 'number' && interest.paymentTerm > 0) {
        this.context.importedInterestTerms.add(interest.paymentTerm)
      }
    }

    result.isValid = result.errors.length === 0
    return result
  }

  /**
   * Valida integridad referencial entre todas las entidades
   */
  async validateReferentialIntegrity(data: {
    users?: UserImportData[]
    budgets?: BudgetImportData[]
    quotas?: QuotaImportData[]
    interests?: InterestImportData[]
  }): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    // Construir mapas de IDs disponibles
    const availableUserIds = new Set([
      ...this.context.existingUserIds,
      ...this.context.importedUserIds
    ])

    const availableBudgetIds = new Set([
      ...this.context.existingBudgetIds,
      ...this.context.importedBudgetIds
    ])

    const availableInterestTerms = new Set([
      ...this.context.existingInterestTerms,
      ...this.context.importedInterestTerms
    ])

    // Validar referencias de presupuestos a usuarios
    if (data.budgets) {
      for (let i = 0; i < data.budgets.length; i++) {
        const budget = data.budgets[i]
        const lineNumber = i + 2

        if (budget.userId && !availableUserIds.has(budget.userId)) {
          this.addError(
            result,
            lineNumber,
            'userId',
            budget.userId,
            'Usuario referenciado no existe en los datos importados o existentes',
            'REFERENTIAL_INTEGRITY_ERROR'
          )
        }

        // Validar que el término de pago exista en configuraciones de interés
        if (
          typeof budget.paymentTerm === 'number' &&
          !availableInterestTerms.has(budget.paymentTerm)
        ) {
          this.addWarning(
            result,
            lineNumber,
            'paymentTerm',
            budget.paymentTerm,
            'Término de pago no tiene configuración de interés correspondiente',
            'MISSING_INTEREST_CONFIG'
          )
        }
      }
    }

    // Validar referencias de cuotas a presupuestos
    if (data.quotas) {
      for (let i = 0; i < data.quotas.length; i++) {
        const quota = data.quotas[i]
        const lineNumber = i + 2

        if (quota.budgetId && !availableBudgetIds.has(quota.budgetId)) {
          this.addError(
            result,
            lineNumber,
            'budgetId',
            quota.budgetId,
            'Presupuesto referenciado no existe en los datos importados o existentes',
            'REFERENTIAL_INTEGRITY_ERROR'
          )
        }
      }
    }

    result.isValid = result.errors.length === 0
    return result
  }

  // Métodos de validación auxiliares

  private validateRequiredFields(
    data: any,
    lineNumber: number,
    result: ValidationResult,
    requiredFields: string[]
  ): void {
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        this.addError(
          result,
          lineNumber,
          field,
          data[field],
          `Campo requerido faltante: ${field}`,
          'REQUIRED_FIELD_MISSING'
        )
      }
    }
  }

  private isValidId(id: string): boolean {
    if (!id || typeof id !== 'string') {
      return false
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }

  private isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string' || email.length === 0) {
      return false
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email) && email.length <= 254
  }

  private isValidPhoneNumber(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
      return false
    }
    // Validar formato básico de teléfono (números, espacios, guiones, paréntesis)
    const phoneRegex = /^[\d\s\-\(\)\+]+$/
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7
  }

  private isValidDateString(dateStr: string): boolean {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
      return false
    }

    // Verificar formato ISO básico
    const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/
    if (!isoRegex.test(dateStr)) {
      return false
    }

    const date = new Date(dateStr)
    return !isNaN(date.getTime()) && date.toISOString().startsWith(dateStr.substring(0, 10))
  }

  private addError(
    result: ValidationResult,
    line: number,
    field: string,
    value: any,
    message: string,
    code: string
  ): void {
    result.errors.push({
      line,
      field,
      value,
      message,
      code
    })
  }

  private addWarning(
    result: ValidationResult,
    line: number,
    field: string,
    value: any,
    message: string,
    code: string
  ): void {
    result.warnings.push({
      line,
      field,
      value,
      message,
      code
    })
  }

  /**
   * Resetea el contexto de validación
   */
  resetContext(): void {
    this.context = this.createEmptyContext()
  }

  /**
   * Obtiene estadísticas del contexto actual
   */
  getContextStats(): {
    existingUsers: number
    existingBudgets: number
    existingInterests: number
    importedUsers: number
    importedBudgets: number
    importedInterests: number
  } {
    return {
      existingUsers: this.context.existingUserIds.size,
      existingBudgets: this.context.existingBudgetIds.size,
      existingInterests: this.context.existingInterestTerms.size,
      importedUsers: this.context.importedUserIds.size,
      importedBudgets: this.context.importedBudgetIds.size,
      importedInterests: this.context.importedInterestTerms.size
    }
  }
}
