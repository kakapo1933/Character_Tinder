import { useEffect, useState } from 'react'
import { usePhotoStore } from '../stores/photoStore'
import { listAllImages } from '../services/googleDriveApi'
import type { DriveImage } from '../services/googleDriveApi'

interface UsePhotoLoaderParams {
  folderId: string
  accessToken: string | null
  startIndex?: number
  initialPhotos?: DriveImage[]
}

export function usePhotoLoader({ folderId, accessToken, startIndex, initialPhotos }: UsePhotoLoaderParams) {
  const setPhotos = usePhotoStore((s) => s.setPhotos)
  const [loading, setLoading] = useState(!initialPhotos)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialPhotos) {
      setPhotos(initialPhotos, startIndex ?? 0)
      return
    }

    if (!accessToken) return

    const loadPhotos = async () => {
      try {
        setLoading(true)
        const images = await listAllImages(accessToken, folderId)
        setPhotos(images, startIndex ?? 0)
      } catch {
        setError('Failed to load photos')
      } finally {
        setLoading(false)
      }
    }

    loadPhotos()
  }, [accessToken, folderId, setPhotos, startIndex, initialPhotos])

  return { loading, error }
}
