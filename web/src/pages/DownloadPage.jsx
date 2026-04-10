import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import API from '../api'

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN
const GITHUB_REPO  = import.meta.env.VITE_GITHUB_REPO

export default function DownloadPage() {
  const { user, connectedDriver } = useAuth()
  const [release, setRelease] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clientRunning, setClientRunning] = useState(false)
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [structureLoading, setStructureLoading] = useState(false)
  const [sessionStructure, setSessionStructure] = useState(null)

  useEffect(() => {
    fetchRelease()
    checkClient()
    fetchSessions()
    const iv = setInterval(checkClient, 30000)
    return () => clearInterval(iv)
  }, [])

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true)
      const res = await API.get('/sessions')
      const list = (res.data?.sessions || []).sort((a, b) => {
        const aTs = new Date(a.started_at || 0).getTime()
        const bTs = new Date(b.started_at || 0).getTime()
        return bTs - aTs
      })
      setSessions(list)
      if (list.length > 0) {
        setSelectedSessionId(list[0].id)
      }
    } catch (err) {
      console.error(err)
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }

  const fetchSessionStructure = async (sessionId) => {
    if (!sessionId) return
    try {
      setStructureLoading(true)
      const res = await API.get(`/sessions/${sessionId}/structure?max_records=4000`)
      setSessionStructure(res.data)
    } catch (err) {
      console.error(err)
      setSessionStructure(null)
    } finally {
      setStructureLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedSessionId) {
      setSessionStructure(null)
      return
    }
    fetchSessionStructure(selectedSessionId)
  }, [selectedSessionId])

  const fetchRelease = async () => {
    try {
      const headers = GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
        { headers }
      )
      if (!res.ok) throw new Error(`GitHub API ${res.status}`)
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

  const getIcon = (name) => {
    if (name.includes('Setup') || name.includes('setup') || name.includes('installer')) return '📦'
    if (name.includes('.exe'))    return '🪟'
    if (name.includes('mac') || name.includes('darwin')) return '🍎'
    if (name.includes('linux'))   return '🐧'
    return '📦'
  }

  const getLabel = (name) => {
    if (name.includes('Setup') || name.includes('setup') || name.includes('installer'))
      return 'Windows Installer (recommended)'
    if (name.includes('.exe'))    return 'Windows (standalone executable)'
    if (name.includes('mac') || name.includes('darwin')) return 'macOS'
    if (name.includes('linux'))   return 'Linux'
    return name
  }

  const isInstaller = (name) =>
    name.includes('Setup') || name.includes('setup') || name.includes('installer')

  const fmtDate = (value) => {
    if (!value) return 'N/A'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return 'N/A'
    return d.toLocaleString('en-GB')
  }

  const fmtLapTime = (ms) => {
    if (!ms && ms !== 0) return 'N/A'
    const total = Math.max(0, Number(ms))
    const minutes = Math.floor(total / 60000)
    const seconds = Math.floor((total % 60000) / 1000)
    const millis = Math.floor(total % 1000)
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
  }

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white">

      <Navbar
        badge={
          <div
            className="flex items-center gap-2 text-[11px] uppercase tracking-wider rounded px-2.5 py-1"
            style={connectedDriver
              ? { color: '#f60300', border: '1px solid rgba(246,3,0,0.25)', background: '#1f0000' }
              : { color: '#444',    border: '1px solid #2a2a2a',            background: '#1c1c1c' }}
          >
            <span
              className={'w-1.5 h-1.5 rounded-full' + (connectedDriver ? ' dot-online' : '')}
              style={{ background: connectedDriver ? '#f60300' : '#333' }}
            />
            {connectedDriver ? `Live — ${connectedDriver.username}` : 'Live'}
          </div>
        }
      />

      <div className="max-w-2xl mx-auto px-6 py-12">

        <div className="mb-10">
          <p className="lbl mb-1">Download</p>
          <h1 className="text-2xl font-bold">Tatum Client</h1>
          <p className="text-[#555] text-sm mt-2">
            Install the client to receive telemetry data on your PC.
          </p>
        </div>

        {/* SmartScreen notice */}
        <div className="mb-6 rounded-md px-4 py-3 flex items-start gap-3"
          style={{ background: '#1a1400', border: '1px solid rgba(245,166,35,0.3)' }}>
          <span className="text-[#f5a623] text-base mt-0.5 shrink-0">⚠</span>
          <div>
            <p className="text-xs font-semibold text-[#f5a623] mb-0.5">Windows SmartScreen</p>
            <p className="text-[11px] text-[#888] leading-relaxed">
            Windows may show a "Windows protected your PC" warning. Click <strong className="text-[#aaa]">More info</strong> → <strong className="text-[#aaa]">Run anyway</strong> to proceed. The app is safe.
            </p>
          </div>
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
          <>
          <div className="bg-[#222] border border-[#333] rounded-md overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{release.name}</p>
                <p className="text-[#555] text-xs mt-0.5">
                  {new Date(release.published_at).toLocaleDateString('en-GB')}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                style={{ background: '#001800', color: '#00c000', border: '1px solid rgba(0,192,0,0.25)' }}>
                Latest
              </span>
            </div>

            {/* Assets */}
            <div className="divide-y divide-[#2a2a2a]">
              {[...(release.assets || [])].sort((a, b) => isInstaller(b.name) - isInstaller(a.name)).map(asset => (
                <div key={asset.id} className="px-5 py-4 flex items-center justify-between hover:bg-[#282828] transition-colors"
                  style={isInstaller(asset.name) ? { background: '#1a1600' } : {}}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getIcon(asset.name)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{asset.name}</p>
                        {isInstaller(asset.name) && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                            style={{ background: '#1f1600', color: '#f5a623', border: '1px solid rgba(245,166,35,0.35)' }}>
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-[#555] text-xs mt-0.5">
                        {getLabel(asset.name)} · {(asset.size / 1024 / 1024).toFixed(1)} MB
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

          {/* Installation instructions */}
          <div className="mt-6 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md px-5 py-4">
            <p className="lbl mb-3">How to install</p>
            <ol className="space-y-2.5">
              {[
                'Download TatumClientSetup.exe (recommended)',
                'Run the file and follow the installation wizard',
                'Check "Launch automatically with Windows" to avoid restarting it manually',
                'When done it will launch automatically — look for the icon in the system tray',
                'Come back here: the dashboard will detect it and you can connect to drivers',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: '#2a0000', color: '#f60300', border: '1px solid rgba(246,3,0,0.3)' }}>
                    {i + 1}
                  </span>
                  <span className="text-xs text-[#888] leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md px-5 py-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="lbl">Session Logs (Outings + Laps)</p>
              <button
                onClick={fetchSessions}
                className="text-[11px] uppercase tracking-wider text-[#888] hover:text-white transition-colors"
              >Refresh</button>
            </div>

            {sessionsLoading ? (
              <p className="text-xs text-[#666]">Loading sessions...</p>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-[#666]">No sessions available.</p>
            ) : (
              <div className="space-y-3">
                <select
                  className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-xs text-[#ddd]"
                  value={selectedSessionId || ''}
                  onChange={(e) => setSelectedSessionId(Number(e.target.value))}
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} - {s.circuit || 'Unknown Circuit'} - {s.session_type || 'Unknown Session'} - {fmtDate(s.started_at)}
                    </option>
                  ))}
                </select>

                {structureLoading ? (
                  <p className="text-xs text-[#666]">Reading outing/lap structure...</p>
                ) : !sessionStructure?.structure ? (
                  <p className="text-xs text-[#666]">Unable to read the session structure.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-md border border-[#2a2a2a] bg-[#171717] px-3 py-3 text-xs text-[#999] grid gap-1">
                      <p>Driver: <span className="text-[#ddd]">{sessionStructure.structure.session?.driver_name || 'N/A'}</span></p>
                      <p>Circuit: <span className="text-[#ddd]">{sessionStructure.structure.session?.circuit || 'N/A'}</span></p>
                      <p>Session type: <span className="text-[#ddd]">{sessionStructure.structure.session?.session_type || 'N/A'}</span></p>
                      <p>Outings: <span className="text-[#ddd]">{sessionStructure.structure.session?.outings_count ?? 0}</span></p>
                      <p>Laps: <span className="text-[#ddd]">{sessionStructure.structure.session?.laps_count ?? 0}</span></p>
                    </div>

                    {(sessionStructure.structure.outings || []).map((outing) => (
                      <div key={outing.outing_index} className="rounded-md border border-[#2a2a2a] bg-[#171717] px-3 py-3">
                        <p className="text-xs font-semibold text-[#ddd] mb-2">
                          Outing {outing.outing_index} · {fmtDate(outing.started_at)} → {fmtDate(outing.ended_at)}
                        </p>
                        {(!outing.laps || outing.laps.length === 0) ? (
                          <p className="text-xs text-[#666]">No laps recorded in this outing.</p>
                        ) : (
                          <div className="space-y-1">
                            {outing.laps.map((lap, idx) => (
                              <div key={`${outing.outing_index}-${lap.lap_number || idx}`} className="text-xs text-[#999] border border-[#242424] rounded px-2 py-1">
                                Lap {lap.lap_number ?? 'N/A'} · {lap.kind || 'lap'} · Tempo: <span className="text-[#ddd]">{fmtLapTime(lap.last_lap_time_ms)}</span>
                                {lap.current_lap_invalid ? <span className="text-[#f5a623]"> · Invalid</span> : <span className="text-[#00c000]"> · Valid</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          </>
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
