import { useMemo, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { slug } from '../lib/util'
import { describirLinea, formatLineas, parseLineas, seriesTotales } from '../lib/volumen'
import Modal from './Modal'

const NUEVO = '__nuevo__'

// Crea o edita un volumen del catálogo. onGuardado recibe el volumen guardado (con su id).
export default function EditorVolumen({ volumen, sistemas, onClose, onGuardado, onBorrado }) {
  const nuevo = !volumen
  const [nombre, setNombre] = useState(volumen?.nombre ?? '')
  const [sistemaId, setSistemaId] = useState(volumen?.sistemaId ?? sistemas[0]?.id ?? NUEVO)
  const [sistemaNuevo, setSistemaNuevo] = useState('')
  const [texto, setTexto] = useState(volumen ? formatLineas(volumen.lineas) : '')
  const [observaciones, setObservaciones] = useState(volumen?.observaciones ?? '')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  const analisis = useMemo(() => (texto.trim() ? parseLineas(texto) : null), [texto])

  const guardar = async e => {
    e.preventDefault()
    const r = parseLineas(texto)
    if (r.error) { setError(r.error); return }
    setOcupado(true); setError('')
    try {
      let sid = sistemaId
      if (sid === NUEVO) {
        const n = sistemaNuevo.trim()
        if (!n) throw new Error('Escribe el nombre del sistema de entrenamiento.')
        sid = slug(n)
        if (!sid) throw new Error('El nombre del sistema no es válido.')
        const existente = sistemas.find(s => s.id === sid)
        if (!existente) await setDoc(doc(db, 'sistemasEntrenamiento', sid), { nombre: n })
      }
      const datos = { sistemaId: sid, lineas: r.lineas, seriesTotales: seriesTotales(r.lineas), observaciones: observaciones.trim() }
      if (nombre.trim()) datos.nombre = nombre.trim()
      let id = volumen?.id
      if (nuevo) id = (await addDoc(collection(db, 'volumenes'), datos)).id
      else await setDoc(doc(db, 'volumenes', id), datos)
      onGuardado({ id, ...datos })
    } catch (err) { setError(err.message); setOcupado(false) }
  }

  const borrar = async () => {
    if (!window.confirm('¿Eliminar este volumen del catálogo?\n\nLas rutinas que ya lo usan conservan su propia copia.')) return
    setOcupado(true)
    try { await deleteDoc(doc(db, 'volumenes', volumen.id)); onBorrado?.(volumen.id) }
    catch (err) { setError(err.message); setOcupado(false) }
  }

  return (
    <Modal titulo={nuevo ? 'Nuevo volumen' : 'Editar volumen'} onClose={ocupado ? () => {} : onClose} ancho="max-w-xl">
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className="etiqueta" htmlFor="v-lineas">Series y repeticiones</label>
          <input id="v-lineas" className="input font-mono" value={texto} onChange={e => setTexto(e.target.value)} placeholder="2*10  1*8+4  3*SG" autoFocus autoComplete="off" />
          <p className="mt-1 text-xs text-slate-500">
            Cada línea es <b>series*repeticiones</b>. El <b>+</b> es una micropausa: <span className="font-mono">2*10+8</span> son 2 series de 10 repeticiones, pausa y 8 más. Tras el <b>*</b> también vale una abreviatura que el paciente conozca, como <span className="font-mono">3*SG</span> (serie gigante). Separa las líneas con espacios.
          </p>
          {analisis?.error && <p className="mt-2 text-sm text-red-600">{analisis.error}</p>}
          {analisis?.lineas && (
            <div className="mt-2 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">
              <ul className="space-y-0.5">{analisis.lineas.map((l, i) => <li key={i}><span className="font-mono font-medium">{l.series}*{l.tramos.join('+')}</span> — {describirLinea(l)}</li>)}</ul>
              <p className="mt-1.5 font-medium">Series totales: {seriesTotales(analisis.lineas)}</p>
            </div>
          )}
        </div>

        <div>
          <label className="etiqueta" htmlFor="v-sistema">Sistema de entrenamiento</label>
          <select id="v-sistema" className="input" value={sistemaId} onChange={e => setSistemaId(e.target.value)}>
            {sistemas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            <option value={NUEVO}>＋ Crear un sistema nuevo…</option>
          </select>
          {sistemaId === NUEVO && <input className="input mt-2" value={sistemaNuevo} onChange={e => setSistemaNuevo(e.target.value)} placeholder="Nombre del sistema (p. ej. Fuerza, Hipertrofia)" />}
        </div>

        <div>
          <label className="etiqueta" htmlFor="v-nombre">Nombre (opcional)</label>
          <input id="v-nombre" className="input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Si lo dejas vacío se muestra la notación" />
        </div>

        <div>
          <label className="etiqueta" htmlFor="v-obs">Observaciones</label>
          <textarea id="v-obs" rows={3} className="input" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Texto estándar: tempo, descansos, indicaciones…" />
          <p className="mt-1 text-xs text-slate-500">Se copian al asignar el volumen a un ejercicio, y allí se pueden cambiar sin tocar este texto.</p>
        </div>

        {error && !analisis?.error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          {!nuevo && onBorrado ? <button type="button" className="btn-peligro" onClick={borrar} disabled={ocupado}>Eliminar</button> : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-sec" onClick={onClose} disabled={ocupado}>Cancelar</button>
            <button className="btn" disabled={ocupado || !!analisis?.error}>{ocupado ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
