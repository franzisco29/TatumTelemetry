import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import DriverDashboard from './pages/DriverDashboard'
import EngineerDashboard from './pages/EngineerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import DivisionDetail from './pages/DivisionDetail'
import Home from './pages/Home'
import ProfilePage from './pages/ProfilePage'
import DownloadPage from './pages/DownloadPage'
import LiveTelemetryDashboard from './pages/LiveTelemetryDashboard'
import ComparisonDashboard from './pages/ComparisonDashboard'

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  return <Navigate to="/home" />
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
          <Route path="/admin/divisions/:id" element={
            <ProtectedRoute requireAdmin><DivisionDetail /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/home" element={
            <ProtectedRoute><Home /></ProtectedRoute>
          } />
          <Route path="/live" element={
            <ProtectedRoute requireAdmin><LiveTelemetryDashboard /></ProtectedRoute>
          } />
          <Route path="/compare" element={
            <ProtectedRoute requireAdmin><ComparisonDashboard /></ProtectedRoute>
          } />
          <Route path="/download" element={
            <ProtectedRoute><DownloadPage /></ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}