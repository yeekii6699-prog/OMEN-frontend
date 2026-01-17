import { PANEL_STYLE } from './readingStyles'

export function ReadingInputPanel({
  wrapperStyle,
  chosenLabels,
  question,
  onQuestionChange,
  onQuestionKeyDown,
  onRandomQuestion,
  onSubmit,
  loading,
  error,
  loadingNode,
}) {
  return (
    <div style={wrapperStyle}>
      <div style={PANEL_STYLE.panel}>
        <div style={PANEL_STYLE.title}>解牌入口已成形</div>
        <div style={PANEL_STYLE.chips}>
          {chosenLabels.map((name) => (
            <span key={name} style={PANEL_STYLE.chip}>
              {name}
            </span>
          ))}
        </div>
        <div style={PANEL_STYLE.inputRow}>
          <textarea
            placeholder="写下你的问题，比如：这段关系接下来会如何发展？"
            value={question}
            onChange={onQuestionChange}
            onKeyDown={onQuestionKeyDown}
            style={PANEL_STYLE.input}
          />
          <button
            type="button"
            style={{
              ...PANEL_STYLE.swapButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onClick={onRandomQuestion}
            disabled={loading}
          >
            换一个
          </button>
        </div>
        <div style={PANEL_STYLE.actions}>
          <button
            type="button"
            style={{
              ...PANEL_STYLE.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? loadingNode || '开始解牌' : '开始解牌'}
          </button>
        </div>
        {error && <div style={PANEL_STYLE.error}>{error}</div>}
      </div>
    </div>
  )
}
