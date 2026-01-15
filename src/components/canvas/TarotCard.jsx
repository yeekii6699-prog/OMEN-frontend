'use client'

import { forwardRef, useRef, useState, useEffect, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { TAROT_DATA } from '@/constants/tarotData'

const CARD_SIZE = { width: 1.2, height: 2 }
const BACK_STYLE = {
  color: '#ffffff',
  opacity: 1,
}
const TEXT_STYLE = {
  color: '#111827',
  fontSize: 0.16,
}

// 预加载背面纹理（只需要加载一次）
let backTextureCache = null

function useBackTexture() {
  const [backTexture] = useState(() => {
    if (!backTextureCache) {
      const loader = new THREE.TextureLoader()
      backTextureCache = loader.load(
        'https://tarot-1378447783.cos.ap-guangzhou.myqcloud.com/web_pictrue/Pback.jpg',
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace
        },
        undefined,
        (error) => {
          console.warn('[texture] Failed to load card back.', error)
        }
      )
    }
    return backTextureCache
  })
  return backTexture
}

export const TarotCard = forwardRef(function TarotCard(
  {
    index,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    isRevealed = false,
    isChosen = false, // 新增：卡牌是否已被选中
    showFront = true,
    backDoubleSided = false,
    onCardClick,
    onCardDoubleClick,
    onPointerDown,
    onPointerUp,
    onPointerOver,
    onPointerOut,
  },
  ref
) {
  const flipRef = useRef(null)
  const tarot = TAROT_DATA[index] || {}
  const displayName = tarot.nameCN || tarot.name || 'Unknown'
  const backTexture = useBackTexture()
  const [frontTexture, setFrontTexture] = useState(null)
  const frontMap = frontTexture || backTexture

  // 选中时就开始加载图片，不再等待翻转
  useEffect(() => {
    if ((isChosen || isRevealed) && tarot.image && !frontTexture) {
      const loader = new THREE.TextureLoader()
      loader.load(
        tarot.image,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace
          texture.needsUpdate = true
          setFrontTexture(texture)
        },
        undefined,
        (err) => console.warn('Failed to load texture:', tarot.image, err)
      )
    }
  }, [isChosen, tarot.image, frontTexture])

  useFrame(() => {
    const group = flipRef.current
    if (!group) return
    const targetRotation = isRevealed ? Math.PI : 0
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetRotation, 0.1)
  })

  const handleClick = (event) => {
    if (!onCardClick) return
    event.stopPropagation()
    onCardClick(index)
  }

  const handleDoubleClick = (event) => {
    if (!onCardDoubleClick) return
    event.stopPropagation()
    onCardDoubleClick(index)
  }

  return (
    <group
      ref={ref}
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <group ref={flipRef}>
        <mesh position={[0, 0, 0.002]}>
          <planeGeometry args={[CARD_SIZE.width, CARD_SIZE.height]} />
          <meshBasicMaterial
            map={backTexture}
            color={BACK_STYLE.color}
            opacity={BACK_STYLE.opacity}
            side={THREE.FrontSide}
            transparent={false}
            toneMapped={false}
          />
        </mesh>
        {backDoubleSided && (
          <mesh position={[0, 0, -0.002]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[CARD_SIZE.width, CARD_SIZE.height]} />
            <meshBasicMaterial
              map={backTexture}
              color={BACK_STYLE.color}
              opacity={BACK_STYLE.opacity}
              side={THREE.FrontSide}
              transparent={false}
              toneMapped={false}
            />
          </mesh>
        )}
        {showFront && (
          <mesh position={[0, 0, -0.002]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[CARD_SIZE.width, CARD_SIZE.height]} />
            <meshBasicMaterial
              map={frontMap}
              opacity={1}
              side={THREE.FrontSide}
              transparent={false}
              toneMapped={false}
            />
            {isRevealed && (
              <Suspense fallback={null}>
                <Text
                  position={[0, -0.78, 0.01]}
                  fontSize={TEXT_STYLE.fontSize}
                  color={TEXT_STYLE.color}
                  anchorX="center"
                  anchorY="middle"
                  maxWidth={CARD_SIZE.width * 0.9}
                  textAlign="center"
                >
                  {displayName}
                </Text>
              </Suspense>
            )}
          </mesh>
        )}
      </group>
    </group>
  )
})
