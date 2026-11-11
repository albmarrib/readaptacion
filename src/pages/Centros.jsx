import { useCallback, useEffect, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { funciones } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { EncabezadoPagina, IconoCentros, LogoCentro } from '../components/Iconos'

// Panel del superadministrador (dueño de la app): todos los centros con sus recuentos.
// Nunca muestra datos de pacientes, solo cuántos hay.
const resumen = () => httpsCallable(funciones, 'resumenCentros')()
const cambiarEstado = datos => httpsCallable(funciones, 'cambiarEstadoCentro')(datos)
const fecha = ms => (ms ? new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

export default function Centros() {
  const { perfil } = useAuth()
  const [centros, setCentros] = useState(null)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(null)

  const cargar = useCallback(() => resumen()
    .then(r => setCentros(r.data.sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'))))
    .catch(e => setError('No se pudo cargar la lista: ' + e.message)), [])
  useEffect(() => { cargar() }, [cargar])

  const alternar = async c => {
    const nuevo = c.estado === 'suspendido' ? 'activo' : 'suspendido'
    const aviso = nuevo === 'suspendido'
      ? `¿Suspender «${c.nombre}»?\n\nNadie de ese centro (entrenadores ni pacientes) podrá entrar hasta que lo reactives. No se borra ningún dato.`
      : `¿Reactivar «${c.nombre}»?`
    if (!window.confirm(aviso)) return
    setOcupado(c.id); setError('')
    try { await cambiarEstado({ centroId: c.id, estado: nuevo }); await cargar() }
    catch (e) { setError(e.message) }
    finally { setOcupado(null) }
  }

  const total = k => centros?.reduce((s, c) => s + (c[k] ?? 0), 0) ?? 0

  return (
    <div className="space-y-4">
      <EncabezadoPagina icono={IconoCentros} color="sky" titulo="Centros" subtitulo={centros ? `${centros.length} centro${centros.length === 1 ? '' : 's'} · ${total('pacientesActivos')} pacientes activos` : 'Panel del superadministrador'} />
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {centros === null ? <p className="text-slate-500">Cargando…</p> : (
        <ul className="space-y-2">
          {centros.map(c => {
            const suspendido = c.estado === 'suspendido'
            const mio = c.id === perfil.centroId
            return (
              <li key={c.id} className={`tarjeta flex flex-wrap items-center gap-x-5 gap-y-3 !p-3 ${suspendido ? 'opacity-70' : ''}`}>
                <LogoCentro centro={c} tamano={40} />
                <div className="min-w-[10rem] flex-1">
                  <div className="font-medium">
                    {c.nombre}
                    {mio && <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-800">Tu centro</span>}
                  </div>
                  <div className="text-xs text-slate-500">
                    Alta: {fecha(c.creado)}
                    {c.plan === 'prueba' && <span className={c.pruebaHasta < Date.now() ? 'text-rose-600' : ''}> · Prueba {c.pruebaHasta < Date.now() ? 'terminada el' : 'hasta el'} {fecha(c.pruebaHasta)}</span>}
                  </div>
                </div>
                <dl className="flex gap-5 text-center text-sm">
                  <div><dt className="text-xs text-slate-500">Entrenadores</dt><dd className="font-semibold">{c.entrenadores}</dd></div>
                  <div><dt className="text-xs text-slate-500">Pacientes</dt><dd className="font-semibold">{c.pacientesActivos} <span className="font-normal text-slate-400">/ {c.pacientes}</span></dd></div>
                  <div><dt className="text-xs text-slate-500">Ejercicios</dt><dd className="font-semibold">{c.ejercicios}</dd></div>
                </dl>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${suspendido ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{suspendido ? 'Suspendido' : 'Activo'}</span>
                {!mio && (
                  <button className={suspendido ? 'btn btn-xs' : 'btn-sec btn-xs'} disabled={ocupado === c.id} onClick={() => alternar(c)}>
                    {ocupado === c.id ? '…' : suspendido ? 'Reactivar' : 'Suspender'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-xs text-slate-500">Pacientes: activos / total. Aquí solo ves recuentos: los datos de los pacientes son de cada centro.</p>
    </div>
  )
}
