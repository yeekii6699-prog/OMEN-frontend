export const CHOSEN_POSITIONS = [
  [-2.5, 1.5, 16],
  [0, 1.5, 16],
  [2.5, 1.5, 16],
]

export const getChosenPositions = (isMobile) => {
  const ringScale = isMobile ? 0.82 : 1
  const chosenZ = isMobile ? 18 : CHOSEN_POSITIONS[0][2]
  return CHOSEN_POSITIONS.map(([x, y]) => [x * ringScale, y * ringScale, chosenZ])
}
