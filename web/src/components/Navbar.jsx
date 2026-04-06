import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import TatumLogo from './TatumLogo'
import ProfileModal from './ProfileModal'

/**
 * Navbar condivisa.
 *
 * Props:
 *  badge        – JSX opzionale mostrato a destra del logo (es. pill "Admin" o indicatore Live)
 *  extra        – JSX opzionale mostrato a destra, prima del menu utente (es. widget client, bottone Back)
 *  showDownload – mostra "Download Client" nel dropdown (default true)
 */
export default function Navbar({ badge, extra, showDownload = true }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProfile,  setShowProfile]  = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const fn = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <>
      {showProfile && (
        <ProfileModal onClose={(c) => { setShowProfile(false); if (c) window.location.reload() }} />
      )}

      <nav
        className="flex items-center justify-between px-6 bg-[#181818] border-b border-[#2a2a2a]"
        style={{ borderTop: '3px solid #f60300', minHeight: 56 }}
      >
        {/* Left: logo + badge opzionale */}
        <div className="flex items-center gap-3">
          <TatumLogo width={110} />
          {badge}
        </div>

        {/* Right: extra + dropdown utente */}
        <div className="flex items-center gap-5">
          {extra}

          <div className="relative" ref={menuRef}>
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
                >
                  Edit profile
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
      </nav>
    </>
  )
}
