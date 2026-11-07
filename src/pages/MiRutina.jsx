import { useEffect, useMemo, useState } from 'react'
import { collection, deleteField, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { describirLinea, formatLinea } from '../lib/volumen'
import Foto from '../components/Foto'
import PantallaConsentimiento from '../components/PantallaConsentimiento'
import { consentimientoVigente } from '../lib/consentimiento'

const VISIBLES = ['activa', 'pendiente', 'cerrada']
const fmt = t => (t?.toDate ? t.toDate() : t ? new Date(t) : null)?.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

export default function MiRutina() {
  const { perfil } = useAuth()
  const pid = perfil.pacienteId
  const [ficha, setFicha] = useState(undefined) // undefined = cargando
  const [error, setError] = useState('')

  useEffect(() => {
    if (!pid) return
    return onSnapshot(doc(db, 'pacientes', pid), s => setFicha(s.exists() ? s.data() : null),
      e => setError('No se pudo cargar tu ficha: ' + e.message))
  }, [pid])

  if (!pid) return <p className="tarjeta text-slate-600">Tu cuenta aún no está enlazada a una ficha. Contacta con tu entrenador.</p>
  if (error) return <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>
  if (ficha === undefined) return <p className="text-slate-500">Cargando…</p>
  if (!consentimientoVigente(ficha?.consentimiento)) return <PantallaConsentimiento pacienteId={pid} />
  return <ContenidoRutina pid={pid} />
}

function ContenidoRutina({ pid }) {
  const { perfil } = useAuth()
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
    <div className="tarjeta text-center">
      <h1 className="text-xl font-semibold">Hola, {perfil.nombre.split(' ')[0]}</h1>
      <p className="mt-2 text-slate-600">Tu entrenador todavía no te ha activado ninguna rutina. Cuando lo haga, aparecerá aquí.</p>
    </div>
  )

  const actual = rutinas.find(r => r.estado === 'activa') ?? rutinas[0]
  const mostrada = rutinas.find(r => r.id === elegida) ?? actual
  const anteriores = rutinas.filter(r => r.id !== mostrada.id)

  return (
    <div className="space-y-6">
      <VistaRutina key={mostrada.id} pid={pid} rutina={mostrada} esActual={mostrada.id === actual.id} />
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

function VistaRutina({ pid, rutina, esActual }) {
  const [ejercicios, setEjercicios] = useState(null)
  const [dia, setDia] = useState(0)
  const puedeAnotar = rutina.estado === 'activa'

  useEffect(() => onSnapshot(collection(db, 'pacientes', pid, 'rutinas', rutina.id, 'ejercicios'),
    s => setEjercicios(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setEjercicios([])), [pid, rutina.id])

  const delDia = useMemo(() => (ejercicios ?? []).filter(e => e.dia === rutina.dias[dia]?.numero).sort((a, b) => a.orden - b.orden), [ejercicios, rutina.dias, dia])
  const seriesDia = delDia.reduce((s, e) => s + (e.seriesTotales ?? 0), 0)
  const d = rutina.dias[dia]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{esActual ? 'Tu rutina' : `Rutina ${rutina.numero}`}</h1>
        <p className="text-sm text-slate-500">
          Rutina {rutina.numero} · temporada {rutina.temporada}
          {rutina.fechaInicio && <> · {fmt(rutina.fechaInicio)} – {fmt(rutina.fechaFin)}</>}
        </p>
        {!puedeAnotar && <p className="mt-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">{rutina.estado === 'pendiente' ? 'Esta rutina ha terminado y tu entrenador la está revisando. Ya no puedes cambiar los pesos.' : 'Rutina cerrada: solo lectura.'}</p>}
        {rutina.notaGeneral && <p className="mt-2 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">{rutina.notaGeneral}</p>}
      </div>

      <div className="sticky top-[3.4rem] z-10 -mx-4 flex gap-2 overflow-x-auto bg-slate-50/95 px-4 py-2 backdrop-blur">
        {rutina.dias.map((x, i) => (
          <button key={x.numero} onClick={() => setDia(i)}
            className={`shrink-0 rounded-full px-5 py-2.5 text-base font-semibold ${i === dia ? 'bg-teal-700 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}>
            Día {x.numero}
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold">{d.titulo || `Día ${d.numero}`}</h2>
        <p className="text-sm text-slate-500">{delDia.length} ejercicio{delDia.length === 1 ? '' : 's'} · {seriesDia} series</p>
      </div>

      {ejercicios === null ? <p className="text-slate-500">Cargando…</p> : (
        <ul className="space-y-5">
          {delDia.map((e, i) => <TarjetaEjercicio key={e.id} pid={pid} rid={rutina.id} ejercicio={e} numero={i + 1} puedeAnotar={puedeAnotar} />)}
        </ul>
      )}
    </div>
  )
}

const catalogo = new Map() // ejercicioId -> datos del catálogo (fotos y vídeos)

function TarjetaEjercicio({ pid, rid, ejercicio: e, numero, puedeAnotar }) {
  const [cat, setCat] = useState(() => catalogo.get(e.ejercicioId) ?? null)
  const [titulo, ...resto] = e.nombre.split('\n').filter(Boolean)

  useEffect(() => {
    if (cat || !e.ejercicioId) return
    let vivo = true
    getDoc(doc(db, 'ejercicios', e.ejercicioId)).then(s => {
      const datos = s.exists() ? s.data() : { fotos: [], videos: [] }
      catalogo.set(e.ejercicioId, datos)
      if (vivo) setCat(datos)
    }).catch(() => vivo && setCat({ fotos: [], videos: [] }))
    return () => { vivo = false }
  }, [cat, e.ejercicioId])

  return (
    <li className="tarjeta space-y-3 !p-0 overflow-hidden">
      {cat?.fotos?.length > 0 && (
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto bg-slate-100 p-2">
          {cat.fotos.map(f => <Foto key={f} ruta={f} className="aspect-[4/3] w-[85%] shrink-0 snap-center rounded-xl bg-white sm:w-72" />)}
        </div>
      )}
      <div className="space-y-3 px-4 pb-4 pt-1">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">{numero}</span>
          <div>
            <h3 className="text-lg font-semibold leading-snug">{titulo}</h3>
            {resto.length > 0 && <p className="text-sm text-slate-500">{resto.join(' · ')}</p>}
          </div>
        </div>
        {cat?.videos?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {cat.videos.map((v, i) => <a key={v} href={v} target="_blank" rel="noreferrer" className="btn-sec !py-2 text-sm">▶ Ver vídeo{cat.videos.length > 1 ? ` ${i + 1}` : ''}</a>)}
          </div>
        )}

        <ul className="space-y-2.5">
          {(e.lineas ?? []).map((l, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-base font-bold">{formatLinea(l)}</div>
                <div className="text-sm text-slate-600">{describirLinea(l)}</div>
              </div>
              <CampoPeso pid={pid} rid={rid} ejercicio={e} indice={i} puedeAnotar={puedeAnotar} />
            </li>
          ))}
        </ul>

        {e.observaciones && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><b>Observaciones:</b> {e.observaciones}</p>}
        {e.pesosActualizado && <p className="text-xs text-slate-400">Pesos actualizados el {fmt(e.pesosActualizado)}</p>}
      </div>
    </li>
  )
}

// Un peso por línea del volumen, una vez por rutina. Se guarda al salir del campo.
function CampoPeso({ pid, rid, ejercicio: e, indice, puedeAnotar }) {
  const guardado = e.pesos?.[indice]
  const [valor, setValor] = useState(guardado ?? '')
  const [estado, setEstado] = useState('') // '' | guardando | ok | error

  useEffect(() => { setValor(guardado ?? '') }, [guardado])

  if (!puedeAnotar) return <div className="w-24 text-right text-lg font-semibold">{guardado != null ? `${guardado} kg` : <span className="text-sm font-normal text-slate-400">sin peso</span>}</div>

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
          className={`h-14 w-24 rounded-xl border-2 bg-white px-2 text-center text-xl font-bold focus:outline-none ${estado === 'error' ? 'border-red-400' : 'border-slate-300 focus:border-teal-600'}`}
          value={valor} onChange={ev => { setValor(ev.target.value); setEstado('') }} onBlur={guardar}
          onKeyDown={ev => ev.key === 'Enter' && ev.currentTarget.blur()} />
        <span className="text-sm font-medium text-slate-500">kg</span>
      </span>
      <span className={`h-4 text-xs ${estado === 'error' ? 'text-red-600' : 'text-teal-700'}`}>
        {estado === 'guardando' ? 'Guardando…' : estado === 'ok' ? '✓ Guardado' : estado === 'error' ? 'No se pudo guardar' : ''}
      </span>
    </label>
  )
}
