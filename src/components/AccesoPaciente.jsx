import { useState } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, auth } from '../lib/firebase'
import { URL_APP } from '../lib/util'

const invitar = () => httpsCallable(getFunctions(app, 'europe-west1'), 'invitarPaciente')

// Acceso del paciente a la app: un solo botón.
// Se crea su acceso y se le envía un correo para que elija su contraseña.
export default function AccesoPaciente({ paciente, onActualizado }) {
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const tieneAcceso = !!paciente.uid
  const nombre = paciente.nombre.split(' ')[0]

  const enviar = async crear => {
    setOcupado(true); setError(''); setMensaje('')
    try {
      if (crear) { const r = await invitar()({ pacienteId: paciente.id }); onActualizado({ uid: r.data.uid, estado: 'activo' }) }
      auth.languageCode = 'es'
      await sendPasswordResetEmail(auth, paciente.email, { url: `${URL_APP}/login` })
      setMensaje(`✓ Invitación enviada a ${paciente.email}`)
    } catch (e) { setError(e.message || 'No se pudo enviar la invitación.') }
    finally { setOcupado(false) }
  }

  return (
    <section className="tarjeta">
      <h2 className="tarjeta-titulo [--acento:#6366f1]">Acceso a la app</h2>
      {!paciente.email ? (
        <p className="text-xs text-amber-700">Añade y guarda el correo de {nombre} para poder invitarle.</p>
      ) : (
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-xs text-slate-600">
            {tieneAcceso ? <><span className="font-medium text-teal-700">✓ Con acceso</span> · {paciente.email}</> : <>Se le envía un correo para que elija su contraseña.</>}
          </p>
          <button className={tieneAcceso ? 'btn-sec btn-xs shrink-0' : 'btn shrink-0'} onClick={() => enviar(!tieneAcceso)} disabled={ocupado}>
            {ocupado ? 'Enviando…' : tieneAcceso ? 'Reenviar invitación' : 'Invitar a la app'}
          </button>
        </div>
      )}
      {mensaje && <p className="mt-2 text-xs text-emerald-700">{mensaje}. Si no lo ve, que mire el spam.</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  )
}
