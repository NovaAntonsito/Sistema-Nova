import { Budget, BudgetFormData, ApiResponse, Status } from '../types'

/**
 * BudgetService - Frontend service for budget-related IPC communication
 * Handles all budget operations between frontend and backend
 */
class BudgetService {
  /**
   * Create a new budget
   */
  async createBudget(budgetData: BudgetFormData): Promise<ApiResponse<Budget>> {
    try {
      // Map frontend form data to backend DTO format
      const createBudgetDto = {
        _expirationDate: new Date(Date.now() + budgetData.paymentTerm * 30 * 24 * 60 * 60 * 1000), // Approximate expiration
        baseAmount: budgetData.baseAmount,
        paymentTerm: budgetData.paymentTerm,
        userId: budgetData.userId,
        code: budgetData.code
      }

      const response = await window.electron.ipcRenderer.invoke('budget:create', createBudgetDto)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error creating budget'
      }
    }
  }

  /**
   * Get all budgets
   */
  async getAllBudgets(): Promise<ApiResponse<Budget[]>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('budget:getAll')
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error fetching budgets'
      }
    }
  }

  /**
   * Get budget by ID
   */
  async getBudgetById(id: string): Promise<ApiResponse<Budget>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('budget:getById', id)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error fetching budget'
      }
    }
  }

  /**
   * Search budget by code
   */
  async searchByCode(code: string): Promise<ApiResponse<Budget>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('budget:searchByCode', code)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error searching budget by code'
      }
    }
  }

  /**
   * Get budgets by user ID
   */
  async getBudgetsByUserId(userId: string): Promise<ApiResponse<Budget[]>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('budget:getByUserId', userId)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error fetching budgets by user'
      }
    }
  }

  /**
   * Get budgets by status
   */
  async getBudgetsByStatus(status: Status): Promise<ApiResponse<Budget[]>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('budget:getByStatus', status)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error fetching budgets by status'
      }
    }
  }

  /**
   * Update budget
   */
  async updateBudget(
    id: string,
    budgetData: Partial<BudgetFormData>
  ): Promise<ApiResponse<Budget>> {
    try {
      // Map frontend form data to backend DTO format
      const updateBudgetDto: any = {}
      if (budgetData.code !== undefined) updateBudgetDto.code = budgetData.code
      if (budgetData.baseAmount !== undefined) updateBudgetDto.baseAmount = budgetData.baseAmount
      if (budgetData.interestPercentage !== undefined)
        updateBudgetDto.interestPercentage = budgetData.interestPercentage
      if (budgetData.paymentTerm !== undefined) {
        updateBudgetDto.paymentTerm = budgetData.paymentTerm
        updateBudgetDto._expirationDate = new Date(
          Date.now() + budgetData.paymentTerm * 30 * 24 * 60 * 60 * 1000
        )
      }
      if (budgetData.userId !== undefined) updateBudgetDto.userId = budgetData.userId
      if (budgetData.description !== undefined) updateBudgetDto.description = budgetData.description

      const response = await window.electron.ipcRenderer.invoke(
        'budget:update',
        id,
        updateBudgetDto
      )
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error updating budget'
      }
    }
  }

  /**
   * Add quota to budget
   */
  async addQuotaToBudget(budgetId: string, amount: number): Promise<ApiResponse<void>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('budget:addQuota', budgetId, amount)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error adding quota to budget'
      }
    }
  }

  /**
   * Delete budget (logical deletion)
   */
  async deleteBudget(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('budget:delete', id)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error deleting budget'
      }
    }
  }

  /**
   * Update expired budgets
   */
  async updateExpiredBudgets(): Promise<ApiResponse<{ updatedCount: number }>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('budget:updateExpired')
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error updating expired budgets'
      }
    }
  }

  /**
   * Perform status maintenance
   */
  async performStatusMaintenance(): Promise<ApiResponse<{ expired: number; finished: number }>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('budget:performStatusMaintenance')
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error performing status maintenance'
      }
    }
  }

  /**
   * Get status summary
   */
  async getStatusSummary(): Promise<ApiResponse<any>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('budget:getStatusSummary')
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error getting status summary'
      }
    }
  }

  /**
   * Check if code is available
   */
  async isCodeAvailable(code: string): Promise<ApiResponse<{ isAvailable: boolean }>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('budget:isCodeAvailable', code)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error checking code availability'
      }
    }
  }

  /**
   * Generate next available code
   */
  async generateNextCode(): Promise<ApiResponse<{ nextCode: string }>> {
    try {
      const response = await window.electron.ipcRenderer.invoke('budget:generateNextCode')
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error generating next code'
      }
    }
  }

  // Budget calculation helpers

  /**
   * Calculate total amount with interest
   */
  calculateTotalAmount(baseAmount: number, interestPercentage: number): number {
    return baseAmount + (baseAmount * interestPercentage) / 100
  }

  /**
   * Calculate monthly payment
   */
  calculateMonthlyPayment(totalAmount: number, paymentTerm: number): number {
    return totalAmount / paymentTerm
  }

  /**
   * Calculate total amount using backend service
   */
  async calculateTotalAmountBackend(
    baseAmount: number,
    interestPercentage: number
  ): Promise<ApiResponse<{ totalAmount: number }>> {
    try {
      const response = await window.electron.ipcRenderer.invoke(
        'budget:calculateTotalAmount',
        baseAmount,
        interestPercentage
      )
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error calculating total amount'
      }
    }
  }

  /**
   * Calculate monthly payment using backend service
   */
  async calculateMonthlyPaymentBackend(
    totalAmount: number,
    paymentTerm: number
  ): Promise<ApiResponse<{ monthlyPayment: number }>> {
    try {
      const response = await window.electron.ipcRenderer.invoke(
        'budget:calculateMonthlyPayment',
        totalAmount,
        paymentTerm
      )
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error calculating monthly payment'
      }
    }
  }
}

// Export singleton instance
export const budgetService = new BudgetService()
export default budgetService
