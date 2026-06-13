import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from './firebase'

const provider = new GoogleAuthProvider()

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function signOut() {
  await firebaseSignOut(auth)
}
