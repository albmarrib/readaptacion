import { initializeApp } from 'firebase/app'
import { browserLocalPersistence, browserPopupRedirectResolver, indexedDBLocalPersistence, initializeAuth, connectAuthEmulator } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

// VITE_EMULADOR=1: base de datos de pruebas en este ordenador (firebase emulators:start)
export const emulador = import.meta.env.DEV && import.meta.env.VITE_EMULADOR === '1'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // Con el emulador se usa un proyecto 'demo-': así es imposible tocar los datos reales
  projectId: emulador ? 'demo-readaptacion' : import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigurado = Boolean(config.apiKey && config.appId)
export const app = firebaseConfigurado ? initializeApp(config) : null
// La sesión se guarda en localStorage (más fiable en iPhone) y, si no, en IndexedDB
export const auth = app ? initializeAuth(app, { persistence: [browserLocalPersistence, indexedDBLocalPersistence], popupRedirectResolver: browserPopupRedirectResolver }) : null
export const db = app ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }) : null
export const storage = app ? getStorage(app) : null
export const funciones = app ? getFunctions(app, 'europe-west1') : null

if (app && emulador) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  connectFunctionsEmulator(funciones, '127.0.0.1', 5001)
}
