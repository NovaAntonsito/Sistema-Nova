import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ErrorBoundary, NotFound, LoadingSpinner } from '../components/common'
import { RouteGuard } from '../components/routing'

// Lazy load components for better performance
const HomeView = React.lazy(() => import('../views/HomeView'))
const UsersView = React.lazy(() => import('../views/UsersView'))
const UserCreateView = React.lazy(() => import('../views/users/UserCreateView'))
const BudgetView = React.lazy(() => import('../views/BudgetView'))
const BudgetCreateView = React.lazy(() => import('../views/budgets/BudgetCreateView'))
const BudgetListView = React.lazy(() => import('../views/budgets/BudgetListView'))
const ExportView = React.lazy(() => import('../views/import-export/ExportView'))
const ImportView = React.lazy(() => import('../views/import-export/ImportView'))

// Route configuration
export interface RouteConfig {
  path: string
  element: React.ReactElement
  protected?: boolean
  title?: string
}

export const routeConfigs: RouteConfig[] = [
  {
    path: '/',
    element: <HomeView />,
    title: 'Inicio'
  },
  {
    path: '/users',
    element: <UsersView />,
    title: 'Usuarios'
  },
  {
    path: '/users/create',
    element: <UserCreateView />,
    title: 'Crear Usuario'
  },
  {
    path: '/budgets',
    element: <BudgetListView />,
    title: 'Presupuestos'
  },
  {
    path: '/budgets/view',
    element: <BudgetView />,
    title: 'Gestión de Presupuestos'
  },
  {
    path: '/budgets/create',
    element: <BudgetCreateView />,
    title: 'Crear Presupuesto'
  },
  {
    path: '/export',
    element: <ExportView />,
    title: 'Exportar Datos'
  },
  {
    path: '/import',
    element: <ImportView />,
    title: 'Importar Datos'
  }
]

const AppRoutes: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner size="large" message="Cargando página..." />}>
        <Routes>
          {routeConfigs.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                route.protected ? (
                  <RouteGuard>
                    {route.element}
                  </RouteGuard>
                ) : (
                  route.element
                )
              }
            />
          ))}
          {/* Catch-all route for 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default AppRoutes