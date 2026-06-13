import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function app() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

// Guard against SSR module evaluation — client SDK must only run in the browser
const isClient = typeof window !== 'undefined'
export const auth: Auth = isClient ? getAuth(app()) : (null as unknown as Auth)
export const db: Firestore = isClient ? getFirestore(app()) : (null as unknown as Firestore)
export const storage: FirebaseStorage = isClient ? getStorage(app()) : (null as unknown as FirebaseStorage)
