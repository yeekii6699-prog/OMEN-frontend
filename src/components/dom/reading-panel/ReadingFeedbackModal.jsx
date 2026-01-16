import { PANEL_STYLE } from './readingStyles'

export function ReadingFeedbackModal({
  feedbackScore,
  onScoreChange,
  feedbackText,
  onFeedbackTextChange,
  onSubmit,
  isSubmitting,
  isSuccess,
  error,
  submitLabel,
}) {
  return (
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
                onClick={() => onScoreChange(value)}
              >
                {active ? '★' : '☆'}
              </button>
            )
          })}
        </div>
        <textarea
          placeholder="写下你的反馈或感受（可选）"
          value={feedbackText}
          onChange={onFeedbackTextChange}
          style={PANEL_STYLE.modalInput}
        />
        <div style={PANEL_STYLE.modalActions}>
          <button
            type="button"
            style={{
              ...PANEL_STYLE.modalSubmit,
              opacity: isSubmitting || isSuccess ? 0.7 : 1,
              cursor: isSubmitting || isSuccess ? 'not-allowed' : 'pointer',
            }}
            onClick={onSubmit}
            disabled={isSubmitting || isSuccess}
          >
            {submitLabel}
          </button>
        </div>
        {error && <div style={PANEL_STYLE.error}>{error}</div>}
        {isSuccess && <div style={PANEL_STYLE.modalThanks}>谢谢你的反馈，愿你被温柔指引。</div>}
      </div>
    </div>
  )
}
