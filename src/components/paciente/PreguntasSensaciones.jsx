import { useState } from 'react'
import CuerpoDolor from '../CuerpoDolor'
import { claseEsfuerzo, colorDolor, generoDe, guardarSensaciones, nombreZona } from '../../lib/sensaciones'

// Al terminar un entreno: «¿cuánto esfuerzo?» y «¿te ha dolido algo?». Todo opcional.
// onHecho() se llama al guardar o al pulsar «Ahora no».
export default function PreguntasSensaciones({ pid, rid, dia, ficha, resumen, onHecho }) {
  const [genero, setGenero] = useState(generoDe(ficha))
  const [esfuerzo, setEsfuerzo] = useState(null)
  const [dolor, setDolor] = useState(null) // null = sin contestar · false · true
  const [zonas, setZonas] = useState([])
  const [activa, setActiva] = useState(-1)
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const pulsar = (zona, lado) => {
    const i = zonas.findIndex(z => z.zona === zona && (z.lado ?? null) === lado)
    if (i >= 0) { setActiva(i); return }
    setZonas(z => [...z, { zona, lado, intensidad: 5 }]); setActiva(zonas.length)
  }
  const cambiar = (i, intensidad) => setZonas(x => x.map((y, j) => (j === i ? { ...y, intensidad } : y)))
  const quitar = i => { setZonas(x => x.filter((_, j) => j !== i)); setActiva(-1) }

  const guardar = async () => {
    if (esfuerzo == null && !(dolor && zonas.length)) { onHecho(); return }
    setGuardando(true); setError('')
    try {
      await guardarSensaciones({ pid, rid, dia, esfuerzo, zonas: dolor ? zonas : [], nota: dolor ? nota : '' })
      onHecho()
    } catch { setError('No se ha podido guardar. Inténtalo de nuevo.'); setGuardando(false) }
  }

  return (
    <div className="paciente fixed inset-0 z-50 overflow-y-auto px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md">
        <h2 className="text-center text-[30px] font-light leading-tight">Entreno completado</h2>
        <p className="mt-1 text-center text-[15px] font-light text-slate-500">{resumen}</p>

        <p className="mt-8 text-[17px] font-medium">¿Cuánto esfuerzo te ha costado?</p>
        <div className="mt-3 grid grid-cols-10 gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setEsfuerzo(esfuerzo === n ? null : n)} aria-pressed={esfuerzo === n}
              className={`rounded-lg border py-2.5 text-[15px] ${esfuerzo === n ? `${claseEsfuerzo(n)} font-semibold ring-2 ring-slate-400 ring-offset-1` : 'border-slate-300 bg-white/70 text-slate-600'}`}>{n}</button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[12px] text-slate-400"><span>Muy fácil</span><span>Duro</span><span>Máximo</span></div>

        <p className="mt-8 text-[17px] font-medium">¿Te ha dolido algo?</p>
        <div className="mt-3 flex gap-2">
          {[['No', false], ['Sí', true]].map(([t, v]) => (
            <button key={t} onClick={() => setDolor(v)} aria-pressed={dolor === v}
              className={`flex-1 rounded-xl border py-2.5 text-[15px] ${dolor === v ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white/70'}`}>{t}</button>
          ))}
        </div>

        {dolor && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[15px] text-slate-600">Toca dónde te ha dolido</p>
              <div className="flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                {[['female', 'Mujer'], ['male', 'Hombre']].map(([g, t]) => (
                  <button key={g} onClick={() => setGenero(g)} className={`rounded-md px-2 py-1 ${genero === g ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>{t}</button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white/70 py-3"><CuerpoDolor genero={genero} zonas={zonas} onPulsar={pulsar} escala={0.8} /></div>
            {zonas.length === 0 && <p className="mt-2 text-center text-sm text-slate-400">Toca una zona del dibujo para marcarla.</p>}
            <ul className="mt-3 space-y-2">
              {zonas.map((z, i) => (
                <li key={`${z.zona}-${z.lado}`} onClick={() => setActiva(i)} className={`rounded-xl border bg-white/80 p-3 ${i === activa ? 'border-teal-500' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between gap-2 text-[15px]">
                    <span className="font-medium">{nombreZona(z)}</span>
                    <span className="flex items-center gap-3">
                      <b style={{ color: colorDolor(z.intensidad) }}>{z.intensidad}/10</b>
                      <button className="px-1 text-slate-400" onClick={e => { e.stopPropagation(); quitar(i) }} aria-label={`Quitar ${nombreZona(z)}`}>✕</button>
                    </span>
                  </div>
                  {i === activa && (
                    <label className="mt-2 block">
                      <span className="sr-only">Intensidad del dolor</span>
                      <input type="range" min="0" max="10" step="1" value={z.intensidad} className="w-full accent-red-500" onChange={e => cambiar(i, Number(e.target.value))} />
                      <span className="flex justify-between text-[11px] text-slate-400"><span>0 · nada</span><span>10 · insoportable</span></span>
                    </label>
                  )}
                </li>
              ))}
            </ul>
            <textarea rows={2} maxLength={300} className="mt-3 w-full rounded-xl border border-slate-300 bg-white/80 p-3 text-[15px] outline-none focus:border-teal-600"
              placeholder="¿Cuándo te ha dolido? (opcional)" value={nota} onChange={e => setNota(e.target.value)} />
          </div>
        )}

        {error && <p role="alert" className="mt-4 text-center text-sm text-red-600">{error}</p>}
        <button className="boton-pildora mt-8" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar y terminar'}</button>
        <button className="mt-3 w-full py-2 text-[15px] text-slate-500" onClick={onHecho} disabled={guardando}>Ahora no</button>
      </div>
    </div>
  )
}
