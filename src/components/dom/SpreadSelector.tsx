'use client'

import { useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { getSpreadById, SpreadId } from '@/constants/spreadConfig'

/**
 * 牌阵选择器组件
 *
 * 在 PREVIEW 阶段显示，用于选择和确认牌阵
 */
export function SpreadSelector() {
  // 先获取所有 store 值，使用一致的默认值
  const phase = useGameStore((state) => state.phase || 'PORTAL')
  const currentSpreadIdRaw = useGameStore((state) => state.currentSpreadId)
  const previewSpreadIndex = useGameStore((state) => state.previewSpreadIndex || 0)
  const availableSpreadsRaw = useGameStore((state) => state.availableSpreads)
  const nextSpread = useGameStore((state) => state.nextSpread)
  const prevSpread = useGameStore((state) => state.prevSpread)
  const confirmSpread = useGameStore((state) => state.confirmSpread)

  // 使用安全的默认值（确保值稳定）
  const currentSpreadId = (currentSpreadIdRaw || 'single') as SpreadId
  const availableSpreads = (availableSpreadsRaw || [
    'single',
    'holy-trinity',
    'timeline',
    'four-elements',
    'diamond',
    'gypsy-cross',
    'choice',
    'hexagram',
    'interview',
  ]) as SpreadId[]

  // 使用 useMemo 避免重新计算 - 必须在条件检查之前声明
  const spread = useMemo(() => getSpreadById(currentSpreadId), [currentSpreadId])
  const totalSpreads = useMemo(() => availableSpreads.length, [availableSpreads])

  // 键盘事件处理 - 必须在条件检查之前声明
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (phase !== 'PREVIEW') return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          prevSpread()
          break
        case 'ArrowRight':
          e.preventDefault()
          nextSpread()
          break
        case 'Enter':
          e.preventDefault()
          confirmSpread()
          break
      }
    },
    [phase, nextSpread, prevSpread, confirmSpread]
  )

  // 绑定键盘事件 - 必须在条件检查之前声明
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // 只在 PREVIEW 阶段显示 - 必须在所有 hooks 之后
  const isPreviewPhase = phase === 'PREVIEW'
  if (!isPreviewPhase) return null

  return (
    <div style={SELECTOR_STYLE.wrapper}>
      <motion.div
        style={SELECTOR_STYLE.panel}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* 牌阵信息区域 */}
        <motion.div
          key={currentSpreadId}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          style={SELECTOR_STYLE.infoArea}
          onClick={confirmSpread}
        >
          {/* 左箭头 */}
          <ArrowButton direction="left" onClick={(e) => { e.stopPropagation(); prevSpread() }} />

          {/* 牌阵名称和描述 */}
          <div style={SELECTOR_STYLE.content}>
            <div style={SELECTOR_STYLE.name}>
              <span style={SELECTOR_STYLE.nameText}>{spread.displayName}</span>
              <span style={SELECTOR_STYLE.cardCount}>({spread.cardCount}张)</span>
            </div>
            <div style={SELECTOR_STYLE.description}>{spread.description}</div>
          </div>

          {/* 右箭头 */}
          <ArrowButton direction="right" onClick={(e) => { e.stopPropagation(); nextSpread() }} />
        </motion.div>

        {/* 确认按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          style={SELECTOR_STYLE.buttonArea}
        >
          <button
            style={SELECTOR_STYLE.confirmButton}
            onClick={confirmSpread}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)'
              e.currentTarget.style.boxShadow = '0 0 30px rgba(245, 214, 138, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            选择此牌阵
          </button>
        </motion.div>

        {/* 分页指示器 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={SELECTOR_STYLE.indicators}
        >
          {availableSpreads.map((_, index) => (
            <motion.div
              key={index}
              style={{
                ...SELECTOR_STYLE.indicator,
                background: index === previewSpreadIndex ? '#f5d68a' : 'rgba(255, 215, 160, 0.3)',
              }}
              animate={{
                scale: index === previewSpreadIndex ? 1.3 : 1,
              }}
            />
          ))}
        </motion.div>

        {/* 操作提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.4 }}
          style={SELECTOR_STYLE.hint}
        >
          ← → 切换牌阵 | Enter 确认
        </motion.div>
      </motion.div>
    </div>
  )
}

/**
 * 箭头按钮组件
 */
function ArrowButton({
  direction,
  onClick,
}: {
  direction: 'left' | 'right'
  onClick: (e: React.MouseEvent) => void
}) {
  const isLeft = direction === 'left'

  return (
    <motion.button
      style={SELECTOR_STYLE.arrowButton}
      onClick={onClick}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          transform: isLeft ? 'rotate(180deg)' : 'none',
        }}
      >
        <path
          d="M5 12H19M19 12L12 5M19 12L12 19"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.button>
  )
}

/**
 * 牌阵选择器样式
 */
const SELECTOR_STYLE = {
  wrapper: {
    position: 'fixed' as const,
    left: '50%',
    bottom: '40px',
    transform: 'translateX(-50%)',
    width: 'min(92vw, 480px)',
    zIndex: 30,
  },
  panel: {
    background: 'rgba(10, 12, 14, 0.85)',
    border: '1px solid rgba(255, 215, 160, 0.25)',
    borderRadius: '20px',
    padding: '20px 24px',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px',
  },
  infoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '12px',
    transition: 'background 0.2s',
  },
  content: {
    flex: 1,
    textAlign: 'center' as const,
    minWidth: 0,
  },
  name: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '6px',
  },
  nameText: {
    fontFamily: 'KaiTi, STKaiti, serif',
    fontSize: '20px',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #f7e7b3 0%, #f5d68a 50%, #f2b96d 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 30px rgba(247, 231, 179, 0.3)',
  },
  cardCount: {
    fontFamily: 'KaiTi, STKaiti, serif',
    fontSize: '14px',
    color: 'rgba(247, 231, 179, 0.6)',
  },
  description: {
    fontFamily: 'KaiTi, STKaiti, serif',
    fontSize: '13px',
    color: 'rgba(203, 183, 142, 0.8)',
    letterSpacing: '0.05em',
  },
  arrowButton: {
    background: 'rgba(255, 215, 160, 0.08)',
    color: '#f2e6c9',
    border: '1px solid rgba(255, 215, 160, 0.25)',
    borderRadius: '12px',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  buttonArea: {
    width: '100%',
  },
  confirmButton: {
    width: '100%',
    background: 'linear-gradient(120deg, #f5d68a 0%, #f2b96d 50%, #f0a55a 100%)',
    color: '#1a1206',
    fontFamily: 'KaiTi, STKaiti, serif',
    fontSize: '15px',
    fontWeight: 600,
    letterSpacing: '0.15em',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.25s ease',
  },
  indicators: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'all 0.3s',
  },
  hint: {
    fontSize: '11px',
    color: 'rgba(255, 215, 160, 0.4)',
    letterSpacing: '0.1em',
    textAlign: 'center' as const,
  },
}

export default SpreadSelector
