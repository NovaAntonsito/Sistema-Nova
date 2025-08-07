import { useState, useCallback } from 'react'
import { NOTIFICATION_TYPES, NOTIFICATION_DURATION } from '../utils/constants'
import { NotificationData } from '../components/common/NotificationContainer'

export interface NotificationOptions {
  duration?: number
  type?: keyof typeof NOTIFICATION_TYPES
}

export interface UseNotificationReturn {
  notifications: NotificationData[]
  showNotification: (message: string, options?: NotificationOptions) => string
  showSuccess: (message: string, duration?: number) => string
  showError: (message: string, duration?: number) => string
  showWarning: (message: string, duration?: number) => string
  showInfo: (message: string, duration?: number) => string
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useNotification = (): UseNotificationReturn => {
  const [notifications, setNotifications] = useState<NotificationData[]>([])

  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  const showNotification = useCallback(
    (message: string, options: NotificationOptions = {}) => {
      const id = generateId()
      const { duration = NOTIFICATION_DURATION.MEDIUM, type = NOTIFICATION_TYPES.INFO } = options

      const notification: NotificationData = {
        id,
        message,
        type,
        duration
      }

      setNotifications((prev) => [...prev, notification])

      return id
    },
    [generateId]
  )

  const showSuccess = useCallback(
    (message: string, duration = NOTIFICATION_DURATION.MEDIUM) => {
      return showNotification(message, {
        type: NOTIFICATION_TYPES.SUCCESS,
        duration
      })
    },
    [showNotification]
  )

  const showError = useCallback(
    (message: string, duration = NOTIFICATION_DURATION.LONG) => {
      return showNotification(message, {
        type: NOTIFICATION_TYPES.ERROR,
        duration
      })
    },
    [showNotification]
  )

  const showWarning = useCallback(
    (message: string, duration = NOTIFICATION_DURATION.MEDIUM) => {
      return showNotification(message, {
        type: NOTIFICATION_TYPES.WARNING,
        duration
      })
    },
    [showNotification]
  )

  const showInfo = useCallback(
    (message: string, duration = NOTIFICATION_DURATION.MEDIUM) => {
      return showNotification(message, {
        type: NOTIFICATION_TYPES.INFO,
        duration
      })
    },
    [showNotification]
  )

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    clearAll
  }
}
