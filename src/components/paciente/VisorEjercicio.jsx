import { useEffect, useState } from 'react'
import { useCatalogo } from '../../pages/MiRutina'
import { describirLinea } from '../../lib/volumen'
import Foto from '../Foto'
import { IAtras, IBandera, IChevronDer, IChevronIzq, IInfo, IPlay } from './IconosPaciente'

// Ficha a pantalla completa de un ejercicio: fotos grandes, vídeo, series y observaciones
export default function VisorEjercicio({ ejercicio: e, onCerrar }) {
  const cat = useCatalogo(e.ejercicioId)
  const [foto, setFoto] = useState(0)
  const [titulo, ...resto] = e.nombre.split('\n').filter(Boolean)

  useEffect(() => {
    const t = ev => ev.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', t)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', t); document.body.style.overflow = '' }
  }, [onCerrar])

  const fotos = cat?.fotos ?? []
  const varias = fotos.length > 1
  const ir = delta => setFoto(f => (f + delta + fotos.length) % fotos.length)
  // Deslizar con el dedo para pasar de foto
  const [inicioX, setInicioX] = useState(null)
  const alSoltar = ev => {
    if (inicioX == null || !varias) return
    const dx = ev.changedTouches[0].clientX - inicioX
    if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1)
    setInicioX(null)
  }
  return (
    <div className="paciente fixed inset-0 z-50 overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button onClick={onCerrar} aria-label="Volver" className="rounded-full bg-white/80 p-2 text-tinta shadow-sm backdrop-blur active:scale-90"><IAtras width={28} height={28} /></button>
      </div>
      <div className="mx-auto max-w-xl -mt-14">
        <div className="relative aspect-square w-full select-none bg-white" onTouchStart={ev => setInicioX(ev.touches[0].clientX)} onTouchEnd={alSoltar}>
          {fotos.length ? <Foto ruta={fotos[foto]} className="h-full w-full !bg-white" /> : <div className="flex h-full items-center justify-center text-slate-300">Sin foto</div>}
          {varias && <>
            <span className="absolute right-4 top-4 rounded-full bg-tinta/75 px-3 py-1 text-[14px] font-medium text-white">{foto + 1} / {fotos.length}</span>
            <button onClick={() => ir(-1)} aria-label="Foto anterior" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-tinta shadow-md active:scale-90"><IChevronIzq width={26} height={26} /></button>
            <button onClick={() => ir(1)} aria-label="Foto siguiente" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-tinta shadow-md active:scale-90"><IChevronDer width={26} height={26} /></button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
              {fotos.map((_, k) => <button key={k} onClick={() => setFoto(k)} aria-label={`Foto ${k + 1}`} className={`h-3 rounded-full transition-all ${k === foto ? 'w-7 bg-tinta' : 'w-3 bg-tinta/30'}`} />)}
            </div>
          </>}
        </div>
        {varias && <p className="pt-2 text-center text-[13px] font-light text-slate-500">Desliza o usa las flechas para ver las {fotos.length} fotos</p>}
        <div className="space-y-6 px-5 pb-16 pt-6">
          <div>
            <h2 className="text-[30px] font-light leading-tight tracking-tight">{titulo}</h2>
            {resto.length > 0 && <p className="mt-1 text-[15px] font-light text-slate-500">{resto.join(' · ')}</p>}
          </div>
          {cat?.videos?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {cat.videos.map((v, k) => <a key={v} href={v} target="_blank" rel="noreferrer" className="boton-pildora-borde"><IPlay width={18} height={18} /> Ver vídeo{cat.videos.length > 1 ? ` ${k + 1}` : ''}</a>)}
            </div>
          )}
          <ul className="space-y-3">
            {(e.lineas ?? []).map((l, k) => (
              <li key={k} className="flex items-start gap-3 text-[17px] font-light">
                <IBandera width={24} height={24} className="mt-0.5 shrink-0" />
                <span className="min-w-0 [overflow-wrap:anywhere]">{describirLinea(l)}{e.pesos?.[k] != null && <span className="text-slate-500"> · {e.pesos[k]} kg</span>}</span>
              </li>
            ))}
          </ul>
          {e.observaciones && (
            <p className="flex items-start gap-3 text-[16px] font-light leading-relaxed text-slate-700"><IInfo width={24} height={24} className="mt-0.5 shrink-0" />{e.observaciones}</p>
          )}
        </div>
      </div>
    </div>
  )
}
