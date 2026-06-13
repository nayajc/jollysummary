import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { ActionPoint } from '@/types/meeting'
import { verifyIdToken } from '@/lib/firebase-admin'

const SYSTEM_PROMPT = `당신은 미팅 내용을 분석하는 전문가입니다. 주어진 미팅 스크립트를 분석하여 다음 두 가지를 JSON으로 반환하세요:

1. summary: 미팅 내용을 한국어로 요약합니다.
   - 먼저 2-3문장의 줄글로 전체 맥락을 설명하고
   - 그 다음 "## 주요 논의사항" 헤딩 아래에 글머리(bullet) 형식으로 핵심 포인트를 나열하세요

2. actionPoints: 미팅에서 도출된 액션포인트 목록 (배열).
   각 항목은 반드시 다음 필드를 포함해야 합니다:
   - assignee: 담당자 이름 (언급된 경우, 없으면 빈 문자열)
   - task: 해야 할 일 (구체적으로)
   - dueDate: 기한 (언급된 경우, 없으면 null)
   - priority: 중요도 ("high" | "medium" | "low") — 맥락에서 판단

반드시 유효한 JSON만 반환하세요.`

interface ProcessResponse {
  summary: string
  actionPoints: ActionPoint[]
}

export async function POST(req: NextRequest) {
  const uid = await verifyIdToken(req)
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const { transcript } = await req.json() as { transcript: string }

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `다음 미팅 스크립트를 분석해주세요:\n\n${transcript}` },
      ],
      temperature: 0.3,
    })

    const raw = completion.choices[0].message.content ?? '{}'
    const parsed = JSON.parse(raw) as ProcessResponse

    const actionPoints: ActionPoint[] = (parsed.actionPoints ?? []).map((ap, i) => ({
      id: `ap-${Date.now()}-${i}`,
      assignee: ap.assignee ?? '',
      task: ap.task ?? '',
      dueDate: ap.dueDate ?? undefined,
      priority: (['high', 'medium', 'low'].includes(ap.priority) ? ap.priority : 'medium') as ActionPoint['priority'],
    }))

    return NextResponse.json({ summary: parsed.summary ?? '', actionPoints })
  } catch (err) {
    console.error('Processing error:', err)
    return NextResponse.json({ error: 'AI processing failed' }, { status: 500 })
  }
}
