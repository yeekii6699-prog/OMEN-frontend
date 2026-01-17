'use client'

import dynamic from 'next/dynamic'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { ReadingPanel } from '@/components/dom/ReadingPanel'

const LOCATION_STORAGE_KEY = 'omen_location_v1'
const VISIT_RETRY_LIMIT = 3
const VISIT_RETRY_BASE_DELAY = 1600
const LOCATION_RETRY_LIMIT = 3
const LOCATION_RETRY_BASE_DELAY = 2000

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
    let locationRetries = 0
    let visitRetryTimer = null
    let locationRetryTimer = null

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

    const scheduleLocationRetry = () => {
      if (locationRetryTimer || locationRetries >= LOCATION_RETRY_LIMIT) return
      const delay = LOCATION_RETRY_BASE_DELAY * (locationRetries + 1)
      locationRetries += 1
      locationRetryTimer = setTimeout(() => {
        locationRetryTimer = null
        attemptLocationUpload()
      }, delay)
    }

    const attemptLocationUpload = (recordIdOverride) => {
      if (window.__omenLocationDenied) return
      const recordId = recordIdOverride || getRecordId()
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
          if (!res.ok) {
            scheduleLocationRetry()
            return
          }
          locationRetries = 0
          try {
            if (localStorage.getItem(LOCATION_STORAGE_KEY) === storedLocation.stored) {
              localStorage.removeItem(LOCATION_STORAGE_KEY)
            }
          } catch (err) {}
        })
        .catch(() => {
          scheduleLocationRetry()
        })
        .finally(() => {
          window.__omenLocationUploading = false
          if (window.__omenLocationQueued) {
            window.__omenLocationQueued = false
            attemptLocationUpload()
          }
        })
    }

    const createVisitRecord = () => {
      if (window.__omenVisitInFlight) return
      window.__omenVisitInFlight = true
      fetch('/api/feishu/visit', { method: 'POST' })
        .then((res) => res.json())
        .then((data) => {
          if (data?.recordId) {
            setRecordId(data.recordId)
            attemptLocationUpload(data.recordId)
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

    const storeLocation = (location) => {
      try {
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location))
      } catch (err) {}
    }

    const handleLocationSuccess = (position) => {
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      }
      storeLocation(location)
      attemptLocationUpload()
    }

    const requestLocation = (options, allowFallback) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return
      if (window.__omenLocationDenied) return

      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleLocationSuccess(position)
        },
        (err) => {
          if (err?.code === 1) {
            window.__omenLocationDenied = true
            try {
              localStorage.removeItem(LOCATION_STORAGE_KEY)
            } catch (error) {}
            return
          }
          if (allowFallback) {
            requestLocation(
              {
                enableHighAccuracy: false,
                timeout: 8000,
                maximumAge: 600000,
              },
              false
            )
          }
        },
        options
      )
    }

    if (typeof window !== 'undefined') {
      if (!window.__omenVisitLogged) {
        window.__omenVisitLogged = true
        try {
          localStorage.removeItem('omen_visit_id')
          localStorage.removeItem(LOCATION_STORAGE_KEY)
        } catch (err) {}
        createVisitRecord()
      }
    }

    if (typeof window !== 'undefined') {
      if (!window.__omenLocationRequested) {
        window.__omenLocationRequested = true
        requestLocation(
          {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 300000,
          },
          true
        )
      }
    }

    return () => {
      if (visitRetryTimer) clearTimeout(visitRetryTimer)
      if (locationRetryTimer) clearTimeout(locationRetryTimer)
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
