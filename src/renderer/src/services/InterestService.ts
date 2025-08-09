// Interest data types
export interface CreateInterestDto {
  paymentTerm: number
  interest: number
}

export interface UpdateInterestDto {
  paymentTerm?: number
  interest?: number
}

export interface Interest {
  id: string
  paymentTerm: number
  interest: number
  createdAt: Date
  updatedAt: Date
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Interest service methods
const createInterest = async (interestData: CreateInterestDto): Promise<ApiResponse<Interest>> => {
  return await window.electron.ipcRenderer.invoke('interest:create', interestData)
}

const getAllInterests = async (): Promise<ApiResponse<Interest[]>> => {
  return await window.electron.ipcRenderer.invoke('interest:getAll')
}

const getInterestById = async (id: string): Promise<ApiResponse<Interest>> => {
  return await window.electron.ipcRenderer.invoke('interest:getById', id)
}

const getInterestByPaymentTerm = async (paymentTerm: number): Promise<ApiResponse<Interest>> => {
  return await window.electron.ipcRenderer.invoke('interest:getByPaymentTerm', paymentTerm)
}

const getInterestRateByPaymentTerm = async (paymentTerm: number): Promise<ApiResponse<{ interestRate: number }>> => {
  return await window.electron.ipcRenderer.invoke('interest:getInterestRateByPaymentTerm', paymentTerm)
}

const updateInterest = async (id: string, interestData: UpdateInterestDto): Promise<ApiResponse<Interest>> => {
  return await window.electron.ipcRenderer.invoke('interest:update', id, interestData)
}

const updateInterestRateByPaymentTerm = async (paymentTerm: number, interestRate: number): Promise<ApiResponse<Interest>> => {
  return await window.electron.ipcRenderer.invoke('interest:updateRateByPaymentTerm', paymentTerm, interestRate)
}

const deleteInterest = async (id: string): Promise<ApiResponse<null>> => {
  return await window.electron.ipcRenderer.invoke('interest:delete', id)
}

const deleteByPaymentTerm = async (paymentTerm: number): Promise<ApiResponse<null>> => {
  return await window.electron.ipcRenderer.invoke('interest:deleteByPaymentTerm', paymentTerm)
}

const getAvailablePaymentTerms = async (): Promise<ApiResponse<number[]>> => {
  return await window.electron.ipcRenderer.invoke('interest:getAvailablePaymentTerms')
}

const getInterestsByPaymentTermRange = async (minTerm: number, maxTerm: number): Promise<ApiResponse<Interest[]>> => {
  return await window.electron.ipcRenderer.invoke('interest:getByPaymentTermRange', minTerm, maxTerm)
}

const paymentTermExists = async (paymentTerm: number): Promise<ApiResponse<{ exists: boolean }>> => {
  return await window.electron.ipcRenderer.invoke('interest:paymentTermExists', paymentTerm)
}

const createDefaultInterestConfigurations = async (): Promise<ApiResponse<Interest[]>> => {
  return await window.electron.ipcRenderer.invoke('interest:createDefaults')
}

export {
  createInterest,
  getAllInterests,
  getInterestById,
  getInterestByPaymentTerm,
  getInterestRateByPaymentTerm,
  updateInterest,
  updateInterestRateByPaymentTerm,
  deleteInterest,
  deleteByPaymentTerm,
  getAvailablePaymentTerms,
  getInterestsByPaymentTermRange,
  paymentTermExists,
  createDefaultInterestConfigurations
}