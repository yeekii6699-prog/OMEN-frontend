'use client'

import { useMemo } from 'react'
import { useGameStore } from '@/store/gameStore'
import { getSlotPositions } from '@/constants/spreadConfig'

/**
 * 牌阵槽位组件
 *
 * 在 DRAWING 阶段显示空槽位
 * 仅作为占位，卡牌会从星环飞入这些位置
 */
export function SpreadSlots() {
  // Store 状态
  const currentSpreadId = useGameStore((state) => state.currentSpreadId) || 'trinity'
  const filledSlots = useGameStore((state) => state.filledSlots) || {}
  const readingPhase = useGameStore((state) => state.readingPhase) || 'IDLE'

  // 派生数据 - 必须在条件检查之前声明
  const slotPositions = getSlotPositions(currentSpreadId)

  // 找出已填充的槽位索引 - 必须在条件检查之前声明
  const filledIndices = useMemo(() => {
    return Object.keys(filledSlots).map(Number)
  }, [filledSlots])

  // 只在 DRAWING 阶段显示槽位 - 必须在所有 hooks 之后
  if (readingPhase !== 'DRAWING') return null

  return (
    <group>
      {slotPositions.map((pos, index) => (
        <group
          key={`${currentSpreadId}-${index}`}
          position={pos.position}
          rotation={pos.rotation || [0, 0, 0]}
        />
      ))}
    </group>
  )
}

export default SpreadSlots
