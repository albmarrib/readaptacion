import { initializeApp } from 'firebase/app'
import { browserLocalPersistence, browserPopupRedirectResolver, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
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
