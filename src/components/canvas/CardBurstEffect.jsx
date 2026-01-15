'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const CARD_SIZE = { width: 1.2, height: 2 }
const BURST = {
  duration: 1.6,
  shakeEnd: 0.32,
  crackEnd: 0.62,
  shatterStart: 0.62,
  delay: 0.25,
  shakeAmplitude: 0.06,
  shakeSpeed: 26,
  explodeDistance: 0.9,
}

const SHARDS = {
  count: 18,
  minScale: 0.18,
  maxScale: 0.42,
  spin: 3.2,
  delay: 0.18,
  minScatter: 0.7,
  maxScatter: 2.6,
  minDrift: 0.25,
  maxDrift: 0.85,
}

const clamp01 = (value) => Math.min(1, Math.max(0, value))
const smoothstep = (edge0, edge1, value) => {
  const x = clamp01((value - edge0) / (edge1 - edge0))
  return x * x * (3 - 2 * x)
}
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

const createSeededRandom = (seed) => {
  let s = (seed * 9301 + 49297) % 233280
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const createCrackLines = (seed) => {
  const rand = createSeededRandom(seed)
  const segments = 8
  const positions = new Float32Array(segments * 2 * 3)
  for (let i = 0; i < segments; i += 1) {
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

let shardTextureCache = null

const useShardTexture = () => {
  const [texture] = useState(() => {
    if (!shardTextureCache) {
      const loader = new THREE.TextureLoader()
      shardTextureCache = loader.load('/img/Pback.png')
      shardTextureCache.colorSpace = THREE.SRGBColorSpace
      shardTextureCache.needsUpdate = true
    }
    return shardTextureCache
  })
  return texture
}

const createShards = (seed) => {
  const rand = createSeededRandom(seed + 77)
  return Array.from({ length: SHARDS.count }, () => {
    const base = THREE.MathUtils.lerp(SHARDS.minScale, SHARDS.maxScale, rand())
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
    const drift = driftBase
      .normalize()
      .multiplyScalar(THREE.MathUtils.lerp(SHARDS.minDrift, SHARDS.maxDrift, rand()))
    const spin = new THREE.Vector3(
      (rand() - 0.5) * SHARDS.spin,
      (rand() - 0.5) * SHARDS.spin,
      (rand() - 0.5) * SHARDS.spin
    )
    const rotation = new THREE.Euler(0, 0, (rand() - 0.5) * 0.6)
    const delay = rand() * SHARDS.delay
    const scatter = THREE.MathUtils.lerp(SHARDS.minScatter, SHARDS.maxScatter, rand())
    return { offset, scale, direction, drift, spin, rotation, delay, scatter }
  })
}

export function CardBurstEffect({ active, seed, targetRef, basePosition, baseRotation, onComplete }) {
  const crackMaterialRef = useRef(null)
  const shardMaterialRef = useRef(null)
  const shardMeshRef = useRef(null)
  const burstRef = useRef({ started: false, done: false, start: 0 })
  const shakeRef = useRef(new THREE.Vector3())
  const tempObject = useMemo(() => new THREE.Object3D(), [])
  const shardTexture = useShardTexture()

  const crackPositions = useMemo(() => createCrackLines(seed + 17), [seed])
  const shardData = useMemo(() => createShards(seed), [seed])
  const burstParams = useMemo(() => {
    const rand = createSeededRandom(seed + 131)

    return {
      delay: rand() * BURST.delay,
      wobbleOffset: rand() * Math.PI * 2,
    }
  }, [seed])

  useEffect(() => {
    if (!active) {
      burstRef.current.started = false
      burstRef.current.done = false
      if (crackMaterialRef.current) crackMaterialRef.current.opacity = 0
      if (shardMaterialRef.current) shardMaterialRef.current.opacity = 0
      if (shardMeshRef.current) shardMeshRef.current.visible = false
    }
  }, [active])

  useFrame(({ clock }) => {
    const target = targetRef.current
    if (!active || !target) return

    const now = clock.elapsedTime
    if (!burstRef.current.started) {
      burstRef.current.started = true
      burstRef.current.start = now
    }

    const elapsed = now - burstRef.current.start - burstParams.delay
    if (elapsed < 0) {
      target.position.copy(basePosition)
      target.rotation.copy(baseRotation)
      target.scale.setScalar(1)
      return
    }

    const progress = clamp01(elapsed / BURST.duration)
    const shakePhase = clamp01(progress / BURST.shakeEnd)
    const shakeStrength = 1 - shakePhase
    const crackPhase = smoothstep(BURST.shakeEnd, BURST.crackEnd, progress)
    const shatterPhase = clamp01((progress - BURST.shatterStart) / (1 - BURST.shatterStart))
    const explode = easeOutCubic(shatterPhase)

    const shake = Math.sin(now * BURST.shakeSpeed + burstParams.wobbleOffset)
      * BURST.shakeAmplitude
      * shakeStrength
    const shakeX = Math.cos(now * BURST.shakeSpeed * 0.8 + burstParams.wobbleOffset)
      * BURST.shakeAmplitude
      * 0.6
      * shakeStrength

    shakeRef.current.set(shakeX, shake, 0)

    target.position.copy(basePosition).add(shakeRef.current)
    target.rotation.set(
      baseRotation.x + shake * 0.4,
      baseRotation.y,
      baseRotation.z + shake * 0.8
    )
    target.scale.setScalar(1 - explode)

    if (crackMaterialRef.current) {
      crackMaterialRef.current.opacity = Math.min(1, crackPhase) * (1 - shatterPhase * 0.4)
    }

    if (shardMeshRef.current && shardMaterialRef.current) {
      const shardPhase = smoothstep(BURST.crackEnd - 0.05, 1, progress)
      const shardFade = 1 - smoothstep(0.75, 1, progress)
      shardMaterialRef.current.opacity = shardPhase * shardFade
      shardMeshRef.current.visible = shardMaterialRef.current.opacity > 0.01

      if (shardMeshRef.current.visible) {
        for (let i = 0; i < shardData.length; i += 1) {
          const shard = shardData[i]
          const localPhase = clamp01(
            (progress - BURST.shatterStart - shard.delay) / (1 - BURST.shatterStart)
          )
          const t = easeOutCubic(localPhase)
          tempObject.position
            .copy(shard.offset)
            .addScaledVector(shard.direction, t * BURST.explodeDistance * shard.scatter)
            .addScaledVector(shard.drift, t * t)
          tempObject.rotation.set(
            shard.rotation.x + t * shard.spin.x,
            shard.rotation.y + t * shard.spin.y,
            shard.rotation.z + t * shard.spin.z
          )
          const scale = 1 - t * 0.25
          tempObject.scale.set(
            shard.scale.x * scale,
            shard.scale.y * scale,
            1
          )
          tempObject.updateMatrix()
          shardMeshRef.current.setMatrixAt(i, tempObject.matrix)
        }
        shardMeshRef.current.instanceMatrix.needsUpdate = true
      }
    }

    if (progress >= 1 && !burstRef.current.done) {
      burstRef.current.done = true
      if (onComplete) onComplete()
    }
  })

  return (
    <group renderOrder={2}>
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
      <instancedMesh
        ref={shardMeshRef}
        args={[null, null, shardData.length]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={shardMaterialRef}
          map={shardTexture}
          transparent
          opacity={0}
          side={THREE.FrontSide}
          toneMapped={false}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  )
}
