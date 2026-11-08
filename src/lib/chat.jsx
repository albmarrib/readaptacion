import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './auth'

// Estado compartido del chat: resúmenes de conversaciones (no leídos), panel abierto y globo emergente.
const Ctx = createContext(null)
export const useChat = () => useContext(Ctx)

export function ChatProvider({ children }) {
  const { perfil, esPersonal, esPaciente } = useAuth()
  const [chats, setChats] = useState({})      // pacienteId -> resumen
  const [abierto, setAbierto] = useState(false)
  const [pid, setPid] = useState(null)        // conversación abierta (staff); el paciente tiene una sola
  const [aviso, setAviso] = useState(null)    // globo emergente de mensaje nuevo
  const anterior = useRef(null)
  const [latido, setLatido] = useState(0) // sube cada vez que la app vuelve a primer plano o recupera la red

  useEffect(() => {
    const despertar = () => { if (document.visibilityState === 'visible') setLatido(n => n + 1) }
    document.addEventListener('visibilitychange', despertar)
    window.addEventListener('online', despertar)
    window.addEventListener('pageshow', despertar)
    return () => { document.removeEventListener('visibilitychange', despertar); window.removeEventListener('online', despertar); window.removeEventListener('pageshow', despertar) }
  }, [])

  const noLeidos = c => (esPersonal ? c?.noLeidosEntrenador : c?.noLeidosPaciente) ?? 0

  useEffect(() => {
    if (!perfil) return
    anterior.current = null
    const recibir = mapa => {
      // Globo emergente: solo si sube el contador de una conversación que no estamos mirando
      if (anterior.current) {
        for (const [id, c] of Object.entries(mapa)) {
          const antes = noLeidos(anterior.current[id])
          if (noLeidos(c) > antes) setAviso(a => ((abierto && (pid === id || esPaciente)) ? a : { pid: id, texto: c.ultimoTexto, fecha: Date.now() }))
        }
      }
      anterior.current = mapa
      setChats(mapa)
    }
    const error = e => console.error('chat', e)
    if (esPersonal) {
      return onSnapshot(query(collection(db, 'chats'), where('entrenadorId', '==', perfil.uid)),
        s => recibir(Object.fromEntries(s.docs.map(d => [d.id, d.data()]))), error)
    }
    if (esPaciente && perfil.pacienteId) {
      return onSnapshot(doc(db, 'chats', perfil.pacienteId),
        s => recibir(s.exists() ? { [perfil.pacienteId]: s.data() } : {}), error)
    }
  }, [perfil?.uid, latido]) // eslint-disable-line react-hooks/exhaustive-deps

  // El globo desaparece solo
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 8000)
    return () => clearTimeout(t)
  }, [aviso])

  const valor = useMemo(() => ({
    chats, abierto, pid, aviso, esPersonal, latido,
    totalNoLeidos: Object.values(chats).reduce((s, c) => s + noLeidos(c), 0),
    noLeidosDe: id => noLeidos(chats[id]),
    abrir: id => { setPid(id ?? null); setAbierto(true); setAviso(null) },
    cerrar: () => setAbierto(false),
    elegir: id => setPid(id),
    quitarAviso: () => setAviso(null),
  }), [chats, abierto, pid, aviso, esPersonal, latido]) // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
