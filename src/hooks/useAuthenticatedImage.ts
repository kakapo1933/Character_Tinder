import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

export function useAuthenticatedImage(
  fileId: string,
  accessToken: string | null
): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (!accessToken) return

    let revoked = false
    let objectUrl: string | null = null

    async function fetchImage() {
      const response = await fetch(
        `${DRIVE_API}/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (response.status === 401 || response.status === 403) {
        logout()
        return
      }

      if (!response.ok || revoked) return

      const blob = await response.blob()
      if (revoked) return

      objectUrl = URL.createObjectURL(blob)
      setBlobUrl(objectUrl)
    }

    fetchImage()

    return () => {
      revoked = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [fileId, accessToken])

  return blobUrl
}
