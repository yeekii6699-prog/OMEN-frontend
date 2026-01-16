'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useGameStore } from '@/store/gameStore'
import { TAROT_DATA } from '@/constants/tarotData'
const READING_ENDPOINT = '/api/reading'

const getOrientationLabel = (orientation) => (orientation === 'reversed' ? '逆位' : '正位')

const formatCardLabel = (card, orientation) => {
  if (!card) return ''
  const name = card.nameCN || card.name || 'Unknown'
  return `${name}（${getOrientationLabel(orientation)}）`
}

const SECTION_LABELS = ['总体解读', '单牌解读', '行动建议']
const READING_STEPS = ['focus_card_1', 'focus_card_2', 'focus_card_3', 'summary']
const FOCUS_STEP_INDEX = {
  focus_card_1: 0,
  focus_card_2: 1,
  focus_card_3: 2,
}

const PANEL_STYLE = {
  wrapper: {
    position: 'fixed',
    left: '50%',
    bottom: '24px',
    transform: 'translateX(-50%)',
    width: 'min(92vw, 760px)',
    zIndex: 30,
    touchAction: 'auto',
  },
  panel: {
    background: 'rgba(10, 12, 14, 0.75)',
    border: '1px solid rgba(255, 215, 160, 0.25)',
    borderRadius: '18px',
    padding: '16px',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
    backdropFilter: 'blur(8px)',
  },
  title: {
    fontFamily: 'KaiTi, STKaiti, serif',
    color: '#f2e6c9',
    letterSpacing: '0.12em',
    fontSize: '12px',
    marginBottom: '10px',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
  },
  chip: {
    fontFamily: 'KaiTi, STKaiti, serif',
    background: 'rgba(255, 215, 160, 0.12)',
    color: '#f7e7b3',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    border: '1px solid rgba(255, 215, 160, 0.25)',
  },
  input: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 215, 160, 0.2)',
    borderRadius: '12px',
    padding: '10px 12px',
    color: '#f8f1de',
    fontFamily: 'KaiTi, STKaiti, serif',
    fontSize: '14px',
    outline: 'none',
    resize: 'none',
    minHeight: '72px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
  },
  button: {
    background: 'linear-gradient(120deg, #f5d68a, #f2b96d)',
    color: '#1a1206',
    borderRadius: '10px',
    padding: '8px 18px',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  secondaryButton: {
    background: 'transparent',
    color: '#f2e6c9',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '14px',
    border: '1px solid rgba(255, 215, 160, 0.35)',
    cursor: 'pointer',
  },
  answer: {
    marginTop: '12px',
    color: '#f8f1de',
    fontSize: '14px',
    lineHeight: 1.7,
    fontFamily: 'KaiTi, STKaiti, serif',
  },
  answerHeader: {
    marginTop: '10px',
    marginBottom: '8px',
  },
  answerStep: {
    fontSize: '11px',
    color: '#d9caa5',
    letterSpacing: '0.18em',
  },
  answerTitle: {
    fontSize: '15px',
    color: '#f7e7b3',
    marginTop: '4px',
  },
  answerHint: {
    fontSize: '12px',
    color: '#cbb78e',
    marginTop: '4px',
  },
  answerCard: {
    marginTop: '10px',
    padding: '12px',
    borderRadius: '14px',
    border: '1px solid rgba(255, 215, 160, 0.2)',
    background: 'rgba(7, 8, 12, 0.55)',
    overflowY: 'auto',
    touchAction: 'pan-y',
    WebkitOverflowScrolling: 'touch',
  },
  pager: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '10px',
    gap: '8px',
  },
  pagerButton: {
    background: 'rgba(255, 215, 160, 0.12)',
    color: '#f2e6c9',
    borderRadius: '10px',
    padding: '6px 12px',
    fontSize: '12px',
    border: '1px solid rgba(255, 215, 160, 0.25)',
    cursor: 'pointer',
  },
  pagerIndicator: {
    color: '#d9caa5',
    fontSize: '12px',
    letterSpacing: '0.12em',
  },
  captionWrapper: {
    position: 'fixed',
    left: '50%',
    bottom: '7vh',
    transform: 'translateX(-50%)',
    width: 'min(94vw, 880px)',
    zIndex: 40,
    pointerEvents: 'auto',
  },
  captionPanel: {
    background: 'rgba(8, 10, 14, 0.7)',
    border: '1px solid rgba(255, 215, 160, 0.18)',
    borderRadius: '18px',
    padding: '14px 16px',
    boxShadow: '0 18px 45px rgba(0, 0, 0, 0.45)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  captionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  captionTitle: {
    fontFamily: 'KaiTi, STKaiti, serif',
    color: '#f7e7b3',
    fontSize: '14px',
    letterSpacing: '0.08em',
  },
  captionStep: {
    fontSize: '11px',
    color: '#d9caa5',
    letterSpacing: '0.2em',
  },
  captionBody: {
    color: '#f8f1de',
    fontSize: '14px',
    lineHeight: 1.7,
    maxHeight: '28vh',
    overflowY: 'auto',
    paddingRight: '4px',
    touchAction: 'pan-y',
    WebkitOverflowScrolling: 'touch',
  },
  captionFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(5, 6, 10, 0.6)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
    padding: '20px',
  },
  modalCard: {
    width: 'min(88vw, 420px)',
    background: 'rgba(12, 14, 18, 0.92)',
    border: '1px solid rgba(255, 215, 160, 0.3)',
    borderRadius: '16px',
    padding: '16px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.55)',
  },
  modalTitle: {
    fontSize: '15px',
    color: '#f7e7b3',
    marginBottom: '6px',
    letterSpacing: '0.08em',
  },
  modalSubtitle: {
    fontSize: '12px',
    color: '#cbb78e',
    marginBottom: '10px',
  },
  modalStars: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  starButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '22px',
    padding: 0,
    lineHeight: 1,
  },
  starOn: {
    color: '#f5d68a',
    textShadow: '0 0 10px rgba(245, 214, 138, 0.5)',
  },
  starOff: {
    color: 'rgba(245, 214, 138, 0.35)',
  },
  modalInput: {
    width: '100%',
    minHeight: '90px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 215, 160, 0.2)',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '10px 12px',
    color: '#f8f1de',
    fontFamily: 'KaiTi, STKaiti, serif',
    fontSize: '14px',
    outline: 'none',
    resize: 'none',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '12px',
  },
  modalSubmit: {
    background: 'linear-gradient(120deg, #f5d68a, #f2b96d)',
    color: '#1a1206',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  modalThanks: {
    marginTop: '10px',
    color: '#f8f1de',
    fontSize: '13px',
  },
  error: {
    marginTop: '8px',
    color: '#fca5a5',
    fontSize: '13px',
  },
}

const MARKDOWN_STYLE = {
  h1: { fontSize: '18px', margin: '8px 0', color: '#f7e7b3' },
  h2: { fontSize: '16px', margin: '8px 0', color: '#f7e7b3' },
  h3: { fontSize: '15px', margin: '8px 0', color: '#f7e7b3' },
  p: { margin: '6px 0' },
  ul: { paddingLeft: '18px', margin: '6px 0' },
  ol: { paddingLeft: '18px', margin: '6px 0' },
  li: { marginBottom: '4px' },
  blockquote: {
    margin: '8px 0',
    paddingLeft: '10px',
    borderLeft: '2px solid rgba(255, 215, 160, 0.4)',
    color: '#f8f1de',
  },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '2px 6px',
    borderRadius: '6px',
    fontSize: '12px',
  },
  pre: {
    margin: '8px 0',
    padding: '10px',
    borderRadius: '10px',
    background: 'rgba(0, 0, 0, 0.35)',
    overflowX: 'auto',
  },
}

const markdownComponents = {
  h1: ({ node, ...props }) => <h1 style={MARKDOWN_STYLE.h1} {...props} />,
  h2: ({ node, ...props }) => <h2 style={MARKDOWN_STYLE.h2} {...props} />,
  h3: ({ node, ...props }) => <h3 style={MARKDOWN_STYLE.h3} {...props} />,
  p: ({ node, ...props }) => <p style={MARKDOWN_STYLE.p} {...props} />,
  ul: ({ node, ...props }) => <ul style={MARKDOWN_STYLE.ul} {...props} />,
  ol: ({ node, ...props }) => <ol style={MARKDOWN_STYLE.ol} {...props} />,
  li: ({ node, ...props }) => <li style={MARKDOWN_STYLE.li} {...props} />,
  blockquote: ({ node, ...props }) => <blockquote style={MARKDOWN_STYLE.blockquote} {...props} />,
  code: ({ inline, ...props }) =>
    inline ? <code style={MARKDOWN_STYLE.code} {...props} /> : <code style={MARKDOWN_STYLE.code} {...props} />,
  pre: ({ node, ...props }) => <pre style={MARKDOWN_STYLE.pre} {...props} />,
}

const parseLabeledSections = (text) => {
  const matches = []
  SECTION_LABELS.forEach((label) => {
    const regex = new RegExp(`(^|\\n)\\s*(?:#{1,3}\\s*)?${label}\\s*[:：]?`, 'm')
    const match = regex.exec(text)
    if (match) {
      matches.push({ label, index: match.index, length: match[0].length })
    }
  })

  if (matches.length < 2) return []
  matches.sort((a, b) => a.index - b.index)

  return matches.map((item, idx) => {
    const start = item.index + item.length
    const end = idx < matches.length - 1 ? matches[idx + 1].index : text.length
    const content = text.slice(start, end).trim()
    return {
      title: item.label,
      content: content || '暂无内容。',
    }
  })
}

const splitIntoSections = (text) => {
  const numbered = text.match(/(?:^|\\n)\\d[\\).][\\s\\S]*?(?=\\n\\d[\\).]|\\n*$)/g)
  if (numbered && numbered.length >= 2) {
    return numbered.map((section) => section.trim()).filter(Boolean)
  }

  const headings = text.match(/(?:^|\\n)#{1,3}\\s[\\s\\S]*?(?=\\n#{1,3}\\s|\\n*$)/g)
  if (headings && headings.length >= 2) {
    return headings.map((section) => section.trim()).filter(Boolean)
  }

  return text
    .split(/\\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean)
}

const buildPages = (text) => {
  const labeled = parseLabeledSections(text)
  if (labeled.length >= 2) return labeled

  const sections = splitIntoSections(text)
  if (sections.length > 0) {
    return sections.map((section, index) => ({
      title: `第${index + 1}步`,
      content: section,
    }))
  }

  const trimmed = text.trim()
  return trimmed
    ? [
        {
          title: '解读',
          content: trimmed,
        },
      ]
    : []
}

const getSectionContent = (pages, label) => {
  if (!Array.isArray(pages)) return ''
  const match = pages.find((page) => page.title === label)
  return match ? match.content : ''
}

const getNextStep = (step) => {
  const index = READING_STEPS.indexOf(step)
  if (index === -1) return 'focus_card_1'
  return READING_STEPS[index + 1] || 'idle'
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const findMarkerMatch = (text, patterns) => {
  let best = null
  patterns.forEach((pattern) => {
    const match = text.match(pattern)
    if (!match || match.index == null) return
    if (!best || match.index < best.index) {
      best = { index: match.index, length: match[0].length }
    }
  })
  return best
}

const splitSingleCardContent = (text, cardsMeta) => {
  if (!text || !Array.isArray(cardsMeta) || cardsMeta.length === 0) return []
  const cardCount = cardsMeta.length
  const cleanSection = (value) => {
    let content = String(value || '').trim()
    content = content.replace(/^\s*(\*\*|__)\s*/, '')
    content = content.replace(
      /^\s*(?:\*\*\s*)?(?:第\s*)?([1-3]|一|二|三)\s*(?:张|牌)?\s*[).、:：·-]\s*(?:\*\*)?\s*/m,
      ''
    )
    content = content.replace(/(\*\*|__)\s*$/g, '')
    return content.trim()
  }

  const splitByMarkers = (markers) => {
    if (!markers.length) return []
    const sorted = markers.slice().sort((a, b) => a.index - b.index)
    const sections = Array(cardCount).fill('')
    let nextFallback = 0
    const claimFallbackIndex = () => {
      while (nextFallback < cardCount && sections[nextFallback]) {
        nextFallback += 1
      }
      if (nextFallback >= cardCount) return null
      const idx = nextFallback
      nextFallback += 1
      return idx
    }

    sorted.forEach((marker, idx) => {
      const start = marker.index + marker.length
      const end = idx < sorted.length - 1 ? sorted[idx + 1].index : text.length
      const content = cleanSection(text.slice(start, end))
      const preferredIndex =
        Number.isInteger(marker.cardIndex) && marker.cardIndex >= 0 && marker.cardIndex < cardCount
          ? marker.cardIndex
          : null
      const targetIndex =
        preferredIndex !== null && !sections[preferredIndex]
          ? preferredIndex
          : claimFallbackIndex()
      if (targetIndex === null) return
      sections[targetIndex] = content
    })

    return sections
  }

  const buildCardMarker = (card, index) => {
    if (!card) return null
    const name = card.name || ''
    const orientation = card.orientationLabel || ''
    if (!name) return null
    const escapedName = escapeRegex(name)
    const escapedOrientation = orientation ? escapeRegex(orientation) : ''
    const numberPrefix =
      '(?:(?:第\\s*(?:[1-3]|一|二|三)\\s*(?:张|牌)?\\s*(?:[).、:：·-]\\s*)?)|(?:[1-3]|一|二|三)\\s*(?:张|牌)?\\s*(?:[).、:：·-]\\s*))?'
    const tail = '\\s*(?:[:：-]\\s*)?(?:\\*\\*)?'
    const patterns = [
      escapedOrientation
        ? new RegExp(
            `(^|\\n)\\s*(?:\\*\\*\\s*)?${numberPrefix}${escapedName}\\s*[（(]?\\s*${escapedOrientation}\\s*[)）]?${tail}`,
            'm'
          )
        : null,
      escapedOrientation
        ? new RegExp(
            `(^|\\n)\\s*(?:\\*\\*\\s*)?${escapedName}\\s*[（(]?\\s*${escapedOrientation}\\s*[)）]?${tail}`,
            'm'
          )
        : null,
    ].filter(Boolean)
    const marker = findMarkerMatch(text, patterns)
    return marker ? { ...marker, cardIndex: index } : null
  }

  const cardMarkers = cardsMeta.map((card, index) => buildCardMarker(card, index)).filter(Boolean)
  if (cardMarkers.length >= 2) {
    return splitByMarkers(cardMarkers)
  }

  const mapChineseNumber = (value) => {
    if (!value) return null
    if (value === '一') return 1
    if (value === '二') return 2
    if (value === '三') return 3
    return null
  }

  const numberedRegex =
    /(^|\n)\s*(?:\*\*\s*)?(?:第\s*)?([1-3]|一|二|三)\s*(?:张|牌)?\s*(?:[).、:：·-]|$)\s*(?:\*\*)?/g
  const numberedMarkers = []
  let numberedMatch = numberedRegex.exec(text)
  while (numberedMatch) {
    const rawNumber = numberedMatch[2]
    const parsed = Number.isNaN(Number(rawNumber))
      ? mapChineseNumber(rawNumber)
      : Number(rawNumber)
    const cardIndex = parsed ? parsed - 1 : null
    numberedMarkers.push({
      index: numberedMatch.index,
      length: numberedMatch[0].length,
      cardIndex,
    })
    numberedMatch = numberedRegex.exec(text)
  }

  if (numberedMarkers.length >= 2) {
    return splitByMarkers(numberedMarkers)
  }

  const sections = splitIntoSections(text)
  if (sections.length >= cardCount) {
    return sections.slice(0, cardCount).map((section) => cleanSection(section))
  }
  return []
}

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
    if (loading) return
    if (readingStep === 'summary') {
      handleReset()
      return
    }
    const nextStep = getNextStep(readingStep)
    setReadingStep(nextStep)
  }

  const handlePrevStep = () => {
    if (loading) return
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
  const captionTitle =
    focusIndex >= 0
      ? `第${focusIndex + 1}张${currentCardLabel ? ` · ${currentCardLabel}` : ''}`
      : '总结'
  const captionStepLabel = focusIndex >= 0 ? `${focusIndex + 1} / 3` : '总结'
  const showInputPanel = visible && readingStep === 'idle'
  const showCaptionPanel = visible && readingStep !== 'idle'
  const captionDisplayText = isStreaming ? answer : captionText
  const isCaptionLoading = loading && !captionDisplayText
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

  return (
    <>
      <style>{`
        @keyframes textFadeIn {
          from { opacity: 0.3; }
          to { opacity: 1; }
        `}</style>
      {showInputPanel && (
        <div
          style={{
            ...PANEL_STYLE.wrapper,
            opacity: 1,
            pointerEvents: 'auto',
            transform: 'translateX(-50%) translateY(0)',
            transition: 'all 500ms ease',
          }}
        >
          <div style={PANEL_STYLE.panel}>
            <div style={PANEL_STYLE.title}>解牌入口已成形</div>
            <div style={PANEL_STYLE.chips}>
              {chosenLabels.map((name) => (
                <span key={name} style={PANEL_STYLE.chip}>
                  {name}
                </span>
              ))}
            </div>
            <textarea
              placeholder="写下你的问题，比如：这段关系接下来会如何发展？"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              style={PANEL_STYLE.input}
            />
            <div style={PANEL_STYLE.actions}>
              <button
                type="button"
                style={{
                  ...PANEL_STYLE.secondaryButton,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
                onClick={handleReset}
                disabled={loading}
              >
                再算一卦
              </button>
              <button
                type="button"
                style={{
                  ...PANEL_STYLE.button,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <LoadingButton /> : '开始解牌'}
              </button>
            </div>
            {error && <div style={PANEL_STYLE.error}>{error}</div>}
          </div>
        </div>
      )}
      {showCaptionPanel && (
        <div
          style={{
            ...PANEL_STYLE.captionWrapper,
            opacity: 1,
            transform: 'translateX(-50%) translateY(0)',
            transition: 'all 500ms ease',
          }}
        >
          <div style={PANEL_STYLE.captionPanel}>
            <div style={PANEL_STYLE.captionHeader}>
              <div style={PANEL_STYLE.captionTitle}>{captionTitle}</div>
              <div style={PANEL_STYLE.captionStep}>{captionStepLabel}</div>
            </div>
            <div style={PANEL_STYLE.captionBody}>
              {isCaptionLoading ? (
                <LoadingButton />
              ) : captionDisplayText ? (
                <ReactMarkdown components={markdownComponents}>{captionDisplayText}</ReactMarkdown>
              ) : (
                <span>解读整理中…</span>
              )}
            </div>
            <div style={PANEL_STYLE.captionFooter}>
              <button
                type="button"
                style={{
                  ...PANEL_STYLE.secondaryButton,
                  padding: '8px 14px',
                  opacity: !canPrev || loading ? 0.45 : 1,
                  cursor: !canPrev || loading ? 'not-allowed' : 'pointer',
                }}
                onClick={handlePrevStep}
                disabled={!canPrev || loading}
              >
                上一张
              </button>
              <button
                type="button"
                style={{
                  ...PANEL_STYLE.button,
                  padding: '8px 16px',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
                onClick={handleNextStep}
                disabled={loading}
              >
                {nextLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      {showFeedback && (
        <div style={PANEL_STYLE.modalOverlay}>
          <div style={PANEL_STYLE.modalCard}>
            <div style={PANEL_STYLE.modalTitle}>你的感受很重要</div>
            <div style={PANEL_STYLE.modalSubtitle}>点亮星星，留下这一卦的回响。</div>
            <div style={PANEL_STYLE.modalStars}>
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1
                const active = value <= feedbackScore
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`评分 ${value} 星`}
                    style={{
                      ...PANEL_STYLE.starButton,
                      ...(active ? PANEL_STYLE.starOn : PANEL_STYLE.starOff),
                    }}
                    onClick={() => setFeedbackScore(value)}
                  >
                    {active ? '★' : '☆'}
                  </button>
                )
              })}
            </div>
            <textarea
              placeholder="写下你的反馈或感受（可选）"
              value={feedbackText}
              onChange={(event) => setFeedbackText(event.target.value)}
              style={PANEL_STYLE.modalInput}
            />
            <div style={PANEL_STYLE.modalActions}>
              <button
                type="button"
                style={{
                  ...PANEL_STYLE.modalSubmit,
                  opacity: isSubmittingFeedback || isFeedbackSuccess ? 0.7 : 1,
                  cursor: isSubmittingFeedback || isFeedbackSuccess ? 'not-allowed' : 'pointer',
                }}
                onClick={handleFeedbackSubmit}
                disabled={isSubmittingFeedback || isFeedbackSuccess}
              >
                {feedbackButtonLabel}
              </button>
            </div>
            {feedbackError && <div style={PANEL_STYLE.error}>{feedbackError}</div>}
            {isFeedbackSuccess && (
              <div style={PANEL_STYLE.modalThanks}>谢谢你的反馈，愿你被温柔指引。</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
