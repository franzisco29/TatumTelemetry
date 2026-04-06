import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import API from '../api'
import { VERSION } from '../version'
import Navbar from '../components/Navbar'

export default function DriverDashboard() {
  const { user } = useAuth()
  const navigate         = useNavigate()

  const [status, setStatus] = useState({ online: false, engineers_connected: 0 })

  useEffect(() => {
    fetchStatus()
    const iv = setInterval(fetchStatus, 5000)
    return () => clearInterval(iv)
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await API.get('/driver/status')
      setStatus(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white">

      <Navbar
        extra={
          user?.is_admin && (
            <button
              onClick={() => navigate('/admin')}
              className="text-[11px] uppercase tracking-wider text-[#666] hover:text-white transition-colors"
            >Admin</button>
          )
        }
      />

      {/* Content */}
      <div className="max-w-xl mx-auto px-6 py-10">

        {/* Welcome */}
        <div className="mb-8">
          <p className="lbl mb-1">Driver Panel</p>
          <h1 className="text-xl font-bold">Welcome, {user?.username}</h1>
        </div>

        {/* Port card â€” hero element */}
        <div
          className="rounded-md p-7 mb-5 text-center"
          style={{ background: '#222', border: '1px solid #333', borderTop: '3px solid #f60300' }}
        >
          <p className="lbl mb-4">Your telemetry port</p>
          <div className="text-6xl font-bold font-mono text-[#f60300] tracking-wider my-4">
            {user?.port || '—'}
          </div>
          <p className="text-[#555] text-xs leading-relaxed">
            Enter this number in<br />
            <span className="text-[#888]">F1 25 → Settings → Telemetry → Port</span>
          </p>
          <div
            className="mt-5 rounded-md px-4 py-3 text-left"
            style={{ background: '#1c1c1c', border: '1px solid #2a2a2a' }}
          >
            <p className="lbl mb-1">IP Server</p>
            <p className="font-mono text-sm text-white">4.232.170.59</p>
          </div>
        </div>

        {/* Status online */}
        <div
          className="rounded-md px-5 py-4 mb-5 flex items-center justify-between"
          style={{
            background: status.online ? '#0d1f0d' : '#1c1c1c',
            border: '1px solid ' + (status.online ? 'rgba(0,192,0,0.25)' : '#2a2a2a')
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className={'w-2.5 h-2.5 rounded-full shrink-0' + (status.online ? ' dot-online' : '')}
              style={{ background: status.online ? '#00c000' : '#333' }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: status.online ? '#00c000' : '#555' }}>
                {status.online ? 'Transmitting' : 'Not transmitting'}
              </p>
              <p className="text-xs text-[#555] mt-0.5">
                {status.online ? `${status.engineers_connected} engineer${status.engineers_connected !== 1 ? 's' : ''} connected` : 'No active session'}
              </p>
            </div>
          </div>
          {status.online && (
            <span className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider"
              style={{ background: '#001800', color: '#00c000', border: '1px solid rgba(0,192,0,0.25)' }}>
              Live
            </span>
          )}
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-[#222] border border-[#333] rounded-md p-4">
            <p className="lbl mb-1.5">Team</p>
            <p className="font-medium text-sm">{user?.team_category || 'â€”'}</p>
          </div>
          <div className="bg-[#222] border border-[#333] rounded-md p-4">
            <p className="lbl mb-1.5">Platform</p>
            <p className="font-medium text-sm">{user?.platform || 'â€”'}</p>
          </div>
        </div>

        {/* Divisions */}
        {user?.divisions?.length > 0 && (
          <div className="bg-[#222] border border-[#333] rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2a2a2a]">
              <p className="lbl" style={{ marginBottom: 0 }}>Your divisions</p>
            </div>
            {user.divisions.map((div, i) => (
              <div
                key={div.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-[#282828] transition-colors"
                style={{ borderBottom: i < user.divisions.length - 1 ? '1px solid #2a2a2a' : 'none' }}
              >
                <span className="text-sm font-medium">{div.name}</span>
                <span className="text-xs text-[#555]">{div.simulator}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[#2e2e2e] text-[10px] uppercase tracking-widest mt-10">
          Tatum RES Tech — Telemetry System v{VERSION}
        </p>
      </div>
    </div>
  )
}
