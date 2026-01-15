'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useGameStore } from '@/store/gameStore'
import { TAROT_DATA } from '@/constants/tarotData'
const READING_ENDPOINT = '/api/reading'

const SECTION_LABELS = ['总体解读', '单牌解读', '行动建议']

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

export function ReadingPanel() {
  const revealedIndices = useGameStore((state) => state.revealedIndices) || []
  const selectedIndices = useGameStore((state) => state.selectedIndices) || []
  const readingReady = useGameStore((state) => state.readingReady) || false
  const resetGame = useGameStore((state) => state.resetGame) || (() => {})
  const [visible, setVisible] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pages, setPages] = useState([])
  const [pageIndex, setPageIndex] = useState(0)
  const [unlockedCount, setUnlockedCount] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackScore, setFeedbackScore] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackStatus, setFeedbackStatus] = useState('idle')
  const [feedbackError, setFeedbackError] = useState('')
  const swipeRef = useRef({ x: 0, y: 0 })
  const feedbackTimerRef = useRef(null)

  const chosenIndices = useMemo(() => {
    return selectedIndices.filter((index) => revealedIndices.includes(index)).slice(0, 3)
  }, [selectedIndices, revealedIndices])

  const chosenNames = useMemo(() => {
    return chosenIndices.map((index) => TAROT_DATA[index]?.nameCN).filter(Boolean)
  }, [chosenIndices])

  useEffect(() => {
    setVisible(readingReady && chosenNames.length === 3)
  }, [readingReady, chosenNames.length])

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (!readingReady) {
      setQuestion('')
      setAnswer('')
      setError('')
      setLoading(false)
      setPages([])
      setPageIndex(0)
      setUnlockedCount(0)
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
    if (!answer) {
      setPages([])
      setPageIndex(0)
      setUnlockedCount(0)
      setShowFeedback(false)
      setFeedbackScore(0)
      setFeedbackText('')
      setFeedbackStatus('idle')
      setFeedbackError('')
      return
    }
    const nextPages = buildPages(answer)
    setPages(nextPages)
    setPageIndex(0)
    setUnlockedCount(nextPages.length ? 1 : 0)
    setShowFeedback(false)
    setFeedbackScore(0)
    setFeedbackText('')
    setFeedbackStatus('idle')
    setFeedbackError('')
  }, [answer])

  useEffect(() => {
    if (!answer || pages.length === 0) return
    if (pageIndex === pages.length - 1 && feedbackStatus !== 'success') {
      setShowFeedback(true)
    }
  }, [answer, pages.length, pageIndex, feedbackStatus])

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
        feedbackTimerRef.current = null
      }
    }
  }, [])

  const handleSubmit = async () => {
    if (loading) return
    const trimmed = question.trim()
    if (!trimmed) {
      setError('先写下你的问题吧。')
      return
    }
    if (chosenNames.length < 3) {
      setError('卡牌还没准备好，再等一下。')
      return
    }

    setLoading(true)
    setError('')
    setAnswer('')

    try {
      const res = await fetch(READING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: trimmed,
          cards: chosenNames,
        }),
      })

      let data = null
      try {
        data = await res.json()
      } catch (parseError) {
        data = null
      }

      if (!res.ok) {
        setError(data?.error?.message || data?.error || '解牌失败了，请稍后再试。')
        setLoading(false)
        return
      }

      const content = data?.content?.trim()
      setAnswer(content || '解牌完成，但没有拿到内容。')
      setLoading(false)
    } catch (err) {
      setError('网络不太稳定，稍后再试。')
      setLoading(false)
    }
  }

  const handleReset = () => {
    if (loading) return
    resetGame()
    setQuestion('')
    setAnswer('')
    setError('')
    setPages([])
    setPageIndex(0)
    setUnlockedCount(0)
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

    fetch('/api/feishu/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: feedbackScore || null,
        feedback: feedbackText.trim(),
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

  const handlePrevPage = () => {
    if (pageIndex <= 0) return
    setPageIndex(pageIndex - 1)
  }

  const handleNextPage = () => {
    if (pages.length === 0) return
    if (pageIndex < unlockedCount - 1) {
      setPageIndex(pageIndex + 1)
      return
    }
    if (unlockedCount < pages.length) {
      const nextUnlocked = unlockedCount + 1
      setUnlockedCount(nextUnlocked)
      setPageIndex(nextUnlocked - 1)
    }
  }

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0]
    if (!touch) return
    swipeRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event) => {
    const touch = event.changedTouches?.[0]
    if (!touch) return
    const dx = touch.clientX - swipeRef.current.x
    const dy = touch.clientY - swipeRef.current.y
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) {
      handleNextPage()
    } else {
      handlePrevPage()
    }
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

  const totalPages = pages.length || 1
  const currentPage = pages[pageIndex] || { title: '解读', content: answer }
  const hasLockedNext = unlockedCount < totalPages && pageIndex >= unlockedCount - 1
  const nextLabel = hasLockedNext ? '继续揭示' : '下一页'
  const isSubmittingFeedback = feedbackStatus === 'submitting'
  const isFeedbackSuccess = feedbackStatus === 'success'
  const feedbackButtonLabel = isFeedbackSuccess ? '已提交' : isSubmittingFeedback ? '提交中…' : '提交反馈'

  return (
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
          {chosenNames.map((name) => (
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
            {loading ? '解牌中…' : '开始解牌'}
          </button>
        </div>
        {error && <div style={PANEL_STYLE.error}>{error}</div>}
        {answer && (
          <div style={PANEL_STYLE.answer}>
            <div style={PANEL_STYLE.answerHeader}>
              <div style={PANEL_STYLE.answerStep}>
                第 {Math.min(pageIndex + 1, totalPages)} 步 / {totalPages}
              </div>
              <div style={PANEL_STYLE.answerTitle}>{currentPage.title}</div>
              {hasLockedNext && <div style={PANEL_STYLE.answerHint}>继续揭示下一步</div>}
            </div>
            <div
              style={{
                ...PANEL_STYLE.answerCard,
                maxHeight: isMobile ? '32vh' : '40vh',
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <ReactMarkdown components={markdownComponents}>
                {currentPage.content || answer}
              </ReactMarkdown>
            </div>
            {totalPages > 1 && (
              <div style={PANEL_STYLE.pager}>
                <button
                  type="button"
                  style={{
                    ...PANEL_STYLE.pagerButton,
                    opacity: pageIndex === 0 ? 0.4 : 1,
                    cursor: pageIndex === 0 ? 'not-allowed' : 'pointer',
                  }}
                  onClick={handlePrevPage}
                  disabled={pageIndex === 0}
                >
                  上一页
                </button>
                <div style={PANEL_STYLE.pagerIndicator}>
                  {pageIndex + 1} / {totalPages}
                </div>
                <button
                  type="button"
                  style={{
                    ...PANEL_STYLE.pagerButton,
                    opacity: pageIndex >= totalPages - 1 && !hasLockedNext ? 0.4 : 1,
                    cursor: pageIndex >= totalPages - 1 && !hasLockedNext ? 'not-allowed' : 'pointer',
                  }}
                  onClick={handleNextPage}
                  disabled={pageIndex >= totalPages - 1 && !hasLockedNext}
                >
                  {nextLabel}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
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
    </div>
  )
}
