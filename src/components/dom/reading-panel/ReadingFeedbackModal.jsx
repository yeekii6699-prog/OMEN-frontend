import { PANEL_STYLE } from './readingStyles'

// 快速评价选项
const QUICK_OPTIONS = [
  { key: 'amazing', emoji: '👍', label: '准到离谱' },
  { key: 'normal', emoji: '🤔', label: '一般般' },
  { key: 'bad', emoji: '👎', label: '像瞎编的' },
]

export function ReadingFeedbackModal({
  feedbackScore,
  feedbackQuickOption,
  onScoreChange,
  onQuickOptionChange,
  feedbackText,
  onFeedbackTextChange,
  onSubmit,
  isSuccess,
  submitLabel,
}) {
  // 快速按钮选择处理（只更新快速选项，不影响星级评分）
  const handleQuickSelect = (key) => {
    onQuickOptionChange(key)
  }

  return (
    <div style={PANEL_STYLE.modalOverlay}>
      <div style={PANEL_STYLE.modalCard}>
        <div style={PANEL_STYLE.modalTitle}>你的感受很重要</div>
        <div style={PANEL_STYLE.modalSubtitle}>点亮星星，留下这一卦的回响。</div>

        {/* 快速选择按钮 */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
          {QUICK_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleQuickSelect(option.key)}
              style={{
                padding: '10px 16px',
                borderRadius: '20px',
                border: feedbackQuickOption === option.key ? '2px solid #d4a574' : '1px solid #e0e0e0',
                background: feedbackQuickOption === option.key ? 'rgba(212, 165, 116, 0.15)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '20px' }}>{option.emoji}</span>
              <span style={{ fontSize: '12px', color: '#666' }}>{option.label}</span>
            </button>
          ))}
        </div>

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
              opacity: isSuccess ? 0.7 : 1,
              cursor: isSuccess ? 'not-allowed' : 'pointer',
            }}
            onClick={onSubmit}
            disabled={isSuccess}
          >
            {isSuccess ? '已提交' : submitLabel}
          </button>
        </div>
        {isSuccess && <div style={PANEL_STYLE.modalThanks}>谢谢你的反馈，愿你被温柔指引。</div>}
      </div>
    </div>
  )
}
