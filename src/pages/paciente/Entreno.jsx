import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { usePlanPaciente } from '../../lib/planPaciente'
import { useGrupos } from '../../lib/datos'
import { ejercicioHecho, marcarEjercicio, sesionDeHoy, terminarSesion } from '../../lib/sesiones'
import { PuertaPaciente, useCatalogo } from '../MiRutina'
import Foto from '../../components/Foto'
import Descanso from '../../components/Descanso'
import { Bloque, agruparEnBloques } from '../../components/paciente/Bloques'
import VisorEjercicio from '../../components/paciente/VisorEjercicio'
import { IAtras, IBandera, ICheck, ICrono, IInfo, IPlay } from '../../components/paciente/IconosPaciente'

// "2 series × 10+8 reps" · "3 series × SG"
const textoLinea = l => `${l.series} serie${l.series === 1 ? '' : 's'}  ×  ${l.tramos.join('+')}${l.tramos.every(t => typeof t === 'number') ? ' reps' : ''}`

export default function Entreno() {
  return <PuertaPaciente>{pid => <PantallaEntreno pid={pid} />}</PuertaPaciente>
}

function PantallaEntreno({ pid }) {
  const { n } = useParams()
  const navigate = useNavigate()
  const { rutinas, rutina, sesiones, delDia } = usePlanPaciente(pid)
  const grupos = useGrupos()
  const [descanso, setDescanso] = useState(false)
  const [visor, setVisor] = useState(null)
  const [fin, setFin] = useState(false)

  if (!rutinas) return <p className="px-5 pt-6 font-light text-slate-500">Cargando…</p>
  const dia = rutina?.dias.find(d => d.numero === Number(n))
  if (!dia) return <p className="px-5 pt-6 font-light text-slate-500">No hay un entreno activo para este día.</p>
  const ejercicios = delDia(dia.numero)
  const sesion = sesionDeHoy(sesiones, dia.numero)
  const hechos = ejercicios.filter(e => ejercicioHecho(sesion, e)).length

  const completar = (e, hecho) => marcarEjercicio({ pid, rid: rutina.id, dia: dia.numero, delDia: ejercicios, sesion, ejercicio: e, hecho }).catch(() => {})
  const terminar = async () => { await terminarSesion({ pid, rid: rutina.id, dia: dia.numero }).catch(() => {}); setFin(true) }

  if (fin) return (
    <div className="paciente fixed inset-0 z-50 flex flex-col items-center justify-center px-8 text-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_30%,#bfeee2_0%,transparent_70%)]" />
      <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-white"><ICheck width={52} height={52} strokeWidth={2} /></span>
      <h2 className="relative mt-8 text-[34px] font-light leading-tight">Entreno completado</h2>
      <p className="relative mt-2 text-[17px] font-light text-slate-500">{dia.titulo || `Día ${dia.numero}`} · {hechos} de {ejercicios.length} ejercicios</p>
      <div className="relative mt-10 w-full max-w-sm"><button className="boton-pildora" onClick={() => navigate('/hoy')}>Volver al inicio</button></div>
    </div>
  )

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between px-5">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="-ml-1 p-1 text-tinta active:scale-90"><IAtras width={30} height={30} /></button>
        <button onClick={() => setDescanso(true)} aria-label="Cronómetro de descanso" className="p-1 text-tinta active:scale-90"><ICrono width={34} height={34} /></button>
      </div>
      <div className="px-5 pt-3">
        <h1 className="text-[30px] font-light uppercase leading-tight tracking-tight">{dia.titulo || `Día ${dia.numero}`}</h1>
        <p className="mt-1 text-[15px] font-light text-slate-500">{hechos} de {ejercicios.length} ejercicios completados</p>
        <div className="mt-3 flex gap-1.5">{ejercicios.map((e, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${ejercicioHecho(sesion, e) ? 'bg-emerald-500' : 'bg-slate-300/70'}`} />)}</div>
      </div>

      <div className="mt-8">
        {agruparEnBloques(ejercicios, grupos).map(b => (
          <Bloque key={b.grupoId} titulo={b.titulo}>
            <div className="space-y-3">
              {b.ejercicios.map(e => <TarjetaEjercicio key={e.id} pid={pid} rid={rutina.id} ejercicio={e} hecho={ejercicioHecho(sesion, e)} onCompletar={h => completar(e, h)} onVer={() => setVisor(e)} />)}
            </div>
          </Bloque>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-[4.9rem] z-20 px-5 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-xl"><button className="boton-pildora" onClick={terminar}>Terminar</button></div>
      </div>
      <div className="h-24" />
      {descanso && <Descanso onCerrar={() => setDescanso(false)} />}
      {visor && <VisorEjercicio ejercicio={visor} onCerrar={() => setVisor(null)} />}
    </div>
  )
}

function TarjetaEjercicio({ pid, rid, ejercicio: e, hecho, onCompletar, onVer }) {
  const cat = useCatalogo(e.ejercicioId)
  const [obs, setObs] = useState(false)
  const [titulo] = e.nombre.split('\n').filter(Boolean)
  return (
    <article className={`bg-white px-5 py-6 transition ${hecho ? 'ring-1 ring-inset ring-emerald-500' : ''}`}>
      <div className="flex gap-5">
        <button onClick={onVer} aria-label="Ver fotos y vídeo" className="relative h-32 w-32 shrink-0 overflow-hidden bg-slate-100 active:opacity-80">
          {cat?.fotos?.[0] && <Foto ruta={cat.fotos[0]} className="h-full w-full !bg-white" />}
          {cat?.videos?.length > 0 && <span className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/70 text-tinta backdrop-blur"><IPlay width={22} height={22} /></span>}
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="text-[20px] font-light leading-snug">{titulo}</h3>
          {e.observaciones && (
            <button onClick={() => setObs(o => !o)} aria-expanded={obs} aria-label="Observaciones del entrenador" className={`mt-4 rounded-full p-1.5 transition ${obs ? 'bg-amber-100 text-amber-800' : 'text-tinta'}`}><IInfo width={26} height={26} /></button>
          )}
        </div>
      </div>
      {obs && e.observaciones && <p className="mt-4 bg-amber-50 p-3 text-[15px] font-light leading-relaxed text-amber-900">{e.observaciones}</p>}

      <ul className="mt-5 space-y-3">
        {(e.lineas ?? []).map((l, k) => (
          <li key={k} className="flex items-center gap-3">
            <IBandera width={24} height={24} className="shrink-0" />
            <span className="min-w-0 flex-1 text-[17px] font-light tracking-wide">{textoLinea(l)}</span>
            <PesoLinea pid={pid} rid={rid} ejercicio={e} indice={k} />
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-end">
        {hecho
          ? <button onClick={() => onCompletar(false)} className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-500 px-5 text-[15px] font-medium text-white active:scale-95"><ICheck width={20} height={20} strokeWidth={2} /> Completado</button>
          : <button onClick={() => onCompletar(true)} className="boton-pildora-borde"><ICheck width={20} height={20} /> Completar</button>}
      </div>
    </article>
  )
}

// Peso de una línea (uno por rutina): se guarda al salir del campo
function PesoLinea({ pid, rid, ejercicio: e, indice }) {
  const guardado = e.pesos?.[indice]
  const [valor, setValor] = useState(guardado ?? '')
  const [estado, setEstado] = useState('')
  useEffect(() => { setValor(guardado ?? '') }, [guardado])

  const guardar = async () => {
    const texto = String(valor).replace(',', '.').trim()
    const n = texto === '' ? null : Number(texto)
    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 1000)) { setEstado('error'); return }
    if ((n ?? undefined) === guardado) return
    try {
      await updateDoc(doc(db, 'pacientes', pid, 'rutinas', rid, 'ejercicios', e.id), { [`pesos.${indice}`]: n === null ? deleteField() : n, pesosActualizado: serverTimestamp() })
      setEstado('ok'); setTimeout(() => setEstado(''), 1500)
    } catch { setEstado('error') }
  }

  return (
    <label className="flex shrink-0 items-center gap-1.5">
      <input type="text" inputMode="decimal" placeholder="—" aria-label={`Peso de la línea ${indice + 1} en kilos`}
        className={`h-11 w-[4.5rem] border-b-2 bg-transparent text-center text-[19px] font-medium outline-none transition ${estado === 'error' ? 'border-red-400' : estado === 'ok' ? 'border-emerald-500' : 'border-tinta/40 focus:border-tinta'}`}
        value={valor} onChange={ev => { setValor(ev.target.value); setEstado('') }} onBlur={guardar} onKeyDown={ev => ev.key === 'Enter' && ev.currentTarget.blur()} />
      <span className="text-[14px] font-light text-slate-500">kg</span>
    </label>
  )
}
