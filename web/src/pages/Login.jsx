import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import TatumLogo from '../components/TatumLogo'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(username, password)
      if (user.role === 'driver') navigate('/driver')
      else if (user.is_admin)     navigate('/admin')
      else                        navigate('/engineer')
    } catch {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = [
    'w-full bg-[#1c1c1c] text-white text-sm rounded-md px-3.5 py-2.5',
    'border border-[#333] focus:outline-none focus:border-[#f60300]',
    'transition-colors placeholder-[#444]',
  ].join(' ')

  return (
    <div className="min-h-screen bg-[#1c1c1c] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <TatumLogo width={190} />
        </div>

        {/* Red separator */}
        <div className="h-[2px] bg-[#f60300] mb-8 rounded-full" />

        {/* Card */}
        <div className="bg-[#222] border border-[#333] rounded-md p-7">
          <p className="lbl mb-6">Telemetry system access</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="lbl">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={inputCls}
                placeholder="Enter username"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="lbl">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputCls}
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-md px-3.5 py-2.5 text-sm bg-[#1c0000] border border-[#f60300]/40 text-[#ff7070]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#f60300] hover:bg-[#d90200] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-md py-2.5 text-sm transition-colors mt-1"
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#3a3a3a] text-[10px] uppercase tracking-widest mt-6">
          Tatum RES Tech — Telemetry System
        </p>
      </div>
    </div>
  )
}
