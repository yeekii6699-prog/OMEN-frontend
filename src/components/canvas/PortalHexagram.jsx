'use client'

import { useRef, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useCursor, Line } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'

// 整体缩放因子 - 修改这里即可调整六芒星大小
const SCALE = 0.7
const HOLD = {
  duration: 3,
  scaleBoost: 0.18,
}
const FLASH = {
  duration: 0.45,
  warpDelay: 0.26,
  intensity: 0.45,
}
const PROGRESS = {
  inner: 3.0 * SCALE,
  outer: 3.22 * SCALE,
  trackOuter: 3.1 * SCALE,
  z: 0.22 * SCALE,
}

// 辅助函数保持不变
const createHexagramPoints = (radius) => {
  const points = []
  for (let i = 0; i <= 6; i++) {
    const angle = (i * Math.PI) / 3 - Math.PI / 2
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0))
  }
  const triangle1 = [points[0], points[2], points[4], points[0]]
  const triangle2 = [points[1], points[3], points[5], points[1]]
  return { triangle1, triangle2 }
}

export function PortalHexagram() {
  const groupRef = useRef(null)
  const billboardRef = useRef(null)
  const coreRef = useRef(null)
  const starRef1 = useRef(null)
  const starRef2 = useRef(null)
  const ringsRef = useRef(null)
  const particlesRef = useRef(null)
  const progressRingRef = useRef(null)
  const progressStateRef = useRef({ value: 0 })

  const [hovered, setHovered] = useState(false)
  const holdRef = useRef({
    active: false,
    start: 0,
    progress: 0,
    triggered: false,
    flashStart: 0,
    warpAt: 0,
  })

  // 兼容性处理：防止 store 还没加载时报错
  const setPhase = useGameStore((state) => state.setPhase) || (() => {})

  useCursor(hovered)

  // 基础尺寸（乘以 SCALE 得到实际渲染尺寸）
  const { triangle1: t1_outer, triangle2: t2_outer } = useMemo(() => createHexagramPoints(2.0 * SCALE), [])
  const { triangle1: t1_inner, triangle2: t2_inner } = useMemo(() => createHexagramPoints(1.2 * SCALE), [])

  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = (2.5 + Math.random() * 1.5) * SCALE
      temp.push(r * Math.cos(angle), r * Math.sin(angle), (Math.random() - 0.5) * 0.5 * SCALE)
    }
    return new Float32Array(temp)
  }, [])

  const { camera } = useThree()

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    let holdProgress = holdRef.current.progress
    let flash = 0

    if (holdRef.current.active && !holdRef.current.triggered) {
      const elapsed = (performance.now() - holdRef.current.start) / 1000
      holdProgress = THREE.MathUtils.clamp(elapsed / HOLD.duration, 0, 1)
      holdRef.current.progress = holdProgress
      if (holdProgress >= 1) {
        holdRef.current.triggered = true
        holdRef.current.active = false
        holdRef.current.flashStart = performance.now()
        holdRef.current.warpAt = holdRef.current.flashStart + FLASH.warpDelay * 1000
      }
    } else if (!holdRef.current.active && holdProgress > 0) {
      holdRef.current.progress = THREE.MathUtils.damp(holdProgress, 0, 10, delta)
      holdProgress = holdRef.current.progress
    }

    if (holdRef.current.flashStart) {
      const flashElapsed = (performance.now() - holdRef.current.flashStart) / 1000
      const progress = THREE.MathUtils.clamp(flashElapsed / FLASH.duration, 0, 1)
      const pulse = Math.sin(progress * Math.PI)
      flash = pulse * pulse
      if (progress >= 1) {
        holdRef.current.flashStart = 0
      }
    }

    if (holdRef.current.triggered && holdRef.current.warpAt) {
      if (performance.now() >= holdRef.current.warpAt) {
        holdRef.current.warpAt = 0
        setPhase('WARP')
      }
    }

    const speed = hovered || holdProgress > 0 ? 3.0 : 1.0

    if (groupRef.current) {
      // 整体呼吸与摇摆
      groupRef.current.position.y = -3.5 + Math.sin(time * 1.5) * 0.1

      const targetScale = (hovered ? 1.2 : 1) + holdProgress * HOLD.scaleBoost
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
    }

    if (billboardRef.current) {
      // Keep the portal facing the camera so the circle stays round.
      billboardRef.current.quaternion.copy(camera.quaternion)
    }

    if (coreRef.current) {
      coreRef.current.rotation.x += delta * speed
      coreRef.current.rotation.z += delta * speed * 0.5
    }

    if (starRef1.current) starRef1.current.rotation.z += delta * 0.2 * speed
    if (starRef2.current) starRef2.current.rotation.z -= delta * 0.15 * speed

    if (ringsRef.current) {
      ringsRef.current.rotation.z -= delta * 0.05 * speed
      const scale = 1 + Math.sin(time * 3) * 0.02
      ringsRef.current.scale.setScalar(scale)
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.z += delta * 0.05 * speed
    }

    if (progressRingRef.current) {
      const progress = THREE.MathUtils.clamp(holdProgress, 0, 1)
      const ring = progressRingRef.current
      ring.visible = progress > 0.01

      if (ring.visible && Math.abs(progress - progressStateRef.current.value) > 0.01) {
        const thetaLength = Math.max(0.01, progress * Math.PI * 2)
        const geometry = new THREE.RingGeometry(
          PROGRESS.inner,
          PROGRESS.outer,
          64,
          1,
          -Math.PI / 2,
          thetaLength
        )
        if (ring.geometry) ring.geometry.dispose()
        ring.geometry = geometry
        progressStateRef.current.value = progress
      }

      const material = ring.material
      if (material && !Array.isArray(material)) {
        material.opacity = THREE.MathUtils.clamp(
          0.2 + progress * 0.8 + flash * FLASH.intensity,
          0,
          1
        )
      }
    }
  })

  const colors = useMemo(() => ({
    gold: new THREE.Color('#ffaa00').multiplyScalar(2),
    purple: new THREE.Color('#a020f0').multiplyScalar(3),
    coreNormal: new THREE.Color('#00ffff').multiplyScalar(2),
    coreHover: new THREE.Color('#ffffff').multiplyScalar(5)
  }), [])

  // 事件处理函数：直接绑定到 HitMesh 上
  const handlePointerOver = (e) => {
    e.stopPropagation()
    setHovered(true)
  }

  const handlePointerOut = (e) => {
    e.stopPropagation()
    setHovered(false)
  }

  const startHold = (e) => {
    e.stopPropagation()
    holdRef.current.active = true
    holdRef.current.triggered = false
    holdRef.current.start = performance.now()
    holdRef.current.progress = 0
    if (e.target?.setPointerCapture) e.target.setPointerCapture(e.pointerId)
  }

  const stopHold = (e) => {
    e.stopPropagation()
    holdRef.current.active = false
    if (!holdRef.current.triggered) {
      holdRef.current.progress = 0
    }
    if (e.target?.releasePointerCapture) e.target.releasePointerCapture(e.pointerId)
  }

  return (
    <group
      ref={groupRef}
      position={[0, -3.5, 18]}
    >
      <group ref={billboardRef}>
        {/* ================= 视觉层 (Visuals) ================= */}
        <group raycast={() => null}>

          {/* --- 中心能量核心 --- */}
          <mesh ref={coreRef}>
            <octahedronGeometry args={[0.5 * SCALE, 0]} />
            <meshStandardMaterial
              color={hovered ? colors.coreHover : colors.coreNormal}
              emissive={hovered ? colors.coreHover : colors.coreNormal}
              emissiveIntensity={hovered ? 2 : 1}
              wireframe={true}
              transparent opacity={0.9}
              toneMapped={false}
            />
          </mesh>

          <mesh>
            <sphereGeometry args={[0.3 * SCALE, 16, 16]} />
            <meshBasicMaterial
              color={hovered ? "white" : "#88ccff"}
              transparent opacity={0.8}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* --- 星阵 --- */}
          <group ref={starRef1}>
            <HexagramLines points={t1_outer} color={colors.gold} width={3} hovered={hovered} />
            <HexagramLines points={t2_outer} color={colors.gold} width={3} hovered={hovered} />
          </group>

          <group ref={starRef2} position={[0, 0, 0.1 * SCALE]}>
            <HexagramLines points={t1_inner} color={colors.purple} width={2} hovered={hovered} />
            <HexagramLines points={t2_inner} color={colors.purple} width={2} hovered={hovered} />
            <mesh rotation={[0, 0, Math.PI / 6]}>
              <ringGeometry args={[1.2 * SCALE, 1.22 * SCALE, 6]} />
              <meshBasicMaterial color="#a020f0" transparent opacity={0.5} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
          </group>

          {/* --- 符文环 --- */}
          <group ref={ringsRef}>
            <mesh rotation={[0, 0, 0]}>
              <ringGeometry args={[2.8 * SCALE, 2.85 * SCALE, 64]} />
              <meshBasicMaterial color="#ffd700" transparent opacity={hovered ? 0.6 : 0.3} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
            <mesh rotation={[0, 0, 1]}>
              <ringGeometry args={[2.6 * SCALE, 2.7 * SCALE, 32, 1, 0, Math.PI * 2]} />
              <meshBasicMaterial color="#c084fc" wireframe wireframeLinewidth={2} transparent opacity={0.4} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh position={[0, 0, -0.1 * SCALE]}>
              <ringGeometry args={[0, 3.5 * SCALE, 64]} />
              <meshBasicMaterial color="#4b0082" transparent opacity={hovered ? 0.2 : 0.05} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          </group>

          {/* --- 长按进度环 --- */}
          <group position={[0, 0, PROGRESS.z]}>
            <mesh>
              <ringGeometry args={[PROGRESS.inner, PROGRESS.trackOuter, 64]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.2}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <mesh ref={progressRingRef} visible={false}>
              <ringGeometry args={[PROGRESS.inner, PROGRESS.outer, 64, 1, -Math.PI / 2, 0.01]} />
              <meshBasicMaterial
                color="#ffd700"
                transparent
                opacity={0}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>

          {/* --- 粒子 --- */}
          <points ref={particlesRef}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" count={particles.length / 3} array={particles} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.05 * SCALE} color="#fff" transparent opacity={0.6} blending={THREE.AdditiveBlending} sizeAttenuation={true} />
          </points>
        </group>

        {/* ================= 交互层 (Interaction) ================= */}
        <mesh
          position={[0, 0, 1.0 * SCALE]}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onPointerLeave={stopHold}
        >
          <circleGeometry args={[4.0 * SCALE, 32]} />
          <meshBasicMaterial color="red" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

function HexagramLines({ points, color, width, hovered }) {
  return (
    <Line
      points={points}
      color={color}
      lineWidth={width}
      transparent
      opacity={hovered ? 1 : 0.7}
      toneMapped={false}
      blending={THREE.AdditiveBlending}
    />
  )
}
