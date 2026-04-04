import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import TatumLogo from '../components/TatumLogo'

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN
const GITHUB_REPO  = import.meta.env.VITE_GITHUB_REPO

export default function DownloadPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [release, setRelease] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clientRunning, setClientRunning] = useState(false)

  useEffect(() => {
    fetchRelease()
    checkClient()
    const iv = setInterval(checkClient, 5000)
    return () => clearInterval(iv)
  }, [])

  const fetchRelease = async () => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }
      )
      const data = await res.json()
      setRelease(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const checkClient = async () => {
    try {
      await fetch('http://localhost:7842/status')
      setClientRunning(true)
    } catch {
      setClientRunning(false)
    }
  }

  const downloadAsset = (asset) => {
    const a    = document.createElement('a')
    a.href     = asset.browser_download_url
    a.download = asset.name
    a.target   = '_blank'
    a.rel      = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const getIcon = (name) => {
    if (name.includes('.exe'))    return '🪟'
    if (name.includes('mac') || name.includes('darwin')) return '🍎'
    if (name.includes('linux'))   return '🐧'
    return '📦'
  }

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white">
      <nav
        className="flex items-center justify-between px-6 bg-[#181818] border-b border-[#2a2a2a]"
        style={{ borderTop: '3px solid #f60300', minHeight: 56 }}
      >
        <div className="flex items-center gap-3">
          <TatumLogo width={110} />
        </div>
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate(user?.role === 'driver' ? '/driver' : user?.is_admin ? '/admin' : '/engineer')}
            className="text-[11px] uppercase tracking-wider text-[#666] hover:text-white transition-colors"
          >
            ← Back
          </button>
          <span className="text-xs text-[#666]">{user?.username}</span>
          <button onClick={handleLogout} className="text-[11px] uppercase tracking-wider text-[#f60300] hover:text-white transition-colors">
            Log out
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        <div className="mb-10">
          <p className="lbl mb-1">Download</p>
          <h1 className="text-2xl font-bold">Tatum Client</h1>
          <p className="text-[#555] text-sm mt-2">
            Install the client to receive telemetry data on your PC.
          </p>
        </div>

        {/* Client status */}
        <div
          className="rounded-md px-5 py-4 mb-8 flex items-center gap-3"
          style={{
            background: clientRunning ? '#0d1f0d' : '#1c1c1c',
            border: '1px solid ' + (clientRunning ? 'rgba(0,192,0,0.25)' : '#2a2a2a')
          }}
        >
          <div
            className={'w-2.5 h-2.5 rounded-full shrink-0' + (clientRunning ? ' dot-online' : '')}
            style={{ background: clientRunning ? '#00c000' : '#333' }}
          />
          <div>
            <p className="text-sm font-medium" style={{ color: clientRunning ? '#00c000' : '#555' }}>
              {clientRunning ? 'Client is running' : 'Client not detected'}
            </p>
            <p className="text-xs text-[#444] mt-0.5">
              {clientRunning
                ? 'The client is active in your system tray'
                : 'Download and launch the client to get started'}
            </p>
          </div>
        </div>

        {/* Release info */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-5 h-5 border-2 border-[#f60300] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs uppercase tracking-widest text-[#555]">Loading...</p>
          </div>
        ) : release ? (
          <div className="bg-[#222] border border-[#333] rounded-md overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{release.name}</p>
                <p className="text-[#555] text-xs mt-0.5">
                  {new Date(release.published_at).toLocaleDateString('it-IT')}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                style={{ background: '#001800', color: '#00c000', border: '1px solid rgba(0,192,0,0.25)' }}>
                Latest
              </span>
            </div>

            {/* Assets */}
            <div className="divide-y divide-[#2a2a2a]">
              {release.assets?.map(asset => (
                <div key={asset.id} className="px-5 py-4 flex items-center justify-between hover:bg-[#282828] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getIcon(asset.name)}</span>
                    <div>
                      <p className="text-sm font-medium">{asset.name}</p>
                      <p className="text-[#555] text-xs mt-0.5">
                        {(asset.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadAsset(asset)}
                    className="px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider bg-[#f60300] text-white hover:bg-[#d90200] transition-colors"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>

            {/* Release notes */}
            {release.body && (
              <div className="px-5 py-4 border-t border-[#2a2a2a]">
                <p className="lbl mb-2">Release notes</p>
                <p className="text-[#666] text-xs leading-relaxed whitespace-pre-line">{release.body}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 border border-[#2a2a2a] rounded-md">
            <p className="text-[#555] text-sm">No releases available</p>
          </div>
        )}

        <p className="text-center text-[#2e2e2e] text-[10px] uppercase tracking-widest mt-10">
          Tatum RES Tech — Telemetry System
        </p>
      </div>
    </div>
  )
}
