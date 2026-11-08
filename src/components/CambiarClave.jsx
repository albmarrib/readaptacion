import { useState } from 'react'
import { updatePassword } from 'firebase/auth'
import { auth } from '../lib/firebase'

// Cambiar la contraseña propia (la temporal que dio el entrenador, por la que elija la persona)
export default function CambiarClave() {
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [ver, setVer] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const guardar = async e => {
    e.preventDefault()
    if (nueva.length < 6) { setMensaje('La contraseña debe tener al menos 6 caracteres.'); return }
    if (nueva !== repetida) { setMensaje('Las dos contraseñas no coinciden.'); return }
    setOcupado(true); setMensaje('')
    try { await updatePassword(auth.currentUser, nueva); setNueva(''); setRepetida(''); setMensaje('✓ Contraseña cambiada') }
    catch (err) {
      setMensaje(err.code === 'auth/requires-recent-login' ? 'Por seguridad, cierra sesión, vuelve a entrar y repite el cambio.' : 'No se pudo cambiar: ' + (err.message ?? ''))
    } finally { setOcupado(false) }
  }

  return (
    <form onSubmit={guardar} className="space-y-3">
      <label className="block"><span className="etiqueta">Nueva contraseña</span>
        <input type={ver ? 'text' : 'password'} autoComplete="new-password" className="input" value={nueva} onChange={e => setNueva(e.target.value)} minLength={6} />
      </label>
      <label className="block"><span className="etiqueta">Repite la contraseña</span>
        <input type={ver ? 'text' : 'password'} autoComplete="new-password" className="input" value={repetida} onChange={e => setRepetida(e.target.value)} minLength={6} />
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={ver} onChange={e => setVer(e.target.checked)} /> Mostrar contraseña</label>
      {mensaje && <p role="status" className={`text-xs ${mensaje.startsWith('✓') ? 'text-teal-700' : 'text-red-600'}`}>{mensaje}</p>}
      <button className="btn w-full" disabled={ocupado || !nueva}>{ocupado ? 'Guardando…' : 'Cambiar contraseña'}</button>
    </form>
  )
}
