import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { listAllImages, type DriveFolder, type DriveImage } from '../services/googleDriveApi'
import { buildDriveImageUrl } from '../utils/imageUrl'

interface ImagePreviewProps {
  folder: DriveFolder
  onImageClick: (startIndex: number) => void
  onBack: () => void
}

export function ImagePreview({ folder, onImageClick, onBack }: ImagePreviewProps) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const [images, setImages] = useState<DriveImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const loadImages = async () => {
      try {
        setLoading(true)
        const result = await listAllImages(accessToken, folder.id)
        setImages(result)
      } catch {
        setError('Failed to load images')
      } finally {
        setLoading(false)
      }
    }

    loadImages()
  }, [accessToken, folder.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-600">Loading images...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No images found in this folder</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Choose another folder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        <h1 className="font-medium text-gray-900">{folder.name}</h1>
        <div className="text-sm text-gray-500">
          {images.length} images
        </div>
      </header>

      {/* Image grid */}
      <main className="flex-1 p-4">
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => onImageClick(index)}
              className="aspect-square overflow-hidden rounded-lg hover:ring-2 hover:ring-blue-500 transition-all"
            >
              <img
                src={buildDriveImageUrl(image.id)}
                alt={image.name}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
