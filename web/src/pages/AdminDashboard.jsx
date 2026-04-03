import { useState, useEffect, useRef } from 'react'
import { VERSION } from '../version'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../api'
import ProfileModal from '../components/ProfileModal'
import EditUserModal from '../components/EditUserModal'
import TatumLogo from '../components/TatumLogo'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]                   = useState('users')
  const [users, setUsers]               = useState([])
  const [divisions, setDivisions]       = useState([])
  const [showCreateUser, setShowCreateUser]         = useState(false)
  const [showCreateDivision, setShowCreateDivision] = useState(false)
  const [showAssign, setShowAssign]     = useState(false)
  const [showProfile, setShowProfile]   = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)
  const [editUser, setEditUser]         = useState(null)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'driver', platform: 'PC', team_category: 'Main', is_admin: false })
  const [newDivision, setNewDivision]   = useState({ name: '', simulator: '' })
  const [assign, setAssign]             = useState({ user_id: '', division_id: '' })
  const [message, setMessage]           = useState('')

  const [filterRole, setFilterRole]         = useState('all')
  const [filterDivision, setFilterDivision] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterActive, setFilterActive]     = useState('all')

  useEffect(() => { fetchUsers(); fetchDivisions() }, [])

  const fetchUsers     = async () => { const r = await API.get('/admin/users'); setUsers(r.data.users) }
  const fetchDivisions = async () => { const r = await API.get('/divisions');   setDivisions(r.data.divisions) }

  const notify = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000) }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try { await API.post('/admin/users', newUser); notify('User created!'); setShowCreateUser(false); setNewUser({ username: '', password: '', role: 'driver', platform: 'PC', team_category: 'Main', is_admin: false }); fetchUsers() }
    catch (err) { notify(err.response?.data?.detail || 'Error') }
  }

  const handleCreateDivision = async (e) => {
    e.preventDefault()
    try { await API.post('/admin/divisions', newDivision); notify('Division created!'); setShowCreateDivision(false); setNewDivision({ name: '', simulator: '' }); fetchDivisions() }
    catch (err) { notify(err.response?.data?.detail || 'Error') }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    try { await API.post('/admin/divisions/assign', { user_id: parseInt(assign.user_id), division_id: parseInt(assign.division_id) }); notify('Assigned!'); setShowAssign(false); setAssign({ user_id: '', division_id: '' }) }
    catch (err) { notify(err.response?.data?.detail || 'Error') }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  useEffect(() => {
    const fn = (e) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const categories    = [...new Set(users.map(u => u.team_category))].filter(Boolean)
  const filteredUsers = users.filter(u => {
    if (filterRole     !== 'all'      && u.role        !== filterRole)      return false
    if (filterCategory !== 'all'      && u.team_category !== filterCategory) return false
    if (filterActive   === 'active'   && !u.is_active)  return false
    if (filterActive   === 'inactive' && u.is_active)   return false
    return true
  })

  // ── Shared style tokens ──────────────────────────────
  const inputCls  = 'w-full bg-[#1c1c1c] text-white text-sm rounded-md px-3.5 py-2.5 border border-[#333] focus:outline-none focus:border-[#f60300] transition-colors placeholder-[#444] sel'
  const selCls    = `${inputCls} sel`
  const btnPri    = 'px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider bg-[#f60300] text-white hover:bg-[#d90200] transition-colors'
  const btnSec    = 'px-4 py-2 rounded-md text-xs font-medium bg-[#282828] text-[#999] hover:bg-[#333] hover:text-white transition-colors border border-[#333]'

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white">

      {showProfile && <ProfileModal onClose={(c) => { setShowProfile(false); if (c) window.location.reload() }} />}
      {editUser    && <EditUserModal user={editUser} onClose={(c) => { setEditUser(null); if (c) fetchUsers() }} />}

      {/* Nav */}
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
          {user?.role === 'driver' && (
            <button
              onClick={() => navigate('/driver')}
              className="text-[11px] uppercase tracking-wider text-[#666] hover:text-white transition-colors"
            >Driver Panel</button>
          )}
          {user?.role === 'engineer' && (
            <button
              onClick={() => navigate('/engineer')}
              className="text-[11px] uppercase tracking-wider text-[#666] hover:text-white transition-colors"
            >Engineer Panel</button>
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
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#222] border border-[#333] rounded-md shadow-2xl z-50 py-1">
                <button onClick={() => { setShowProfile(true); setShowUserMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#999] hover:text-white hover:bg-[#282828] transition-colors">
                  Edit profile
                </button>
                <div className="border-t border-[#333] my-1" />
                <button onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#f60300] hover:bg-[#200000] transition-colors">
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <p className="lbl mb-1">Admin Panel</p>
          <h1 className="text-xl font-bold">User & Division Management</h1>
        </div>

        {/* Notification */}
        {message && (
          <div className="mb-6 rounded-md px-4 py-3 text-sm border border-[#00c000]/30 bg-[#001800] text-[#00c000]">
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[#333]">
          {[
            { id: 'users',     label: `Users (${users.length})` },
            { id: 'divisions', label: `Divisions (${divisions.length})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors relative"
              style={{
                color:        tab === t.id ? '#fff' : '#666',
                borderBottom: tab === t.id ? '2px solid #f60300' : '2px solid transparent',
                marginBottom: -1,
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* ── TAB UTENTI ──────────────────────────────── */}
        {tab === 'users' && (
          <div>
            {/* Actions row */}
            <div className="flex items-center gap-2 mb-5">
              <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className={selCls} style={{ width: 150 }}>
                <option value="all">All roles</option>
                <option value="driver">Driver</option>
                <option value="engineer">Engineer</option>
              </select>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={selCls} style={{ width: 150 }}>
                <option value="all">All teams</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className={selCls} style={{ width: 150 }}>
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Disabled only</option>
              </select>
              <div className="flex-1" />
              <button onClick={() => setShowAssign(v => !v)} className={btnSec}>Assign division</button>
              <button onClick={() => setShowCreateUser(v => !v)} className={btnPri}>+ New user</button>
            </div>

            {/* Assign form */}
            {showAssign && (
              <form onSubmit={handleAssign} className="bg-[#222] border border-[#333] rounded-md p-5 mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="lbl">User</label>
                  <select value={assign.user_id} onChange={e => setAssign({...assign, user_id: e.target.value})} className={selCls} required>
                    <option value="">Select user</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lbl">Division</label>
                  <select value={assign.division_id} onChange={e => setAssign({...assign, division_id: e.target.value})} className={selCls} required>
                    <option value="">Select division</option>
                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2 flex gap-2">
                  <button type="submit" className={btnPri}>Assign</button>
                  <button type="button" onClick={() => setShowAssign(false)} className={btnSec}>Cancel</button>
                </div>
              </form>
            )}

            {/* Create user form */}
            {showCreateUser && (
              <form onSubmit={handleCreateUser} className="bg-[#222] border border-[#333] rounded-md p-5 mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="lbl">Username</label>
                  <input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className={inputCls} required placeholder="Username" />
                </div>
                <div>
                  <label className="lbl">Password</label>
                  <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className={inputCls} required placeholder="Password" />
                </div>
                <div>
                  <label className="lbl">Role</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className={selCls}>
                    <option value="driver">Driver</option>
                    <option value="engineer">Engineer</option>
                  </select>
                </div>
                <div>
                  <label className="lbl">Platform</label>
                  <select value={newUser.platform} onChange={e => setNewUser({...newUser, platform: e.target.value})} className={selCls}>
                    <option value="PC">PC</option>
                    <option value="PS5">PS5</option>
                    <option value="Xbox">Xbox</option>
                  </select>
                </div>
                <div>
                  <label className="lbl">Team Category</label>
                  <select value={newUser.team_category} onChange={e => setNewUser({...newUser, team_category: e.target.value})} className={selCls}>
                    <option value="Main">Main</option>
                    <option value="Next Gen">Next Gen</option>
                    <option value="Test">Test</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input
                    type="checkbox" id="is_admin"
                    checked={newUser.is_admin}
                    onChange={e => setNewUser({...newUser, is_admin: e.target.checked})}
                    className="w-4 h-4 accent-[#f60300]"
                  />
                  <label htmlFor="is_admin" className="lbl cursor-pointer" style={{ marginBottom: 0 }}>Admin</label>
                </div>
                <div className="col-span-2 flex gap-2">
                  <button type="submit" className={btnPri}>Create user</button>
                  <button type="button" onClick={() => setShowCreateUser(false)} className={btnSec}>Cancel</button>
                </div>
              </form>
            )}

            {/* Users table */}
            <div className="bg-[#222] border border-[#333] rounded-md overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#1c1c1c', borderBottom: '1px solid #333' }}>
                    {['Username', 'Role', 'Team', 'Port', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[#555]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-[#282828]"
                      style={{ borderBottom: i < filteredUsers.length - 1 ? '1px solid #2a2a2a' : 'none' }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{u.username}</span>
                          {u.is_admin && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{ background: '#1e0a2a', color: '#b61bdb', border: '1px solid rgba(182,27,219,0.25)' }}>
                              Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#666] text-sm capitalize">{u.role}</td>
                      <td className="px-5 py-3.5 text-[#666] text-sm">{u.team_category || '—'}</td>
                      <td className="px-5 py-3.5 font-mono text-sm text-[#555]">{u.port || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded"
                          style={u.is_active
                            ? { background: '#001800', color: '#00c000', border: '1px solid rgba(0,192,0,0.25)' }
                            : { background: '#202020', color: '#555',    border: '1px solid #333' }}
                        >
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.is_superuser && user.id !== u.id ? (
                          <span className="text-[11px] text-[#333] uppercase tracking-wider">Protected</span>
                        ) : (
                          <button
                            onClick={() => setEditUser(u)}
                            className="text-[11px] text-[#666] hover:text-white transition-colors uppercase tracking-wider"
                          >Edit</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB DIVISIONI ───────────────────────────── */}
        {tab === 'divisions' && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <p className="lbl">Registered divisions</p>
              <button onClick={() => setShowCreateDivision(v => !v)} className={btnPri}>
                + New division
              </button>
            </div>

            {showCreateDivision && (
              <form onSubmit={handleCreateDivision} className="bg-[#222] border border-[#333] rounded-md p-5 mb-5 grid grid-cols-2 gap-4">
                <div>
                  <label className="lbl">Division name</label>
                  <input value={newDivision.name} onChange={e => setNewDivision({...newDivision, name: e.target.value})} className={inputCls} required placeholder="es. F1 25 Main" />
                </div>
                <div>
                  <label className="lbl">Simulator</label>
                  <input value={newDivision.simulator} onChange={e => setNewDivision({...newDivision, simulator: e.target.value})} className={inputCls} required placeholder="es. F1 25, ACC, iRacing" />
                </div>
                <div className="col-span-2 flex gap-2">
                  <button type="submit" className={btnPri}>Create division</button>
                  <button type="button" onClick={() => setShowCreateDivision(false)} className={btnSec}>Cancel</button>
                </div>
              </form>
            )}

            <div className="bg-[#222] border border-[#333] rounded-md overflow-hidden">
              {divisions.map((d, i) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-[#282828] transition-colors"
                  style={{ borderBottom: i < divisions.length - 1 ? '1px solid #2a2a2a' : 'none' }}
                >
                  <div>
                    <p className="font-medium text-sm">{d.name}</p>
                    <p className="text-[#555] text-xs mt-0.5">{d.simulator}</p>
                  </div>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded"
                    style={d.is_active
                      ? { background: '#001800', color: '#00c000', border: '1px solid rgba(0,192,0,0.25)' }
                      : { background: '#202020', color: '#555',    border: '1px solid #333' }}
                  >
                    {d.is_active ? 'Attiva' : 'Disattiva'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[#2e2e2e] text-[10px] uppercase tracking-widest mt-10">
          Tatum RES Tech — Telemetry System v{VERSION}
        </p>
      </div>
    </div>
  )
}