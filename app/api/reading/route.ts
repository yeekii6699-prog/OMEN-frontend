import { NextResponse } from 'next/server'
import { buildFields, updateRecord } from '@/lib/feishu'

const API_URL = 'https://ai.kaiho.cc/v1/chat/completions'
const MODEL = 'gemini-3-pro-preview'
const SYSTEM_PROMPT = [
  '卡牌会标注正位或逆位（例如：愚人（逆位）），解读时必须明确区分正逆位含义。',
  '不需要解释牌阵或位置含义，只逐张解读每张牌。',
  '不要再重复说明“牌位”是什么意思，仅将牌位含义作为对每张卡的背景信息。',
  '你是一位专业塔罗解读师，风格温柔、清晰、有边界感。',
  '请根据用户问题与每张牌的中文名进行解读，避免绝对化与宿命论。',
  '在行动建议之后，追加一行反问，格式严格为：反问：<一句话问题>。',
  '反问必须基于牌面矛盾点，简短直击潜意识。',
  '请严格输出三段，并使用 Markdown 二级标题：',
  '## 总体解读',
  '## 单牌解读',
  '## 行动建议',
  '单牌解读要逐张展开，行动建议给 3 条短句。',
  '避免额外的小标题或结尾客套。',
].join('\n')

const CONSULTATION_PROMPT = [
  '你是一位专业而温柔的占卜师，擅长把塔罗解读转化为可落地的安抚与建议。',
  '请结合先前的牌面解读与用户的新回答，给出最终的建议或治愈性话语。',
  '不要重新解读每张牌，不要输出标题或列表。',
  '控制在 2-4 段内，语气温和、具体、有边界感。',
].join('\n')

const formatCardsList = (cards: string[]) => {
  if (!cards.length) return ''
  return cards.map((card, index) => `${index + 1}. ${card}`).join('\\n')
}

const formatQuestionWithCards = (question: string, cards: string[]) => {
  if (!cards.length) return question
  return `${question}\\n卡牌：\\n${formatCardsList(cards)}`
}

const getLastUserMessage = (
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') {
      return messages[index].content
    }
  }
  return ''
}

const formatDeepContent = (reply: string, response: string) => {
  const blocks = []
  if (reply) blocks.push(`用户回答：${reply}`)
  if (response) blocks.push(`占卜师回声：${response}`)
  return blocks.join('\n\n')
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const question = String(payload?.question || '').trim()
    const cards = Array.isArray(payload?.cards)
      ? payload.cards.map((card: unknown) => String(card).trim()).filter(Boolean)
      : []
    const rawMessages = Array.isArray(payload?.messages) ? payload.messages : []
    const messages = rawMessages
      .map((message: any) => {
        const role = message?.role
        if (role !== 'user' && role !== 'assistant' && role !== 'system') return null
        const content = String(message?.content || '').trim()
        if (!content) return null
        return { role, content }
      })
      .filter((message): message is { role: 'user' | 'assistant' | 'system'; content: string } => !!message)
    const recordId = typeof payload?.recordId === 'string' ? payload.recordId.trim() : ''
    const isConsultation = messages.length > 0
    const consultationReply = isConsultation ? getLastUserMessage(messages) : ''

    if (!isConsultation && (!question || cards.length < 3)) {
      return NextResponse.json({ error: '问题或卡牌信息不完整。' }, { status: 400 })
    }

    const apiKey = process.env.KAIHO_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: '服务未配置密钥。' }, { status: 500 })
    }

    const requestMessages = isConsultation
      ? [{ role: 'system', content: CONSULTATION_PROMPT }, ...messages]
      : [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `问题：${question}
抽到的牌：
${formatCardsList(cards)}`,
        },
      ]

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        stream: true,
        messages: requestMessages,
      }),
    })

    if (!response.ok) {
      let data = null
      try {
        data = await response.json()
      } catch (error) {
        data = null
      }
      return NextResponse.json({ error: data?.error?.message || data?.error || '解牌服务暂时不可用。' }, { status: response.status || 500 })
    }

    if (!response.body) {
      return NextResponse.json({ error: '解牌服务暂时不可用。' }, { status: 500 })
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    let buffer = ''
    let content = ''
    let finalized = false
    const shouldPersistReading = !isConsultation && !!recordId
    const shouldPersistDeep = isConsultation && !!recordId
    const finalize = () => {
      if (finalized) return
      finalized = true
      if (shouldPersistReading) {
        const fields = buildFields({
          question: formatQuestionWithCards(question, cards),
          reading: content,
        })
        if (Object.keys(fields).length) {
          updateRecord(recordId, fields).catch((error) => {
            const message = error instanceof Error ? error.message : 'Failed to update reading.'
            console.error('[feishu][reading]', message)
          })
        }
        return
      }
      if (shouldPersistDeep) {
        const deepContent = formatDeepContent(consultationReply, content)
        const fields = buildFields({
          deep: deepContent,
        })
        if (!Object.keys(fields).length) return
        updateRecord(recordId, fields).catch((error) => {
          const message = error instanceof Error ? error.message : 'Failed to update deep.'
          console.error('[feishu][deep]', message)
        })
      }
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body.getReader()
        let isClosed = false
        const close = () => {
          if (isClosed) return
          isClosed = true
          try {
            controller.close()
          } catch (error) { }
          finalize()
        }

        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            if (!value) continue
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed.startsWith('data:')) continue
              const data = trimmed.replace(/^data:\s*/, '')
              if (!data || data === '[DONE]') {
                close()
                return
              }
              try {
                const json = JSON.parse(data)
                const delta = json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content || ''
                if (delta) {
                  content += delta
                  controller.enqueue(encoder.encode(delta))
                }
              } catch (error) {
                continue
              }
            }
          }
        } catch (error) {
          controller.error(error)
        } finally {
          close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })

  } catch (error) {
    return NextResponse.json({ error: '请求失败，请稍后再试。' }, { status: 500 })
  }
}
