import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-white text-xl">Caricamento...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />
  if (requireAdmin && !user.is_admin) return <Navigate to="/" />

  return children
}