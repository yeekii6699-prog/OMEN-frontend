export const CHOSEN_POSITIONS = [
  [-2.5, 1.5, 16],
  [0, 1.5, 16],
  [2.5, 1.5, 16],
]

export const getChosenPositions = (isMobile, options = {}) => {
  const { compact = false } = options
  const ringScale = isMobile ? 0.82 : 1
  const compactScale = compact && isMobile ? 0.75 : 1
  const xScale = ringScale * compactScale
  const chosenZ = isMobile ? 18 : CHOSEN_POSITIONS[0][2]
  return CHOSEN_POSITIONS.map(([x, y]) => [x * xScale, y * ringScale, chosenZ])
}
