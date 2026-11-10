import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { enlaceWhatsApp } from '../lib/util'
import { useSesiones } from '../lib/sesiones'

const fmt = t => t?.toDate?.().toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Acciones de seguimiento de una rutina ya activada: contactar, notas, cerrar, duplicar, evolución
export default function SeguimientoRutina({ paciente, rutina, rid, onCerrada, onDuplicar, duplicando }) {
  const { perfil, esAdmin } = useAuth()
  const [notas, setNotas] = useState(null)
  const [nombres, setNombres] = useState({})
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const pid = paciente.id
  const sesiones = useSesiones(pid, rid)
  const base = collection(db, 'pacientes', pid, 'rutinas', rid, 'notas')

  useEffect(() => onSnapshot(base,
    s => setNotas(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.fecha?.seconds ?? 1e12) - (a.fecha?.seconds ?? 1e12))),
    e => setError('No se pudieron cargar las notas: ' + e.message)), [pid, rid]) // eslint-disable-line react-hooks/exhaustive-deps

  // El administrador puede ver quién escribió cada nota; el resto ve "Tú" u "Otro entrenador"
  useEffect(() => {
    if (!esAdmin) return
    getDocs(collection(db, 'usuarios')).then(s => setNombres(Object.fromEntries(s.docs.map(d => [d.id, d.data().nombre]))))
  }, [esAdmin])
  const autor = id => (id === perfil.uid ? 'Tú' : nombres[id] ?? 'Otro entrenador')

  const anadir = async e => {
    e.preventDefault()
    if (!texto.trim()) return
    setOcupado(true); setError('')
    try { await addDoc(base, { autorId: perfil.uid, texto: texto.trim(), fecha: serverTimestamp() }); setTexto('') }
    catch (err) { setError('No se pudo guardar la nota: ' + err.message) }
    finally { setOcupado(false) }
  }

  const cerrar = async () => {
    if (!window.confirm('¿Cerrar esta rutina?\n\nPasa a solo lectura: ni el paciente ni tú podréis cambiar los pesos. Quedará en el histórico.')) return
    setOcupado(true); setError('')
    try { await updateDoc(doc(db, 'pacientes', pid, 'rutinas', rid), { estado: 'cerrada' }); onCerrada() }
    catch (err) { setError('No se pudo cerrar: ' + err.message) }
    finally { setOcupado(false) }
  }

  const mensaje = `Hola ${paciente.nombre.split(' ')[0]}, soy ${perfil.nombre.split(' ')[0]}. Te escribo por tu rutina ${rutina.numero}: `

  return (
    <section className="tarjeta space-y-4">
      <h2 className="font-semibold">Seguimiento</h2>

      <div className="flex flex-wrap gap-2">
        {paciente.telefono
          ? <a className="btn-sec" href={enlaceWhatsApp(paciente.telefono, mensaje)} target="_blank" rel="noreferrer">WhatsApp con {paciente.nombre.split(' ')[0]}</a>
          : <span className="btn-sec pointer-events-none opacity-50" title="La ficha no tiene teléfono">WhatsApp (falta teléfono)</span>}
        <Link className="btn-sec" to={`/pacientes/${pid}/evolucion`}>Ver evolución de pesos</Link>
        <button className="btn-sec" onClick={onDuplicar} disabled={duplicando}>{duplicando ? 'Duplicando…' : 'Duplicar como nueva rutina'}</button>
        {rutina.estado !== 'cerrada' && <button className="btn" onClick={cerrar} disabled={ocupado}>Cerrar rutina</button>}
      </div>

      <div>
        <h3 className="etiqueta">Entrenamientos hechos</h3>
        {sesiones === null ? <p className="text-xs text-slate-400">Cargando…</p> : (() => {
          const hechos = sesiones.filter(s => s.completada).length
          const previstos = (Number(rutina.semanas) || 0) * (rutina.dias?.length || 0)
          return (
            <>
              <p className="text-sm"><b className="text-teal-800">{hechos}</b> de {previstos || '—'} previstos{sesiones.length > hechos ? <span className="text-slate-500"> · {sesiones.length - hechos} a medias</span> : ''}</p>
              {sesiones.length > 0 && (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {sesiones.slice(0, 24).map(s => (
                    <li key={s.id} className={`insignia ring-1 ring-inset ${s.completada ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                      {new Date(s.fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · Día {s.dia}{s.completada ? ' ✓' : ''}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )
        })()}
      </div>

      <div>
        <h3 className="etiqueta">Notas y comentarios</h3>
        <form onSubmit={anadir} className="flex gap-2">
          <textarea rows={2} className="input" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Escribe una nota sobre esta rutina…" />
          <button className="btn shrink-0 self-start" disabled={ocupado || !texto.trim()}>Añadir</button>
        </form>
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        <ul className="mt-3 space-y-2">
          {(notas ?? []).map(n => (
            <li key={n.id} className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>{autor(n.autorId)} · {fmt(n.fecha) ?? 'ahora'}</span>
                {n.autorId === perfil.uid && <button className="text-red-600 underline" onClick={() => window.confirm('¿Borrar esta nota?') && deleteDoc(doc(db, 'pacientes', pid, 'rutinas', rid, 'notas', n.id))}>Borrar</button>}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{n.texto}</p>
            </li>
          ))}
          {notas?.length === 0 && <li className="text-sm text-slate-400">Todavía no hay notas.</li>}
        </ul>
      </div>
    </section>
  )
}
