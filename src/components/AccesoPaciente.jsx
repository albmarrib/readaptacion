import { useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../lib/firebase'
import { URL_APP, enlaceWhatsApp } from '../lib/util'

const llamar = nombre => httpsCallable(getFunctions(app, 'europe-west1'), nombre)

// Dar acceso a la app al paciente y avisarle por WhatsApp
export default function AccesoPaciente({ paciente, onActualizado }) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const tieneAcceso = !!paciente.uid

  const mensaje = `Hola ${paciente.nombre.split(' ')[0]}, ya tienes acceso a tu plan de entrenamiento en la app. Entra en ${URL_APP} con tu correo (${paciente.email}); te llegará un enlace para acceder, sin contraseña.`

  const darAcceso = async () => {
    setOcupado(true); setError('')
    try { const r = await llamar('invitarPaciente')({ pacienteId: paciente.id }); onActualizado({ uid: r.data.uid, estado: 'activo' }) }
    catch (e) { setError(e.message || 'No se pudo dar acceso.') }
    finally { setOcupado(false) }
  }

  return (
    <section className="tarjeta space-y-3">
      <h2 className="font-semibold">Acceso a la app</h2>
      {tieneAcceso ? (
        <>
          <p className="text-sm text-teal-800">✓ {paciente.nombre} tiene acceso con el correo <b>{paciente.email}</b>.</p>
          <div className="flex flex-wrap gap-2">
            <a className="btn-sec" href={enlaceWhatsApp(paciente.telefono, mensaje)} target="_blank" rel="noreferrer">Reenviar aviso por WhatsApp</a>
            <button className="btn-sec" onClick={() => navigator.clipboard?.writeText(mensaje)}>Copiar mensaje</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600">Para que el paciente vea su rutina y anote sus pesos, necesita acceso. Hace falta su correo, guardado en la ficha. La primera vez que entre, el propio paciente tendrá que leer y aceptar el consentimiento de protección de datos.</p>
          <button className="btn" onClick={darAcceso} disabled={ocupado || !paciente.email}>{ocupado ? 'Dando acceso…' : 'Dar acceso a la app'}</button>
          {!paciente.email && <p className="text-xs text-amber-700">Falta el correo (guarda la ficha después de añadirlo).</p>}
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  )
}
