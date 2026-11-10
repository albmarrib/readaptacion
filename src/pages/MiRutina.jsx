import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { collection, deleteField, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { describirLinea, formatLinea } from '../lib/volumen'
import Foto from '../components/Foto'
import PantallaConsentimiento from '../components/PantallaConsentimiento'
import { consentimientoVigente } from '../lib/consentimiento'
import Descanso from '../components/Descanso'
import { claveLinea, marcarLineaDia, sesionDeHoy, terminarSesion, useSesiones } from '../lib/sesiones'

const VISIBLES = ['activa', 'pendiente', 'cerrada']
const fmt = t => (t?.toDate ? t.toDate() : t ? new Date(t) : null)?.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

// Comprueba la ficha y el consentimiento antes de mostrar nada al paciente.
// children es una función que recibe el id de su ficha.
export function PuertaPaciente({ children }) {
  const { perfil } = useAuth()
  const pid = perfil.pacienteId
  const [ficha, setFicha] = useState(undefined) // undefined = cargando
  const [error, setError] = useState('')

  const demo = import.meta.env.DEV && pid === 'demo'
  useEffect(() => {
    if (!pid || demo) return
    return onSnapshot(doc(db, 'pacientes', pid), s => setFicha(s.exists() ? s.data() : null),
      e => setError('No se pudo cargar tu ficha: ' + e.message))
  }, [pid])

  if (demo) return children(pid, { nombre: perfil.nombre })
  if (!pid) return <p className="tarjeta text-slate-600">Tu cuenta aún no está enlazada a una ficha. Contacta con tu entrenador.</p>
  if (error) return <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>
  if (ficha === undefined) return <p className="text-slate-500">Cargando…</p>
  if (!consentimientoVigente(ficha?.consentimiento)) return <PantallaConsentimiento pacienteId={pid} />
  return children(pid, ficha)
}

export default function MiRutina() {
  const { perfil } = useAuth()
  return <PuertaPaciente>{pid => <ContenidoRutina pid={pid} nombre={perfil.nombre} />}</PuertaPaciente>
}

// Vista previa para el entrenador: lo que ve el paciente, solo lectura
export function VistaPreviaPaciente() {
  const { id } = useParams()
  const [ficha, setFicha] = useState(undefined)
  useEffect(() => onSnapshot(doc(db, 'pacientes', id), s => setFicha(s.exists() ? s.data() : null), () => setFicha(null)), [id])
  if (ficha === undefined) return <p className="text-slate-500">Cargando…</p>
  if (!ficha) return <p className="rounded-xl bg-red-50 p-3 text-red-700">No se encuentra el paciente.</p>
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        <span>👁 Vista previa: así ve la app <b>{ficha.nombre}</b>. Solo lectura.</span>
        <Link to={`/pacientes/${id}`} className="btn-sec ml-auto !py-1.5">Volver a la ficha</Link>
      </div>
      <ContenidoRutina pid={id} nombre={ficha.nombre} soloLectura />
    </div>
  )
}

function ContenidoRutina({ pid, nombre, soloLectura = false }) {
  const [rutinas, setRutinas] = useState(null)
  const [elegida, setElegida] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    // Solo rutinas ya activadas: los borradores no son visibles para el paciente
    return onSnapshot(query(collection(db, 'pacientes', pid, 'rutinas'), where('estado', 'in', VISIBLES)),
      s => setRutinas(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.numero - a.numero)),
      e => setError('No se pudo cargar tu rutina: ' + e.message))
  }, [pid])

  if (error) return <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>
  if (!rutinas) return <p className="text-slate-500">Cargando…</p>
  if (!rutinas.length) return (
    <div className="space-y-4">
    <div className="tarjeta text-center">
      <h1 className="text-xl font-semibold">Hola, {nombre.split(' ')[0]}</h1>
      <p className="mt-2 text-slate-600">Tu entrenador todavía no te ha activado ninguna rutina. Cuando lo haga, aparecerá aquí.</p>
    </div>
    </div>
  )

  const actual = rutinas.find(r => r.estado === 'activa') ?? rutinas[0]
  const mostrada = rutinas.find(r => r.id === elegida) ?? actual
  const anteriores = rutinas.filter(r => r.id !== mostrada.id)

  return (
    <div className="space-y-4">
      <VistaRutina key={mostrada.id} pid={pid} rutina={mostrada} esActual={mostrada.id === actual.id} soloLectura={soloLectura} />
      {anteriores.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">{mostrada.id === actual.id ? 'Rutinas anteriores' : 'Otras rutinas'}</h2>
          <ul className="space-y-2">
            {anteriores.map(r => (
              <li key={r.id}>
                <button onClick={() => { setElegida(r.id); window.scrollTo({ top: 0 }) }} className="tarjeta flex w-full items-center justify-between text-left hover:border-teal-500">
                  <span><span className="font-medium">Rutina {r.numero}</span> <span className="text-sm text-slate-500">· temporada {r.temporada}</span></span>
                  <span className="text-xs text-slate-500">{r.estado === 'activa' ? 'Actual' : r.estado === 'pendiente' ? 'Pendiente de revisión' : 'Cerrada'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function VistaRutina({ pid, rutina, esActual, soloLectura }) {
  const [ejercicios, setEjercicios] = useState(null)
  const [dia, setDia] = useState(0)
  const [abierto, setAbierto] = useState(null) // id del ejercicio abierto
  const puedeAnotar = rutina.estado === 'activa' && !soloLectura

  useEffect(() => onSnapshot(collection(db, 'pacientes', pid, 'rutinas', rutina.id, 'ejercicios'),
    s => setEjercicios(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setEjercicios([])), [pid, rutina.id])

  const delDia = useMemo(() => (ejercicios ?? []).filter(e => e.dia === rutina.dias[dia]?.numero).sort((a, b) => a.orden - b.orden), [ejercicios, rutina.dias, dia])
  const seriesDia = delDia.reduce((s, e) => s + (e.seriesTotales ?? 0), 0)
  const d = rutina.dias[dia]
  const indiceAbierto = delDia.findIndex(e => e.id === abierto)

  // Progreso: pesos anotados sobre el total de líneas de la rutina
  const totalLineas = (ejercicios ?? []).reduce((s, e) => s + (e.lineas?.length ?? 0), 0)
  const anotados = (ejercicios ?? []).reduce((s, e) => s + Object.keys(e.pesos ?? {}).length, 0)
  const pct = totalLineas ? Math.round((anotados / totalLineas) * 100) : 0

  return (
    <div className="space-y-4">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 to-teal-600 p-4 text-white shadow-lg shadow-teal-900/10">
        <p className="text-xs font-medium text-teal-100">{esActual ? 'Tu rutina actual' : 'Rutina anterior'}</p>
        <h1 className="mt-0.5 text-xl font-bold tracking-tight">Rutina {rutina.numero}</h1>
        <p className="mt-0.5 text-xs text-teal-100">
          Temporada {rutina.temporada}{rutina.fechaInicio && <> · {fmt(rutina.fechaInicio)} – {fmt(rutina.fechaFin)}</>}
        </p>
        {puedeAnotar && totalLineas > 0 && (
          <div className="mt-3">
            <div className="flex items-baseline justify-between text-xs"><span className="font-medium">Pesos anotados</span><span className="font-semibold">{anotados} de {totalLineas}</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
        )}
      </header>

      {!puedeAnotar && !soloLectura && <p className="rounded-2xl bg-slate-100 p-3.5 text-sm text-slate-600">{rutina.estado === 'pendiente' ? 'Esta rutina ha terminado y tu entrenador la está revisando. Ya no puedes cambiar los pesos.' : 'Rutina cerrada: solo lectura.'}</p>}
      {rutina.notaGeneral && <p className="rounded-2xl border border-teal-200 bg-teal-50 p-3.5 text-sm leading-relaxed text-teal-900"><b className="font-semibold">Nota de tu entrenador:</b> {rutina.notaGeneral}</p>}

      <div className="sticky top-12 z-10 -mx-4 bg-fondo/95 px-4 py-2 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {rutina.dias.map((x, i) => (
            <button key={x.numero} onClick={() => setDia(i)} aria-pressed={i === dia}
              className={`min-h-10 shrink-0 rounded-full px-5 text-[15px] font-semibold transition ${i === dia ? 'bg-teal-700 text-white shadow-md shadow-teal-900/15' : 'border border-slate-300 bg-white text-slate-700'}`}>
              Día {x.numero}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold tracking-tight">{d.titulo || `Día ${d.numero}`}</h2>
        <p className="text-xs text-slate-500">{delDia.length} ejercicio{delDia.length === 1 ? '' : 's'} · {seriesDia} series en total</p>
      </div>

      {ejercicios === null ? <p className="text-slate-500">Cargando…</p> : (
        <ul className="space-y-2.5">
          {delDia.map((e, i) => <FilaEjercicio key={e.id} ejercicio={e} numero={i + 1} puedeAnotar={puedeAnotar} onAbrir={() => setAbierto(e.id)} />)}
        </ul>
      )}

      {indiceAbierto >= 0 && (
        <SesionEjercicios key={abierto} pid={pid} rutina={rutina} delDia={delDia} diaNumero={d.numero} inicial={indiceAbierto} puedeAnotar={puedeAnotar} onCerrar={() => setAbierto(null)} />
      )}
    </div>
  )
}

// Entreno de un día: recorre sus ejercicios (Anterior / Siguiente) y guarda lo hecho en la sesión de hoy
export function SesionEjercicios({ pid, rutina, delDia, diaNumero, inicial = 0, puedeAnotar, onCerrar }) {
  const [i, setI] = useState(inicial)
  const [terminado, setTerminado] = useState(false)
  const sesiones = useSesiones(puedeAnotar ? pid : null, rutina.id)
  const sesion = sesionDeHoy(sesiones, diaNumero)
  const e = delDia[i]
  if (terminado) return <FinEntreno dia={rutina.dias.find(x => x.numero === diaNumero)} onCerrar={onCerrar} />
  if (!e) return null
  const marcar = (linea, hecho) => marcarLineaDia({ pid, rid: rutina.id, dia: diaNumero, delDia, sesion, ejercicioId: e.id, linea, hecho }).catch(() => {})
  const terminar = async () => { if (puedeAnotar) await terminarSesion({ pid, rid: rutina.id, dia: diaNumero }).catch(() => {}); setTerminado(true) }
  return (
    <DetalleEjercicio pid={pid} rid={rutina.id} ejercicio={e} numero={i + 1} total={delDia.length} puedeAnotar={puedeAnotar}
      sesion={puedeAnotar ? sesion : null} onMarcar={puedeAnotar ? marcar : null} onTerminar={puedeAnotar ? terminar : null}
      onCerrar={onCerrar} onAnterior={i > 0 ? () => setI(i - 1) : null} onSiguiente={i < delDia.length - 1 ? () => setI(i + 1) : null} />
  )
}

function FinEntreno({ dia, onCerrar }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-teal-700 to-teal-500 p-6 text-center text-white">
      <div className="text-6xl">🎉</div>
      <h2 className="mt-4 text-2xl font-bold">¡Entrenamiento completado!</h2>
      <p className="mt-2 text-teal-50">{dia?.titulo ? `Día ${dia.numero} · ${dia.titulo}` : `Día ${dia?.numero ?? ''}`} hecho. ¡Buen trabajo!</p>
      <button onClick={onCerrar} className="mt-8 h-12 rounded-full bg-white px-8 text-base font-bold text-teal-800 shadow-lg active:scale-95">Volver</button>
    </div>
  )
}

const catalogo = new Map() // ejercicioId -> datos del catálogo (fotos y vídeos)

export function useCatalogo(ejercicioId) {
  const [cat, setCat] = useState(() => catalogo.get(ejercicioId) ?? null)
  useEffect(() => {
    if (cat || !ejercicioId) return
    let vivo = true
    getDoc(doc(db, 'ejercicios', ejercicioId)).then(s => {
      const datos = s.exists() ? s.data() : { fotos: [], videos: [] }
      catalogo.set(ejercicioId, datos)
      if (vivo) setCat(datos)
    }).catch(() => vivo && setCat({ fotos: [], videos: [] }))
    return () => { vivo = false }
  }, [cat, ejercicioId])
  return cat
}

// Resumen del volumen en una línea: 1*10  2*10+3  3*5
const resumen = lineas => (lineas ?? []).map(formatLinea).join('   ')

// Una fila de la lista del día: nombre, volumen resumido, observaciones y estado de los pesos
export function FilaEjercicio({ ejercicio: e, numero, puedeAnotar, onAbrir }) {
  const cat = useCatalogo(e.ejercicioId)
  const [titulo, ...resto] = e.nombre.split('\n').filter(Boolean)
  const n = e.lineas?.length ?? 0
  const hechos = Object.keys(e.pesos ?? {}).length
  const completo = n > 0 && hechos >= n

  return (
    <li>
      <button onClick={onAbrir} className="flex w-full items-stretch gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition active:scale-[0.99] active:bg-slate-50">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${completo ? 'bg-emerald-500 text-white' : 'bg-teal-700 text-white'}`}>{completo ? '✓' : numero}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-snug">{titulo}</span>
          {resto.length > 0 && <span className="block text-xs text-slate-500">{resto.join(' · ')}</span>}
          <span className="mt-1 block font-mono text-[15px] font-bold tracking-tight text-teal-800">{resumen(e.lineas) || '—'}</span>
          {e.observaciones && <span className="mt-1.5 block rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs leading-snug text-amber-900 ring-1 ring-amber-200/70"><b className="font-semibold">Obs.:</b> {e.observaciones}</span>}
          {puedeAnotar && n > 0 && <span className={`mt-1.5 block text-xs font-medium ${completo ? 'text-emerald-700' : 'text-slate-500'}`}>{completo ? 'Pesos anotados' : `Pesos: ${hechos} de ${n} · toca para anotar`}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end justify-between">
          {cat?.fotos?.[0] ? <Foto ruta={cat.fotos[0]} className="h-12 w-16 rounded-lg bg-slate-100" /> : <span className="h-12 w-16" />}
          <span className="text-lg leading-none text-slate-300">›</span>
        </span>
      </button>
    </li>
  )
}

// Ficha completa del ejercicio: fotos pequeñas (se amplían al tocar), vídeos, y un peso por línea
export function DetalleEjercicio({ pid, rid, ejercicio: e, numero, total, puedeAnotar, sesion, onMarcar, onTerminar, onCerrar, onAnterior, onSiguiente }) {
  const cat = useCatalogo(e.ejercicioId)
  const [ampliada, setAmpliada] = useState(null)
  const [descanso, setDescanso] = useState(false)
  const [titulo, ...resto] = e.nombre.split('\n').filter(Boolean)

  useEffect(() => {
    const tecla = ev => ev.key === 'Escape' && (ampliada ? setAmpliada(null) : onCerrar())
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = '' }
  }, [onCerrar, ampliada])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-fondo sm:items-center sm:justify-center sm:bg-slate-900/50 sm:p-4">
      <div className="flex min-h-0 w-full flex-1 flex-col bg-fondo sm:max-h-[92dvh] sm:max-w-lg sm:flex-none sm:overflow-hidden sm:rounded-3xl">
        <div className="flex items-center gap-2 bg-gradient-to-r from-teal-700 to-teal-600 px-3 py-3 text-white">
          <button onClick={onCerrar} aria-label="Volver a la lista" className="flex h-9 items-center gap-1 rounded-full bg-white/15 pl-2 pr-3 text-sm font-medium"><span className="text-lg leading-none">‹</span> Lista</button>
          <span className="flex-1 text-center text-xs font-medium text-teal-100">{numero} de {total}</span>
          {onMarcar && <button onClick={() => setDescanso(true)} className="flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3 text-sm font-medium"><span aria-hidden="true">⏱</span> Descanso</button>}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <h2 className="text-xl font-bold leading-snug tracking-tight">{titulo}</h2>
            {resto.length > 0 && <p className="mt-0.5 text-sm text-slate-500">{resto.join(' · ')}</p>}
          </div>

          {cat?.fotos?.length > 0 && (
            <div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {cat.fotos.map(f => (
                  <button key={f} onClick={() => setAmpliada(f)} aria-label="Ampliar foto" className="shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-200 transition active:scale-95">
                    <Foto ruta={f} className="h-24 w-32 bg-white" />
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Toca una foto para ampliarla</p>
            </div>
          )}

          {cat?.videos?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {cat.videos.map((v, i) => <a key={v} href={v} target="_blank" rel="noreferrer" className="btn-sec !h-10 text-sm">▶ Ver vídeo{cat.videos.length > 1 ? ` ${i + 1}` : ''}</a>)}
            </div>
          )}

          {e.observaciones && <p className="rounded-2xl bg-amber-50 p-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200/70"><b className="font-semibold">Observaciones:</b> {e.observaciones}</p>}

          <ul className="space-y-3">
            {(e.lineas ?? []).map((l, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/70">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-lg font-bold tracking-tight">{formatLinea(l)}</div>
                  <div className="mt-0.5 text-sm leading-snug text-slate-600">{describirLinea(l)}</div>
                </div>
                <CampoPeso pid={pid} rid={rid} ejercicio={e} indice={i} puedeAnotar={puedeAnotar} />
                {onMarcar && (() => {
                  const hecho = !!sesion?.hechos?.[claveLinea(e.id, i)]
                  return (
                    <button onClick={() => onMarcar(i, !hecho)} aria-pressed={hecho} aria-label={hecho ? 'Marcar como no hecha' : 'Marcar serie como hecha'}
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold transition active:scale-90 ${hecho ? 'bg-emerald-500 text-white shadow-md shadow-emerald-900/20' : 'border-2 border-slate-300 text-slate-300'}`}>✓</button>
                  )
                })()}
              </li>
            ))}
          </ul>
          {e.pesosActualizado && <p className="text-xs text-slate-400">Pesos actualizados el {fmt(e.pesosActualizado)}</p>}
        </div>

        <div className="flex gap-2 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button className="btn-sec !h-11 flex-1" onClick={onAnterior ?? undefined} disabled={!onAnterior}>‹ Anterior</button>
          {onSiguiente ? <button className="btn !h-11 flex-1" onClick={onSiguiente}>Siguiente ›</button> : <button className="btn !h-11 flex-1" onClick={onTerminar ?? onCerrar}>{onTerminar ? 'Terminar entreno' : 'Terminar'}</button>}
        </div>
      </div>

      {descanso && <Descanso onCerrar={() => setDescanso(false)} />}
      {ampliada && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-3" onClick={() => setAmpliada(null)}>
          <Foto ruta={ampliada} className="h-full max-h-[85dvh] w-full max-w-3xl !bg-transparent" />
          <button aria-label="Cerrar foto" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl text-white">✕</button>
        </div>
      )}
    </div>
  )
}

// Un peso por línea del volumen, una vez por rutina. Se guarda al salir del campo.
function CampoPeso({ pid, rid, ejercicio: e, indice, puedeAnotar }) {
  const guardado = e.pesos?.[indice]
  const [valor, setValor] = useState(guardado ?? '')
  const [estado, setEstado] = useState('') // '' | guardando | ok | error

  useEffect(() => { setValor(guardado ?? '') }, [guardado])

  if (!puedeAnotar) return <div className="w-24 text-right text-lg font-bold">{guardado != null ? `${guardado} kg` : <span className="text-sm font-normal text-slate-400">sin peso</span>}</div>

  const guardar = async () => {
    const texto = String(valor).replace(',', '.').trim()
    const n = texto === '' ? null : Number(texto)
    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 1000)) { setEstado('error'); return }
    if ((n ?? undefined) === guardado) return
    setEstado('guardando')
    try {
      await updateDoc(doc(db, 'pacientes', pid, 'rutinas', rid, 'ejercicios', e.id), {
        [`pesos.${indice}`]: n === null ? deleteField() : n,
        pesosActualizado: serverTimestamp(),
      })
      setEstado('ok'); setTimeout(() => setEstado(''), 1800)
    } catch { setEstado('error') }
  }

  return (
    <label className="flex shrink-0 flex-col items-end">
      <span className="flex items-center gap-1.5">
        <input type="text" inputMode="decimal" placeholder="0" aria-label={`Peso de la línea ${indice + 1} en kilos`}
          className={`h-14 w-24 rounded-xl border-2 bg-white px-2 text-center text-xl font-bold shadow-sm focus:outline-none focus:ring-4 ${estado === 'error' ? 'border-red-400 focus:ring-red-200' : guardado != null ? 'border-teal-500 focus:ring-teal-600/15' : 'border-slate-300 focus:border-teal-600 focus:ring-teal-600/15'}`}
          value={valor} onChange={ev => { setValor(ev.target.value); setEstado('') }} onBlur={guardar}
          onKeyDown={ev => ev.key === 'Enter' && ev.currentTarget.blur()} />
        <span className="text-sm font-semibold text-slate-500">kg</span>
      </span>
      <span className={`mt-0.5 h-4 text-xs font-medium ${estado === 'error' ? 'text-red-600' : 'text-teal-700'}`}>
        {estado === 'guardando' ? 'Guardando…' : estado === 'ok' ? '✓ Guardado' : estado === 'error' ? 'No se pudo guardar' : ''}
      </span>
    </label>
  )
}
