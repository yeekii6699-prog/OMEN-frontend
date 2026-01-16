'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { TAROT_DATA } from '@/constants/tarotData'
import { ReadingCaptionBar } from './reading-panel/ReadingCaptionBar'
import { ReadingFeedbackModal } from './reading-panel/ReadingFeedbackModal'
import { ReadingInputPanel } from './reading-panel/ReadingInputPanel'
import { PANEL_STYLE } from './reading-panel/readingStyles'
import {
  SECTION_LABELS,
  READING_STEPS,
  FOCUS_STEP_INDEX,
  getOrientationLabel,
  formatCardLabel,
  buildPages,
  extractLabeledSection,
  splitSingleCardContent,
  getSectionContent,
  getNextStep,
} from './reading-panel/readingUtils'
const READING_ENDPOINT = '/api/reading'

export function ReadingPanel() {
  const revealedIndices = useGameStore((state) => state.revealedIndices) || []
  const selectedIndices = useGameStore((state) => state.selectedIndices) || []
  const readingReady = useGameStore((state) => state.readingReady) || false
  const readingStep = useGameStore((state) => state.readingStep) || 'idle'
  const setReadingStep = useGameStore((state) => state.setReadingStep) || (() => {})
  const cardOrientations = useGameStore((state) => state.cardOrientations) || {}
  const resetGame = useGameStore((state) => state.resetGame) || (() => {})
  const [visible, setVisible] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [pages, setPages] = useState([])
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackScore, setFeedbackScore] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackStatus, setFeedbackStatus] = useState('idle')
  const [feedbackError, setFeedbackError] = useState('')
  const streamControllerRef = useRef(null)
  const streamBufferRef = useRef('')
  const streamFrameRef = useRef(null)
  const streamDoneRef = useRef(false)
  const feedbackTimerRef = useRef(null)

  const chosenIndices = useMemo(() => {
    return selectedIndices.filter((index) => revealedIndices.includes(index)).slice(0, 3)
  }, [selectedIndices, revealedIndices])

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
    setVisible(readingReady && chosenLabels.length === 3)
  }, [readingReady, chosenLabels.length])

  useEffect(() => {
    if (!readingReady || chosenLabels.length !== 3) {
      setReadingStep('idle')
    }
  }, [readingReady, chosenLabels.length, setReadingStep])

  useEffect(() => {
    if (!readingReady) {
      resetStreamState()
      setReadingStep('idle')
      setQuestion('')
      setAnswer('')
      setError('')
      setLoading(false)
      setPages([])
      setShowFeedback(false)
      setFeedbackScore(0)
      setFeedbackText('')
      setFeedbackStatus('idle')
      setFeedbackError('')
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
        feedbackTimerRef.current = null
      }
    }
  }, [readingReady])

  useEffect(() => {
    if (isStreaming) return
    if (!answer) {
      setPages([])
      setShowFeedback(false)
      setFeedbackScore(0)
      setFeedbackText('')
      setFeedbackStatus('idle')
      setFeedbackError('')
      return
    }
    const nextPages = buildPages(answer)
    setPages(nextPages)
    setShowFeedback(false)
    setFeedbackScore(0)
    setFeedbackText('')
    setFeedbackStatus('idle')
    setFeedbackError('')
  }, [answer, isStreaming])

  useEffect(() => {
    if (isStreaming) return
    if (!answer) {
      setShowFeedback(false)
      return
    }
    if (readingStep === 'summary' && feedbackStatus !== 'success') {
      setShowFeedback(true)
      return
    }
    if (readingStep !== 'summary' && showFeedback) {
      setShowFeedback(false)
    }
  }, [answer, feedbackStatus, isStreaming, readingStep, showFeedback])

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
        feedbackTimerRef.current = null
      }
    }
  }, [])

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
    }
  }, [])

  const focusIndex = FOCUS_STEP_INDEX[readingStep] ?? -1
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
  const singleCardSections = useMemo(() => {
    return splitSingleCardContent(singleCardContent, chosenCardsMeta)
  }, [singleCardContent, chosenCardsMeta])
  const captionText =
    readingStep === 'summary'
      ? summaryText
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
  const streamingSingleCardSections = useMemo(
    () => splitSingleCardContent(streamingSingleCardContent, chosenCardsMeta),
    [streamingSingleCardContent, chosenCardsMeta]
  )
  const streamingCaptionText =
    readingStep === 'summary'
      ? streamingSummaryText
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

  const handleSubmit = async () => {
    if (loading) return
    const trimmed = question.trim()
    if (!trimmed) {
      setError('先写下你的问题吧。')
      return
    }
    if (chosenLabels.length < 3) {
      setError('卡牌还没准备好，再等一下。')
      return
    }

    resetStreamState()
    setReadingStep('focus_card_1')
    setLoading(true)
    setIsStreaming(true)
    setError('')
    setAnswer('')
    setPages([])
    setShowFeedback(false)
    setFeedbackScore(0)
    setFeedbackText('')
    setFeedbackStatus('idle')
    setFeedbackError('')

    try {
      let recordId = ''
      try {
        recordId = localStorage.getItem('omen_visit_id') || ''
      } catch (err) {}

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
    resetGame()
    setReadingStep('idle')
    setQuestion('')
    setAnswer('')
    setError('')
    setPages([])
    setShowFeedback(false)
    setFeedbackScore(0)
    setFeedbackText('')
    setFeedbackStatus('idle')
    setFeedbackError('')
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }
  }

  const handleKeyDown = (event) => {
    if (event.nativeEvent?.isComposing) return
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  const handleFeedbackSubmit = () => {
    if (feedbackStatus !== 'idle') return
    setFeedbackStatus('submitting')
    setFeedbackError('')

    let recordId = ''
    try {
      recordId = localStorage.getItem('omen_visit_id') || ''
    } catch (err) {}

    fetch('/api/feishu/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: feedbackScore || null,
        feedback: feedbackText.trim(),
        recordId: recordId || undefined,
      }),
    })
      .then(async (res) => {
        let data = null
        try {
          data = await res.json()
        } catch (parseError) {
          data = null
        }
        if (!res.ok) {
          throw new Error(data?.error || '提交失败了，请稍后再试。')
        }
        return data
      })
      .then((data) => {
        setFeedbackStatus('success')
        if (feedbackTimerRef.current) {
          clearTimeout(feedbackTimerRef.current)
          feedbackTimerRef.current = null
        }
        feedbackTimerRef.current = setTimeout(() => {
          setShowFeedback(false)
          feedbackTimerRef.current = null
        }, 1600)
      })
      .catch((err) => {
        setFeedbackStatus('idle')
        const message = err instanceof Error ? err.message : '提交失败了，请稍后再试。'
        setFeedbackError(message)
      })
  }

  const handleNextStep = () => {
    if (loading && !isStreaming) return
    if (readingStep === 'summary') {
      handleReset()
      return
    }
    const nextStep = getNextStep(readingStep)
    setReadingStep(nextStep)
  }

  const handlePrevStep = () => {
    if (loading && !isStreaming) return
    const index = READING_STEPS.indexOf(readingStep)
    if (index <= 0) return
    setReadingStep(READING_STEPS[index - 1])
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

  const nextLabel = readingStep === 'summary' ? '再算一卦' : readingStep === 'focus_card_3' ? '查看总结' : '下一张'
  const canPrev = readingStep !== 'focus_card_1'
  const isStepDisabled = loading && !isStreaming
  const captionTitle =
    focusIndex >= 0
      ? `第${focusIndex + 1}张${currentCardLabel ? ` · ${currentCardLabel}` : ''}`
      : '总结'
  const captionStepLabel = focusIndex >= 0 ? `${focusIndex + 1} / 3` : '总结'
  const showInputPanel = visible && readingStep === 'idle'
  const showCaptionPanel = visible && readingStep !== 'idle'
  const captionDisplayText = isStreaming ? streamingCaptionText : captionText
  const isCaptionLoading = loading && !captionDisplayText
  const captionPlaceholder = isStreaming
    ? readingStep === 'summary'
      ? '总结生成中…'
      : '该牌解读生成中…'
    : '解读整理中…'
  const isSubmittingFeedback = feedbackStatus === 'submitting'
  const isFeedbackSuccess = feedbackStatus === 'success'
  const feedbackButtonLabel = isFeedbackSuccess ? '已提交' : isSubmittingFeedback ? '提交中…' : '提交反馈'

  // Loading状态下的文字渐显动画
  const LoadingButton = () => (
    <span style={{ animation: 'textFadeIn 0.8s ease-in-out infinite alternate' }}>
      解牌中<span style={{ animationDelay: '0.3s' }}>。</span>
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
  }
  const loadingNode = <LoadingButton />

  return (
    <>
      <style>{`
        @keyframes textFadeIn {
          from { opacity: 0.3; }
          to { opacity: 1; }
        `}</style>

      {showInputPanel && (
        <ReadingInputPanel
          wrapperStyle={inputWrapperStyle}
          chosenLabels={chosenLabels}
          question={question}
          onQuestionChange={(event) => setQuestion(event.target.value)}
          onQuestionKeyDown={handleKeyDown}
          onReset={handleReset}
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
          loadingNode={loadingNode}
          placeholder={captionPlaceholder}
          onPrev={handlePrevStep}
          onNext={handleNextStep}
          canPrev={canPrev}
          isStepDisabled={isStepDisabled}
          nextLabel={nextLabel}
        />
      )}

      {showFeedback && (
        <ReadingFeedbackModal
          feedbackScore={feedbackScore}
          onScoreChange={setFeedbackScore}
          feedbackText={feedbackText}
          onFeedbackTextChange={(event) => setFeedbackText(event.target.value)}
          onSubmit={handleFeedbackSubmit}
          isSubmitting={isSubmittingFeedback}
          isSuccess={isFeedbackSuccess}
          error={feedbackError}
          submitLabel={feedbackButtonLabel}
        />
      )}
    </>
  )
}
