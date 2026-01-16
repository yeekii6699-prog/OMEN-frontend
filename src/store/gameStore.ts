import { create } from 'zustand'

// ============================================
// 类型定义 (Type Definitions)
// ============================================

/**
 * 游戏阶段枚举 - 对应用户体验流程
 */
export type GamePhase =
  | 'PORTAL'   // 入口，显示图腾
  | 'WARP'     // 穿越动画中
  | 'SESSION'  // 对话与数据采集
  | 'BURST'    // 结算前的坍缩动画
  | 'REVEAL'   // 最终结果页

export type ReadingStep =
  | 'idle'
  | 'focus_card_1'
  | 'focus_card_2'
  | 'focus_card_3'
  | 'summary'

/**
 * 犹豫指标数据结构 - 采集用户输入行为特征
 */
export interface HesitationMetrics {
  /** 犹豫得分 (1-100) */
  hesitation_score: number
  /** 输入耗时 (毫秒) */
  duration_ms: number
  /** 最终字符数 */
  char_count: number
  /** 回退/删除次数 */
  backspace_count: number
}

/**
 * 对话轮次 - 存储单条消息记录
 */
export interface ChatTurn {
  /** 角色: user 或 agent */
  role: 'user' | 'agent'
  /** 消息内容 */
  content: string
  /** 用户消息的犹豫指标 (agent 消息不携带) */
  metrics?: HesitationMetrics
}

export type CardOrientation = 'upright' | 'reversed'

// ============================================
// Store 定义 (Store Definition)
// ============================================

interface GameState {
  // ---------- State ----------
  /** 当前游戏阶段 */
  phase: GamePhase
  /** 对话历史记录 */
  history: ChatTurn[]
  /** 当前正在计算的犹豫值 (临时状态) */
  currentHesitation: HesitationMetrics | null
  /** 已翻开的卡牌索引 */
  revealedIndices: number[]
  /** 已选中的卡牌索引 */
  selectedIndices: number[]
  /** 卡牌正逆位（key 为卡牌索引） */
  cardOrientations: Record<number, CardOrientation>
  /** 法阵长按状态 */
  portalHolding: boolean
  /** 解牌输入是否就绪 */
  readingReady: boolean
  /** 沉浸式解读步骤 */
  readingStep: ReadingStep
  /** 轮次标识，用于触发前端重置 */
  sessionId: number

  // ---------- Actions ----------
  /** 切换游戏阶段 */
  setPhase: (phase: GamePhase) => void
  /** 添加对话记录 (用户消息必须附带 metrics) */
  addMessage: (message: ChatTurn) => void
  /** 标记翻开卡牌 */
  revealCard: (index: number) => void
  /** 设置已选中的卡牌 */
  setSelectedIndices: (indices: number[]) => void
  /** 设置卡牌正逆位 */
  setCardOrientation: (index: number, orientation: CardOrientation) => void
  /** 设置法阵长按状态 */
  setPortalHolding: (holding: boolean) => void
  /** 设置解牌输入状态 */
  setReadingReady: (ready: boolean) => void
  /** 设置解读步骤 */
  setReadingStep: (step: ReadingStep) => void
  /** 重置游戏状态 */
  resetGame: () => void
}

const initialState = {
  phase: 'PORTAL' as GamePhase,
  history: [],
  currentHesitation: null,
  revealedIndices: [],
  selectedIndices: [],
  cardOrientations: {},
  portalHolding: false,
  readingReady: false,
  readingStep: 'idle' as ReadingStep,
  sessionId: 0,
}

/**
 * 游戏状态管理 Store
 *
 * 使用示例:
 * ```ts
 * import { useGameStore } from '@/store/gameStore'
 *
 * function MyComponent() {
 *   const { phase, setPhase, addMessage } = useGameStore()
 *   // ...
 * }
 * ```
 */
export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  addMessage: (message) =>
    set((state) => ({
      history: [...state.history, message],
      // 用户发送消息后清空临时犹豫状态
      currentHesitation: message.role === 'user' ? null : state.currentHesitation,
    })),

  revealCard: (index) =>
    set((state) =>
      state.revealedIndices.includes(index)
        ? state
        : { revealedIndices: [...state.revealedIndices, index] }
    ),

  setSelectedIndices: (indices) => set({ selectedIndices: indices }),

  setCardOrientation: (index, orientation) =>
    set((state) => ({
      cardOrientations: {
        ...state.cardOrientations,
        [index]: orientation,
      },
    })),

  setPortalHolding: (holding) => set({ portalHolding: holding }),

  setReadingReady: (ready) => set({ readingReady: ready }),

  setReadingStep: (readingStep) => set({ readingStep }),

  resetGame: () =>
    set((state) => ({
      ...initialState,
      sessionId: state.sessionId + 1,
    })),
}))
