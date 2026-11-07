import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Timestamp, collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { useGrupos } from '../lib/datos'
import { describirLinea, formatLineas, seriesTotales, tituloDia, tituloGrupo } from '../lib/volumen'
import SelectorEjercicios from '../components/SelectorEjercicios'
import SelectorVolumen from '../components/SelectorVolumen'

const ESTADOS = { borrador: 'Borrador', activa: 'Activa', pendiente: 'Pendiente de revisión', cerrada: 'Cerrada' }
const COLOR = { borrador: 'bg-slate-200 text-slate-700', activa: 'bg-teal-100 text-teal-800', pendiente: 'bg-amber-100 text-amber-800', cerrada: 'bg-slate-300 text-slate-700' }

const diaVacio = () => ({ gruposIds: [], ejercicios: [] })
const fecha = t => (t?.toDate ? t.toDate() : t ? new Date(t) : null)
const fmt = t => fecha(t)?.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

export default function RutinaEditor() {
  const { id: pid, rid } = useParams()
  const nueva = !rid
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const grupos = useGrupos()

  const [paciente, setPaciente] = useState(null)
  const [meta, setMeta] = useState({ temporada: new Date().getFullYear(), semanas: 5, frecuencia: '', notaGeneral: '', estado: 'borrador', numero: null, fechaInicio: null, fechaFin: null })
  const [dias, setDias] = useState([diaVacio(), diaVacio(), diaVacio()])
  const [guardados, setGuardados] = useState([])   // ids de ejercicios ya guardados en Firestore
  const [diaActivo, setDiaActivo] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [sucio, setSucio] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [selector, setSelector] = useState(false)
  const [volumenDe, setVolumenDe] = useState(null)  // clave del ejercicio que elige volumen

  const editable = meta.estado === 'borrador'

  // ---- Carga ----
  useEffect(() => {
    let vivo = true
    setCargando(true); setError('')
    ;(async () => {
      const p = await getDoc(doc(db, 'pacientes', pid))
      if (!p.exists()) throw new Error('No se encuentra el paciente.')
      if (!vivo) return
      setPaciente({ id: pid, ...p.data() })
      if (nueva) { setCargando(false); return }
      const r = await getDoc(doc(db, 'pacientes', pid, 'rutinas', rid))
      if (!r.exists()) throw new Error('No se encuentra la rutina.')
      const ejs = await getDocs(collection(db, 'pacientes', pid, 'rutinas', rid, 'ejercicios'))
      if (!vivo) return
      const d = r.data()
      setMeta({ temporada: d.temporada, semanas: d.semanas, frecuencia: d.frecuencia ?? '', notaGeneral: d.notaGeneral ?? '', estado: d.estado, numero: d.numero, fechaInicio: d.fechaInicio ?? null, fechaFin: d.fechaFin ?? null })
      const todos = ejs.docs.map(x => ({ clave: x.id, ...x.data() }))
      setDias(d.dias.map(dia => ({
        gruposIds: dia.gruposIds ?? [],
        ejercicios: todos.filter(e => e.dia === dia.numero).sort((a, b) => a.orden - b.orden),
      })))
      setGuardados(todos.map(e => e.clave))
      setSucio(false); setCargando(false)
    })().catch(e => { if (vivo) { setError(e.message); setCargando(false) } })
    return () => { vivo = false }
  }, [pid, rid, nueva])

  useEffect(() => {
    if (!sucio) return
    const f = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', f)
    return () => window.removeEventListener('beforeunload', f)
  }, [sucio])

  // ---- Cambios en memoria ----
  const cambiarMeta = parche => { setMeta(m => ({ ...m, ...parche })); setSucio(true) }
  const cambiarDia = (i, fn) => { setDias(ds => ds.map((d, j) => (j === i ? fn(d) : d))); setSucio(true) }
  const cambiarEj = (clave, parche) => cambiarDia(diaActivo, d => ({ ...d, ejercicios: d.ejercicios.map(e => (e.clave === clave ? { ...e, ...parche } : e)) }))

  const cambiarNumeroDias = n => {
    if (n < dias.length) {
      const perdidos = dias.slice(n).reduce((s, d) => s + d.ejercicios.length, 0)
      if (perdidos && !window.confirm(`Se quitarán ${dias.length - n} día(s) con ${perdidos} ejercicio(s). ¿Continuar?`)) return
    }
    setDias(ds => Array.from({ length: n }, (_, i) => ds[i] ?? diaVacio()))
    setDiaActivo(a => Math.min(a, n - 1))
    setSucio(true)
  }

  const alternarGrupo = gid => cambiarDia(diaActivo, d => ({
    ...d, gruposIds: d.gruposIds.includes(gid) ? d.gruposIds.filter(x => x !== gid) : [...d.gruposIds, gid],
  }))

  const anadir = lista => {
    cambiarDia(diaActivo, d => ({
      ...d,
      ejercicios: [...d.ejercicios, ...lista.map(e => ({
        clave: crypto.randomUUID(), ejercicioId: e.id, nombre: e.nombre, grupoId: e.grupoId,
        lineas: null, seriesTotales: 0, observaciones: '', pesos: {},
      }))],
    }))
    setSelector(false)
  }

  const quitar = clave => cambiarDia(diaActivo, d => ({ ...d, ejercicios: d.ejercicios.filter(e => e.clave !== clave) }))
  const mover = (clave, delta) => cambiarDia(diaActivo, d => {
    const i = d.ejercicios.findIndex(e => e.clave === clave), j = i + delta
    if (j < 0 || j >= d.ejercicios.length) return d
    const lista = [...d.ejercicios];
    [lista[i], lista[j]] = [lista[j], lista[i]]
    return { ...d, ejercicios: lista }
  })

  const asignarVolumen = v => {
    // Se copia (instantánea): si el volumen del catálogo cambia, esta rutina no cambia
    cambiarEj(volumenDe, { volumenId: v.id, volumenNombre: v.nombre ?? null, lineas: v.lineas, seriesTotales: seriesTotales(v.lineas), observaciones: v.observaciones ?? '' })
    setVolumenDe(null)
  }
  const quitarVolumen = () => { cambiarEj(volumenDe, { volumenId: null, volumenNombre: null, lineas: null, seriesTotales: 0, observaciones: '' }); setVolumenDe(null) }

  // ---- Cálculos ----
  const seriesDia = useMemo(() => dias.map(d => d.ejercicios.reduce((s, e) => s + (e.lineas ? seriesTotales(e.lineas) : 0), 0)), [dias])
  const dia = dias[diaActivo]
  const ejercicioVolumen = dia?.ejercicios.find(e => e.clave === volumenDe)

  // ---- Guardado ----
  const guardar = useCallback(async ({ activar = false } = {}) => {
    setGuardando(true); setError(''); setAviso('')
    try {
      const semanas = Number(meta.semanas), temporada = Number(meta.temporada)
      if (!(semanas >= 1 && semanas <= 52)) throw new Error('La duración debe estar entre 1 y 52 semanas.')
      if (!(temporada >= 2000 && temporada <= 2100)) throw new Error('La temporada no es válida.')
      if (meta.frecuencia !== '' && !(Number(meta.frecuencia) >= 0 && Number(meta.frecuencia) <= 99)) throw new Error('La frecuencia debe estar entre 0 y 99.')

      let numero = meta.numero
      if (!numero) {
        const s = await getDocs(collection(db, 'pacientes', pid, 'rutinas'))
        numero = Math.max(0, ...s.docs.map(d => d.data().numero ?? 0)) + 1
      }
      const rutinaRef = nueva ? doc(collection(db, 'pacientes', pid, 'rutinas')) : doc(db, 'pacientes', pid, 'rutinas', rid)
      const datos = {
        numero, temporada, semanas, estado: activar ? 'activa' : meta.estado,
        dias: dias.map((d, i) => ({ numero: i + 1, gruposIds: d.gruposIds, titulo: tituloDia(d.gruposIds, grupos) })),
        creadaPor: perfil.uid,
      }
      if (meta.frecuencia !== '') datos.frecuencia = Number(meta.frecuencia)
      if (meta.notaGeneral.trim()) datos.notaGeneral = meta.notaGeneral.trim()
      if (activar) {
        const inicio = new Date()
        datos.fechaInicio = Timestamp.fromDate(inicio)
        datos.fechaFin = Timestamp.fromDate(new Date(inicio.getTime() + semanas * 7 * 86400000))
      }

      const lote = writeBatch(db)
      lote.set(rutinaRef, datos)
      const ahora = new Set()
      dias.forEach((d, i) => d.ejercicios.forEach((e, orden) => {
        ahora.add(e.clave)
        const ej = {
          dia: i + 1, orden: orden + 1, ejercicioId: e.ejercicioId, nombre: e.nombre, grupoId: e.grupoId,
          lineas: e.lineas ?? [], seriesTotales: e.lineas ? seriesTotales(e.lineas) : 0,
          observaciones: e.observaciones ?? '', pesos: e.pesos ?? {},
        }
        if (e.volumenId) ej.volumenId = e.volumenId
        if (e.volumenNombre) ej.volumenNombre = e.volumenNombre
        if (e.pesosActualizado) ej.pesosActualizado = e.pesosActualizado
        lote.set(doc(db, 'pacientes', pid, 'rutinas', rutinaRef.id, 'ejercicios', e.clave), ej)
      }))
      guardados.filter(c => !ahora.has(c)).forEach(c => lote.delete(doc(db, 'pacientes', pid, 'rutinas', rutinaRef.id, 'ejercicios', c)))
      await lote.commit()

      setSucio(false)
      if (nueva) navigate(`/pacientes/${pid}/rutinas/${rutinaRef.id}`, { replace: true })
      else {
        setGuardados([...ahora]); setMeta(m => ({ ...m, numero, estado: datos.estado, fechaInicio: datos.fechaInicio ?? m.fechaInicio, fechaFin: datos.fechaFin ?? m.fechaFin }))
        setAviso(activar ? 'Rutina activada: ya la ve el paciente.' : 'Cambios guardados.')
      }
    } catch (e) { setError('No se pudo guardar: ' + e.message) }
    finally { setGuardando(false) }
  }, [meta, dias, grupos, guardados, nueva, rid, pid, perfil.uid, navigate])

  const activar = () => {
    const vacios = dias.findIndex(d => !d.ejercicios.length)
    if (vacios >= 0) { setError(`El día ${vacios + 1} no tiene ejercicios.`); setDiaActivo(vacios); return }
    for (const [i, d] of dias.entries()) if (d.ejercicios.some(e => !e.lineas)) { setError(`En el día ${i + 1} hay ejercicios sin volumen.`); setDiaActivo(i); return }
    if (!window.confirm(`¿Activar la rutina?\n\nEmpieza hoy y dura ${meta.semanas} semanas. Una vez activa no se puede modificar.`)) return
    guardar({ activar: true })
  }

  const eliminar = async () => {
    if (!window.confirm('¿Eliminar esta rutina borrador? No se puede deshacer.')) return
    setGuardando(true)
    try {
      const lote = writeBatch(db)
      guardados.forEach(c => lote.delete(doc(db, 'pacientes', pid, 'rutinas', rid, 'ejercicios', c)))
      lote.delete(doc(db, 'pacientes', pid, 'rutinas', rid))
      await lote.commit()
      setSucio(false)
      navigate(`/pacientes/${pid}`)
    } catch (e) { setError('No se pudo eliminar: ' + e.message); setGuardando(false) }
  }

  if (cargando || !grupos) return <p className="text-slate-500">Cargando…</p>
  if (!paciente) return <p className="rounded-xl bg-red-50 p-3 text-red-700">{error || 'No se encuentra el paciente.'}</p>

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={`/pacientes/${pid}`} className="text-slate-500 hover:text-slate-800" aria-label="Volver" onClick={e => { if (sucio && !window.confirm('Hay cambios sin guardar. ¿Salir sin guardar?')) e.preventDefault() }}>←</Link>
        <div>
          <h1 className="text-xl font-semibold">{nueva ? 'Nueva rutina' : `Rutina ${meta.numero}`} · {paciente.nombre}</h1>
          {!nueva && <p className="text-sm text-slate-500">Temporada {meta.temporada}{meta.fechaInicio ? ` · del ${fmt(meta.fechaInicio)} al ${fmt(meta.fechaFin)}` : ''}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${COLOR[meta.estado]}`}>{ESTADOS[meta.estado]}</span>
      </div>

      {!editable && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">Esta rutina ya no es un borrador y no se puede modificar.</p>}

      {/* Ajustes generales */}
      <section className="tarjeta space-y-3">
        <h2 className="font-semibold">Ajustes</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label><span className="etiqueta">Temporada</span><input type="number" className="input" disabled={!editable} value={meta.temporada} onChange={e => cambiarMeta({ temporada: e.target.value })} /></label>
          <label><span className="etiqueta">Duración (semanas)</span><input type="number" min="1" max="52" className="input" disabled={!editable} value={meta.semanas} onChange={e => cambiarMeta({ semanas: e.target.value })} /></label>
          <label><span className="etiqueta">Días por semana</span>
            <select className="input" disabled={!editable} value={dias.length} onChange={e => cambiarNumeroDias(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label><span className="etiqueta">Frecuencia (opcional)</span><input type="number" min="0" max="99" className="input" disabled={!editable} value={meta.frecuencia} onChange={e => cambiarMeta({ frecuencia: e.target.value })} /></label>
        </div>
        <label className="block"><span className="etiqueta">Nota general (opcional)</span><textarea rows={2} className="input" disabled={!editable} value={meta.notaGeneral} onChange={e => cambiarMeta({ notaGeneral: e.target.value })} /></label>
      </section>

      {/* Pestañas de días */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {dias.map((d, i) => (
          <button key={i} onClick={() => setDiaActivo(i)}
            className={`shrink-0 rounded-2xl border px-4 py-2 text-left ${i === diaActivo ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}>
            <div className="text-sm font-semibold">Día {i + 1}</div>
            <div className={`text-xs ${i === diaActivo ? 'text-teal-100' : 'text-slate-500'}`}>{seriesDia[i]} series</div>
          </button>
        ))}
      </div>

      {/* Día activo */}
      <section className="tarjeta space-y-4">
        <div>
          <h2 className="font-semibold">Día {diaActivo + 1}{dia.gruposIds.length > 0 && <span className="font-normal text-slate-600"> · {tituloDia(dia.gruposIds, grupos)}</span>}</h2>
          <p className="mt-1 text-sm text-slate-500">Grupos musculares del día:</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {grupos.map(g => {
              const sel = dia.gruposIds.includes(g.id)
              return (
                <button key={g.id} disabled={!editable} onClick={() => alternarGrupo(g.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${sel ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'} disabled:opacity-60`}>
                  {tituloGrupo(g.nombre)}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-teal-50 px-4 py-3 text-teal-900">
          <span className="text-sm font-medium">Esfuerzo del día</span>
          <span className="text-lg font-bold">{seriesDia[diaActivo]} series</span>
        </div>

        {dia.ejercicios.length === 0 && <p className="py-4 text-center text-sm text-slate-500">{dia.gruposIds.length ? 'Todavía no hay ejercicios en este día.' : 'Elige primero los grupos musculares del día.'}</p>}

        <ul className="space-y-3">
          {dia.ejercicios.map((e, i) => {
            const [titulo, ...resto] = e.nombre.split('\n').filter(Boolean)
            return (
              <li key={e.clave} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium leading-snug">{titulo}</div>
                    {resto.length > 0 && <div className="text-xs text-slate-500">{resto.join(' · ')}</div>}
                  </div>
                  {editable && (
                    <div className="flex shrink-0 gap-1">
                      <button className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={i === 0} onClick={() => mover(e.clave, -1)} aria-label="Subir">↑</button>
                      <button className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={i === dia.ejercicios.length - 1} onClick={() => mover(e.clave, 1)} aria-label="Bajar">↓</button>
                      <button className="rounded-lg px-2 py-1 text-red-600 hover:bg-red-50" onClick={() => quitar(e.clave)} aria-label="Quitar ejercicio">✕</button>
                    </div>
                  )}
                </div>

                <div className="mt-2 rounded-xl bg-slate-50 p-3">
                  {e.lineas ? (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono text-sm font-semibold">{e.volumenNombre ? `${e.volumenNombre} · ` : ''}{formatLineas(e.lineas)}</div>
                          <ul className="mt-0.5 text-xs text-slate-500">{e.lineas.map((l, k) => <li key={k}>{describirLinea(l)}</li>)}</ul>
                        </div>
                        <span className="shrink-0 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800">{seriesTotales(e.lineas)} series</span>
                      </div>
                      {editable && <button className="mt-2 text-sm font-medium text-teal-700 underline" onClick={() => setVolumenDe(e.clave)}>Cambiar volumen</button>}
                    </>
                  ) : (
                    editable ? <button className="btn w-full" onClick={() => setVolumenDe(e.clave)}>Elegir volumen</button> : <span className="text-sm text-slate-500">Sin volumen</span>
                  )}
                </div>

                {e.lineas && (
                  <label className="mt-2 block">
                    <span className="text-xs font-medium text-slate-600">Observaciones de este ejercicio</span>
                    <textarea rows={2} className="input mt-1 text-sm" disabled={!editable} value={e.observaciones ?? ''} onChange={ev => cambiarEj(e.clave, { observaciones: ev.target.value })} />
                  </label>
                )}
              </li>
            )
          })}
        </ul>

        {editable && <button className="btn-sec w-full" disabled={!dia.gruposIds.length} onClick={() => setSelector(true)}>+ Añadir ejercicios</button>}
      </section>

      {(error || aviso) && <p role="alert" className={`rounded-xl p-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-800'}`}>{error || aviso}</p>}

      {/* Barra de acciones */}
      {editable && (
        <div className="fixed inset-x-0 bottom-[3.25rem] z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:bottom-0">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-500">{sucio ? 'Cambios sin guardar' : 'Todo guardado'}</div>
            <div className="flex gap-2">
              {!nueva && <button className="btn-peligro" onClick={eliminar} disabled={guardando}>Eliminar</button>}
              <button className="btn-sec" onClick={() => guardar()} disabled={guardando || (!sucio && !nueva)}>{guardando ? 'Guardando…' : 'Guardar borrador'}</button>
              <button className="btn" onClick={activar} disabled={guardando}>Activar</button>
            </div>
          </div>
        </div>
      )}

      {selector && <SelectorEjercicios grupos={grupos} gruposDia={dia.gruposIds} onClose={() => setSelector(false)} onAnadir={anadir} />}
      {volumenDe && <SelectorVolumen actual={ejercicioVolumen?.volumenId} onClose={() => setVolumenDe(null)} onElegir={asignarVolumen} onQuitar={ejercicioVolumen?.lineas ? quitarVolumen : null} />}
    </div>
  )
}
