import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { app, db } from './firebase'

// ¿Puede este navegador recibir avisos push? (en iPhone solo si la app está en la pantalla de inicio)
export async function pushDisponible() {
  try { return 'Notification' in window && 'serviceWorker' in navigator && (await isSupported()) } catch { return false }
}

const sha = async t => {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40)
}

// Registra este dispositivo para recibir avisos: guarda su "token" en usuarios/{uid}/dispositivos
export async function registrarDispositivo(perfil) {
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' })
  const token = await getToken(getMessaging(app), { serviceWorkerRegistration: reg })
  if (!token) throw new Error('No se pudo obtener el permiso del dispositivo.')
  await setDoc(doc(db, 'usuarios', perfil.uid, 'dispositivos', await sha(token)), {
    token, actualizado: serverTimestamp(), agente: navigator.userAgent.slice(0, 120),
  })
}

// Pide permiso al usuario (debe llamarse desde un clic) y registra el dispositivo
export async function activarAvisos(perfil) {
  const permiso = await Notification.requestPermission()
  if (permiso === 'granted') await registrarDispositivo(perfil)
  return permiso
}
