import { useMemo, useState } from 'react'
import CuerpoDolor, { LeyendaDolor } from './CuerpoDolor'
import { UMBRAL_AVISO, colorDolor, dolorMaximo, generoDe, nombreZona } from '../lib/sensaciones'

// Panel del entrenador: esfuerzo percibido y dolor que el paciente indica al terminar cada entreno.
// sesiones: [{ fecha: 'AAAA-MM-DD', dia, sensaciones: { esfuerzo, zonas, nota } }] en orden de fecha.
const MAX_GRAFICA = 20
const fechaCorta = f => new Date(`${f}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

function Tarjeta({ titulo, valor, detalle, rojo }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className={`mt-0.5 text-2xl font-semibold leading-tight ${rojo ? 'text-red-600' : 'text-slate-900'}`}>{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-slate-400">{detalle}</p>}
    </div>
  )
}

function Grafica({ sesiones }) {
  const W = 560, H = 200, P = { l: 26, r: 10, t: 10, b: 26 }
  const n = sesiones.length
  const x = i => P.l + (n === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (n - 1))
  const y = v => P.t + (1 - v / 10) * (H - P.t - P.b)
  const esf = sesiones.map(s => s.sensaciones.esfuerzo ?? null)
  const dol = sesiones.map(s => dolorMaximo(s.sensaciones))
  const linea = vals => vals.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean).map(([a, b], i) => `${i ? 'L' : 'M'}${a},${b}`).join(' ')
  const cada = Math.max(1, Math.ceil(n / 7))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Esfuerzo y dolor máximo por sesión">
      <rect x={P.l} y={y(10)} width={W - P.l - P.r} height={y(UMBRAL_AVISO) - y(10)} fill="#fee2e2" opacity="0.55" />
      {[0, 2, 4, 6, 8, 10].map(v => <g key={v}><line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#e2e8f0" /><text x={P.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{v}</text></g>)}
      <path d={linea(esf)} fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinejoin="round" />
      <path d={linea(dol)} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="5 4" strokeLinejoin="round" />
      {esf.map((v, i) => v != null && <circle key={`e${i}`} cx={x(i)} cy={y(v)} r="3.5" fill="#0f766e"><title>{`${fechaCorta(sesiones[i].fecha)} · esfuerzo ${v}`}</title></circle>)}
      {dol.map((v, i) => v > 0 && <circle key={`d${i}`} cx={x(i)} cy={y(v)} r="3.5" fill="#ef4444"><title>{`${fechaCorta(sesiones[i].fecha)} · dolor ${v}`}</title></circle>)}
      {sesiones.map((s, i) => (i % cada === 0 || i === n - 1) && <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{fechaCorta(s.fecha)}</text>)}
    </svg>
  )
}

export default function PanelSensaciones({ sesiones, ficha }) {
  const [genero, setGenero] = useState(generoDe(ficha))
  const datos = useMemo(() => {
    const conDatos = sesiones.filter(s => s.sensaciones)
    const ultimas = conDatos.slice(-MAX_GRAFICA)
    const porZona = {}
    for (const s of ultimas) for (const z of s.sensaciones.zonas ?? []) {
      const k = `${z.zona}|${z.lado ?? ''}`
      ;(porZona[k] ??= { zona: z.zona, lado: z.lado, veces: 0, max: 0, suma: 0 })
      porZona[k].veces++; porZona[k].suma += z.intensidad; porZona[k].max = Math.max(porZona[k].max, z.intensidad)
    }
    const zonas = Object.values(porZona).map(z => ({ ...z, media: z.suma / z.veces })).sort((a, b) => b.veces - a.veces || b.max - a.max)
    const esfuerzos = ultimas.map(s => s.sensaciones.esfuerzo).filter(v => v != null)
    return {
      ultimas, zonas,
      esfuerzoMedio: esfuerzos.length ? (esfuerzos.reduce((a, b) => a + b, 0) / esfuerzos.length).toFixed(1).replace('.', ',') : '—',
      conDolor: ultimas.filter(s => s.sensaciones.zonas?.length).length,
      altos: ultimas.filter(s => dolorMaximo(s.sensaciones) >= UMBRAL_AVISO).length,
      notas: [...ultimas].reverse().filter(s => s.sensaciones.nota).slice(0, 4),
    }
  }, [sesiones])

  if (!datos.ultimas.length) return (
    <section className="tarjeta">
      <h2 className="tarjeta-titulo [--acento:#ef4444]">Esfuerzo y dolor</h2>
      <p className="text-sm text-slate-500">{ficha?.preguntarSensaciones === false
        ? 'Las preguntas de esfuerzo y dolor están desactivadas para este paciente (se activan en su ficha).'
        : 'Todavía no hay respuestas. Al terminar cada entreno, el paciente puede indicar su esfuerzo y si le ha dolido algo.'}</p>
    </section>
  )

  const top = datos.zonas[0]
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Esfuerzo y dolor <span className="text-sm font-normal text-slate-500">· últimas {datos.ultimas.length} sesiones</span></h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta titulo="Esfuerzo medio" valor={`${datos.esfuerzoMedio}${datos.esfuerzoMedio === '—' ? '' : '/10'}`} detalle="escala del 1 al 10" />
        <Tarjeta titulo="Sesiones con dolor" valor={`${datos.conDolor} de ${datos.ultimas.length}`} />
        <Tarjeta titulo="Zona más repetida" valor={top ? nombreZona(top) : 'Ninguna'} detalle={top ? `${top.veces} ${top.veces === 1 ? 'vez' : 'veces'} · máx. ${top.max}/10` : 'sin molestias'} />
        <Tarjeta titulo={`Dolor de ${UMBRAL_AVISO} o más`} valor={datos.altos} detalle="sesiones con aviso" rojo={datos.altos > 0} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="tarjeta">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-semibold">Mapa del dolor</h3>
            <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs">
              {[['female', 'Mujer'], ['male', 'Hombre']].map(([g, t]) => <button key={g} onClick={() => setGenero(g)} className={`rounded-md px-2 py-1 ${genero === g ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>{t}</button>)}
            </div>
          </div>
          <CuerpoDolor genero={genero} zonas={datos.zonas.map(z => ({ zona: z.zona, lado: z.lado, intensidad: z.media }))} escala={0.85} />
          <div className="mt-2"><LeyendaDolor /></div>
          <p className="mt-1 text-center text-[11px] text-slate-400">Color según el dolor medio de cada zona</p>
        </div>

        <div className="tarjeta">
          <h3 className="font-semibold">Por sesión</h3>
          <div className="mb-1 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-teal-700" />Esfuerzo</span>
            <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-red-500" />Dolor máximo</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded bg-red-100" />Zona de aviso ({UMBRAL_AVISO}+)</span>
          </div>
          <Grafica sesiones={datos.ultimas} />
          {datos.zonas.length > 0 && <>
            <h4 className="mb-2 mt-4 text-sm font-semibold">Zonas con molestias</h4>
            <ul className="space-y-2">
              {datos.zonas.slice(0, 6).map(z => (
                <li key={`${z.zona}${z.lado}`} className="flex items-center gap-3 text-sm">
                  <span className="w-36 shrink-0 truncate">{nombreZona(z)}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${Math.max(6, (z.veces / datos.ultimas.length) * 100)}%`, background: colorDolor(z.media) }} /></span>
                  <span className="w-28 shrink-0 text-right text-xs text-slate-500">{z.veces} {z.veces === 1 ? 'vez' : 'veces'} · máx. {z.max}</span>
                </li>
              ))}
            </ul>
          </>}
          {datos.notas.length > 0 && <>
            <h4 className="mb-2 mt-4 text-sm font-semibold">Comentarios del paciente</h4>
            <ul className="space-y-1.5 text-sm">
              {datos.notas.map(s => <li key={s.id ?? s.fecha} className="text-slate-600"><span className="text-xs text-slate-400">{fechaCorta(s.fecha)} · </span>«{s.sensaciones.nota}»</li>)}
            </ul>
          </>}
        </div>
      </div>
    </section>
  )
}
