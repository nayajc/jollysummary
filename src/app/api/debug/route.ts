import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, string> = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'set' : 'MISSING',
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'set' : 'MISSING',
    FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID ? 'set' : 'MISSING',
    FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL ? 'set' : 'MISSING',
    FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY ? `set (${process.env.FIREBASE_ADMIN_PRIVATE_KEY.length} chars)` : 'MISSING',
  }

  let openaiStatus = 'not tested'
  try {
    const OpenAI = (await import('openai')).default
    new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    openaiStatus = 'OK'
  } catch (e) {
    openaiStatus = `ERROR: ${String(e)}`
  }

  let authVerifyStatus = 'not tested'
  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    if (!apiKey) throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY missing')
    // Just check the endpoint is reachable with an empty token (expect error response)
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: 'test' }) }
    )
    const body = await res.json()
    authVerifyStatus = res.ok ? 'OK' : `reachable (expected error: ${JSON.stringify(body?.error?.message)})`
  } catch (e) {
    authVerifyStatus = `ERROR: ${String(e)}`
  }

  return NextResponse.json({ checks, openaiStatus, authVerifyStatus })
}
