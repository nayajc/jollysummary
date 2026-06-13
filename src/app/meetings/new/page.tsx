'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createMeeting } from '@/lib/meetings'
import { storage } from '@/lib/firebase'
import { ref, uploadBytes } from 'firebase/storage'
import type { STTProviderName } from '@/types/meeting'
import { AuthGuard } from '@/components/AuthGuard'
import { Navbar } from '@/components/Navbar'

const STT_PROVIDERS: { value: STTProviderName; label: string }[] = [
  { value: 'whisper', label: 'OpenAI Whisper (기본)' },
]

type InputMode = 'text' | 'audio' | 'record'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function NewMeetingPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [mode, setMode] = useState<InputMode>('text')
  const [title, setTitle] = useState('')
  const [textInput, setTextInput] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [sttProvider, setSttProvider] = useState<STTProviderName>('whisper')
  const [status, setStatus] = useState<'idle' | 'transcribing' | 'processing' | 'saving' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Recording state
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'stopped'>('idle')
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    }
  }, [recordedUrl])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setRecordedBlob(blob)
        setRecordedUrl(url)
        setRecordingState('stopped')
        stream.getTracks().forEach((t) => t.stop())
      }

      mr.start()
      setRecordingState('recording')
      setDuration(0)
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    } catch {
      setErrorMsg('마이크 접근 권한이 필요합니다.')
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    mediaRecorderRef.current?.stop()
  }

  function resetRecording() {
    setRecordedBlob(null)
    if (recordedUrl) { URL.revokeObjectURL(recordedUrl); setRecordedUrl(null) }
    setRecordingState('idle')
    setDuration(0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setErrorMsg('')

    try {
      let transcript = textInput.trim()
      let audioStoragePath: string | undefined

      const idToken = await user.getIdToken()
      const authHeader = { Authorization: `Bearer ${idToken}` }

      if (mode === 'audio' || mode === 'record') {
        const fileToUpload = mode === 'audio' ? audioFile : (recordedBlob ? new File([recordedBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' }) : null)

        if (!fileToUpload) {
          setErrorMsg(mode === 'audio' ? '오디오 파일을 선택해주세요.' : '먼저 녹음을 완료해주세요.')
          return
        }

        setStatus('transcribing')
        const meetingId = `${Date.now()}`
        const ext = fileToUpload.name.split('.').pop()
        const storagePath = `users/${user.uid}/audio/${meetingId}.${ext}`
        const storageRef = ref(storage, storagePath)
        await uploadBytes(storageRef, fileToUpload)
        audioStoragePath = storagePath

        const formData = new FormData()
        formData.append('file', fileToUpload)
        formData.append('provider', sttProvider)

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: authHeader,
          body: formData,
        })
        const resText = await res.text()
        if (!res.ok) {
          let errMsg = 'Transcription failed'
          try { errMsg = JSON.parse(resText).error ?? errMsg } catch {}
          throw new Error(errMsg)
        }
        const data = JSON.parse(resText)
        transcript = data.transcript
      }

      if (!transcript) {
        setErrorMsg('미팅 내용을 입력하거나 오디오를 업로드/녹음해주세요.')
        setStatus('idle')
        return
      }

      setStatus('processing')
      const processRes = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ transcript }),
      })
      const processText = await processRes.text()
      if (!processRes.ok) {
        let errMsg = 'Processing failed'
        try { errMsg = JSON.parse(processText).error ?? errMsg } catch {}
        throw new Error(errMsg)
      }
      const { summary, actionPoints } = JSON.parse(processText)

      setStatus('saving')
      const finalTitle = title.trim() || `미팅 ${new Date().toLocaleDateString('ko-KR')}`
      const id = await createMeeting(user.uid, {
        title: finalTitle,
        transcript,
        summary,
        actionPoints,
        audioStoragePath,
        sttProvider: mode !== 'text' ? sttProvider : undefined,
      })

      router.push(`/meetings/${id}`)
    } catch (err) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : '오류가 발생했습니다.')
      setStatus('error')
    }
  }

  const isLoading = ['transcribing', 'processing', 'saving'].includes(status)

  const statusLabel: Record<string, string> = {
    transcribing: '음성을 텍스트로 변환 중...',
    processing: 'AI가 요약하고 액션포인트를 추출 중...',
    saving: '저장 중...',
  }

  const tabs: { value: InputMode; label: string }[] = [
    { value: 'text', label: '텍스트 입력' },
    { value: 'audio', label: '파일 업로드' },
    { value: 'record', label: '녹음' },
  ]

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">새 미팅 추가</h1>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">미팅 제목 (선택)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 2024년 6월 마케팅 팀 미팅"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div>
              {/* Tab buttons */}
              <div className="flex gap-2 mb-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => { setMode(tab.value); setErrorMsg('') }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      mode === tab.value
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {mode === 'text' && (
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="미팅 내용을 여기에 붙여넣으세요..."
                  rows={12}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black resize-y"
                />
              )}

              {mode === 'audio' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">STT 서비스</label>
                    <select
                      value={sttProvider}
                      onChange={(e) => setSttProvider(e.target.value as STTProviderName)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      {STT_PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">오디오 파일</label>
                    <input
                      type="file"
                      accept=".mp3,.mp4,.wav,.m4a"
                      onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                    />
                    <p className="text-xs text-gray-400 mt-1">mp3, mp4, wav, m4a 형식 지원</p>
                  </div>
                </div>
              )}

              {mode === 'record' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">STT 서비스</label>
                    <select
                      value={sttProvider}
                      onChange={(e) => setSttProvider(e.target.value as STTProviderName)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      {STT_PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col items-center gap-4 py-6 border border-gray-200 rounded-xl bg-gray-50">
                    {recordingState === 'idle' && (
                      <>
                        <button
                          type="button"
                          onClick={startRecording}
                          className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                          title="녹음 시작"
                        >
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                          </svg>
                        </button>
                        <p className="text-sm text-gray-500">버튼을 눌러 녹음 시작</p>
                      </>
                    )}

                    {recordingState === 'recording' && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-lg font-mono font-bold text-gray-900">{formatDuration(duration)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
                          title="녹음 중지"
                        >
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 6h12v12H6z"/>
                          </svg>
                        </button>
                        <p className="text-sm text-gray-500">버튼을 눌러 녹음 중지</p>
                      </>
                    )}

                    {recordingState === 'stopped' && recordedUrl && (
                      <>
                        <p className="text-sm font-medium text-gray-700">녹음 완료 ({formatDuration(duration)})</p>
                        <audio controls src={recordedUrl} className="w-full max-w-xs" />
                        <button
                          type="button"
                          onClick={resetRecording}
                          className="text-sm text-gray-500 hover:text-black underline"
                        >
                          다시 녹음
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
            )}

            {isLoading && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black" />
                {statusLabel[status]}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '처리 중...' : '요약 생성하기'}
            </button>
          </form>
        </main>
      </div>
    </AuthGuard>
  )
}
