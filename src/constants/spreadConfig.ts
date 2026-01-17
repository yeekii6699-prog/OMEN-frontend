/**
 * 塔罗牌阵配置 - Tarot Spread Configuration
 *
 * @description 定义不同牌阵的布局数据，支持动态切换
 *
 * 牌阵结构说明:
 * - id: 牌阵唯一标识
 * - displayName: 显示名称（如 "圣三角阵"、"六芒星阵"）
 * - cardCount: 需要抽取的卡牌数量
 * - description: 简短描述
 * - previewPositions: 预览阶段卡牌的 3D 位置
 * - slotPositions: SESSION 阶段的槽位位置
 * - positions: 每张牌在屏幕中央的最终位置 [x, y, z] 和旋转 [rx, ry, rz]
 *
 * 坐标说明:
 * - 相机默认在 [0, 0, 20] 位置
 * - Z 值越大越远，建议 16-20 之间
 * - X 水平分布，Y 垂直分布
 */

// ============================================
// 类型定义
// ============================================

export type SpreadId = 'trinity' | 'hexagram' | 'cross'

export interface SpreadPosition {
  position: [number, number, number]  // [x, y, z]
  rotation?: [number, number, number] // [rx, ry, rz]
}

export interface SpreadConfig {
  id: SpreadId
  displayName: string        // 显示名称（如 "圣三角阵"）
  cardCount: number          // 卡牌数量
  description: string        // 简短描述
  previewPositions: SpreadPosition[]  // 预览阶段位置
  slotPositions: SpreadPosition[]     // SESSION 槽位位置
  positions: SpreadPosition[] // 最终展示位置
}

// ============================================
// 牌阵配置
// ============================================

/**
 * 圣三角 (Trinity)
 * 经典的三张牌牌阵，代表过去-现在-未来的时间线
 */
export const TRINITY_SPREAD: SpreadConfig = {
  id: 'trinity',
  displayName: '圣三角阵',
  cardCount: 3,
  description: '过去 - 现在 - 未来',
  // 预览阶段：水平排列在眼前
  previewPositions: [
    { position: [-2.5, 0, 0], rotation: [0, Math.PI, 0] },   // 左
    { position: [0, 0, 0], rotation: [0, Math.PI, 0] },      // 中
    { position: [2.5, 0, 0], rotation: [0, Math.PI, 0] },    // 右
  ],
  // SESSION 槽位：略微抬高
  slotPositions: [
    { position: [-2.5, 0.5, 16], rotation: [0, 0, 0] },
    { position: [0, 0.5, 16], rotation: [0, 0, 0] },
    { position: [2.5, 0.5, 16], rotation: [0, 0, 0] },
  ],
  // 最终位置
  positions: [
    { position: [-2.5, 1.5, 16], rotation: [0, 0, 0] },      // 过去（左侧）
    { position: [0, 1.5, 16], rotation: [0, 0, 0] },         // 现在（中间）
    { position: [2.5, 1.5, 16], rotation: [0, 0, 0] },       // 未来（右侧）
  ],
}

/**
 * 六芒星 (Hexagram)
 * 经典的七张牌牌阵，六个方向 + 核心
 *
 * 结构：
 *         [0] 顶部
 *      [1] [2] 右上左下
 *    [4] [5] [3] [6] 环绕
 *
 * 六芒星几何计算：
 * - 中心: [0, 0, 0]
 * - 半径: 2.5
 * - 顶点角度: -90° (顶部), -30°, 30°, 90°, 150°, 210° (底部)
 */
export const HEXAGRAM_SPREAD: SpreadConfig = {
  id: 'hexagram',
  displayName: '六芒星阵',
  cardCount: 7,
  description: '六芒星阵 + 核心',
  // 预览阶段：六芒星布局在 Z=0 平面
  previewPositions: (() => {
    const radius = 2.5
    const positions: SpreadPosition[] = []

    // 中心
    positions.push({ position: [0, 0, 0], rotation: [0, Math.PI, 0] })

    // 六个顶点 (从顶部开始，顺时针)
    for (let i = 0; i < 6; i++) {
      const angle = (-90 + i * 60) * (Math.PI / 180) // 转换为弧度
      positions.push({
        position: [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0,
        ],
        rotation: [0, Math.PI, 0],
      })
    }

    return positions
  })(),
  // SESSION 槽位
  slotPositions: [
    { position: [0, 2.5, 16], rotation: [0, 0, 0] },            // [0] 顶部
    { position: [2.2, 1.2, 16], rotation: [0, 0, 0] },          // [1] 右上
    { position: [-2.2, 1.2, 16], rotation: [0, 0, 0] },         // [2] 左上
    { position: [0, -0.5, 16], rotation: [0, 0, 0] },           // [3] 底部
    { position: [2.2, -2.0, 16], rotation: [0, 0, 0] },         // [4] 右下
    { position: [-2.2, -2.0, 16], rotation: [0, 0, 0] },        // [5] 左下
    { position: [0, 0.8, 17.2], rotation: [0, 0, 0] },          // [6] 核心（稍微靠前）
  ],
  // 最终位置
  positions: [
    { position: [0, 2.5, 16], rotation: [0, 0, 0] },            // [0] 顶部
    { position: [2.2, 1.2, 16], rotation: [0, 0, 0] },          // [1] 右上
    { position: [-2.2, 1.2, 16], rotation: [0, 0, 0] },         // [2] 左上
    { position: [0, -0.5, 16], rotation: [0, 0, 0] },           // [3] 底部
    { position: [2.2, -2.0, 16], rotation: [0, 0, 0] },         // [4] 右下
    { position: [-2.2, -2.0, 16], rotation: [0, 0, 0] },        // [5] 左下
    { position: [0, 0.8, 17.2], rotation: [0, 0, 0] },          // [6] 核心（稍微靠前）
  ],
}

/**
 * 十字阵 (Cross)
 * 五张牌十字形布局，象征平衡与选择
 *
 * 结构：
 *       [0]
 *    [1] [2] [3]
 *       [4]
 *
 * 适合：面临抉择、需要平衡各方面的情况
 */
export const CROSS_SPREAD: SpreadConfig = {
  id: 'cross',
  displayName: '十字阵',
  cardCount: 5,
  description: '平衡与抉择',
  // 预览阶段：十字形在 Z=0 平面
  previewPositions: [
    { position: [0, 2.0, 0], rotation: [0, Math.PI, 0] },       // [0] 顶部
    { position: [-1.5, 0, 0], rotation: [0, Math.PI, 0] },      // [1] 左
    { position: [0, 0, 0], rotation: [0, Math.PI, 0] },         // [2] 中心
    { position: [1.5, 0, 0], rotation: [0, Math.PI, 0] },       // [3] 右
    { position: [0, -2.0, 0], rotation: [0, Math.PI, 0] },      // [4] 底部
  ],
  // SESSION 槽位
  slotPositions: [
    { position: [0, 2.0, 16], rotation: [0, 0, 0] },            // [0] 顶部
    { position: [-1.5, 0, 16], rotation: [0, 0, 0] },           // [1] 左
    { position: [0, 0, 16], rotation: [0, 0, 0] },              // [2] 中心
    { position: [1.5, 0, 16], rotation: [0, 0, 0] },            // [3] 右
    { position: [0, -2.0, 16], rotation: [0, 0, 0] },           // [4] 底部
  ],
  // 最终位置
  positions: [
    { position: [0, 2.5, 16], rotation: [0, 0, 0] },            // [0] 顶部
    { position: [-2.0, 0, 16], rotation: [0, 0, 0] },           // [1] 左
    { position: [0, 0, 16], rotation: [0, 0, 0] },              // [2] 中心
    { position: [2.0, 0, 16], rotation: [0, 0, 0] },            // [3] 右
    { position: [0, -2.5, 16], rotation: [0, 0, 0] },           // [4] 底部
  ],
}

// ============================================
// 导出
// ============================================

export const SPREADS: Record<SpreadId, SpreadConfig> = {
  trinity: TRINITY_SPREAD,
  hexagram: HEXAGRAM_SPREAD,
  cross: CROSS_SPREAD,
}

/**
 * 默认牌阵
 */
export const DEFAULT_SPREAD = TRINITY_SPREAD

/**
 * 获取指定牌阵配置
 */
export function getSpreadById(spreadId: SpreadId): SpreadConfig {
  return SPREADS[spreadId] || DEFAULT_SPREAD
}

/**
 * 获取所有牌阵列表
 */
export function getSpreadList(): SpreadConfig[] {
  return Object.values(SPREADS)
}

/**
 * 获取牌阵的预览位置数据
 */
export function getPreviewPositions(spreadId: SpreadId, isMobile = false): SpreadPosition[] {
  const spread = getSpreadById(spreadId)
  const scale = isMobile ? 0.82 : 1

  return spread.previewPositions.map((pos, index) => ({
    // 添加微小 Z 偏移，避免 Z-fighting（深度冲突）
    position: [
      pos.position[0] * scale,
      pos.position[1] * scale,
      pos.position[2] + index * 0.01, // 每张卡牌微调 Z 轴
    ] as [number, number, number],
    rotation: pos.rotation,
  }))
}

/**
 * 获取牌阵的槽位位置数据
 */
export function getSlotPositions(spreadId: SpreadId): SpreadPosition[] {
  const spread = getSpreadById(spreadId)
  return spread.slotPositions
}

/**
 * 获取牌阵的最终位置数据
 */
export function getSpreadPositions(spreadId: SpreadId, isMobile = false): [number, number, number][] {
  const spread = getSpreadById(spreadId)
  const scale = isMobile ? 0.82 : 1

  return spread.positions.map((pos) => {
    const [x, y, z] = pos.position
    return [x * scale, y * scale, z]
  })
}

/**
 * 生成随机预览卡牌索引（幽灵牌）
 * 用于牌阵预览动画，不消耗真实卡牌数据
 * @param cardCount 需要几张预览牌
 * @returns 随机卡牌索引数组（78张塔罗牌中的随机选择）
 */
export function pickRandomPreviewIndices(cardCount: number): number[] {
  const TOTAL_TAROT_CARDS = 78
  const indices: number[] = []

  while (indices.length < cardCount) {
    const randomIndex = Math.floor(Math.random() * TOTAL_TAROT_CARDS)
    // 避免重复
    if (!indices.includes(randomIndex)) {
      indices.push(randomIndex)
    }
  }

  return indices
}
