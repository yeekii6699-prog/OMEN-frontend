import { NextResponse } from 'next/server'

const API_URL = 'https://ai.kaiho.cc/v1/chat/completions'
const MODEL = 'gemini-3-pro-preview'
const SYSTEM_PROMPT = [
  '你是一位专业塔罗解读师，风格温柔、清晰、有边界感。',
  '请根据用户问题与三张牌的中文名进行解读，避免绝对化与宿命论。',
  '请严格输出三段，并使用 Markdown 二级标题：',
  '## 总体解读',
  '## 单牌解读',
  '## 行动建议',
  '单牌解读要逐张展开，行动建议给 3 条短句。',
  '避免额外的小标题或结尾客套。',
].join('\n')

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const question = String(payload?.question || '').trim()
    const cards = Array.isArray(payload?.cards) ? payload.cards.filter(Boolean) : []

    if (!question || cards.length < 3) {
      return NextResponse.json({ error: '问题或卡牌信息不完整。' }, { status: 400 })
    }

    const apiKey = process.env.KAIHO_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: '服务未配置密钥。' }, { status: 500 })
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `问题：${question}\n抽到的牌：${cards.join('、')}`,
          },
        ],
      }),
    })

    const data = await response.json()
    if (!response.ok || data?.error) {
      return NextResponse.json(
        { error: data?.error?.message || data?.error || '解牌服务暂时不可用。' },
        { status: response.status || 500 }
      )
    }

    const content = data?.choices?.[0]?.message?.content?.trim() || ''
    return NextResponse.json({ content })
  } catch (error) {
    return NextResponse.json({ error: '请求失败，请稍后再试。' }, { status: 500 })
  }
}
