import { useEffect, useRef, useState } from 'react'
import { fotoDePerfil } from '../lib/util'
import Modal from './Modal'
import { Avatar, IconoCamara } from './Iconos'

// Elegir, ver y guardar la foto de perfil. onGuardar recibe la foto (texto) o null para quitarla.
export default function EditorFoto({ nombre, fotoActual, onGuardar, onClose }) {
  const [foto, setFoto] = useState(fotoActual ?? null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const input = useRef(null)
  useEffect(() => { setFoto(fotoActual ?? null) }, [fotoActual])

  const elegir = async e => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setError('')
    try { setFoto(await fotoDePerfil(archivo)) } catch { setError('No se pudo leer esa imagen. Prueba con otra.') }
  }
  const guardar = async () => {
    setOcupado(true); setError('')
    try { await onGuardar(foto); onClose() }
    catch (err) { setError('No se pudo guardar: ' + err.message); setOcupado(false) }
  }

  return (
    <Modal titulo="Foto de perfil" onClose={ocupado ? () => {} : onClose} ancho="max-w-sm">
      <div className="flex flex-col items-center gap-4">
        <Avatar nombre={nombre} foto={foto} tamano={128} />
        <input ref={input} type="file" accept="image/*" hidden onChange={elegir} />
        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn-sec" onClick={() => input.current.click()}><IconoCamara width={16} height={16} /> {foto ? 'Cambiar foto' : 'Elegir foto'}</button>
          {foto && <button className="btn-peligro" onClick={() => setFoto(null)}>Quitar</button>}
        </div>
        <p className="text-center text-xs text-slate-500">Se recorta en cuadrado automáticamente.</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex w-full justify-end gap-2">
          <button className="btn-sec" onClick={onClose} disabled={ocupado}>Cancelar</button>
          <button className="btn" onClick={guardar} disabled={ocupado || foto === (fotoActual ?? null)}>{ocupado ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </Modal>
  )
}
