import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { NextRequest } from 'next/server'

function getAdminApp(): App {
  if (getApps().length) return getApps()[0]!
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export async function verifyIdToken(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const idToken = authHeader.slice(7)
  try {
    const app = getAdminApp()
    const decoded = await getAuth(app).verifyIdToken(idToken)
    return decoded.uid
  } catch (err) {
    console.error('verifyIdToken error:', err)
    return null
  }
}
