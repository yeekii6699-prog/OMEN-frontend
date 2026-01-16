import { NextResponse } from 'next/server'
import { buildFields, resolveClientInfo, updateRecord } from '@/lib/feishu'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const feedback = typeof payload?.feedback === 'string' ? payload.feedback.trim() : ''
    const score =
      typeof payload?.score === 'number' && Number.isFinite(payload.score) ? payload.score : null
    const recordId = typeof payload?.recordId === 'string' ? payload.recordId.trim() : ''
    if (!recordId) {
      return NextResponse.json({ error: 'Missing recordId.' }, { status: 400 })
    }

    const { ip, address } = await resolveClientInfo(request)
    const fields = buildFields({ feedback, score, ip, address })

    if (!Object.keys(fields).length) {
      return NextResponse.json({ error: 'No data provided.' }, { status: 400 })
    }

    const savedId = await updateRecord(recordId, fields)
    return NextResponse.json({ recordId: savedId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit feedback.'
    console.error('[feishu][feedback]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
