'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { listMeetings } from '@/lib/meetings'
import type { Meeting } from '@/types/meeting'
import { AuthGuard } from '@/components/AuthGuard'
import { Navbar } from '@/components/Navbar'

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const date = meeting.createdAt?.toDate?.()
  const dateStr = date
    ? date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <Link href={`/meetings/${meeting.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{meeting.title || '제목 없음'}</h3>
            <p className="text-sm text-gray-500 mt-1">{dateStr}</p>
          </div>
          <span className="flex-shrink-0 text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-1 font-medium">
            {meeting.actionPoints?.length ?? 0}개 액션
          </span>
        </div>
        {meeting.summary && (
          <p className="text-sm text-gray-600 mt-3 line-clamp-2">{meeting.summary.slice(0, 120)}...</p>
        )}
      </div>
    </Link>
  )
}

function MeetingList() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    listMeetings(user.uid).then((ms) => {
      setMeetings(ms)
      setLoading(false)
    })
  }, [user])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    )
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg mb-4">미팅 기록이 없습니다.</p>
        <Link
          href="/meetings/new"
          className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          + 새 미팅 추가
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {meetings.map((m) => (
        <MeetingCard key={m.id} meeting={m} />
      ))}
    </div>
  )
}

export default function MeetingsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">내 미팅</h1>
            <Link
              href="/meetings/new"
              className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              + 새 미팅
            </Link>
          </div>
          <MeetingList />
        </main>
      </div>
    </AuthGuard>
  )
}
