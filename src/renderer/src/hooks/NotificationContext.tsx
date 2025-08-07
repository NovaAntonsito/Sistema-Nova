import React, { createContext, useContext, ReactNode } from 'react';
import { useNotification, UseNotificationReturn } from './useNotification';
import { NotificationContainer } from '../components/common/NotificationContainer';

const NotificationContext = createContext<UseNotificationReturn | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const notificationHook = useNotification();

  return (
    <NotificationContext.Provider value={notificationHook}>
      {children}
      <NotificationContainer
        notifications={notificationHook.notifications}
        onRemove={notificationHook.removeNotification}
      />
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = (): UseNotificationReturn => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};