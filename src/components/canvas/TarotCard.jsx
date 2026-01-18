'use client'

import { forwardRef, useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TAROT_DATA } from '@/constants/tarotData'

const CARD_SIZE = { width: 1.2, height: 2 }
const BACK_STYLE = {
  color: '#ffffff',
  opacity: 1,
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
        () => {
          // 纹理加载失败，静默处理
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
    isReversed = false,
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
        () => {
          // 纹理加载失败，静默处理
        }
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
          <mesh position={[0, 0, -0.002]} rotation={[0, Math.PI, isReversed ? Math.PI : 0]}>
            <planeGeometry args={[CARD_SIZE.width, CARD_SIZE.height]} />
            <meshBasicMaterial
              map={frontMap}
              opacity={1}
              side={THREE.FrontSide}
              transparent={false}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>
    </group>
  )
})
