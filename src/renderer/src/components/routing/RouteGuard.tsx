import React, { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

interface RouteGuardProps {
  children: ReactNode
  condition?: boolean
  redirectTo?: string
  fallback?: ReactNode
}

const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  condition = true,
  redirectTo = '/',
  fallback
}) => {
  if (!condition) {
    if (fallback) {
      return <>{fallback}</>
    }
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

export default RouteGuard