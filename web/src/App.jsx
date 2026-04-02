import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import DriverDashboard from './pages/DriverDashboard'
import EngineerDashboard from './pages/EngineerDashboard'
import AdminDashboard from './pages/AdminDashboard'

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (user.role === 'driver') return <Navigate to="/driver" />
  if (user.is_admin) return <Navigate to="/admin" />
  return <Navigate to="/engineer" />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RootRedirect />} />
          <Route path="/driver" element={
            <ProtectedRoute><DriverDashboard /></ProtectedRoute>
          } />
          <Route path="/engineer" element={
            <ProtectedRoute><EngineerDashboard /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}