import { NextResponse } from 'next/server'
import { buildFields, updateRecord } from '@/lib/feishu'

const API_URL = 'https://ai.kaiho.cc/v1/chat/completions'
const MODEL = 'gemini-3-pro-preview'

const SYSTEM_PROMPT = `
#角色
你是一位掌握顶级心理学的塔罗师灵析，会根据塔罗牌与用户进行深度交流。
#核心技能
1.初步分析：通过塔罗牌对用户的问题进行初步简单分析，每张牌仅用一句话概括牌含义。
2.详细判断：要解读准确需要向用户获取足够的信息，但一轮对话只能提问一次，以“是不是？”，“对吗？”结尾（让用户做“是或否”的选择题）。
3.层层递进：一层一层结合用户信息解读塔罗牌。
4.信任获取：对话通过冷读术和巴纳姆效应获取用户的认同感。
5.最终解读：结合所有信息和塔罗牌，为用户提供总结和建议。
6.补牌机制：当用户提出更多当前牌面无法解读的问题时，提示用户可以点击按钮补牌，提示需要补几张。
#规则
1.口语化，自然语言
2.回复时不要提示“初步分析”“总结”“建议”等
3.禁止列表回复
4.使用markdown输出
5.适当使用表情
6.关键词加粗
7.补完牌之后要告诉灵析喔
8.**和“”不能相邻，会导致解析失败。
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

const formatChatHistory = (
  messages: Array<{ role: string; content: string }>,
  newContent?: string
) => {
  let history = ''
  for (const msg of messages) {
    const prefix = msg.role === 'user' ? '用户' : '塔罗师'
    history += `${prefix}：${msg.content}\n`
  }
  if (newContent) {
    history += `塔罗师：${newContent}`
  }
  return history.trim()
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { messages, content, cards, question, recordId, extraCards } = body

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

// æå»ºç³»ç»æç¤ºè¯ï¼åå«å¡çä¿¡æ¯
    let systemContent = SYSTEM_PROMPT
    const systemSections = []

    if (cards && cards.length > 0) {
      systemSections.push(`当前抽到的牌：
${formatCardsWithPositions(cards)}`)
    }

    if (extraCards && extraCards.length > 0) {
      systemSections.push(`补牌：
${formatCardsWithPositions(extraCards)}`)
    }

    if (systemSections.length > 0) {
      systemContent = `${SYSTEM_PROMPT}

${systemSections.join('\n\n')}`
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
          } catch (e) { }
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
          // 流结束后更新飞书解读字段（追加对话内容）
          if (recordId) {
            // 先把当前用户输入加入历史
            const messagesWithCurrent = content
              ? [...filteredMessages, { role: 'user', content }]
              : filteredMessages
            const fullHistory = formatChatHistory(messagesWithCurrent, fullContent)
            console.log('[feishu] 更新解读, recordId:', recordId, 'content长度:', fullContent.length)
            const fields = buildFields({ reading: fullHistory })
            updateRecord(recordId, fields).catch((err) => {
              console.error('[feishu][chat reading]', err)
            })
          }
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
