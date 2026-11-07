import { useEffect, useRef, useState } from 'react'
import { getDownloadURL, ref } from 'firebase/storage'
import { storage } from '../lib/firebase'

const cache = new Map()

// Carga la foto desde Storage solo cuando se ve en pantalla (el catálogo tiene miles)
export default function Foto({ ruta, alt = '', className = '' }) {
  const [url, setUrl] = useState(() => cache.get(ruta) ?? null)
  const [error, setError] = useState(false)
  const caja = useRef(null)

  useEffect(() => {
    if (url || !ruta) return
    let vivo = true
    const cargar = () => getDownloadURL(ref(storage, ruta))
      .then(u => { cache.set(ruta, u); if (vivo) setUrl(u) })
      .catch(() => vivo && setError(true))
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { obs.disconnect(); cargar() } }, { rootMargin: '200px' })
    obs.observe(caja.current)
    return () => { vivo = false; obs.disconnect() }
  }, [ruta, url])

  return (
    <div ref={caja} className={`overflow-hidden bg-slate-100 ${className}`}>
      {url && <img src={url} alt={alt} loading="lazy" className="h-full w-full object-contain" />}
      {error && <span className="flex h-full items-center justify-center text-xs text-slate-400">sin foto</span>}
    </div>
  )
}
