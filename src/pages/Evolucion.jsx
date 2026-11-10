import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { normalizar } from '../lib/util'
import { formatLinea } from '../lib/volumen'
import Volver from '../components/Volver'

const fmt = t => (t?.toDate ? t.toDate() : t ? new Date(t) : null)?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
const maximo = pesos => { const v = Object.values(pesos ?? {}).filter(Number.isFinite); return v.length ? Math.max(...v) : null }

// Evolución de los pesos de un paciente: cada ejercicio a lo largo de sus rutinas
// modoPaciente: el propio paciente ve su evolución (sin botón de volver a la ficha)
export default function Evolucion({ pid: pidPaciente, modoPaciente = false }) {
  const { id } = useParams()
  const pid = pidPaciente ?? id
  const [paciente, setPaciente] = useState(null)
  const [ejercicios, setEjercicios] = useState(null) // ejercicioId -> { nombre, entradas: [...] }
  const [elegido, setElegido] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    if (import.meta.env.DEV && pid === 'demo') {
      const ent = (rutina, pesos) => ({ rutina, temporada: 2026, dia: 1, lineas: [{ series: 4, tramos: [10] }], pesos: { 0: pesos } })
      setPaciente({ nombre: 'Ana García' })
      setEjercicios([
        { id: 'a', nombre: 'Jalón al pecho', entradas: [ent(1, 25), ent(2, 30), ent(3, 32.5), ent(4, 37.5)] },
        { id: 'b', nombre: 'Press de banca con mancuernas', entradas: [ent(1, 10), ent(2, 12), ent(3, 12), ent(4, 14)] },
        { id: 'c', nombre: 'Sentadilla goblet con pausa abajo y talones elevados', entradas: [ent(3, 16), ent(4, 20)] },
      ])
      return
    }
    ;(async () => {
      const p = await getDoc(doc(db, 'pacientes', pid))
      if (!p.exists()) throw new Error('No se encuentra el paciente.')
      // El paciente solo puede leer rutinas ya activadas: hay que pedirlas filtradas
      const base = collection(db, 'pacientes', pid, 'rutinas')
      const rutinas = (await getDocs(modoPaciente ? query(base, where('estado', 'in', ['activa', 'pendiente', 'cerrada'])) : base)).docs
        .map(d => ({ id: d.id, ...d.data() })).filter(r => r.estado !== 'borrador').sort((a, b) => a.numero - b.numero)
      const mapa = new Map()
      for (const r of rutinas) {
        const ejs = await getDocs(collection(db, 'pacientes', pid, 'rutinas', r.id, 'ejercicios'))
        for (const d of ejs.docs) {
          const e = d.data()
          if (!mapa.has(e.ejercicioId)) mapa.set(e.ejercicioId, { id: e.ejercicioId, nombre: e.nombre, entradas: [] })
          mapa.get(e.ejercicioId).entradas.push({ rutina: r.numero, temporada: r.temporada, fecha: r.fechaInicio, estado: r.estado, dia: e.dia, lineas: e.lineas ?? [], pesos: e.pesos ?? {} })
        }
      }
      if (!vivo) return
      setPaciente(p.data()); setEjercicios([...mapa.values()])
    })().catch(e => vivo && setError(e.message))
    return () => { vivo = false }
  }, [pid, modoPaciente])

  const lista = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return (ejercicios ?? [])
      .filter(e => e.entradas.some(x => maximo(x.pesos) != null))
      .filter(e => !q || normalizar(e.nombre).includes(q))
      .sort((a, b) => b.entradas.length - a.entradas.length || a.nombre.localeCompare(b.nombre, 'es'))
  }, [ejercicios, busqueda])

  if (error) return <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>
  if (!ejercicios) return <p className="text-slate-500">Cargando…</p>
  const sel = ejercicios.find(e => e.id === elegido)

  return (
    <div className={modoPaciente ? 'px-5 pt-3' : 'space-y-4'}>
      {modoPaciente ? (
        !sel && (
          <div>
            <h1 className="titulo-grande">Evolución</h1>
            <p className="mt-2 text-[16px] font-light text-slate-500">Cómo han ido subiendo tus pesos en cada ejercicio</p>
          </div>
        )
      ) : (
        <div className="flex items-center gap-3">
          <Volver to={`/pacientes/${pid}`} texto={paciente.nombre.split(' ')[0]} />
          <div>
            <h1 className="titulo-pagina">Evolución de pesos</h1>
            <p className="text-sm text-slate-500">{paciente.nombre}</p>
          </div>
        </div>
      )}

      {sel ? (
        <Detalle ejercicio={sel} onVolver={() => setElegido(null)} modoPaciente={modoPaciente} />
      ) : (
        <>
          <input className={modoPaciente ? 'mt-7 w-full border-b border-tinta/40 bg-transparent py-2 text-[17px] font-light outline-none placeholder:text-slate-400 focus:border-tinta' : 'input'} type="search" placeholder="Buscar ejercicio…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          {lista.length === 0 ? (
            <p className={modoPaciente ? 'mt-8 text-[17px] font-light text-slate-500' : 'tarjeta text-center text-slate-500'}>{modoPaciente ? 'Cuando anotes pesos en tus entrenos, aquí verás cómo evolucionan.' : 'Todavía no hay pesos anotados. Cuando el paciente anote pesos en sus rutinas, aquí verás cómo evolucionan.'}</p>
          ) : modoPaciente ? (
            <ul className="-mx-5 mt-6 border-t border-tinta/70">
              {lista.map(e => {
                const [titulo] = e.nombre.split('\n')
                const valores = e.entradas.map(x => maximo(x.pesos)).filter(v => v != null)
                const ult = valores[valores.length - 1]
                return (
                  <li key={e.id} className="border-b border-tinta/70">
                    <button onClick={() => setElegido(e.id)} className="flex h-24 w-full items-center gap-4 px-5 text-left active:bg-white/60">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[18px] font-light">{titulo}</span>
                        <span className="mt-1 block text-[14px] font-light text-slate-500">Último: <b className="font-medium text-tinta">{ult} kg</b> · {e.entradas.length} rutina{e.entradas.length === 1 ? '' : 's'}</span>
                      </span>
                      <MiniGrafica valores={valores} />
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {lista.map(e => {
                const [titulo] = e.nombre.split('\n')
                const valores = e.entradas.map(x => maximo(x.pesos)).filter(v => v != null)
                return (
                  <li key={e.id}>
                    <button onClick={() => setElegido(e.id)} className="tarjeta flex h-[84px] w-full items-center gap-3 !p-3 text-left hover:border-teal-500">
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 font-medium leading-snug">{titulo}</span>
                        <span className="mt-1 block text-xs text-slate-500">Último: <b className="text-slate-800">{valores[valores.length - 1]} kg</b> · {e.entradas.length} rutina{e.entradas.length === 1 ? '' : 's'}</span>
                      </span>
                      <MiniGrafica valores={valores} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function Detalle({ ejercicio, onVolver, modoPaciente }) {
  const [titulo, ...resto] = ejercicio.nombre.split('\n').filter(Boolean)
  const puntos = ejercicio.entradas.map(x => ({ x, y: maximo(x.pesos) })).filter(p => p.y != null)
  const inicial = puntos[0]?.y, actual = puntos[puntos.length - 1]?.y
  const mejora = inicial != null && actual != null ? actual - inicial : null

  return (
    <div className={modoPaciente ? '' : 'space-y-4'}>
      {modoPaciente
        ? <button onClick={onVolver} className="-ml-1 flex items-center gap-1 p-1 text-[16px] font-light text-tinta active:scale-95"><span className="text-2xl leading-none">‹</span> Evolución</button>
        : <button className="btn-sec btn-xs" onClick={onVolver}>‹ Todos los ejercicios</button>}
      <div className={modoPaciente ? 'mt-4' : ''}>
        <h2 className={modoPaciente ? 'text-[32px] font-light leading-tight tracking-tight' : 'text-lg font-semibold'}>{titulo}</h2>
        {resto.length > 0 && <p className="text-sm text-slate-500">{resto.join(' · ')}</p>}
      </div>

      <div className={modoPaciente ? '-mx-5 mt-6 bg-white px-4 py-5' : 'tarjeta'}>
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <div className={`whitespace-nowrap ${modoPaciente ? 'text-[15px] font-light text-slate-500' : 'text-sm font-medium text-slate-600'}`}>Peso máximo</div>
            <div className={modoPaciente ? 'text-[34px] font-light leading-tight' : 'text-2xl font-semibold'}>{actual ?? '—'} <span className="text-base font-light text-slate-500">kg</span></div>
          </div>
          {mejora != null && puntos.length > 1 && (
            <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${mejora > 0 ? 'bg-emerald-50 text-emerald-700' : mejora < 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
              {mejora > 0 ? '▲' : mejora < 0 ? '▼' : '='} {Math.abs(mejora)} kg desde R{puntos[0].x.rutina}
            </span>
          )}
        </div>
        <Grafica puntos={puntos} />
      </div>

      <div className={modoPaciente ? '-mx-5 mt-6 border-t border-tinta/70' : 'space-y-3'}>
        {[...ejercicio.entradas].reverse().map((x, i) => (
          <div key={i} className={modoPaciente ? 'border-b border-tinta/70 px-5 py-5' : 'tarjeta'}>
            <div className="flex items-baseline justify-between gap-2">
              <span className={modoPaciente ? 'text-[18px] font-light' : 'font-medium'}>Rutina {x.rutina} <span className="text-sm font-light text-slate-500">· día {x.dia}</span></span>
              <span className="text-xs text-slate-400">{fmt(x.fecha)}</span>
            </div>
            <ul className="mt-2 space-y-1">
              {x.lineas.map((l, k) => (
                <li key={k} className={`flex items-center justify-between ${modoPaciente ? 'text-[15px] font-light' : 'text-sm'}`}>
                  <span className="font-mono text-slate-600">{formatLinea(l)}</span>
                  <b className={x.pesos[k] != null ? (modoPaciente ? 'font-medium text-tinta' : 'text-teal-800') : 'font-normal text-slate-400'}>{x.pesos[k] != null ? `${x.pesos[k]} kg` : 'sin peso'}</b>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// Curva suave que pasa por todos los puntos (Catmull-Rom convertida a Bézier)
function curva(p) {
  if (p.length < 2) return ''
  let d = `M${p[0][0]},${p[0][1]}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`
  }
  return d
}

// Gráfica de área: línea suave con relleno degradado; al tocar un punto se ve su detalle
function Grafica({ puntos }) {
  const [activo, setActivo] = useState(puntos.length - 1)
  if (!puntos.length) return <p className="text-sm text-slate-400">Sin datos.</p>
  const W = 640, H = 240, ml = 36, mr = 18, mt = 34, mb = 30
  const ys = puntos.map(p => p.y)
  const min = Math.min(...ys), max = Math.max(...ys)
  const margen = Math.max(2, (max - min) * 0.25)
  const lo = Math.max(0, Math.floor(min - margen)), hi = Math.ceil(max + margen)
  const px = i => ml + (puntos.length === 1 ? (W - ml - mr) / 2 : (i * (W - ml - mr)) / (puntos.length - 1))
  const py = y => mt + (1 - (y - lo) / (hi - lo || 1)) * (H - mt - mb)
  const marcas = [lo, Math.round(lo + (hi - lo) / 3), Math.round(lo + (2 * (hi - lo)) / 3), hi]
  const pts = puntos.map((p, i) => [px(i), py(p.y)])
  const linea = puntos.length > 1 ? curva(pts) : `M${ml},${pts[0][1]} L${W - mr},${pts[0][1]}`
  const area = `${linea} L${puntos.length > 1 ? pts[pts.length - 1][0] : W - mr},${H - mb} L${puntos.length > 1 ? pts[0][0] : ml},${H - mb} Z`
  const a = puntos[Math.min(activo, puntos.length - 1)]
  const ax = px(Math.min(activo, puntos.length - 1)), ay = py(a.y)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-manipulation" role="img" aria-label="Gráfica del peso máximo por rutina">
      <defs>
        <linearGradient id="relleno" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14b8a6" stopOpacity="0.32" />
          <stop offset="1" stopColor="#14b8a6" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {marcas.map(m => (
        <g key={m}>
          <line x1={ml} x2={W - mr} y1={py(m)} y2={py(m)} stroke="#e2e8f0" strokeDasharray="4 5" />
          <text x={ml - 8} y={py(m) + 4} textAnchor="end" fontSize="12" fill="#94a3b8">{m}</text>
        </g>
      ))}
      <path d={area} fill="url(#relleno)" />
      <path d={linea} fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={ax} x2={ax} y1={ay} y2={H - mb} stroke="#0f766e" strokeOpacity="0.35" strokeDasharray="3 4" />
      {puntos.map((p, i) => (
        <g key={i} onClick={() => setActivo(i)} className="cursor-pointer">
          <circle cx={px(i)} cy={py(p.y)} r="18" fill="transparent" />
          <circle cx={px(i)} cy={py(p.y)} r={i === activo ? 7 : 4.5} fill="#fff" stroke="#0f766e" strokeWidth={i === activo ? 3 : 2} />
          <text x={px(i)} y={H - 8} textAnchor="middle" fontSize="12" fill={i === activo ? '#23283a' : '#94a3b8'} fontWeight={i === activo ? 600 : 400}>R{p.x.rutina}</text>
        </g>
      ))}
      {/* Etiqueta del punto elegido */}
      <g transform={`translate(${Math.min(Math.max(ax, ml + 52), W - mr - 52)},${Math.max(ay - 22, 16)})`}>
        <rect x="-52" y="-16" width="104" height="26" rx="13" fill="#23283a" />
        <text x="0" y="2" textAnchor="middle" fontSize="13" fontWeight="600" fill="#fff">{a.y} kg · R{a.x.rutina}</text>
      </g>
    </svg>
  )
}

// Gráfica diminuta para las listas
function MiniGrafica({ valores }) {
  if (valores.length < 2) return <span className="w-20 shrink-0" />
  const W = 80, H = 34, min = Math.min(...valores), max = Math.max(...valores)
  const pts = valores.map((v, i) => [(i * W) / (valores.length - 1), H - 4 - ((v - min) / (max - min || 1)) * (H - 8)])
  const d = curva(pts)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-20 shrink-0" aria-hidden="true">
      <path d={`${d} L${W},${H} L0,${H} Z`} fill="#14b8a6" fillOpacity="0.15" />
      <path d={d} fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
