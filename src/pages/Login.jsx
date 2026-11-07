import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { GoogleAuthProvider, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, signInWithPopup } from 'firebase/auth'
import { auth, firebaseConfigurado } from '../lib/firebase'
import { useAuth } from '../lib/auth'

const CLAVE_CORREO = 'readaptacion.correoEnlace'

const traducir = e => ({
  'auth/popup-closed-by-user': 'Has cerrado la ventana antes de terminar.',
  'auth/cancelled-popup-request': '',
  'auth/network-request-failed': 'No hay conexión. Inténtalo de nuevo.',
  'auth/invalid-action-code': 'El enlace ya se usó o ha caducado. Pide uno nuevo.',
  'auth/expired-action-code': 'El enlace ha caducado. Pide uno nuevo.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/operation-not-allowed': 'Este método de acceso aún no está activado en Firebase.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
}[e?.code] ?? 'No se ha podido iniciar sesión.')

export default function Login() {
  const { estado, usuario, salir } = useAuth()
  const [correo, setCorreo] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const enlaceProcesado = useRef(false)

  // Al llegar desde el enlace del correo, completa el acceso
  useEffect(() => {
    if (!auth || enlaceProcesado.current || !isSignInWithEmailLink(auth, window.location.href)) return
    enlaceProcesado.current = true
    const guardado = localStorage.getItem(CLAVE_CORREO)
    const email = guardado || window.prompt('Escribe el correo al que te llegó el enlace:')
    if (!email) return
    setOcupado(true)
    signInWithEmailLink(auth, email, window.location.href)
      .then(() => { localStorage.removeItem(CLAVE_CORREO); window.history.replaceState({}, '', '/login') })
      .catch(e => setError(traducir(e)))
      .finally(() => setOcupado(false))
  }, [])

  if (estado === 'ok') return <Navigate to="/" replace />

  const conGoogle = async () => {
    setError(''); setOcupado(true)
    try { await signInWithPopup(auth, new GoogleAuthProvider()) }
    catch (e) { setError(traducir(e)) }
    finally { setOcupado(false) }
  }
  const porEnlace = async e => {
    e.preventDefault(); setError(''); setOcupado(true)
    try {
      await sendSignInLinkToEmail(auth, correo.trim(), { url: `${window.location.origin}/login`, handleCodeInApp: true })
      localStorage.setItem(CLAVE_CORREO, correo.trim())
      setEnviado(true)
    } catch (err) { setError(traducir(err)) }
    finally { setOcupado(false) }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-4">
      <div className="tarjeta w-full max-w-sm space-y-5 !p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-teal-700">Readaptación</h1>
          <p className="mt-1 text-sm text-slate-500">Entrenamiento personalizado</p>
        </div>

        {!firebaseConfigurado && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Falta la configuración de Firebase (archivo <code>.env</code>).</p>}

        {(estado === 'sinPerfil' || estado === 'inactivo') ? (
          <div className="space-y-3 text-center">
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              {estado === 'inactivo' ? 'Tu cuenta está desactivada.' : <>La cuenta <b>{usuario?.email}</b> no está dada de alta.</>}
              {' '}Contacta con tu entrenador o con el administrador.
            </p>
            <button className="btn-sec w-full" onClick={salir}>Usar otra cuenta</button>
          </div>
        ) : enviado ? (
          <p className="rounded-xl bg-teal-50 p-4 text-center text-sm text-teal-900">
            Te hemos enviado un enlace a <b>{correo}</b>. Ábrelo desde este mismo dispositivo para entrar.
          </p>
        ) : (
          <>
            <button className="btn-sec w-full" onClick={conGoogle} disabled={ocupado || !firebaseConfigurado}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
              Entrar con Google
            </button>
            <div className="flex items-center gap-3 text-xs text-slate-400"><hr className="flex-1" />o<hr className="flex-1" /></div>
            <form onSubmit={porEnlace} className="space-y-3">
              <div>
                <label className="etiqueta" htmlFor="correo">Correo electrónico</label>
                <input id="correo" type="email" required autoComplete="email" className="input" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="tu@correo.com" />
              </div>
              <button className="btn w-full" disabled={ocupado || !firebaseConfigurado}>Recibir enlace de acceso</button>
            </form>
          </>
        )}
        {error && <p role="alert" className="text-center text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
