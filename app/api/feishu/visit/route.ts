import { NextResponse } from 'next/server'
import { buildFields, createRecord, resolveClientInfo } from '@/lib/feishu'

export async function POST(request: Request) {
  try {
    const { ip, address } = await resolveClientInfo(request)
    const fields = buildFields({ ip, address })
    const recordId = await createRecord(fields)
    return NextResponse.json({ recordId, ip, address })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to log visit.'
    console.error('[feishu][visit]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
