import { useEffect, useState } from 'react'
import { usePhotoStore } from '../stores/photoStore'
import { listAllImages } from '../services/googleDriveApi'

interface UsePhotoLoaderParams {
  folderId: string
  accessToken: string | null
  startIndex?: number
}

export function usePhotoLoader({ folderId, accessToken, startIndex }: UsePhotoLoaderParams) {
  const setPhotos = usePhotoStore((s) => s.setPhotos)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
  }, [accessToken, folderId, setPhotos, startIndex])

  return { loading, error }
}
