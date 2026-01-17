'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { TAROT_DATA } from '@/constants/tarotData'
import { TAROT_QUESTIONS } from '@/constants/tarotQuestions'
import { ReadingCaptionBar } from './reading-panel/ReadingCaptionBar'
import { ReadingConsultationInput } from './reading-panel/ReadingConsultationInput'
import { ReadingFeedbackModal } from './reading-panel/ReadingFeedbackModal'
import { ReadingInputPanel } from './reading-panel/ReadingInputPanel'
import { PANEL_STYLE } from './reading-panel/readingStyles'
import {
  SECTION_LABELS,
  getOrientationLabel,
  formatCardLabel,
  buildPages,
  extractLabeledSection,
  extractFollowUpQuestion,
  splitSingleCardContent,
  stripFollowUpQuestion,
  getSectionContent,
  getNextStep,
  getFocusStepIndexBySpread,
  getReadingStepsBySpread,
} from './reading-panel/readingUtils'
const READING_ENDPOINT = '/api/reading'

export function ReadingPanel() {
  const revealedIndices = useGameStore((state) => state.revealedIndices) || []
  const selectedIndices = useGameStore((state) => state.selectedIndices) || []
  const readingReady = useGameStore((state) => state.readingReady) || false
  const readingStep = useGameStore((state) => state.readingStep) || 'idle'
  const setReadingStep = useGameStore((state) => state.setReadingStep) || (() => { })
  const cardOrientations = useGameStore((state) => state.cardOrientations) || {}
  const resetGame = useGameStore((state) => state.resetGame) || (() => { })
  const totalSlots = useGameStore((state) => state.totalSlots) || 3
  const currentSpreadId = useGameStore((state) => state.currentSpreadId) || 'trinity'
  const [visible, setVisible] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [pages, setPages] = useState([])
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackScore, setFeedbackScore] = useState(0)
  const [feedbackQuickOption, setFeedbackQuickOption] = useState(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackStatus, setFeedbackStatus] = useState('idle')
  const [consultationInput, setConsultationInput] = useState('')
  const [consultationAnswer, setConsultationAnswer] = useState('')
  const [consultationError, setConsultationError] = useState('')
  const [consultationLoading, setConsultationLoading] = useState(false)
  const [consultationStreaming, setConsultationStreaming] = useState(false)
  const [feedbackForRestart, setFeedbackForRestart] = useState(false)
  const streamControllerRef = useRef(null)
  const streamBufferRef = useRef('')
  const streamFrameRef = useRef(null)
  const streamDoneRef = useRef(false)
  const consultationControllerRef = useRef(null)
  const consultationBufferRef = useRef('')
  const consultationFrameRef = useRef(null)
  const consultationDoneRef = useRef(false)
  const autoAdvanceRef = useRef(false)

  const chosenIndices = useMemo(() => {
    return selectedIndices.filter((index) => revealedIndices.includes(index)).slice(0, totalSlots)
  }, [selectedIndices, revealedIndices, totalSlots])

  const chosenLabels = useMemo(() => {
    return chosenIndices
      .map((index) => {
        const card = TAROT_DATA[index]
        if (!card) return ''
        return formatCardLabel(card, cardOrientations[index])
      })
      .filter(Boolean)
  }, [chosenIndices, cardOrientations])

  const chosenCardsMeta = useMemo(() => {
    return chosenIndices.map((index, idx) => {
      const card = TAROT_DATA[index] || {}
      return {
        label: chosenLabels[idx] || '',
        name: card.nameCN || card.name || '',
        orientationLabel: getOrientationLabel(cardOrientations[index]),
      }
    })
  }, [chosenIndices, chosenLabels, cardOrientations])

  useEffect(() => {
    setVisible(readingReady && chosenLabels.length === totalSlots)
  }, [readingReady, chosenLabels.length, totalSlots])

  useEffect(() => {
    if (!readingReady || chosenLabels.length !== totalSlots) {
      setReadingStep('idle')
    }
  }, [readingReady, chosenLabels.length, setReadingStep, totalSlots])

  useEffect(() => {
    if (!readingReady) {
      resetStreamState()
      resetConsultationState()
      autoAdvanceRef.current = false
      setReadingStep('idle')
      setQuestion('')
      setAnswer('')
      setError('')
      setLoading(false)
      setPages([])
      setShowFeedback(false)
      setFeedbackScore(0)
      setFeedbackQuickOption(null)
      setFeedbackText('')
      setFeedbackStatus('idle')
    }
  }, [readingReady])

  useEffect(() => {
    if (isStreaming) return
    if (!answer) {
      setPages([])
      setShowFeedback(false)
      setFeedbackScore(0)
      setFeedbackQuickOption(null)
      setFeedbackText('')
      setFeedbackStatus('idle')
      return
    }
    const nextPages = buildPages(answer)
    setPages(nextPages)
    setShowFeedback(false)
    setFeedbackScore(0)
    setFeedbackQuickOption(null)
    setFeedbackText('')
    setFeedbackStatus('idle')
  }, [answer, isStreaming])

  useEffect(() => {
    if (isStreaming) return
    if (!answer) {
      setShowFeedback(false)
      return
    }
    if (feedbackForRestart) {
      if (!showFeedback) {
        setShowFeedback(true)
      }
      return
    }
    if (
      readingStep === 'consultation_result' &&
      !consultationStreaming &&
      consultationAnswer &&
      feedbackStatus !== 'success'
    ) {
      setShowFeedback(true)
      return
    }
    if (readingStep !== 'consultation_result' && showFeedback) {
      setShowFeedback(false)
    }
  }, [
    answer,
    consultationAnswer,
    consultationStreaming,
    feedbackForRestart,
    feedbackStatus,
    isStreaming,
    readingStep,
    showFeedback,
  ])

  useEffect(() => {
    return () => {
      if (streamControllerRef.current) {
        streamControllerRef.current.abort()
        streamControllerRef.current = null
      }
      if (streamFrameRef.current) {
        cancelAnimationFrame(streamFrameRef.current)
        streamFrameRef.current = null
      }
      streamBufferRef.current = ''
      streamDoneRef.current = false
      if (consultationControllerRef.current) {
        consultationControllerRef.current.abort()
        consultationControllerRef.current = null
      }
      if (consultationFrameRef.current) {
        cancelAnimationFrame(consultationFrameRef.current)
        consultationFrameRef.current = null
      }
      consultationBufferRef.current = ''
      consultationDoneRef.current = false
    }
  }, [])

  // 动态获取当前牌阵的焦点步骤索引
  const focusStepIndexMap = useMemo(() => getFocusStepIndexBySpread(currentSpreadId), [currentSpreadId])
  const focusIndex = focusStepIndexMap[readingStep] ?? -1
  const currentCardLabel = focusIndex >= 0 ? chosenLabels[focusIndex] : ''
  const summaryContent = useMemo(
    () => getSectionContent(pages, SECTION_LABELS[0]) || pages[0]?.content || '',
    [pages]
  )
  const singleCardContent = useMemo(
    () => getSectionContent(pages, SECTION_LABELS[1]) || pages[1]?.content || '',
    [pages]
  )
  const actionContent = useMemo(() => getSectionContent(pages, SECTION_LABELS[2]) || '', [pages])
  const summaryText = useMemo(() => {
    const blocks = []
    if (summaryContent) blocks.push(summaryContent)
    if (actionContent) blocks.push(actionContent)
    return blocks.join('\n\n')
  }, [summaryContent, actionContent])
  const summaryBaseText = useMemo(() => stripFollowUpQuestion(summaryText), [summaryText])
  const followUpQuestion = useMemo(() => extractFollowUpQuestion(answer), [answer])
  const summaryWithQuestion = useMemo(() => {
    if (!followUpQuestion) return summaryBaseText
    return `${summaryBaseText}\n\n**反问：** ${followUpQuestion}`
  }, [followUpQuestion, summaryBaseText])
  useEffect(() => {
    if (readingStep !== 'summary') return
    if (isStreaming) return
    if (!answer || !followUpQuestion) return
    if (autoAdvanceRef.current) return
    autoAdvanceRef.current = true
    setReadingStep('awaiting_user_input')
  }, [answer, followUpQuestion, isStreaming, readingStep, setReadingStep])
  const singleCardSections = useMemo(() => {
    return splitSingleCardContent(singleCardContent, chosenCardsMeta)
  }, [singleCardContent, chosenCardsMeta])
  const captionText =
    readingStep === 'summary'
      ? summaryBaseText
      : readingStep === 'awaiting_user_input'
        ? summaryWithQuestion
        : readingStep === 'consultation_result'
          ? consultationAnswer
          : focusIndex >= 0
            ? singleCardSections[focusIndex] || ''
            : ''

  const streamingSummaryContent = useMemo(
    () => extractLabeledSection(answer, SECTION_LABELS[0]),
    [answer]
  )
  const streamingSingleCardContent = useMemo(
    () => extractLabeledSection(answer, SECTION_LABELS[1]),
    [answer]
  )
  const streamingActionContent = useMemo(
    () => extractLabeledSection(answer, SECTION_LABELS[2]),
    [answer]
  )
  const streamingSummaryText = useMemo(() => {
    const blocks = []
    if (streamingSummaryContent) blocks.push(streamingSummaryContent)
    if (streamingActionContent) blocks.push(streamingActionContent)
    return blocks.join('\n\n')
  }, [streamingSummaryContent, streamingActionContent])
  const streamingSummaryBaseText = useMemo(
    () => stripFollowUpQuestion(streamingSummaryText),
    [streamingSummaryText]
  )
  const streamingFollowUpQuestion = useMemo(() => extractFollowUpQuestion(answer), [answer])
  const streamingSummaryWithQuestion = useMemo(() => {
    if (!streamingFollowUpQuestion) return streamingSummaryBaseText
    return `${streamingSummaryBaseText}\n\n**反问：** ${streamingFollowUpQuestion}`
  }, [streamingFollowUpQuestion, streamingSummaryBaseText])
  const streamingSingleCardSections = useMemo(
    () => splitSingleCardContent(streamingSingleCardContent, chosenCardsMeta),
    [streamingSingleCardContent, chosenCardsMeta]
  )
  const streamingCaptionText =
    readingStep === 'summary'
      ? streamingSummaryBaseText
      : readingStep === 'awaiting_user_input'
        ? streamingSummaryWithQuestion
        : focusIndex >= 0
          ? streamingSingleCardSections[focusIndex] || ''
          : ''

  const flushStreamBuffer = () => {
    if (!streamBufferRef.current) {
      streamFrameRef.current = null
      if (streamDoneRef.current) {
        streamDoneRef.current = false
        setIsStreaming(false)
        setLoading(false)
        streamControllerRef.current = null
      }
      return
    }

    const codePoint = streamBufferRef.current.codePointAt(0)
    const nextChar = codePoint !== undefined ? String.fromCodePoint(codePoint) : ''
    streamBufferRef.current = streamBufferRef.current.slice(nextChar.length || 1)
    setAnswer((prev) => prev + nextChar)
    streamFrameRef.current = requestAnimationFrame(flushStreamBuffer)
  }

  const enqueueStreamText = (chunk) => {
    if (!chunk) return
    streamBufferRef.current += chunk
    if (!streamFrameRef.current) {
      streamFrameRef.current = requestAnimationFrame(flushStreamBuffer)
    }
  }

  const resetStreamState = () => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort()
      streamControllerRef.current = null
    }
    if (streamFrameRef.current) {
      cancelAnimationFrame(streamFrameRef.current)
      streamFrameRef.current = null
    }
    streamBufferRef.current = ''
    streamDoneRef.current = false
    setIsStreaming(false)
  }

  const flushConsultationBuffer = () => {
    if (!consultationBufferRef.current) {
      consultationFrameRef.current = null
      if (consultationDoneRef.current) {
        consultationDoneRef.current = false
        setConsultationStreaming(false)
        setConsultationLoading(false)
        consultationControllerRef.current = null
      }
      return
    }

    const codePoint = consultationBufferRef.current.codePointAt(0)
    const nextChar = codePoint !== undefined ? String.fromCodePoint(codePoint) : ''
    consultationBufferRef.current = consultationBufferRef.current.slice(nextChar.length || 1)
    setConsultationAnswer((prev) => prev + nextChar)
    consultationFrameRef.current = requestAnimationFrame(flushConsultationBuffer)
  }

  const enqueueConsultationText = (chunk) => {
    if (!chunk) return
    consultationBufferRef.current += chunk
    if (!consultationFrameRef.current) {
      consultationFrameRef.current = requestAnimationFrame(flushConsultationBuffer)
    }
  }

  const resetConsultationState = () => {
    if (consultationControllerRef.current) {
      consultationControllerRef.current.abort()
      consultationControllerRef.current = null
    }
    if (consultationFrameRef.current) {
      cancelAnimationFrame(consultationFrameRef.current)
      consultationFrameRef.current = null
    }
    consultationBufferRef.current = ''
    consultationDoneRef.current = false
    setConsultationInput('')
    setConsultationAnswer('')
    setConsultationError('')
    setConsultationLoading(false)
    setConsultationStreaming(false)
  }

  const handleSubmit = async () => {
    if (loading) return
    const trimmed = question.trim()
    if (!trimmed) {
      setError('先写下你的问题吧。')
      return
    }
    if (chosenLabels.length < totalSlots) {
      setError('卡牌还没准备好，再等一下。')
      return
    }

    resetStreamState()
    resetConsultationState()
    autoAdvanceRef.current = false
    setReadingStep('focus_card_1')
    setLoading(true)
    setIsStreaming(true)
    setError('')
    setAnswer('')
    setPages([])
    setShowFeedback(false)
    setFeedbackForRestart(false)
    setFeedbackScore(0)
    setFeedbackQuickOption(null)
    setFeedbackText('')
    setFeedbackStatus('idle')

    try {
      let recordId = ''
      try {
        recordId = localStorage.getItem('omen_visit_id') || ''
      } catch (err) { }

      const controller = new AbortController()
      streamControllerRef.current = controller

      const res = await fetch(READING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: trimmed,
          cards: chosenLabels,
          recordId: recordId || undefined,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        let data = null
        try {
          data = await res.json()
        } catch (parseError) {
          data = null
        }
        setError(data?.error?.message || data?.error || '解牌失败了，请稍后再试。')
        setLoading(false)
        setIsStreaming(false)
        setReadingStep('idle')
        return
      }

      if (!res.body) {
        throw new Error('Missing stream body')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) {
          enqueueStreamText(decoder.decode(value, { stream: true }))
        }
      }
      streamDoneRef.current = true
      if (!streamFrameRef.current) {
        flushStreamBuffer()
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError('网络不太稳定，稍后再试。')
      setLoading(false)
      setIsStreaming(false)
      setReadingStep('idle')
    }
  }

  const handleReset = () => {
    if (loading) return
    resetStreamState()
    resetConsultationState()
    autoAdvanceRef.current = false
    resetGame()
    setQuestion('')
    setAnswer('')
    setConsultationAnswer('')
    setError('')
    setPages([])
    setShowFeedback(false)
    setFeedbackForRestart(false)
    setFeedbackScore(0)
    setFeedbackQuickOption(null)
    setFeedbackText('')
    setFeedbackStatus('idle')
  }

  const handleRandomQuestion = () => {
    if (!TAROT_QUESTIONS.length) return
    let nextQuestion = TAROT_QUESTIONS[Math.floor(Math.random() * TAROT_QUESTIONS.length)]
    if (TAROT_QUESTIONS.length > 1) {
      while (nextQuestion === question) {
        nextQuestion = TAROT_QUESTIONS[Math.floor(Math.random() * TAROT_QUESTIONS.length)]
      }
    }
    setQuestion(nextQuestion)
    setError('')
  }

  const handleKeyDown = (event) => {
    if (event.nativeEvent?.isComposing) return
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  const handleConsultationSubmit = async () => {
    if (consultationLoading || consultationStreaming) return
    const trimmed = consultationInput.trim()
    if (!trimmed) {
      setConsultationError('先写下你的想法吧。')
      return
    }
    if (!answer) {
      setConsultationError('解读还没完成，稍等一下。')
      return
    }

    let recordId = ''
    try {
      recordId = localStorage.getItem('omen_visit_id') || ''
    } catch (err) { }

    setConsultationError('')
    setConsultationAnswer('')
    setConsultationLoading(true)
    setConsultationStreaming(false)
    consultationDoneRef.current = false
    consultationBufferRef.current = ''
    if (consultationFrameRef.current) {
      cancelAnimationFrame(consultationFrameRef.current)
      consultationFrameRef.current = null
    }

    try {
      const controller = new AbortController()
      consultationControllerRef.current = controller
      const messages = [
        {
          role: 'user',
          content: `问题：${question}\n抽到的牌：${chosenLabels.join('、')}`,
        },
        {
          role: 'assistant',
          content: answer,
        },
        {
          role: 'user',
          content: trimmed,
        },
      ]

      const res = await fetch(READING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          recordId: recordId || undefined,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        let data = null
        try {
          data = await res.json()
        } catch (parseError) {
          data = null
        }
        setConsultationError(data?.error?.message || data?.error || '咨询回复失败了，请稍后再试。')
        setConsultationLoading(false)
        return
      }

      if (!res.body) {
        throw new Error('Missing stream body')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let switched = false
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          if (!switched && chunk.trim()) {
            switched = true
            setReadingStep('consultation_result')
            setConsultationLoading(false)
            setConsultationStreaming(true)
          }
          enqueueConsultationText(chunk)
        }
      }
      if (!switched) {
        setConsultationError('咨询回复为空，请稍后再试。')
        setConsultationLoading(false)
        return
      }
      consultationDoneRef.current = true
      if (!consultationFrameRef.current) {
        flushConsultationBuffer()
      }
      setConsultationInput('')
    } catch (err) {
      if (err?.name === 'AbortError') return
      setConsultationError('网络不太稳定，稍后再试。')
      setConsultationLoading(false)
      setConsultationStreaming(false)
    }
  }

  const handleConsultationKeyDown = (event) => {
    if (event.nativeEvent?.isComposing) return
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleConsultationSubmit()
    }
  }

  const handleFeedbackSubmit = () => {
    if (feedbackStatus === 'success') return

    let recordId = ''
    try {
      recordId = localStorage.getItem('omen_visit_id') || ''
    } catch (err) { }

    // 如果是再算一卦的反馈，提交后执行重置
    const isRestart = feedbackForRestart

    // 立即关闭弹窗
    setShowFeedback(false)
    setFeedbackStatus('success')
    setFeedbackForRestart(false)

    // 如果是再算一卦，立即重置游戏（不等待反馈请求完成）
    if (isRestart) {
      setTimeout(() => {
        handleReset()
      }, 50)
    }

    // 后台静默提交反馈
    fetch('/api/feishu/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: feedbackScore || null,
        quickOption: feedbackQuickOption,
        feedback: feedbackText.trim(),
        recordId: recordId || undefined,
      }),
    }).catch((err) => {
      console.log('反馈提交失败:', err)
    })
  }

  const handleRestart = () => {
    // 重置反馈状态，弹出反馈窗口
    setFeedbackScore(0)
    setFeedbackQuickOption(null)
    setFeedbackText('')
    setFeedbackStatus('idle')
    setFeedbackForRestart(true)
    setShowFeedback(true)
  }

  const handleNextStep = () => {
    if (loading && !isStreaming) return
    if (readingStep === 'consultation_result' && consultationStreaming) return
    if (readingStep === 'consultation_result') {
      if (feedbackStatus === 'success') {
        handleReset()
      } else {
        handleRestart()
      }
      return
    }
    if (readingStep === 'awaiting_user_input') {
      // 点击"下一张"直接进入占卜师回声
      if (consultationAnswer) {
        setReadingStep('consultation_result')
      }
      return
    }
    const readingSteps = getReadingStepsBySpread(currentSpreadId)
    const nextStep = getNextStep(readingStep, readingSteps)
    if (nextStep === 'awaiting_user_input') {
      autoAdvanceRef.current = true
    }
    setReadingStep(nextStep)
  }

  const handlePrevStep = () => {
    if (loading && !isStreaming) return
    const readingSteps = getReadingStepsBySpread(currentSpreadId)
    const index = readingSteps.indexOf(readingStep)
    if (index <= 0) return
    setReadingStep(readingSteps[index - 1])
  }

  if (!visible) {
    return (
      <div
        style={{
          ...PANEL_STYLE.wrapper,
          opacity: 0,
          pointerEvents: 'none',
          transform: 'translateX(-50%) translateY(12px)',
          transition: 'all 500ms ease',
        }}
      />
    )
  }

  const nextLabel =
    readingStep === 'consultation_result'
      ? '再算一卦'
      : readingStep === 'summary'
      ? '进入对话'
      : readingStep === `focus_card_${totalSlots}`
        ? '查看总结'
        : '下一张'
  const canPrev = readingStep !== 'focus_card_1'
  const showNextButton = true // 始终显示下一张按钮，支持从深度追问返回占卜师回声
  const isNextDisabled =
    readingStep === 'consultation_result'
      ? consultationStreaming
      : readingStep === 'awaiting_user_input'
        ? !consultationAnswer || consultationStreaming
        : loading && !isStreaming
  const captionTitle =
    focusIndex >= 0
      ? `第${focusIndex + 1}张${currentCardLabel ? ` · ${currentCardLabel}` : ''}`
      : readingStep === 'awaiting_user_input'
        ? '深度追问'
        : readingStep === 'consultation_result'
          ? '占卜师回声'
          : '总结'
  const captionStepLabel =
    focusIndex >= 0
      ? `${focusIndex + 1} / ${totalSlots}`
      : readingStep === 'awaiting_user_input'
        ? '追问'
        : readingStep === 'consultation_result'
          ? '回应'
          : '总结'
  const showInputPanel = visible && readingStep === 'idle'
  const showCaptionPanel = visible && readingStep !== 'idle'
  const showConsultationInput = visible && readingStep === 'awaiting_user_input'
  const showCaptionControls =
    focusIndex >= 0 ||
    readingStep === 'summary' ||
    readingStep === 'awaiting_user_input' ||
    readingStep === 'consultation_result'
  const captionDisplayText = isStreaming ? streamingCaptionText : captionText
  const isRestartDisabled = loading || isStreaming
  const isCaptionLoading =
    readingStep === 'consultation_result'
      ? consultationStreaming && !captionDisplayText
      : loading && !captionDisplayText
  const captionPlaceholder = isStreaming
    ? readingStep === 'summary'
      ? '总结生成中…'
      : '该牌解读生成中…'
    : readingStep === 'consultation_result'
      ? '占卜师回应生成中…'
      : '解读整理中…'
  const isFeedbackSuccess = feedbackStatus === 'success'
  const feedbackButtonLabel = isFeedbackSuccess ? '已提交' : '提交反馈'

  // Loading状态下的文字渐显动画
  const LoadingButton = () => (
    <span style={{ animation: 'textFadeIn 0.8s ease-in-out infinite alternate' }}>
      解牌中<span style={{ animationDelay: '0.3s' }}>。</span>
      <span style={{ animationDelay: '0.6s' }}>。</span>
      <span style={{ animationDelay: '0.9s' }}>。</span>
    </span>
  )

  const ConsultationLoading = () => (
    <span style={{ animation: 'textFadeIn 0.8s ease-in-out infinite alternate' }}>
      推演中<span style={{ animationDelay: '0.3s' }}>。</span>
      <span style={{ animationDelay: '0.6s' }}>。</span>
      <span style={{ animationDelay: '0.9s' }}>。</span>
    </span>
  )

  const inputWrapperStyle = {
    ...PANEL_STYLE.wrapper,
    opacity: 1,
    pointerEvents: 'auto',
    transform: 'translateX(-50%) translateY(0)',
    transition: 'all 500ms ease',
  }
  const captionWrapperStyle = {
    ...PANEL_STYLE.captionWrapper,
    opacity: 1,
    transform: 'translateX(-50%) translateY(0)',
    transition: 'all 500ms ease',
    bottom: showConsultationInput ? '16vh' : PANEL_STYLE.captionWrapper.bottom,
  }
  const consultationWrapperStyle = {
    ...PANEL_STYLE.consultationWrapper,
    opacity: 1,
    transform: 'translateX(-50%) translateY(0)',
    transition: 'all 500ms ease',
    animation: 'panelFadeIn 0.5s ease',
  }
  const loadingNode = <LoadingButton />
  const consultationLoadingNode = <ConsultationLoading />
  const captionLoadingNode =
    readingStep === 'consultation_result' ? consultationLoadingNode : loadingNode

  return (
    <>
      <style>{`
        @keyframes textFadeIn {
          from { opacity: 0.3; }
          to { opacity: 1; }
        }
        @keyframes panelFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        `}</style>

      {showInputPanel && (
        <ReadingInputPanel
          wrapperStyle={inputWrapperStyle}
          chosenLabels={chosenLabels}
          question={question}
          onQuestionChange={(event) => setQuestion(event.target.value)}
          onQuestionKeyDown={handleKeyDown}
          onRandomQuestion={handleRandomQuestion}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          loadingNode={loadingNode}
        />
      )}

      {showCaptionPanel && (
        <ReadingCaptionBar
          wrapperStyle={captionWrapperStyle}
          title={captionTitle}
          stepLabel={captionStepLabel}
          body={captionDisplayText}
          isLoading={isCaptionLoading}
          loadingNode={captionLoadingNode}
          placeholder={captionPlaceholder}
          onPrev={handlePrevStep}
          onNext={handleNextStep}
          canPrev={canPrev}
          isPrevDisabled={false}
          isNextDisabled={isNextDisabled}
          nextLabel={nextLabel}
          showControls={showCaptionControls}
          showNext={showNextButton}
          extraAction={
            readingStep === 'summary' ? (
              <button
                type="button"
                style={{
                  ...PANEL_STYLE.secondaryButton,
                  width: '100%',
                  opacity: isRestartDisabled ? 0.7 : 1,
                  cursor: isRestartDisabled ? 'not-allowed' : 'pointer',
                }}
                onClick={handleRestart}
                disabled={isRestartDisabled}
              >
                再算一卦
              </button>
            ) : null
          }
        />
      )}

      {showConsultationInput && (
        <ReadingConsultationInput
          wrapperStyle={consultationWrapperStyle}
          value={consultationInput}
          onChange={(event) => {
            setConsultationInput(event.target.value)
            if (consultationError) setConsultationError('')
          }}
          onKeyDown={handleConsultationKeyDown}
          onSubmit={handleConsultationSubmit}
          isLoading={consultationLoading || consultationStreaming}
          error={consultationError}
          sendLabel="发送"
          loadingNode={consultationLoadingNode}
        />
      )}

      {showFeedback && (
        <ReadingFeedbackModal
          feedbackScore={feedbackScore}
          feedbackQuickOption={feedbackQuickOption}
          onScoreChange={setFeedbackScore}
          onQuickOptionChange={setFeedbackQuickOption}
          feedbackText={feedbackText}
          onFeedbackTextChange={(event) => setFeedbackText(event.target.value)}
          onSubmit={handleFeedbackSubmit}
          isSuccess={isFeedbackSuccess}
          submitLabel={feedbackButtonLabel}
        />
      )}
    </>
  )
}
