'use client'

import dynamic from 'next/dynamic'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { ReadingPanel } from '@/components/dom/ReadingPanel'

const StarRing = dynamic(() => import('@/components/canvas/StarRing').then((mod) => mod.StarRing), {
  ssr: false,
})
const PortalHexagram = dynamic(() => import('@/components/canvas/PortalHexagram').then((mod) => mod.PortalHexagram), {
  ssr: false,
})
const CameraRig = dynamic(() => import('@/components/canvas/CameraRig').then((mod) => mod.CameraRig), {
  ssr: false,
})

export default function Page() {
  const phase = useGameStore((state) => state.phase)
  const isPortal = phase === 'PORTAL'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.__omenVisitLogged) return
      window.__omenVisitLogged = true
    }

    fetch('/api/feishu/visit', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.recordId) {
          localStorage.setItem('omen_visit_id', data.recordId)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <>
      <div
        className="fixed inset-0 bg-black"
        style={{
          backgroundImage: "url('/img/background.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          touchAction: 'none',
        }}
      >
        <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
          <Suspense fallback={null}>
            <CameraRig />
            <StarRing />
            {isPortal && <PortalHexagram />}
          </Suspense>
        </Canvas>
        <ReadingPanel />
      </div>

      {isPortal && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 text-center text-purple-300/60 text-sm">
          <p>触摸阵法，默念你的问题</p>
        </div>
      )}
    </>
  )
}
