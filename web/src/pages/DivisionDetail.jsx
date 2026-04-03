import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../api'
import TatumLogo from '../components/TatumLogo'

export default function DivisionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    API.get(`/admin/divisions/${id}/members`)
      .then(res => setData(res.data))
      .catch(() => navigate('/admin'))
      .finally(() => setLoading(false))
  }, [id])

  const handleLogout = () => { logout(); navigate('/login') }

  const drivers   = data?.members.filter(m => m.role === 'driver')   || []
  const engineers = data?.members.filter(m => m.role === 'engineer') || []

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white">
      <nav
        className="flex items-center justify-between px-6 bg-[#181818] border-b border-[#2a2a2a]"
        style={{ borderTop: '3px solid #f60300', minHeight: 56 }}
      >
        <div className="flex items-center gap-3">
          <TatumLogo width={110} />
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-[#200000] text-[#f60300] border border-[#f60300]/25">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-5">
          <button onClick={() => navigate('/admin')} className="text-[11px] uppercase tracking-wider text-[#666] hover:text-white transition-colors">
            ← Back
          </button>
          <span className="text-xs text-[#666]">{user?.username}</span>
          <button onClick={handleLogout} className="text-[11px] uppercase tracking-wider text-[#f60300] hover:text-white transition-colors">
            Log out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {loading ? (
          <div className="text-center py-16">
            <div className="w-5 h-5 border-2 border-[#f60300] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs uppercase tracking-widest text-[#555]">Loading...</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <p className="lbl mb-1">Division</p>
              <h1 className="text-2xl font-bold">{data?.division.name}</h1>
              <p className="text-[#555] text-sm mt-1">{data?.division.simulator}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-[#222] border border-[#333] rounded-md p-5 text-center">
                <p className="text-2xl font-bold font-mono">{data?.members.length}</p>
                <p className="lbl mt-1">Total members</p>
              </div>
              <div className="bg-[#222] border border-[#333] rounded-md p-5 text-center">
                <p className="text-2xl font-bold font-mono text-[#f60300]">{drivers.length}</p>
                <p className="lbl mt-1">Drivers</p>
              </div>
              <div className="bg-[#222] border border-[#333] rounded-md p-5 text-center">
                <p className="text-2xl font-bold font-mono text-[#888]">{engineers.length}</p>
                <p className="lbl mt-1">Engineers</p>
              </div>
            </div>

            {/* Drivers */}
            {drivers.length > 0 && (
              <div className="mb-6">
                <p className="lbl mb-3">Drivers</p>
                <div className="bg-[#222] border border-[#333] rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: '#1c1c1c', borderBottom: '1px solid #333' }}>
                        {['Username', 'Team', 'Platform', 'Port', 'Status'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[#555]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map((m, i) => (
                        <tr
                          key={m.id}
                          className="transition-colors hover:bg-[#282828]"
                          style={{ borderBottom: i < drivers.length - 1 ? '1px solid #2a2a2a' : 'none' }}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{m.username}</span>
                              {m.is_admin && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                  style={{ background: '#1e0a2a', color: '#b61bdb', border: '1px solid rgba(182,27,219,0.25)' }}>
                                  Admin
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-[#666] text-sm">{m.team_category || '—'}</td>
                          <td className="px-5 py-3.5 text-[#666] text-sm">{m.platform || '—'}</td>
                          <td className="px-5 py-3.5 font-mono text-sm text-[#555]">{m.port || '—'}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded"
                              style={m.is_active
                                ? { background: '#001800', color: '#00c000', border: '1px solid rgba(0,192,0,0.25)' }
                                : { background: '#202020', color: '#555', border: '1px solid #333' }}
                            >
                              {m.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Engineers */}
            {engineers.length > 0 && (
              <div>
                <p className="lbl mb-3">Engineers</p>
                <div className="bg-[#222] border border-[#333] rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: '#1c1c1c', borderBottom: '1px solid #333' }}>
                        {['Username', 'Platform', 'Status'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[#555]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {engineers.map((m, i) => (
                        <tr
                          key={m.id}
                          className="transition-colors hover:bg-[#282828]"
                          style={{ borderBottom: i < engineers.length - 1 ? '1px solid #2a2a2a' : 'none' }}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{m.username}</span>
                              {m.is_admin && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                  style={{ background: '#1e0a2a', color: '#b61bdb', border: '1px solid rgba(182,27,219,0.25)' }}>
                                  Admin
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-[#666] text-sm">{m.platform || '—'}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded"
                              style={m.is_active
                                ? { background: '#001800', color: '#00c000', border: '1px solid rgba(0,192,0,0.25)' }
                                : { background: '#202020', color: '#555', border: '1px solid #333' }}
                            >
                              {m.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
