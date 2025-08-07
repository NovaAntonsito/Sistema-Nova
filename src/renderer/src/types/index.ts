// Core data types based on backend models

export interface User {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string
  direccion?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface Budget {
  id: string
  code: string
  baseAmount: number
  interestPercentage: number
  totalAmount: number
  paymentTerm: number
  monthlyPayment: number
  status: Status
  userId: string
  user?: User
  description?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED'
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Form data types
export interface UserFormData {
  nombre: string
  apellido: string
  email: string
  telefono?: string
  direccion?: string
}

export interface BudgetFormData {
  code: string
  baseAmount: number
  interestPercentage: number
  paymentTerm: number
  userId: string
  description?: string
}

// Component prop types
export interface HomeButtonProps {
  title: string
  description: string
  icon: string
  onClick: () => void
}

export interface ToolbarProps {
  onCreateUser: () => void
  onCreateBudget: () => void
  onExport: () => void
  onImport: () => void
}

export interface NavigationItem {
  path: string
  label: string
  icon?: string
}

// Form component props
export interface UserFormProps {
  onSubmit: (data: UserFormData) => void
  onCancel: () => void
  initialData?: UserFormData
}

export interface BudgetFormProps {
  onSubmit: (data: BudgetFormData) => void
  onCancel: () => void
  users: User[]
  initialData?: BudgetFormData
}

// List component props
export interface UserListProps {
  users: User[]
  onUserSelect: (user: User) => void
  onUserEdit: (user: User) => void
  onUserDelete: (userId: string) => void
}

export interface BudgetListProps {
  budgets: Budget[]
  onBudgetSelect: (budget: Budget) => void
  onBudgetEdit: (budget: Budget) => void
  onBudgetDelete: (budgetId: string) => void
}

// Import/Export types
export interface ExportOptions {
  users: boolean
  budgets: boolean
  quotas: boolean
  interests: boolean
  complete: boolean
}

export interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  onExport: (options: ExportOptions) => void
}

export interface ImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (file: File, type: 'users' | 'budgets' | 'quotas' | 'interests' | 'complete') => void
}

// Notification types
export interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
  onClose: () => void
}

export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

// Hook types
export interface UseNotificationReturn {
  notifications: NotificationProps[]
  addNotification: (notification: Omit<NotificationProps, 'onClose'>) => void
  removeNotification: (id: string) => void
}
