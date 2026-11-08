import { useEffect, useRef, useState } from 'react'
import { getDownloadURL, ref } from 'firebase/storage'
import { storage } from '../lib/firebase'

// Los enlaces de las fotos se recuerdan en el navegador: la primera vez hay que pedirlos a Storage,
// las siguientes la foto aparece al instante (ni siquiera hace falta preguntar).
const CLAVE = 'readaptacion.enlacesFotos.v1'
const MAX = 4000

const cache = new Map()
try { for (const [k, v] of Object.entries(JSON.parse(localStorage.getItem(CLAVE) ?? '{}'))) cache.set(k, v) } catch { /* sin almacenamiento */ }

let guardado = null
const recordar = (ruta, url) => {
  if (url !== undefined) cache.set(ruta, url)
  clearTimeout(guardado)
  guardado = setTimeout(() => {
    try {
      let entradas = [...cache.entries()]
      if (entradas.length > MAX) entradas = entradas.slice(-MAX)
      localStorage.setItem(CLAVE, JSON.stringify(Object.fromEntries(entradas)))
    } catch { /* almacenamiento lleno o bloqueado */ }
  }, 1000)
}
const olvidar = ruta => { cache.delete(ruta); recordar(ruta, undefined); cache.delete(ruta) }

// Carga la foto cuando está cerca de verse (el catálogo tiene miles)
export default function Foto({ ruta, alt = '', className = '' }) {
  const [url, setUrl] = useState(() => cache.get(ruta) ?? null)
  const [error, setError] = useState(false)
  const reintentada = useRef(false)
  const caja = useRef(null)

  useEffect(() => {
    if (url || !ruta) return
    let vivo = true
    const cargar = () => getDownloadURL(ref(storage, ruta))
      .then(u => { recordar(ruta, u); if (vivo) setUrl(u) })
      .catch(() => vivo && setError(true))
    // Margen amplio: empieza a cargar las fotos antes de que lleguen a la pantalla
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { obs.disconnect(); cargar() } }, { rootMargin: '900px' })
    obs.observe(caja.current)
    return () => { vivo = false; obs.disconnect() }
  }, [ruta, url])

  // Si un enlace recordado ya no vale (foto cambiada o borrada), se pide de nuevo una vez
  const alFallar = () => {
    if (reintentada.current) { setError(true); return }
    reintentada.current = true
    olvidar(ruta)
    getDownloadURL(ref(storage, ruta)).then(u => { recordar(ruta, u); setUrl(u) }).catch(() => setError(true))
  }

  return (
    <div ref={caja} className={`overflow-hidden bg-slate-100 ${className}`}>
      {url && <img src={url} alt={alt} decoding="async" loading="lazy" onError={alFallar} className="h-full w-full object-contain" />}
      {error && <span className="flex h-full items-center justify-center text-xs text-slate-400">sin foto</span>}
    </div>
  )
}
