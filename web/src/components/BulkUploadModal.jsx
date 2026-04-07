import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import API from '../api'

const VALID_ROLES     = ['driver', 'engineer']
const VALID_PLATFORMS = ['PC', 'PS5', 'Xbox']
const VALID_CATS      = ['Main', 'Next Gen', 'Test']

const TEMPLATE_HEADERS = [
  'username', 'password', 'role', 'platform', 'team_category', 'is_admin', 'is_superuser', 'division_id'
]

const inputCls = 'w-full bg-[#1c1c1c] text-white text-sm rounded-md px-3.5 py-2.5 border border-[#333] focus:outline-none focus:border-[#f60300] transition-colors placeholder-[#444]'
const btnPri   = 'px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider bg-[#f60300] text-white hover:bg-[#d90200] transition-colors'
const btnSec   = 'px-4 py-2 rounded-md text-xs font-medium bg-[#282828] text-[#999] hover:bg-[#333] hover:text-white transition-colors border border-[#333]'

function validateRow(row, idx) {
  const errors = []
  if (!row.username || String(row.username).trim() === '')
    errors.push('Username mancante')
  if (!row.password || String(row.password).trim() === '')
    errors.push('Password mancante')
  if (!row.role || !VALID_ROLES.includes(String(row.role).toLowerCase()))
    errors.push(`Role non valido (usa: ${VALID_ROLES.join(', ')})`)
  if (row.platform && !VALID_PLATFORMS.includes(row.platform))
    errors.push(`Platform non valida (usa: ${VALID_PLATFORMS.join(', ')})`)
  if (row.team_category && !VALID_CATS.includes(row.team_category))
    errors.push(`Team category non valida (usa: ${VALID_CATS.join(', ')})`)
  return errors
}

function normalizeRow(raw) {
  const isAdmin      = raw.is_admin
  const isSuperuser  = raw.is_superuser
  return {
    username:      String(raw.username ?? '').trim(),
    password:      String(raw.password ?? '').trim(),
    role:          String(raw.role ?? '').toLowerCase().trim(),
    platform:      raw.platform ? String(raw.platform).trim() : null,
    team_category: raw.team_category ? String(raw.team_category).trim() : null,
    is_admin:      isAdmin     === true || String(isAdmin).toLowerCase()     === 'true' || isAdmin     === 1,
    is_superuser:  isSuperuser === true || String(isSuperuser).toLowerCase() === 'true' || isSuperuser === 1,
    division_id:   raw.division_id ? parseInt(raw.division_id) || null : null,
  }
}

function downloadTemplate() {
  const sampleData = [
    TEMPLATE_HEADERS,
    ['mario.rossi',   'Password1!', 'driver',   'PC', 'Main',     'false', 'false', ''],
    ['luigi.bianchi', 'Password2!', 'engineer', '',   'Next Gen', 'false', 'false', ''],
  ]
  const ws = XLSX.utils.aoa_to_sheet(sampleData)
  ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Users')
  XLSX.writeFile(wb, 'tatum_users_template.xlsx')
}

export default function BulkUploadModal({ divisions, onClose, onSuccess }) {
  const fileRef           = useRef(null)
  const [rows, setRows]   = useState([])       // dati parsati
  const [rowErrors, setRowErrors] = useState({}) // idx -> [errors]
  const [fileName, setFileName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [results, setResults]   = useState(null) // risposta API dopo upload
  const [dragOver, setDragOver] = useState(false)

  const parseFile = (file) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb      = XLSX.read(e.target.result, { type: 'array' })
        const ws      = wb.Sheets[wb.SheetNames[0]]
        const raw     = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const normalized = raw.map(normalizeRow)
        const errors  = {}
        normalized.forEach((r, i) => {
          const errs = validateRow(r, i)
          if (errs.length) errors[i] = errs
        })
        setRows(normalized)
        setRowErrors(errors)
        setResults(null)
      } catch {
        setRows([])
        setRowErrors({ '-1': ['File non leggibile o formato non valido'] })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) parseFile(e.target.files[0])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  const hasErrors    = Object.keys(rowErrors).length > 0
  const validRows    = rows.filter((_, i) => !rowErrors[i])
  const invalidCount = Object.keys(rowErrors).filter(k => k !== '-1').length

  const handleUpload = async () => {
    if (!validRows.length) return
    setLoading(true)
    try {
      const r = await API.post('/admin/users/bulk', { users: validRows })
      setResults(r.data)
      onSuccess?.()
    } catch (err) {
      setResults({ error: err.response?.data?.detail || 'Errore durante l\'upload' })
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setRows([])
    setRowErrors({})
    setFileName('')
    setResults(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-[#1c1c1c] border border-[#333] rounded-md w-full max-w-4xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#2a2a2a]">
          <div>
            <h2 className="font-bold text-base">Import utenti da Excel</h2>
            <p className="text-[#555] text-xs mt-0.5">Carica un file .xlsx per creare più utenti contemporaneamente</p>
          </div>
          <button onClick={() => onClose()} className="text-[#555] hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Template download */}
          <div className="flex items-center justify-between bg-[#222] border border-[#2a2a2a] rounded-md px-4 py-3">
            <div>
              <p className="text-sm font-medium">Template Excel</p>
              <p className="text-[#555] text-xs mt-0.5">
                Colonne: username, password, role, platform, team_category, is_admin, is_superuser, division_id
              </p>
            </div>
            <button onClick={downloadTemplate} className={btnSec}>
              ↓ Scarica template
            </button>
          </div>

          {/* Drop zone */}
          {!results && (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors"
              style={{ borderColor: dragOver ? '#f60300' : '#333', background: dragOver ? '#1e0000' : 'transparent' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mx-auto mb-3 text-[#555]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {fileName
                ? <p className="text-sm font-medium text-white">{fileName}</p>
                : <p className="text-sm text-[#666]">Trascina un file .xlsx qui oppure <span className="text-[#f60300]">clicca per selezionarlo</span></p>
              }
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </div>
          )}

          {/* Errori di parsing globali */}
          {rowErrors['-1'] && (
            <div className="rounded-md px-4 py-3 text-sm border border-[#f60300]/30 bg-[#1e0000] text-[#f60300]">
              {rowErrors['-1'][0]}
            </div>
          )}

          {/* Anteprima tabella */}
          {rows.length > 0 && !results && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-widest text-[#555] font-semibold">
                  Anteprima — {rows.length} righe
                  {invalidCount > 0 && <span className="text-[#f60300] ml-2">({invalidCount} con errori)</span>}
                </p>
                <button onClick={reset} className={btnSec}>Rimuovi file</button>
              </div>

              <div className="border border-[#333] rounded-md overflow-auto max-h-72">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: '#161616', borderBottom: '1px solid #333' }}>
                      <th className="text-left px-3 py-2.5 text-[#555] font-semibold uppercase tracking-widest">#</th>
                      {['Username', 'Password', 'Role', 'Platform', 'Team', 'Admin', 'Super', 'Division', 'Stato'].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[#555] font-semibold uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const errs   = rowErrors[i]
                      const ok     = !errs
                      const divName = r.division_id
                        ? divisions.find(d => d.id === r.division_id)?.name ?? `ID ${r.division_id}`
                        : '—'
                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: i < rows.length - 1 ? '1px solid #222' : 'none',
                            background: ok ? 'transparent' : '#1e0800',
                          }}
                        >
                          <td className="px-3 py-2 text-[#444] font-mono">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-white">{r.username || <span className="text-[#f60300]">—</span>}</td>
                          <td className="px-3 py-2 text-[#666]">{'•'.repeat(Math.min(r.password?.length ?? 0, 8))}</td>
                          <td className="px-3 py-2 capitalize text-[#888]">{r.role || <span className="text-[#f60300]">—</span>}</td>
                          <td className="px-3 py-2 text-[#666]">{r.platform || '—'}</td>
                          <td className="px-3 py-2 text-[#666]">{r.team_category || '—'}</td>
                          <td className="px-3 py-2 text-[#666]">{r.is_admin ? 'Sì' : 'No'}</td>
                          <td className="px-3 py-2 text-[#666]">{r.is_superuser ? 'Sì' : 'No'}</td>
                          <td className="px-3 py-2 text-[#666]">{divName}</td>
                          <td className="px-3 py-2">
                            {ok
                              ? <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: '#001800', color: '#00c000', border: '1px solid rgba(0,192,0,0.25)' }}>OK</span>
                              : <span title={errs.join('\n')} className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded cursor-help" style={{ background: '#1e0000', color: '#f60300', border: '1px solid rgba(246,3,0,0.25)' }}>Errori</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Dettagli errori */}
              {invalidCount > 0 && (
                <div className="mt-3 space-y-1">
                  {Object.entries(rowErrors).filter(([k]) => k !== '-1').map(([idx, errs]) => (
                    <div key={idx} className="text-xs text-[#f60300]">
                      Riga {parseInt(idx) + 1}: {errs.join(' · ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Risultati upload */}
          {results && (
            <div>
              {results.error
                ? (
                  <div className="rounded-md px-4 py-3 text-sm border border-[#f60300]/30 bg-[#1e0000] text-[#f60300]">{results.error}</div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-md px-4 py-3 text-sm border border-[#00c000]/30 bg-[#001800] text-[#00c000]">
                      Import completato — {results.created} / {results.total} utenti creati con successo
                    </div>
                    {results.results?.some(r => !r.success) && (
                      <div className="border border-[#333] rounded-md overflow-auto max-h-48">
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: '#161616', borderBottom: '1px solid #333' }}>
                              <th className="text-left px-3 py-2 text-[#555] font-semibold uppercase tracking-widest">Username</th>
                              <th className="text-left px-3 py-2 text-[#555] font-semibold uppercase tracking-widest">Esito</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.results.map((r, i) => (
                              <tr key={i} style={{ borderBottom: i < results.results.length - 1 ? '1px solid #222' : 'none' }}>
                                <td className="px-3 py-2 font-medium">{r.username}</td>
                                <td className="px-3 py-2">
                                  {r.success
                                    ? <span className="text-[#00c000]">Creato</span>
                                    : <span className="text-[#f60300]">{r.error}</span>
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              }
            </div>
          )}

          {/* Footer actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#2a2a2a]">
            {results
              ? <button onClick={() => onClose(true)} className={btnPri}>Chiudi</button>
              : (
                <>
                  <button onClick={() => onClose(false)} className={btnSec}>Annulla</button>
                  {validRows.length > 0 && (
                    <button
                      onClick={handleUpload}
                      disabled={loading}
                      className={`${btnPri} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {loading
                        ? 'Caricamento...'
                        : `Crea ${validRows.length} utent${validRows.length === 1 ? 'e' : 'i'}`
                      }
                    </button>
                  )}
                </>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}
