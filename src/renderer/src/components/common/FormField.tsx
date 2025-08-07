import React, { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'
import './FormField.css'

interface BaseFormFieldProps {
  label: string
  error?: string | null
  touched?: boolean
  required?: boolean
  helpText?: string
  className?: string
}

interface InputFieldProps
  extends BaseFormFieldProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  type?: 'text' | 'email' | 'tel' | 'number' | 'password'
  component?: 'input'
}

interface TextareaFieldProps
  extends BaseFormFieldProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  component: 'textarea'
  rows?: number
}

interface SelectFieldProps
  extends BaseFormFieldProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  component: 'select'
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
}

export type FormFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps

export const FormField: React.FC<FormFieldProps> = (props) => {
  const {
    label,
    error,
    touched = false,
    required = false,
    helpText,
    className = '',
    ...fieldProps
  } = props

  const hasError = touched && error
  const fieldId = fieldProps.id || `field-${Math.random().toString(36).substr(2, 9)}`

  const fieldClasses = ['form-field__input', hasError ? 'form-field__input--error' : '', className]
    .filter(Boolean)
    .join(' ')

  const renderField = () => {
    if (props.component === 'textarea') {
      const { component, options, placeholder, ...textareaProps } = props as TextareaFieldProps
      return (
        <textarea
          {...textareaProps}
          id={fieldId}
          className={fieldClasses}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined
          }
        />
      )
    }

    if (props.component === 'select') {
      const { component, options, placeholder, ...selectProps } = props as SelectFieldProps
      return (
        <select
          {...selectProps}
          id={fieldId}
          className={fieldClasses}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined
          }
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    // Default to input
    const { component, options, placeholder, ...inputProps } = props as InputFieldProps
    return (
      <input
        {...inputProps}
        id={fieldId}
        className={fieldClasses}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined}
      />
    )
  }

  return (
    <div className="form-field">
      <label htmlFor={fieldId} className="form-field__label">
        {label}
        {required && (
          <span className="form-field__required" aria-label="obligatorio">
            *
          </span>
        )}
      </label>

      {renderField()}

      {hasError && (
        <div id={`${fieldId}-error`} className="form-field__error" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      {helpText && !hasError && (
        <div id={`${fieldId}-help`} className="form-field__help">
          {helpText}
        </div>
      )}
    </div>
  )
}
