import { useState } from 'react'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { CASILLA_CONSENTIMIENTO, TITULO_CONSENTIMIENTO, VERSION_CONSENTIMIENTO, textoConsentimiento } from '../lib/consentimiento'
import { useCentro } from '../lib/centro'
import { Link } from 'react-router-dom'

// El paciente acepta él mismo el tratamiento de sus datos antes de ver su rutina
export default function PantallaConsentimiento({ pacienteId }) {
  const { salir, perfil } = useAuth()
  const centro = useCentro(perfil?.centroId)
  const [acepto, setAcepto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  const aceptar = async () => {
    setOcupado(true); setError('')
    try {
      // La fecha la pone el servidor: no se puede falsear desde el navegador
      await updateDoc(doc(db, 'pacientes', pacienteId), { consentimiento: { fecha: serverTimestamp(), version: VERSION_CONSENTIMIENTO } })
    } catch (e) { setError('No se pudo guardar tu aceptación: ' + e.message); setOcupado(false) }
  }

  return (
    <div className="tarjeta space-y-4">
      <h1 className="text-xl font-semibold">{TITULO_CONSENTIMIENTO}</h1>
      <p className="text-sm text-slate-600">Antes de ver tu rutina, necesitamos que leas y aceptes esto.</p>
      <div className="space-y-3">
        {textoConsentimiento(centro?.nombre).map(s => (
          <section key={s.titulo}>
            <h2 className="text-sm font-semibold">{s.titulo}</h2>
            <p className="text-sm text-slate-700">{s.texto}</p>
          </section>
        ))}
      </div>
      <p className="text-xs text-slate-500">Más información: <Link className="text-teal-700 underline" to="/legal/privacidad" target="_blank">política de privacidad</Link> y <Link className="text-teal-700 underline" to="/legal/cookies" target="_blank">cookies</Link>.</p>
      <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
        <input type="checkbox" className="mt-0.5 h-6 w-6 shrink-0" checked={acepto} onChange={e => setAcepto(e.target.checked)} />
        <span className="text-sm">{CASILLA_CONSENTIMIENTO}</span>
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button className="btn sm:flex-1" disabled={!acepto || ocupado} onClick={aceptar}>{ocupado ? 'Guardando…' : 'Acepto y continúo'}</button>
        <button className="btn-sec" onClick={salir} disabled={ocupado}>No acepto, salir</button>
      </div>
    </div>
  )
}
