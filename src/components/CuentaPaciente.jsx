import { useState } from 'react'
import { guardarFotoPerfil } from '../lib/foto'
import { useAuth } from '../lib/auth'
import CambiarClave from './CambiarClave'
import EditorFoto from './EditorFoto'
import Modal from './Modal'
import { Avatar, IconoCamara } from './Iconos'

export default function CuentaPaciente({ onClose }) {
  const { perfil, salir } = useAuth()
  const [foto, setFoto] = useState(false)
  return (
    <Modal titulo="Mi cuenta" onClose={onClose} ancho="max-w-sm">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Avatar nombre={perfil.nombre} foto={perfil.foto} tamano={56} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{perfil.nombre}</div>
            <div className="truncate text-xs text-slate-500">{perfil.email}</div>
            <button className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal-700" onClick={() => setFoto(true)}><IconoCamara width={14} height={14} /> {perfil.foto ? 'Cambiar foto' : 'Subir foto'}</button>
          </div>
        </div>
        <section>
          <h3 className="mb-2 text-sm font-semibold">Cambiar contraseña</h3>
          <CambiarClave />
        </section>
        <button className="btn-sec w-full" onClick={salir}>Cerrar sesión</button>
      </div>
      {foto && <EditorFoto nombre={perfil.nombre} fotoActual={perfil.foto} onClose={() => setFoto(false)} onGuardar={f => guardarFotoPerfil(perfil, f)} />}
    </Modal>
  )
}
