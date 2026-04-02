import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function DriverDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
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
          <span className="text-gray-400 text-sm">{user?.username}</span>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white text-sm transition"
          >
            Esci
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Benvenuto */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold">Ciao, {user?.username}! 👋</h1>
          <p className="text-gray-400 mt-2">Pannello Driver</p>
        </div>

        {/* Porta assegnata */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 mb-6 text-center">
          <p className="text-gray-400 text-sm mb-2">La tua porta telemetria</p>
          <div className="text-6xl font-bold text-red-500 my-4">
            {user?.port || '—'}
          </div>
          <p className="text-gray-500 text-sm">
            Inserisci questo numero in F1 25 → Settings → Telemetry → Port
          </p>
          <div className="mt-4 bg-gray-800 rounded-xl px-4 py-3 text-left">
            <p className="text-gray-400 text-xs mb-1">IP Server</p>
            <p className="text-white font-mono">4.232.170.59</p>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Team</p>
            <p className="text-white font-semibold">{user?.team_category || '—'}</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Piattaforma</p>
            <p className="text-white font-semibold">{user?.platform || '—'}</p>
          </div>
        </div>

        {/* Divisioni */}
        {user?.divisions?.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mt-4">
            <p className="text-gray-400 text-sm mb-3">Le tue divisioni</p>
            <div className="space-y-2">
              {user.divisions.map(div => (
                <div key={div.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                  <span className="text-white">{div.name}</span>
                  <span className="text-gray-400 text-sm">{div.simulator}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}