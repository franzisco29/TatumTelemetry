import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import TatumLogo from './TatumLogo'

/**
 * Shared navbar.
 *
 * Props:
 *  badge          - optional JSX shown to the right of the logo (e.g. "Admin" pill or Live indicator)
 *  extra          - optional JSX shown on the right, before the user menu (e.g. client widget, Back button)
 *  showDownload   - show "Download Client" in the dropdown (default true)
 *  showNavButtons - show the central navigation bar (default true)
 */
export default function Navbar({ badge, extra, showDownload = true, showNavButtons = true }) {
  const { user, logout, connectedDriver } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const fn = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const isActive = (path) => location.pathname === path
  const driverDisabled = user?.role !== 'driver'

  const navItems = [
    { label: 'Home', path: '/home' },
    { label: 'Engineer', path: '/engineer', disabled: user?.role !== 'engineer' && !user?.is_admin },
    { label: 'Driver', path: '/driver', disabled: driverDisabled },
  ]

  if (user?.is_admin) {
    navItems.splice(1, 0, { label: 'Live', path: '/live', disabled: false })
    navItems.splice(2, 0, { label: 'Compare', path: '/compare', disabled: false })
    navItems.push({ label: 'Admin', path: '/admin' })
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <nav className="bg-[#181818] border-b border-[#2a2a2a] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className={`grid items-center min-h-[70px] gap-6 ${showNavButtons ? 'grid-cols-[120px_minmax(640px,1fr)_320px]' : 'grid-cols-[120px_1fr_320px]'}`}>
          {/* Logo */}
          <div className="w-[120px]">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="flex items-center transition-all duration-200 hover:opacity-80 hover:scale-[1.02] focus:outline-none"
            >
              <TatumLogo width={90} />
            </button>
          </div>

          {/* Nav buttons */}
          <div className={`${showNavButtons ? 'hidden md:flex justify-center' : 'hidden md:block'}`}>
            {showNavButtons ? (
              <div className="grid grid-flow-col auto-cols-fr gap-3 max-w-[720px] w-full">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => !item.disabled && navigate(item.path)}
                    disabled={item.disabled}
                    className={`w-full rounded-md border px-4 py-2 text-[11px] text-center font-semibold uppercase tracking-[0.24em] transition-all duration-200 ${item.disabled ? 'border-[#2a2a2a] bg-[#111] text-[#606060] cursor-not-allowed' : isActive(item.path) ? 'border-[#f60300] bg-[#f60300]/10 text-[#fff]' : 'border-transparent bg-[#222] text-[#ccc] hover:border-[#f60300] hover:text-white hover:bg-[#1f1f1f]'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 w-[320px] justify-end">
            {connectedDriver && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#111] px-2 py-1 text-xs text-[#9ee3ff]">
                <span>🚗</span>
                <span>{connectedDriver.username || connectedDriver}</span>
              </span>
            )}

            {user?.offline && (
              <span className="hidden sm:inline-flex items-center rounded-full bg-[#2a2a2a] px-2 py-1 text-xs text-[#a5a5a5]">
                Offline
              </span>
            )}

            <span className="hidden sm:inline-flex items-center rounded-full bg-[#111] px-2 py-1 text-xs text-[#ccc]">
              {user?.is_admin ? 'Admin' : user?.role === 'driver' ? 'Driver' : 'Engineer'}
            </span>

            {extra}

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 text-[#ccc] hover:text-white transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-[#f60300] flex items-center justify-center text-sm font-bold text-white">
                  {user?.username?.[0]?.toUpperCase()}
                </span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#222] border border-[#333] rounded-md shadow-2xl z-50 py-1">
                  <div className="px-4 py-2 text-xs text-[#999] border-b border-[#333]">
                    {user?.username}
                  </div>
                  <button
                    onClick={() => { navigate('/profile'); setShowUserMenu(false) }}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#999] hover:text-white hover:bg-[#282828] transition-colors"
                  >
                    Profile
                  </button>
                  {showDownload && (
                    <button
                      onClick={() => { navigate('/download'); setShowUserMenu(false) }}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#999] hover:text-white hover:bg-[#282828] transition-colors"
                    >
                      Download Client
                    </button>
                  )}
                  <div className="border-t border-[#333] my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#f60300] hover:bg-[#200000] transition-colors"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {showNavButtons && (
          <div className="md:hidden grid grid-cols-3 gap-2 pb-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => !item.disabled && navigate(item.path)}
                disabled={item.disabled}
                className={`w-full rounded-md border px-3 py-2 text-[11px] uppercase tracking-[0.24em] transition-all duration-200 ${item.disabled ? 'border-[#2a2a2a] bg-[#111] text-[#606060] cursor-not-allowed' : isActive(item.path) ? 'border-[#f60300] bg-[#f60300]/10 text-[#fff]' : 'border-transparent bg-[#222] text-[#ccc] hover:border-[#f60300] hover:text-white hover:bg-[#1f1f1f]'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
