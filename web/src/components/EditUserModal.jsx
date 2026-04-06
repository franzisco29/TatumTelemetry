import { useState } from 'react'
import API from '../api'
import PasswordInput from './PasswordInput'

export default function EditUserModal({ user, divisions = [], onClose }) {
  const [form, setForm] = useState({
    username: user.username || '',
    password: '',
    role: user.role || 'driver',
    is_admin: user.is_admin || false,
    is_active: user.is_active ?? true,
    platform: user.platform || 'PC',
    team_category: user.team_category || 'Main',
    division_id: ''
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        username: form.username,
        role: form.role,
        is_admin: form.is_admin,
        is_active: form.is_active,
        platform: form.platform,
        team_category: form.team_category
      }
      if (form.password) payload.password = form.password
      await API.patch(`/admin/users/${user.id}/full`, payload)
      if (form.division_id) {
        await API.post('/admin/divisions/assign', { user_id: user.id, division_id: parseInt(form.division_id) })
      }
      setMessage('User updated!')
      setTimeout(() => onClose(true), 500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-[#1c1c1c] text-white text-sm rounded-md px-3.5 py-2.5 border border-[#333] focus:outline-none focus:border-[#f60300] transition-colors placeholder-[#444]'
  const selCls   = `${inputCls} sel`

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4">
      <div className="bg-[#222] border border-[#333] rounded-md w-full max-w-lg p-7">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="lbl mb-0.5">Admin</p>
            <h2 className="font-bold text-base">Edit {user.username}</h2>
          </div>
          <button onClick={() => onClose(false)} className="text-[#555] hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <label className="lbl">Username</label>
            <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className={inputCls} />
          </div>
          <div>
            <label className="lbl">New password</label>
            <PasswordInput value={form.password} onChange={e => setForm({...form, password: e.target.value})} className={inputCls} placeholder="Leave blank to keep unchanged" />
          </div>
          <div>
            <label className="lbl">Role</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className={selCls}>
              <option value="driver">Driver</option>
              <option value="engineer">Engineer</option>
            </select>
          </div>
          <div>
            <label className="lbl">Platform</label>
            <select value={form.platform} onChange={e => setForm({...form, platform: e.target.value})} className={selCls}>
              <option value="PC">PC</option>
              <option value="PS5">PS5</option>
              <option value="Xbox">Xbox</option>
            </select>
          </div>
          <div>
            <label className="lbl">Team Category</label>
            <select value={form.team_category} onChange={e => setForm({...form, team_category: e.target.value})} className={selCls}>
              <option value="Main">Main</option>
              <option value="Next Gen">Next Gen</option>
              <option value="Test">Test</option>
            </select>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_admin} onChange={e => setForm({...form, is_admin: e.target.checked})} className="w-4 h-4 accent-[#f60300]" />
              <span className="text-[#999] text-xs uppercase tracking-wider">Admin</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-4 h-4 accent-[#f60300]" />
              <span className="text-[#999] text-xs uppercase tracking-wider">Active</span>
            </label>
          </div>

          {divisions.length > 0 && (
            <div className="col-span-2">
              <label className="lbl">Assign division <span className="text-[#555] normal-case tracking-normal" style={{fontSize:'10px'}}>(optional)</span></label>
              <select value={form.division_id} onChange={e => setForm({...form, division_id: e.target.value})} className={selCls}>
                <option value="">No change</option>
                {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          {error   && <div className="col-span-2 rounded-md px-3.5 py-2.5 text-sm bg-[#1c0000] border border-[#f60300]/40 text-[#ff7070]">{error}</div>}
          {message && <div className="col-span-2 rounded-md px-3.5 py-2.5 text-sm bg-[#001800] border border-[#00c000]/30 text-[#00c000]">{message}</div>}

          <div className="col-span-2 flex gap-2 pt-2">
            <button type="submit" disabled={loading} className="flex-1 bg-[#f60300] hover:bg-[#d90200] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-md py-2.5 text-sm transition-colors">
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => onClose(false)} className="flex-1 bg-[#282828] hover:bg-[#333] text-[#999] hover:text-white font-medium rounded-md py-2.5 text-sm transition-colors border border-[#333]">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}