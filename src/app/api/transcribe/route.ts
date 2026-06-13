import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { verifyIdToken } from '@/lib/firebase-admin'

const ALLOWED_EXTS = new Set(['.mp3', '.mp4', '.wav', '.m4a'])

export async function POST(req: NextRequest) {
  const uid = await verifyIdToken(req)
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const provider = (formData.get('provider') as string) ?? 'whisper'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
    if (!ALLOWED_EXTS.has(ext)) {
      return NextResponse.json({ error: 'Unsupported file type. Use mp3, mp4, wav, or m4a.' }, { status: 400 })
    }

    if (provider !== 'whisper') {
      return NextResponse.json({ error: `Provider "${provider}" not implemented yet` }, { status: 400 })
    }

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'ko',
    })

    return NextResponse.json({ transcript: transcription.text })
  } catch (err) {
    console.error('Transcription error:', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
