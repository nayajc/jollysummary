'use client'

import { signInWithGoogle } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/meetings')
    }
  }, [user, loading, router])

  async function handleSignIn() {
    try {
      await signInWithGoogle()
      router.push('/meetings')
    } catch (err) {
      console.error('Sign-in failed', err)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Jolly Summary</h1>
          <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">Meeting Intelligence</p>
        </div>
        <div className="text-center flex flex-col gap-1.5">
          <p className="text-gray-600 text-sm">미팅 내용을 붙여넣거나 음성을 녹음하면</p>
          <p className="text-gray-600 text-sm">AI가 자동으로 요약하고 액션포인트를 정리해드립니다.</p>
        </div>
        <button
          onClick={handleSignIn}
          className="flex items-center gap-3 bg-white border border-gray-300 rounded-lg px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full justify-center shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
            <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
            <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
            <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
          </svg>
          Google로 로그인
        </button>
      </div>
    </main>
  )
}
