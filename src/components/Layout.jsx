import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useAvisos } from '../lib/datos'
import { IconoAvisos, IconoCatalogo, IconoEntrenadores, IconoPacientes, IconoRutina, IconoVolumenes, Logo } from './Iconos'

const ROL = { admin: 'Administrador', entrenador: 'Entrenador', paciente: 'Paciente' }

export default function Layout() {
  const { perfil, esAdmin, esPersonal, salir } = useAuth()
  const avisos = useAvisos(esPersonal ? perfil.uid : null)
  const sinLeer = (avisos ?? []).filter(a => !a.leido).length

  const enlaces = esPersonal
    ? [
      ['/pacientes', 'Pacientes', IconoPacientes],
      ['/catalogo', 'Catálogo', IconoCatalogo],
      ['/volumenes', 'Volúmenes', IconoVolumenes],
      ['/avisos', 'Avisos', IconoAvisos, sinLeer],
      ...(esAdmin ? [['/entrenadores', 'Equipo', IconoEntrenadores]] : []),
    ]
    : [['/mi-rutina', 'Mi rutina', IconoRutina]]

  const Insignia = ({ n }) => n > 0 && <span className="absolute -right-2 -top-1.5 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white ring-2 ring-white">{n}</span>

  const escritorio = ([a, t, Icono, n]) => (
    <NavLink key={a} to={a} className={({ isActive }) => `flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-100'}`}>
      <span className="relative"><Icono width={20} height={20} /><Insignia n={n} /></span>{t}
    </NavLink>
  )
  const movil = ([a, t, Icono, n]) => (
    <NavLink key={a} to={a} className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium ${isActive ? 'text-teal-700' : 'text-slate-500'}`}>
      <span className="relative"><Icono /><Insignia n={n} /></span>
      <span className="truncate">{t}</span>
    </NavLink>
  )

  return (
    <div className="min-h-dvh bg-fondo text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2.5"><Logo /><span className="text-lg font-bold tracking-tight text-slate-900">Readaptación</span></div>
          <nav className="ml-4 hidden gap-1 sm:flex">{enlaces.map(escritorio)}</nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-semibold">{perfil?.nombre}</div>
              <div className="text-xs text-slate-500">{ROL[perfil?.rol]}</div>
            </div>
            <button onClick={salir} className="btn-sec !min-h-9 !px-3 !py-1.5 text-sm">Salir</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:pb-12 sm:pt-8"><Outlet /></main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200/80 bg-white/95 px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur sm:hidden">
        {enlaces.map(movil)}
      </nav>
    </div>
  )
}
