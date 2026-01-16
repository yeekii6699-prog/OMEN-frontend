import ReactMarkdown from 'react-markdown'
import { PANEL_STYLE, markdownComponents } from './readingStyles'

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
}) {
  const prevDisabled = !canPrev || isPrevDisabled
  const nextDisabled = typeof isNextDisabled === 'boolean' ? isNextDisabled : isStepDisabled

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
          ) : body ? (
            <ReactMarkdown components={markdownComponents}>{body}</ReactMarkdown>
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
      </div>
    </div>
  )
}
