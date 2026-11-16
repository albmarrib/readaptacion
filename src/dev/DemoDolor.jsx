import { useMemo, useState } from 'react'
import Body from 'react-muscle-highlighter'

// PANTALLA DE PRUEBA (solo en local, /demo-dolor): cómo quedarían las preguntas de esfuerzo y
// dolor del paciente y el panel del entrenador. Datos inventados; no guarda nada.

const ZONAS = {
  neck: 'Cuello', trapezius: 'Trapecio', deltoids: 'Hombro', chest: 'Pecho', 'upper-back': 'Espalda alta',
  'lower-back': 'Lumbar', abs: 'Abdomen', obliques: 'Oblicuos', biceps: 'Bíceps', triceps: 'Tríceps',
  forearm: 'Antebrazo', hands: 'Mano / muñeca', gluteal: 'Glúteo', adductors: 'Aductores', quadriceps: 'Cuádriceps',
  hamstring: 'Isquiotibiales', knees: 'Rodilla', calves: 'Gemelo', tibialis: 'Tibial', ankles: 'Tobillo', feet: 'Pie',
  head: 'Cabeza',
}
const LADO = { left: 'izquierda', right: 'derecha' }
const nombreZona = z => `${ZONAS[z.slug] ?? z.slug}${z.side ? ` ${LADO[z.side]}` : ''}`

// Color según la intensidad (0-10): amarillo suave → rojo intenso
const colorDolor = n => (n >= 8 ? '#b91c1c' : n >= 6 ? '#ef4444' : n >= 4 ? '#f97316' : n >= 2 ? '#fbbf24' : '#fde68a')
const colorEsfuerzo = n => (n >= 8 ? 'bg-red-100 text-red-800 border-red-300' : n >= 4 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300')

function Cuerpos({ genero, datos, onPulsar, escala = 1 }) {
  return (
    <div className="cuerpo flex items-start justify-center gap-2">
      {['front', 'back'].map(lado => (
        <div key={lado} className="text-center">
          <Body side={lado} gender={genero} data={datos} scale={escala} onBodyPartPress={onPulsar}
            defaultFill="#eef2f6" defaultStroke="#cbd5e1" defaultStrokeWidth={0.5} border="none" hiddenParts={['hair']} />
          <p className="-mt-1 text-xs text-slate-500">{lado === 'front' ? 'Frente' : 'Espalda'}</p>
        </div>
      ))}
    </div>
  )
}

function Paciente() {
  const [genero, setGenero] = useState('female')
  const [esfuerzo, setEsfuerzo] = useState(7)
  const [dolor, setDolor] = useState(true)
  const [zonas, setZonas] = useState([{ slug: 'knees', side: 'right', intensidad: 6 }])
  const [activa, setActiva] = useState(0)

  const pulsar = (parte, side) => {
    if (!parte.slug || parte.slug === 'hair') return
    const i = zonas.findIndex(z => z.slug === parte.slug && z.side === side)
    if (i >= 0) { setActiva(i); return }
    setZonas(z => [...z, { slug: parte.slug, side, intensidad: 5 }]); setActiva(zonas.length)
  }
  const datos = zonas.map(z => ({ slug: z.slug, side: z.side, color: colorDolor(z.intensidad) }))

  return (
    <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-center text-2xl font-light">Entreno completado</p>
      <p className="mb-5 text-center text-sm text-slate-500">5 de 5 ejercicios</p>

      <p className="mb-2 font-medium">¿Cuánto esfuerzo te ha costado?</p>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button key={n} onClick={() => setEsfuerzo(n)}
            className={`rounded-lg border py-2 text-sm ${esfuerzo === n ? `${colorEsfuerzo(n)} font-semibold ring-2 ring-offset-1 ring-slate-400` : 'border-slate-200 text-slate-600'}`}>{n}</button>
        ))}
      </div>
      <div className="mb-5 mt-1 flex justify-between text-[11px] text-slate-400"><span>Muy fácil</span><span>Duro</span><span>Máximo</span></div>

      <p className="mb-2 font-medium">¿Te ha dolido algo?</p>
      <div className="mb-3 flex gap-2">
        {[['No', false], ['Sí', true]].map(([t, v]) => (
          <button key={t} onClick={() => setDolor(v)} className={`flex-1 rounded-xl border py-2 text-sm ${dolor === v ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'}`}>{t}</button>
        ))}
      </div>

      {dolor && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-slate-600">Toca dónde te ha dolido</p>
            <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs">
              {[['female', 'Mujer'], ['male', 'Hombre']].map(([g, t]) => (
                <button key={g} onClick={() => setGenero(g)} className={`rounded-md px-2 py-1 ${genero === g ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>{t}</button>
              ))}
            </div>
          </div>
          <Cuerpos genero={genero} datos={datos} onPulsar={pulsar} escala={0.75} />
          <ul className="mt-3 space-y-2">
            {zonas.map((z, i) => (
              <li key={`${z.slug}-${z.side}`} className={`rounded-xl border p-2.5 ${i === activa ? 'border-teal-500 bg-teal-50/40' : 'border-slate-200'}`} onClick={() => setActiva(i)}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{nombreZona(z)}</span>
                  <span className="flex items-center gap-2">
                    <b style={{ color: colorDolor(z.intensidad) }}>{z.intensidad}/10</b>
                    <button className="text-slate-400" onClick={e => { e.stopPropagation(); setZonas(x => x.filter((_, j) => j !== i)) }} aria-label="Quitar">✕</button>
                  </span>
                </div>
                {i === activa && <input type="range" min="0" max="10" value={z.intensidad} className="mt-2 w-full accent-red-500"
                  onChange={e => setZonas(x => x.map((y, j) => (j === i ? { ...y, intensidad: Number(e.target.value) } : y)))} />}
              </li>
            ))}
          </ul>
          <textarea rows={2} className="input mt-3 text-sm" placeholder="¿Cuándo te ha dolido? (opcional)" defaultValue="Al bajar en la sentadilla" />
        </>
      )}
      <button className="boton-pildora mt-5 w-full">Guardar y terminar</button>
      <button className="mt-2 w-full text-sm text-slate-500">Ahora no</button>
    </div>
  )
}

// ───────── Panel del entrenador ─────────
const SESIONES = [
  ['20 oct', 5, []], ['22 oct', 6, []], ['24 oct', 6, [['knees', 'right', 3]]], ['27 oct', 7, [['knees', 'right', 5]]],
  ['29 oct', 6, [['lower-back', undefined, 2]]], ['31 oct', 7, [['knees', 'right', 6]]], ['3 nov', 8, [['knees', 'right', 7], ['lower-back', undefined, 3]]],
  ['5 nov', 6, [['knees', 'right', 5]]], ['7 nov', 7, [['knees', 'right', 4]]], ['10 nov', 7, [['knees', 'right', 3]]], ['12 nov', 6, [['deltoids', 'left', 2]]], ['14 nov', 7, []],
].map(([fecha, esfuerzo, zonas]) => ({ fecha, esfuerzo, zonas: zonas.map(([slug, side, intensidad]) => ({ slug, side, intensidad })) }))

function GraficaLineas({ sesiones }) {
  const W = 560, H = 190, P = { l: 28, r: 10, t: 12, b: 26 }
  const x = i => P.l + (i * (W - P.l - P.r)) / (sesiones.length - 1)
  const y = v => P.t + (1 - v / 10) * (H - P.t - P.b)
  const linea = vals => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')
  const esf = sesiones.map(s => s.esfuerzo), dol = sesiones.map(s => Math.max(0, ...s.zonas.map(z => z.intensidad)))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolución del esfuerzo y del dolor por sesión">
      {[0, 2, 4, 6, 8, 10].map(v => <g key={v}><line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#e2e8f0" /><text x={P.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{v}</text></g>)}
      <rect x={P.l} y={y(10)} width={W - P.l - P.r} height={y(7) - y(10)} fill="#fee2e2" opacity="0.5" />
      <path d={`${linea(esf)} L${x(esf.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="#0f766e" opacity="0.08" />
      <path d={linea(esf)} fill="none" stroke="#0f766e" strokeWidth="2.5" />
      <path d={linea(dol)} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="5 4" />
      {esf.map((v, i) => <circle key={`e${i}`} cx={x(i)} cy={y(v)} r="3.5" fill="#0f766e" />)}
      {dol.map((v, i) => v > 0 && <circle key={`d${i}`} cx={x(i)} cy={y(v)} r="3.5" fill="#ef4444" />)}
      {sesiones.map((s, i) => i % 2 === 0 && <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{s.fecha}</text>)}
    </svg>
  )
}

function Entrenador() {
  const [genero, setGenero] = useState('female')
  const resumen = useMemo(() => {
    const porZona = {}
    for (const s of SESIONES) for (const z of s.zonas) {
      const k = `${z.slug}|${z.side ?? ''}`
      ;(porZona[k] ??= { slug: z.slug, side: z.side, veces: 0, max: 0, suma: 0, serie: [] })
      porZona[k].veces++; porZona[k].suma += z.intensidad; porZona[k].max = Math.max(porZona[k].max, z.intensidad)
    }
    const zonas = Object.values(porZona).sort((a, b) => b.veces - a.veces)
    return {
      zonas,
      esfuerzoMedio: (SESIONES.reduce((s, x) => s + x.esfuerzo, 0) / SESIONES.length).toFixed(1),
      conDolor: SESIONES.filter(s => s.zonas.length).length,
      alertas: SESIONES.filter(s => s.zonas.some(z => z.intensidad >= 7)).length,
    }
  }, [])
  const mapa = resumen.zonas.map(z => ({ slug: z.slug, side: z.side, color: colorDolor(z.suma / z.veces) }))
  const Tarjeta = ({ titulo, valor, detalle, rojo }) => (
    <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{titulo}</p><p className={`text-2xl font-semibold ${rojo ? 'text-red-600' : 'text-slate-900'}`}>{valor}</p><p className="text-xs text-slate-400">{detalle}</p></div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta titulo="Esfuerzo medio" valor={`${resumen.esfuerzoMedio}/10`} detalle="últimas 12 sesiones" />
        <Tarjeta titulo="Sesiones con dolor" valor={`${resumen.conDolor} de ${SESIONES.length}`} detalle="últimas 4 semanas" />
        <Tarjeta titulo="Zona más repetida" valor={nombreZona(resumen.zonas[0])} detalle={`${resumen.zonas[0].veces} veces · máx. ${resumen.zonas[0].max}/10`} />
        <Tarjeta titulo="Avisos de dolor alto" valor={resumen.alertas} detalle="dolor de 7 o más" rojo />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="tarjeta">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Mapa del dolor</h3>
            <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs">
              {[['female', 'Mujer'], ['male', 'Hombre']].map(([g, t]) => <button key={g} onClick={() => setGenero(g)} className={`rounded-md px-2 py-1 ${genero === g ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>{t}</button>)}
            </div>
          </div>
          <Cuerpos genero={genero} datos={mapa} escala={0.85} />
          <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-500">
            <span>Leve</span>{[1, 3, 5, 7, 9].map(n => <span key={n} className="h-2.5 w-6 rounded" style={{ background: colorDolor(n) }} />)}<span>Intenso</span>
          </div>
        </section>

        <section className="tarjeta">
          <h3 className="font-semibold">Esfuerzo y dolor por sesión</h3>
          <div className="mb-1 mt-1 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-teal-700" />Esfuerzo</span>
            <span className="flex items-center gap-1"><span className="h-0.5 w-4 border-t-2 border-dashed border-red-500" />Dolor máximo</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-4 rounded bg-red-100" />Zona de aviso (7+)</span>
          </div>
          <GraficaLineas sesiones={SESIONES} />
          <h4 className="mb-2 mt-4 text-sm font-semibold">Zonas con molestias</h4>
          <ul className="space-y-2">
            {resumen.zonas.map(z => (
              <li key={`${z.slug}${z.side}`} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0">{nombreZona(z)}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${(z.veces / SESIONES.length) * 100}%`, background: colorDolor(z.suma / z.veces) }} /></span>
                <span className="w-28 text-right text-xs text-slate-500">{z.veces} veces · máx. {z.max}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

export default function DemoDolor() {
  return (
    <div className="min-h-dvh bg-fondo p-4 md:p-8">
      <p className="mx-auto mb-6 max-w-6xl rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><b>Pantalla de prueba</b> con datos inventados: así quedarían el esfuerzo y el dolor. No guarda nada.</p>
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div><h2 className="mb-3 text-lg font-semibold">App del paciente</h2><Paciente /></div>
        <div><h2 className="mb-3 text-lg font-semibold">App del entrenador · Ana García</h2><Entrenador /></div>
      </div>
    </div>
  )
}
