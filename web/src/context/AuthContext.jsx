import { createContext, useContext, useState, useEffect } from 'react'
import API from '../api'

const AuthContext = createContext(null)

const OFFLINE_USER = {
  username: 'offline',
  role: 'engineer',
  is_admin: true,
  offline: true,
}

const OFFLINE_CREDENTIALS = { username: 'offline', password: 'offline' }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connectedDriver, setConnectedDriver] = useState(null)

  useEffect(() => {
    if (localStorage.getItem('offline_mode') === 'true') {
      setUser(OFFLINE_USER)
      setLoading(false)
      return
    }
    const token = localStorage.getItem('token')
    if (token) {
      API.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username, password) => {
    if (
      username === OFFLINE_CREDENTIALS.username &&
      password === OFFLINE_CREDENTIALS.password
    ) {
      localStorage.setItem('offline_mode', 'true')
      setUser(OFFLINE_USER)
      return OFFLINE_USER
    }
    const res = await API.post('/auth/login', { username, password })
    localStorage.setItem('token', res.data.token)
    setUser(res.data)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('offline_mode')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, connectedDriver, setConnectedDriver }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)