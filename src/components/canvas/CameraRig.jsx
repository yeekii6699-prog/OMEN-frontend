'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'
import { getPreviewCameraZ } from '@/constants/spreadConfig'

/**
 * 获取SESSION阶段（抽牌/解牌）的相机位置配置
 * @param {boolean} isMobile - 是否为移动端
 * @returns {{ position: THREE.Vector3, lookAt: THREE.Vector3 }}
 */
export function getSessionCameraConfig(isMobile) {
  if (isMobile) {
    return {
      position: new THREE.Vector3(0, 0.5, 22),
      lookAt: new THREE.Vector3(0, 0, 16),
    }
  }
  // PC端 - 可在此调整抽牌时的镜头距离
  return {
    position: new THREE.Vector3(0, 0, 22),  // 相机位置 (x, y, z距离)
    lookAt: new THREE.Vector3(0, 0, 14),    // 视点 (看向的位置)
  }
}

/**
 * 摄像机控制组件 - 根据游戏阶段动态调整视角
 * PORTAL -> WARP(飞向预览位) -> PREVIEW(牌阵预览) -> SESSION(选牌)
 */

// 动画参数常量（移到组件外部避免重复创建）
const WARP_CONFIG = {
  orbitDuration: 2.6,
  lift: 0.6,
  lookAtLift: 0.4,
}

const PREVIEW_CONFIG = {
  // 视差参数 - 比 SESSION 更小
  parallaxStrength: 0.25,  // PC 端基准值，移动端会乘以系数
  parallaxDamp: 8,
  // 呼吸动画参数
  breathAmplitude: 0.3,
  breathFrequency: 0.3,
  // 切换牌阵时的推拉
  zoomDuration: 400,
  zoomAmount: 1.5,
}
export function CameraRig() {
  const { camera, pointer, size } = useThree()
  const isMobile = size.width < 768
  const targetRef = useRef(new THREE.Vector3(0, 0, 0))
  const parallaxRef = useRef({ x: 0, y: 0, strength: 0 })

  // 兼容性处理：防止 store 未加载时报错
  const phase = useGameStore((state) => state.phase) || 'PORTAL'
  const setPhase = useGameStore((state) => state.setPhase) || (() => {})
  const previewSpreadIndex = useGameStore((state) => state.previewSpreadIndex) || 0
  const currentSpreadId = useGameStore((state) => state.currentSpreadId) || 'single'
  const totalSlots = useGameStore((state) => state.totalSlots) || 3
  const revealedIndices = useGameStore((state) => state.revealedIndices) || []
  const selectedIndices = useGameStore((state) => state.selectedIndices) || []
  const prevPreviewIndexRef = useRef(0)

  // 预览位 - 移动端根据牌阵类型固定距离
  const previewCameraZ = useMemo(() =>
    getPreviewCameraZ(currentSpreadId, isMobile),
    [isMobile, currentSpreadId]
  )

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

  const ringCenter = new THREE.Vector3(0, isMobile ? -2.6 : -2, 0)

  // SESSION 解牌阶段 - 从配置函数获取镜头位置
  const { position: sessionPos, lookAt: sessionLookAt } = getSessionCameraConfig(isMobile)

  // 视差强度（根据设备类型调整）
  const parallaxStrength = isMobile ? 0.15 : PREVIEW_CONFIG.parallaxStrength

  // 重置 WARP 状态
  useEffect(() => {
    if (phase !== 'WARP') {
      warpRef.current.active = false
      warpRef.current.completed = false
    }
  }, [phase])


  // PREVIEW 阶段切换牌阵时的推拉动画
  useEffect(() => {
    if (phase === 'PREVIEW' && previewSpreadIndex !== prevPreviewIndexRef.current) {
      // 切换牌阵，触发推拉动画
      previewZoomRef.current.active = true
      previewZoomRef.current.start = performance.now()
      previewZoomRef.current.startZoom = 1
      previewZoomRef.current.targetZoom = 1 + PREVIEW_CONFIG.zoomAmount
    }
    prevPreviewIndexRef.current = previewSpreadIndex
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSpreadIndex, phase])

  useFrame((state, delta) => {
    let targetPos
    let targetLookAt

    // 视差目标值 - 根据阶段调整
    let parallaxTargetX = 0
    let parallaxTargetY = 0
    let parallaxStrengthTarget = 0
    let parallaxDamp = 6

    if (phase === 'SESSION') {
      parallaxTargetX = pointer.x * (isMobile ? 0.25 : 0.5)
      parallaxTargetY = pointer.y * (isMobile ? 0.15 : 0.3)
      parallaxStrengthTarget = 1
      parallaxDamp = 10
    } else if (phase === 'PREVIEW') {
      // PREVIEW 阶段：轻微的视差效果
      parallaxTargetX = pointer.x * PREVIEW_CONFIG.parallaxStrength
      parallaxTargetY = pointer.y * PREVIEW_CONFIG.parallaxStrength * 0.5
      parallaxStrengthTarget = 0.6
      parallaxDamp = PREVIEW_CONFIG.parallaxDamp
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
      // 抽完所有牌后、开始翻牌前，镜头拉近到预览位置
      const isAllSelected = selectedIndices.length >= totalSlots && totalSlots > 0

      if (isAllSelected) {
        // 选完牌未翻牌：拉近到预览位置
        targetPos = previewPos
        targetLookAt = new THREE.Vector3(0, 0, 0)
      } else {
        // 抽牌阶段：保持较远距离
        targetPos = sessionPos
        targetLookAt = new THREE.Vector3(
          sessionLookAt.x + parallaxRef.current.x * parallaxRef.current.strength,
          sessionLookAt.y + parallaxRef.current.y * parallaxRef.current.strength,
          sessionLookAt.z
        )
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
      const breathOffset = Math.sin(state.clock.elapsedTime * PREVIEW_CONFIG.breathFrequency) * PREVIEW_CONFIG.breathAmplitude

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
      const raw = THREE.MathUtils.clamp(elapsed / WARP_CONFIG.orbitDuration, 0, 1)
      const eased = THREE.MathUtils.smoothstep(raw, 0, 1)
      const angle = warp.startAngle + raw * Math.PI * 2
      const radius = THREE.MathUtils.lerp(warp.startRadius, warp.endRadius, eased)
      const y = THREE.MathUtils.lerp(warp.startY, previewPos.y, eased) + Math.sin(raw * Math.PI) * WARP_CONFIG.lift

      warpPosRef.current.set(
        ringCenter.x + Math.cos(angle) * radius,
        y,
        ringCenter.z + Math.sin(angle) * radius
      )
      targetPos = warpPosRef.current

      // 看向中心，然后平滑过渡到预览中心
      warpLookRef.current
        .copy(ringCenter)
        .setY(ringCenter.y + WARP_CONFIG.lookAtLift)
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
      // 抽完牌后使用较慢速度平滑过渡
      const isAllSelected = phase === 'SESSION' && selectedIndices.length >= totalSlots && totalSlots > 0
      const posSpeed = isAllSelected ? 2 : phase === 'SESSION' ? 4 : phase === 'PREVIEW' ? 2.5 : 1.8
      const posLerp = Math.min(1, posSpeed * delta)
      camera.position.lerp(targetPos, posLerp)
    }

    // 应用视点
    const lookSpeed = phase === 'SESSION' ? 6 : phase === 'PREVIEW' ? 3 : phase === 'WARP' ? 3 : 2
    const lookLerp = Math.min(1, lookSpeed * delta)
    targetRef.current.lerp(targetLookAt, lookLerp)
    camera.lookAt(targetRef.current)
  })

  return null
}
