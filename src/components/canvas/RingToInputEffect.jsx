'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const EFFECT = {
  duration: 1.6,
  delay: 0.2,
  arcHeight: 1.4,
  spin: 2.6,
}

const SHARDS = {
  count: 96,
  minScale: 0.16,
  maxScale: 0.34,
  jitter: 0.05,
}

const TARGET = {
  width: 1.18,
  height: 0.24,
  y: -0.76,
  mobileWidth: 1.36,
  mobileHeight: 0.28,
  mobileY: -0.7,
  distance: 8,
  mobileDistance: 9,
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

const getRectPoint = (t, width, height) => {
  const w = width * 0.5
  const h = height * 0.5
  const top = w * 2
  const side = h * 2
  const total = 2 * (top + side)
  let p = t * total

  if (p <= top) return [-w + p, h]
  p -= top
  if (p <= side) return [w, h - p]
  p -= side
  if (p <= top) return [w - p, -h]
  p -= top
  return [-w, -h + p]
}

const getWorldFromNdc = (x, y, distance, camera) => {
  const ndc = new THREE.Vector3(x, y, 0.5)
  ndc.unproject(camera)
  const dir = ndc.sub(camera.position).normalize()
  return camera.position.clone().add(dir.multiplyScalar(distance))
}

let shardTextureCache = null

const useShardTexture = () => {
  const [texture] = useState(() => {
    if (!shardTextureCache) {
      const loader = new THREE.TextureLoader()
      shardTextureCache = loader.load(
        'https://tarot-1378447783.cos.ap-guangzhou.myqcloud.com/web_pictrue/Pback.jpg',
        (loaded) => {
          loaded.colorSpace = THREE.SRGBColorSpace
        },
        undefined,
        (error) => {
          console.warn('[texture] Failed to load shard texture.', error)
        }
      )
    }
    return shardTextureCache
  })
  return texture
}

const createShardSeeds = (seed, count, startCount) => {
  const rand = createSeededRandom(seed)
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    t: rand(),
    startIndex: Math.floor(rand() * Math.max(1, startCount)),
    scale: THREE.MathUtils.lerp(SHARDS.minScale, SHARDS.maxScale, rand()),
    spin: (rand() - 0.5) * EFFECT.spin,
    jitterX: (rand() - 0.5) * SHARDS.jitter,
    jitterY: (rand() - 0.5) * SHARDS.jitter,
  }))
}

export function RingToInputEffect({ active, startPositions, onComplete }) {
  const { camera, size } = useThree()
  const meshRef = useRef(null)
  const materialRef = useRef(null)
  const timeRef = useRef(0)
  const doneRef = useRef(false)
  const temp = useMemo(() => new THREE.Object3D(), [])
  const shardTexture = useShardTexture()
  const isMobile = size.width < 768

  const startRef = useRef([])
  const shardSeedsRef = useRef([])

  useEffect(() => {
    if (!active || !startPositions || startPositions.length === 0) {
      startRef.current = []
      shardSeedsRef.current = []
      doneRef.current = false
      if (materialRef.current) materialRef.current.opacity = 0
      return
    }

    startRef.current = startPositions.map((pos) =>
      pos instanceof THREE.Vector3 ? pos.clone() : new THREE.Vector3(...pos)
    )
    shardSeedsRef.current = createShardSeeds(27, SHARDS.count, startRef.current.length)
    doneRef.current = false
    timeRef.current = 0
  }, [active, startPositions])

  useFrame(({ clock }) => {
    if (!active || startRef.current.length === 0 || !meshRef.current) return

    if (timeRef.current === 0) {
      timeRef.current = clock.elapsedTime
    }

    const elapsed = clock.elapsedTime - timeRef.current - EFFECT.delay
    const progress = clamp01(elapsed / EFFECT.duration)
    const eased = easeOutCubic(progress)

    const targetWidth = isMobile ? TARGET.mobileWidth : TARGET.width
    const targetHeight = isMobile ? TARGET.mobileHeight : TARGET.height
    const targetY = isMobile ? TARGET.mobileY : TARGET.y
    const distance = isMobile ? TARGET.mobileDistance : TARGET.distance

    const center = getWorldFromNdc(0, targetY, distance, camera)

    for (let i = 0; i < SHARDS.count; i += 1) {
      const shard = shardSeedsRef.current[i]
      if (!shard) continue

      const start = startRef.current[shard.startIndex % startRef.current.length]
      const [nx, ny] = getRectPoint(shard.t, targetWidth, targetHeight)
      const target = getWorldFromNdc(nx + shard.jitterX, ny + shard.jitterY + targetY, distance, camera)

      temp.position.copy(start).lerp(target, eased)
      temp.position.y += Math.sin(Math.PI * eased) * EFFECT.arcHeight
      temp.quaternion.copy(camera.quaternion)
      temp.rotateZ(shard.spin * eased)
      temp.scale.setScalar(shard.scale)
      temp.updateMatrix()

      meshRef.current.setMatrixAt(i, temp.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true

    if (materialRef.current) {
      materialRef.current.opacity = 0.9
    }

    if (progress >= 1 && !doneRef.current) {
      doneRef.current = true
      if (onComplete) onComplete(center)
    }
  })

  if (!active) return null

  return (
    <instancedMesh ref={meshRef} args={[null, null, SHARDS.count]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={materialRef}
        map={shardTexture}
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  )
}
