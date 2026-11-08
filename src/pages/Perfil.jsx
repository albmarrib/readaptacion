import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { guardarFotoPerfil } from '../lib/foto'
import EditorFoto from '../components/EditorFoto'
import CambiarClave from '../components/CambiarClave'
import { Avatar, EncabezadoPagina, IconoCamara, IconoPacientes } from '../components/Iconos'

const ROL = { admin: 'Administrador', entrenador: 'Entrenador' }

export default function Perfil() {
  const { perfil } = useAuth()
  const [nombre, setNombre] = useState(perfil.nombre)
  const [fotoAbierta, setFotoAbierta] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const guardar = async e => {
    e.preventDefault()
    const n = nombre.trim()
    if (n.length < 2) { setMensaje('Escribe tu nombre.'); return }
    setOcupado(true); setMensaje('')
    try { await updateDoc(doc(db, 'usuarios', perfil.uid), { nombre: n }); setMensaje('✓ Guardado') }
    catch (err) { setMensaje('No se pudo guardar: ' + err.message) }
    finally { setOcupado(false) }
  }

  return (
    <div className="max-w-xl space-y-4">
      <EncabezadoPagina icono={IconoPacientes} color="teal" titulo="Mi perfil" subtitulo="Tus datos y tu foto" />
      <section className="tarjeta">
        <h2 className="tarjeta-titulo">Foto</h2>
        <div className="flex items-center gap-4">
          <Avatar nombre={perfil.nombre} foto={perfil.foto} tamano={72} />
          <div>
            <button className="btn-sec" onClick={() => setFotoAbierta(true)}><IconoCamara width={16} height={16} /> {perfil.foto ? 'Cambiar foto' : 'Subir foto'}</button>
            <p className="mt-1.5 text-xs text-slate-500">Se muestra en el menú y en tu equipo.</p>
          </div>
        </div>
      </section>

      <form onSubmit={guardar} className="tarjeta space-y-3 [--acento:#6366f1]">
        <h2 className="tarjeta-titulo">Datos</h2>
        <label className="block"><span className="etiqueta">Nombre</span><input className="input" value={nombre} onChange={e => setNombre(e.target.value)} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="etiqueta">Correo</span><input className="input" value={perfil.email ?? ''} disabled /></label>
          <label className="block"><span className="etiqueta">Rol</span><input className="input" value={ROL[perfil.rol] ?? perfil.rol} disabled /></label>
        </div>
        <div className="flex items-center justify-end gap-3">
          {mensaje && <span className={`text-xs ${mensaje.startsWith('✓') ? 'text-teal-700' : 'text-red-600'}`}>{mensaje}</span>}
          <button className="btn" disabled={ocupado || nombre.trim() === perfil.nombre}>{ocupado ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>

      <section className="tarjeta [--acento:#f59e0b]">
        <h2 className="tarjeta-titulo">Contraseña</h2>
        <p className="mb-3 text-xs text-slate-500">Opcional: si entras con Google puedes añadir una contraseña para entrar también con tu correo.</p>
        <CambiarClave />
      </section>

      {fotoAbierta && <EditorFoto nombre={perfil.nombre} fotoActual={perfil.foto} onClose={() => setFotoAbierta(false)} onGuardar={f => guardarFotoPerfil(perfil, f)} />}
    </div>
  )
}
