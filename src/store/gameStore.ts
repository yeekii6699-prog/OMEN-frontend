import { create } from 'zustand'
import { getSpreadById, SpreadId } from '@/constants/spreadConfig'

// ============================================
// 类型定义 (Type Definitions)
// ============================================

/**
 * 游戏阶段枚举 - 对应用户体验流程
 */
export type GamePhase =
  | 'PORTAL'   // 入口，显示图腾
  | 'WARP'     // 穿越动画中
  | 'PREVIEW'  // 牌阵预览选择
  | 'SESSION'  // 对话与数据采集
  | 'BURST'    // 结算前的坍缩动画
  | 'REVEAL'   // 最终结果页

export type ReadingStep =
  | 'idle'
  | 'focus_card_1'
  | 'focus_card_2'
  | 'focus_card_3'
  | 'summary'
  | 'awaiting_user_input'
  | 'consultation_result'

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

/**
 * 阅读流程阶段 - 塔罗牌解读流程
 */
export type ReadingPhase =
  | 'IDLE'       // 初始状态，星环缓慢旋转
  | 'ZOOMING'    // 镜头正在拉近
  | 'SELECTING'  // 展示预览牌阵，等待切换或确认
  | 'DRAWING'    // 抽牌模式
  | 'REVEALING'  // 翻牌展示结果
  | 'SUMMARY'    // 解牌总结

/**
 * 牌阵动画状态
 */
export type SpreadAnimationState =
  | 'idle'           // 静止
  | 'shattering'     // 破碎动画中（旧牌阵散开）
  | 'previewing'     // 预览动画进行中
  | 'preview_wait'   // 预览完成，等待开始
  | 'resetting'      // 归位动画中
  | 'drawing'        // 抽牌动画中

// ============================================
// Store 定义 (Store Definition)
// ============================================

interface GameState {
  // ---------- State ----------
  /** 当前游戏阶段 */
  phase: GamePhase
  /** 阅读流程阶段 */
  readingPhase: ReadingPhase
  /** 牌阵动画状态 */
  spreadAnimationState: SpreadAnimationState
  /** 当前牌阵 ID */
  currentSpreadId: SpreadId
  /** 当前预览的牌阵索引 */
  previewSpreadIndex: number
  /** 可用牌阵列表 */
  availableSpreads: SpreadId[]
  /** 预览动画的卡牌索引 */
  previewCardIndices: number[]
  /** 是否可以开始抽牌 */
  canStartDrawing: boolean
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
  /** 法阵点亮脉冲 */
  portalPulseId: number
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
  /** 触发法阵点亮 */
  triggerPortalPulse: () => void
  /** 设置解牌输入状态 */
  setReadingReady: (ready: boolean) => void
  /** 设置解读步骤 */
  setReadingStep: (step: ReadingStep) => void
  /** 重置游戏状态 */
  resetGame: () => void
  /** 设置阅读流程阶段 */
  setReadingPhase: (phase: ReadingPhase) => void
  /** 设置牌阵动画状态 */
  setSpreadAnimationState: (state: SpreadAnimationState) => void
  /** 设置当前牌阵 ID */
  setCurrentSpreadId: (id: SpreadId) => void
  /** 开始预览动画 */
  startPreviewAnimation: (indices: number[]) => void
  /** 开始归位动画 */
  startResetAnimation: () => void
  /** 切换牌阵（带破碎动画） */
  switchSpread: (newSpreadId: SpreadId) => void
  /** 已填充的坑位索引（slotIndex -> cardIndex） */
  filledSlots: Record<number, number>
  /** 当前牌阵总坑位数 */
  totalSlots: number
  /** 填充一个坑位 */
  fillSlot: (slotIndex: number, cardIndex: number) => void
  /** 检查并完成抽牌 */
  checkAndCompleteDrawing: () => void
  /** 切换到下一个牌阵（循环） */
  nextSpread: () => void
  /** 切换到上一个牌阵（循环） */
  prevSpread: () => void
  /** 确认选择牌阵，进入 SESSION 阶段 */
  confirmSpread: () => void
  /** 直接设置牌阵索引 */
  setPreviewSpreadIndex: (index: number) => void
}

const initialState = {
  phase: 'PORTAL' as GamePhase,
  readingPhase: 'IDLE' as ReadingPhase,
  spreadAnimationState: 'idle' as SpreadAnimationState,
  currentSpreadId: 'trinity' as SpreadId,
  previewSpreadIndex: 0,
  availableSpreads: ['trinity', 'hexagram', 'cross'] as SpreadId[],
  previewCardIndices: [],
  canStartDrawing: false,
  filledSlots: {},
  totalSlots: getSpreadById('trinity').cardCount,
  history: [],
  currentHesitation: null,
  revealedIndices: [],
  selectedIndices: [],
  cardOrientations: {},
  portalHolding: false,
  portalPulseId: 0,
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

  triggerPortalPulse: () =>
    set((state) => ({
      portalPulseId: state.portalPulseId + 1,
    })),

  setReadingReady: (ready) => set({ readingReady: ready }),

  setReadingStep: (readingStep) => set({ readingStep }),

  resetGame: () =>
    set((state) => ({
      ...initialState,
      sessionId: state.sessionId + 1,
    })),

  setReadingPhase: (readingPhase) => set({ readingPhase }),

  setSpreadAnimationState: (spreadAnimationState) => set({ spreadAnimationState }),

  setCurrentSpreadId: (currentSpreadId) =>
    set({
      currentSpreadId,
      totalSlots: getSpreadById(currentSpreadId).cardCount,
    }),

  startPreviewAnimation: (previewCardIndices) =>
    set({
      previewCardIndices,
      spreadAnimationState: 'previewing',
      canStartDrawing: false,
    }),

  startResetAnimation: () =>
    set({
      spreadAnimationState: 'resetting',
      previewCardIndices: [],
      canStartDrawing: false,
    }),

  switchSpread: (newSpreadId) =>
    // 注意：实际的状态更新由组件监听 shattering 状态后执行
    // 这里只设置破碎状态，动画完成后组件会调用 setCurrentSpreadId 和 startPreviewAnimation
    set({
      spreadAnimationState: 'shattering',
      currentSpreadId: newSpreadId, // 先更新 ID，动画组件根据这个 ID 渲染新牌阵
    }),

  fillSlot: (slotIndex, cardIndex) =>
    set((state) => ({
      filledSlots: {
        ...state.filledSlots,
        [slotIndex]: cardIndex,
      },
    })),

  checkAndCompleteDrawing: () =>
    set((state) => {
      const filledCount = Object.keys(state.filledSlots).length
      if (filledCount >= state.totalSlots) {
        return {
          readingPhase: 'REVEALING',
          spreadAnimationState: 'idle',
        }
      }
      return {}
    }),

  nextSpread: () =>
    set((state) => {
      const nextIndex = (state.previewSpreadIndex + 1) % state.availableSpreads.length
      const nextSpreadId = state.availableSpreads[nextIndex]
      return {
        previewSpreadIndex: nextIndex,
        currentSpreadId: nextSpreadId,
        totalSlots: getSpreadById(nextSpreadId).cardCount,
      }
    }),

  prevSpread: () =>
    set((state) => {
      const prevIndex = (state.previewSpreadIndex - 1 + state.availableSpreads.length) % state.availableSpreads.length
      const prevSpreadId = state.availableSpreads[prevIndex]
      return {
        previewSpreadIndex: prevIndex,
        currentSpreadId: prevSpreadId,
        totalSlots: getSpreadById(prevSpreadId).cardCount,
      }
    }),

  confirmSpread: () =>
    set((state) => {
      const confirmedSpreadId = state.availableSpreads[state.previewSpreadIndex]
      return {
        phase: 'SESSION',
        currentSpreadId: confirmedSpreadId,
        totalSlots: getSpreadById(confirmedSpreadId).cardCount,
        readingPhase: 'DRAWING',
      }
    }),

  setPreviewSpreadIndex: (index) =>
    set((state) => {
      const spreadId = state.availableSpreads[index]
      return {
        previewSpreadIndex: index,
        currentSpreadId: spreadId,
        totalSlots: getSpreadById(spreadId).cardCount,
      }
    }),
}))
