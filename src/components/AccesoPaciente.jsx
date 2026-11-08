import { useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../lib/firebase'
import { URL_APP, enlaceWhatsApp } from '../lib/util'
import { useChat } from '../lib/chat'
import { IconoChat } from './Iconos'

const llamar = nombre => httpsCallable(getFunctions(app, 'europe-west1'), nombre)

// Dar acceso a la app al paciente: se genera una contraseña temporal que se le envía por WhatsApp
export default function AccesoPaciente({ paciente, onActualizado }) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [clave, setClave] = useState(null) // contraseña temporal recién generada (solo se ve una vez)
  const [copiado, setCopiado] = useState(false)
  const tieneAcceso = !!paciente.uid
  const chat = useChat()
  const nombre = paciente.nombre.split(' ')[0]

  const mensaje = clave
    ? `Hola ${nombre}, ya tienes acceso a tu plan de entrenamiento en la app.\n\nEntra en: ${URL_APP}\nUsuario: ${paciente.email}\nContraseña: ${clave}\n\nCuando entres, cambia la contraseña por la tuya en tu foto (arriba a la derecha).`
    : `Hola ${nombre}, aquí tienes la dirección de tu app de entrenamiento: ${URL_APP}\nTu usuario es ${paciente.email}`

  const generar = async () => {
    if (tieneAcceso && !window.confirm(`Se generará una contraseña nueva para ${nombre} y la anterior dejará de funcionar. ¿Continuar?`)) return
    setOcupado(true); setError('')
    try {
      const r = await llamar('invitarPaciente')({ pacienteId: paciente.id })
      setClave(r.data.clave); setCopiado(false)
      onActualizado({ uid: r.data.uid, estado: 'activo' })
    } catch (e) { setError(e.message || 'No se pudo dar acceso.') }
    finally { setOcupado(false) }
  }
  const copiar = async () => { try { await navigator.clipboard.writeText(mensaje); setCopiado(true) } catch { setError('No se pudo copiar. Selecciona el texto a mano.') } }

  return (
    <section className="tarjeta space-y-2.5">
      <h2 className="tarjeta-titulo !mb-1 [--acento:#6366f1]">Acceso a la app</h2>

      {clave && (
        <div className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3">
          <p className="text-xs font-medium text-indigo-900">Contraseña temporal creada. <b>Solo se muestra ahora</b>: envíasela al paciente.</p>
          <div className="rounded-md bg-white px-3 py-2 ring-1 ring-indigo-200">
            <div className="text-[11px] text-slate-500">{paciente.email}</div>
            <div className="select-all font-mono text-base font-bold tracking-wide text-slate-900">{clave}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="btn btn-xs" href={enlaceWhatsApp(paciente.telefono, mensaje)} target="_blank" rel="noreferrer">Enviar por WhatsApp</a>
            <button type="button" className="btn-sec btn-xs" onClick={copiar}>{copiado ? '✓ Copiado' : 'Copiar mensaje'}</button>
          </div>
          {!paciente.telefono && <p className="text-[11px] text-amber-700">La ficha no tiene teléfono: se abrirá WhatsApp para que elijas el contacto.</p>}
        </div>
      )}

      {tieneAcceso ? (
        <>
          <p className="text-xs text-teal-800">✓ {nombre} tiene acceso con <b>{paciente.email}</b>.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-xs" onClick={() => chat?.abrir(paciente.id)}><IconoChat width={14} height={14} /> Enviar mensaje</button>
            <button type="button" className="btn-sec btn-xs" onClick={generar} disabled={ocupado}>{ocupado ? 'Generando…' : 'Nueva contraseña'}</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-slate-600">Para que vea su rutina y anote sus pesos necesita acceso (hace falta su correo guardado). Se genera una contraseña temporal que le envías por WhatsApp; al entrar por primera vez aceptará el consentimiento.</p>
          <button className="btn" onClick={generar} disabled={ocupado || !paciente.email}>{ocupado ? 'Dando acceso…' : 'Dar acceso a la app'}</button>
          {!paciente.email && <p className="text-xs text-amber-700">Falta el correo (guarda la ficha después de añadirlo).</p>}
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  )
}
