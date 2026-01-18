'use client'

import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { useGameStore } from '@/store/gameStore'
import { TAROT_DATA } from '@/constants/tarotData'
import { SpreadId, getSpreadById } from '@/constants/spreadConfig'

// ============ 常量定义 ============

const API_ENDPOINT = '/api/chat'

// 获取正逆位标签
const getOrientationLabel = (orientation: string) =>
  orientation === 'reversed' ? '逆位' : '正位'

// ============ 类型定义 ============

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface CardInfo {
  name: string
  orientation: string
  position: string
}

// ============ 工具函数 ============

/** 获取记录 ID */
const getRecordId = () => {
  try {
    return localStorage.getItem('omen_visit_id') || ''
  } catch {
    return ''
  }
}

/** 构建卡牌信息 */
const buildCardsInfo = (
  chosenIndices: number[],
  cardOrientations: Record<number, 'upright' | 'reversed'>,
  spreadId: string
): CardInfo[] => {
  const spread = getSpreadById(spreadId as SpreadId)
  const positionMeanings = spread?.positionMeanings || []

  return chosenIndices.map((index, idx) => {
    const card = TAROT_DATA[index]
    const position = positionMeanings[idx] || `位置${idx + 1}`
    const orientation = getOrientationLabel(cardOrientations[index])
    const name = card?.nameCN || card?.name || '未知'

    return { name: `${name}（${orientation}）`, orientation, position }
  })
}

/** 构建初始问候语 */
const buildGreeting = (cards: CardInfo[], question: string) => {
  const cardNames = cards.map((c) => c.name).join('、')
  let greeting = `✨ 你抽到了 ${cardNames}`

  if (question) {
    greeting += `\n\n关于「${question}」，请说出你一直想问的心里话...`
  } else {
    greeting += '\n\n请说出你一直想问的心里话...'
  }

  return greeting
}

// ============ 自定义 Hooks ============

/** 键盘高度检测 Hook */
function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const initialHeight = window.innerHeight

    const handleViewportChange = () => {
      const viewport = window.visualViewport
      if (viewport) {
        const offset = window.innerHeight - viewport.height
        setKeyboardHeight(offset > 100 ? offset : 0)
      }
    }

    const handleResize = () => {
      if (!window.visualViewport) {
        const offset = window.innerHeight - initialHeight
        setKeyboardHeight(offset > 100 ? offset : 0)
      }
    }

    const handleFocus = () => setTimeout(handleViewportChange, 100)
    const handleBlur = () => setTimeout(() => setKeyboardHeight(0), 200)

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange)
      window.visualViewport.addEventListener('scroll', handleViewportChange)
    } else {
      window.addEventListener('resize', handleResize)
    }

    document.addEventListener('focus', handleFocus, { capture: true })
    document.addEventListener('blur', handleBlur, { capture: true })

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange)
        window.visualViewport.removeEventListener('scroll', handleViewportChange)
      } else {
        window.removeEventListener('resize', handleResize)
      }
      document.removeEventListener('focus', handleFocus, { capture: true })
      document.removeEventListener('blur', handleBlur, { capture: true })
    }
  }, [])

  return keyboardHeight
}

// ============ 子组件 ============

/** 消息气泡组件 */
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser ? 'bg-purple-600/80 text-white' : 'bg-white/10 text-white/90'
        }`}
      >
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => (
              <strong className="font-semibold text-yellow-300">{children}</strong>
            ),
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
            h2: ({ children }) => (
              <h2 className="mb-2 mt-3 text-base font-semibold text-purple-300">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="mb-1 mt-2 text-sm font-medium text-purple-200">{children}</h3>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </motion.div>
  )
}

/** 加载动画组件 */
function LoadingIndicator() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl bg-white/10 px-4 py-3">
        <span className="size-1.5 animate-bounce rounded-full bg-white/60" />
        <span className="size-1.5 animate-bounce rounded-full bg-white/60" style={{ animationDelay: '0.15s' }} />
        <span className="size-1.5 animate-bounce rounded-full bg-white/60" style={{ animationDelay: '0.3s' }} />
      </div>
    </motion.div>
  )
}

/** 消息列表组件 */
function MessageList({
  messages,
  isLoading,
  scrollRef,
}: {
  messages: ChatMessage[]
  isLoading: boolean
  scrollRef: React.RefObject<HTMLDivElement>
}) {
  return (
    <div ref={scrollRef} className="custom-scrollbar flex-1 overflow-y-auto px-4 py-2">
      <div className="space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && <LoadingIndicator />}
      </div>
    </div>
  )
}

/** 输入区域组件 */
function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="border-t border-white/10 p-3"
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="输入你的想法或问题..."
          enterKeyHint="send"
          className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 backdrop-blur-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
        />
        <button
          type="submit"
          disabled={disabled}
          className="rounded-full bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/40"
        >
          发送
        </button>
      </div>
    </form>
  )
}

// ============ 主组件 ============

export function CollapsibleChat() {
  // 状态
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasGreeted = useRef(false)
  const lastCardsRef = useRef<string>('')

  // 游戏状态
  const revealedIndices = useGameStore((state) => state.revealedIndices) || []
  const selectedIndices = useGameStore((state) => state.selectedIndices) || []
  const readingReady = useGameStore((state) => state.readingReady) || false
  const cardOrientations = useGameStore((state) => state.cardOrientations) || {}
  const totalSlots = useGameStore((state) => state.totalSlots) || 3
  const currentSpreadId = useGameStore((state) => state.currentSpreadId) || 'single'
  const question = useGameStore((state) => state.question) || ''

  // Hooks
  const keyboardHeight = useKeyboardHeight()

  // Memoized 值
  const chosenIndices = useMemo(
    () => selectedIndices.filter((index) => revealedIndices.includes(index)).slice(0, totalSlots),
    [selectedIndices, revealedIndices, totalSlots]
  )

  const cardsInfo = useMemo(
    () => buildCardsInfo(chosenIndices, cardOrientations, currentSpreadId),
    [chosenIndices, cardOrientations, currentSpreadId]
  )

  const cardsKey = JSON.stringify(cardsInfo)
  const shouldGreet = readingReady && chosenIndices.length === totalSlots && cardsInfo.length > 0

  // 自动问候
  useEffect(() => {
    if (!shouldGreet) return
    if (cardsKey !== lastCardsRef.current) {
      lastCardsRef.current = cardsKey
      hasGreeted.current = false
    }
    if (hasGreeted.current) return

    const timer = setTimeout(() => {
      setMessages([{ id: 'greeting', role: 'assistant', content: buildGreeting(cardsInfo, question) }])
      hasGreeted.current = true
    }, 300)

    return () => clearTimeout(timer)
  }, [shouldGreet, cardsInfo, question])

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // 重置状态
  useEffect(() => {
    if (!readingReady) {
      setMessages([])
      setInput('')
      hasGreeted.current = false
      lastCardsRef.current = ''
    }
  }, [readingReady])

  // 发送消息
  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const recordId = getRecordId()
      const bodyContent =
        messages.length === 0 && cardsInfo.length > 0
          ? `${trimmed}\n\n[卡牌上下文：${JSON.stringify(cardsInfo)}]`
          : trimmed

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          content: bodyContent,
          cards: cardsInfo,
          question,
          recordId,
        }),
      })

      if (!response.ok || !response.body) throw new Error('请求失败')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let hasSentFirst = false

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // 按段落分割：遇到两个换行符时发送新气泡
        let match
        const doubleNewlineRegex = new RegExp('^.+?\\n\\n', 's')
        while ((match = buffer.match(doubleNewlineRegex))) {
          const paragraph = match[0]
          buffer = buffer.slice(paragraph.length)

          const newMessage: ChatMessage = {
            id: (Date.now() + Math.random()).toString(),
            role: 'assistant',
            content: paragraph.trim(),
          }
          setMessages((prev) => [...prev, newMessage])

          // 每条消息之间加一点延迟，让气泡逐个出现
          if (!hasSentFirst) {
            hasSentFirst = true
          } else {
            await new Promise((resolve) => setTimeout(resolve, 80))
          }
        }
      }

      // 发送剩余内容（如果没有标点结尾）
      if (buffer.trim()) {
        const newMessage: ChatMessage = {
          id: (Date.now() + Math.random()).toString(),
          role: 'assistant',
          content: buffer.trim(),
        }
        setMessages((prev) => [...prev, newMessage])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content: '抱歉，出了点问题，请重试。' },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, cardsInfo, question])

  // 条件渲染
  if (!readingReady || chosenIndices.length < totalSlots) return null

  // 动画变体
  const expandedVariants = {
    expanded: { height: keyboardHeight > 0 ? '85vh' : '75vh' },
    collapsed: { height: '56px' },
  }

  const contentVariants = {
    expanded: { opacity: 1, y: 0 },
    collapsed: { opacity: 0, y: 10 },
  }

  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl px-4"
      style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 12}px` : '16px' }}
      initial={false}
    >
      <motion.div
        className="relative overflow-hidden rounded-t-2xl border border-white/20 bg-black/40 shadow-2xl backdrop-blur-xl"
        variants={expandedVariants}
        animate={isExpanded ? 'expanded' : 'collapsed'}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* 头部 */}
        <motion.button
          className="flex w-full items-center justify-between px-4 py-3 text-white touch-manipulation"
          onClick={() => setIsExpanded(!isExpanded)}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🔮</span>
            <span className="font-medium">与 CC 对话</span>
          </div>
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-white/60"
          >
            ▼
          </motion.span>
        </motion.button>

        {/* 内容区域 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div className="flex h-[calc(100%-56px)] flex-col" variants={contentVariants} initial="collapsed" animate="expanded" exit="collapsed" transition={{ duration: 0.2 }}>
              <MessageList messages={messages} isLoading={isLoading} scrollRef={scrollRef} />
              <ChatInput value={input} onChange={setInput} onSubmit={handleSubmit} disabled={!input.trim() || isLoading} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </motion.div>
  )
}
