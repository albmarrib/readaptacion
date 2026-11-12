import { useState } from 'react'
import { doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { slug } from '../lib/util'
import { centroActual, idDeCentro } from '../lib/centro'
import Modal from './Modal'

// Gestión de los sistemas de entrenamiento del centro: crear, renombrar y borrar.
// Si un sistema tiene volúmenes, al borrarlo se mueven antes a otro sistema (no se pierde nada).
// Las rutinas no dependen del sistema (guardan su propia copia del volumen), así que no les afecta.
export default function GestionSistemas({ sistemas, volumenes, onClose }) {
  const [editando, setEditando] = useState(null) // { id, nombre }
  const [borrando, setBorrando] = useState(null) // { id, destino }
  const [nuevo, setNuevo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  const cuantos = id => volumenes.filter(v => v.sistemaId === id).length
  const repetido = (n, id) => sistemas.some(s => s.id !== id && slug(s.nombre) === slug(n))
  const ejecutar = async fn => {
    setOcupado(true); setError('')
    try { await fn() } catch (e) { setError(e.message) } finally { setOcupado(false) }
  }

  const renombrar = e => {
    e.preventDefault()
    const n = editando.nombre.trim()
    if (n.length < 2) { setError('Escribe el nombre del sistema.'); return }
    if (repetido(n, editando.id)) { setError(`Ya existe un sistema llamado «${n}».`); return }
    ejecutar(async () => { await updateDoc(doc(db, 'sistemasEntrenamiento', editando.id), { nombre: n }); setEditando(null) })
  }

  const crear = e => {
    e.preventDefault()
    const n = nuevo.trim()
    if (n.length < 2 || !slug(n)) { setError('Escribe el nombre del sistema.'); return }
    if (repetido(n)) { setError(`Ya existe un sistema llamado «${n}».`); return }
    ejecutar(async () => { await setDoc(doc(db, 'sistemasEntrenamiento', idDeCentro(slug(n))), { nombre: n, centroId: centroActual() }); setNuevo('') })
  }

  const borrar = () => ejecutar(async () => {
    const { id, destino } = borrando
    const afectados = volumenes.filter(v => v.sistemaId === id)
    if (afectados.length && !destino) throw new Error('Elige a qué sistema pasan sus volúmenes.')
    // En lotes de 400 (límite de Firestore: 500 operaciones por lote)
    for (let i = 0; i < afectados.length; i += 400) {
      const lote = writeBatch(db)
      afectados.slice(i, i + 400).forEach(v => lote.update(doc(db, 'volumenes', v.id), { sistemaId: destino }))
      await lote.commit()
    }
    const lote = writeBatch(db)
    lote.delete(doc(db, 'sistemasEntrenamiento', id))
    await lote.commit()
    setBorrando(null)
  })

  return (
    <Modal titulo="Sistemas de entrenamiento" onClose={ocupado ? () => {} : onClose} ancho="max-w-lg">
      <div className="space-y-3">
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {sistemas.map(s => {
            const n = cuantos(s.id)
            if (editando?.id === s.id) return (
              <li key={s.id} className="p-2.5">
                <form onSubmit={renombrar} className="flex gap-2">
                  <input className="input flex-1" value={editando.nombre} onChange={e => setEditando({ ...editando, nombre: e.target.value })} autoFocus maxLength={60} />
                  <button className="btn btn-xs" disabled={ocupado}>Guardar</button>
                  <button type="button" className="btn-sec btn-xs" onClick={() => setEditando(null)}>Cancelar</button>
                </form>
              </li>
            )
            if (borrando?.id === s.id) {
              const otros = sistemas.filter(x => x.id !== s.id)
              return (
                <li key={s.id} className="space-y-2 bg-red-50 p-3 text-sm">
                  <p>¿Borrar <b>{s.nombre}</b>?{n > 0 ? ` Tiene ${n} volumen${n === 1 ? '' : 'es'}: no se borran, pasan a otro sistema.` : ''}</p>
                  {n > 0 && (otros.length ? (
                    <label className="block"><span className="etiqueta">Pasar sus volúmenes a</span>
                      <select className="input" value={borrando.destino ?? ''} onChange={e => setBorrando({ ...borrando, destino: e.target.value })}>
                        <option value="" disabled>Elige un sistema…</option>
                        {otros.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                      </select>
                    </label>
                  ) : <p className="text-red-700">Es el único sistema: crea otro abajo antes de borrarlo.</p>)}
                  <div className="flex gap-2">
                    <button className="btn-peligro btn-xs" disabled={ocupado || (n > 0 && !borrando.destino)} onClick={borrar}>{ocupado ? 'Borrando…' : n > 0 ? 'Mover volúmenes y borrar' : 'Borrar'}</button>
                    <button className="btn-sec btn-xs" onClick={() => setBorrando(null)} disabled={ocupado}>Cancelar</button>
                  </div>
                </li>
              )
            }
            return (
              <li key={s.id} className="flex items-center gap-2 p-2.5">
                <span className="flex-1 font-medium">{s.nombre} <span className="text-xs font-normal text-slate-400">{n} {n === 1 ? 'volumen' : 'volúmenes'}</span></span>
                <button className="btn-sec btn-xs" onClick={() => { setError(''); setBorrando(null); setEditando({ id: s.id, nombre: s.nombre }) }}>Renombrar</button>
                <button className="btn-peligro btn-xs" onClick={() => { setError(''); setEditando(null); setBorrando({ id: s.id }) }}>Borrar</button>
              </li>
            )
          })}
          {sistemas.length === 0 && <li className="p-3 text-sm text-slate-500">Todavía no hay sistemas.</li>}
        </ul>
        <form onSubmit={crear} className="flex gap-2">
          <input className="input flex-1" value={nuevo} onChange={e => setNuevo(e.target.value)} placeholder="Nuevo sistema (p. ej. Fuerza, Hipertrofia)" maxLength={60} />
          <button className="btn" disabled={ocupado || !nuevo.trim()}>Añadir</button>
        </form>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-slate-500">Cambiar o borrar un sistema no afecta a las rutinas ya hechas.</p>
      </div>
    </Modal>
  )
}
