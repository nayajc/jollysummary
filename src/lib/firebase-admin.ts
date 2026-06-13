import { NextRequest } from 'next/server'

// Verify Firebase ID token using the Firebase Auth REST API
// (avoids firebase-admin SDK ESM/CJS incompatibility on Vercel)
export async function verifyIdToken(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const idToken = authHeader.slice(7)
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    )
    if (!res.ok) return null
    const data = await res.json() as { users?: { localId: string }[] }
    return data.users?.[0]?.localId ?? null
  } catch (err) {
    console.error('verifyIdToken error:', err)
    return null
  }
}
