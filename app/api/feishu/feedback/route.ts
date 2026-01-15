import { NextResponse } from 'next/server'
import { buildFields, createRecord, resolveClientInfo } from '@/lib/feishu'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const feedback = typeof payload?.feedback === 'string' ? payload.feedback.trim() : ''
    const score =
      typeof payload?.score === 'number' && Number.isFinite(payload.score) ? payload.score : null
    const { ip, address } = await resolveClientInfo(request)
    const fields = buildFields({ feedback, score, ip, address })

    if (!Object.keys(fields).length) {
      return NextResponse.json({ error: 'No data provided.' }, { status: 400 })
    }

    const savedId = await createRecord(fields)
    return NextResponse.json({ recordId: savedId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit feedback.'
    console.error('[feishu][feedback]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
