import { useState } from 'react'
import API from '../api'
import { useAuth } from '../context/AuthContext'
import PasswordInput from './PasswordInput'

export default function ProfileModal({ onClose }) {
  const { user, login } = useAuth()
  const [form, setForm] = useState({
    username: user?.username || '',
    password: '',
    platform: user?.platform || 'PC'
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {}
      if (form.username !== user.username) payload.username = form.username
      if (form.password) payload.password = form.password
      if (form.platform !== user.platform) payload.platform = form.platform
      if (Object.keys(payload).length === 0) {
        setError('No changes made')
        setLoading(false)
        return
      }
      await API.patch('/auth/profile', payload)
      setMessage('Profile updated!')
      setTimeout(() => onClose(true), 1500)
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
      <div className="bg-[#222] border border-[#333] rounded-md w-full max-w-md p-7">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="lbl mb-0.5">Account</p>
            <h2 className="font-bold text-base">My profile</h2>
          </div>
          <button onClick={() => onClose(false)} className="text-[#555] hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="lbl">Username</label>
            <input
              value={form.username}
              onChange={e => setForm({...form, username: e.target.value})}
              className={inputCls}
              placeholder="Username"
            />
          </div>
          <div>
            <label className="lbl">New password</label>
            <PasswordInput
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              className={inputCls}
              placeholder="Leave blank to keep unchanged"
            />
          </div>
          <div>
            <label className="lbl">Platform</label>
            <select
              value={form.platform}
              onChange={e => setForm({...form, platform: e.target.value})}
              className={selCls}
            >
              <option value="PC">PC</option>
              <option value="PS5">PS5</option>
              <option value="Xbox">Xbox</option>
            </select>
          </div>

          {error   && <div className="rounded-md px-3.5 py-2.5 text-sm bg-[#1c0000] border border-[#f60300]/40 text-[#ff7070]">{error}</div>}
          {message && <div className="rounded-md px-3.5 py-2.5 text-sm bg-[#001800] border border-[#00c000]/30 text-[#00c000]">{message}</div>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#f60300] hover:bg-[#d90200] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-md py-2.5 text-sm transition-colors"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => onClose(false)}
              className="flex-1 bg-[#282828] hover:bg-[#333] text-[#999] hover:text-white font-medium rounded-md py-2.5 text-sm transition-colors border border-[#333]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}