'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '@/store/gameStore'
import { getSpreadById, getPreviewPositions, pickRandomPreviewIndices } from '@/constants/spreadConfig'
import * as THREE from 'three'

// 卡片尺寸（与 TarotCard 保持一致）
const CARD_SIZE = { width: 1.2, height: 2 }

// 预览阶段卡片放置的 Z 位置
const PREVIEW_Z = 12

// 移动端断点（与 StarRing 保持一致）
const MOBILE_BREAKPOINT = 768

// 动画参数
const FLY_IN_DURATION = 0.7 // 飞入动画持续时间（秒）
const FLY_IN_INTERVAL = 0.12 // 卡片依次飞入的间隔（秒）
const FLOAT_AMPLITUDE = 0.04 // 悬浮幅度
const FLOAT_FREQUENCY = 1.0 // 悬浮频率

// 切换动画时序（秒）
const TRANSITION_TIMING = {
  burst: 0.6,    // 碎裂阶段
  clearing: 0.2, // 清空阶段
  entering: 0.7, // 飞入阶段
}

// 过渡阶段类型
const TransitionPhase = {
  IDLE: 'idle',
  BURSTING: 'bursting',
  CLEARING: 'clearing',
  ENTERING: 'entering',
}

/**
 * 牌阵预览组件
 *
 * 在 PREVIEW 阶段显示，展示当前选中牌阵的卡牌预览（全部背面朝上）
 * 卡牌从星环位置飞入组成牌阵的动画
 * 支持牌阵切换时的碎裂过渡动画
 *
 * 注意：由于 React Hooks 规则限制，所有 hooks 必须在条件检查之前声明，
 * 且不能有条件性的 hooks 调用。本组件使用 useMemo 组合所有副作用逻辑。
 */
export function SpreadPreview() {
  // ========== 第一部分：所有 hooks 声明（必须在最前面）==========

  // Store 状态
  const phase = useGameStore((state) => state.phase) || 'PORTAL'
  const previewSpreadIndex = useGameStore((state) => state.previewSpreadIndex) || 0
  const currentSpreadId = useGameStore((state) => state.currentSpreadId) || 'single'

  // 窗口大小判断（与 StarRing 保持一致）
  const { size } = useThree()
  const isMobile = size.width < MOBILE_BREAKPOINT

  // 组件状态
  const [transitionPhase, setTransitionPhase] = useState(TransitionPhase.IDLE)

  // Refs - 使用 ref 缓存稳定数据，避免重渲染导致的数据变化
  const prevPreviewIndicesRef = useRef([])
  const prevSpreadRef = useRef(null)
  const prevCardsRef = useRef(null)
  const previewDataRef = useRef({
    stableKey: '',
    indices: [],
    positions: [],
  })

  // 派生数据
  const spread = getSpreadById(currentSpreadId)
  const cardCount = spread.cardCount

  // 稳定的预览索引和位置 - 使用 ref 缓存，只在牌阵变化时重新生成
  const stableKey = `${currentSpreadId}-${previewSpreadIndex}`
  if (previewDataRef.current.stableKey !== stableKey) {
    previewDataRef.current = {
      stableKey,
      indices: pickRandomPreviewIndices(cardCount),
      positions: getPreviewPositions(currentSpreadId, isMobile, 'preview'),
    }
  }
  const previewIndices = previewDataRef.current.indices
  const previewPositions = previewDataRef.current.positions

  // 快速切换检测和强制重置
  const prevStableKeyRef = useRef('')
  useEffect(() => {
    if (prevStableKeyRef.current && prevStableKeyRef.current !== stableKey) {
      // 检测到牌阵切换，立即强制进入 ENTERING 阶段
      prevPreviewIndicesRef.current = []
      setTransitionPhase(TransitionPhase.ENTERING)
      prevSpreadRef.current = { id: currentSpreadId, cardCount, stableKey }
    } else if (!prevStableKeyRef.current) {
      // 首次渲染，开始 ENTERING
      setTransitionPhase(TransitionPhase.ENTERING)
      prevSpreadRef.current = { id: currentSpreadId, cardCount, stableKey }
    }
    prevStableKeyRef.current = stableKey
  }, [stableKey, currentSpreadId, cardCount])

  // ========== 第二部分：所有副作用逻辑 ==========
  useEffect(() => {
    // 处理碎裂动画
    if (transitionPhase === TransitionPhase.BURSTING) {
      const timer = setTimeout(() => {
        setTransitionPhase(TransitionPhase.CLEARING)
      }, TRANSITION_TIMING.burst * 1000)
      return () => clearTimeout(timer)
    }
  }, [transitionPhase])

  useEffect(() => {
    // 处理清空完成，开始飞入
    if (transitionPhase === TransitionPhase.CLEARING) {
      const timer = setTimeout(() => {
        setTransitionPhase(TransitionPhase.ENTERING)
        prevPreviewIndicesRef.current = previewIndices
      }, TRANSITION_TIMING.clearing * 1000)
      return () => clearTimeout(timer)
    }
  }, [transitionPhase, previewIndices])

  useEffect(() => {
    // 更新碎裂动画用的卡牌数据
    if (transitionPhase === TransitionPhase.ENTERING) {
      prevCardsRef.current = {
        indices: previewIndices,
        positions: previewPositions,
      }
    }
  }, [transitionPhase, previewIndices, previewPositions])

  // ========== 第三部分：条件检查（必须在所有 hooks 之后）==========
  if (phase !== 'PREVIEW') return null

  // 是否显示碎裂动画
  const showBurst = transitionPhase === TransitionPhase.BURSTING || transitionPhase === TransitionPhase.CLEARING

  return (
    <group position={[0, 0, PREVIEW_Z]}>
      {/* 碎裂动画中的旧牌阵 */}
      {showBurst && prevCardsRef.current && (
        <BurstingCards
          indices={prevCardsRef.current.indices}
          positions={prevCardsRef.current.positions}
          onComplete={() => {}}
        />
      )}

      {/* 新牌阵飞入 */}
      {!showBurst && previewPositions.map((pos, index) => (
        <PreviewCard
          key={`${spread.id}-${index}`}
          index={index}
          targetPosition={pos.position}
          targetRotation={pos.rotation || [0, Math.PI, 0]}
          delay={index * FLY_IN_INTERVAL}
          isEntering={transitionPhase === TransitionPhase.ENTERING}
        />
      ))}
    </group>
  )
}

/**
 * 正在碎裂的卡牌组（复用 CardBurstEffect 逻辑）
 */
function BurstingCards({ indices, positions, onComplete }) {
  return (
    <group>
      {positions.map((pos, index) => (
        <BurstingCard
          key={`burst-${index}`}
          cardIndex={indices[index]}
          position={pos.position}
          rotation={pos.rotation || [0, 0, 0]}
          delay={index * 0.05}
          onComplete={index === positions.length - 1 ? onComplete : undefined}
        />
      ))}
    </group>
  )
}

/**
 * 正在碎裂的单张卡牌
 * 复用 CardBurstEffect 的碎片逻辑，使用 InstancedMesh 优化性能
 */
function BurstingCard({ cardIndex, position, rotation, delay, onComplete }) {
  const groupRef = useRef(null)
  const burstRef = useRef({
    started: false,
    startTime: 0,
    done: false,
  })
  const shakeRef = useRef(new THREE.Vector3())

  // 碎片数据（复用 CardBurstEffect 的 SHARDS 配置）
  const shardData = useMemo(() => {
    return createShards(cardIndex + 77)
  }, [cardIndex])

  // 裂纹线
  const crackPositions = useMemo(() => {
    return createCrackLines(cardIndex + 17)
  }, [cardIndex])

  // 纹理
  const backTexture = useMemo(() => {
    const loader = new THREE.TextureLoader()
    return loader.load(
      'https://tarot-1378447783.cos.ap-guangzhou.myqcloud.com/web_pictrue/Pback.jpg',
      (t) => { t.colorSpace = THREE.SRGBColorSpace }
    )
  }, [])

  // 临时对象用于更新 InstancedMesh
  const tempObject = useMemo(() => new THREE.Object3D(), [])

  // 材质引用
  const crackMaterialRef = useRef(null)
  const shardMaterialRef = useRef(null)
  const shardMeshRef = useRef(null)

  // 动画参数
  const burstParams = useMemo(() => ({
    duration: TRANSITION_TIMING.burst,
    shakeEnd: 0.3,
    crackEnd: 0.5,
    shatterStart: 0.5,
    shakeSpeed: 20,
    shakeAmplitude: 0.05,
    explodeDistance: 0.8,
  }), [])

  useFrame((state) => {
    if (!groupRef.current) return

    // 启动动画
    if (!burstRef.current.started) {
      burstRef.current.started = true
      burstRef.current.startTime = state.clock.elapsedTime
    }

    const elapsed = state.clock.elapsedTime - burstRef.current.startTime - delay
    if (elapsed < 0) return

    const progress = Math.min(elapsed / burstParams.duration, 1)

    // 摇晃阶段
    const shakePhase = Math.min(progress / burstParams.shakeEnd, 1)
    const shakeStrength = 1 - shakePhase

    const shakeX = Math.cos(elapsed * burstParams.shakeSpeed) * burstParams.shakeAmplitude * shakeStrength
    const shakeY = Math.sin(elapsed * burstParams.shakeSpeed * 0.8) * burstParams.shakeAmplitude * shakeStrength

    shakeRef.current.set(shakeX, shakeY, 0)

    // 应用位置和旋转
    groupRef.current.position.set(
      position[0] + shakeX,
      position[1] + shakeY,
      position[2]
    )
    groupRef.current.rotation.set(
      rotation[0] + shakeX * 0.3,
      rotation[1],
      rotation[2] + shakeY * 0.5
    )

    // 缩放淡出
    const explodePhase = Math.min((progress - burstParams.shatterStart) / (1 - burstParams.shatterStart), 1)
    const scale = 1 - explodePhase * 0.3
    groupRef.current.scale.setScalar(Math.max(0.7, scale))

    // 裂纹显示
    if (crackMaterialRef.current) {
      const crackPhase = smoothstep(burstParams.shakeEnd, burstParams.crackEnd, progress)
      crackMaterialRef.current.opacity = crackPhase * (1 - explodePhase * 0.5)
    }

    // 碎片飞散
    if (shardMeshRef.current && shardMaterialRef.current) {
      const shardPhase = smoothstep(burstParams.crackEnd, 1, progress)
      const shardFade = 1 - smoothstep(0.7, 1, progress)
      shardMaterialRef.current.opacity = shardPhase * shardFade

      if (shardMaterialRef.current.opacity > 0.01) {
        for (let i = 0; i < shardData.length; i++) {
          const shard = shardData[i]
          const localPhase = Math.min((progress - burstParams.shatterStart - shard.delay) / (1 - burstParams.shatterStart), 1)
          const t = easeOutCubic(Math.max(0, localPhase))

          // 碎片飞散
          tempObject.position.copy(shard.offset)
          tempObject.position.addScaledVector(shard.direction, t * burstParams.explodeDistance * shard.scatter)
          tempObject.position.addScaledVector(shard.drift, t * t)

          // 碎片旋转
          tempObject.rotation.set(
            shard.rotation.x + t * shard.spin.x,
            shard.rotation.y + t * shard.spin.y,
            shard.rotation.z + t * shard.spin.z
          )

          // 碎片缩放
          const shardScale = 1 - t * 0.2
          tempObject.scale.set(shard.scale.x * shardScale, shard.scale.y * shardScale, 1)

          tempObject.updateMatrix()
          shardMeshRef.current.setMatrixAt(i, tempObject.matrix)
        }
        shardMeshRef.current.instanceMatrix.needsUpdate = true
      }
    }

    // 动画完成
    if (progress >= 1 && !burstRef.current.done) {
      burstRef.current.done = true
      if (onComplete) onComplete()
    }
  })

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* 裂纹线 */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={crackPositions.length / 3}
            array={crackPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          ref={crackMaterialRef}
          color="#f7e7b3"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>

      {/* 碎片 InstancedMesh */}
      <instancedMesh
        ref={shardMeshRef}
        args={[undefined, undefined, shardData.length]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={shardMaterialRef}
          map={backTexture}
          transparent
          opacity={0}
          side={THREE.FrontSide}
          toneMapped={false}
          depthWrite={false}
        />
      </instancedMesh>

      {/* 原始卡牌（逐渐消失） */}
      <mesh>
        <planeGeometry args={[CARD_SIZE.width, CARD_SIZE.height]} />
        <meshBasicMaterial
          map={backTexture}
          transparent
          opacity={0.3}
          side={THREE.FrontSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

/**
 * 预览卡牌组件
 *
 * 动画逻辑：
 * - 初始位置：从星环的随机位置开始
 * - 使用 useFrame + lerp 平滑过渡到目标位置
 * - 飞入时有轻微的弧线轨迹
 * - 到达后有轻微的悬浮动画（sin波形）
 */
function PreviewCard({ index, targetPosition, targetRotation, delay, isEntering }) {
  const groupRef = useRef(null)
  const startTimeRef = useRef(null)

  // 稳定的随机参数 - 只在组件首次创建时生成一次
  const randomParams = useMemo(() => {
    const angle = Math.random() * Math.PI * 2
    const radius = 8 + Math.random() * 4
    const arcHeight = 1.5 + Math.random() * 1
    return {
      startPosition: [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.3,
        5 + Math.random() * 10,
      ],
      arcHeight,
    }
  }, [])

  // 飞入动画状态
  const animationRef = useRef({
    isFlying: isEntering,
    progress: 0,
    arcHeight: randomParams.arcHeight,
  })

  // 重置动画状态
  useEffect(() => {
    if (isEntering && groupRef.current) {
      animationRef.current = {
        isFlying: true,
        progress: 0,
        arcHeight: randomParams.arcHeight,
      }
      startTimeRef.current = null
      // 随机起始位置
      groupRef.current.position.set(
        randomParams.startPosition[0],
        randomParams.startPosition[1],
        randomParams.startPosition[2]
      )
    }
  }, [isEntering, randomParams])

  useFrame((state) => {
    if (!groupRef.current) return

    // 初始化开始时间
    if (startTimeRef.current === null && isEntering) {
      startTimeRef.current = state.clock.elapsedTime
    }

    const clockTime = state.clock.elapsedTime
    const anim = animationRef.current

    if (anim.isFlying && startTimeRef.current !== null) {
      const elapsed = clockTime - startTimeRef.current - delay

      if (elapsed >= 0) {
        anim.progress = Math.min(elapsed / FLY_IN_DURATION, 1)
        const easedProgress = easeOutCubic(anim.progress)
        const arcMultiplier = Math.sin(anim.progress * Math.PI)

        // 线性插值位置
        const currentX = THREE.MathUtils.lerp(randomParams.startPosition[0], targetPosition[0], anim.progress)
        const currentY = THREE.MathUtils.lerp(randomParams.startPosition[1], targetPosition[1], anim.progress) +
          arcMultiplier * anim.arcHeight
        const currentZ = THREE.MathUtils.lerp(randomParams.startPosition[2], targetPosition[2], anim.progress)

        groupRef.current.position.set(currentX, currentY, currentZ)

        // 旋转过渡
        const currentRotX = THREE.MathUtils.lerp(0, targetRotation[0], easedProgress)
        const currentRotY = THREE.MathUtils.lerp(0, targetRotation[1], easedProgress)
        const currentRotZ = THREE.MathUtils.lerp(0, targetRotation[2], easedProgress)
        groupRef.current.rotation.set(currentRotX, currentRotY, currentRotZ)

        // 飞入完成
        if (anim.progress >= 1) {
          anim.isFlying = false
        }
      }
    } else if (!anim.isFlying) {
      // 悬浮动画
      const floatOffset = Math.sin(clockTime * FLOAT_FREQUENCY + index * 0.5) * FLOAT_AMPLITUDE

      groupRef.current.position.set(
        targetPosition[0],
        targetPosition[1] + floatOffset,
        targetPosition[2]
      )
      groupRef.current.rotation.set(
        targetRotation[0],
        targetRotation[1],
        targetRotation[2]
      )
    }
  })

  return (
    <group ref={groupRef}>
      <CardBack />
    </group>
  )
}

/**
 * 卡牌背面组件
 */
function CardBack() {
  const backTexture = useMemo(() => {
    const loader = new THREE.TextureLoader()
    return loader.load(
      'https://tarot-1378447783.cos.ap-guangzhou.myqcloud.com/web_pictrue/Pback.jpg',
      (texture) => { texture.colorSpace = THREE.SRGBColorSpace }
    )
  }, [])

  return (
    <group rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[CARD_SIZE.width, CARD_SIZE.height]} />
        <meshBasicMaterial
          map={backTexture}
          side={THREE.FrontSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

// ============== 工具函数 ==============

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

function smoothstep(edge0, edge1, value) {
  const x = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return x * x * (3 - 2 * x)
}

// 复用 CardBurstEffect 的辅助函数
function createSeededRandom(seed) {
  let s = (seed * 9301 + 49297) % 233280
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function createCrackLines(seed) {
  const rand = createSeededRandom(seed)
  const segments = 8
  const positions = new Float32Array(segments * 2 * 3)
  for (let i = 0; i < segments; i++) {
    const x1 = (rand() - 0.5) * CARD_SIZE.width
    const y1 = (rand() - 0.5) * CARD_SIZE.height
    const x2 = x1 + (rand() - 0.5) * CARD_SIZE.width * 0.5
    const y2 = y1 + (rand() - 0.5) * CARD_SIZE.height * 0.5
    const offset = i * 6
    positions[offset] = x1
    positions[offset + 1] = y1
    positions[offset + 2] = 0.003
    positions[offset + 3] = x2
    positions[offset + 4] = y2
    positions[offset + 5] = 0.003
  }
  return positions
}

function createShards(seed) {
  const rand = createSeededRandom(seed)
  const SHARDS_COUNT = 18
  const MIN_SCALE = 0.18
  const MAX_SCALE = 0.42
  const SPIN = 3.2
  const DELAY = 0.18
  const MIN_SCATTER = 0.7
  const MAX_SCATTER = 2.6
  const MIN_DRIFT = 0.25
  const MAX_DRIFT = 0.85

  return Array.from({ length: SHARDS_COUNT }, () => {
    const base = THREE.MathUtils.lerp(MIN_SCALE, MAX_SCALE, rand())
    const aspect = THREE.MathUtils.lerp(0.5, 1.4, rand())
    const scale = new THREE.Vector3(base * aspect, base, 1)
    const offset = new THREE.Vector3(
      (rand() - 0.5) * CARD_SIZE.width * 0.9,
      (rand() - 0.5) * CARD_SIZE.height * 0.9,
      0.006
    )
    const outward = offset.clone()
    if (outward.lengthSq() < 0.01) outward.set(rand() - 0.5, rand() - 0.5, rand() - 0.2)
    outward.normalize()
    const randomDir = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5)
    if (randomDir.lengthSq() < 0.01) randomDir.set(0.25, -0.12, 0.18)
    randomDir.normalize()
    const mix = THREE.MathUtils.lerp(0.35, 0.85, rand())
    const direction = outward.multiplyScalar(1 - mix).add(randomDir.multiplyScalar(mix)).normalize()
    const driftBase = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5)
    if (driftBase.lengthSq() < 0.01) driftBase.set(0.2, -0.1, 0.15)
    const drift = driftBase.normalize().multiplyScalar(
      THREE.MathUtils.lerp(MIN_DRIFT, MAX_DRIFT, rand())
    )
    const spin = new THREE.Vector3(
      (rand() - 0.5) * SPIN,
      (rand() - 0.5) * SPIN,
      (rand() - 0.5) * SPIN
    )
    const rotation = new THREE.Euler(0, 0, (rand() - 0.5) * 0.6)
    const delay = rand() * DELAY
    const scatter = THREE.MathUtils.lerp(MIN_SCATTER, MAX_SCATTER, rand())
    return { offset, scale, direction, drift, spin, rotation, delay, scatter }
  })
}

export default SpreadPreview
