import { useEffect, useState } from 'react'
import { useCatalogo } from '../../pages/MiRutina'
import { describirLinea } from '../../lib/volumen'
import Foto from '../Foto'
import { IAtras, IBandera, IInfo, IPlay } from './IconosPaciente'

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
  return (
    <div className="paciente fixed inset-0 z-50 overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button onClick={onCerrar} aria-label="Volver" className="rounded-full bg-white/80 p-2 text-tinta shadow-sm backdrop-blur active:scale-90"><IAtras width={28} height={28} /></button>
      </div>
      <div className="mx-auto max-w-xl -mt-14">
        <div className="relative aspect-square w-full bg-white">
          {fotos.length ? <Foto ruta={fotos[foto]} className="h-full w-full !bg-white" /> : <div className="flex h-full items-center justify-center text-slate-300">Sin foto</div>}
          {fotos.length > 1 && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
              {fotos.map((_, k) => <button key={k} onClick={() => setFoto(k)} aria-label={`Foto ${k + 1}`} className={`h-2.5 rounded-full transition-all ${k === foto ? 'w-6 bg-tinta' : 'w-2.5 bg-tinta/30'}`} />)}
            </div>
          )}
        </div>
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
                <span>{describirLinea(l)}{e.pesos?.[k] != null && <span className="text-slate-500"> · {e.pesos[k]} kg</span>}</span>
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
