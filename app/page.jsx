'use client'

import dynamic from 'next/dynamic'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { ReadingPanel } from '@/components/dom/ReadingPanel'

const LOCATION_STORAGE_KEY = 'omen_location_v1'

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
    const getStoredLocation = () => {
      try {
        const stored = localStorage.getItem(LOCATION_STORAGE_KEY)
        if (!stored) return null
        const location = JSON.parse(stored)
        return { stored, location }
      } catch (err) {
        return null
      }
    }

    const attemptLocationUpload = (recordIdOverride) => {
      if (window.__omenLocationDenied) return
      const recordId = recordIdOverride || localStorage.getItem('omen_visit_id')
      const storedLocation = getStoredLocation()
      if (!recordId || !storedLocation) return
      if (window.__omenLocationUploading) {
        window.__omenLocationQueued = true
        return
      }
      window.__omenLocationUploading = true

      fetch('/api/feishu/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId,
          location: storedLocation.location,
        }),
      })
        .then((res) => {
          if (!res.ok) return
          try {
            if (localStorage.getItem(LOCATION_STORAGE_KEY) === storedLocation.stored) {
              localStorage.removeItem(LOCATION_STORAGE_KEY)
            }
          } catch (err) {}
        })
        .catch(() => {})
        .finally(() => {
          window.__omenLocationUploading = false
          if (window.__omenLocationQueued) {
            window.__omenLocationQueued = false
            attemptLocationUpload()
          }
        })
    }

    if (typeof window !== 'undefined') {
      if (!window.__omenVisitLogged) {
        window.__omenVisitLogged = true
        try {
          localStorage.removeItem('omen_visit_id')
          localStorage.removeItem(LOCATION_STORAGE_KEY)
        } catch (err) {}
        fetch('/api/feishu/visit', { method: 'POST' })
          .then((res) => res.json())
          .then((data) => {
            if (data?.recordId) {
              localStorage.setItem('omen_visit_id', data.recordId)
              attemptLocationUpload(data.recordId)
            }
          })
          .catch(() => {})
      }
    }

    if (typeof window !== 'undefined') {
      if (window.__omenLocationRequested) return
      window.__omenLocationRequested = true
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    if (window.__omenLocationDenied) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        }
        try {
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location))
        } catch (err) {}
        attemptLocationUpload()
      },
      (err) => {
        if (err?.code === 1) {
          window.__omenLocationDenied = true
          try {
            localStorage.removeItem(LOCATION_STORAGE_KEY)
          } catch (error) {}
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 300000,
      }
    )
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
          </Suspense>
        </Canvas>
        <ReadingPanel />
      </div>

      {isPortal && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 text-center text-purple-300/60 text-sm select-none">
          <p>长按阵法，默念你的问题</p>
        </div>
      )}
    </>
  )
}
