import { useEffect } from 'react'
import type { DriveImage } from '../services/googleDriveApi'

const PRELOAD_COUNT = 3
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

export function useImagePreloader(
  photos: DriveImage[],
  currentIndex: number,
  accessToken: string | null
) {
  useEffect(() => {
    if (!accessToken) return

    const photosToPreload = photos.slice(
      currentIndex + 1,
      currentIndex + 1 + PRELOAD_COUNT
    )

    const controllers: AbortController[] = []

    photosToPreload.forEach((photo) => {
      const controller = new AbortController()
      controllers.push(controller)

      fetch(`${DRIVE_API}/${photo.id}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      }).catch(() => {
        // Preload failures are non-critical
      })
    })

    return () => {
      controllers.forEach((c) => c.abort())
    }
  }, [photos, currentIndex, accessToken])
}
