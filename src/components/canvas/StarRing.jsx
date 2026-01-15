'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'
import { TarotCard } from './TarotCard'
import { CardBurstEffect } from './CardBurstEffect'
import { RingToInputEffect } from './RingToInputEffect'

const TAROT_CARDS = 78
const RADIUS = 16
const MAX_SELECTED = 3
const MOBILE_BREAKPOINT = 768

const RING_CENTER = [0, -2, 0]
const CARD_SIZE = { width: 1.2, height: 2 }
const SELECTABLE_DOT = 0.15
const CHOSEN_POSITIONS = [
  [-2.5, 1.5, 16],
  [0, 1.5, 16],
  [2.5, 1.5, 16],
]

const HOVER = {
  lift: 0.25,
  wobbleAmplitude: 0.04,
  wobbleSpeed: 8,
  returnDamping: 12,
}

const FLOATING = {
  lift: 3,
  lerp: 0.08,
  gap: 0.3,
}

const ROTATION = {
  baseSpeed: 0.08,
  dragRotate: 0.002,
  maxExtraSpeed: 3,
  minInertiaSpeed: 0.6,
  inertiaDamping: 1.6,
}

const DRAG_PLANE = {
  width: 40,
  height: 20,
}

const getLayout = (isMobile) => {
  const ringScale = isMobile ? 0.82 : 1
  const ringCenter = [RING_CENTER[0], isMobile ? -2.6 : RING_CENTER[1], RING_CENTER[2]]
  const chosenZ = isMobile ? 18 : CHOSEN_POSITIONS[0][2]
  const chosenPositions = CHOSEN_POSITIONS.map(([x, y]) => [
    x * ringScale,
    y * ringScale,
    chosenZ,
  ])

  return {
    ringScale,
    ringCenter,
    chosenPositions,
    chosenScale: ringScale,
  }
}

const createCardLayout = (count, radius) => {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const rotationY = -angle + Math.PI / 2

    return { x, z, rotationY, key: i }
  })
}

const shuffleIndices = (count) => {
  const indices = Array.from({ length: count }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = indices[i]
    indices[i] = indices[j]
    indices[j] = temp
  }
  return indices
}

const getDeltaRotation = (dx) => dx * ROTATION.dragRotate

const clampExtraSpeed = (speed) => {
  return THREE.MathUtils.clamp(speed, -ROTATION.maxExtraSpeed, ROTATION.maxExtraSpeed)
}

const shouldApplyInertia = (speed) => Math.abs(speed) >= ROTATION.minInertiaSpeed

export function StarRing() {
  const { size } = useThree()
  const groupRef = useRef(null)
  const dragStateRef = useRef({
    active: false,
    lastX: 0,
    lastTime: 0,
  })
  const extraSpeedRef = useRef(0)
  const [hoveredCardKey, setHoveredCardKey] = useState(null)
  const [floatingCards, setFloatingCards] = useState([])
  const [inputStartPositions, setInputStartPositions] = useState([])
  const [inputActive, setInputActive] = useState(false)
  const phase = useGameStore((state) => state.phase) || 'PORTAL'
  const revealedIndices = useGameStore((state) => state.revealedIndices) || []
  const revealCard = useGameStore((state) => state.revealCard) || (() => {})
  const setSelectedIndices = useGameStore((state) => state.setSelectedIndices) || (() => {})
  const setReadingReady = useGameStore((state) => state.setReadingReady) || (() => {})
  const sessionId = useGameStore((state) => state.sessionId) || 0
  const sessionRef = useRef(sessionId)
  const isBurstOrReveal = phase === 'BURST' || phase === 'REVEAL'
  const isReveal = phase === 'REVEAL'
  const isSession = phase === 'SESSION'
  const canReveal = isReveal || floatingCards.length >= MAX_SELECTED
  const allChosenRevealed =
    floatingCards.length >= MAX_SELECTED &&
    floatingCards.every((card) => revealedIndices.includes(card.key))
  const shouldBurst = isBurstOrReveal || allChosenRevealed
  const isMobile = size.width < MOBILE_BREAKPOINT
  const layout = useMemo(() => getLayout(isMobile), [isMobile])

  useFrame((_state, delta) => {
    const group = groupRef.current
    if (!group) return

    const isPaused =
      dragStateRef.current.active || hoveredCardKey !== null || isBurstOrReveal || shouldBurst
    if (!isPaused) {
      extraSpeedRef.current = THREE.MathUtils.damp(
        extraSpeedRef.current,
        0,
        ROTATION.inertiaDamping,
        delta
      )

      const speed = ROTATION.baseSpeed + extraSpeedRef.current
      group.rotation.y += speed * delta
      return
    }

    if (!dragStateRef.current.active) {
      extraSpeedRef.current = THREE.MathUtils.damp(
        extraSpeedRef.current,
        0,
        ROTATION.inertiaDamping,
        delta
      )
    }
  })

  const shuffledIndices = useMemo(() => shuffleIndices(TAROT_CARDS), [sessionId])
  const cards = useMemo(
    () =>
      createCardLayout(TAROT_CARDS, RADIUS).map((card, index) => ({
        ...card,
        key: shuffledIndices[index],
      })),
    [shuffledIndices]
  )
  const selectedCardIndices = useMemo(() => floatingCards.map((card) => card.key), [floatingCards])
  const revealedSet = useMemo(() => new Set(revealedIndices), [revealedIndices])
  const floatingKeys = useMemo(() => new Set(selectedCardIndices), [selectedCardIndices])
  const ringCards = useMemo(
    () => cards.filter((card) => !floatingKeys.has(card.key)),
    [cards, floatingKeys]
  )
  const shouldCenterChosen = isBurstOrReveal || floatingCards.length >= CHOSEN_POSITIONS.length
  const chosenLayout = useMemo(() => {
    const count = floatingCards.length
    if (count === 0) return new Map()

    if (shouldCenterChosen) {
      return new Map(
        floatingCards.map((card, index) => [
          card.key,
          layout.chosenPositions[index] ||
            layout.chosenPositions[layout.chosenPositions.length - 1],
        ])
      )
    }

    const spacing = (CARD_SIZE.width + FLOATING.gap) * layout.ringScale
    const totalWidth = (count - 1) * spacing
    const startX = -totalWidth / 2
    const baseY = layout.ringCenter[1] + FLOATING.lift * layout.ringScale
    const baseZ = layout.ringCenter[2] + RADIUS * layout.ringScale

    return new Map(
      floatingCards.map((card, index) => [
        card.key,
        [startX + index * spacing, baseY, baseZ],
      ])
    )
  }, [floatingCards, layout, shouldCenterChosen])

  useEffect(() => {
    if (sessionRef.current !== sessionId) {
      sessionRef.current = sessionId
      return
    }
    setSelectedIndices(selectedCardIndices)
  }, [selectedCardIndices, setSelectedIndices, sessionId])

  useEffect(() => {
    setFloatingCards([])
    setHoveredCardKey(null)
    setInputActive(false)
    setInputStartPositions([])
    extraSpeedRef.current = 0
    dragStateRef.current.active = false
    if (groupRef.current) {
      groupRef.current.rotation.y = 0
    }
  }, [sessionId])

  useEffect(() => {
    if (!allChosenRevealed) {
      setReadingReady(false)
      setInputActive(false)
      setInputStartPositions([])
      return
    }
    if (inputActive) return
    if (!groupRef.current) return

    const positions = ringCards.map((card) => {
      const local = new THREE.Vector3(card.x, 0, card.z)
      return local.applyMatrix4(groupRef.current.matrixWorld)
    })
    setInputStartPositions(positions)
    setInputActive(true)
  }, [allChosenRevealed, inputActive, ringCards, setReadingReady])

  const capturePointer = (event) => {
    if (event.target?.setPointerCapture) event.target.setPointerCapture(event.pointerId)
  }

  const releasePointer = (event) => {
    if (event.target?.releasePointerCapture) event.target.releasePointerCapture(event.pointerId)
  }

  const startDrag = (event) => {
    if (shouldBurst || !isSession) return
    event.stopPropagation()
    capturePointer(event)

    dragStateRef.current.active = true
    dragStateRef.current.lastX = event.clientX
    dragStateRef.current.lastTime = performance.now()
    extraSpeedRef.current = 0
  }

  const updateDrag = (event) => {
    if (shouldBurst || !isSession) return
    const group = groupRef.current
    const dragState = dragStateRef.current
    if (!dragState.active || !group) return

    event.stopPropagation()
    const now = performance.now()
    const dx = event.clientX - dragState.lastX
    const dt = Math.max((now - dragState.lastTime) / 1000, 1 / 120)

    dragState.lastX = event.clientX
    dragState.lastTime = now

    const deltaRotation = getDeltaRotation(dx)
    group.rotation.y += deltaRotation

    const velocity = deltaRotation / dt
    extraSpeedRef.current = shouldApplyInertia(velocity)
      ? clampExtraSpeed(velocity)
      : 0
  }

  const endDrag = (event) => {
    if (!dragStateRef.current.active) return
    event.stopPropagation()
    releasePointer(event)
    dragStateRef.current.active = false
  }

  const handleCardHover = useCallback((key) => {
    setHoveredCardKey(key)
  }, [])

  const handleCardUnhover = useCallback((key) => {
    setHoveredCardKey((current) => (current === key ? null : current))
  }, [])

  const handleSelectCard = useCallback(
    (key, worldPosition) => {
      if (shouldBurst || !isSession) return
      setFloatingCards((current) => {
        if (current.length >= MAX_SELECTED) return current
        if (current.some((card) => card.key === key)) return current

        return [
          ...current,
          {
            key,
            start: [worldPosition.x, worldPosition.y, worldPosition.z],
          },
        ]
      })
      setHoveredCardKey(null)
    },
    [shouldBurst, isSession]
  )

  const handleRevealCard = useCallback(
    (index) => {
      if (!canReveal) return
      revealCard(index)
    },
    [canReveal, revealCard]
  )

  return (
    <group>
      <group ref={groupRef} position={layout.ringCenter} scale={layout.ringScale}>
        <mesh
          onPointerDown={startDrag}
          onPointerMove={updateDrag}
          onPointerUp={endDrag}
          onPointerOut={endDrag}
          onPointerCancel={endDrag}
        >
          <planeGeometry args={[DRAG_PLANE.width, DRAG_PLANE.height]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {ringCards.map((card) => (
          <RingCard
            key={`${sessionId}-${card.key}`}
            card={card}
            ringCenter={layout.ringCenter}
            isHovered={hoveredCardKey === card.key}
            isBursting={shouldBurst}
            canInteract={isSession && !shouldBurst}
            onHover={handleCardHover}
            onUnhover={handleCardUnhover}
            onSelect={handleSelectCard}
          />
        ))}
      </group>
      {floatingCards.map((card) => (
        <ChosenCard
          key={card.key}
          start={card.start}
          target={chosenLayout.get(card.key) || card.start}
          cardKey={card.key}
          isRevealed={revealedSet.has(card.key)}
          isChosen={true} // 选中时就开始加载图片
          canReveal={canReveal}
          onReveal={handleRevealCard}
          chosenScale={layout.chosenScale}
        />
      ))}
      <RingToInputEffect
        active={inputActive}
        startPositions={inputStartPositions}
        onComplete={() => setReadingReady(true)}
      />
    </group>
  )
}

function RingCard({
  card,
  ringCenter,
  isHovered,
  isBursting,
  canInteract,
  onHover,
  onUnhover,
  onSelect,
}) {
  const groupRef = useRef(null)
  const cardRef = useRef(null)
  const [isGone, setIsGone] = useState(false)
  const { camera } = useThree()
  const ringCenterVec = useMemo(() => new THREE.Vector3(...ringCenter), [ringCenter])
  const basePosition = useMemo(() => new THREE.Vector3(card.x, 0, card.z), [card.x, card.z])
  const baseRotation = useMemo(() => new THREE.Euler(-0.1, card.rotationY, 0), [card.rotationY])
  const localPosition = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const localRotation = useMemo(() => new THREE.Euler(0, 0, 0), [])
  const cardPos = useMemo(() => new THREE.Vector3(), [])
  const toCard = useMemo(() => new THREE.Vector3(), [])
  const toCamera = useMemo(() => new THREE.Vector3(), [])
  const worldPosition = useMemo(() => new THREE.Vector3(), [])
  const tapRef = useRef({ id: null, x: 0, y: 0, pointerType: '' })

  useFrame(({ clock }, delta) => {
    const group = groupRef.current
    if (!group || isBursting) return

    const time = clock.elapsedTime
    const hoverActive = isHovered
    const wobble = hoverActive ? Math.sin(time * HOVER.wobbleSpeed) * HOVER.wobbleAmplitude : 0
    const targetY = hoverActive ? HOVER.lift + wobble * 0.3 : 0

    group.position.set(basePosition.x, basePosition.y + targetY, basePosition.z)
    group.rotation.set(
      baseRotation.x,
      baseRotation.y,
      THREE.MathUtils.damp(group.rotation.z, baseRotation.z + wobble, HOVER.returnDamping, delta)
    )
    group.scale.setScalar(1)
  })

  const isSelectable = () => {
    if (!groupRef.current || !canInteract || isBursting) return false
    groupRef.current.getWorldPosition(cardPos)
    toCard.subVectors(cardPos, ringCenterVec).normalize()
    toCamera.subVectors(camera.position, ringCenterVec).normalize()
    return toCard.dot(toCamera) > SELECTABLE_DOT
  }

  const handlePointerOver = (event) => {
    if (!isSelectable()) return
    event.stopPropagation()
    onHover(card.key)
  }

  const handlePointerOut = (event) => {
    event.stopPropagation()
    onUnhover(card.key)
  }

  const handlePointerDown = (event) => {
    if (event.pointerType !== 'touch') return
    tapRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pointerType: event.pointerType,
    }
  }

  const handlePointerUp = (event) => {
    if (event.pointerType !== 'touch') return
    const tap = tapRef.current
    if (tap.id !== event.pointerId) return
    const dx = event.clientX - tap.x
    const dy = event.clientY - tap.y
    tapRef.current.id = null

    if (Math.hypot(dx, dy) > 8) return
    if (!isSelectable()) return
    if (!groupRef.current) return

    event.stopPropagation()
    groupRef.current.getWorldPosition(worldPosition)
    onSelect(card.key, worldPosition)
  }

  const handleDoubleClick = () => {
    if (!isSelectable()) return
    if (!groupRef.current) return

    groupRef.current.getWorldPosition(worldPosition)
    onSelect(card.key, worldPosition)
  }

  if (isGone) return null

  return (
    <group ref={groupRef} position={[card.x, 0, card.z]} rotation={[-0.1, card.rotationY, 0]}>
      <TarotCard
        ref={cardRef}
        index={card.key}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        isRevealed={false}
        showFront={false}
        backDoubleSided
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onCardDoubleClick={handleDoubleClick}
      />
      <CardBurstEffect
        active={isBursting}
        seed={card.key}
        targetRef={cardRef}
        basePosition={localPosition}
        baseRotation={localRotation}
        onComplete={() => setIsGone(true)}
      />
    </group>
  )
}

function ChosenCard({
  start,
  target,
  cardKey,
  isRevealed,
  isChosen,
  canReveal,
  onReveal,
  chosenScale,
}) {
  const groupRef = useRef(null)
  const positionRef = useRef(new THREE.Vector3(start[0], start[1], start[2]))
  const targetRef = useRef(new THREE.Vector3(target[0], target[1], target[2]))
  const { camera } = useThree()

  useEffect(() => {
    targetRef.current.set(target[0], target[1], target[2])
  }, [target])

  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.scale.setScalar(chosenScale)
  }, [chosenScale])

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    positionRef.current.lerp(targetRef.current, FLOATING.lerp)
    group.position.copy(positionRef.current)
    group.quaternion.copy(camera.quaternion)
  })

  const handleClick = (index) => {
    if (!canReveal) return
    onReveal(index)
  }

  return (
    <TarotCard
      ref={groupRef}
      index={cardKey}
      position={start}
      rotation={[0, 0, 0]}
      isRevealed={isRevealed}
      isChosen={isChosen}
      onCardClick={handleClick}
    />
  )
}
