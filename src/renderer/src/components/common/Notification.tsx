import React, { useEffect, useState } from 'react';
import { NOTIFICATION_TYPES } from '../../utils/constants';
import './Notification.css';

export interface NotificationProps {
  id: string;
  type: keyof typeof NOTIFICATION_TYPES;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export const Notification: React.FC<NotificationProps> = ({
  id,
  type,
  message,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose(id);
    }, 300); // Animation duration
  };

  const getIcon = () => {
    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS:
        return '✓';
      case NOTIFICATION_TYPES.ERROR:
        return '✕';
      case NOTIFICATION_TYPES.WARNING:
        return '⚠';
      case NOTIFICATION_TYPES.INFO:
        return 'ℹ';
      default:
        return 'ℹ';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`notification notification--${type} ${
        isExiting ? 'notification--exiting' : ''
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="notification__icon">{getIcon()}</div>
      <div className="notification__content">
        <p className="notification__message">{message}</p>
      </div>
      <button
        className="notification__close"
        onClick={handleClose}
        aria-label="Cerrar notificación"
        type="button"
      >
        ✕
      </button>
    </div>
  );
};