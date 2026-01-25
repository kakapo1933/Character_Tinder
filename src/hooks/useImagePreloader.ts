import { useEffect } from 'react'
import type { DriveImage } from '../services/googleDriveApi'
import { buildDriveImageUrl } from '../utils/imageUrl'

const PRELOAD_COUNT = 3

export function useImagePreloader(
  photos: DriveImage[],
  currentIndex: number
) {
  useEffect(() => {
    const photosToPreload = photos.slice(
      currentIndex + 1,
      currentIndex + 1 + PRELOAD_COUNT
    )

    photosToPreload.forEach((photo) => {
      const img = new Image()
      img.src = buildDriveImageUrl(photo.id)
    })
  }, [photos, currentIndex])
}
