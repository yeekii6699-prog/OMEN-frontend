/**
 * 塔罗牌常量配置
 *
 * 所有涉及卡片尺寸的地方都应该引用这里，保持一致
 */

// 卡片尺寸（与 TarotCard 组件保持一致）
export const CARD_SIZE = {
  width: 1.2,
  height: 2,
} as const

// 卡片宽高比
export const CARD_ASPECT_RATIO = CARD_SIZE.width / CARD_SIZE.height

// 卡片边框宽度（相对于卡片尺寸的比例）
export const CARD_BORDER_RATIO = 0.08

// 计算边框实际尺寸
export const CARD_BORDER_SIZE = {
  width: CARD_SIZE.width * CARD_BORDER_RATIO,
  height: CARD_SIZE.height * CARD_BORDER_RATIO,
}
