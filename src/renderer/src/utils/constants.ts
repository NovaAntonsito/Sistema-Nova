// Application constants

export const APP_NAME = 'Sistema Nova - Test Environment'

export const ROUTES = {
  HOME: '/',
  USERS: '/users',
  BUDGETS: '/budgets',
  IMPORT_EXPORT: '/import-export'
} as const

export const IPC_CHANNELS = {
  // User channels
  USER_CREATE: 'user:create',
  USER_GET_ALL: 'user:getAll',
  USER_GET_BY_ID: 'user:getById',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // Budget channels
  BUDGET_CREATE: 'budget:create',
  BUDGET_GET_ALL: 'budget:getAll',
  BUDGET_GET_BY_ID: 'budget:getById',
  BUDGET_UPDATE: 'budget:update',
  BUDGET_DELETE: 'budget:delete',

  // Export channels
  EXPORT_USERS: 'export:users',
  EXPORT_BUDGETS: 'export:budgets',
  EXPORT_QUOTAS: 'export:quotas',
  EXPORT_INTERESTS: 'export:interests',
  EXPORT_COMPLETE: 'export:complete',

  // Import channels
  IMPORT_USERS: 'import:users',
  IMPORT_BUDGETS: 'import:budgets',
  IMPORT_QUOTAS: 'import:quotas',
  IMPORT_INTERESTS: 'import:interests',
  IMPORT_COMPLETE: 'import:complete'
} as const

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const

export const NOTIFICATION_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000
} as const

export const FORM_VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[\+]?[1-9][\d]{0,15}$/,
  MIN_PASSWORD_LENGTH: 8,
  MAX_TEXT_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000
} as const

export const FILE_TYPES = {
  CSV: '.csv',
  ZIP: '.zip'
} as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
} as const
