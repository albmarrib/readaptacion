import { useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../lib/firebase'
import { URL_APP, enlaceWhatsApp } from '../lib/util'
import { useChat } from '../lib/chat'
import { IconoChat } from './Iconos'

const llamar = nombre => httpsCallable(getFunctions(app, 'europe-west1'), nombre)

// Dar acceso a la app al paciente y avisarle por WhatsApp
export default function AccesoPaciente({ paciente, onActualizado }) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const tieneAcceso = !!paciente.uid
  const chat = useChat()

  const mensaje = `Hola ${paciente.nombre.split(' ')[0]}, ya tienes acceso a tu plan de entrenamiento en la app. Entra en ${URL_APP} con tu correo (${paciente.email}); te llegará un enlace para acceder, sin contraseña.`

  const darAcceso = async () => {
    setOcupado(true); setError('')
    try { const r = await llamar('invitarPaciente')({ pacienteId: paciente.id }); onActualizado({ uid: r.data.uid, estado: 'activo' }) }
    catch (e) { setError(e.message || 'No se pudo dar acceso.') }
    finally { setOcupado(false) }
  }

  return (
    <section className="tarjeta space-y-2.5">
      <h2 className="tarjeta-titulo !mb-1 [--acento:#6366f1]">Acceso a la app</h2>
      {tieneAcceso ? (
        <>
          <p className="text-xs text-teal-800">✓ {paciente.nombre} tiene acceso con el correo <b>{paciente.email}</b>.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-xs" onClick={() => chat?.abrir(paciente.id)}><IconoChat width={14} height={14} /> Enviar mensaje</button>
            <a className="btn-sec btn-xs" href={enlaceWhatsApp(paciente.telefono, mensaje)} target="_blank" rel="noreferrer">Reenviar aviso por WhatsApp</a>
            <button className="btn-sec btn-xs" onClick={() => navigator.clipboard?.writeText(mensaje)}>Copiar mensaje</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-slate-600">Para que vea su rutina y anote sus pesos necesita acceso (hace falta su correo guardado). Al entrar por primera vez aceptará el consentimiento.</p>
          <button className="btn" onClick={darAcceso} disabled={ocupado || !paciente.email}>{ocupado ? 'Dando acceso…' : 'Dar acceso a la app'}</button>
          {!paciente.email && <p className="text-xs text-amber-700">Falta el correo (guarda la ficha después de añadirlo).</p>}
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  )
}
