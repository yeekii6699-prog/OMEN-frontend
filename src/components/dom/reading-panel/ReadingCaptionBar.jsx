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
  nextLabel,
}) {
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
        <div style={PANEL_STYLE.captionFooter}>
          <button
            type="button"
            style={{
              ...PANEL_STYLE.secondaryButton,
              padding: '8px 14px',
              opacity: !canPrev || isStepDisabled ? 0.45 : 1,
              cursor: !canPrev || isStepDisabled ? 'not-allowed' : 'pointer',
            }}
            onClick={onPrev}
            disabled={!canPrev || isStepDisabled}
          >
            上一张
          </button>
          <button
            type="button"
            style={{
              ...PANEL_STYLE.button,
              padding: '8px 16px',
              opacity: isStepDisabled ? 0.7 : 1,
              cursor: isStepDisabled ? 'not-allowed' : 'pointer',
            }}
            onClick={onNext}
            disabled={isStepDisabled}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
