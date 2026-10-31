import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const RequireAuth = () => {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return <Outlet />
}

export const RequireAdmin = () => {
  const { isAdmin } = useAuth()
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />
}
