'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'

/**
 * 摄像机控制组件 - 根据游戏阶段动态调整视角
 * PORTAL -> WARP(飞向选牌位) -> SESSION(选牌)
 */
export function CameraRig() {
  const { camera, pointer, size } = useThree()
  const targetRef = useRef(new THREE.Vector3(0, 0, 0))
  const parallaxRef = useRef({ x: 0, y: 0, strength: 0 })
  const isMobile = size.width < 768

  // 兼容性处理：防止 store 未加载时报错
  const phase = useGameStore((state) => state.phase) || 'PORTAL'
  const setPhase = useGameStore((state) => state.setPhase) || (() => {})

  // 摄像机位置定义
  const startPos = new THREE.Vector3(0, isMobile ? 6 : 5, isMobile ? 42 : 35)  // 入口俯视
  const deskPos = new THREE.Vector3(0, isMobile ? 0.5 : 0, isMobile ? 26 : 22) // 选牌位

  useFrame((state, delta) => {
    let targetPos
    let targetLookAt
    const posLerp = Math.min(1, (phase === 'SESSION' ? 4 : phase === 'WARP' ? 2.4 : 1.8) * delta)
    const lookLerp = Math.min(1, (phase === 'SESSION' ? 6 : phase === 'WARP' ? 3 : 2) * delta)

    const parallaxTargetX = pointer.x * (isMobile ? 0.25 : 0.5)
    const parallaxTargetY = pointer.y * (isMobile ? 0.15 : 0.3)
    const parallaxDamp = phase === 'SESSION' ? 10 : 6
    const strengthTarget = phase === 'SESSION' ? 1 : 0

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
      targetPos = deskPos
      targetLookAt = new THREE.Vector3(
        parallaxRef.current.x * parallaxRef.current.strength,
        parallaxRef.current.y * parallaxRef.current.strength,
        isMobile ? 16 : 14
      )
    } else if (phase === 'WARP') {
      targetPos = deskPos
      targetLookAt = new THREE.Vector3(0, 0, isMobile ? 16 : 14)

      if (camera.position.distanceTo(deskPos) < 0.5) {
        setPhase('SESSION')
      }
    } else {
      targetPos = startPos
      targetLookAt = new THREE.Vector3(0, 0, 0)
    }

    camera.position.lerp(targetPos, posLerp)
    targetRef.current.lerp(targetLookAt, lookLerp)
    camera.lookAt(targetRef.current)
  })

  return null
}
