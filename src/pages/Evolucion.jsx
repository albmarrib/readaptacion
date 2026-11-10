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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {!modoPaciente && <Volver to={`/pacientes/${pid}`} texto={paciente.nombre.split(' ')[0]} />}
        <div>
          <h1 className={modoPaciente ? 'text-xl font-bold tracking-tight' : 'titulo-pagina'}>{modoPaciente ? 'Tu evolución' : 'Evolución de pesos'}</h1>
          <p className="text-sm text-slate-500">{modoPaciente ? 'Cómo han ido subiendo tus pesos en cada ejercicio' : paciente.nombre}</p>
        </div>
      </div>

      {sel ? (
        <Detalle ejercicio={sel} onVolver={() => setElegido(null)} />
      ) : (
        <>
          <input className="input" type="search" placeholder="Buscar ejercicio…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          {lista.length === 0 ? (
            <div className="tarjeta text-center text-slate-500">{modoPaciente ? 'Cuando anotes pesos en tus entrenos, aquí verás cómo evolucionan.' : 'Todavía no hay pesos anotados. Cuando el paciente anote pesos en sus rutinas, aquí verás cómo evolucionan.'}</div>
          ) : (
            <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {lista.map(e => {
                const [titulo] = e.nombre.split('\n')
                const ult = [...e.entradas].reverse().find(x => maximo(x.pesos) != null)
                return (
                  <li key={e.id}>
                    <button onClick={() => setElegido(e.id)} className="tarjeta block w-full !p-3 text-left hover:border-teal-500">
                      <div className="font-medium leading-snug">{titulo}</div>
                      <div className="mt-1 text-xs text-slate-500">{e.entradas.length} rutina{e.entradas.length === 1 ? '' : 's'} · último máximo: <b>{maximo(ult.pesos)} kg</b> (rutina {ult.rutina})</div>
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

function Detalle({ ejercicio, onVolver }) {
  const [titulo, ...resto] = ejercicio.nombre.split('\n').filter(Boolean)
  const puntos = ejercicio.entradas.map(x => ({ x, y: maximo(x.pesos) })).filter(p => p.y != null)

  return (
    <div className="space-y-4">
      <button className="btn-sec btn-xs" onClick={onVolver}>‹ Todos los ejercicios</button>
      <div>
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {resto.length > 0 && <p className="text-sm text-slate-500">{resto.join(' · ')}</p>}
      </div>

      <div className="tarjeta">
        <h3 className="mb-2 text-sm font-medium text-slate-600">Peso máximo por rutina (kg)</h3>
        <Grafica puntos={puntos} />
      </div>

      <div className="space-y-3">
        {[...ejercicio.entradas].reverse().map((x, i) => (
          <div key={i} className="tarjeta">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">Rutina {x.rutina} <span className="text-sm font-normal text-slate-500">· día {x.dia} · temporada {x.temporada}</span></span>
              <span className="text-xs text-slate-400">{fmt(x.fecha)}</span>
            </div>
            <ul className="mt-2 space-y-1">
              {x.lineas.map((l, k) => (
                <li key={k} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-slate-600">{formatLinea(l)}</span>
                  <b className={x.pesos[k] != null ? 'text-teal-800' : 'font-normal text-slate-400'}>{x.pesos[k] != null ? `${x.pesos[k]} kg` : 'sin peso'}</b>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// Gráfica de líneas sencilla en SVG
function Grafica({ puntos }) {
  if (!puntos.length) return <p className="text-sm text-slate-400">Sin datos.</p>
  const W = 640, H = 220, ml = 40, mr = 16, mt = 16, mb = 32
  const ys = puntos.map(p => p.y)
  const min = Math.min(...ys), max = Math.max(...ys)
  const lo = Math.max(0, Math.floor(min - (max - min) * 0.2 - 1)), hi = Math.ceil(max + (max - min) * 0.2 + 1)
  const px = i => ml + (puntos.length === 1 ? (W - ml - mr) / 2 : (i * (W - ml - mr)) / (puntos.length - 1))
  const py = y => mt + (1 - (y - lo) / (hi - lo || 1)) * (H - mt - mb)
  const marcas = [lo, Math.round((lo + hi) / 2), hi]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gráfica del peso máximo por rutina">
      {marcas.map(m => (
        <g key={m}>
          <line x1={ml} x2={W - mr} y1={py(m)} y2={py(m)} stroke="#e2e8f0" />
          <text x={ml - 6} y={py(m) + 4} textAnchor="end" fontSize="11" fill="#64748b">{m}</text>
        </g>
      ))}
      {puntos.length > 1 && <polyline fill="none" stroke="#0f766e" strokeWidth="2.5" points={puntos.map((p, i) => `${px(i)},${py(p.y)}`).join(' ')} />}
      {puntos.map((p, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(p.y)} r="5" fill="#0f766e" />
          <text x={px(i)} y={py(p.y) - 10} textAnchor="middle" fontSize="12" fontWeight="600" fill="#0f172a">{p.y}</text>
          <text x={px(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#64748b">R{p.x.rutina}</text>
        </g>
      ))}
    </svg>
  )
}
