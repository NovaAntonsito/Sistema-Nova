import React from 'react';
import './LoadingSpinner.css';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  message?: string;
  overlay?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  message,
  overlay = false,
  className = '',
}) => {
  const spinnerContent = (
    <div className={`loading-spinner loading-spinner--${size} ${className}`}>
      <div className={`loading-spinner__circle loading-spinner__circle--${color}`} />
      {message && <p className="loading-spinner__message">{message}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className="loading-spinner-overlay" role="status" aria-live="polite">
        {spinnerContent}
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite">
      {spinnerContent}
    </div>
  );
};