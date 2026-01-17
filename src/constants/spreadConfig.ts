/**
 * 塔罗牌阵配置 - Tarot Spread Configuration
 *
 * @description 定义不同牌阵的布局数据，支持动态切换
 *
 * 牌阵结构说明:
 * - id: 牌阵唯一标识
 * - displayName: 显示名称
 * - cardCount: 需要抽取的卡牌数量
 * - description: 简短描述
 * - instruction: 使用建议
 * - positionMeanings: 牌位含义数组
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

export type SpreadId =
  | 'single'
  | 'holy-trinity'
  | 'timeline'
  | 'four-elements'
  | 'diamond'
  | 'gypsy-cross'
  | 'choice'
  | 'hexagram'
  | 'interview'

export interface SpreadPosition {
  position: [number, number, number]  // [x, y, z]
  rotation?: [number, number, number] // [rx, ry, rz]
}

export interface SpreadConfig {
  id: SpreadId
  displayName: string        // 显示名称
  cardCount: number          // 卡牌数量
  description: string        // 简短描述
  instruction: string        // 使用建议
  positionMeanings: string[] // 牌位含义
  previewPositions: SpreadPosition[]  // 预览阶段位置（移动端）
  slotPositions: SpreadPosition[]     // SESSION 槽位位置
  positions: SpreadPosition[] // 最终展示位置
}

// ============================================
// 牌阵配置
// ============================================

/**
 * 单张牌 (Single Card)
 * 最简单直接的牌阵，适合快速获得指引或每日占卜
 */
export const SINGLE_SPREAD: SpreadConfig = {
  id: 'single',
  displayName: '单张牌',
  cardCount: 1,
  description: '最简单直接的牌阵，适合快速获得指引或每日占卜',
  instruction: '单张牌牌阵最重要的是「问题明确具体」，将焦点放在单一面向，才能让牌卡给出清晰直接的指引。',
  positionMeanings: [
    '这张牌代表当前问题',
  ],
  previewPositions: [
    { position: [0, 1, 0], rotation: [0, Math.PI, 0] },
  ],
  slotPositions: [
    { position: [0, 0, 16], rotation: [0, 0, 0] },
  ],
  positions: [
    { position: [0, 0, 16], rotation: [0, 0, 0] },
  ],
}

const MOBILE_SPREAD_SCALE = 0.82
const MOBILE_SESSION_LAYOUT_SCALE = 0.7 // keep in sync with StarRing mobileScale

/**
 * 圣三角牌阵 (Holy Trinity)
 * 倒三角形排列，象征稳定的三角结构
 * 布局：
 *      [0] 显性层面（顶点）
 * [1]隐性         [2]整合（底右）
 *      （底左）
 */
export const HOLY_TRINITY_SPREAD: SpreadConfig = {
  id: 'holy-trinity',
  displayName: '圣三角牌阵',
  cardCount: 3,
  description: '呈倒三角形排列，象征稳定的三角结构，适合探索问题的多个面向与内在关联',
  instruction: '圣三角牌阵强调问题的完整性与平衡。前两张牌代表问题的两个面向，第三张则给出整合性的指引，帮助你看清全貌。',
  positionMeanings: [
    '问题的显性层面：表面可见的状况',
    '问题的隐性层面：潜在的影响因素',
    '整合建议：如何平衡与应对',
  ],
  previewPositions: [
    { position: [0, 1.5, 0], rotation: [0, Math.PI, 0] },           // 上（显性，顶点）
    { position: [-1.5, 0, 0], rotation: [0, Math.PI, 0] },          // 左下（隐性）
    { position: [1.5, 0, 0], rotation: [0, Math.PI, 0] },           // 右下（整合）
  ],
  slotPositions: [
    { position: [0, 2.0, 16], rotation: [0, 0, 0] },                // 上
    { position: [-1.5, 0, 16], rotation: [0, 0, 0] },               // 左下
    { position: [1.5, 0, 16], rotation: [0, 0, 0] },                // 右下
  ],
  positions: [
    { position: [0, 2.0, 16], rotation: [0, 0, 0] },                // 上（顶点）
    { position: [-1.5, 0, 16], rotation: [0, 0, 0] },               // 左下
    { position: [1.5, 0, 16], rotation: [0, 0, 0] },                // 右下
  ],
}

/**
 * 三张牌阵 / 时间轴牌阵 (Timeline)
 * 经典的时间轴牌阵，过去、现在、未来
 */
export const TIMELINE_SPREAD: SpreadConfig = {
  id: 'timeline',
  displayName: '三张牌阵',
  cardCount: 3,
  description: '经典的时间轴牌阵，透过过去、现在、未来三个时间点，完整呈现事件的发展脉络与趋势',
  instruction: '三张牌阵特别适合了解事情的来龙去脉。在解读时要注意三张牌之间的连贯性，过去如何影响现在，现在又将如何导向未来。',
  positionMeanings: [
    '过去：影响现况的根源、背景因素',
    '现在：当前的状态、面临的课题',
    '未来：依目前情况发展的可能结果',
  ],
  previewPositions: [
    { position: [-1.5, 0, 0], rotation: [0, Math.PI, 0] },    // 左
    { position: [0, 0, 0], rotation: [0, Math.PI, 0] },       // 中
    { position: [1.5, 0, 0], rotation: [0, Math.PI, 0] },     // 右
  ],
  slotPositions: [
    { position: [-1.5, 0.5, 16], rotation: [0, 0, 0] },
    { position: [0, 0.5, 16], rotation: [0, 0, 0] },
    { position: [1.5, 0.5, 16], rotation: [0, 0, 0] },
  ],
  positions: [
    { position: [-1.5, 1.5, 16], rotation: [0, 0, 0] },       // 过去（左侧）
    { position: [0, 1.5, 16], rotation: [0, 0, 0] },          // 现在（中间）
    { position: [1.5, 1.5, 16], rotation: [0, 0, 0] },        // 未来（右侧）
  ],
}

/**
 * 四元素牌阵 (Four Elements)
 * 正方形布局，运用火、水、风、土四大元素的能量
 * 布局：
 *   [0]火(右上)  [1]水(左上)
 *   [2]风(左下)  [3]土(右下)
 */
export const FOUR_ELEMENTS_SPREAD: SpreadConfig = {
  id: 'four-elements',
  displayName: '四元素牌阵',
  cardCount: 4,
  description: '运用火、水、风、土四大元素的能量，全面分析问题的各个层面与平衡状态',
  instruction: '四元素牌阵帮助你看见问题的完整面貌。观察四个元素的平衡状态，找出需要加强或调整的部分。',
  positionMeanings: [
    '火元素：热情、行动力、创造力',
    '水元素：情感、直觉、潜意识',
    '风元素：思考、沟通、理性',
    '土元素：物质、实际、稳定',
  ],
  previewPositions: [
    { position: [1.2, 2.7, 0], rotation: [0, Math.PI, 0] },    // 火（右上）
    { position: [-1.2, 2.7, 0], rotation: [0, Math.PI, 0] },   // 水（左上）
    { position: [-1.2, 0.3, 0], rotation: [0, Math.PI, 0] },  // 风（左下）
    { position: [1.2, 0.3, 0], rotation: [0, Math.PI, 0] },   // 土（右下）
  ],
  slotPositions: [
    { position: [1.5, 1.5, 16], rotation: [0, 0, 0] },         // 火（右上）
    { position: [-1.5, 1.5, 16], rotation: [0, 0, 0] },        // 水（左上）
    { position: [-1.5, -1.5, 16], rotation: [0, 0, 0] },       // 风（左下）
    { position: [1.5, -1.5, 16], rotation: [0, 0, 0] },        // 土（右下）
  ],
  positions: [
    { position: [1.5, 1.5, 16], rotation: [0, 0, 0] },         // 火（右上）
    { position: [-1.5, 1.5, 16], rotation: [0, 0, 0] },        // 水（左上）
    { position: [-1.5, -1.5, 16], rotation: [0, 0, 0] },       // 风（左下）
    { position: [1.5, -1.5, 16], rotation: [0, 0, 0] },        // 土（右下）
  ],
}

/**
 * 钻石牌阵 (Diamond)
 * 四张牌组成菱形布局
 * 布局：
 *      [0] 核心（上）
 * [1]          [3]
 *      [2] 未来（下）
 */
export const DIAMOND_SPREAD: SpreadConfig = {
  id: 'diamond',
  displayName: '钻石牌阵',
  cardCount: 4,
  description: '四张牌组成钻石形状，快速聚焦问题核心，了解四个关键面向与发展方向',
  instruction: '钻石牌阵如同切割精准的宝石，从四个角度照亮问题的本质。中心牌是关键，左右两张代表外在与内在的影响力。',
  positionMeanings: [
    '问题的核心本质',
    '左侧影响：外在环境因素',
    '右侧影响：内在心理因素',
    '未来发展与建议',
  ],
  previewPositions: [
    { position: [0, 3.2, 0], rotation: [0, Math.PI, 0] },       // 上（核心）
    { position: [-1.6, 2, 0], rotation: [0, Math.PI, 0] },      // 左
    { position: [0, 0.8, 0], rotation: [0, Math.PI, 0] },      // 下（未来）
    { position: [1.6, 2, 0], rotation: [0, Math.PI, 0] },       // 右
  ],
  slotPositions: [
    { position: [0, 1.5, 16], rotation: [0, 0, 0] },            // 上
    { position: [-1.5, 0, 16], rotation: [0, 0, 0] },           // 左
    { position: [0, -1.5, 16], rotation: [0, 0, 0] },           // 下
    { position: [1.5, 0, 16], rotation: [0, 0, 0] },            // 右
  ],
  positions: [
    { position: [0, 1.5, 16], rotation: [0, 0, 0] },            // 上
    { position: [-1.5, 0, 16], rotation: [0, 0, 0] },           // 左
    { position: [0, -1.5, 16], rotation: [0, 0, 0] },           // 下
    { position: [1.5, 0, 16], rotation: [0, 0, 0] },            // 右
  ],
}

/**
 * 吉普赛十字法 (Gypsy Cross)
 * 经典的五张牌爱情占卜法，十字形布局
 * 布局：上→左→右→下→中
 */
export const GYPSY_CROSS_SPREAD: SpreadConfig = {
  id: 'gypsy-cross',
  displayName: '吉普赛十字法',
  cardCount: 5,
  description: '经典的五张牌爱情占卜法，以十字形布局探索感情关系的核心问题与发展方向',
  instruction: '吉普赛十字法是探索爱情关系的经典牌阵。中心牌是关键，代表关系的本质。四个方向的牌则揭示不同层面的影响。',
  positionMeanings: [
    '上：精神层面的连结与理想',
    '左：过去的影响与经验',
    '右：未来的发展与可能',
    '下：物质层面的基础与现实',
    '中：关系的核心与当前状态',
  ],
  previewPositions: [
    { position: [0, 4.2, 0], rotation: [0, Math.PI, 0] },      // 上
    { position: [-1.5, 2, 0], rotation: [0, Math.PI, 0] },     // 左
    { position: [1.5, 2, 0], rotation: [0, Math.PI, 0] },      // 右
    { position: [0, -0.2, 0], rotation: [0, Math.PI, 0] },     // 下
    { position: [0, 2, 0], rotation: [0, Math.PI, 0] },        // 中
  ],
  slotPositions: [
    { position: [0, 2.0, 16], rotation: [0, 0, 0] },           // 上
    { position: [-1.5, 0, 16], rotation: [0, 0, 0] },          // 左
    { position: [1.5, 0, 16], rotation: [0, 0, 0] },           // 右
    { position: [0, -2.0, 16], rotation: [0, 0, 0] },          // 下
    { position: [0, 0, 16], rotation: [0, 0, 0] },             // 中
  ],
  positions: [
    { position: [0, 2.5, 16], rotation: [0, 0, 0] },           // 上
    { position: [-2.0, 0, 16], rotation: [0, 0, 0] },          // 左
    { position: [2.0, 0, 16], rotation: [0, 0, 0] },           // 右
    { position: [0, -2.5, 16], rotation: [0, 0, 0] },          // 下
    { position: [0, 0, 16], rotation: [0, 0, 0] },             // 中
  ],
}

/**
 * 二择一牌阵 (Choice)
 * 当面临两个选择时，帮助清楚看见两条路径的优缺点
 */
export const CHOICE_SPREAD: SpreadConfig = {
  id: 'choice',
  displayName: '二择一牌阵',
  cardCount: 5,
  description: '当面临两个选择时，这个牌阵能帮助你清楚看见两条路径的优缺点和可能结果',
  instruction: '二择一牌阵提供客观的视角来比较两个选项。不要只看正面或负面，要综合考量每个选择的完整面貌。',
  positionMeanings: [
    '当前处境与选择的起点',
    '选择A的优势与正面影响',
    '选择A的挑战与负面影响',
    '选择B的优势与正面影响',
    '选择B的挑战与负面影响',
  ],
  previewPositions: [
    { position: [0, 4, 0], rotation: [0, Math.PI, 0] },      // 当前
    { position: [-1.5, 2.5, 0], rotation: [0, Math.PI, 0] },   // A优
    { position: [-1.5, 0.2, 0], rotation: [0, Math.PI, 0] },  // A劣
    { position: [1.5, 2.5, 0], rotation: [0, Math.PI, 0] },    // B优
    { position: [1.5, 0.2, 0], rotation: [0, Math.PI, 0] },   // B劣
  ],
  slotPositions: [
    { position: [0, 2.5, 16], rotation: [0, 0, 0] },           // 当前
    { position: [-2.0, 0.5, 16], rotation: [0, 0, 0] },        // A优
    { position: [-2.0, -1.5, 16], rotation: [0, 0, 0] },       // A劣
    { position: [2.0, 0.5, 16], rotation: [0, 0, 0] },         // B优
    { position: [2.0, -1.5, 16], rotation: [0, 0, 0] },        // B劣
  ],
  positions: [
    { position: [0, 2.5, 16], rotation: [0, 0, 0] },           // 当前
    { position: [-2.0, 0.5, 16], rotation: [0, 0, 0] },        // A优
    { position: [-2.0, -1.5, 16], rotation: [0, 0, 0] },       // A劣
    { position: [2.0, 0.5, 16], rotation: [0, 0, 0] },         // B优
    { position: [2.0, -1.5, 16], rotation: [0, 0, 0] },        // B劣
  ],
}

/**
 * 六芒星牌阵 (Hexagram)
 * 象征天地合一的神秘牌阵，七张牌呈现完整面貌
 * 中心牌Z值最小，最靠近相机
 */
export const HEXAGRAM_SPREAD: SpreadConfig = {
  id: 'hexagram',
  displayName: '六芒星牌阵',
  cardCount: 7,
  description: '象征天地合一的神秘牌阵，七张牌呈现问题的内在与外在、过去与未来的完整面貌',
  instruction: '六芒星代表上下、内外、阴阳的平衡。中心牌是灵魂，六个角点则从不同维度照亮问题的全貌。',
  positionMeanings: [
    '顶点：灵性指引与更高视角',
    '右上：未来的可能性',
    '右下：外在行动与表现',
    '底部：物质基础与现实',
    '左下：内在情感与直觉',
    '左上：过去的影响',
    '中心：问题的核心本质',
  ],
  previewPositions: [
    { position: [0, 1.9, 0], rotation: [0, Math.PI, 0] },             // 中心（最前）
    { position: [0, 4, 0.3], rotation: [0, Math.PI, 0] },         // 顶点
    { position: [1.7, 3, 0.3], rotation: [0, Math.PI, 0] },       // 右上
    { position: [1.7, 0.8, 0.3], rotation: [0, Math.PI, 0] },      // 右下
    { position: [0, -0.3, 0.3], rotation: [0, Math.PI, 0] },        // 底部
    { position: [-1.7, 0.8, 0.3], rotation: [0, Math.PI, 0] },     // 左下
    { position: [-1.7, 3, 0.3], rotation: [0, Math.PI, 0] },      // 左上
  ],
  slotPositions: [
    { position: [0, 0, 15.5], rotation: [0, 0, 0] },                // 中心（最前）
    { position: [0, 2.5, 16], rotation: [0, 0, 0] },                // 顶点
    { position: [2.2, 1.2, 16], rotation: [0, 0, 0] },              // 右上
    { position: [2.2, -1.2, 16], rotation: [0, 0, 0] },             // 右下
    { position: [0, -2.5, 16], rotation: [0, 0, 0] },               // 底部
    { position: [-2.2, -1.2, 16], rotation: [0, 0, 0] },            // 左下
    { position: [-2.2, 1.2, 16], rotation: [0, 0, 0] },             // 左上
  ],
  positions: [
    { position: [0, 0, 15.5], rotation: [0, 0, 0] },                // 中心（最前）
    { position: [0, 2.5, 16], rotation: [0, 0, 0] },                // 顶点
    { position: [2.2, 1.2, 16], rotation: [0, 0, 0] },              // 右上
    { position: [2.2, -1.2, 16], rotation: [0, 0, 0] },             // 右下
    { position: [0, -2.5, 16], rotation: [0, 0, 0] },               // 底部
    { position: [-2.2, -1.2, 16], rotation: [0, 0, 0] },            // 左下
    { position: [-2.2, 1.2, 16], rotation: [0, 0, 0] },             // 左上
  ],
}

/**
 * 面试求职牌阵 (Interview)
 * 五张牌组成十字形，专为面试求职设计
 */
export const INTERVIEW_SPREAD: SpreadConfig = {
  id: 'interview',
  displayName: '面试求职牌阵',
  cardCount: 5,
  description: '五张牌组成十字形，专为面试求职设计，揭示职位适配度、个人优势、潜在挑战与成功关键',
  instruction: '面试求职牌阵帮助你全面了解求职过程。专注于具体的职位或公司，让牌阵揭示你的优势、挑战以及如何提升成功机会。',
  positionMeanings: [
    '当前状态：你目前的求职状况与心态',
    '你的优势：能吸引面试官的特质与能力',
    '潜在挑战：需要注意或改善的部分',
    '职位适配：这份工作与你的契合度',
    '最终结果：面试的可能结果与发展',
  ],
  previewPositions: [
    { position: [0, 4.2, 0], rotation: [0, Math.PI, 0] },       // 当前
    { position: [-1.5, 2, 0], rotation: [0, Math.PI, 0] },      // 优势
    { position: [0, 2, 0], rotation: [0, Math.PI, 0] },         // 挑战
    { position: [1.5, 2, 0], rotation: [0, Math.PI, 0] },       // 适配
    { position: [0, -0.2, 0], rotation: [0, Math.PI, 0] },      // 结果
  ],
  slotPositions: [
    { position: [0, 2.5, 16], rotation: [0, 0, 0] },            // 当前
    { position: [-2.0, 0, 16], rotation: [0, 0, 0] },           // 优势
    { position: [0, 0, 16], rotation: [0, 0, 0] },              // 挑战
    { position: [2.0, 0, 16], rotation: [0, 0, 0] },            // 适配
    { position: [0, -2.5, 16], rotation: [0, 0, 0] },           // 结果
  ],
  positions: [
    { position: [0, 2.5, 16], rotation: [0, 0, 0] },            // 当前
    { position: [-2.0, 0, 16], rotation: [0, 0, 0] },           // 优势
    { position: [0, 0, 16], rotation: [0, 0, 0] },              // 挑战
    { position: [2.0, 0, 16], rotation: [0, 0, 0] },            // 适配
    { position: [0, -2.5, 16], rotation: [0, 0, 0] },           // 结果
  ],
}

// ============================================
// 导出
// ============================================

export const SPREADS: Record<SpreadId, SpreadConfig> = {
  single: SINGLE_SPREAD,
  'holy-trinity': HOLY_TRINITY_SPREAD,
  timeline: TIMELINE_SPREAD,
  'four-elements': FOUR_ELEMENTS_SPREAD,
  diamond: DIAMOND_SPREAD,
  'gypsy-cross': GYPSY_CROSS_SPREAD,
  choice: CHOICE_SPREAD,
  hexagram: HEXAGRAM_SPREAD,
  interview: INTERVIEW_SPREAD,
}

/**
 * 默认牌阵
 */
export const DEFAULT_SPREAD = SINGLE_SPREAD

/**
 * 获取指定牌阵配置
 */
export function getSpreadById(spreadId: SpreadId): SpreadConfig {
  return SPREADS[spreadId] || DEFAULT_SPREAD
}

/**
 * 获取所有牌阵列表（按预设顺序）
 */
export function getSpreadList(): SpreadConfig[] {
  const order: SpreadId[] = [
    'single',
    'holy-trinity',
    'timeline',
    'four-elements',
    'diamond',
    'gypsy-cross',
    'choice',
    'hexagram',
    'interview',
  ]
  return order.map((id) => SPREADS[id])
}

/**
 * 获取牌阵的预览位置数据
 * @param spreadId 牌阵 ID
 * @param isMobile 是否移动端（桌面端时 Y 坐标会减 1）
 */
export function getPreviewPositions(
  spreadId: SpreadId,
  isMobile = true,
  mode: 'preview' | 'session' = 'session'
): SpreadPosition[] {
  const spread = getSpreadById(spreadId)
  const yOffset = isMobile ? 0 : -1 // 桌面端 Y 坐标减 1

  // 添加微小 Z 偏移避免 Z-fighting
  const sessionScale =
    isMobile && mode === 'session'
      ? MOBILE_SPREAD_SCALE / MOBILE_SESSION_LAYOUT_SCALE
      : 1

  return spread.previewPositions.map((pos, index) => ({
    position: [
      pos.position[0] * sessionScale,
      (pos.position[1] + yOffset) * sessionScale,
      pos.position[2] + index * 0.01,
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
  const scale = isMobile ? MOBILE_SPREAD_SCALE : 1

  return spread.positions.map((pos) => {
    const [x, y, z] = pos.position
    return [x * scale, y * scale, z]
  })
}

// ============================================
// 移动端相机距离配置（固定值）
// ============================================

// ============================================
// 移动端预览相机 Z 距离配置
// ============================================
//
// 【重要概念】
// 牌阵组件本身的 Z 位置 = PREVIEW_Z (12)
// 相机默认 Z 位置 = this value
// 相机到牌阵的实际距离 = this value - 12
//
// 【调试指南】
// - 值越小 → 距离越近 → 牌阵看起来越大
// - 值越大 → 距离越远 → 牌阵看起来越小
//
// 【建议范围】
// - 简单牌阵(1-3张牌): 16-18 (拉近，大一点)
// - 中等牌阵(4-5张牌): 20-24 (适中)
// - 复杂牌阵(6-7张牌): 24-28 (拉远，全貌展示)
//
// 【计算示例】
//   Z=18 → 距离=6 → 放大视角
//   Z=22 → 距离=10 → 标准视角
//   Z=26 → 距离=14 → 全局视角
//
const PREVIEW_CAMERA_Z_MAP: Record<SpreadId, number> = {
  single: 18,        // 单张牌：距离 6，最近
  'holy-trinity': 20, // 圣三角：距离 8
  timeline: 20,       // 三张牌：距离 8
  'four-elements': 20, // 四元素：距离 8
  diamond: 20,        // 钻石牌阵：距离 10
  choice: 22,         // 二择一：距离 11
  hexagram: 22,       // 六芒星：距离 11
  interview: 22,      // 面试求职：距离 11
  'gypsy-cross': 22,  // 吉普赛十字：距离 14，最远
}

/**
 * 获取给定牌阵的相机 Z 距离（移动端）
 * @param spreadId 牌阵 ID
 * @param isMobile 是否移动端
 * @returns 相机 Z 坐标（移动端根据牌阵类型返回不同值，桌面端固定 18）
 */
export function getPreviewCameraZ(spreadId: SpreadId, isMobile = true): number {
  if (!isMobile) return 18 // 桌面端固定距离
  return PREVIEW_CAMERA_Z_MAP[spreadId] ?? 18
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
    if (!indices.includes(randomIndex)) {
      indices.push(randomIndex)
    }
  }

  return indices
}
