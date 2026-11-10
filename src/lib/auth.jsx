import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db, firebaseConfigurado } from './firebase'
import { fijarCentro } from './centro'

const Ctx = createContext(null)
export const AuthContext = Ctx
export const useAuth = () => useContext(Ctx)

// estado: cargando | fuera (sin sesión) | sinPerfil (cuenta no dada de alta) | inactivo | ok
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [estado, setEstado] = useState(firebaseConfigurado ? 'cargando' : 'fuera')

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

  const valor = useMemo(() => ({
    usuario, perfil, estado,
    esAdmin: perfil?.rol === 'admin',
    esEntrenador: perfil?.rol === 'entrenador',
    esPaciente: perfil?.rol === 'paciente',
    esPersonal: perfil?.rol === 'admin' || perfil?.rol === 'entrenador',
    puedeEditarCatalogo: perfil?.rol === 'admin' || (perfil?.rol === 'entrenador' && perfil?.puedeEditarCatalogo === true),
    salir: () => signOut(auth),
  }), [usuario, perfil, estado])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
