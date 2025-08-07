import React, { ButtonHTMLAttributes } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import './LoadingButton.css'

export interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  loadingText?: string
  children: React.ReactNode
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loadingText,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const isDisabled = disabled || loading

  const buttonClasses = [
    'loading-button',
    `loading-button--${variant}`,
    `loading-button--${size}`,
    fullWidth ? 'loading-button--full-width' : '',
    loading ? 'loading-button--loading' : '',
    isDisabled ? 'loading-button--disabled' : '',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      {...props}
      className={buttonClasses}
      disabled={isDisabled}
      type={props.type || 'button'}
    >
      <span className="loading-button__content">
        {loading && (
          <LoadingSpinner
            size={size === 'large' ? 'medium' : 'small'}
            color="white"
            className="loading-button__spinner"
          />
        )}
        <span className={`loading-button__text ${loading ? 'loading-button__text--hidden' : ''}`}>
          {loading && loadingText ? loadingText : children}
        </span>
      </span>
    </button>
  )
}
