import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { sinVacios } from '../lib/util'

const VERSION_CONSENTIMIENTO = 'borrador' // se actualizará cuando exista el texto legal definitivo
const NIVELES = ['sedentario', 'moderado', 'activo', 'deportista']

const VACIO = {
  nombre: '', email: '', telefono: '', estado: 'invitado', notas: '', entrenadorId: '',
  fechaNacimiento: '', sexo: '', alturaCm: '', pesoKg: '', ocupacion: '', nivelActividad: '', deporte: '',
  lesiones: '', patologias: '', cirugias: '', medicacion: '', alergias: '', objetivos: '', derivadoPor: '',
  contactoEmergencia: { nombre: '', telefono: '' },
}

function Campo({ etiqueta, children, ayuda }) {
  return <label className="block"><span className="etiqueta">{etiqueta}</span>{children}{ayuda && <span className="mt-1 block text-xs text-slate-500">{ayuda}</span>}</label>
}

export default function PacienteForm() {
  const { id } = useParams()
  const nuevo = !id
  const navigate = useNavigate()
  const { perfil, esAdmin } = useAuth()
  const [f, setF] = useState({ ...VACIO, entrenadorId: perfil.uid })
  const [consentimiento, setConsentimiento] = useState(null) // { fecha, version } | null
  const [entrenadores, setEntrenadores] = useState([])
  const [cargando, setCargando] = useState(!nuevo)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const input = k => ({ value: f[k] ?? '', onChange: e => set(k, e.target.value) })

  useEffect(() => {
    if (nuevo) return
    getDoc(doc(db, 'pacientes', id)).then(s => {
      if (!s.exists()) { setError('No se encuentra este paciente.'); return }
      const d = s.data()
      setF({ ...VACIO, ...d, contactoEmergencia: { ...VACIO.contactoEmergencia, ...d.contactoEmergencia } })
      setConsentimiento(d.consentimiento ?? null)
    }).catch(e => setError('No se pudo cargar el paciente: ' + e.message)).finally(() => setCargando(false))
  }, [id, nuevo])

  useEffect(() => {
    if (!esAdmin) return
    getDocs(collection(db, 'usuarios')).then(s => setEntrenadores(
      s.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.rol !== 'paciente' && u.activo).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))))
  }, [esAdmin])

  const guardar = async e => {
    e.preventDefault()
    if (!f.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    setGuardando(true); setError('')
    try {
      const { id: _id, ...resto } = f // eslint-disable-line no-unused-vars
      const datos = sinVacios({
        ...resto,
        nombre: f.nombre.trim(), email: f.email.trim().toLowerCase(),
        alturaCm: f.alturaCm === '' ? '' : Number(f.alturaCm), pesoKg: f.pesoKg === '' ? '' : Number(f.pesoKg),
        consentimiento: consentimiento ?? undefined,
      })
      datos.entrenadorId = esAdmin ? f.entrenadorId : perfil.uid
      datos.estado = f.estado || 'invitado'
      if (nuevo) { const r = await addDoc(collection(db, 'pacientes'), datos); navigate(`/pacientes/${r.id}`, { replace: true }) }
      else { await setDoc(doc(db, 'pacientes', id), datos); navigate('/pacientes') }
    } catch (err) { setError('No se pudo guardar: ' + err.message); setGuardando(false) }
  }

  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar definitivamente a ${f.nombre}?\n\nSe borra su ficha y no se puede deshacer (derecho de supresión). Si solo quieres dejar de trabajar con él o ella, usa «Archivado».`)) return
    setGuardando(true)
    try { await deleteDoc(doc(db, 'pacientes', id)); navigate('/pacientes') }
    catch (err) { setError('No se pudo eliminar: ' + err.message); setGuardando(false) }
  }

  if (cargando) return <p className="text-slate-500">Cargando…</p>

  return (
    <form onSubmit={guardar} className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/pacientes" className="text-slate-500 hover:text-slate-800" aria-label="Volver">←</Link>
        <h1 className="text-xl font-semibold">{nuevo ? 'Nuevo paciente' : f.nombre || 'Paciente'}</h1>
      </div>

      <section className="tarjeta space-y-4">
        <h2 className="font-semibold">Datos básicos</h2>
        <Campo etiqueta="Nombre y apellidos *"><input className="input" required {...input('nombre')} /></Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Correo electrónico" ayuda="Lo necesitará para entrar a la app."><input type="email" className="input" autoComplete="off" {...input('email')} /></Campo>
          <Campo etiqueta="Teléfono" ayuda="Se usa para abrir WhatsApp."><input type="tel" className="input" {...input('telefono')} /></Campo>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Estado">
            <select className="input" {...input('estado')}>
              <option value="invitado">Sin acceso aún</option><option value="activo">Activo</option><option value="archivado">Archivado</option>
            </select>
          </Campo>
          {esAdmin && (
            <Campo etiqueta="Entrenador responsable">
              <select className="input" {...input('entrenadorId')}>
                {entrenadores.map(u => <option key={u.uid} value={u.uid}>{u.nombre}</option>)}
              </select>
            </Campo>
          )}
        </div>
      </section>

      <section className="tarjeta space-y-4">
        <div>
          <h2 className="font-semibold">Datos opcionales</h2>
          <p className="text-sm text-slate-500">Rellena solo lo que necesites. Son datos de salud: trátalos con cuidado.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Fecha de nacimiento"><input type="date" className="input" {...input('fechaNacimiento')} /></Campo>
          <Campo etiqueta="Sexo">
            <select className="input" {...input('sexo')}><option value="">—</option><option value="mujer">Mujer</option><option value="hombre">Hombre</option><option value="otro">Otro</option></select>
          </Campo>
          <Campo etiqueta="Altura (cm)"><input type="number" min="50" max="250" className="input" {...input('alturaCm')} /></Campo>
          <Campo etiqueta="Peso (kg)"><input type="number" min="20" max="400" step="0.1" className="input" {...input('pesoKg')} /></Campo>
          <Campo etiqueta="Ocupación"><input className="input" {...input('ocupacion')} /></Campo>
          <Campo etiqueta="Nivel de actividad">
            <select className="input" {...input('nivelActividad')}><option value="">—</option>{NIVELES.map(n => <option key={n} value={n}>{n[0].toUpperCase() + n.slice(1)}</option>)}</select>
          </Campo>
        </div>
        <Campo etiqueta="Deporte o actividad que practica"><input className="input" {...input('deporte')} /></Campo>
        <Campo etiqueta="Objetivos"><textarea rows={2} className="input" {...input('objetivos')} /></Campo>
        <Campo etiqueta="Lesiones"><textarea rows={2} className="input" {...input('lesiones')} /></Campo>
        <Campo etiqueta="Patologías"><textarea rows={2} className="input" {...input('patologias')} /></Campo>
        <Campo etiqueta="Cirugías"><textarea rows={2} className="input" {...input('cirugias')} /></Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Medicación"><textarea rows={2} className="input" {...input('medicacion')} /></Campo>
          <Campo etiqueta="Alergias"><textarea rows={2} className="input" {...input('alergias')} /></Campo>
        </div>
        <Campo etiqueta="Derivado por (médico o fisioterapeuta)"><input className="input" {...input('derivadoPor')} /></Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Contacto de emergencia: nombre"><input className="input" value={f.contactoEmergencia.nombre} onChange={e => set('contactoEmergencia', { ...f.contactoEmergencia, nombre: e.target.value })} /></Campo>
          <Campo etiqueta="Contacto de emergencia: teléfono"><input type="tel" className="input" value={f.contactoEmergencia.telefono} onChange={e => set('contactoEmergencia', { ...f.contactoEmergencia, telefono: e.target.value })} /></Campo>
        </div>
        <Campo etiqueta="Notas del entrenador"><textarea rows={3} className="input" {...input('notas')} /></Campo>
      </section>

      <section className="tarjeta space-y-2">
        <h2 className="font-semibold">Protección de datos</h2>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={!!consentimiento}
            onChange={e => setConsentimiento(e.target.checked ? { fecha: new Date().toISOString(), version: VERSION_CONSENTIMIENTO } : null)} />
          <span className="text-sm">Tengo el consentimiento explícito del paciente para tratar sus datos de salud.
            {consentimiento && <span className="block text-xs text-slate-500">Registrado el {new Date(consentimiento.fecha).toLocaleDateString('es-ES')} (versión del texto: {consentimiento.version}).</span>}
          </span>
        </label>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!nuevo ? <button type="button" className="btn-peligro" onClick={eliminar} disabled={guardando}>Eliminar ficha</button> : <span />}
        <div className="flex gap-2">
          <Link to="/pacientes" className="btn-sec">Cancelar</Link>
          <button className="btn" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </form>
  )
}
