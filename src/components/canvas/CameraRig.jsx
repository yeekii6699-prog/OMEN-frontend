'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'
import { getChosenPositions } from '@/constants/readingLayout'
import { getSpreadById, getPreviewCameraZ } from '@/constants/spreadConfig'

/**
 * 摄像机控制组件 - 根据游戏阶段动态调整视角
 * PORTAL -> WARP(飞向预览位) -> PREVIEW(牌阵预览) -> SESSION(选牌)
 */
export function CameraRig() {
  const { camera, pointer, size } = useThree()
  const isMobile = size.width < 768
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

  // 兼容性处理：防止 store 未加载时报错
  const phase = useGameStore((state) => state.phase) || 'PORTAL'
  const setPhase = useGameStore((state) => state.setPhase) || (() => {})
  const readingReady = useGameStore((state) => state.readingReady) || false
  const readingStep = useGameStore((state) => state.readingStep) || 'idle'
  const previewSpreadIndex = useGameStore((state) => state.previewSpreadIndex) || 0
  const totalSlots = useGameStore((state) => state.totalSlots) || 3
  const selectedIndices = useGameStore((state) => state.selectedIndices) || []
  const currentSpreadId = useGameStore((state) => state.currentSpreadId) || 'single'
  const prevPreviewIndexRef = useRef(0)

  // 预览位 - 移动端根据牌阵类型固定距离
  const previewCameraZ = useMemo(() =>
    getPreviewCameraZ(currentSpreadId, isMobile),
    [isMobile, currentSpreadId]
  )

  // 判断选牌是否完成
  const currentSpread = useMemo(() => getSpreadById(currentSpreadId), [currentSpreadId])
  const isSelectionComplete = selectedIndices.length >= currentSpread.cardCount

  // WARP 动画状态
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

  // PREVIEW 阶段的推拉动画状态
  const previewZoomRef = useRef({
    active: false,
    start: 0,
    duration: 400,
    startZoom: 1,
    targetZoom: 1,
  })

  // 摄像机位置定义
  const startPos = new THREE.Vector3(0, isMobile ? 6 : 5, isMobile ? 42 : 35)  // 入口俯视
  const previewPos = new THREE.Vector3(0, 0, previewCameraZ)

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

  const PREVIEW = {
    // 视差参数 - 比 SESSION 更小
    parallaxStrength: isMobile ? 0.15 : 0.25,
    parallaxDamp: 8,
    // 呼吸动画参数
    breathAmplitude: 0.3,
    breathFrequency: 0.3,
    // 切换牌阵时的推拉
    zoomDuration: 400,
    zoomAmount: 1.5,
  }

  // 重置 WARP 状态
  useEffect(() => {
    if (phase !== 'WARP') {
      warpRef.current.active = false
      warpRef.current.completed = false
    }
  }, [phase])

  // 聚焦过渡动画
  useEffect(() => {
    // 动态生成焦点步骤检查函数
    const cardCount = totalSlots
    const isFocusStep = (step) => {
      if (!step || typeof step !== 'string') return false
      if (!step.startsWith('focus_card_')) return false
      const numStr = step.replace('focus_card_', '')
      const num = parseInt(numStr, 10)
      return Number.isInteger(num) && num >= 1 && num <= cardCount
    }
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
  }, [readingStep, readingReady, phase, isMobile, totalSlots])

  // PREVIEW 阶段切换牌阵时的推拉动画
  useEffect(() => {
    if (phase === 'PREVIEW' && previewSpreadIndex !== prevPreviewIndexRef.current) {
      // 切换牌阵，触发推拉动画
      previewZoomRef.current.active = true
      previewZoomRef.current.start = performance.now()
      previewZoomRef.current.startZoom = 1
      previewZoomRef.current.targetZoom = 1 + PREVIEW.zoomAmount
    }
    prevPreviewIndexRef.current = previewSpreadIndex
  }, [previewSpreadIndex, phase])

  // PREVIEW 阶段结束（用户确认选择）
  useEffect(() => {
    if (phase === 'PREVIEW') {
      // 等待用户确认后进入 SESSION
      // 这里不需要额外逻辑，因为 confirmSpread 会直接设置 phase = 'SESSION'
    }
  }, [phase])

  useFrame((state, delta) => {
    let targetPos
    let targetLookAt
    const isReadingFocus = phase === 'SESSION' && readingReady && readingStep !== 'idle'
    const isSummaryStep =
      readingStep === 'summary' ||
      readingStep === 'awaiting_user_input' ||
      readingStep === 'consultation_result'
    const transitionActive = focusTransitionRef.current.active

    // 视差目标值 - 根据阶段调整
    let parallaxTargetX = 0
    let parallaxTargetY = 0
    let parallaxStrengthTarget = 0
    let parallaxDamp = 6

    if (phase === 'SESSION') {
      if (!isReadingFocus) {
        parallaxTargetX = pointer.x * (isMobile ? 0.25 : 0.5)
        parallaxTargetY = pointer.y * (isMobile ? 0.15 : 0.3)
        parallaxStrengthTarget = 1
        parallaxDamp = 10
      }
    } else if (phase === 'PREVIEW') {
      // PREVIEW 阶段：轻微的视差效果
      parallaxTargetX = pointer.x * PREVIEW.parallaxStrength
      parallaxTargetY = pointer.y * PREVIEW.parallaxStrength * 0.5
      parallaxStrengthTarget = 0.6
      parallaxDamp = PREVIEW.parallaxDamp
    }

    // 更新视差
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
      parallaxStrengthTarget,
      6,
      delta
    )

    // 根据阶段计算目标位置
    if (phase === 'SESSION') {
      if (isReadingFocus) {
        if (isSummaryStep) {
          targetPos = summaryPos
          targetLookAt = summaryLookAt
        } else {
          // 动态计算 focusIndex
          let focusIndex = -1
          if (readingStep && typeof readingStep === 'string' && readingStep.startsWith('focus_card_')) {
            const numStr = readingStep.replace('focus_card_', '')
            const num = parseInt(numStr, 10)
            if (Number.isInteger(num) && num >= 1) {
              focusIndex = num - 1
            }
          }
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
        // 选牌完成但还没进入解读阶段，拉近到牌阵位置
        if (isSelectionComplete) {
          targetPos = previewPos.clone() // 类似 PREVIEW 的位置
          targetLookAt = new THREE.Vector3(0, 0, 0) // 看向牌环中心
        } else {
          targetPos = deskPos
          targetLookAt = new THREE.Vector3(
            parallaxRef.current.x * parallaxRef.current.strength,
            parallaxRef.current.y * parallaxRef.current.strength,
            isMobile ? 16 : 14
          )
        }
      }
    } else if (phase === 'PREVIEW') {
      // PREVIEW 阶段：计算推拉动画
      let zoomOffset = 0
      if (previewZoomRef.current.active) {
        const elapsed = performance.now() - previewZoomRef.current.start
        const progress = Math.min(elapsed / previewZoomRef.current.duration, 1)

        if (progress >= 1) {
          previewZoomRef.current.active = false
          // 恢复原位
          zoomOffset = 0
        } else {
          // 推拉动画：推出去再拉回来
          const wave = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5
          zoomOffset = wave * previewZoomRef.current.targetZoom
        }
      }

      // 呼吸动画
      const breathOffset = Math.sin(state.clock.elapsedTime * PREVIEW.breathFrequency) * PREVIEW.breathAmplitude

      // 基础位置 + 视差 + 呼吸 + 推拉
      targetPos = previewPos.clone()
      targetPos.z += zoomOffset + breathOffset
      targetPos.x += parallaxRef.current.x * parallaxRef.current.strength
      targetPos.y += parallaxRef.current.y * parallaxRef.current.strength

      targetLookAt = new THREE.Vector3(0, 0, 0)
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
        // 飞向 PREVIEW 位置而不是 SESSION 位置
        warp.endRadius = Math.hypot(
          previewPos.x - ringCenter.x,
          previewPos.z - ringCenter.z
        )
        warp.startY = camera.position.y
      }

      const elapsed = state.clock.elapsedTime - warp.start
      const raw = THREE.MathUtils.clamp(elapsed / WARP.orbitDuration, 0, 1)
      const eased = THREE.MathUtils.smoothstep(raw, 0, 1)
      const angle = warp.startAngle + raw * Math.PI * 2
      const radius = THREE.MathUtils.lerp(warp.startRadius, warp.endRadius, eased)
      const y = THREE.MathUtils.lerp(warp.startY, previewPos.y, eased) + Math.sin(raw * Math.PI) * WARP.lift

      warpPosRef.current.set(
        ringCenter.x + Math.cos(angle) * radius,
        y,
        ringCenter.z + Math.sin(angle) * radius
      )
      targetPos = warpPosRef.current

      // 看向中心，然后平滑过渡到预览中心
      warpLookRef.current
        .copy(ringCenter)
        .setY(ringCenter.y + WARP.lookAtLift)
        .lerp(new THREE.Vector3(0, 0, 0), eased)
      targetLookAt = warpLookRef.current

      if (!warp.completed && raw >= 1) {
        warp.completed = true
        setPhase('PREVIEW')
      }
    } else {
      targetPos = startPos
      targetLookAt = new THREE.Vector3(0, 0, 0)
    }

    // 应用位置
    if (phase === 'WARP') {
      camera.position.lerp(targetPos, 1)
    } else {
      const posSpeed = transitionActive
        ? isMobile ? 2.2 : 2.4
        : isReadingFocus ? 3 : phase === 'SESSION' ? 4 : phase === 'PREVIEW' ? 2.5 : 1.8
      const posLerp = Math.min(1, posSpeed * delta)
      camera.position.lerp(targetPos, posLerp)
    }

    // 应用视点
    const lookSpeed = transitionActive
      ? isMobile ? 2.6 : 2.9
      : isReadingFocus ? 4 : phase === 'SESSION' ? 6 : phase === 'PREVIEW' ? 3 : phase === 'WARP' ? 3 : 2
    const lookLerp = Math.min(1, lookSpeed * delta)
    targetRef.current.lerp(targetLookAt, lookLerp)
    camera.lookAt(targetRef.current)
  })

  return null
}
