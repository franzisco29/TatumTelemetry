import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../api'
import TatumLogo from '../components/TatumLogo'
import PasswordInput from '../components/PasswordInput'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetForm, setResetForm] = useState({ username: '', old_password: '', new_password: '' })
  const [resetMsg, setResetMsg]   = useState('')
  const [resetErr, setResetErr]   = useState('')
  const { login, user, loading: authLoading } = useAuth()
  const navigate   = useNavigate()

  // If the user is already authenticated, redirect to home immediately
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      // replace: true prevents the login page from staying in the history stack
      navigate('/', { replace: true })
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Your account has been disabled. Contact an admin.')
      } else {
        setError('Invalid credentials')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setResetErr('')
    try {
      await API.post('/auth/reset-password', resetForm)
      setResetMsg('Password updated! You can now log in.')
      setTimeout(() => { setShowReset(false); setResetMsg('') }, 2000)
    } catch (err) {
      setResetErr(err.response?.data?.detail || 'Error')
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
        <div className="flex justify-center">
          <TatumLogo width={170} />
        </div>

        {/* Red separator */}
        <div className="h-[2px] bg-[#f60300] mb-6 rounded-full" />

        {/* Card */}
        <div className="bg-[#222] border border-[#333] rounded-md p-7">
          <p className="lbl text-center mb-4">Telemetry system access</p>

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
              <PasswordInput
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

            <button
              type="button"
              onClick={() => setShowReset(true)}
              className="w-full text-center text-[#555] hover:text-[#888] text-xs mt-3 transition-colors"
            >
              Change password
            </button>
          </form>
        </div>

        {showReset && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4">
            <div className="bg-[#222] border border-[#333] rounded-md w-full max-w-sm p-7">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-6">
                <span />
                <h2 className="font-bold text-base text-center">Change password</h2>
                <button onClick={() => setShowReset(false)} className="justify-self-end text-[#555] hover:text-white text-lg leading-none">✕</button>
              </div>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="lbl">Username</label>
                  <input value={resetForm.username} onChange={e => setResetForm({...resetForm, username: e.target.value})} className={inputCls} required placeholder="Username" />
                </div>
                <div>
                  <label className="lbl">Current password</label>
                  <PasswordInput value={resetForm.old_password} onChange={e => setResetForm({...resetForm, old_password: e.target.value})} className={inputCls} required placeholder="Current password" />
                </div>
                <div>
                  <label className="lbl">New password</label>
                  <PasswordInput value={resetForm.new_password} onChange={e => setResetForm({...resetForm, new_password: e.target.value})} className={inputCls} required placeholder="New password" />
                </div>
                {resetErr && <div className="rounded-md px-3.5 py-2.5 text-sm bg-[#1c0000] border border-[#f60300]/40 text-[#ff7070]">{resetErr}</div>}
                {resetMsg && <div className="rounded-md px-3.5 py-2.5 text-sm bg-[#001800] border border-[#00c000]/30 text-[#00c000]">{resetMsg}</div>}
                <button type="submit" className="w-full bg-[#f60300] hover:bg-[#d90200] text-white font-semibold rounded-md py-2.5 text-sm transition-colors">
                  Update password
                </button>
              </form>
            </div>
          </div>
        )}

        <p className="text-center text-[#3a3a3a] text-[10px] uppercase tracking-widest mt-6">
          Tatum RES Tech — Telemetry System
        </p>
      </div>
    </div>
  )
}
