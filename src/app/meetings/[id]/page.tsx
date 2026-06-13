'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getMeeting, updateMeetingSummary, updateMeetingActionPoints } from '@/lib/meetings'
import type { Meeting, ActionPoint, Priority } from '@/types/meeting'
import { AuthGuard } from '@/components/AuthGuard'
import { Navbar } from '@/components/Navbar'
import { storage } from '@/lib/firebase'
import { ref, getDownloadURL } from 'firebase/storage'

const PRIORITY_LABELS: Record<Priority, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-gray-900 text-white',
  medium: 'bg-gray-500 text-white',
  low: 'bg-gray-200 text-gray-700',
}

function ActionPointCard({
  ap,
  onUpdate,
  onDelete,
}: {
  ap: ActionPoint
  onUpdate: (updated: ActionPoint) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(ap)

  function handleSave() {
    onUpdate(form)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="border border-gray-300 rounded-xl p-4 bg-gray-50 flex flex-col gap-3">
        <input
          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="담당자"
          value={form.assignee}
          onChange={(e) => setForm({ ...form, assignee: e.target.value })}
        />
        <input
          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="할 일"
          value={form.task}
          onChange={(e) => setForm({ ...form, task: e.target.value })}
        />
        <input
          type="text"
          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="기한 (예: 2024-07-01)"
          value={form.dueDate ?? ''}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value || undefined })}
        />
        <select
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
        >
          <option value="high">높음</option>
          <option value="medium">보통</option>
          <option value="low">낮음</option>
        </select>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="bg-black text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-800"
          >
            저장
          </button>
          <button
            onClick={() => { setForm(ap); setEditing(false) }}
            className="text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-100"
          >
            취소
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium rounded px-2 py-0.5 ${PRIORITY_STYLES[ap.priority]}`}>
            {PRIORITY_LABELS[ap.priority]}
          </span>
          {ap.assignee && (
            <span className="text-xs text-gray-500">{ap.assignee}</span>
          )}
          {ap.dueDate && (
            <span className="text-xs text-gray-400">{ap.dueDate}</span>
          )}
        </div>
        <p className="text-sm text-gray-900">{ap.task}</p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-gray-500 hover:text-black px-2 py-1 rounded hover:bg-gray-100"
        >
          편집
        </button>
        <button
          onClick={() => onDelete(ap.id)}
          className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-gray-100"
        >
          삭제
        </button>
      </div>
    </div>
  )
}

function AddActionPointForm({ onAdd }: { onAdd: (ap: ActionPoint) => void }) {
  const [open, setOpen] = useState(false)
  const empty: Omit<ActionPoint, 'id'> = { assignee: '', task: '', dueDate: undefined, priority: 'medium' }
  const [form, setForm] = useState(empty)

  function handleAdd() {
    if (!form.task.trim()) return
    onAdd({ ...form, id: `ap-${Date.now()}` })
    setForm(empty)
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-black hover:text-gray-600 font-medium"
      >
        + 액션포인트 추가
      </button>
    )
  }

  return (
    <div className="border border-gray-300 rounded-xl p-4 bg-gray-50 flex flex-col gap-3">
      <input
        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-black"
        placeholder="담당자"
        value={form.assignee}
        onChange={(e) => setForm({ ...form, assignee: e.target.value })}
      />
      <input
        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-black"
        placeholder="할 일 *"
        value={form.task}
        onChange={(e) => setForm({ ...form, task: e.target.value })}
      />
      <input
        type="text"
        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-black"
        placeholder="기한 (예: 2024-07-01)"
        value={form.dueDate ?? ''}
        onChange={(e) => setForm({ ...form, dueDate: e.target.value || undefined })}
      />
      <select
        className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
        value={form.priority}
        onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
      >
        <option value="high">높음</option>
        <option value="medium">보통</option>
        <option value="low">낮음</option>
      </select>
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          className="bg-black text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-800"
        >
          추가
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-100"
        >
          취소
        </button>
      </div>
    </div>
  )
}

function MeetingDetail({ meeting: initial, uid }: { meeting: Meeting; uid: string }) {
  const [meeting, setMeeting] = useState(initial)
  const [editingSummary, setEditingSummary] = useState(false)
  const [summaryDraft, setSummaryDraft] = useState(initial.summary)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [savingAP, setSavingAP] = useState(false)

  useEffect(() => {
    if (meeting.audioStoragePath) {
      getDownloadURL(ref(storage, meeting.audioStoragePath))
        .then(setAudioUrl)
        .catch(() => {})
    }
  }, [meeting.audioStoragePath])

  async function saveSummary() {
    await updateMeetingSummary(uid, meeting.id, summaryDraft)
    setMeeting({ ...meeting, summary: summaryDraft })
    setEditingSummary(false)
  }

  async function saveActionPoints(aps: ActionPoint[]) {
    setSavingAP(true)
    await updateMeetingActionPoints(uid, meeting.id, aps)
    setMeeting({ ...meeting, actionPoints: aps })
    setSavingAP(false)
  }

  function handleUpdateAP(updated: ActionPoint) {
    const next = meeting.actionPoints.map((ap) => (ap.id === updated.id ? updated : ap))
    saveActionPoints(next)
  }

  function handleDeleteAP(id: string) {
    const next = meeting.actionPoints.filter((ap) => ap.id !== id)
    saveActionPoints(next)
  }

  function handleAddAP(ap: ActionPoint) {
    saveActionPoints([...meeting.actionPoints, ap])
  }

  const date = meeting.createdAt?.toDate?.()
  const dateStr = date
    ? date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{meeting.title || '제목 없음'}</h1>
        <p className="text-sm text-gray-400 mt-1">{dateStr}</p>
      </div>

      {audioUrl && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">원본 오디오</h2>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">요약</h2>
          {!editingSummary && (
            <button
              onClick={() => { setSummaryDraft(meeting.summary); setEditingSummary(true) }}
              className="text-sm text-gray-500 hover:text-black"
            >
              편집
            </button>
          )}
        </div>
        {editingSummary ? (
          <div className="flex flex-col gap-3">
            <textarea
              value={summaryDraft}
              onChange={(e) => setSummaryDraft(e.target.value)}
              rows={8}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-black resize-y"
            />
            <div className="flex gap-2">
              <button
                onClick={saveSummary}
                className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
              >
                저장
              </button>
              <button
                onClick={() => setEditingSummary(false)}
                className="text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-100"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{meeting.summary}</div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">액션포인트 {savingAP && <span className="text-xs text-gray-400 ml-2">저장 중...</span>}</h2>
        </div>
        <div className="flex flex-col gap-3">
          {meeting.actionPoints.map((ap) => (
            <ActionPointCard
              key={ap.id}
              ap={ap}
              onUpdate={handleUpdateAP}
              onDelete={handleDeleteAP}
            />
          ))}
          <AddActionPointForm onAdd={handleAddAP} />
        </div>
      </div>

      <details className="bg-white rounded-xl border border-gray-200">
        <summary className="px-5 py-4 cursor-pointer font-semibold text-gray-900 select-none">
          원본 스크립트
        </summary>
        <div className="px-5 pb-4 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed border-t border-gray-100 pt-4">
          {meeting.transcript}
        </div>
      </details>
    </div>
  )
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !id) return
    getMeeting(user.uid, id).then((m) => {
      if (!m) router.push('/meetings')
      else setMeeting(m)
      setLoading(false)
    })
  }, [user, id, router])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-4">
            <button
              onClick={() => router.push('/meetings')}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              ← 목록으로
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
            </div>
          ) : meeting && user ? (
            <MeetingDetail meeting={meeting} uid={user.uid} />
          ) : null}
        </main>
      </div>
    </AuthGuard>
  )
}
