import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { getDownloadURL, ref } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { describirLinea, formatLinea } from '../lib/volumen'
import { LogoCentro } from '../components/Iconos'
import { useAuth } from '../lib/auth'
import { useCentro } from '../lib/centro'

const fmt = t => (t?.toDate ? t.toDate() : t ? new Date(t) : null)?.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

// Foto para imprimir: se carga enseguida (no en diferido) y avisa cuando está lista
function FotoImpresion({ ruta, onListo }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let vivo = true
    getDownloadURL(ref(storage, ruta)).then(u => vivo && setUrl(u)).catch(() => onListo(ruta))
    return () => { vivo = false }
  }, [ruta]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!url) return <div className="h-full w-full bg-slate-100" />
  return <img src={url} alt="" className="h-full w-full object-contain" onLoad={() => onListo(ruta)} onError={() => onListo(ruta)} />
}

// Vista de la rutina lista para imprimir o guardar como PDF (A4)
export default function ImpresionRutina() {
  const { id: pid, rid } = useParams()
  const [datos, setDatos] = useState(null)
  const { perfil } = useAuth()
  const centro = useCentro(perfil?.centroId)
  const [catalogo, setCatalogo] = useState({}) // ejercicioId -> fotos
  const [error, setError] = useState('')
  const [conFotos, setConFotos] = useState(true)
  const [pesos, setPesos] = useState('blanco') // blanco | anotados
  const [listas, setListas] = useState(new Set())

  useEffect(() => {
    let vivo = true
    // Solo desarrollo (VITE_DEMO=1): rutina ficticia para revisar el diseño de impresión
    if (import.meta.env.DEV && rid === 'demo') {
      setDatos({
        paciente: { nombre: 'Paciente de Prueba' },
        rutina: { numero: 2, temporada: 2026, semanas: 5, frecuencia: 3, notaGeneral: 'Calienta 10 minutos antes de empezar y bebe agua entre series.', dias: [{ numero: 1, titulo: 'Pectoral + Deltoides' }, { numero: 2, titulo: 'Dorsal' }] },
        ejercicios: [
          { id: 'a', dia: 1, orden: 1, ejercicioId: 'x', nombre: 'PRESS BANCA CON MANCUERNAS', lineas: [{ series: 1, tramos: [20] }, { series: 2, tramos: [10, 8] }, { series: 3, tramos: [8, 6] }], seriesTotales: 6, pesos: { 0: 20, 1: 24 }, observaciones: 'Baja despacio (3 segundos) y no bloquees los codos arriba.' },
          { id: 'b', dia: 1, orden: 2, ejercicioId: 'y', nombre: 'APERTURAS EN POLEA\nCON AGARRE NEUTRO', lineas: [{ series: 3, tramos: [12] }], seriesTotales: 3, pesos: {}, observaciones: '' },
          { id: 'c', dia: 2, orden: 1, ejercicioId: 'z', nombre: 'REMO INVERTIDO', lineas: [{ series: 4, tramos: [10, 5] }], seriesTotales: 4, pesos: {}, observaciones: 'Descanso de 90 segundos.' },
        ],
      })
      return
    }
    ;(async () => {
      const [p, r, e] = await Promise.all([
        getDoc(doc(db, 'pacientes', pid)),
        getDoc(doc(db, 'pacientes', pid, 'rutinas', rid)),
        getDocs(collection(db, 'pacientes', pid, 'rutinas', rid, 'ejercicios')),
      ])
      if (!p.exists() || !r.exists()) throw new Error('No se encuentra la rutina.')
      const ejercicios = e.docs.map(d => ({ id: d.id, ...d.data() }))
      const ids = [...new Set(ejercicios.map(x => x.ejercicioId).filter(Boolean))]
      const fotos = {}
      await Promise.all(ids.map(id => getDoc(doc(db, 'ejercicios', id)).then(s => { fotos[id] = s.exists() ? (s.data().fotos?.[0] ?? null) : null }).catch(() => { fotos[id] = null })))
      if (!vivo) return
      setCatalogo(fotos)
      setDatos({ paciente: p.data(), rutina: r.data(), ejercicios })
      document.title = `Rutina ${r.data().numero} - ${p.data().nombre}`
    })().catch(e => vivo && setError(e.message))
    return () => { vivo = false }
  }, [pid, rid])

  const marcar = useCallback(ruta => setListas(s => (s.has(ruta) ? s : new Set(s).add(ruta))), [])
  const rutasFotos = useMemo(() => (conFotos && datos ? [...new Set(datos.ejercicios.map(e => catalogo[e.ejercicioId]).filter(Boolean))] : []), [conFotos, datos, catalogo])
  const cargando = rutasFotos.some(r => !listas.has(r))

  if (error) return <p className="m-6 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>
  if (!datos) return <p className="m-6 text-slate-500">Preparando la rutina…</p>
  const { paciente, rutina, ejercicios } = datos

  return (
    <div className="min-h-dvh bg-slate-200/60 print:bg-white">
      {/* Barra de herramientas (no se imprime) */}
      <div className="no-imprimir sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-x-4 gap-y-2">
          <Link to={`/pacientes/${pid}/rutinas/${rid}`} className="btn-sec">‹ Volver</Link>
          <label className="flex items-center gap-1.5 text-xs text-slate-700"><input type="checkbox" checked={conFotos} onChange={e => setConFotos(e.target.checked)} /> Incluir fotos</label>
          <label className="flex items-center gap-1.5 text-xs text-slate-700">Pesos:
            <select className="input !min-h-8 !w-auto !py-0.5" value={pesos} onChange={e => setPesos(e.target.value)}>
              <option value="blanco">En blanco (para apuntar a mano)</option>
              <option value="anotados">Los anotados por el paciente</option>
            </select>
          </label>
          <button className="btn ml-auto" onClick={() => window.print()} disabled={cargando}>{cargando ? 'Cargando fotos…' : 'Descargar PDF'}</button>
        </div>
        <p className="mx-auto mt-1.5 max-w-[210mm] text-[11px] text-slate-500">Se abrirá el cuadro de impresión: en <b>Destino</b> elige <b>«Guardar como PDF»</b> y pulsa Guardar.</p>
      </div>

      {/* Documento A4 */}
      <div className="mx-auto my-5 max-w-[210mm] bg-white p-[12mm] text-[11px] leading-snug text-slate-900 shadow-lg print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-center gap-3 border-b-2 border-teal-700 pb-3">
          <LogoCentro centro={centro} tamano={44} />
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold leading-tight text-teal-800">{centro?.nombre ?? 'Entrenamiento Personal'}</div>
            <div className="text-[11px] text-slate-500">Plan de entrenamiento personalizado</div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold">{paciente.nombre}</div>
            <div className="text-[11px] text-slate-600">Rutina {rutina.numero} · Temporada {rutina.temporada}</div>
          </div>
        </header>

        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-0.5 text-[11px] text-slate-600">
          <span><b>Duración:</b> {rutina.semanas} semanas</span>
          <span><b>Días por semana:</b> {rutina.dias.length}</span>
          {rutina.frecuencia != null && <span><b>Frecuencia:</b> {rutina.frecuencia}</span>}
          {rutina.fechaInicio && <span><b>Del</b> {fmt(rutina.fechaInicio)} <b>al</b> {fmt(rutina.fechaFin)}</span>}
        </div>
        {rutina.notaGeneral && <p className="mt-2 rounded border border-teal-200 bg-teal-50 p-2 text-[11px]"><b>Nota del entrenador:</b> {rutina.notaGeneral}</p>}

        {rutina.dias.map((dia, i) => {
          const delDia = ejercicios.filter(e => e.dia === dia.numero).sort((a, b) => a.orden - b.orden)
          const series = delDia.reduce((s, e) => s + (e.seriesTotales ?? 0), 0)
          return (
            <section key={dia.numero} className={i > 0 ? 'salto-pagina mt-6 print:mt-0' : 'mt-4'}>
              <div className="mb-2 flex items-baseline justify-between rounded bg-teal-700 px-3 py-1.5 text-white">
                <h2 className="text-sm font-bold">Día {dia.numero}{dia.titulo ? ` · ${dia.titulo}` : ''}</h2>
                <span className="text-[11px] text-teal-100">{delDia.length} ejercicio{delDia.length === 1 ? "" : "s"} · {series} series</span>
              </div>
              <ol className="space-y-2">
                {delDia.map((e, k) => {
                  const [titulo, ...resto] = e.nombre.split('\n').filter(Boolean)
                  const foto = conFotos ? catalogo[e.ejercicioId] : null
                  return (
                    <li key={e.id} className="evitar-corte flex gap-3 rounded border border-slate-300 p-2">
                      {conFotos && (
                        <div className="h-[22mm] w-[30mm] shrink-0 overflow-hidden rounded bg-slate-100">
                          {foto && <FotoImpresion ruta={foto} onListo={marcar} />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-700 text-[10px] font-bold text-white">{k + 1}</span>
                          <span className="text-[12px] font-bold">{titulo}</span>
                        </div>
                        {resto.length > 0 && <div className="ml-7 text-[10px] text-slate-500">{resto.join(' · ')}</div>}
                        <ul className="ml-7 mt-1 space-y-0.5">
                          {(e.lineas ?? []).map((l, j) => (
                            <li key={j} className="flex items-center gap-2">
                              <span className="w-16 shrink-0 font-mono font-bold">{formatLinea(l)}</span>
                              <span className="flex-1 text-slate-600">{describirLinea(l)}</span>
                              {pesos === 'anotados'
                                ? <span className="w-16 shrink-0 text-right font-semibold">{e.pesos?.[j] != null ? `${e.pesos[j]} kg` : ''}</span>
                                : <span className="w-16 shrink-0 border-b border-slate-400 text-right text-[9px] text-slate-400">kg</span>}
                            </li>
                          ))}
                        </ul>
                        {e.observaciones && <p className="ml-7 mt-1 rounded bg-amber-50 px-2 py-1 text-[10px] italic text-amber-900"><b className="not-italic">Observaciones:</b> {e.observaciones}</p>}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          )
        })}

        <footer className="mt-5 border-t border-slate-200 pt-2 text-[9px] text-slate-400">Documento generado el {fmt(new Date())}. Datos de salud: uso personal y confidencial.</footer>
      </div>
    </div>
  )
}
