'use client'

import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import ReactMarkdown from 'react-markdown'
import { useGameStore } from '@/store/gameStore'
import { TAROT_DATA } from '@/constants/tarotData'
import { SpreadId, getSpreadById } from '@/constants/spreadConfig'
import { PortalHexagram } from '@/components/canvas/PortalHexagram'

// ============ 常量定义 ============

const API_ENDPOINT = '/api/chat'
const TAROT_BACK_IMAGE = 'https://tarot-1378447783.cos.ap-guangzhou.myqcloud.com/web_pictrue/Pback.jpg'

const getTypingCadence = (remaining: number, streamDone: boolean) => {
  let step = 2
  let delay = 56

  if (remaining > 260) {
    step = 6
    delay = 40
  } else if (remaining > 160) {
    step = 5
    delay = 44
  } else if (remaining > 90) {
    step = 4
    delay = 48
  } else if (remaining > 45) {
    step = 3
    delay = 52
  }

  if (streamDone) delay = Math.max(28, delay - 4)

  return { step, delay }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 获取正逆位标签
const getOrientationLabel = (orientation: string) =>
  orientation === 'reversed' ? '逆位' : '正位'

// ============ 类型定义 ============

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface TypingState {
  messageId: string
  target: string
  visible: number
  timer: ReturnType<typeof setTimeout> | null
  streamDone: boolean
  isRunning: boolean
  hasFinished: boolean
  activeIsOpen: boolean
  queue: string[]
  openQueued: string
  onDone?: () => void
}

interface ExtraCardInfo extends CardInfo {
  id: string
  index: number
  image: string
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

/** 补牌展示栏组件 */
function ExtraCardsBar({
  extraCards,
  expanded,
  onToggle,
  barRef,
  hasPending,
}: {
  extraCards: ExtraCardInfo[]
  expanded: boolean
  onToggle: () => void
  barRef?: { current: HTMLDivElement | null }
  hasPending?: boolean
}) {
  if (!extraCards.length && !hasPending) return null

  return (
    <div ref={barRef} className="px-4 pt-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left"
      >
        <div className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2">
          <div className="flex items-center justify-between gap-2 text-xs text-white/70">
            <span>补牌记录</span>
            <span className="flex items-center gap-1 text-white/50">
              {expanded ? '收起' : '展开'}
              <span className="text-[10px]">({extraCards.length})</span>
            </span>
          </div>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="extra-cards"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {extraCards.map((card) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80"
                    >
                      <span className="text-yellow-300">{card.position}</span>
                      <span className="whitespace-nowrap">{card.name}</span>
                      <span className="text-white/50">{card.orientation}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
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
  const [extraCards, setExtraCards] = useState<ExtraCardInfo[]>([])
  const [extraCardsExpanded, setExtraCardsExpanded] = useState(true)
  const [extraCardFlight, setExtraCardFlight] = useState<ExtraCardInfo | null>(null)
  const extraCardControls = useAnimationControls()
  const scrollRef = useRef<HTMLDivElement>(null)
  const extraCardsBarRef = useRef<HTMLDivElement>(null)
  const chatPanelRef = useRef<HTMLDivElement>(null)
  const hasGreeted = useRef(false)
  const lastCardsRef = useRef<string>('')
  const typingStateRef = useRef<TypingState>({
    messageId: '',
    target: '',
    visible: 0,
    timer: null,
    streamDone: false,
    isRunning: false,
    hasFinished: false,
    activeIsOpen: false,
    queue: [],
    openQueued: '',
  })

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

  const resetTypewriter = useCallback(() => {
    const state = typingStateRef.current
    if (state.timer) clearTimeout(state.timer)
    state.messageId = ''
    state.target = ''
    state.visible = 0
    state.timer = null
    state.streamDone = false
    state.isRunning = false
    state.hasFinished = false
    state.activeIsOpen = false
    state.queue = []
    state.openQueued = ''
    state.onDone = undefined
  }, [])

  const updateAssistantContent = useCallback((messageId: string, content: string) => {
    setMessages((prev) => {
      const index = prev.findIndex((message) => message.id === messageId)
      if (index === -1) return prev
      if (prev[index].content === content) return prev
      const next = [...prev]
      next[index] = { ...prev[index], content }
      return next
    })
  }, [])

  const runTypewriter = useCallback(() => {
    const state = typingStateRef.current
    state.timer = null

    const finishIfDone = () => {
      state.isRunning = false
      if (state.streamDone && !state.hasFinished) {
        state.hasFinished = true
        state.onDone?.()
      }
    }

    while (true) {
      if (!state.messageId) {
        if (state.target) {
          const id = `${Date.now()}-${Math.random()}`
          state.messageId = id
          state.visible = 0
          setMessages((prev) => [...prev, { id, role: 'assistant', content: '' }])
        } else if (state.queue.length > 0) {
          const next = state.queue.shift()
          if (!next) {
            finishIfDone()
            return
          }
          const id = `${Date.now()}-${Math.random()}`
          state.messageId = id
          state.target = next
          state.visible = 0
          state.activeIsOpen = false
          setMessages((prev) => [...prev, { id, role: 'assistant', content: '' }])
        } else if (state.openQueued) {
          const id = `${Date.now()}-${Math.random()}`
          state.messageId = id
          state.target = state.openQueued
          state.openQueued = ''
          state.visible = 0
          state.activeIsOpen = true
          setMessages((prev) => [...prev, { id, role: 'assistant', content: '' }])
        } else {
          finishIfDone()
          return
        }
      }

      const remaining = state.target.length - state.visible
      if (remaining <= 0) {
        if (state.activeIsOpen) {
          state.isRunning = false
          return
        }
        state.messageId = ''
        state.target = ''
        state.visible = 0
        continue
      }

      const { step, delay } = getTypingCadence(remaining, state.streamDone)
      state.visible = Math.min(state.target.length, state.visible + step)
      updateAssistantContent(state.messageId, state.target.slice(0, state.visible))
      state.isRunning = true
      state.timer = setTimeout(runTypewriter, delay)
      return
    }
  }, [updateAssistantContent])

  const appendToOpenParagraph = useCallback(
    (text: string) => {
      if (!text) return
      const state = typingStateRef.current
      const shouldAppendToActive =
        state.activeIsOpen || (!state.messageId && state.queue.length === 0 && !state.openQueued)

      if (shouldAppendToActive) {
        state.target += text
        state.activeIsOpen = true
        if (!state.isRunning) runTypewriter()
      } else {
        state.openQueued += text
      }
    },
    [runTypewriter]
  )

  const closeOpenParagraph = useCallback(() => {
    const state = typingStateRef.current
    if (state.activeIsOpen) {
      state.activeIsOpen = false
      if (!state.isRunning) runTypewriter()
      return
    }

    if (state.openQueued.trim()) {
      state.queue.push(state.openQueued.trim())
    }
    state.openQueued = ''
    if (!state.isRunning) runTypewriter()
  }, [runTypewriter])

  const finalizeTypewriter = useCallback(() => {
    const state = typingStateRef.current
    state.streamDone = true
    if (state.activeIsOpen) {
      state.activeIsOpen = false
    }
    if (state.openQueued.trim()) {
      state.queue.push(state.openQueued.trim())
      state.openQueued = ''
    } else {
      state.openQueued = ''
    }
    if (!state.isRunning) runTypewriter()
  }, [runTypewriter])

  // Memoized 值
  const chosenIndices = useMemo(
    () => selectedIndices.filter((index) => revealedIndices.includes(index)).slice(0, totalSlots),
    [selectedIndices, revealedIndices, totalSlots]
  )

  const cardsInfo = useMemo(
    () => buildCardsInfo(chosenIndices, cardOrientations, currentSpreadId),
    [chosenIndices, cardOrientations, currentSpreadId]
  )



  const canDrawExtra = useMemo(() => {
    const used = new Set([...chosenIndices, ...extraCards.map((card) => card.index)])
    return TAROT_DATA.length > used.size
  }, [chosenIndices, extraCards])

  const isExtraCardAnimating = extraCardFlight !== null

  const runExtraCardAnimation = useCallback(
    async (card: ExtraCardInfo) => {
      const panelRect = chatPanelRef.current?.getBoundingClientRect()
      if (!panelRect) {
        setExtraCards((prev) => [...prev, { ...card, position: `补牌${prev.length + 1}` }])
        setExtraCardFlight(null)
        return
      }

      await wait(0)

      const targetRect = extraCardsBarRef.current?.getBoundingClientRect()
      const panelCenter = {
        x: panelRect.left + panelRect.width / 2,
        y: panelRect.top + panelRect.height / 2,
      }
      const targetCenter = targetRect
        ? {
            x: targetRect.left + targetRect.width / 2,
            y: targetRect.top + targetRect.height / 2,
          }
        : { x: panelCenter.x, y: panelRect.top + 90 }
      const targetOffset = {
        x: targetCenter.x - panelCenter.x,
        y: targetCenter.y - panelCenter.y,
      }
      const startX = Math.min(panelRect.width * 0.6, 240)
      const startY = -panelRect.height * 0.12

      try {
        extraCardControls.set({
          x: startX,
          y: startY,
          rotate: -12,
          rotateY: 0,
          scale: 0.85,
          opacity: 0,
        })
        await extraCardControls.start({
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
          opacity: 1,
          transition: { duration: 0.38, ease: [0.22, 0.61, 0.36, 1] },
        })
        await extraCardControls.start({
          rotateY: 180,
          transition: { duration: 0.65, ease: 'easeInOut' },
        })
        await wait(1000)
        await extraCardControls.start({
          x: targetOffset.x,
          y: targetOffset.y,
          scale: 0.35,
          opacity: 0.2,
          transition: { duration: 0.45, ease: 'easeIn' },
        })
      } finally {
        setExtraCards((prev) => [...prev, { ...card, position: `补牌${prev.length + 1}` }])
        setExtraCardFlight(null)
      }
    },
    [extraCardControls]
  )

  const handleDrawExtraCard = useCallback(() => {
    if (!canDrawExtra || isExtraCardAnimating) return
    const used = new Set([...chosenIndices, ...extraCards.map((card) => card.index)])
    const available = TAROT_DATA.map((_, index) => index).filter((index) => !used.has(index))
    if (available.length === 0) return

    const pickedIndex = available[Math.floor(Math.random() * available.length)]
    const orientationValue = Math.random() < 0.5 ? 'upright' : 'reversed'
    const orientation = getOrientationLabel(orientationValue)
    const card = TAROT_DATA[pickedIndex]
    const name = card?.nameCN || card?.name || '未知'
    const image = card?.image || TAROT_BACK_IMAGE

    const nextCard: ExtraCardInfo = {
      id: `${Date.now()}-${Math.random()}`,
      index: pickedIndex,
      name,
      image,
      orientation,
      position: `补牌${extraCards.length + 1}`,
    }

    setExtraCardsExpanded(true)
    setExtraCardFlight(nextCard)
    void runExtraCardAnimation(nextCard)
  }, [canDrawExtra, isExtraCardAnimating, chosenIndices, extraCards, runExtraCardAnimation])
  const cardsKey = JSON.stringify(cardsInfo)
  const shouldGreet = readingReady && chosenIndices.length === totalSlots && cardsInfo.length > 0

  // 自动问候
  useEffect(() => {
    if (!shouldGreet) return
    if (cardsKey !== lastCardsRef.current) {
      lastCardsRef.current = cardsKey
      hasGreeted.current = false
      setExtraCards([])
      setExtraCardsExpanded(true)
      setExtraCardFlight(null)
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
      setExtraCards([])
      setExtraCardsExpanded(true)
      setExtraCardFlight(null)
      resetTypewriter()
      setIsLoading(false)
    }
  }, [readingReady, resetTypewriter])

  useEffect(() => {
    return () => {
      resetTypewriter()
    }
  }, [resetTypewriter])

  // 发送消息
  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    resetTypewriter()
    typingStateRef.current.onDone = () => setIsLoading(false)

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
          messages,  // 只传历史消息，不传当前这条
          content: bodyContent,  // 当前消息由 content 单独传
          cards: cardsInfo,
          extraCards: extraCards.map(({ name, orientation, position }) => ({
            name,
            orientation,
            position,
          })),
          question,
          recordId,
        }),
      })

      if (!response.ok || !response.body) throw new Error('请求失败')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let pendingNewline = false

      const ingestStreamText = (text: string) => {
        for (const char of text) {
          if (char === '\r') continue
          if (char === '\n') {
            if (pendingNewline) {
              pendingNewline = false
              closeOpenParagraph()
            } else {
              pendingNewline = true
            }
            continue
          }

          if (pendingNewline) {
            appendToOpenParagraph('\n')
            pendingNewline = false
          }
          appendToOpenParagraph(char)
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (!value) continue
        const chunk = decoder.decode(value, { stream: true })
        ingestStreamText(chunk)
      }

      const tail = decoder.decode()
      if (tail) ingestStreamText(tail)
      if (pendingNewline) {
        appendToOpenParagraph('\n')
        pendingNewline = false
      }
      finalizeTypewriter()
    } catch {
      const errorMessage = '抱歉，出了一点问题，请重试。'
      const typingId = typingStateRef.current.messageId
      if (typingId) {
        updateAssistantContent(typingId, errorMessage)
      } else {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: 'assistant', content: errorMessage },
        ])
      }
      resetTypewriter()
      setIsLoading(false)
    }
  }, [
    input,
    isLoading,
    messages,
    cardsInfo,
    extraCards,
    question,
    appendToOpenParagraph,
    closeOpenParagraph,
    finalizeTypewriter,
    resetTypewriter,
    updateAssistantContent,
  ])

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

  const isExtraCardReversed = extraCardFlight?.orientation === '逆位'

  const showLoadingIndicator =
    isLoading && (messages.length === 0 || messages[messages.length - 1]?.role === 'user')

  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl px-4"
      style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 12}px` : '16px' }}
      initial={false}
    >
      <div className="flex justify-center">
        <img
          src="https://tarot-1378447783.cos.ap-guangzhou.myqcloud.com/web_pictrue/lingxi.png"
          alt="灵析"
          className="block h-48 w-auto select-none"
          draggable={false}
        />
      </div>
      <motion.div
        ref={chatPanelRef}
        className="relative overflow-hidden rounded-t-2xl border border-white/20 bg-black/40 shadow-2xl backdrop-blur-xl"
        variants={expandedVariants}
        animate={isExpanded ? 'expanded' : 'collapsed'}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* 头部 */}
        <div className="relative">
          <motion.button
            className="flex w-full items-center justify-between px-4 py-3 text-white touch-manipulation"
            onClick={() => setIsExpanded(!isExpanded)}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🔮</span>
              <span className="font-medium">灵析</span>
            </div>
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-white/60"
            >
              ▼
            </motion.span>
          </motion.button>
          <button
            type="button"
            onClick={handleDrawExtraCard}
            disabled={!canDrawExtra || isExtraCardAnimating}
            aria-label="补牌"
            className="absolute left-1/2 top-1/2 z-10 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-yellow-300/40 bg-black/40 text-yellow-200 shadow-[0_0_18px_rgba(250,204,21,0.35)] backdrop-blur transition hover:scale-105 hover:border-yellow-300/70 hover:text-yellow-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.35),rgba(0,0,0,0)_65%)]" />
            <div className="pointer-events-none relative size-12">
              <Canvas
                className="size-12"
                dpr={[1, 1.5]}
                camera={{ position: [0, 0, 26], fov: 45 }}
                gl={{ alpha: true, antialias: true }}
                onCreated={(state) => {
                  state.camera.lookAt(0, -3.5, 18)
                  state.scene.add(new THREE.AmbientLight('#ffffff', 0.9))
                }}
              >
                <PortalHexagram />
              </Canvas>
            </div>
          </button>
        </div>

        <AnimatePresence>
          {extraCardFlight && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <div className="relative" style={{ perspective: '1200px' }}>
                <motion.div
                  className="relative h-48 w-32 sm:h-56 sm:w-40"
                  style={{ transformStyle: 'preserve-3d' }}
                  initial={{ opacity: 0 }}
                  animate={extraCardControls}
                >
                  <div
                    className="absolute inset-0 overflow-hidden rounded-2xl border border-yellow-300/60 bg-black shadow-[inset_0_0_18px_rgba(250,204,21,0.25)]"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <img
                      src={TAROT_BACK_IMAGE}
                      alt="tarot-card-back"
                      className="h-full w-full rounded-2xl object-cover"
                      loading="eager"
                      draggable={false}
                    />
                  </div>
                  <div
                    className="absolute inset-0 overflow-hidden rounded-2xl border border-amber-200/90 bg-black shadow-xl"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <img
                      src={extraCardFlight.image}
                      alt={extraCardFlight.name}
                      className="h-full w-full rounded-2xl object-cover"
                      style={{ transform: isExtraCardReversed ? 'rotate(180deg)' : 'none' }}
                      loading="eager"
                      draggable={false}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-2 pb-2 pt-6 text-[10px] text-white">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{extraCardFlight.name}</span>
                        <span className="shrink-0 text-white/80">{extraCardFlight.orientation}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* 内容区域 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div className="flex h-[calc(100%-56px)] flex-col" variants={contentVariants} initial="collapsed" animate="expanded" exit="collapsed" transition={{ duration: 0.2 }}>
              <ExtraCardsBar
                extraCards={extraCards}
                expanded={extraCardsExpanded}
                onToggle={() => setExtraCardsExpanded((prev) => !prev)}
                barRef={extraCardsBarRef}
                hasPending={Boolean(extraCardFlight)}
              />
              <MessageList messages={messages} isLoading={showLoadingIndicator} scrollRef={scrollRef} />
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
