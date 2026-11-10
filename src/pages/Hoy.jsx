import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { DIAS_SEMANA, diaSemanaDe, diasPrevistos, isoSemana, mismaFecha, proximoEntreno, saludo, soloDia } from '../lib/plan'
import { idSesion, lineasHechas, useSesiones } from '../lib/sesiones'
import { Avatar } from '../components/Iconos'
import Calendario from '../components/Calendario'
import { PuertaPaciente, SesionEjercicios } from './MiRutina'

const VISIBLES = ['activa', 'pendiente', 'cerrada']
const fechaLarga = d => d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

export default function Hoy() {
  return <PuertaPaciente>{pid => <PantallaHoy pid={pid} />}</PuertaPaciente>
}

function PantallaHoy({ pid }) {
  const { perfil } = useAuth()
  const [rutinas, setRutinas] = useState(null)
  const [ejercicios, setEjercicios] = useState(null)
  const [fecha, setFecha] = useState(() => soloDia(new Date()))
  const [entreno, setEntreno] = useState(null) // número de día en curso

  useEffect(() => onSnapshot(query(collection(db, 'pacientes', pid, 'rutinas'), where('estado', 'in', VISIBLES)),
    s => setRutinas(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.numero - a.numero)), () => setRutinas([])), [pid])

  const rutina = rutinas?.find(r => r.estado === 'activa') ?? null
  const sesiones = useSesiones(rutina ? pid : null, rutina?.id)

  useEffect(() => {
    if (!rutina) return
    return onSnapshot(collection(db, 'pacientes', pid, 'rutinas', rutina.id, 'ejercicios'),
      s => setEjercicios(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setEjercicios([]))
  }, [pid, rutina?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const delDia = useMemo(() => n => (ejercicios ?? []).filter(e => e.dia === n).sort((a, b) => a.orden - b.orden), [ejercicios])
  const nombre = perfil.nombre.split(' ')[0]

  const cabecera = (
    <header className="flex items-center gap-3">
      <Avatar nombre={perfil.nombre} foto={perfil.foto} tamano={48} />
      <div className="min-w-0">
        <h1 className="text-xl font-bold leading-tight tracking-tight">{saludo()}, {nombre}</h1>
        <p className="text-sm capitalize text-slate-500">{fechaLarga(new Date())}</p>
      </div>
    </header>
  )

  if (!rutinas) return <p className="text-slate-500">Cargando…</p>
  if (!rutina) return (
    <div className="space-y-4">
      {cabecera}
      <div className="rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200/70">
        <div className="text-4xl">🗓️</div>
        <p className="mt-2 font-semibold">{rutinas.length ? 'Tu rutina ha terminado' : 'Aún no tienes rutina'}</p>
        <p className="mt-1 text-sm text-slate-500">{rutinas.length ? 'Tu entrenador está preparando la siguiente. Te avisaremos cuando esté lista.' : 'Cuando tu entrenador te active una rutina, aparecerá aquí.'}</p>
      </div>
    </div>
  )

  const previstos = diasPrevistos(rutina, fecha)
  const esHoy = mismaFecha(fecha, new Date())
  const pasado = soloDia(fecha) < soloDia(new Date())
  const proximo = proximoEntreno(rutina, new Date())

  // Estado de un día de entreno en la fecha elegida
  const estadoDia = n => {
    const s = (sesiones ?? []).find(x => x.id === idSesion(fecha, n))
    const total = delDia(n).reduce((t, e) => t + (e.lineas?.length ?? 0), 0)
    return { s, total, hechas: lineasHechas(s), hecho: !!s?.completada }
  }

  return (
    <div className="space-y-4">
      {cabecera}

      <Calendario rutina={rutina} sesiones={sesiones} seleccionada={fecha} onElegir={setFecha} />

      <section className="space-y-2.5">
        <h2 className="px-1 text-sm font-semibold capitalize text-slate-500">{esHoy ? 'Hoy' : fechaLarga(fecha)}</h2>
        {previstos.length === 0 ? (
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <p className="text-base font-semibold">😌 {esHoy ? 'Hoy toca descansar' : 'Día de descanso'}</p>
            {proximo && esHoy && (
              <p className="mt-1 text-sm text-slate-500">
                Próximo entreno: <b className="capitalize text-slate-700">{mismaFecha(proximo.fecha, new Date()) ? 'hoy' : DIAS_SEMANA[isoSemana(proximo.fecha) - 1].toLowerCase()}</b> · Día {proximo.previstos[0].dia.numero}
              </p>
            )}
          </div>
        ) : previstos.map(({ dia }) => {
          const { total, hechas, hecho } = estadoDia(dia.numero)
          const n = delDia(dia.numero).length
          const pct = total ? Math.round((hechas / total) * 100) : 0
          return (
            <div key={dia.numero} className="overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 to-teal-600 p-5 text-white shadow-lg shadow-teal-900/15">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-100">Día {dia.numero} · {n} ejercicio{n === 1 ? '' : 's'}</p>
              <h3 className="mt-1 text-2xl font-bold leading-tight tracking-tight">{dia.titulo || `Día ${dia.numero}`}</h3>
              {(hechas > 0 || hecho) && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs font-medium text-teal-50"><span>{hecho ? '✓ Completado' : 'En curso'}</span><span>{hechas} de {total} series</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${hecho ? 100 : pct}%` }} /></div>
                </div>
              )}
              {(esHoy || !pasado) && (
                <button onClick={() => setEntreno(dia.numero)} disabled={!n}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-base font-bold text-teal-800 shadow-md active:scale-[0.98] disabled:opacity-60">
                  {hecho ? 'Repasar entreno' : hechas ? 'Continuar' : esHoy ? 'Empezar entreno' : 'Entrenar ahora'} <span aria-hidden="true">›</span>
                </button>
              )}
              {pasado && !esHoy && <p className="mt-3 text-sm font-medium text-teal-50">{hecho ? '✓ Hecho' : hechas ? 'Empezado, sin terminar' : 'No registrado'}</p>}
            </div>
          )
        })}
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-slate-500">Todos tus días</h2>
        <ul className="space-y-2">
          {rutina.dias.map((dia, i) => {
            const n = delDia(dia.numero).length
            const hoyHecho = (sesiones ?? []).find(x => x.id === idSesion(new Date(), dia.numero))?.completada
            return (
              <li key={dia.numero}>
                <button onClick={() => setEntreno(dia.numero)} disabled={!n} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-sm ring-1 ring-slate-200/70 transition active:scale-[0.99]">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${hoyHecho ? 'bg-emerald-500 text-white' : 'bg-teal-50 text-teal-800'}`}>{hoyHecho ? '✓' : dia.numero}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{dia.titulo || `Día ${dia.numero}`}</span>
                    <span className="block text-xs text-slate-500">{n} ejercicio{n === 1 ? '' : 's'}{diaSemanaDe(rutina, i) && ` · ${DIAS_SEMANA[diaSemanaDe(rutina, i) - 1]}`}</span>
                  </span>
                  <span className="text-lg text-slate-300">›</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {entreno != null && ejercicios && (
        <SesionEjercicios key={entreno} pid={pid} rutina={rutina} delDia={delDia(entreno)} diaNumero={entreno} puedeAnotar onCerrar={() => setEntreno(null)} />
      )}
    </div>
  )
}
