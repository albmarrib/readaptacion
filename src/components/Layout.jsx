import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useAvisos } from '../lib/datos'
import { ChatProvider } from '../lib/chat'
import ChatFlotante from './ChatFlotante'
import CuentaPaciente from './CuentaPaciente'
import BienvenidaApp from './BienvenidaApp'
import MarcoPaciente from './paciente/MarcoPaciente'
import { Avatar, IconoCasa, IconoEvolucion, IconoAvisos, IconoCatalogo, IconoEntrenadores, IconoPacientes, IconoPanel, IconoRutina, IconoSalir, IconoVolumenes, IconoCentros, LogoCentro } from './Iconos'
import { useCentro } from '../lib/centro'

const ROL = { admin: 'Administrador', entrenador: 'Entrenador', paciente: 'Paciente' }
const CLAVE = 'readaptacion.menuLateral'

export default function Layout() {
  const { perfil, esAdmin, esPersonal, esSuper, salir } = useAuth()
  const centro = useCentro(perfil?.centroId)
  const avisos = useAvisos(esPersonal ? perfil.uid : null)
  const sinLeer = (avisos ?? []).filter(a => !a.leido).length
  const [plegado, setPlegado] = useState(() => { try { return localStorage.getItem(CLAVE) === '1' } catch { return false } })
  const [fotoAbierta, setFotoAbierta] = useState(false)
  const alternar = () => setPlegado(p => { const n = !p; try { localStorage.setItem(CLAVE, n ? '1' : '0') } catch { /* sin almacenamiento */ } return n })

  if (!esPersonal) return <ChatProvider><MarcoPaciente /></ChatProvider>

  const enlaces = esPersonal
    ? [
      ['/pacientes', 'Pacientes', IconoPacientes],
      ['/catalogo', 'Catálogo', IconoCatalogo],
      ['/volumenes', 'Volúmenes', IconoVolumenes],
      ['/avisos', 'Avisos', IconoAvisos, sinLeer],
      ...(esAdmin ? [['/entrenadores', 'Equipo', IconoEntrenadores]] : []),
      ...(esSuper ? [['/centros', 'Centros', IconoCentros]] : []),
    ]
    : [['/hoy', 'Hoy', IconoCasa], ['/mi-rutina', 'Rutina', IconoRutina], ['/mi-evolucion', 'Evolución', IconoEvolucion]]

  const Insignia = ({ n, borde = 'ring-white' }) => n > 0 && <span className={`absolute -right-2 -top-1.5 min-w-4 rounded-full bg-rose-500 px-1 py-0.5 text-center text-[10px] font-bold leading-none text-white ring-2 ${borde}`}>{n}</span>

  const lateral = ([a, t, Icono, n]) => (
    <NavLink key={a} to={a} title={plegado ? t : undefined} className={({ isActive }) => `group relative flex items-center rounded-lg py-2 text-[13px] font-medium transition ${plegado ? 'justify-center px-0' : 'gap-2.5 px-3'} ${isActive ? 'bg-white/15 text-white shadow-inner shadow-white/5' : 'text-teal-100/80 hover:bg-white/10 hover:text-white'}`}>
      {({ isActive }) => (<>
        {isActive && <span className="absolute -left-3 top-1.5 h-6 w-1 rounded-r-full bg-amber-300" />}
        <span className="relative"><Icono width={plegado ? 20 : 18} height={plegado ? 20 : 18} /><Insignia n={n} borde="ring-teal-900" /></span>
        {!plegado && t}
      </>)}
    </NavLink>
  )
  const movil = ([a, t, Icono, n]) => (
    <NavLink key={a} to={a} className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[11px] font-medium ${isActive ? 'text-teal-700' : 'text-slate-500'}`}>
      <span className="relative"><Icono width={20} height={20} /><Insignia n={n} /></span>
      <span className="truncate">{t}</span>
    </NavLink>
  )

  // Foto de perfil: el personal va a "Mi perfil"; el paciente la cambia en una ventana
  const botonAvatar = esPersonal
    ? <Link to="/perfil" title="Mi perfil" className="rounded-full ring-2 ring-transparent transition hover:ring-teal-300"><Avatar nombre={perfil?.nombre} foto={perfil?.foto} tamano={30} /></Link>
    : <button onClick={() => setFotoAbierta(true)} title="Mi cuenta" className="rounded-full ring-2 ring-transparent transition hover:ring-teal-300"><Avatar nombre={perfil?.nombre} foto={perfil?.foto} tamano={30} /></button>

  return (
    <ChatProvider>
    <div className="min-h-dvh text-slate-900 md:flex" style={{ '--lateral': plegado ? '4.5rem' : '14rem' }}>
      {/* Menú lateral (ordenador y tablet), plegable */}
      <aside className={`hidden shrink-0 flex-col bg-gradient-to-b from-teal-800 via-teal-900 to-slate-900 transition-[width] duration-200 md:sticky md:top-0 md:flex md:h-dvh ${plegado ? 'w-[4.5rem]' : 'w-56'}`}>
        <div className={`flex items-center py-4 ${plegado ? 'justify-center' : 'gap-2.5 px-5'}`}>
          <LogoCentro centro={centro} tamano={plegado ? 34 : 34} claro />
          {!plegado && <span className="min-w-0 text-[15px] font-bold leading-tight tracking-tight text-white">{centro?.nombre ?? <>Entrenamiento<br />Personal</>}</span>}
        </div>
        <nav className={`flex flex-1 flex-col gap-1 ${plegado ? 'px-2.5' : 'px-3'}`}>{enlaces.map(lateral)}</nav>
        <div className={`m-2.5 rounded-xl bg-white/10 ring-1 ring-inset ring-white/10 ${plegado ? 'p-1.5' : 'p-3'}`}>
          {plegado ? (
            <button onClick={salir} title="Cerrar sesión" className="flex h-8 w-full items-center justify-center rounded-lg text-teal-100 hover:bg-white/15 hover:text-white"><IconoSalir width={18} height={18} /></button>
          ) : (<>
            <div className="flex items-center gap-2.5">
              <Avatar nombre={perfil?.nombre} foto={perfil?.foto} tamano={32} />
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13px] font-semibold text-white">{perfil?.nombre}</div>
                <div className="text-[11px] text-teal-200/80">{ROL[perfil?.rol]}</div>
              </div>
            </div>
            <button onClick={salir} className="mt-2.5 h-7 w-full rounded-md bg-white/10 text-xs font-medium text-teal-50 transition hover:bg-white/20">Cerrar sesión</button>
          </>)}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Barra superior fija en todas las pantallas: plegar menú, avisos y perfil */}
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-slate-200/70 bg-white/85 px-3 backdrop-blur md:px-6">
          <button onClick={alternar} title={plegado ? 'Ampliar menú' : 'Plegar menú'} aria-label="Plegar o ampliar el menú" className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 md:flex"><IconoPanel width={18} height={18} /></button>
          <div className="flex items-center gap-2 md:hidden"><LogoCentro centro={centro} tamano={28} /><span className="font-bold tracking-tight">{centro?.nombre ?? 'Entrenamiento Personal'}</span></div>
          <div className="ml-auto flex items-center gap-1.5">
            {esPersonal && (
              <Link to="/avisos" title={sinLeer ? `${sinLeer} avisos sin leer` : 'Avisos'} aria-label="Avisos" className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
                <IconoAvisos width={19} height={19} />
                {sinLeer > 0 && <span className="absolute right-0 top-0 min-w-4 rounded-full bg-rose-500 px-1 py-0.5 text-center text-[10px] font-bold leading-none text-white ring-2 ring-white">{sinLeer}</span>}
              </Link>
            )}
            {botonAvatar}
            <button onClick={salir} title="Cerrar sesión" aria-label="Cerrar sesión" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 md:hidden"><IconoSalir width={18} height={18} /></button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-6"><BienvenidaApp /><Outlet /></main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/95 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur md:hidden">
        {enlaces.map(movil)}
      </nav>

      {fotoAbierta && <CuentaPaciente onClose={() => setFotoAbierta(false)} />}
      <ChatFlotante />
    </div>
    </ChatProvider>
  )
}
