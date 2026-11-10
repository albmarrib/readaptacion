import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addDoc, collection, deleteField, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { sinVacios } from '../lib/util'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../lib/firebase'
import RutinasPaciente from '../components/RutinasPaciente'
import AccesoPaciente from '../components/AccesoPaciente'
import { consentimientoVigente } from '../lib/consentimiento'
import Volver from '../components/Volver'
import { useChat } from '../lib/chat'
import { IconoChat } from '../components/Iconos'
import { Avatar } from '../components/Iconos'

const NIVELES = ['sedentario', 'moderado', 'activo', 'deportista']
// Campos que ya no se usan: al guardar la ficha se borran (no guardar datos de salud que no hacen falta)
const RETIRADOS = ['cirugias', 'alergias', 'contactoEmergencia']

const VACIO = {
  nombre: '', email: '', telefono: '', estado: 'invitado', notas: '', entrenadorId: '',
  fechaNacimiento: '', sexo: '', alturaCm: '', pesoKg: '', ocupacion: '', nivelActividad: '', deporte: '',
  lesiones: '', patologias: '', medicacion: '', objetivos: '', derivadoPor: '',
  antecedentesFamiliares: '', calidadSueno: '', alcohol: '', fumador: '',
}

function Campo({ etiqueta, children, clase = '' }) {
  return <label className={`block ${clase}`}><span className="etiqueta">{etiqueta}</span>{children}</label>
}

export default function PacienteForm() {
  const { id } = useParams()
  const nuevo = !id
  const navigate = useNavigate()
  const chat = useChat()
  const { perfil, esAdmin } = useAuth()
  const [f, setF] = useState({ ...VACIO, entrenadorId: perfil.uid })
  const [consentimiento, setConsentimiento] = useState(null) // solo lectura: lo acepta el paciente
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
      const resto = { ...d }
      RETIRADOS.forEach(k => delete resto[k])
      setF({ ...VACIO, ...resto })
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
      const nombre = f.nombre.trim(), email = f.email.trim().toLowerCase()
      const campos = {
        ...f, nombre, email,
        alturaCm: f.alturaCm === '' ? '' : Number(f.alturaCm), pesoKg: f.pesoKg === '' ? '' : Number(f.pesoKg),
        entrenadorId: esAdmin ? f.entrenadorId : perfil.uid, estado: f.estado || 'invitado',
      }
      // El acceso (uid) y el consentimiento no se tocan desde este formulario
      delete campos.uid; delete campos.consentimiento; delete campos.id; delete campos.foto
      if (nuevo) await addDoc(collection(db, 'pacientes'), sinVacios(campos))
      else {
        // Los campos que se dejan vacíos se borran; el resto se actualiza (sin pisar lo que el paciente haya cambiado)
        const parche = {}
        for (const [k, v] of Object.entries(campos)) {
          const limpio = typeof v === 'object' && v !== null ? sinVacios(v) : v
          const vacio = limpio === '' || limpio === undefined || limpio === null || (typeof limpio === 'object' && !Object.keys(limpio).length)
          parche[k] = vacio ? deleteField() : limpio
        }
        RETIRADOS.forEach(k => { parche[k] = deleteField() })
        await updateDoc(doc(db, 'pacientes', id), parche)
      }
      navigate('/pacientes')
    } catch (err) { setError('No se pudo guardar: ' + err.message); setGuardando(false) }
  }

  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar definitivamente a ${f.nombre}?\n\nSe borran su ficha, todas sus rutinas y pesos, y su acceso a la app. No se puede deshacer (derecho de supresión). Si solo quieres dejar de trabajar con esta persona, usa el estado «Archivado».`)) return
    setGuardando(true)
    try { await httpsCallable(getFunctions(app, 'europe-west1'), 'eliminarPaciente')({ pacienteId: id }); navigate('/pacientes') }
    catch (err) { setError('No se pudo eliminar: ' + err.message); setGuardando(false) }
  }

  if (cargando) return <p className="text-slate-500">Cargando…</p>

  const proteccion = !nuevo && (
    <section className="tarjeta">
      <h2 className="tarjeta-titulo [--acento:#f59e0b]">Protección de datos</h2>
      {consentimientoVigente(consentimiento)
        ? <p className="text-xs text-teal-800">✓ Consentimiento aceptado por el paciente el {consentimiento.fecha?.toDate?.().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
        : <p className="text-xs text-amber-800">El paciente aún no ha aceptado el consentimiento (lo hará al entrar por primera vez). Hasta entonces, evita anotar datos de salud.</p>}
    </section>
  )

  return (
    <form id="ficha" onSubmit={guardar} className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Volver to="/pacientes" texto="Pacientes" />
        {!nuevo && <Avatar nombre={f.nombre} foto={f.foto} tamano={34} />}
        <h1 className="titulo-pagina">{nuevo ? 'Nuevo paciente' : f.nombre || 'Paciente'}</h1>
        <div className="ml-auto flex items-center gap-2">
          {f.uid && <button type="button" className="btn-sec" onClick={() => chat?.abrir(id)}><IconoChat width={15} height={15} /> Mensaje</button>}
          {!nuevo && <button type="button" className="btn-peligro" onClick={eliminar} disabled={guardando}>Eliminar</button>}
          <Link to="/pacientes" className="btn-sec">Cancelar</Link>
          <button className="btn" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{error}</p>}

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="tarjeta">
            <h2 className="tarjeta-titulo [--acento:#14b8a6]">Datos personales</h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-4">
              <Campo clase="col-span-2" etiqueta="Nombre y apellidos *"><input className="input" required {...input('nombre')} /></Campo>
              <Campo etiqueta="Teléfono"><input type="tel" className="input" {...input('telefono')} /></Campo>
              <Campo etiqueta="Estado">
                <select className="input" {...input('estado')}>
                  <option value="invitado">Pendiente</option><option value="activo">Activo</option><option value="archivado">Archivado</option>
                </select>
              </Campo>
              <Campo clase="col-span-2" etiqueta="Correo electrónico"><input type="email" className="input" autoComplete="off" disabled={!!f.uid} {...input('email')} /></Campo>
              <Campo etiqueta="Fecha de nacimiento"><input type="date" className="input" {...input('fechaNacimiento')} /></Campo>
              <Campo etiqueta="Sexo">
                <select className="input" {...input('sexo')}><option value="">—</option><option value="mujer">Mujer</option><option value="hombre">Hombre</option><option value="otro">Otro</option></select>
              </Campo>
              <Campo etiqueta="Altura (cm)"><input type="number" min="50" max="250" className="input" {...input('alturaCm')} /></Campo>
              <Campo etiqueta="Peso (kg)"><input type="number" min="20" max="400" step="0.1" className="input" {...input('pesoKg')} /></Campo>
              <Campo etiqueta="Nivel de actividad">
                <select className="input" {...input('nivelActividad')}><option value="">—</option>{NIVELES.map(n => <option key={n} value={n}>{n[0].toUpperCase() + n.slice(1)}</option>)}</select>
              </Campo>
              <Campo etiqueta="Ocupación"><input className="input" {...input('ocupacion')} /></Campo>
              <Campo clase="col-span-2" etiqueta="Deporte o actividad"><input className="input" {...input('deporte')} /></Campo>
              <Campo clase="col-span-2" etiqueta="Referencia"><input className="input" {...input('derivadoPor')} /></Campo>
              {esAdmin && (
                <Campo clase="col-span-2" etiqueta="Entrenador responsable">
                  <select className="input" {...input('entrenadorId')}>{entrenadores.map(u => <option key={u.uid} value={u.uid}>{u.nombre}</option>)}</select>
                </Campo>
              )}
            </div>
          </section>

          <section className="tarjeta">
            <h2 className="tarjeta-titulo [--acento:#f43f5e]">Salud y objetivos <span className="font-normal text-slate-400">· opcional</span></h2>
            <div className="grid gap-x-3 gap-y-2.5 sm:grid-cols-2">
              <Campo etiqueta="Objetivos"><textarea rows={1} className="input resize-y" {...input('objetivos')} /></Campo>
              <Campo etiqueta="Lesiones"><textarea rows={1} className="input resize-y" {...input('lesiones')} /></Campo>
              <Campo etiqueta="Patologías"><textarea rows={1} className="input resize-y" {...input('patologias')} /></Campo>
              <Campo etiqueta="Medicación"><textarea rows={1} className="input resize-y" {...input('medicacion')} /></Campo>
              <Campo etiqueta="Antecedentes familiares"><textarea rows={1} className="input resize-y" {...input('antecedentesFamiliares')} /></Campo>
              <div className="grid grid-cols-3 gap-x-3 sm:col-span-2">
                <Campo etiqueta="Calidad del sueño">
                  <select className="input" {...input('calidadSueno')}><option value="">—</option><option value="buena">Buena</option><option value="regular">Regular</option><option value="mala">Mala</option></select>
                </Campo>
                <Campo etiqueta="Alcohol">
                  <select className="input" {...input('alcohol')}><option value="">—</option><option value="no">No</option><option value="ocasional">Ocasional</option><option value="habitual">Habitual</option></select>
                </Campo>
                <Campo etiqueta="Fumador">
                  <select className="input" {...input('fumador')}><option value="">—</option><option value="no">No</option><option value="exfumador">Exfumador</option><option value="si">Sí</option></select>
                </Campo>
              </div>
              <Campo clase="sm:col-span-2" etiqueta="Notas del entrenador"><textarea rows={1} className="input resize-y" {...input('notas')} /></Campo>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          {nuevo
            ? <section className="tarjeta text-xs text-slate-500">Guarda la ficha para poder crear rutinas y dar acceso a la app.</section>
            : <>
              <RutinasPaciente pacienteId={id} />
              <AccesoPaciente paciente={{ ...f, id }} onActualizado={parche => setF(x => ({ ...x, ...parche }))} />
              {proteccion}
            </>}
        </div>
      </div>
    </form>
  )
}
