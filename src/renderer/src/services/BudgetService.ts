// Status enum - duplicated here to avoid import issues
export enum Status {
  EXPIRED = 'EXPIRED',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED'
}

// Budget data types
export interface CreateBudgetDto {
  _expirationDate: Date
  baseAmount: number
  paymentTerm: number
  userId: string
  code?: string
}

export interface UpdateBudgetDto {
  quotaToAdd?: {
    amount: number
  }
}

export interface Budget {
  id: string
  _creationDate: Date
  _expirationDate: Date
  currentStatus: Status
  totalAmount: number
  currentInterest: number
  paymentTerm: number
  code: string
  quotaList?: Quota[]
  user?: BudgetUser
  updatedAt: Date
}

export interface Quota {
  id: string
  _creationDate: Date
  amount: number
}

export interface BudgetUser {
  id: string
  nombre: string
  email: string
  phoneNumber: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Budget service methods
const createBudget = async (budgetData: CreateBudgetDto): Promise<ApiResponse<Budget>> => {
  return await window.electron.ipcRenderer.invoke('budget:create', budgetData)
}

const getAllBudgets = async (): Promise<ApiResponse<Budget[]>> => {
  return await window.electron.ipcRenderer.invoke('budget:getAll')
}

const getBudgetById = async (id: string): Promise<ApiResponse<Budget>> => {
  return await window.electron.ipcRenderer.invoke('budget:getById', id)
}

const searchByCode = async (code: string): Promise<ApiResponse<Budget>> => {
  return await window.electron.ipcRenderer.invoke('budget:searchByCode', code)
}

const getBudgetsByUserId = async (userId: string): Promise<ApiResponse<Budget[]>> => {
  return await window.electron.ipcRenderer.invoke('budget:getByUserId', userId)
}

const getBudgetsByStatus = async (status: Status): Promise<ApiResponse<Budget[]>> => {
  return await window.electron.ipcRenderer.invoke('budget:getByStatus', status)
}

const updateBudget = async (id: string, budgetData: UpdateBudgetDto): Promise<ApiResponse<Budget>> => {
  return await window.electron.ipcRenderer.invoke('budget:update', id, budgetData)
}

const addQuotaToBudget = async (budgetId: string, amount: number): Promise<ApiResponse<null>> => {
  return await window.electron.ipcRenderer.invoke('budget:addQuota', budgetId, amount)
}

const deleteBudget = async (id: string): Promise<ApiResponse<null>> => {
  return await window.electron.ipcRenderer.invoke('budget:delete', id)
}

const isCodeAvailable = async (code: string): Promise<ApiResponse<{ isAvailable: boolean }>> => {
  return await window.electron.ipcRenderer.invoke('budget:isCodeAvailable', code)
}

const generateNextCode = async (): Promise<ApiResponse<{ nextCode: string }>> => {
  return await window.electron.ipcRenderer.invoke('budget:generateNextCode')
}

const calculateTotalAmount = async (baseAmount: number, interestPercentage: number): Promise<ApiResponse<{ totalAmount: number }>> => {
  return await window.electron.ipcRenderer.invoke('budget:calculateTotalAmount', baseAmount, interestPercentage)
}

const calculateMonthlyPayment = async (totalAmount: number, paymentTerm: number): Promise<ApiResponse<{ monthlyPayment: number }>> => {
  return await window.electron.ipcRenderer.invoke('budget:calculateMonthlyPayment', totalAmount, paymentTerm)
}

export { 
  createBudget,
  getAllBudgets, 
  getBudgetById,
  searchByCode,
  getBudgetsByUserId,
  getBudgetsByStatus,
  updateBudget,
  addQuotaToBudget,
  deleteBudget,
  isCodeAvailable,
  generateNextCode,
  calculateTotalAmount,
  calculateMonthlyPayment
}