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

  const Insignia = ({ n }) => n > 0 && <span className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-red-600 px-1 py-0.5 text-center text-[10px] font-bold leading-none text-white ring-2 ring-white">{n}</span>

  const lateral = ([a, t, Icono, n]) => (
    <NavLink key={a} to={a} className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
      <span className="relative"><Icono width={18} height={18} /><Insignia n={n} /></span>{t}
    </NavLink>
  )
  const movil = ([a, t, Icono, n]) => (
    <NavLink key={a} to={a} className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[11px] font-medium ${isActive ? 'text-teal-700' : 'text-slate-500'}`}>
      <span className="relative"><Icono width={20} height={20} /><Insignia n={n} /></span>
      <span className="truncate">{t}</span>
    </NavLink>
  )

  return (
    <div className="min-h-dvh bg-fondo text-slate-900 md:flex">
      {/* Menú lateral (ordenador y tablet) */}
      <aside className="hidden w-52 shrink-0 flex-col border-r border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-dvh">
        <div className="flex items-center gap-2.5 px-4 py-4"><Logo tamano={28} /><span className="text-base font-bold tracking-tight">Readaptación</span></div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2.5">{enlaces.map(lateral)}</nav>
        <div className="border-t border-slate-200 p-3">
          <div className="truncate text-sm font-medium">{perfil?.nombre}</div>
          <div className="mb-2 text-xs text-slate-500">{ROL[perfil?.rol]}</div>
          <button onClick={salir} className="btn-sec btn-xs w-full">Salir</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Cabecera (móvil) */}
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden">
          <Logo tamano={26} /><span className="font-bold tracking-tight">Readaptación</span>
          <button onClick={salir} className="btn-sec btn-xs ml-auto">Salir</button>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-6"><Outlet /></main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/95 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur md:hidden">
        {enlaces.map(movil)}
      </nav>
    </div>
  )
}
