import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db, firebaseConfigurado } from './firebase'
import { fijarCentro } from './centro'
import { estadoPago } from './pago'

const Ctx = createContext(null)
export const AuthContext = Ctx
export const useAuth = () => useContext(Ctx)

// estado: cargando | fuera (sin sesión) | sinPerfil (cuenta no dada de alta) | inactivo | suspendido
//         | bloqueadoPago (personal de un centro que no ha pagado a tiempo; los pacientes no) | ok
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [estado, setEstado] = useState(firebaseConfigurado ? 'cargando' : 'fuera')
  const [centroDoc, setCentroDoc] = useState(null)

  useEffect(() => {
    if (!auth) return
    let cancelar = () => {}
    const baja = onAuthStateChanged(auth, u => {
      cancelar()
      setUsuario(u)
      if (!u) { fijarCentro(null); setPerfil(null); setEstado('fuera'); return }
      setEstado('cargando')
      cancelar = onSnapshot(doc(db, 'usuarios', u.uid),
        s => {
          const p = s.exists() ? { uid: u.uid, ...s.data() } : null
          fijarCentro(p?.centroId)
          setPerfil(p)
          setEstado(!p ? 'sinPerfil' : p.activo ? 'ok' : 'inactivo')
        },
        () => { setPerfil(null); setEstado('sinPerfil') })
    })
    return () => { cancelar(); baja() }
  }, [])

  // Datos del centro: si está suspendido nadie entra; si no ha pagado a tiempo, el personal tampoco
  const centroId = perfil?.centroId
  useEffect(() => {
    if (!centroId) { setCentroDoc(null); return }
    return onSnapshot(doc(db, 'centros', centroId), s => setCentroDoc(s.data() ?? null), () => setCentroDoc(null))
  }, [centroId])

  const suspendido = centroDoc?.estado === 'suspendido'
  const pago = estadoPago(centroDoc)
  const personal = perfil?.rol === 'admin' || perfil?.rol === 'entrenador'
  const valor = useMemo(() => ({
    usuario, perfil, pago,
    estado: estado !== 'ok' ? estado : suspendido ? 'suspendido' : personal && pago.fase === 'bloqueado' ? 'bloqueadoPago' : estado,
    esSuper: perfil?.superadmin === true,
    esAdmin: perfil?.rol === 'admin',
    esEntrenador: perfil?.rol === 'entrenador',
    esPaciente: perfil?.rol === 'paciente',
    esPersonal: perfil?.rol === 'admin' || perfil?.rol === 'entrenador',
    puedeEditarCatalogo: perfil?.rol === 'admin' || (perfil?.rol === 'entrenador' && perfil?.puedeEditarCatalogo === true),
    salir: () => signOut(auth),
  }), [usuario, perfil, estado, suspendido, pago.fase, pago.limite, personal])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
