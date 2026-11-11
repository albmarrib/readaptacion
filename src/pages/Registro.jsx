import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { GoogleAuthProvider, sendSignInLinkToEmail, signInWithPopup } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { auth, funciones } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { Logo } from '../components/Iconos'
import { EnlacesLegales } from './Legal'
import { VERSION_LEGAL } from '../legal/titular'

// Alta de un centro nuevo, en dos pasos:
//  1) identificarse con un correo verificado (Google o enlace al correo);
//  2) nombre del centro, tu nombre y aceptar condiciones + contrato de encargo.
// Al volver del enlace del correo, Login nos trae de vuelta aquí (marca en localStorage).
export const MARCA_REGISTRO = 'readaptacion.registro'
const CLAVE_CORREO = 'readaptacion.correoEnlace'
const registrar = datos => httpsCallable(funciones, 'registrarCentro')(datos)
const enlace = (to, txt) => <Link to={to} target="_blank" className="text-teal-700 underline">{txt}</Link>

export default function Registro() {
  const { estado, usuario, salir } = useAuth()
  const [correo, setCorreo] = useState('')
  const [nombreCentro, setNombreCentro] = useState('')
  const [nombre, setNombre] = useState(usuario?.displayName ?? '')
  const [acepta, setAcepta] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState('')

  if (estado === 'ok' || estado === 'suspendido' || estado === 'inactivo') return <Navigate to="/" replace />
  const marcar = () => { try { localStorage.setItem(MARCA_REGISTRO, '1') } catch { /* sin almacenamiento */ } }
  const ejecutar = async fn => {
    setError(''); setOcupado(true)
    try { await fn() } catch (e) { setError(e.code === 'auth/popup-closed-by-user' ? '' : e.message) } finally { setOcupado(false) }
  }

  const conGoogle = () => { marcar(); ejecutar(() => signInWithPopup(auth, new GoogleAuthProvider())) }
  const porEnlace = e => {
    e.preventDefault(); marcar()
    ejecutar(async () => {
      await sendSignInLinkToEmail(auth, correo.trim(), { url: `${window.location.origin}/login`, handleCodeInApp: true })
      try { localStorage.setItem(CLAVE_CORREO, correo.trim()) } catch { /* sin almacenamiento */ }
      setEnviado(`Te hemos enviado un enlace a ${correo.trim()}. Ábrelo desde este mismo dispositivo para continuar.`)
    })
  }
  const crear = e => {
    e.preventDefault()
    ejecutar(async () => {
      await registrar({ nombreCentro: nombreCentro.trim(), nombre: nombre.trim(), acepta, version: VERSION_LEGAL })
      try { localStorage.removeItem(MARCA_REGISTRO) } catch { /* sin almacenamiento */ }
      // El perfil aparece solo (escucha en AuthProvider) y la app entra al centro nuevo
    })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-teal-50 via-fondo to-fondo p-4">
      <div className="tarjeta w-full max-w-md space-y-5 !p-7 shadow-xl shadow-teal-900/5">
        <div className="flex flex-col items-center text-center">
          <Logo tamano={48} />
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Registra tu centro</h1>
          <p className="mt-1 text-sm text-slate-500">30 días de prueba gratis, sin tarjeta</p>
        </div>

        {estado === 'cargando' ? <p className="text-center text-slate-500">Cargando…</p>
          : estado !== 'sinPerfil' ? (
            <>
              <p className="text-sm text-slate-600"><b>Paso 1 de 2.</b> Identifícate con el correo con el que gestionarás el centro.</p>
              <button className="btn-sec w-full !h-10" onClick={conGoogle} disabled={ocupado}>Continuar con Google</button>
              <div className="flex items-center gap-3 text-xs text-slate-400"><hr className="flex-1" />o<hr className="flex-1" /></div>
              <form onSubmit={porEnlace} className="space-y-3">
                <label className="block"><span className="etiqueta">Correo electrónico</span>
                  <input type="email" required inputMode="email" autoCapitalize="none" className="input" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="tu@centro.com" />
                </label>
                <button className="btn w-full !h-10" disabled={ocupado}>Recibir enlace de acceso</button>
              </form>
            </>
          ) : (
            <form onSubmit={crear} className="space-y-4">
              <p className="text-sm text-slate-600"><b>Paso 2 de 2.</b> Datos del centro para <b>{usuario?.email}</b>.</p>
              <label className="block"><span className="etiqueta">Nombre del centro</span>
                <input required minLength={2} maxLength={80} className="input" value={nombreCentro} onChange={e => setNombreCentro(e.target.value)} placeholder="p. ej. Centro de Entrenamiento Norte" />
              </label>
              <label className="block"><span className="etiqueta">Tu nombre</span>
                <input required minLength={2} maxLength={80} className="input" value={nombre} onChange={e => setNombre(e.target.value)} />
              </label>
              <p className="text-xs text-slate-500">Serás el administrador del centro. El catálogo empieza vacío: podrás crear tus ejercicios o pedirnos que te carguemos una muestra.</p>
              <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={acepta} onChange={e => setAcepta(e.target.checked)} />
                <span className="text-sm">He leído y acepto las {enlace('/legal/condiciones', 'condiciones del servicio')} y el {enlace('/legal/encargo', 'contrato de encargo del tratamiento')}, y he leído la {enlace('/legal/privacidad', 'política de privacidad')}. Aceptar equivale a firmarlos.</span>
              </label>
              <button className="btn w-full !h-10" disabled={ocupado || !acepta}>{ocupado ? 'Creando el centro…' : 'Crear mi centro'}</button>
              <button type="button" onClick={salir} className="block w-full text-center text-xs text-slate-500 hover:text-teal-700">Usar otro correo</button>
            </form>
          )}

        {enviado && <p className="rounded-xl bg-teal-50 p-3 text-center text-sm text-teal-900">{enviado}</p>}
        {error && <p role="alert" className="text-center text-sm text-red-600">{error}</p>}
        <p className="text-center text-sm text-slate-500">¿Ya tienes cuenta? <Link to="/login" className="font-medium text-teal-700 hover:underline">Entrar</Link></p>
        <EnlacesLegales className="border-t border-slate-100 pt-4" />
      </div>
    </div>
  )
}
