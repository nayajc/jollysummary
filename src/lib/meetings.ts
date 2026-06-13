import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Meeting, MeetingCreateInput } from '@/types/meeting'

function meetingsCol(uid: string) {
  return collection(db, 'users', uid, 'meetings')
}

export async function createMeeting(uid: string, input: MeetingCreateInput): Promise<string> {
  const ref = await addDoc(meetingsCol(uid), {
    ...input,
    createdAt: Timestamp.now(),
  })
  return ref.id
}

export async function getMeeting(uid: string, meetingId: string): Promise<Meeting | null> {
  const snap = await getDoc(doc(meetingsCol(uid), meetingId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Meeting
}

export async function listMeetings(uid: string): Promise<Meeting[]> {
  const q = query(meetingsCol(uid), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Meeting))
}

export async function updateMeetingSummary(uid: string, meetingId: string, summary: string) {
  await updateDoc(doc(meetingsCol(uid), meetingId), { summary })
}

export async function updateMeetingActionPoints(uid: string, meetingId: string, actionPoints: Meeting['actionPoints']) {
  await updateDoc(doc(meetingsCol(uid), meetingId), { actionPoints })
}
