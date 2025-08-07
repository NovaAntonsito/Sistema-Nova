import React from 'react'
import { Notification, NotificationProps } from './Notification'
import './Notification.css'

export interface NotificationData {
  id: string
  type: NotificationProps['type']
  message: string
  duration?: number
}

interface NotificationContainerProps {
  notifications: NotificationData[]
  onRemove: (id: string) => void
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemove
}) => {
  if (notifications.length === 0) return null

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          id={notification.id}
          type={notification.type}
          message={notification.message}
          duration={notification.duration}
          onClose={onRemove}
        />
      ))}
    </div>
  )
}
