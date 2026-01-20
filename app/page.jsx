'use client'

import dynamic from 'next/dynamic'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { CollapsibleChat } from '@/components/dom/CollapsibleChat'

const VISIT_RETRY_LIMIT = 3
const VISIT_RETRY_BASE_DELAY = 1600

const StarRing = dynamic(() => import('@/components/canvas/StarRing').then((mod) => mod.StarRing), {
  ssr: false,
})
const PortalHexagram = dynamic(() => import('@/components/canvas/PortalHexagram').then((mod) => mod.PortalHexagram), {
  ssr: false,
})
const CameraRig = dynamic(() => import('@/components/canvas/CameraRig').then((mod) => mod.CameraRig), {
  ssr: false,
})
const SpreadSlots = dynamic(() => import('@/components/canvas/SpreadSlots').then((mod) => mod.SpreadSlots), {
  ssr: false,
})
const SpreadPreview = dynamic(() => import('@/components/canvas/SpreadPreview').then((mod) => mod.default || mod.SpreadPreview), {
  ssr: false,
})
const SpreadSelector = dynamic(() => import('@/components/dom/SpreadSelector').then((mod) => mod.default || mod.SpreadSelector), {
  ssr: false,
})

export default function Page() {
  const phase = useGameStore((state) => state.phase)
  const isPortal = phase === 'PORTAL'

  useEffect(() => {
    let visitRetries = 0
    let visitRetryTimer = null

    const getRecordId = () => {
      try {
        return localStorage.getItem('omen_visit_id') || ''
      } catch (err) {
        return ''
      }
    }

    const setRecordId = (recordId) => {
      try {
        localStorage.setItem('omen_visit_id', recordId)
      } catch (err) {}
    }

    const scheduleVisitRetry = () => {
      if (visitRetryTimer || visitRetries >= VISIT_RETRY_LIMIT) return
      const delay = VISIT_RETRY_BASE_DELAY * (visitRetries + 1)
      visitRetries += 1
      visitRetryTimer = setTimeout(() => {
        visitRetryTimer = null
        createVisitRecord()
      }, delay)
    }

    const createVisitRecord = () => {
      if (window.__omenVisitInFlight) return
      window.__omenVisitInFlight = true
      fetch('/api/feishu/visit', { method: 'POST' })
        .then((res) => res.json())
        .then((data) => {
          if (data?.recordId) {
            setRecordId(data.recordId)
            visitRetries = 0
            return
          }
          scheduleVisitRetry()
        })
        .catch(() => {
          scheduleVisitRetry()
        })
        .finally(() => {
          window.__omenVisitInFlight = false
        })
    }

    if (typeof window !== 'undefined') {
      if (!window.__omenVisitLogged) {
        window.__omenVisitLogged = true
        try {
          localStorage.removeItem('omen_visit_id')
        } catch (err) {}
        createVisitRecord()
      }
    }

    return () => {
      if (visitRetryTimer) clearTimeout(visitRetryTimer)
    }
  }, [])

  return (
    <>
      <div
        className="fixed inset-0 bg-black"
        style={{
          backgroundImage:
            "url('https://tarot-1378447783.cos.ap-guangzhou.myqcloud.com/web_pictrue/background.jpg')",
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
            <SpreadPreview />
            <SpreadSlots />
          </Suspense>
        </Canvas>
        <SpreadSelector />
        <CollapsibleChat />
      </div>

      {isPortal && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 text-center text-sm text-purple-300/60 select-none">
          <p>长按阵法，默念你的问题</p>
        </div>
      )}
    </>
  )
}
