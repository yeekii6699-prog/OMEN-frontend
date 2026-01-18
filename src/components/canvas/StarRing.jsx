'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'
import { getChosenPositions } from '@/constants/readingLayout'
import { getSpreadById, getPreviewPositions } from '@/constants/spreadConfig'
import { TarotCard } from './TarotCard'
import { CardBurstEffect } from './CardBurstEffect'
import { RingToInputEffect } from './RingToInputEffect'

const TAROT_CARDS = 78
const RADIUS = 16
const MOBILE_BREAKPOINT = 768

const RING_CENTER = [0, -2, 0]
const CARD_SIZE = { width: 1.2, height: 2 }
const SELECTABLE_DOT = 0.15

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

const PORTAL_SPIN = {
  accel: 8,
  max: 5,
  damping: 6,
}

const REASSEMBLE = {
  duration: 3.4,
  minRadius: 3.4,
  maxRadius: 7.2,
  minLift: -1.6,
  maxLift: 2.6,
  minDepth: -2.4,
  maxDepth: 3.2,
  minScale: 0.35,
}

const DRAG_PLANE = {
  width: 40,
  height: 20,
}

const clamp01 = (value) => Math.min(1, Math.max(0, value))
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

const createSeededRandom = (seed) => {
  let s = (seed * 9301 + 49297) % 233280
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const getLayout = (isMobile, compactChosen) => {
  const ringScale = isMobile ? 0.82 : 1
  const ringCenter = [RING_CENTER[0], isMobile ? -2.6 : RING_CENTER[1], RING_CENTER[2]]
  const chosenPositions = getChosenPositions(isMobile, { compact: compactChosen })

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

const pickOrientation = () => (Math.random() < 0.5 ? 'upright' : 'reversed')

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
  const portalSpinRef = useRef(0)
  const [hoveredCardKey, setHoveredCardKey] = useState(null)
  const [floatingCards, setFloatingCards] = useState([])
  const [inputStartPositions, setInputStartPositions] = useState([])
  const [inputActive, setInputActive] = useState(false)

  // 从 store 获取状态
  const phase = useGameStore((state) => state.phase) || 'PORTAL'
  const portalHolding = useGameStore((state) => state.portalHolding) || false
  const triggerPortalPulse = useGameStore((state) => state.triggerPortalPulse) || (() => {})
  const revealedIndices = useGameStore((state) => state.revealedIndices) || []
  const revealCard = useGameStore((state) => state.revealCard) || (() => {})
  const setSelectedIndices = useGameStore((state) => state.setSelectedIndices) || (() => {})
  const setReadingReady = useGameStore((state) => state.setReadingReady) || (() => {})
  const cardOrientations = useGameStore((state) => state.cardOrientations) || {}
  const setCardOrientation = useGameStore((state) => state.setCardOrientation) || (() => {})
  const readingStep = useGameStore((state) => state.readingStep) || 'idle'
  const sessionId = useGameStore((state) => state.sessionId) || 0
  const currentSpreadId = useGameStore((state) => state.currentSpreadId) || 'single'

  // 从牌阵配置获取最大选择数量
  const spreadConfig = useMemo(() => getSpreadById(currentSpreadId), [currentSpreadId])
  const maxSelected = spreadConfig.cardCount

  const sessionRef = useRef(sessionId)
  const reassembleRef = useRef({
    active: false,
    start: 0,
    duration: REASSEMBLE.duration,
    progress: 1,
    pulsed: false,
  })

  const isBurstOrReveal = phase === 'BURST' || phase === 'REVEAL'
  const isReveal = phase === 'REVEAL'
  const isSession = phase === 'SESSION'
  const canReveal = isReveal || floatingCards.length >= maxSelected
  const allChosenRevealed =
    floatingCards.length >= maxSelected &&
    floatingCards.every((card) => revealedIndices.includes(card.key))
  const shouldBurst = isBurstOrReveal || allChosenRevealed
  const isMobile = size.width < MOBILE_BREAKPOINT
  const isSummaryStep =
    readingStep === 'summary' ||
    readingStep === 'awaiting_user_input' ||
    readingStep === 'consultation_result'
  const layout = useMemo(() => getLayout(isMobile, isSummaryStep), [isMobile, isSummaryStep])

  useFrame((_state, delta) => {
    const group = groupRef.current
    if (!group) return

    const reassemble = reassembleRef.current
    if (reassemble.active) {
      if (reassemble.start === 0) {
        reassemble.start = _state.clock.elapsedTime
        reassemble.duration = isMobile ? REASSEMBLE.duration - 0.4 : REASSEMBLE.duration
      }
      const elapsed = _state.clock.elapsedTime - reassemble.start
      const progress = clamp01(elapsed / reassemble.duration)
      reassemble.progress = progress
      if (progress >= 1 && !reassemble.pulsed) {
        reassemble.pulsed = true
        reassemble.active = false
        triggerPortalPulse()
      }
    }

    if (portalHolding) {
      portalSpinRef.current = Math.min(
        PORTAL_SPIN.max,
        portalSpinRef.current + PORTAL_SPIN.accel * delta
      )
    } else if (portalSpinRef.current > 0) {
      portalSpinRef.current = THREE.MathUtils.damp(
        portalSpinRef.current,
        0,
        PORTAL_SPIN.damping,
        delta
      )
    }

    const isPaused =
      dragStateRef.current.active ||
      hoveredCardKey !== null ||
      isBurstOrReveal ||
      shouldBurst ||
      reassembleRef.current.progress < 1
    if (!isPaused) {
      extraSpeedRef.current = THREE.MathUtils.damp(
        extraSpeedRef.current,
        0,
        ROTATION.inertiaDamping,
        delta
      )

      const speed = ROTATION.baseSpeed + extraSpeedRef.current + portalSpinRef.current
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

  // 动态计算 ChosenCard 的目标位置
  const shouldCenterChosen = isBurstOrReveal || floatingCards.length >= maxSelected
  const previewPositions = useMemo(() => getPreviewPositions(currentSpreadId, isMobile), [currentSpreadId, isMobile])
  const chosenLayout = useMemo(() => {
    const count = floatingCards.length
    if (count === 0) return new Map()

    if (shouldCenterChosen) {
      // 移动端缩放系数 0.55，适配小屏幕
      const mobileScale = isMobile ? 0.7 : 1
      return new Map(
        floatingCards.map((card, index) => {
          const pos = previewPositions[index]?.position
          return [
            card.key,
            pos ? [pos[0] * mobileScale, pos[1] * mobileScale, 12] : [0, 0, 12],
          ]
        })
      )
    }

    // 浮动排列模式
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
  }, [floatingCards, layout, shouldCenterChosen, previewPositions])

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
    portalSpinRef.current = 0
    dragStateRef.current.active = false
    if (groupRef.current) {
      groupRef.current.rotation.y = 0
    }
    if (sessionId > 0) {
      reassembleRef.current.active = true
      reassembleRef.current.start = 0
      reassembleRef.current.duration = REASSEMBLE.duration
      reassembleRef.current.progress = 0
      reassembleRef.current.pulsed = false
    } else {
      reassembleRef.current.active = false
      reassembleRef.current.progress = 1
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

  const processedSelectionsRef = useRef(new Set())

  const handleSelectCard = useCallback(
    (key, worldPosition) => {
      if (shouldBurst || !isSession) return
      if (floatingCards.length >= maxSelected) return

      // 防止快速点击导致重复处理同一张卡
      if (processedSelectionsRef.current.has(key)) return

      // 验证 worldPosition 有效性
      if (!worldPosition || typeof worldPosition.x !== 'number' || isNaN(worldPosition.x)) return

      processedSelectionsRef.current.add(key)

      if (!cardOrientations[key]) {
        setCardOrientation(key, pickOrientation())
      }

      setFloatingCards((current) => {
        // 再次检查防止重复（防御性编程）
        if (current.some((card) => card.key === key)) {
          processedSelectionsRef.current.delete(key)
          return current
        }
        const newCard = {
          key,
          start: [worldPosition.x, worldPosition.y, worldPosition.z],
        }
        return [...current, newCard]
      })
      setHoveredCardKey(null)

      // 清除处理标记（延迟确保状态已更新）
      setTimeout(() => {
        processedSelectionsRef.current.delete(key)
      }, 100)
    },
    [shouldBurst, isSession, floatingCards, cardOrientations, setCardOrientation, maxSelected]
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
            reassembleRef={reassembleRef}
            reassembleSeed={sessionId}
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
          isChosen={true}
          isReversed={cardOrientations[card.key] === 'reversed'}
          canReveal={canReveal}
          onReveal={handleRevealCard}
          chosenScale={layout.chosenScale}
        />
      ))}
      <RingToInputEffect
        active={inputActive}
        startPositions={inputStartPositions}
        cardCount={maxSelected}
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
  reassembleRef,
  reassembleSeed,
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
  const scatterRef = useRef(new THREE.Vector3())
  const targetRef = useMemo(() => new THREE.Vector3(), [])
  const localPosition = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const localRotation = useMemo(() => new THREE.Euler(0, 0, 0), [])
  const cardPos = useMemo(() => new THREE.Vector3(), [])
  const toCard = useMemo(() => new THREE.Vector3(), [])
  const toCamera = useMemo(() => new THREE.Vector3(), [])
  const worldPosition = useMemo(() => new THREE.Vector3(), [])
  const tapRef = useRef({ id: null, x: 0, y: 0, pointerType: '' })

  useEffect(() => {
    const seed = (card.key + 1) * 97 + (reassembleSeed || 0) * 131
    const rand = createSeededRandom(seed)
    const angle = rand() * Math.PI * 2
    const radius = THREE.MathUtils.lerp(REASSEMBLE.minRadius, REASSEMBLE.maxRadius, rand())
    const lift = THREE.MathUtils.lerp(REASSEMBLE.minLift, REASSEMBLE.maxLift, rand())
    const depth = THREE.MathUtils.lerp(REASSEMBLE.minDepth, REASSEMBLE.maxDepth, rand())
    scatterRef.current.copy(basePosition).add(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        lift,
        Math.sin(angle) * radius + depth
      )
    )
  }, [card.key, basePosition, reassembleSeed])

  useFrame(({ clock }, delta) => {
    const group = groupRef.current
    if (!group || isBursting) return

    const time = clock.elapsedTime
    const reassembleProgress = reassembleRef?.current?.progress ?? 1
    const reassembleActive = reassembleProgress < 1
    const hoverActive = isHovered && !reassembleActive
    const wobble = hoverActive ? Math.sin(time * HOVER.wobbleSpeed) * HOVER.wobbleAmplitude : 0
    const targetY = hoverActive ? HOVER.lift + wobble * 0.3 : 0

    if (reassembleActive) {
      const eased = easeOutCubic(reassembleProgress)
      targetRef.set(basePosition.x, basePosition.y + targetY, basePosition.z)
      group.position.copy(scatterRef.current).lerp(targetRef, eased)
      group.scale.setScalar(THREE.MathUtils.lerp(REASSEMBLE.minScale, 1, eased))
    } else {
      group.position.set(basePosition.x, basePosition.y + targetY, basePosition.z)
      group.scale.setScalar(1)
    }
    group.rotation.set(
      baseRotation.x,
      baseRotation.y,
      THREE.MathUtils.damp(group.rotation.z, baseRotation.z + wobble, HOVER.returnDamping, delta)
    )
  })

  const isSelectable = () => {
    const reassembleProgress = reassembleRef?.current?.progress ?? 1
    if (!groupRef.current || !canInteract || isBursting || reassembleProgress < 1) return false
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
  isReversed,
  canReveal,
  onReveal,
  chosenScale,
}) {
  const groupRef = useRef(null)
  const positionRef = useRef(new THREE.Vector3(start[0], start[1], start[2]))
  const targetRef = useRef(new THREE.Vector3(target[0], target[1], target[2]))
  const { camera } = useThree()
  const hasArrivedRef = useRef(false)

  // 确保 positionRef 始终与 start 同步（处理快速点击时 start 可能未就绪的情况）
  useEffect(() => {
    const startValid = Array.isArray(start) && start.length === 3 && start.every(v => !isNaN(v))
    if (startValid) {
      positionRef.current.set(start[0], start[1], start[2])
    }
  }, [start])

  // 确保 targetRef 始终与 target 同步（首次初始化）
  useEffect(() => {
    const targetValid = Array.isArray(target) && target.length === 3 && target.every(v => !isNaN(v))
    if (targetValid) {
      targetRef.current.set(target[0], target[1], target[2])
      hasArrivedRef.current = false
    }
  }, [target])

  useEffect(() => {
    // 只有当卡牌已到达当前位置且目标位置显著变化时，才更新目标
    const currentTarget = targetRef.current
    const targetValid = Array.isArray(target) && target.length === 3 && target.every(v => !isNaN(v))
    if (!targetValid) return

    const dist = Math.sqrt(
      Math.pow(target[0] - currentTarget.x, 2) +
      Math.pow(target[1] - currentTarget.y, 2) +
      Math.pow(target[2] - currentTarget.z, 2)
    )
    // 只有目标位置显著变化时才更新，避免动画抖动
    if (dist > 0.01) {
      targetRef.current.set(target[0], target[1], target[2])
      hasArrivedRef.current = false
    }
  }, [target])

  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.scale.setScalar(chosenScale)
  }, [chosenScale])

  useFrame((_state, delta) => {
    const group = groupRef.current
    if (!group) return

    // 始终从当前位置平滑过渡到目标
    const currentPos = positionRef.current
    const targetPos = targetRef.current
    const dx = targetPos.x - currentPos.x
    const dy = targetPos.y - currentPos.y
    const dz = targetPos.z - currentPos.z
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

    // 移动速度
    const speed = 10 * delta

    if (distance < speed || distance < 0.1) {
      // 到达目标
      positionRef.current.copy(targetPos)
      hasArrivedRef.current = true
    } else {
      // 向目标移动，使用平滑插值
      const t = speed / Math.max(distance, speed)
      positionRef.current.x += dx * t
      positionRef.current.y += dy * t
      positionRef.current.z += dz * t
      hasArrivedRef.current = false
    }

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
      isReversed={isReversed}
      onCardClick={handleClick}
    />
  )
}
