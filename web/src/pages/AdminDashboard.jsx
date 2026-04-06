import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../api'
import EditUserModal from '../components/EditUserModal'
import PasswordInput from '../components/PasswordInput'
import Navbar from '../components/Navbar'

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]                   = useState('users')
  const [users, setUsers]               = useState([])
  const [divisions, setDivisions]       = useState([])
  const [showCreateUser, setShowCreateUser]         = useState(false)
  const [showCreateDivision, setShowCreateDivision] = useState(false)
  const [showAssign, setShowAssign]     = useState(false)
  const [editUser, setEditUser]         = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'driver', platform: 'PC', team_category: 'Main', is_admin: false, division_id: '' })
  const [newDivision, setNewDivision]   = useState({ name: '', simulator: '' })
  const [assign, setAssign]             = useState({ user_id: '', division_id: '' })
  const [message, setMessage]           = useState('')
  const [selectedDivision, setSelectedDivision] = useState(null)
  const [divisionData, setDivisionData]         = useState(null)
  const [divisionLoading, setDivisionLoading]   = useState(false)

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
    try {
      const r = await API.post('/admin/users', newUser)
      if (newUser.division_id) {
        await API.post('/admin/divisions/assign', { user_id: r.data.id, division_id: parseInt(newUser.division_id) })
      }
      notify('User created!')
      setShowCreateUser(false)
      setNewUser({ username: '', password: '', role: 'driver', platform: 'PC', team_category: 'Main', is_admin: false, division_id: '' })
      fetchUsers()
    } catch (err) { notify(err.response?.data?.detail || 'Error') }
  }

  const handleCreateDivision = async (e) => {
    e.preventDefault()
    try { await API.post('/admin/divisions', newDivision); notify('Division created!'); setShowCreateDivision(false); setNewDivision({ name: '', simulator: '' }); fetchDivisions() }
    catch (err) { notify(err.response?.data?.detail || 'Error') }
  }

  const handleDeleteUser = async (u) => {
    try { await API.delete(`/admin/users/${u.id}`); notify(`User "${u.username}" deleted.`); setConfirmDelete(null); fetchUsers() }
    catch (err) { notify(err.response?.data?.detail || 'Error') }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    try { await API.post('/admin/divisions/assign', { user_id: parseInt(assign.user_id), division_id: parseInt(assign.division_id) }); notify('Assigned!'); setShowAssign(false); setAssign({ user_id: '', division_id: '' }) }
    catch (err) { notify(err.response?.data?.detail || 'Error') }
  }

  const openDivision = async (d) => {
    setSelectedDivision(d)
    setDivisionData(null)
    setDivisionLoading(true)
    try {
      const r = await API.get(`/admin/divisions/${d.id}/members`)
      setDivisionData(r.data)
    } catch {}
    finally { setDivisionLoading(false) }
  }

  const categories    = [...new Set(users.map(u => u.team_category))].filter(Boolean)
  const filteredUsers = users.filter(u => {
    if (filterRole     !== 'all'      && u.role        !== filterRole)      return false
    if (filterCategory !== 'all'      && u.team_category !== filterCategory) return false
    if (filterActive   === 'active'   && !u.is_active)  return false
    if (filterActive   === 'inactive' && u.is_active)   return false
    return true
  })

  // ── Shared style tokens ──────────────────────────────
  const inputCls  = 'w-full bg-[#1c1c1c] text-white text-sm rounded-md px-3.5 py-2.5 border border-[#333] focus:outline-none focus:border-[#f60300] transition-colors placeholder-[#444]'
  const selCls    = `${inputCls} sel`
  const btnPri    = 'px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider bg-[#f60300] text-white hover:bg-[#d90200] transition-colors'
  const btnSec    = 'px-4 py-2 rounded-md text-xs font-medium bg-[#282828] text-[#999] hover:bg-[#333] hover:text-white transition-colors border border-[#333]'

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white">

      {editUser    && <EditUserModal user={editUser} divisions={divisions} onClose={(c) => { setEditUser(null); if (c) fetchUsers() }} />}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4">
          <div className="bg-[#222] border border-[#333] rounded-md w-full max-w-sm p-7">
            <h2 className="font-bold text-base mb-2">Delete user</h2>
            <p className="text-[#888] text-sm mb-6">Are you sure you want to delete <span className="text-white font-semibold">{confirmDelete.username}</span>? This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDeleteUser(confirmDelete)} className="flex-1 bg-[#f60300] hover:bg-[#d90200] text-white font-semibold rounded-md py-2.5 text-sm transition-colors">Delete</button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-[#282828] hover:bg-[#333] text-[#999] hover:text-white font-medium rounded-md py-2.5 text-sm transition-colors border border-[#333]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <Navbar
        badge={
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-[#200000] text-[#f60300] border border-[#f60300]/25">
            Admin
          </span>
        }
        extra={
          user?.role === 'engineer' && (
            <button
              onClick={() => navigate('/engineer')}
              className="text-[11px] uppercase tracking-wider text-[#666] hover:text-white transition-colors"
            >Engineer Panel</button>
          )
        }
      />

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <p className="lbl mb-1">Admin Panel</p>
          <h1 className="text-xl font-bold">Users & Divisions</h1>
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
              <button onClick={() => setShowCreateUser(v => !v)} className={`${btnPri} normal-case`}>+ New user</button>
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
                  <PasswordInput value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className={inputCls} required placeholder="Password" />
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
                <div>
                  <label className="lbl">Division <span className="text-[#555] normal-case tracking-normal" style={{fontSize:'10px'}}>(optional)</span></label>
                  <select value={newUser.division_id} onChange={e => setNewUser({...newUser, division_id: e.target.value})} className={selCls}>
                    <option value="">No division</option>
                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
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
                    {['Username', 'Role', 'Team', 'Division', 'Port', 'Status', ''].map(h => (
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
                      <td className="px-5 py-3.5 text-[#666] text-sm">
                        {u.divisions?.length > 0
                          ? u.divisions.map(d => divisions.find(x => x.id === d.id)?.name).filter(Boolean).join(', ') || '—'
                          : '—'}
                      </td>
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
                        <div className="flex items-center gap-3">
                          {/* Edit icon */}
                          <button
                            onClick={() => setEditUser(u)}
                            title="Edit"
                            className="text-[#555] hover:text-white transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110.414 16H8v-2.414a2 2 0 01.586-1.414z" />
                            </svg>
                          </button>
                          {/* Delete icon */}
                          <button
                            onClick={() => setConfirmDelete(u)}
                            title="Delete"
                            className="text-[#555] hover:text-[#f60300] transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
                            </svg>
                          </button>
                        </div>
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
            {selectedDivision ? (
              // ── Vista dettaglio divisione ──────────────
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <button
                      onClick={() => { setSelectedDivision(null); setDivisionData(null) }}
                      className="text-[11px] uppercase tracking-wider text-[#666] hover:text-white transition-colors mb-2 block"
                    >← All divisions</button>
                    <h2 className="text-lg font-bold">{selectedDivision.name}</h2>
                    <p className="text-[#555] text-xs mt-0.5">{selectedDivision.simulator}</p>
                  </div>
                </div>

                {divisionLoading ? (
                  <div className="text-center py-16">
                    <div className="w-5 h-5 border-2 border-[#f60300] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs uppercase tracking-widest text-[#555]">Loading...</p>
                  </div>
                ) : divisionData && (() => {
                  const drivers   = divisionData.members.filter(m => m.role === 'driver')
                  const engineers = divisionData.members.filter(m => m.role === 'engineer')
                  return (
                    <>
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-[#222] border border-[#333] rounded-md p-5 text-center">
                          <p className="text-2xl font-bold font-mono">{divisionData.members.length}</p>
                          <p className="lbl mt-1">Total members</p>
                        </div>
                        <div className="bg-[#222] border border-[#333] rounded-md p-5 text-center">
                          <p className="text-2xl font-bold font-mono text-[#f60300]">{drivers.length}</p>
                          <p className="lbl mt-1">Driver</p>
                        </div>
                        <div className="bg-[#222] border border-[#333] rounded-md p-5 text-center">
                          <p className="text-2xl font-bold font-mono text-[#888]">{engineers.length}</p>
                          <p className="lbl mt-1">Engineers</p>
                        </div>
                      </div>

                      {/* Drivers */}
                      {drivers.length > 0 && (
                        <div className="mb-6">
                          <p className="lbl mb-3">Driver</p>
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
                                  <tr key={m.id} className="transition-colors hover:bg-[#282828]"
                                    style={{ borderBottom: i < drivers.length - 1 ? '1px solid #2a2a2a' : 'none' }}>
                                    <td className="px-5 py-3.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{m.username}</span>
                                        {m.is_admin && (
                                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                            style={{ background: '#1e0a2a', color: '#b61bdb', border: '1px solid rgba(182,27,219,0.25)' }}>Admin</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-[#666] text-sm">{m.team_category || '—'}</td>
                                    <td className="px-5 py-3.5 text-[#666] text-sm">{m.platform || '—'}</td>
                                    <td className="px-5 py-3.5 font-mono text-sm text-[#555]">{m.port || '—'}</td>
                                    <td className="px-5 py-3.5">
                                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded"
                                        style={m.is_active
                                          ? { background: '#001800', color: '#00c000', border: '1px solid rgba(0,192,0,0.25)' }
                                          : { background: '#202020', color: '#555', border: '1px solid #333' }}>
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
                                  <tr key={m.id} className="transition-colors hover:bg-[#282828]"
                                    style={{ borderBottom: i < engineers.length - 1 ? '1px solid #2a2a2a' : 'none' }}>
                                    <td className="px-5 py-3.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{m.username}</span>
                                        {m.is_admin && (
                                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                            style={{ background: '#1e0a2a', color: '#b61bdb', border: '1px solid rgba(182,27,219,0.25)' }}>Admin</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-[#666] text-sm">{m.platform || '—'}</td>
                                    <td className="px-5 py-3.5">
                                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded"
                                        style={m.is_active
                                          ? { background: '#001800', color: '#00c000', border: '1px solid rgba(0,192,0,0.25)' }
                                          : { background: '#202020', color: '#555', border: '1px solid #333' }}>
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
                  )
                })()}
              </div>
            ) : (
              // ── Lista divisioni ────────────────────────
              <>
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
                  <input value={newDivision.name} onChange={e => setNewDivision({...newDivision, name: e.target.value})} className={inputCls} required placeholder="e.g. F1 25 Main" />
                </div>
                <div>
                  <label className="lbl">Simulator</label>
                  <input value={newDivision.simulator} onChange={e => setNewDivision({...newDivision, simulator: e.target.value})} className={inputCls} required placeholder="e.g. F1 25, ACC, iRacing" />
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
                  onClick={() => openDivision(d)}
                  className="flex items-center justify-between px-5 py-4 hover:bg-[#282828] transition-colors cursor-pointer"
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
                    {d.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}