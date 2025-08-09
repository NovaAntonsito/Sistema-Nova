// Quota data types
export interface CreateQuotaDto {
  amount: number
  budgetId: string
}

export interface Quota {
  id: string
  _creationDate: Date
  amount: number
  budget?: {
    id: string
    code: string
    totalAmount: number
    currentStatus: string
  }
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Quota service methods (using budget service endpoints)
const addQuotaToBudget = async (budgetId: string, amount: number): Promise<ApiResponse<null>> => {
  return await window.electron.ipcRenderer.invoke('budget:addQuota', budgetId, amount)
}

// Get quotas by budget (through budget service)
const getQuotasByBudgetId = async (budgetId: string): Promise<ApiResponse<Quota[]>> => {
  const budgetResponse = await window.electron.ipcRenderer.invoke('budget:getById', budgetId)
  if (budgetResponse.success && budgetResponse.data?.quotaList) {
    return {
      success: true,
      data: budgetResponse.data.quotaList
    }
  }
  return {
    success: false,
    error: 'No se pudieron obtener las cuotas del presupuesto'
  }
}

// Helper function to create quota (uses addQuotaToBudget)
const createQuota = async (quotaData: CreateQuotaDto): Promise<ApiResponse<null>> => {
  return await addQuotaToBudget(quotaData.budgetId, quotaData.amount)
}

export {
  createQuota,
  addQuotaToBudget,
  getQuotasByBudgetId
}