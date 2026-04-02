import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../api'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://4.232.170.59:30001'

export default function EngineerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [drivers, setDrivers] = useState([])
  const [connected, setConnected] = useState(null)
  const [ws, setWs] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDrivers()
    const interval = setInterval(fetchDrivers, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchDrivers = async () => {
    try {
      const res = await API.get('/drivers')
      setDrivers(res.data.drivers)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const connect = (driver) => {
    if (ws) ws.close()
    const socket = new WebSocket(`${WS_URL}/ws/${driver.port}`)
    socket.onopen = () => {
      setConnected(driver)
      setWs(socket)
    }
    socket.onclose = () => {
      setConnected(null)
      setWs(null)
    }
  }

  const disconnect = () => {
    if (ws) ws.close()
    setConnected(null)
    setWs(null)
  }

  const handleLogout = () => {
    disconnect()
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <span className="font-bold text-sm">T</span>
          </div>
          <span className="font-semibold">Tatum Telemetry</span>
        </div>
        <div className="flex items-center gap-4">
          {user?.is_admin && (
            <button
              onClick={() => navigate('/admin')}
              className="text-gray-400 hover:text-white text-sm transition"
            >
              Admin
            </button>
          )}
          <span className="text-gray-400 text-sm">{user?.username}</span>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white text-sm transition"
          >
            Esci
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">

        <div className="mb-10">
          <h1 className="text-3xl font-bold">Pannello Engineer</h1>
          <p className="text-gray-400 mt-2">Seleziona un driver per ricevere le telemetrie</p>
        </div>

        {/* Connessione attiva */}
        {connected && (
          <div className="bg-green-900/30 border border-green-700 rounded-2xl p-6 mb-6 flex items-center justify-between">
            <div>
              <p className="text-green-400 text-sm mb-1">Connesso a</p>
              <p className="text-white font-bold text-xl">{connected.username}</p>
              <p className="text-gray-400 text-sm">Porta {connected.port} · {connected.division}</p>
            </div>
            <button
              onClick={disconnect}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl transition"
            >
              Disconnetti
            </button>
          </div>
        )}

        {/* Lista driver */}
        {loading ? (
          <div className="text-gray-400 text-center py-12">Caricamento...</div>
        ) : drivers.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
            <p className="text-gray-400">Nessun driver nelle tue divisioni</p>
          </div>
        ) : (
          <div className="space-y-3">
            {drivers.map(driver => (
              <div
                key={driver.id}
                className="bg-gray-900 rounded-2xl p-5 border border-gray-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${driver.online ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <div>
                    <p className="text-white font-semibold">{driver.username}</p>
                    <p className="text-gray-400 text-sm">
                      {driver.division} · {driver.team_category || '—'} · {driver.platform || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm font-mono">:{driver.port}</span>
                  {driver.online ? (
                    <button
                      onClick={() => connected?.id === driver.id ? disconnect() : connect(driver)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                        connected?.id === driver.id
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {connected?.id === driver.id ? 'Disconnetti' : 'Connetti'}
                    </button>
                  ) : (
                    <span className="text-gray-600 text-sm px-4 py-2">Offline</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}