import React from 'react'
import { Notification as NotificationType } from '../../hooks/useNotification'
import './Notification.css'

interface NotificationProps {
  notification: NotificationType
  onClose: (id: string) => void
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'warning':
        return '⚠'
      case 'info':
        return 'ℹ'
      default:
        return 'ℹ'
    }
  }

  return (
    <div className={`notification notification--${notification.type}`}>
      <div className="notification__icon">{getIcon()}</div>
      <div className="notification__content">
        <p className="notification__message">{notification.message}</p>
      </div>
      <button
        className="notification__close"
        onClick={() => onClose(notification.id)}
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  )
}

export default Notification
