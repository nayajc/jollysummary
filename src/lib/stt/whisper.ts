import type { STTProvider } from './types'

export class WhisperProvider implements STTProvider {
  async transcribe(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('provider', 'whisper')

    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Transcription failed' }))
      throw new Error(error.error ?? 'Transcription failed')
    }

    const data = await res.json()
    return data.transcript as string
  }
}
