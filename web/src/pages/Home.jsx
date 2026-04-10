import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import adminCover from '../assets/home_images/admin_dash.webp'
import engineerCover from '../assets/home_images/engineer_dash.webp'
import driverCover from '../assets/home_images/driver_dash.webp'
import profileCover from '../assets/home_images/profile_dash.webp'
import telemetryCover from '../assets/home_images/telemetry_dash.webp'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const cards = useMemo(() => {
    const driverDisabled = user?.is_admin || user?.role === 'engineer'
    const isAdmin = !!user?.is_admin

    const items = [
      {
        title: 'Engineer Dashboard',
        subtitle: 'Open the engineer panel',
        image: engineerCover,
        action: () => navigate('/engineer'),
      },
      {
        title: 'Driver Dashboard',
        subtitle: driverDisabled ? 'Available only for drivers' : 'Open the driver panel',
        image: driverCover,
        action: () => navigate('/driver'),
        disabled: driverDisabled,
      },
      {
        title: 'User Profile',
        subtitle: 'Edit your personal settings',
        image: profileCover,
        action: () => navigate('/profile'),
      },
    ]

    if (isAdmin) {
      items.splice(1, 0, {
        title: 'Live Telemetry',
        subtitle: 'Admin test mode only',
        image: telemetryCover,
        action: () => navigate('/live'),
      })
      items.splice(3, 0, {
        title: 'Session Comparison',
        subtitle: 'Admin test mode only',
        image: telemetryCover,
        action: () => navigate('/compare'),
      })
    }

    if (isAdmin) {
      items.unshift({
        title: 'Admin Page',
        subtitle: 'Manage users, divisions and settings',
        image: adminCover,
        action: () => navigate('/admin'),
      })
    }

    return items
  }, [navigate, user?.is_admin, user?.role])

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white">
      <Navbar showNavButtons={false} />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Benvenuto, {user?.username ?? 'utente'}</h1>
          <p className="text-lg text-[#999] max-w-3xl mx-auto">
            La piattaforma completa per la gestione e l'analisi dei dati di telemetria. 
            Accedi ai tuoi dashboard personalizzati per monitorare prestazioni, gestire utenti e configurare il sistema.
          </p>
          <p className="text-sm text-[#777] mt-4">
            Seleziona la sezione che desideri aprire. La pagina Admin è visibile solo per gli amministratori.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <button
              key={card.title}
              type="button"
              onClick={card.disabled ? undefined : card.action}
              disabled={card.disabled}
              className={`group overflow-hidden rounded-3xl border text-left shadow-xl shadow-black/20 transition-all duration-300 ${card.disabled ? 'border-[#444] bg-[#151515] cursor-not-allowed filter grayscale opacity-70' : 'border-[#333] bg-[#181818] hover:-translate-y-2 hover:border-[#f60300] hover:shadow-2xl'}`}
            >
              <div className="relative h-[374px] overflow-hidden">
                <img
                  src={card.image}
                  alt={card.title}
                  className={`h-full w-full object-cover transition-transform duration-500 ${card.disabled ? '' : 'group-hover:scale-110'}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/95 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-xl font-semibold text-white mb-1">{card.title}</h2>
                  <p className="text-sm text-[#ccc]">{card.subtitle}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-[#999] text-sm">
            Per assistenza o domande, contatta il supporto tecnico.
          </p>
        </div>
      </div>
    </div>
  )
}
