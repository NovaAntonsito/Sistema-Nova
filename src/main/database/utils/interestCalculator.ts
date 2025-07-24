/**
 * Clase utilitaria para cálculos de interés
 */
export class InterestCalculator {
  /**
   * Calcula el monto total basado en el monto base y el porcentaje de interés
   * @param baseAmount - El monto base antes del interés
   * @param interestPercentage - Porcentaje de interés (ej., 5.5 para 5.5%)
   * @returns number - Monto total después de aplicar el interés
   * @throws Error si las entradas son inválidas
   */
  static calculateTotalAmount(baseAmount: number, interestPercentage: number): number {
    // Valida las entradas
    if (!this.isValidAmount(baseAmount)) {
      throw new Error('Base amount must be a positive number')
    }

    if (!this.isValidInterestPercentage(interestPercentage)) {
      throw new Error('Interest percentage must be a non-negative number')
    }

    // Calcula el monto total: baseAmount * (1 + (interest/100))
    const interestMultiplier = 1 + interestPercentage / 100
    const totalAmount = baseAmount * interestMultiplier

    // Redondea a 2 decimales para precisión monetaria
    return Math.round(totalAmount * 100) / 100
  }

  /**
   * Calcula el monto de interés (diferencia entre total y base)
   * @param baseAmount - El monto base antes del interés
   * @param interestPercentage - Porcentaje de interés
   * @returns number - El monto de interés
   */
  static calculateInterestAmount(baseAmount: number, interestPercentage: number): number {
    const totalAmount = this.calculateTotalAmount(baseAmount, interestPercentage)
    return Math.round((totalAmount - baseAmount) * 100) / 100
  }

  /**
   * Calcula el monto de pago mensual para cuotas
   * @param totalAmount - Monto total a pagar
   * @param paymentTerm - Número de cuotas
   * @returns number - Monto de pago mensual
   * @throws Error si las entradas son inválidas
   */
  static calculateMonthlyPayment(totalAmount: number, paymentTerm: number): number {
    if (!this.isValidAmount(totalAmount)) {
      throw new Error('Total amount must be a positive number')
    }

    if (!this.isValidPaymentTerm(paymentTerm)) {
      throw new Error('Payment term must be a positive integer')
    }

    const monthlyPayment = totalAmount / paymentTerm
    return Math.round(monthlyPayment * 100) / 100
  }

  /**
   * Valida si un monto es válido (número positivo)
   * @param amount - Monto a validar
   * @returns boolean - True si es válido
   */
  private static isValidAmount(amount: number): boolean {
    return typeof amount === 'number' && !isNaN(amount) && isFinite(amount) && amount > 0
  }

  /**
   * Valida si el porcentaje de interés es válido (número no negativo)
   * @param percentage - Porcentaje a validar
   * @returns boolean - True si es válido
   */
  private static isValidInterestPercentage(percentage: number): boolean {
    return (
      typeof percentage === 'number' &&
      !isNaN(percentage) &&
      isFinite(percentage) &&
      percentage >= 0 &&
      percentage <= 100
    ) // Límite superior razonable
  }

  /**
   * Valida si el plazo de pago es válido (entero positivo)
   * @param term - Plazo de pago a validar
   * @returns boolean - True si es válido
   */
  private static isValidPaymentTerm(term: number): boolean {
    return (
      typeof term === 'number' &&
      !isNaN(term) &&
      isFinite(term) &&
      term > 0 &&
      Number.isInteger(term) &&
      term <= 360
    ) // Límite superior razonable (30 años)
  }

  /**
   * Formatea el monto a cadena de moneda con 2 decimales
   * @param amount - Monto a formatear
   * @returns string - Cadena de moneda formateada
   */
  static formatCurrency(amount: number): string {
    return amount.toFixed(2)
  }

  /**
   * Valida las entradas de cálculo para la creación de presupuesto
   * @param baseAmount - Monto base
   * @param interestPercentage - Porcentaje de interés
   * @param paymentTerm - Plazo de pago
   * @throws Error si alguna entrada es inválida
   */
  static validateCalculationInputs(
    baseAmount: number,
    interestPercentage: number,
    paymentTerm: number
  ): void {
    if (!this.isValidAmount(baseAmount)) {
      throw new Error('Invalid base amount: must be a positive number')
    }

    if (!this.isValidInterestPercentage(interestPercentage)) {
      throw new Error('Invalid interest percentage: must be between 0 and 100')
    }

    if (!this.isValidPaymentTerm(paymentTerm)) {
      throw new Error('Invalid payment term: must be a positive integer')
    }
  }
}
