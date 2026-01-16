'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'
import { getChosenPositions } from '@/constants/readingLayout'

/**
 * 摄像机控制组件 - 根据游戏阶段动态调整视角
 * PORTAL -> WARP(飞向选牌位) -> SESSION(选牌)
 */
export function CameraRig() {
  const { camera, pointer, size } = useThree()
  const targetRef = useRef(new THREE.Vector3(0, 0, 0))
  const parallaxRef = useRef({ x: 0, y: 0, strength: 0 })
  const focusPosRef = useRef(new THREE.Vector3())
  const focusLookRef = useRef(new THREE.Vector3())
  const focusTransitionPosRef = useRef(new THREE.Vector3())
  const focusTransitionRef = useRef({
    active: false,
    start: 0,
    duration: 560,
    pull: 0,
    lift: 0,
  })
  const prevStepRef = useRef('idle')
  const isMobile = size.width < 768

  // 兼容性处理：防止 store 未加载时报错
  const phase = useGameStore((state) => state.phase) || 'PORTAL'
  const setPhase = useGameStore((state) => state.setPhase) || (() => {})
  const readingReady = useGameStore((state) => state.readingReady) || false
  const readingStep = useGameStore((state) => state.readingStep) || 'idle'
  const warpRef = useRef({
    active: false,
    completed: false,
    start: 0,
    startAngle: 0,
    startRadius: 0,
    endRadius: 0,
    startY: 0,
  })
  const warpPosRef = useRef(new THREE.Vector3())
  const warpLookRef = useRef(new THREE.Vector3())

  // 摄像机位置定义
  const startPos = new THREE.Vector3(0, isMobile ? 6 : 5, isMobile ? 42 : 35)  // 入口俯视
  const deskPos = new THREE.Vector3(0, isMobile ? 0.5 : 0, isMobile ? 26 : 22) // 选牌位
  const ringCenter = new THREE.Vector3(0, isMobile ? -2.6 : -2, 0)
  const sessionLookAt = new THREE.Vector3(0, 0, isMobile ? 16 : 14)
  const summaryPos = new THREE.Vector3(0, isMobile ? 1.8 : 1.4, isMobile ? 25 : 22)
  const summaryLookAt = new THREE.Vector3(0, isMobile ? 0 : -0.2, isMobile ? 16 : 14)

  const focusOffset = useMemo(
    () => ({
      y: isMobile ? 2.4 : 3.2,
      z: isMobile ? 3.8 : 4.4,
    }),
    [isMobile]
  )
  const focusLookOffsetY = useMemo(() => (isMobile ? -0.9 : -1.1), [isMobile])

  const chosenFocusPositions = useMemo(
    () => getChosenPositions(isMobile).map((pos) => new THREE.Vector3(...pos)),
    [isMobile]
  )

  const WARP = {
    orbitDuration: 2.6,
    lift: 0.6,
    lookAtLift: 0.4,
  }

  useEffect(() => {
    if (phase !== 'WARP') {
      warpRef.current.active = false
      warpRef.current.completed = false
    }
  }, [phase])

  useEffect(() => {
    const isFocusStep = (step) =>
      step === 'focus_card_1' || step === 'focus_card_2' || step === 'focus_card_3'
    const prevStep = prevStepRef.current
    if (
      phase === 'SESSION' &&
      readingReady &&
      isFocusStep(prevStep) &&
      isFocusStep(readingStep) &&
      prevStep !== readingStep
    ) {
      focusTransitionRef.current.active = true
      focusTransitionRef.current.start = performance.now()
      focusTransitionRef.current.duration = isMobile ? 760 : 920
      focusTransitionRef.current.pull = isMobile ? 2.1 : 2.8
      focusTransitionRef.current.lift = isMobile ? 0.14 : 0.22
    }
    prevStepRef.current = readingStep
  }, [readingStep, readingReady, phase, isMobile])

  useFrame((state, delta) => {
    let targetPos
    let targetLookAt
    const isReadingFocus = phase === 'SESSION' && readingReady && readingStep !== 'idle'
    const isSummaryStep =
      readingStep === 'summary' ||
      readingStep === 'awaiting_user_input' ||
      readingStep === 'consultation_result'
    const transitionActive = focusTransitionRef.current.active
    const posSpeed = transitionActive
      ? isMobile ? 2.2 : 2.4
      : isReadingFocus ? 3 : phase === 'SESSION' ? 4 : phase === 'WARP' ? 2.4 : 1.8
    const lookSpeed = transitionActive
      ? isMobile ? 2.6 : 2.9
      : isReadingFocus ? 4 : phase === 'SESSION' ? 6 : phase === 'WARP' ? 3 : 2
    const posLerp = Math.min(1, posSpeed * delta)
    const lookLerp = Math.min(1, lookSpeed * delta)

    const parallaxTargetX = isReadingFocus ? 0 : pointer.x * (isMobile ? 0.25 : 0.5)
    const parallaxTargetY = isReadingFocus ? 0 : pointer.y * (isMobile ? 0.15 : 0.3)
    const parallaxDamp = phase === 'SESSION' && !isReadingFocus ? 10 : 6
    const strengthTarget = phase === 'SESSION' && !isReadingFocus ? 1 : 0

    parallaxRef.current.x = THREE.MathUtils.damp(
      parallaxRef.current.x,
      parallaxTargetX,
      parallaxDamp,
      delta
    )
    parallaxRef.current.y = THREE.MathUtils.damp(
      parallaxRef.current.y,
      parallaxTargetY,
      parallaxDamp,
      delta
    )
    parallaxRef.current.strength = THREE.MathUtils.damp(
      parallaxRef.current.strength,
      strengthTarget,
      6,
      delta
    )

    if (phase === 'SESSION') {
      if (isReadingFocus) {
        if (isSummaryStep) {
          targetPos = summaryPos
          targetLookAt = summaryLookAt
        } else {
          const focusIndex =
            readingStep === 'focus_card_1'
              ? 0
              : readingStep === 'focus_card_2'
                ? 1
                : readingStep === 'focus_card_3'
                  ? 2
                  : -1
          const focusTarget = chosenFocusPositions[focusIndex] || sessionLookAt
          focusPosRef.current.set(
            focusTarget.x,
            focusTarget.y - focusOffset.y,
            focusTarget.z + focusOffset.z
          )
          if (focusTransitionRef.current.active) {
            const transition = focusTransitionRef.current
            const elapsed = performance.now() - transition.start
            const progress = elapsed / transition.duration
            if (progress >= 1) {
              transition.active = false
              targetPos = focusPosRef.current
            } else {
              const eased = THREE.MathUtils.smootherstep(progress, 0, 1)
              const wave = Math.sin(Math.PI * eased)
              const pullAmount = wave * transition.pull
              const liftAmount = wave * transition.lift
              focusTransitionPosRef.current.copy(focusPosRef.current)
              focusTransitionPosRef.current.z += pullAmount
              focusTransitionPosRef.current.y += liftAmount
              targetPos = focusTransitionPosRef.current
            }
          } else {
            targetPos = focusPosRef.current
          }
          focusLookRef.current.copy(focusTarget)
          focusLookRef.current.y += focusLookOffsetY
          targetLookAt = focusLookRef.current
        }
      } else {
        targetPos = deskPos
        targetLookAt = new THREE.Vector3(
          parallaxRef.current.x * parallaxRef.current.strength,
          parallaxRef.current.y * parallaxRef.current.strength,
          isMobile ? 16 : 14
        )
      }
    } else if (phase === 'WARP') {
      const warp = warpRef.current
      if (!warp.active) {
        warp.active = true
        warp.completed = false
        warp.start = state.clock.elapsedTime
        warp.startAngle = Math.atan2(
          camera.position.z - ringCenter.z,
          camera.position.x - ringCenter.x
        )
        warp.startRadius = Math.hypot(
          camera.position.x - ringCenter.x,
          camera.position.z - ringCenter.z
        )
        warp.endRadius = Math.hypot(
          deskPos.x - ringCenter.x,
          deskPos.z - ringCenter.z
        )
        warp.startY = camera.position.y
      }

      const elapsed = state.clock.elapsedTime - warp.start
      const raw = THREE.MathUtils.clamp(elapsed / WARP.orbitDuration, 0, 1)
      const eased = THREE.MathUtils.smoothstep(raw, 0, 1)
      const angle = warp.startAngle + raw * Math.PI * 2
      const radius = THREE.MathUtils.lerp(warp.startRadius, warp.endRadius, eased)
      const y = THREE.MathUtils.lerp(warp.startY, deskPos.y, eased) + Math.sin(raw * Math.PI) * WARP.lift

      warpPosRef.current.set(
        ringCenter.x + Math.cos(angle) * radius,
        y,
        ringCenter.z + Math.sin(angle) * radius
      )
      targetPos = warpPosRef.current

      warpLookRef.current
        .copy(ringCenter)
        .setY(ringCenter.y + WARP.lookAtLift)
        .lerp(sessionLookAt, eased)
      targetLookAt = warpLookRef.current

      if (!warp.completed && raw >= 1) {
        warp.completed = true
        setPhase('SESSION')
      }
    } else {
      targetPos = startPos
      targetLookAt = new THREE.Vector3(0, 0, 0)
    }

    if (phase === 'WARP') {
      camera.position.lerp(targetPos, 1)
    } else {
      camera.position.lerp(targetPos, posLerp)
    }
    targetRef.current.lerp(targetLookAt, lookLerp)
    camera.lookAt(targetRef.current)
  })

  return null
}
