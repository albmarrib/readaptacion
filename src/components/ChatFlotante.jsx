import { useEffect, useMemo, useRef, useState } from 'react'
import { addDoc, collection, doc, limitToLast, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { useChat } from '../lib/chat'
import { normalizar } from '../lib/util'
import { Avatar, IconoChat, IconoChevronIzq, IconoEnviar, IconoCerrar } from './Iconos'

const hora = f => f?.toDate?.().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
const dia = f => f?.toDate?.().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const mismoDia = (a, b) => a && b && a.toDateString() === b.toDateString()

// Globo flotante de chat + panel de conversaciones + aviso emergente de mensaje nuevo
export default function ChatFlotante({ sinBoton = false }) {
  const { esPersonal, esPaciente } = useAuth()
  const chat = useChat()
  if (!chat || (!esPersonal && !esPaciente)) return null
  const { abierto, totalNoLeidos, aviso } = chat

  return (
    <>
      {aviso && !abierto && (
        <button onClick={() => chat.abrir(esPersonal ? aviso.pid : undefined)} className="fixed bottom-[8.25rem] right-4 z-40 flex max-w-[18rem] animate-[subir_.25s_ease-out] items-start gap-2.5 rounded-2xl rounded-br-sm border border-teal-200 bg-white p-3 text-left shadow-xl shadow-teal-900/10 md:bottom-[7.5rem] md:right-6">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white"><IconoChat width={15} height={15} /></span>
          <span className="min-w-0"><span className="block text-xs font-semibold text-teal-800">Mensaje nuevo</span><span className="line-clamp-2 text-xs text-slate-600">{aviso.texto}</span></span>
        </button>
      )}

      {!abierto && !sinBoton && (
        <button onClick={() => chat.abrir(esPersonal ? chat.pid ?? undefined : undefined)} aria-label="Abrir mensajes" title="Mensajes"
          className="fixed bottom-[4.75rem] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-900/30 ring-4 ring-white/60 transition hover:scale-105 md:bottom-16 md:right-6">
          <IconoChat width={22} height={22} />
          {totalNoLeidos > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white ring-2 ring-white">{totalNoLeidos}</span>}
        </button>
      )}

      {abierto && <Panel />}
    </>
  )
}

function Panel() {
  const { perfil, esPersonal } = useAuth()
  const chat = useChat()
  const [pacientes, setPacientes] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  // El personal ve a sus pacientes con acceso; el paciente, solo su conversación
  useEffect(() => {
    if (!esPersonal) return
    const base = collection(db, 'pacientes')
    const q = perfil.rol === 'admin' ? query(base, where('centroId', '==', perfil.centroId)) : query(base, where('entrenadorId', '==', perfil.uid))
    return onSnapshot(q, s => setPacientes(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.estado === 'activo' && p.uid)), () => setPacientes([]))
  }, [esPersonal, perfil.rol, perfil.uid])

  const pidActual = esPersonal ? chat.pid : perfil.pacienteId
  const actual = esPersonal ? pacientes?.find(p => p.id === pidActual) : { id: pidActual, nombre: 'Tu entrenador' }

  const lista = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return (pacientes ?? [])
      .filter(p => !q || normalizar(p.nombre).includes(q))
      .sort((a, b) => (chat.chats[b.id]?.ultimaFecha?.seconds ?? 0) - (chat.chats[a.id]?.ultimaFecha?.seconds ?? 0) || a.nombre.localeCompare(b.nombre, 'es'))
  }, [pacientes, busqueda, chat.chats])

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex h-dvh flex-col overflow-hidden bg-white md:inset-auto md:h-[34rem] md:bottom-6 md:right-6 md:w-[24rem] md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl md:shadow-slate-900/20">
      {pidActual && actual ? (
        <Conversacion pid={pidActual} nombre={actual.nombre} foto={actual.foto} onVolver={esPersonal ? () => chat.elegir(null) : null} />
      ) : (
        <>
          <Cabecera titulo="Mensajes" />
          <div className="border-b border-slate-100 p-2.5"><input className="input" type="search" placeholder="Buscar paciente…" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {pacientes === null ? <p className="p-4 text-sm text-slate-500">Cargando…</p>
              : lista.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Aún no hay pacientes con acceso a la app. Cuando un paciente tenga acceso, podrás escribirle aquí.</p>
                : lista.map(p => {
                  const c = chat.chats[p.id], n = chat.noLeidosDe(p.id)
                  return (
                    <button key={p.id} onClick={() => chat.elegir(p.id)} className="flex w-full items-center gap-3 border-b border-slate-100 px-3.5 py-2.5 text-left transition hover:bg-teal-50/50">
                      <Avatar nombre={p.nombre} foto={p.foto} tamano={38} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2"><span className={`truncate text-[13px] ${n ? 'font-bold' : 'font-medium'}`}>{p.nombre}</span><span className="shrink-0 text-[10px] text-slate-400">{hora(c?.ultimaFecha)}</span></span>
                        <span className={`block truncate text-xs ${n ? 'font-medium text-slate-800' : 'text-slate-500'}`}>{c ? `${c.ultimoAutor === 'personal' ? 'Tú: ' : ''}${c.ultimoTexto}` : 'Sin mensajes todavía'}</span>
                      </span>
                      {n > 0 && <span className="min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">{n}</span>}
                    </button>
                  )
                })}
          </div>
        </>
      )}
    </div>
  )
}

function Cabecera({ titulo, subtitulo, avatar, onVolver }) {
  const { cerrar } = useChat()
  return (
    <div className="flex items-center gap-2 bg-gradient-to-r from-teal-700 to-teal-600 px-3 py-2.5 text-white">
      {onVolver && <button onClick={onVolver} aria-label="Volver a la lista" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15"><IconoChevronIzq width={18} height={18} /></button>}
      {avatar}
      <div className="min-w-0 flex-1 leading-tight"><div className="truncate text-sm font-semibold">{titulo}</div>{subtitulo && <div className="truncate text-[11px] text-teal-100">{subtitulo}</div>}</div>
      <button onClick={cerrar} aria-label="Cerrar mensajes" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15"><IconoCerrar width={18} height={18} /></button>
    </div>
  )
}

function Conversacion({ pid, nombre, foto, onVolver }) {
  const { perfil, esPersonal } = useAuth()
  const chat = useChat()
  const [mensajes, setMensajes] = useState(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const fin = useRef(null)
  const sinLeer = chat.noLeidosDe(pid)

  useEffect(() => {
    return onSnapshot(query(collection(db, 'pacientes', pid, 'mensajes'), orderBy('fecha', 'asc'), limitToLast(200)),
      s => setMensajes(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => { setError('No se pudieron cargar los mensajes: ' + e.message); setMensajes([]) })
  }, [pid, chat.latido]) // se reinicia al volver a primer plano

  // Abrir la conversación (o recibir un mensaje con ella abierta) la marca como leída
  useEffect(() => {
    if (!sinLeer) return
    updateDoc(doc(db, 'chats', pid), esPersonal ? { noLeidosEntrenador: 0 } : { noLeidosPaciente: 0 }).catch(() => {})
  }, [sinLeer, pid, esPersonal, mensajes?.length])

  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }) }, [mensajes?.length])

  const enviar = async e => {
    e?.preventDefault()
    const t = texto.trim()
    if (!t || enviando) return
    setEnviando(true); setError('')
    try {
      await addDoc(collection(db, 'pacientes', pid, 'mensajes'), { autorId: perfil.uid, autorRol: esPersonal ? 'personal' : 'paciente', texto: t, fecha: serverTimestamp() })
      setTexto('')
    } catch (err) { setError('No se pudo enviar: ' + err.message) }
    finally { setEnviando(false) }
  }

  return (
    <>
      <Cabecera titulo={nombre} subtitulo={esPersonal ? 'Paciente' : 'Mensajes'} avatar={<Avatar nombre={nombre} foto={foto} tamano={32} />} onVolver={onVolver} />
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto bg-[#eef3f5] px-3 py-3">
        {mensajes === null && <p className="text-center text-xs text-slate-400">Cargando…</p>}
        {mensajes?.length === 0 && <p className="mx-auto mt-6 max-w-[16rem] text-center text-xs text-slate-500">{esPersonal ? `Escribe el primer mensaje a ${nombre.split(' ')[0]}.` : 'Escribe a tu entrenador si tienes cualquier duda sobre tu rutina.'}</p>}
        {mensajes?.map((m, i) => {
          const mio = m.autorId === perfil.uid
          const f = m.fecha?.toDate?.()
          const nuevoDia = f && !mismoDia(f, mensajes[i - 1]?.fecha?.toDate?.())
          return (
            <div key={m.id}>
              {nuevoDia && <div className="my-2 text-center text-[10px] font-medium uppercase tracking-wide text-slate-400">{dia(m.fecha)}</div>}
              <div className={`flex ${mio ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-[13px] leading-snug shadow-sm ${mio ? 'rounded-br-sm bg-teal-600 text-white' : 'rounded-bl-sm bg-white text-slate-800'}`}>
                  {m.texto}
                  <span className={`ml-2 inline-block translate-y-0.5 text-[10px] ${mio ? 'text-teal-100' : 'text-slate-400'}`}>{hora(m.fecha) ?? '…'}</span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={fin} />
      </div>
      {error && <p role="alert" className="bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</p>}
      <form onSubmit={enviar} className="flex items-end gap-2 border-t border-slate-200 bg-white p-2.5">
        <textarea rows={1} maxLength={1000} className="input max-h-28 resize-none" placeholder="Escribe un mensaje…" value={texto} onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }} />
        <button className="btn !h-9 !w-9 shrink-0 !px-0" disabled={!texto.trim() || enviando} aria-label="Enviar"><IconoEnviar width={17} height={17} /></button>
      </form>
    </>
  )
}
