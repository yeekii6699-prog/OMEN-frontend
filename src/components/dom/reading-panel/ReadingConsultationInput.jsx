import { PANEL_STYLE } from './readingStyles'

export function ReadingConsultationInput({
  wrapperStyle,
  value,
  onChange,
  onKeyDown,
  onSubmit,
  isLoading,
  error,
  sendLabel,
  loadingNode,
}) {
  return (
    <div style={wrapperStyle}>
      <div style={PANEL_STYLE.consultationPanel}>
        <textarea
          placeholder="我想说..."
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          style={PANEL_STYLE.consultationInput}
          rows={2}
          disabled={isLoading}
        />
        <button
          type="button"
          style={{
            ...PANEL_STYLE.consultationSend,
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
          onClick={onSubmit}
          disabled={isLoading}
        >
          {isLoading ? loadingNode || sendLabel : sendLabel}
        </button>
      </div>
      {error && <div style={PANEL_STYLE.error}>{error}</div>}
    </div>
  )
}
