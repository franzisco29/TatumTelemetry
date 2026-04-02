import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(username, password)
      if (user.role === 'driver') navigate('/driver')
      else if (user.is_admin) navigate('/admin')
      else navigate('/engineer')
    } catch (err) {
      setError('Username o password non corretti')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo / Titolo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <h1 className="text-white text-3xl font-bold">Tatum Telemetry</h1>
          <p className="text-gray-400 mt-2">Accedi al tuo account</p>
        </div>

        {/* Form */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-gray-400 text-sm mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:border-red-500 transition"
                placeholder="Inserisci username"
                required
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:border-red-500 transition"
                placeholder="Inserisci password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition"
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>

          </form>
        </div>

      </div>
    </div>
  )
}