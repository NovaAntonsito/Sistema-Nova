import { useNavigate, useLocation } from 'react-router-dom'
import { routeConfigs } from '../routes'

export const useNavigation = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const getCurrentRoute = () => {
    return routeConfigs.find(route => route.path === location.pathname)
  }

  const getCurrentTitle = () => {
    const currentRoute = getCurrentRoute()
    return currentRoute?.title || 'Sistema Nova'
  }

  const navigateToHome = () => navigate('/')
  const navigateToUsers = () => navigate('/users')
  const navigateToUserCreate = () => navigate('/users/create')
  const navigateToBudgets = () => navigate('/budgets')
  const navigateToBudgetCreate = () => navigate('/budgets/create')
  const navigateToBudgetView = () => navigate('/budgets/view')
  const navigateToExport = () => navigate('/export')
  const navigateToImport = () => navigate('/import')

  const goBack = () => navigate(-1)
  const goForward = () => navigate(1)

  return {
    navigate,
    location,
    getCurrentRoute,
    getCurrentTitle,
    navigateToHome,
    navigateToUsers,
    navigateToUserCreate,
    navigateToBudgets,
    navigateToBudgetCreate,
    navigateToBudgetView,
    navigateToExport,
    navigateToImport,
    goBack,
    goForward
  }
}