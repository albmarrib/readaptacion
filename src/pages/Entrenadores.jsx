import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import Modal from '../components/Modal'

const crearEntrenador = () => httpsCallable(getFunctions(app, 'europe-west1'), 'crearEntrenador')

export default function Entrenadores() {
  const { perfil } = useAuth()
  const [usuarios, setUsuarios] = useState(null)
  const [alta, setAlta] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => onSnapshot(collection(db, 'usuarios'),
    s => setUsuarios(s.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.rol !== 'paciente').sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))),
    e => setError('No se pudo cargar la lista: ' + e.message)), [])

  const cambiar = async (u, datos) => {
    setError('')
    try { await updateDoc(doc(db, 'usuarios', u.uid), datos) }
    catch (e) { setError('No se pudo guardar el cambio: ' + e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="titulo-pagina">Entrenadores</h1>
        <button className="btn ml-auto" onClick={() => setAlta(true)}>+ Nuevo entrenador</button>
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {usuarios === null ? <p className="text-slate-500">Cargando…</p> : (
        <ul className="space-y-2">
          {usuarios.map(u => {
            const yo = u.uid === perfil.uid
            return (
              <li key={u.uid} className="tarjeta flex flex-wrap items-center gap-x-4 gap-y-2 !p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{u.nombre} {u.rol === 'admin' && <span className="ml-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-800">Administrador</span>}</div>
                  <div className="truncate text-sm text-slate-500">{u.email}</div>
                </div>
                {u.rol === 'entrenador' && (
                  <>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="h-5 w-5" checked={!!u.puedeEditarCatalogo} onChange={e => cambiar(u, { puedeEditarCatalogo: e.target.checked })} />
                      Puede editar el catálogo
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="h-5 w-5" checked={!!u.activo} onChange={e => cambiar(u, { activo: e.target.checked })} />
                      Activo
                    </label>
                  </>
                )}
                {yo && <span className="text-xs text-slate-400">Eres tú</span>}
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-sm text-slate-500">Un entrenador desactivado no puede entrar, pero conserva sus pacientes. Entra con Google o con un enlace al correo con el que lo des de alta.</p>
      {alta && <Alta onClose={() => setAlta(false)} />}
    </div>
  )
}

function Alta({ onClose }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [catalogo, setCatalogo] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  const enviar = async e => {
    e.preventDefault(); setOcupado(true); setError('')
    try { await crearEntrenador()({ nombre, email, puedeEditarCatalogo: catalogo }); onClose() }
    catch (err) { setError(err.message || 'No se pudo dar de alta.'); setOcupado(false) }
  }

  return (
    <Modal titulo="Nuevo entrenador" onClose={onClose} ancho="max-w-md">
      <form onSubmit={enviar} className="space-y-4">
        <div><label className="etiqueta" htmlFor="n">Nombre</label><input id="n" className="input" required value={nombre} onChange={e => setNombre(e.target.value)} autoFocus /></div>
        <div>
          <label className="etiqueta" htmlFor="e">Correo electrónico</label>
          <input id="e" type="email" className="input" required value={email} onChange={e => setEmail(e.target.value)} />
          <p className="mt-1 text-xs text-slate-500">Con este correo entrará (cuenta de Google o enlace por correo).</p>
        </div>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={catalogo} onChange={e => setCatalogo(e.target.checked)} />Puede editar el catálogo de ejercicios</label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-sec" onClick={onClose} disabled={ocupado}>Cancelar</button>
          <button className="btn" disabled={ocupado}>{ocupado ? 'Creando…' : 'Dar de alta'}</button>
        </div>
      </form>
    </Modal>
  )
}
