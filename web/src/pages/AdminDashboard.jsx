import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../api'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [divisions, setDivisions] = useState([])
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showCreateDivision, setShowCreateDivision] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'driver', platform: 'PC', team_category: 'Main', is_admin: false })
  const [newDivision, setNewDivision] = useState({ name: '', simulator: '' })
  const [assign, setAssign] = useState({ user_id: '', division_id: '' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchUsers()
    fetchDivisions()
  }, [])

  const fetchUsers = async () => {
    const res = await API.get('/admin/users')
    setUsers(res.data.users)
  }

  const fetchDivisions = async () => {
    const res = await API.get('/divisions')
    setDivisions(res.data.divisions)
  }

  const notify = (msg) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      await API.post('/admin/users', newUser)
      notify('Utente creato!')
      setShowCreateUser(false)
      setNewUser({ username: '', password: '', role: 'driver', platform: 'PC', team_category: 'Main', is_admin: false })
      fetchUsers()
    } catch (err) {
      notify(err.response?.data?.detail || 'Errore')
    }
  }

  const handleCreateDivision = async (e) => {
    e.preventDefault()
    try {
      await API.post('/admin/divisions', newDivision)
      notify('Divisione creata!')
      setShowCreateDivision(false)
      setNewDivision({ name: '', simulator: '' })
      fetchDivisions()
    } catch (err) {
      notify(err.response?.data?.detail || 'Errore')
    }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    try {
      await API.post('/admin/divisions/assign', {
        user_id: parseInt(assign.user_id),
        division_id: parseInt(assign.division_id)
      })
      notify('Utente assegnato!')
      setShowAssign(false)
      setAssign({ user_id: '', division_id: '' })
    } catch (err) {
      notify(err.response?.data?.detail || 'Errore')
    }
  }

  const toggleActive = async (u) => {
    await API.patch(`/admin/users/${u.id}`, { is_active: !u.is_active })
    fetchUsers()
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const inputClass = "w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:border-red-500 transition"
  const labelClass = "block text-gray-400 text-sm mb-1"

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <span className="font-bold text-sm">T</span>
          </div>
          <span className="font-semibold">Tatum Telemetry</span>
          <span className="bg-red-600/20 text-red-400 text-xs px-2 py-1 rounded-lg">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          {user?.role === 'engineer' && (
            <button onClick={() => navigate('/engineer')} className="text-gray-400 hover:text-white text-sm transition">
              Dashboard
            </button>
          )}
          <span className="text-gray-400 text-sm">{user?.username}</span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm transition">Esci</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Pannello Admin</h1>
          <p className="text-gray-400 mt-2">Gestisci utenti e divisioni</p>
        </div>

        {/* Notifica */}
        {message && (
          <div className="bg-green-900/30 border border-green-700 text-green-400 rounded-xl px-4 py-3 mb-6 text-sm">
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('users')}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${tab === 'users' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Utenti ({users.length})
          </button>
          <button
            onClick={() => setTab('divisions')}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${tab === 'divisions' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Divisioni ({divisions.length})
          </button>
        </div>

        {/* TAB UTENTI */}
        {tab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Utenti</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAssign(!showAssign)}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm transition"
                >
                  Assegna divisione
                </button>
                <button
                  onClick={() => setShowCreateUser(!showCreateUser)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm transition"
                >
                  + Nuovo utente
                </button>
              </div>
            </div>

            {/* Form assegna divisione */}
            {showAssign && (
              <form onSubmit={handleAssign} className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Utente</label>
                  <select value={assign.user_id} onChange={e => setAssign({...assign, user_id: e.target.value})} className={inputClass} required>
                    <option value="">Seleziona utente</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Divisione</label>
                  <select value={assign.division_id} onChange={e => setAssign({...assign, division_id: e.target.value})} className={inputClass} required>
                    <option value="">Seleziona divisione</option>
                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2 flex gap-2">
                  <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-sm transition">Assegna</button>
                  <button type="button" onClick={() => setShowAssign(false)} className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2 rounded-xl text-sm transition">Annulla</button>
                </div>
              </form>
            )}

            {/* Form crea utente */}
            {showCreateUser && (
              <form onSubmit={handleCreateUser} className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Username</label>
                  <input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className={inputClass} required placeholder="Username" />
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className={inputClass} required placeholder="Password" />
                </div>
                <div>
                  <label className={labelClass}>Ruolo</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className={inputClass}>
                    <option value="driver">Driver</option>
                    <option value="engineer">Engineer</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Piattaforma</label>
                  <select value={newUser.platform} onChange={e => setNewUser({...newUser, platform: e.target.value})} className={inputClass}>
                    <option value="PC">PC</option>
                    <option value="PS5">PS5</option>
                    <option value="Xbox">Xbox</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Team Category</label>
                  <select value={newUser.team_category} onChange={e => setNewUser({...newUser, team_category: e.target.value})} className={inputClass}>
                    <option value="Main">Main</option>
                    <option value="Next Gen">Next Gen</option>
                    <option value="Test">Test</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" id="is_admin" checked={newUser.is_admin} onChange={e => setNewUser({...newUser, is_admin: e.target.checked})} className="w-4 h-4" />
                  <label htmlFor="is_admin" className="text-gray-400 text-sm">Admin</label>
                </div>
                <div className="col-span-2 flex gap-2">
                  <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-sm transition">Crea utente</button>
                  <button type="button" onClick={() => setShowCreateUser(false)} className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2 rounded-xl text-sm transition">Annulla</button>
                </div>
              </form>
            )}

            {/* Tabella utenti */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-400 text-sm px-6 py-4">Username</th>
                    <th className="text-left text-gray-400 text-sm px-6 py-4">Ruolo</th>
                    <th className="text-left text-gray-400 text-sm px-6 py-4">Team</th>
                    <th className="text-left text-gray-400 text-sm px-6 py-4">Porta</th>
                    <th className="text-left text-gray-400 text-sm px-6 py-4">Stato</th>
                    <th className="text-left text-gray-400 text-sm px-6 py-4">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-800 last:border-0">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{u.username}</span>
                          {u.is_admin && <span className="bg-red-600/20 text-red-400 text-xs px-2 py-0.5 rounded">Admin</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 capitalize">{u.role}</td>
                      <td className="px-6 py-4 text-gray-400">{u.team_category || '—'}</td>
                      <td className="px-6 py-4 text-gray-400 font-mono">{u.port || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-lg ${u.is_active ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                          {u.is_active ? 'Attivo' : 'Disabilitato'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActive(u)}
                          className="text-gray-400 hover:text-white text-sm transition"
                        >
                          {u.is_active ? 'Disabilita' : 'Abilita'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB DIVISIONI */}
        {tab === 'divisions' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Divisioni</h2>
              <button
                onClick={() => setShowCreateDivision(!showCreateDivision)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm transition"
              >
                + Nuova divisione
              </button>
            </div>

            {showCreateDivision && (
              <form onSubmit={handleCreateDivision} className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nome divisione</label>
                  <input value={newDivision.name} onChange={e => setNewDivision({...newDivision, name: e.target.value})} className={inputClass} required placeholder="es. F1 25 Main" />
                </div>
                <div>
                  <label className={labelClass}>Simulatore</label>
                  <input value={newDivision.simulator} onChange={e => setNewDivision({...newDivision, simulator: e.target.value})} className={inputClass} required placeholder="es. F1 25, ACC, iRacing" />
                </div>
                <div className="col-span-2 flex gap-2">
                  <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-sm transition">Crea divisione</button>
                  <button type="button" onClick={() => setShowCreateDivision(false)} className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2 rounded-xl text-sm transition">Annulla</button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {divisions.map(d => (
                <div key={d.id} className="bg-gray-900 rounded-2xl p-5 border border-gray-800 flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{d.name}</p>
                    <p className="text-gray-400 text-sm">{d.simulator}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg ${d.is_active ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                    {d.is_active ? 'Attiva' : 'Disattiva'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
