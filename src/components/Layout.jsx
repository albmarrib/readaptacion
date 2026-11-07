import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const ROL = { admin: 'Administrador', entrenador: 'Entrenador', paciente: 'Paciente' }

export default function Layout() {
  const { perfil, esAdmin, esPersonal, salir } = useAuth()
  const enlaces = esPersonal
    ? [['/pacientes', 'Pacientes'], ['/catalogo', 'Catálogo'], ...(esAdmin ? [['/entrenadores', 'Entrenadores']] : [])]
    : [['/mi-rutina', 'Mi rutina']]
  const clase = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-100'}`

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <span className="text-lg font-bold text-teal-700">Readaptación</span>
          <nav className="ml-2 hidden gap-1 sm:flex">{enlaces.map(([a, t]) => <NavLink key={a} to={a} className={clase}>{t}</NavLink>)}</nav>
          <div className="ml-auto flex items-center gap-3 text-right">
            <div className="leading-tight">
              <div className="text-sm font-medium">{perfil?.nombre}</div>
              <div className="text-xs text-slate-500">{ROL[perfil?.rol]}</div>
            </div>
            <button onClick={salir} className="btn-sec !px-3 !py-1.5 text-sm">Salir</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 sm:pb-10"><Outlet /></main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-200 bg-white px-2 py-1.5 sm:hidden">
        {enlaces.map(([a, t]) => <NavLink key={a} to={a} className={clase}>{t}</NavLink>)}
      </nav>
    </div>
  )
}
