import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import API from '../api'
import Navbar from '../components/Navbar'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

function formatDate(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString('it-IT')
}

function getDurationSeconds(session) {
  if (!session?.started_at || !session?.ended_at) return null
  const start = new Date(session.started_at).getTime()
  const end = new Date(session.ended_at).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null
  return Math.round((end - start) / 1000)
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return 'N/A'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export default function ComparisonDashboard() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [leftId, setLeftId] = useState('')
  const [rightId, setRightId] = useState('')
  const [leftPreview, setLeftPreview] = useState(null)
  const [rightPreview, setRightPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [compareData, setCompareData] = useState(null)
  const [normalizeTime, setNormalizeTime] = useState(true)

  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true)
        const response = await API.get('/sessions')
        const list = (response.data?.sessions || []).sort((a, b) => {
          const bTs = new Date(b.started_at || 0).getTime()
          const aTs = new Date(a.started_at || 0).getTime()
          return bTs - aTs
        })
        setSessions(list)
        if (list.length >= 1) setLeftId(String(list[0].id))
        if (list.length >= 2) setRightId(String(list[1].id))
      } catch {
        setError('Impossibile caricare le sessioni')
      } finally {
        setLoading(false)
      }
    }
    loadSessions()
  }, [])

  const leftSession = useMemo(
    () => sessions.find((s) => String(s.id) === leftId) || null,
    [sessions, leftId]
  )
  const rightSession = useMemo(
    () => sessions.find((s) => String(s.id) === rightId) || null,
    [sessions, rightId]
  )

  const leftDuration = getDurationSeconds(leftSession)
  const rightDuration = getDurationSeconds(rightSession)

  useEffect(() => {
    const loadPreview = async () => {
      if (!leftId && !rightId) return
      setPreviewLoading(true)
      try {
        const [leftRes, rightRes] = await Promise.all([
          leftId ? API.get(`/sessions/${leftId}/decoded-preview?max_packets=120`) : Promise.resolve(null),
          rightId ? API.get(`/sessions/${rightId}/decoded-preview?max_packets=120`) : Promise.resolve(null),
        ])
        setLeftPreview(leftRes?.data || null)
        setRightPreview(rightRes?.data || null)
      } catch {
        setLeftPreview(null)
        setRightPreview(null)
      } finally {
        setPreviewLoading(false)
      }
    }
    loadPreview()
  }, [leftId, rightId])

  useEffect(() => {
    const loadCompare = async () => {
      if (!leftId || !rightId) {
        setCompareData(null)
        return
      }
      try {
        const response = await API.get(
          `/sessions/compare?left_id=${leftId}&right_id=${rightId}&max_packets=180&normalize=${normalizeTime ? 1 : 0}&normalized_points=180`
        )
        setCompareData(response.data)
      } catch {
        setCompareData(null)
      }
    }
    loadCompare()
  }, [leftId, rightId, normalizeTime])

  const avgSpeed = (preview) => {
    if (!preview?.packets?.length) return null
    const samples = preview.packets
      .map((p) => p?.channels?.speed)
      .filter((v) => typeof v === 'number')
    if (!samples.length) return null
    const sum = samples.reduce((acc, v) => acc + v, 0)
    return Number((sum / samples.length).toFixed(1))
  }

  const maxRpm = (preview) => {
    if (!preview?.packets?.length) return null
    const samples = preview.packets
      .map((p) => p?.channels?.engine_rpm)
      .filter((v) => typeof v === 'number')
    if (!samples.length) return null
    return Math.max(...samples)
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#d7d7d7' } },
    },
    scales: {
      x: {
        ticks: { color: '#9a9a9a', maxTicksLimit: 8 },
        grid: { color: 'rgba(255,255,255,0.08)' },
      },
      y: {
        ticks: { color: '#9a9a9a' },
        grid: { color: 'rgba(255,255,255,0.08)' },
      },
    },
  }

  const speedRpmOverlay = useMemo(() => {
    if (!compareData) return null
    return {
      labels: compareData.labels,
      datasets: [
        {
          label: 'A Speed',
          data: compareData.left?.series?.speed || [],
          borderColor: '#f60300',
          pointRadius: 0,
          tension: 0.2,
          borderWidth: 2,
        },
        {
          label: 'B Speed',
          data: compareData.right?.series?.speed || [],
          borderColor: '#ff8a80',
          pointRadius: 0,
          tension: 0.2,
          borderWidth: 2,
        },
        {
          label: 'A RPM',
          data: compareData.left?.series?.engine_rpm || [],
          borderColor: '#45c5ff',
          pointRadius: 0,
          tension: 0.2,
          borderWidth: 2,
        },
        {
          label: 'B RPM',
          data: compareData.right?.series?.engine_rpm || [],
          borderColor: '#9be7ff',
          pointRadius: 0,
          tension: 0.2,
          borderWidth: 2,
        },
      ],
    }
  }, [compareData])

  const pedalOverlay = useMemo(() => {
    if (!compareData) return null
    return {
      labels: compareData.labels,
      datasets: [
        {
          label: 'A Throttle',
          data: compareData.left?.series?.throttle || [],
          borderColor: '#00c853',
          pointRadius: 0,
          tension: 0.2,
          borderWidth: 2,
        },
        {
          label: 'B Throttle',
          data: compareData.right?.series?.throttle || [],
          borderColor: '#b9f6ca',
          pointRadius: 0,
          tension: 0.2,
          borderWidth: 2,
        },
        {
          label: 'A Brake',
          data: compareData.left?.series?.brake || [],
          borderColor: '#ffa726',
          pointRadius: 0,
          tension: 0.2,
          borderWidth: 2,
        },
        {
          label: 'B Brake',
          data: compareData.right?.series?.brake || [],
          borderColor: '#ffe0b2',
          pointRadius: 0,
          tension: 0.2,
          borderWidth: 2,
        },
      ],
    }
  }, [compareData])

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Session Comparison</h1>
          <p className="mt-2 text-sm text-[#aaa]">
            Confronto rapido tra due registrazioni: questa base prepara la fase successiva con overlay canali.
          </p>
        </div>

        <section className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#777]">Sessione A</div>
            <select
              className="mt-3 w-full rounded-md border border-[#2e2e2e] bg-[#111] px-3 py-2 text-sm"
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
            >
              <option value="">Seleziona sessione</option>
              {sessions.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  #{s.id} - Driver {s.driver_id} - {formatDate(s.started_at)}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#777]">Sessione B</div>
            <select
              className="mt-3 w-full rounded-md border border-[#2e2e2e] bg-[#111] px-3 py-2 text-sm"
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
            >
              <option value="">Seleziona sessione</option>
              {sessions.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  #{s.id} - Driver {s.driver_id} - {formatDate(s.started_at)}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="mt-3 grid gap-3 md:grid-cols-2">
          {[leftSession, rightSession].map((session, idx) => (
            <div key={idx} className="rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[#777]">
                {idx === 0 ? 'Dettaglio Sessione A' : 'Dettaglio Sessione B'}
              </div>
              {!session ? (
                <div className="text-sm text-[#999]">Nessuna sessione selezionata.</div>
              ) : (
                <div className="grid gap-2 text-sm text-[#ddd]">
                  <div>ID: {session.id}</div>
                  <div>Driver ID: {session.driver_id}</div>
                  <div>Division ID: {session.division_id}</div>
                  <div>Start: {formatDate(session.started_at)}</div>
                  <div>End: {formatDate(session.ended_at)}</div>
                  <div>Durata: {formatDuration(getDurationSeconds(session))}</div>
                  <div className="truncate">File: {session.file_path || 'N/A'}</div>
                </div>
              )}
            </div>
          ))}
        </section>

        <section className="mt-3 rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[#777]">Delta rapido</div>
          <div className="mb-3 flex items-center gap-2 text-sm text-[#ddd]">
            <input
              id="normalizeTime"
              type="checkbox"
              checked={normalizeTime}
              onChange={(e) => setNormalizeTime(e.target.checked)}
              className="h-4 w-4 accent-[#f60300]"
            />
            <label htmlFor="normalizeTime">Normalize time (resampling)</label>
          </div>
          <div className="grid gap-2 text-sm text-[#ddd] sm:grid-cols-2">
            <div>Delta durata: {formatDuration(leftDuration !== null && rightDuration !== null ? Math.abs(leftDuration - rightDuration) : null)}</div>
            <div>Formato file: {leftPreview?.storage_format || 'N/A'} vs {rightPreview?.storage_format || 'N/A'}</div>
            <div>Pack decodificati: {leftPreview?.packets?.length || 0} vs {rightPreview?.packets?.length || 0}</div>
            <div>Confronto normalizzato: {compareData?.overlay?.normalized ? 'ON' : 'OFF'}</div>
            <div>Avg speed: {avgSpeed(leftPreview) ?? 'N/A'} vs {avgSpeed(rightPreview) ?? 'N/A'} km/h</div>
            <div>Max RPM: {maxRpm(leftPreview) ?? 'N/A'} vs {maxRpm(rightPreview) ?? 'N/A'}</div>
            <div>Delta speed medio: {compareData?.overlay?.avg_abs_delta_speed ?? 'N/A'}</div>
            <div>Delta rpm medio: {compareData?.overlay?.avg_abs_delta_rpm ?? 'N/A'}</div>
            <div>Delta throttle medio: {compareData?.overlay?.avg_abs_delta_throttle ?? 'N/A'}</div>
            <div>Delta brake medio: {compareData?.overlay?.avg_abs_delta_brake ?? 'N/A'}</div>
          </div>
        </section>

        {compareData && (
          <section className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[#777]">Overlay Speed + RPM</div>
              <div className="h-[320px]">
                <Line data={speedRpmOverlay} options={chartOptions} />
              </div>
            </div>
            <div className="rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[#777]">Overlay Throttle + Brake</div>
              <div className="h-[320px]">
                <Line data={pedalOverlay} options={chartOptions} />
              </div>
            </div>
          </section>
        )}

        {previewLoading && (
          <div className="mt-3 rounded-xl border border-[#2b2b2b] bg-[#181818] p-4 text-sm text-[#aaa]">
            Decodifica preview in corso...
          </div>
        )}

        {loading && (
          <div className="mt-4 rounded-xl border border-[#2b2b2b] bg-[#181818] p-4 text-sm text-[#aaa]">
            Caricamento sessioni...
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-[#731313] bg-[#2a1515] p-4 text-sm text-[#f4b8b8]">
            {error}
          </div>
        )}
      </main>
    </div>
  )
}