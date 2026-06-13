import type { STTProvider } from './types'
import { WhisperProvider } from './whisper'
import type { STTProviderName } from '@/types/meeting'

export function getSTTProvider(name: STTProviderName): STTProvider {
  switch (name) {
    case 'whisper':
    default:
      return new WhisperProvider()
  }
}

export type { STTProvider }
