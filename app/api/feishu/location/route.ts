import { NextResponse } from 'next/server'
import { buildFields, updateRecord } from '@/lib/feishu'

const normalizeLocation = (payload: any) => {
  if (!payload) return null
  const lat = Number(payload.lat)
  const lng = Number(payload.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const accuracy =
    typeof payload.accuracy === 'number' && Number.isFinite(payload.accuracy)
      ? payload.accuracy
      : null
  const timestamp =
    typeof payload.timestamp === 'number' && Number.isFinite(payload.timestamp)
      ? payload.timestamp
      : null

  return { lat, lng, accuracy, timestamp }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const recordId = typeof payload?.recordId === 'string' ? payload.recordId.trim() : ''
    const location = normalizeLocation(payload?.location)

    if (!recordId || !location) {
      return NextResponse.json({ error: 'Missing recordId or location.' }, { status: 400 })
    }

    const fields = buildFields({
      location: JSON.stringify(location),
    })

    if (!Object.keys(fields).length) {
      return NextResponse.json({ error: 'No data provided.' }, { status: 400 })
    }

    const savedId = await updateRecord(recordId, fields)
    return NextResponse.json({ recordId: savedId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit location.'
    console.error('[feishu][location]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
