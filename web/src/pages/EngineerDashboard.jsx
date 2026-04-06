import { useState, useEffect, useRef } from 'react'
import { VERSION } from '../version'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../api'
import ProfileModal from '../components/ProfileModal'
import TatumLogo from '../components/TatumLogo'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://4.232.170.59:30001'

const inputCls   = 'bg-[#1c1c1c] text-white text-sm rounded-md px-3.5 py-2.5 border border-[#2e2e2e] focus:outline-none focus:border-[#f60300] transition-colors sel'
const btnPri     = 'px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider bg-[#f60300] text-white hover:bg-[#d90200] transition-colors'
const btnSec     = 'px-4 py-2 rounded-md text-xs border border-[#2e2e2e] bg-[#252525] text-[#888] hover:bg-[#2e2e2e] hover:text-white transition-colors'
const btnOutline = 'px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider border border-[#f60300] text-[#f60300] hover:bg-[#f60300] hover:text-white transition-colors'

function DriverCard({ driver, connected, connecting, onConnect, onDisconnect }) {
  const isActive   = connected?.id === driver.id
  const isOnline   = driver.online
  const isConnecting = connecting && !isActive
  const accent     = isActive ? '#f60300' : isOnline ? '#00c000' : '#2e2e2e'

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{
        background: isActive ? '#1f0000' : '#212121',
        border:     '1px solid ' + (isActive ? '#f60300' : '#2e2e2e'),
        borderLeft: '3px solid ' + accent,
      }}
    >
      <div className="px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={'w-2 h-2 rounded-full shrink-0' + (isOnline ? ' dot-online' : '')}
            style={{ background: isOnline ? '#00c000' : '#333' }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm" style={{ color: isActive ? '#f60300' : '#fff' }}>
                {driver.username}
              </span>
              {isActive && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: '#2a0000', color: '#f60300', border: '1px solid rgba(246,3,0,0.3)' }}>
                  LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[#555]">
              {driver.division      && <span>{driver.division}</span>}
              {driver.team_category && <span>{driver.team_category}</span>}
              <span className="font-mono">:{driver.port}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          {isOnline ? (
            <button
              onClick={() => isActive ? onDisconnect() : onConnect(driver)}
              disabled={isConnecting && !isActive}
              className={isActive ? btnOutline : btnPri}
              style={isConnecting && !isActive ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >{isActive ? 'Stop' : isConnecting ? 'Connecting...' : 'Connect'}</button>
          ) : (
            <span className="text-[11px] text-[#444] uppercase tracking-wider">Offline</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EngineerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [drivers, setDrivers]           = useState([])
  const [connected, setConnected]       = useState(null)
  const [ws, setWs]                     = useState(null)
  const [loading, setLoading]           = useState(true)
  const [showProfile, setShowProfile]   = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  const [filterDivision, setFilterDivision] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterOnline, setFilterOnline]     = useState(false)
  const [clientRunning, setClientRunning]   = useState(false)
  const [connecting, setConnecting]         = useState(false)
  const [connectMsg, setConnectMsg]         = useState(null)

  useEffect(() => {
    fetchDrivers()
    const iv = setInterval(fetchDrivers, 5000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const checkClient = async () => {
      try {
        await fetch('http://localhost:7842/status')
        setClientRunning(true)
      } catch {
        setClientRunning(false)
      }
    }
    checkClient()
    const iv = setInterval(checkClient, 30000)
    return () => clearInterval(iv)
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

  const showMsg = (text, ok = true) => {
    setConnectMsg({ text, ok })
    setTimeout(() => setConnectMsg(null), 4000)
  }

  const connect = async (driver) => {
    if (connecting) return
    if (ws) ws.close()
    setConnecting(true)

    // Prova a comandare il client locale
    try {
      const tokenRes = await API.get('/auth/client-token')
      const res = await fetch('http://localhost:7842/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port: driver.port,
          token: tokenRes.data.token,
          driver: driver.username
        })
      })
      if (!res.ok) throw new Error('client_error')
      setConnected(driver)
      showMsg(`Client connesso a ${driver.username}`)
      setConnecting(false)
      return
    } catch {
      // Client non disponibile — usa WebSocket browser
    }

    // Fallback WebSocket browser
    showMsg('Client non attivo — avvia TatumClient per usare software esterni', false)
    const socket = new WebSocket(`${WS_URL}/ws/${driver.port}`)
    socket.onopen  = () => { setConnected(driver); setWs(socket); setConnecting(false) }
    socket.onclose = () => { setConnected(null);   setWs(null) }
    socket.onerror = () => { showMsg('Connessione WebSocket fallita', false); setConnecting(false) }
  }

  const disconnect = async () => {
    try {
      await fetch('http://localhost:7842/disconnect', { method: 'POST' })
    } catch {}
    if (ws) ws.close()
    setConnected(null)
    setWs(null)
  }

  // Chiudi connessione quando si naviga via (es. tasto Back del browser)
  useEffect(() => {
    return () => {
      try { fetch('http://localhost:7842/disconnect', { method: 'POST' }) } catch {}
    }
  }, [])

  useEffect(() => {
    return () => { if (ws) ws.close() }
  }, [ws])

  const handleLogout = () => { disconnect(); logout(); navigate('/login') }

  useEffect(() => {
    const fn = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const divisions   = [...new Set(drivers.map(d => d.division))].filter(Boolean)
  const categories  = [...new Set(drivers.map(d => d.team_category))].filter(Boolean)
  const onlineCount = drivers.filter(d => d.online).length

  const filtered = drivers.filter(d => {
    if (filterDivision !== 'all' && d.division      !== filterDivision) return false
    if (filterCategory !== 'all' && d.team_category !== filterCategory) return false
    if (filterOnline && !d.online) return false
    return true
  })

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white">

      {showProfile && <ProfileModal onClose={(c) => { setShowProfile(false); if (c) window.location.reload() }} />}

      {/* Toast notification */}
      {connectMsg && (
        <div
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-md text-xs font-medium shadow-2xl"
          style={{
            background: connectMsg.ok ? '#0d1f0d' : '#1f0000',
            border: '1px solid ' + (connectMsg.ok ? 'rgba(0,192,0,0.4)' : 'rgba(246,3,0,0.4)'),
            color: connectMsg.ok ? '#00c000' : '#f60300',
            maxWidth: 320
          }}
        >
          {connectMsg.text}
        </div>
      )}

      <nav
        className="flex items-center justify-between px-6 bg-[#191919] border-b border-[#2e2e2e]"
        style={{ borderTop: '3px solid #f60300', minHeight: 56 }}
      >
        <div className="flex items-center gap-4">
          <TatumLogo width={110} />
          {connected && (
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#f60300] border border-[#f60300]/25 rounded px-2.5 py-1 bg-[#1f0000]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f60300] dot-online" />
              Live -- {connected.username}
            </div>
          )}
        </div>
        <div className="flex items-center gap-5">
          {clientRunning ? (
            <div className="flex items-center gap-1.5 text-[11px] text-[#00c000]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00c000]" />
              Client active
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { window.location.href = 'tatum://launch' }}
                className="text-[11px] uppercase tracking-wider text-[#f5a623] border border-[#f5a623]/30 rounded px-2.5 py-1 hover:bg-[#f5a623]/10 transition-colors"
                title="Avvia il client se è già installato"
              >
                Avvia Client
              </button>
              <button
                onClick={() => navigate('/download')}
                className="text-[11px] uppercase tracking-wider text-[#f60300] border border-[#f60300]/30 rounded px-2.5 py-1 hover:bg-[#f60300]/10 transition-colors"
              >
                Download
              </button>
            </div>
          )}
          {user?.is_admin && (
            <button onClick={() => navigate('/admin')}
              className="text-[11px] uppercase tracking-wider text-[#666] hover:text-white transition-colors">
              Admin
            </button>
          )}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-2 text-[#999] hover:text-white transition-colors"
            >
              <span className="w-7 h-7 rounded bg-[#f60300] flex items-center justify-center text-white text-xs font-bold select-none">
                {user?.username?.[0]?.toUpperCase()}
              </span>
              <span className="text-xs">{user?.username}</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#212121] border border-[#2e2e2e] rounded-md shadow-2xl z-50 py-1">
                <button onClick={() => { setShowProfile(true); setShowUserMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#888] hover:text-white hover:bg-[#282828] transition-colors">
                  Edit profile
                </button>
                <button
                  onClick={() => { navigate('/download'); setShowUserMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#999] hover:text-white hover:bg-[#282828] transition-colors"
                >
                  Download Client
                </button>
                <div className="border-t border-[#2e2e2e] my-1" />
                <button onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#f60300] hover:bg-[#1f0000] transition-colors">
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-7">
          <div>
            <p className="lbl mb-1">Engineer Panel</p>
            <h1 className="text-xl font-bold">Real-time drivers</h1>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md"
              style={{
                background: clientRunning ? '#0d1f0d' : '#1e1e1e',
                border: '1px solid ' + (clientRunning ? 'rgba(0,192,0,0.25)' : '#2a2a2a')
              }}>
              <div
                className={'w-2 h-2 rounded-full shrink-0' + (clientRunning ? ' dot-online' : '')}
                style={{ background: clientRunning ? '#00c000' : '#444' }}
              />
              <span className="text-[11px] uppercase tracking-wider" style={{ color: clientRunning ? '#00c000' : '#555' }}>
                {clientRunning ? 'Client active' : 'Client offline'}
              </span>
            </div>
            <div className="w-px h-8 bg-[#2e2e2e]" />
            <div className="text-right">
              <p className="text-xl font-bold font-mono text-[#00c000]">{onlineCount}</p>
              <p className="lbl">Online</p>
            </div>
            <div className="w-px h-8 bg-[#2e2e2e]" />
            <div className="text-right">
              <p className="text-xl font-bold font-mono text-[#888]">{drivers.length}</p>
              <p className="lbl">Total</p>
            </div>
          </div>
        </div>

        {connected && (
          <div className="rounded-md px-5 py-3.5 mb-5 flex items-center justify-between"
            style={{ background: '#1f0000', border: '1px solid rgba(246,3,0,0.3)' }}>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#f60300] dot-online" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#f60300] mb-0.5">Connected</p>
                <p className="font-semibold text-sm">
                  {connected.username} <span className="font-mono text-[#888]">:{connected.port}</span>
                </p>
              </div>
            </div>
            <button onClick={disconnect} className={btnOutline}>Disconnect</button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-5">
          <select value={filterDivision} onChange={e => setFilterDivision(e.target.value)} className={inputCls + ' w-auto'}>
            <option value="all">All divisions</option>
            {divisions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={inputCls + ' w-auto'}>
            <option value="all">All teams</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => setFilterOnline(v => !v)}
            className={filterOnline
              ? 'px-4 py-2 rounded-md text-xs font-semibold border border-[#00c000] text-[#00c000] bg-[#0d1f0d] uppercase tracking-wider'
              : btnSec}
          >Online only</button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-5 h-5 border-2 border-[#f60300] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs uppercase tracking-widest text-[#555]">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-[#2e2e2e] rounded-md text-[#555]">
            <p className="text-sm">No drivers found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(driver => (
              <DriverCard key={driver.id} driver={driver} connected={connected} connecting={connecting} onConnect={connect} onDisconnect={disconnect} />
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