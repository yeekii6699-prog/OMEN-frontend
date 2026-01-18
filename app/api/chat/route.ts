import { NextResponse } from 'next/server'
import { buildFields, updateRecord } from '@/lib/feishu'

const API_URL = 'https://ai.kaiho.cc/v1/chat/completions'
const MODEL = 'gemini-3-pro-preview'

const SYSTEM_PROMPT = `
你是一位知心塔罗师姐姐。会和用户进行一对一的多轮深度对话。
每次回复不要太长，要给用户留出说话的空间。
使用markdown格式输出，关键词句加粗。
适当使用表情符号。
不要使用列表格式。
**和“”不能相邻，会导致解析失败。
`

const formatCardsWithPositions = (
  cards: Array<{ name: string; orientation: string; position: string }>
) => {
  return cards
    .map((card, index) => {
      const pos = card.position || `位置${index + 1}`
      return `${pos}：${card.name}（${card.orientation}）`
    })
    .join('\n')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { messages, content, cards, question, recordId } = body

    // 验证必要参数
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: '消息格式不正确' }, { status: 400 })
    }

    // 首次对话需要卡牌信息，后续对话可以不需要
    if (!question && (!cards || !cards.length) && messages.length === 0) {
      return NextResponse.json({ error: '缺少问题或卡牌信息' }, { status: 400 })
    }

    const apiKey = process.env.KAIHO_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: '服务未配置密钥' }, { status: 500 })
    }

    // 构建系统提示词，包含卡牌信息
    let systemContent = SYSTEM_PROMPT
    if (cards && cards.length > 0) {
      const cardsInfo = formatCardsWithPositions(cards)
      systemContent = `${SYSTEM_PROMPT}

当前抽到的牌：
${cardsInfo}`
    }

    // 构建请求消息
    const filteredMessages = messages.filter(
      (m: { role: string; content: string }) =>
        m.role === 'user' || m.role === 'assistant'
    )

    // 如果有用户输入内容，添加为最后一条消息
    const requestMessages = [
      { role: 'system' as const, content: systemContent },
      ...filteredMessages,
    ]

    // 如果有新的用户输入，添加到消息列表
    if (content) {
      requestMessages.push({
        role: 'user' as const,
        content,
      })
    }

    // 如果有用户问题且是第一条消息，注入问题
    if (question && messages.length === 0) {
      requestMessages.push({
        role: 'user' as const,
        content: `我的问题是：${question}`,
      })
    }

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
      } catch (e) {
        data = null
      }
      return NextResponse.json(
        { error: data?.error?.message || data?.error || 'AI 服务暂时不可用' },
        { status: response.status || 500 }
      )
    }

    if (!response.body) {
      return NextResponse.json({ error: 'AI 服务暂时不可用' }, { status: 500 })
    }

    // 持久化解读结果（首次解读时）
    if (recordId && messages.length === 0 && question) {
      const fields = buildFields({
        question,
        reading: '', // 会在流结束后更新
      })
      if (Object.keys(fields).length) {
        updateRecord(recordId, fields).catch((err) => {
          console.error('[feishu][chat reading]', err)
        })
      }
    }

    // 流式返回
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body.getReader()
        let isClosed = false
        const close = () => {
          if (isClosed) return
          isClosed = true
          try {
            controller.close()
          } catch (e) {}
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
                const delta =
                  json?.choices?.[0]?.delta?.content ||
                  json?.choices?.[0]?.message?.content ||
                  ''
                if (delta) {
                  fullContent += delta
                  controller.enqueue(encoder.encode(delta))
                }
              } catch (e) {
                continue
              }
            }
          }
        } catch (e) {
          controller.error(e)
        } finally {
          close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[chat] error:', error)
    return NextResponse.json({ error: '请求失败，请稍后再试' }, { status: 500 })
  }
}
