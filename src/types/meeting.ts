import { Timestamp } from 'firebase/firestore'

export type Priority = 'high' | 'medium' | 'low'

export type STTProviderName = 'whisper'

export interface ActionPoint {
  id: string
  assignee: string
  task: string
  dueDate?: string
  priority: Priority
}

export interface Meeting {
  id: string
  title: string
  createdAt: Timestamp
  transcript: string
  summary: string
  actionPoints: ActionPoint[]
  audioStoragePath?: string
  sttProvider?: STTProviderName
}

export interface MeetingCreateInput {
  title: string
  transcript: string
  summary: string
  actionPoints: ActionPoint[]
  audioStoragePath?: string
  sttProvider?: STTProviderName
}
