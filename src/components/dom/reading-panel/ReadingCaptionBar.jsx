import ReactMarkdown from 'react-markdown'
import { PANEL_STYLE, markdownComponents } from './readingStyles'

const normalizeMarkdown = (text) => {
  if (!text) return ''
  let normalized = text
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\uFF0A\uFE61\u2217]/g, '*')
    .replace(/\uFF3F/g, '_')
    .replace(/\uFF03/g, '#')
    .replace(/\\([*_#])/g, '$1')
    .replace(/\*\*\s+([^*]+?)\s+\*\*/g, '**$1**')
    .replace(/__\s+([^_]+?)\s+__/g, '__$1__')

  const lines = normalized.split('\n')
  const nonEmptyLines = lines.filter((line) => line.trim())
  const indents = nonEmptyLines
    .map((line) => line.match(/^[ \t]+/)?.[0] ?? '')
    .filter(Boolean)
  if (indents.length) {
    const minIndent = Math.min(
      ...indents.map((indent) => indent.replace(/\t/g, '    ').length)
    )
    if (minIndent >= 4) {
      const indentRegex = new RegExp(`^[ \\t]{${minIndent}}`)
      normalized = lines.map((line) => line.replace(indentRegex, '')).join('\n')
    }
  }

  return normalized
}

export function ReadingCaptionBar({
  wrapperStyle,
  title,
  stepLabel,
  body,
  isLoading,
  loadingNode,
  placeholder,
  onPrev,
  onNext,
  canPrev,
  isStepDisabled,
  isPrevDisabled = false,
  isNextDisabled,
  nextLabel,
  showControls = true,
  showNext = true,
  extraAction,
}) {
  const prevDisabled = !canPrev || isPrevDisabled
  const nextDisabled = typeof isNextDisabled === 'boolean' ? isNextDisabled : isStepDisabled
  const normalizedBody = typeof body === 'string' ? normalizeMarkdown(body) : body

  return (
    <div style={wrapperStyle}>
      <div style={PANEL_STYLE.captionPanel}>
        <div style={PANEL_STYLE.captionHeader}>
          <div style={PANEL_STYLE.captionTitle}>{title}</div>
          <div style={PANEL_STYLE.captionStep}>{stepLabel}</div>
        </div>
        <div style={PANEL_STYLE.captionBody}>
          {isLoading ? (
            loadingNode
          ) : normalizedBody ? (
            <ReactMarkdown components={markdownComponents}>{normalizedBody}</ReactMarkdown>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
        {showControls && (
          <div style={PANEL_STYLE.captionFooter}>
            <button
              type="button"
              style={{
                ...PANEL_STYLE.secondaryButton,
                padding: '8px 14px',
                opacity: prevDisabled ? 0.45 : 1,
                cursor: prevDisabled ? 'not-allowed' : 'pointer',
              }}
              onClick={onPrev}
              disabled={prevDisabled}
            >
              上一张
            </button>
            {showNext && (
              <button
                type="button"
                style={{
                  ...PANEL_STYLE.button,
                  padding: '8px 16px',
                  opacity: nextDisabled ? 0.7 : 1,
                  cursor: nextDisabled ? 'not-allowed' : 'pointer',
                }}
                onClick={onNext}
                disabled={nextDisabled}
              >
                {nextLabel}
              </button>
            )}
          </div>
        )}
        {extraAction && (
          <div style={{ marginTop: '8px', display: 'flex' }}>{extraAction}</div>
        )}
      </div>
    </div>
  )
}
