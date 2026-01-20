const FEISHU_API = 'https://open.feishu.cn/open-apis'

const APP_ID = process.env.FEISHU_APP_ID
const APP_SECRET = process.env.FEISHU_APP_SECRET
const TABLE_URL = process.env.FEISHU_TABLE_URL
const APP_TOKEN_FALLBACK = process.env.FEISHU_APP_TOKEN || ''
const TABLE_ID_FALLBACK = process.env.FEISHU_TABLE_ID || ''

type TableParseResult = {
  appToken: string
  tableId: string
  wikiToken: string
  source: 'wiki' | 'base' | 'api' | 'unknown'
}

const extractTableId = (url: URL) => {
  const params = url.searchParams
  return params.get('table') || params.get('table_id') || params.get('tableId') || ''
}

const parseTableUrl = (value?: string): TableParseResult => {
  if (!value) {
    return { appToken: '', tableId: '', wikiToken: '', source: 'unknown' }
  }

  try {
    const url = new URL(value)
    const parts = url.pathname.split('/').filter(Boolean)
    const tableId = extractTableId(url)

    if (parts.includes('wiki')) {
      const wikiIndex = parts.indexOf('wiki')
      const wikiToken = parts[wikiIndex + 1] || ''
      return { appToken: '', tableId, wikiToken, source: 'wiki' }
    }

    if (parts.includes('base')) {
      const baseIndex = parts.indexOf('base')
      const appToken = parts[baseIndex + 1] || ''
      return { appToken, tableId, wikiToken: '', source: 'base' }
    }

    if (parts.includes('apps') && parts.includes('tables')) {
      const appToken = parts[parts.indexOf('apps') + 1] || ''
      const tableFromPath = parts[parts.indexOf('tables') + 1] || ''
      return {
        appToken,
        tableId: tableFromPath || tableId,
        wikiToken: '',
        source: 'api',
      }
    }

    return { appToken: '', tableId, wikiToken: '', source: 'unknown' }
  } catch (error) {
    return { appToken: '', tableId: '', wikiToken: '', source: 'unknown' }
  }
}

const tableConfigCache: { appToken: string; tableId: string } = { appToken: '', tableId: '' }
const wikiTokenCache = new Map<string, string>()

const FIELD_FEEDBACK = '反馈'
const FIELD_SCORE = '评分'
const FIELD_QUICK_OPTION = '快速评价'
const FIELD_IP = 'IP'
const FIELD_ADDRESS = 'IP地址'
const FIELD_LOCATION = '定位'
const FIELD_QUESTION = '问题'
const FIELD_READING = '解读'
const FIELD_DEEP = '深入'
const FIELD_CHAT_HISTORY = '对话记录'

const getTenantToken = async () => {
  if (!APP_ID || !APP_SECRET) {
    throw new Error('Missing Feishu app credentials.')
  }

  const res = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: APP_ID,
      app_secret: APP_SECRET,
    }),
    cache: 'no-store',
  })

  const data = await res.json()
  if (!res.ok || data?.code !== 0 || !data?.tenant_access_token) {
    throw new Error(data?.msg || 'Failed to obtain tenant access token.')
  }

  return data.tenant_access_token
}

const resolveWikiToken = async (wikiToken: string) => {
  if (!wikiToken) {
    throw new Error('Missing wiki token.')
  }

  if (wikiTokenCache.has(wikiToken)) {
    return wikiTokenCache.get(wikiToken) as string
  }

  const token = await getTenantToken()
  const url = new URL(`${FEISHU_API}/wiki/v2/spaces/get_node`)
  url.searchParams.set('obj_type', 'wiki')
  url.searchParams.set('token', wikiToken)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  const data = await res.json()
  const objToken = data?.data?.node?.obj_token
  if (!res.ok || data?.code !== 0 || !objToken) {
    throw new Error(data?.msg || 'Failed to resolve wiki token.')
  }

  wikiTokenCache.set(wikiToken, objToken)
  return objToken
}

const getTableConfig = async () => {
  if (tableConfigCache.appToken && tableConfigCache.tableId) {
    return tableConfigCache
  }

  let appToken = APP_TOKEN_FALLBACK
  let tableId = TABLE_ID_FALLBACK

  if (TABLE_URL) {
    const parsed = parseTableUrl(TABLE_URL)
    if (parsed.source === 'wiki') {
      if (!parsed.tableId) {
        throw new Error('Missing table id in wiki url.')
      }
      appToken = await resolveWikiToken(parsed.wikiToken)
      tableId = parsed.tableId
    } else {
      if (parsed.appToken) appToken = parsed.appToken
      if (parsed.tableId) tableId = parsed.tableId
    }
  }

  if (!appToken || !tableId) {
    throw new Error('Missing Feishu Bitable config.')
  }

  tableConfigCache.appToken = appToken
  tableConfigCache.tableId = tableId
  return tableConfigCache
}

const getClientIp = (request: Request) => {
  const forwarded =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-vercel-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    ''

  if (!forwarded) return ''
  return forwarded.split(',')[0].trim()
}

const formatAddress = (payload: { country?: string; region?: string; city?: string }) => {
  return [payload.country, payload.region, payload.city].filter(Boolean).join(' ')
}

export const resolveClientInfo = async (request: Request) => {
  const ip = getClientIp(request)
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return { ip: ip || 'unknown', address: 'local' }
  }

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { cache: 'no-store' })
    const data = await res.json()
    const address = formatAddress({
      country: data?.country_name,
      region: data?.region,
      city: data?.city,
    })
    return { ip, address: address || 'unknown' }
  } catch (error) {
    return { ip, address: 'unknown' }
  }
}

export const buildFields = (payload: {
  feedback?: string
  score?: number | null
  quickOption?: string | null
  ip?: string
  address?: string
  location?: string
  question?: string
  reading?: string
  deep?: string
  chatHistory?: string
}) => {
  const fields: Record<string, string | number> = {}
  if (payload.feedback) fields[FIELD_FEEDBACK] = payload.feedback
  if (typeof payload.score === 'number') fields[FIELD_SCORE] = String(payload.score)
  if (payload.quickOption) fields[FIELD_QUICK_OPTION] = payload.quickOption
  if (payload.ip) fields[FIELD_IP] = payload.ip
  if (payload.address) fields[FIELD_ADDRESS] = payload.address
  if (payload.location) fields[FIELD_LOCATION] = payload.location
  if (payload.question) fields[FIELD_QUESTION] = payload.question
  if (payload.reading) fields[FIELD_READING] = payload.reading
  if (payload.deep) fields[FIELD_DEEP] = payload.deep
  if (payload.chatHistory) fields[FIELD_CHAT_HISTORY] = payload.chatHistory
  return fields
}

export const createRecord = async (fields: Record<string, string | number>) => {
  const { appToken, tableId } = await getTableConfig()
  const token = await getTenantToken()
  const res = await fetch(`${FEISHU_API}/bitable/v1/apps/${appToken}/tables/${tableId}/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fields }),
  })

  const data = await res.json()
  if (!res.ok || data?.code !== 0) {
    throw new Error(data?.msg || 'Failed to create record.')
  }

  return (data?.data?.record?.record_id || data?.data?.record_id) as string
}

export const updateRecord = async (recordId: string, fields: Record<string, string | number>) => {
  const { appToken, tableId } = await getTableConfig()
  const token = await getTenantToken()
  const res = await fetch(
    `${FEISHU_API}/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields }),
    }
  )

  const data = await res.json()
  if (!res.ok || data?.code !== 0) {
    throw new Error(data?.msg || 'Failed to update record.')
  }

  return (data?.data?.record?.record_id || data?.data?.record_id) as string
}
