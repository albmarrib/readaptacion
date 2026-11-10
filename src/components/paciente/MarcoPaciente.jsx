import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useChat } from '../../lib/chat'
import ChatFlotante from '../ChatFlotante'
import CuentaPaciente from '../CuentaPaciente'
import { Avatar } from '../Iconos'
import { IAgenda, ICasa, IChat, IEvolucion, IPerfil, IPesa } from './IconosPaciente'

// Marco de la app del paciente: fondo claro con un resplandor suave arriba,
// botones finos (cuenta, mensajes) y menú inferior con iconos de línea.
export default function MarcoPaciente() {
  const { perfil } = useAuth()
  const chat = useChat()
  const [cuenta, setCuenta] = useState(false)
  const enlaces = [['/hoy', 'Inicio', ICasa], ['/agenda', 'Agenda', IAgenda], ['/mi-rutina', 'Rutina', IPesa], ['/mi-evolucion', 'Evolución', IEvolucion]]

  return (
    <div className="paciente relative min-h-dvh">
      {/* Resplandor de color (identidad propia: menta y melocotón) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(55%_60%_at_15%_0%,#bfeee2_0%,transparent_70%),radial-gradient(45%_55%_at_95%_10%,#ffdcc2_0%,transparent_72%)] opacity-90" />

      <header className="relative z-10 flex items-center justify-between px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button onClick={() => setCuenta(true)} aria-label="Mi cuenta" className="rounded-full text-tinta transition active:scale-95">
          {perfil?.foto ? <span className="block rounded-full ring-1 ring-tinta"><Avatar nombre={perfil.nombre} foto={perfil.foto} tamano={40} /></span> : <IPerfil width={42} height={42} />}
        </button>
        <button onClick={() => chat?.abrir()} aria-label="Mensajes" className="relative flex h-11 w-11 items-center justify-center text-tinta transition active:scale-95">
          <IChat width={30} height={30} />
          {chat?.totalNoLeidos > 0 && <span className="absolute right-0.5 top-0.5 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white ring-2 ring-papel">{chat.totalNoLeidos}</span>}
        </button>
      </header>

      <main className="relative mx-auto max-w-xl pb-28">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-tinta/80 bg-white pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex max-w-xl">
          {enlaces.map(([a, t, Icono]) => (
            <NavLink key={a} to={a} className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 text-[12px] tracking-wide transition ${isActive ? 'font-semibold text-tinta' : 'font-light text-slate-500'}`}>
              {({ isActive }) => (<><Icono width={30} height={30} strokeWidth={isActive ? 1.7 : 1.2} />{t}</>)}
            </NavLink>
          ))}
        </div>
      </nav>

      {cuenta && <CuentaPaciente onClose={() => setCuenta(false)} />}
      <ChatFlotante sinBoton />
    </div>
  )
}
