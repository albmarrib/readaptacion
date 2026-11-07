import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useAvisos } from '../lib/datos'
import { Avatar, IconoAvisos, IconoCatalogo, IconoEntrenadores, IconoPacientes, IconoRutina, IconoVolumenes, Logo } from './Iconos'

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

  const Insignia = ({ n, borde = 'ring-white' }) => n > 0 && <span className={`absolute -right-2 -top-1.5 min-w-4 rounded-full bg-rose-500 px-1 py-0.5 text-center text-[10px] font-bold leading-none text-white ring-2 ${borde}`}>{n}</span>

  const lateral = ([a, t, Icono, n]) => (
    <NavLink key={a} to={a} className={({ isActive }) => `group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${isActive ? 'bg-white/15 text-white shadow-inner shadow-white/5' : 'text-teal-100/80 hover:bg-white/10 hover:text-white'}`}>
      {({ isActive }) => (<>
        {isActive && <span className="absolute -left-2.5 top-1.5 h-6 w-1 rounded-r-full bg-amber-300" />}
        <span className="relative"><Icono width={18} height={18} /><Insignia n={n} borde="ring-teal-900" /></span>{t}
      </>)}
    </NavLink>
  )
  const movil = ([a, t, Icono, n]) => (
    <NavLink key={a} to={a} className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[11px] font-medium ${isActive ? 'text-teal-700' : 'text-slate-500'}`}>
      <span className="relative"><Icono width={20} height={20} /><Insignia n={n} /></span>
      <span className="truncate">{t}</span>
    </NavLink>
  )

  return (
    <div className="min-h-dvh text-slate-900 md:flex">
      {/* Menú lateral (ordenador y tablet) */}
      <aside className="hidden w-56 shrink-0 flex-col bg-gradient-to-b from-teal-800 via-teal-900 to-slate-900 md:sticky md:top-0 md:flex md:h-dvh">
        <div className="flex items-center gap-2.5 px-5 py-5"><Logo tamano={30} claro /><span className="text-[15px] font-bold tracking-tight text-white">Readaptación</span></div>
        <nav className="flex flex-1 flex-col gap-1 px-3">{enlaces.map(lateral)}</nav>
        <div className="m-3 rounded-xl bg-white/10 p-3 ring-1 ring-inset ring-white/10">
          <div className="flex items-center gap-2.5">
            <Avatar nombre={perfil?.nombre} tamano={32} />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] font-semibold text-white">{perfil?.nombre}</div>
              <div className="text-[11px] text-teal-200/80">{ROL[perfil?.rol]}</div>
            </div>
          </div>
          <button onClick={salir} className="mt-2.5 h-7 w-full rounded-md bg-white/10 text-xs font-medium text-teal-50 transition hover:bg-white/20">Cerrar sesión</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Cabecera (móvil) */}
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 bg-gradient-to-r from-teal-800 to-teal-900 px-4 text-white shadow-md md:hidden">
          <Logo tamano={26} claro /><span className="font-bold tracking-tight">Readaptación</span>
          <button onClick={salir} className="ml-auto h-7 rounded-md bg-white/15 px-2.5 text-xs font-medium hover:bg-white/25">Salir</button>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-6"><Outlet /></main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/95 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur md:hidden">
        {enlaces.map(movil)}
      </nav>
    </div>
  )
}
