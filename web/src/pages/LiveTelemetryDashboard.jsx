import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://4.232.170.59:30001'
const HISTORY_SIZE = 120

const channelCards = [
  { key: 'speed', label: 'Speed', unit: 'km/h' },
  { key: 'engine_rpm', label: 'Engine RPM', unit: 'rpm' },
  { key: 'gear', label: 'Gear', unit: '' },
  { key: 'throttle', label: 'Throttle', unit: '%' },
  { key: 'brake', label: 'Brake', unit: '%' },
  { key: 'steer', label: 'Steer', unit: '' },
  { key: 'drs_active', label: 'DRS', unit: '' },
  { key: 'engine_temperature', label: 'Engine Temp', unit: 'C' },
  { key: 'tyre_temperature_fl', label: 'Tyre FL', unit: 'C' },
]

const compareStackConfig = [
  { key: 'speed', label: 'SPEED', color: '#f60300' },
  { key: 'engine_rpm', label: 'RPMS', color: '#45c5ff' },
  { key: 'gear', label: 'GEAR', color: '#fdd835' },
  { key: 'brake', label: 'BRAKE', color: '#ffa726' },
  { key: 'throttle', label: 'THROTTLE', color: '#00c853' },
]

function formatValue(value, unit = '') {
  if (value === null || value === undefined) return '---'
  if (typeof value === 'boolean') return value ? 'ON' : 'OFF'
  const normalized = typeof value === 'number' ? Number(value.toFixed(2)) : value
  return unit ? `${normalized} ${unit}` : String(normalized)
}

export default function LiveTelemetryDashboard() {
  const { user, connectedDriver } = useAuth()
  const [port, setPort] = useState(user?.port ? String(user.port) : '')
  const [status, setStatus] = useState('disconnected')
  const [telemetry, setTelemetry] = useState(null)
  const [error, setError] = useState(null)
  const [packetType, setPacketType] = useState('N/A')
  const [lastUpdateMs, setLastUpdateMs] = useState(null)
  const wsRef = useRef(null)
  const wsPortRef = useRef(null)
  const historyRef = useRef({
    labels: [],
    speed: [],
    rpm: [],
    gear: [],
    steer: [],
    throttle: [],
    brake: [],
  })
  const [, forceRender] = useState(0)

  useEffect(() => {
    if (user?.port && !port) setPort(String(user.port))
  }, [user, port])

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const pushHistory = (payload) => {
    const channels = payload?.channels || {}
    const timestamp = new Date().toLocaleTimeString('it-IT', { hour12: false })
    const store = historyRef.current

    store.labels.push(timestamp)
    store.speed.push(channels.speed ?? null)
    store.rpm.push(channels.engine_rpm ?? null)
    store.gear.push(channels.gear ?? null)
    store.steer.push(channels.steer ?? null)
    store.throttle.push(channels.throttle ?? null)
    store.brake.push(channels.brake ?? null)

    if (store.labels.length > HISTORY_SIZE) {
      store.labels.shift()
      store.speed.shift()
      store.rpm.shift()
      store.gear.shift()
      store.steer.shift()
      store.throttle.shift()
      store.brake.shift()
    }
    forceRender((v) => v + 1)
  }

  const connectToPort = (targetPort) => {
    if (!targetPort || Number.isNaN(Number(targetPort))) {
      setError('Nessuna porta valida disponibile')
      return
    }
    if (wsRef.current && wsPortRef.current === String(targetPort)) {
      return
    }
    if (wsRef.current) wsRef.current.close()

    setError(null)
    setStatus('connecting')
    wsPortRef.current = String(targetPort)
    const ws = new WebSocket(`${WS_URL}/ws/decoded/${targetPort}`)
    wsRef.current = ws

    ws.onopen = () => setStatus('connected')

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        setTelemetry(payload)
        setPacketType(payload.type || 'N/A')
        if (payload.timestamp) {
          setLastUpdateMs(Math.max(0, Math.round((Date.now() / 1000 - payload.timestamp) * 1000)))
        }
        pushHistory(payload)
      } catch {
        setTelemetry({ raw: event.data })
      }
    }

    ws.onclose = () => {
      setStatus('disconnected')
      wsRef.current = null
      wsPortRef.current = null
    }

    ws.onerror = () => {
      setStatus('error')
      setError('Impossibile aprire la connessione WebSocket decoded')
      ws.close()
    }
  }

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    wsPortRef.current = null
    setStatus('disconnected')
  }

  useEffect(() => {
    const targetPort = connectedDriver?.port ?? user?.port
    if (!targetPort) {
      disconnect()
      setTelemetry(null)
      setPacketType('N/A')
      setLastUpdateMs(null)
      return
    }
    setPort(String(targetPort))
    connectToPort(String(targetPort))
  }, [connectedDriver, user?.port])

  const speedRpmData = useMemo(() => ({
    labels: historyRef.current.labels,
    datasets: [
      {
        label: 'Speed',
        data: historyRef.current.speed,
        borderColor: '#f60300',
        backgroundColor: 'rgba(246,3,0,0.15)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'Engine RPM',
        data: historyRef.current.rpm,
        borderColor: '#45c5ff',
        backgroundColor: 'rgba(69,197,255,0.15)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2,
      },
    ],
  }), [telemetry])

  const pedalData = useMemo(() => ({
    labels: historyRef.current.labels,
    datasets: [
      {
        label: 'Throttle',
        data: historyRef.current.throttle,
        borderColor: '#00c853',
        backgroundColor: 'rgba(0,200,83,0.12)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'Brake',
        data: historyRef.current.brake,
        borderColor: '#ffa726',
        backgroundColor: 'rgba(255,167,38,0.12)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2,
      },
    ],
  }), [telemetry])

  const compareStackSeries = useMemo(() => {
    const h = historyRef.current
    const map = {
      speed: h.speed,
      engine_rpm: h.rpm,
      gear: h.gear,
      brake: h.brake,
      throttle: h.throttle,
    }
    return compareStackConfig.map((cfg) => ({
      ...cfg,
      labels: h.labels,
      values: map[cfg.key] || [],
      latest: (map[cfg.key] || [])[Math.max(0, (map[cfg.key] || []).length - 1)],
    }))
  }, [telemetry])

  const recentInputInsights = useMemo(() => {
    const h = historyRef.current
    const lookback = 40
    const throttle = h.throttle.slice(-lookback)
    const brake = h.brake.slice(-lookback)
    if (!throttle.length || !brake.length) {
      return {
        overlapPct: null,
        brakePeaks: 0,
        releaseSmoothness: null,
      }
    }

    let overlap = 0
    let peaks = 0
    let prev = brake[0] ?? 0
    let downSlopeEvents = 0

    for (let i = 0; i < brake.length; i++) {
      const b = Number(brake[i] ?? 0)
      const t = Number(throttle[i] ?? 0)
      if (b > 0.1 && t > 0.1) overlap += 1
      if (i > 0 && b >= 0.75 && prev < 0.75) peaks += 1
      if (i > 0 && prev - b > 0.08) downSlopeEvents += 1
      prev = b
    }

    return {
      overlapPct: Math.round((overlap / brake.length) * 100),
      brakePeaks: peaks,
      releaseSmoothness: Math.max(0, 100 - downSlopeEvents * 8),
    }
  }, [telemetry])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#d7d7d7' } },
    },
    scales: {
      x: {
        ticks: { color: '#9a9a9a', maxTicksLimit: 6 },
        grid: { color: 'rgba(255,255,255,0.08)' },
      },
      y: {
        ticks: { color: '#9a9a9a' },
        grid: { color: 'rgba(255,255,255,0.08)' },
      },
    },
  }

  const miniChartOptions = {
    ...chartOptions,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { display: false },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
      y: {
        ticks: { color: '#808080', maxTicksLimit: 3 },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
    },
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Live Telemetry</h1>
            <p className="mt-2 text-sm text-[#aaa]">
              Layout MoTeC-style: lettura canali SPEED/RPMS/GEAR/BRAKE/THROTTLE per micro-settori live.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#777]">Porta pilota</div>
              <div className="mt-2 text-lg font-semibold">{port || 'N/A'}</div>
            </div>
            <div className="rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#777]">Stato</div>
              <div className="mt-2 text-lg font-semibold capitalize">{status}</div>
            </div>
            <div className="rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#777]">Packet Type</div>
              <div className="mt-2 text-lg font-semibold">{packetType}</div>
            </div>
            <div className="rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#777]">Ultimo update</div>
              <div className="mt-2 text-lg font-semibold">{lastUpdateMs === null ? 'N/A' : `${lastUpdateMs} ms`}</div>
            </div>
          </div>
        </div>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[#777]">Speed vs RPM</div>
            <div className="h-[280px]">
              <Line data={speedRpmData} options={chartOptions} />
            </div>
          </div>
          <div className="rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[#777]">Pedals</div>
            <div className="h-[280px]">
              <Line data={pedalData} options={chartOptions} />
            </div>
          </div>
        </section>

        <section className="mt-3 rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.18em] text-[#777]">Compare Stack (MoTeC Style)</div>
            <div className="text-[11px] text-[#888]">Asse X = micro-settori campionati</div>
          </div>
          <div className="grid gap-3">
            {compareStackSeries.map((series) => (
              <div key={series.key} className="rounded-md border border-[#2a2a2a] bg-[#141414] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-[0.14em]" style={{ color: series.color }}>
                    {series.label}
                  </span>
                  <span className="text-xs text-[#c8c8c8]">{formatValue(series.latest)}</span>
                </div>
                <div className="h-[90px]">
                  <Line
                    data={{
                      labels: series.labels,
                      datasets: [{
                        data: series.values,
                        borderColor: series.color,
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.2,
                      }],
                    }}
                    options={miniChartOptions}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {channelCards.map((channel) => (
            <div key={channel.key} className="rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#777]">{channel.label}</div>
              <div className="mt-3 text-2xl font-semibold text-white">
                {formatValue(telemetry?.channels?.[channel.key], channel.unit)}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-3 rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[#777]">Driver Input Insights</div>
          <div className="grid gap-2 text-sm text-[#ddd] sm:grid-cols-3">
            <div>Brake/Throttle overlap: {recentInputInsights.overlapPct ?? 'N/A'}%</div>
            <div>Brake peak events (window): {recentInputInsights.brakePeaks}</div>
            <div>Brake release smoothness: {recentInputInsights.releaseSmoothness ?? 'N/A'}%</div>
          </div>
        </section>

        <section className="mt-3 rounded-xl border border-[#2b2b2b] bg-[#181818] p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-[#777]">Live payload</div>
          <pre className="mt-3 max-h-[300px] overflow-auto text-[12px] leading-5 text-[#ddd]">
            {telemetry ? JSON.stringify(telemetry, null, 2) : 'Nessun dato ricevuto ancora.'}
          </pre>
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-[#731313] bg-[#2a1515] p-4 text-sm text-[#f4b8b8]">
            {error}
          </div>
        )}
      </main>
    </div>
  )
}
