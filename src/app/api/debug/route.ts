import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, string> = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'set' : 'MISSING',
    FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID ? 'set' : 'MISSING',
    FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL ? 'set' : 'MISSING',
    FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY ? `set (${process.env.FIREBASE_ADMIN_PRIVATE_KEY.length} chars)` : 'MISSING',
  }

  let adminStatus = 'not tested'
  try {
    const { getApps, getApp, initializeApp, cert } = await import('firebase-admin/app')
    const { getAuth } = await import('firebase-admin/auth')
    const pk = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
    const app = getApps().length
      ? getApp()
      : initializeApp({ credential: cert({ projectId: process.env.FIREBASE_ADMIN_PROJECT_ID, clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL, privateKey: pk }) })
    getAuth(app)
    adminStatus = 'OK'
  } catch (e) {
    adminStatus = `ERROR: ${String(e)}`
  }

  let openaiStatus = 'not tested'
  try {
    const OpenAI = (await import('openai')).default
    new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    openaiStatus = 'OK'
  } catch (e) {
    openaiStatus = `ERROR: ${String(e)}`
  }

  return NextResponse.json({ checks, adminStatus, openaiStatus })
}
