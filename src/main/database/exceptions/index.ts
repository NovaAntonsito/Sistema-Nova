export abstract class BaseException extends Error {
  public readonly code: string
  public readonly details?: any

  constructor(message: string, code: string, details?: any) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.details = details
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/*
A este punto la mania del backend empieza, burrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr
https://open.spotify.com/intl-es/track/3XvS5tE6jSu8TYntFWxyzH?si=a974b4a9be464e1e
*/

export class UserNotFoundException extends BaseException {
  constructor(identifier: string, details?: any) {
    super(`User not found with identifier: ${identifier}`, 'USER_NOT_FOUND', details)
  }
}

export class UserAlreadyExistsException extends BaseException {
  constructor(email: string, details?: any) {
    super(`User already exists with email: ${email}`, 'USER_ALREADY_EXISTS', details)
  }
}

// Budget-related exceptions
export class BudgetNotFoundException extends BaseException {
  constructor(identifier: string, details?: any) {
    super(`Budget not found with identifier: ${identifier}`, 'BUDGET_NOT_FOUND', details)
  }
}

export class DuplicateCodeException extends BaseException {
  constructor(code: string, details?: any) {
    super(`Budget code already exists: ${code}`, 'DUPLICATE_BUDGET_CODE', details)
  }
}

export class BudgetImmutableException extends BaseException {
  constructor(field: string, details?: any) {
    super(
      `Budget field '${field}' cannot be modified after creation`,
      'BUDGET_IMMUTABLE_FIELD',
      details
    )
  }
}

export class InterestNotFoundException extends BaseException {
  constructor(paymentTerm: number, details?: any) {
    super(
      `Interest configuration not found for payment term: ${paymentTerm}`,
      'INTEREST_NOT_FOUND',
      details
    )
  }
}

export class InvalidInterestCalculationException extends BaseException {
  constructor(reason: string, details?: any) {
    super(`Invalid interest calculation: ${reason}`, 'INVALID_INTEREST_CALCULATION', details)
  }
}

export class QuotaNotFoundException extends BaseException {
  constructor(identifier: string, details?: any) {
    super(`Quota not found with identifier: ${identifier}`, 'QUOTA_NOT_FOUND', details)
  }
}

export class InvalidQuotaAmountException extends BaseException {
  constructor(amount: number, details?: any) {
    super(
      `Invalid quota amount: ${amount}. Amount must be positive`,
      'INVALID_QUOTA_AMOUNT',
      details
    )
  }
}

export class ValidationException extends BaseException {
  constructor(field: string, reason: string, details?: any) {
    super(`Validation failed for field '${field}': ${reason}`, 'VALIDATION_ERROR', details)
  }
}

export class DatabaseOperationException extends BaseException {
  constructor(operation: string, reason: string, details?: any) {
    super(
      `Database operation '${operation}' failed: ${reason}`,
      'DATABASE_OPERATION_ERROR',
      details
    )
  }
}
