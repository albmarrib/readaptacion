import { collection, query, where } from 'firebase/firestore'
import { db } from './firebase'

// Centro (cliente de la app) de la persona que ha iniciado sesión. Cada dato lleva su centroId
// y las reglas impiden ver o tocar los de otro centro. Lo fija AuthProvider al cargar el perfil.
let actual = null
export const fijarCentro = c => { actual = c ?? null }
export const centroActual = () => actual

// Consulta de una colección limitada al centro actual
export const deCentro = (nombre, ...filtros) => query(collection(db, nombre), where('centroId', '==', actual), ...filtros)

// Identificador para documentos nuevos con nombre fijo (grupos, sistemas): con el centro delante,
// para que dos centros puedan tener un grupo "Pecho" sin pisarse
export const idDeCentro = id => `${actual}_${id}`
