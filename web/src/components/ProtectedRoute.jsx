import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1c1c1c]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#f60300] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#555] text-xs uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />
  if (requireAdmin && !user.is_admin) return <Navigate to="/" />

  return children
}