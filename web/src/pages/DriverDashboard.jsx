import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import ProfileModal from '../components/ProfileModal'
import TatumLogo from '../components/TatumLogo'

export default function DriverDashboard() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const [showProfile, setShowProfile]   = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  const handleLogout = () => { logout(); navigate('/login') }

  useEffect(() => {
    const fn = (e) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white">

      {showProfile && (
        <ProfileModal onClose={(changed) => { setShowProfile(false); if (changed) window.location.reload() }} />
      )}

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 bg-[#181818] border-b border-[#2a2a2a]"
        style={{ borderTop: '3px solid #f60300', minHeight: 56 }}
      >
        <TatumLogo width={110} />

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
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#222] border border-[#333] rounded-md shadow-2xl z-50 py-1">
              <button
                onClick={() => { setShowProfile(true); setShowUserMenu(false) }}
                className="w-full text-left px-4 py-2.5 text-xs text-[#999] hover:text-white hover:bg-[#282828] transition-colors"
              >Edit profile</button>
              <div className="border-t border-[#333] my-1" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-xs text-[#f60300] hover:bg-[#200000] transition-colors"
              >Log out</button>
            </div>
          )}
        </div>
      </nav>

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
            {user?.port || 'â€”'}
          </div>
          <p className="text-[#555] text-xs leading-relaxed">
            Enter this number in<br />
            <span className="text-[#888]">F1 25 â†’ Settings â†’ Telemetry â†’ Port</span>
          </p>
          <div
            className="mt-5 rounded-md px-4 py-3 text-left"
            style={{ background: '#1c1c1c', border: '1px solid #2a2a2a' }}
          >
            <p className="lbl mb-1">IP Server</p>
            <p className="font-mono text-sm text-white">4.232.170.59</p>
          </div>
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
      </div>
    </div>
  )
}
