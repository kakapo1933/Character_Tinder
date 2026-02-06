import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { listAllImages, type DriveFolder, type DriveImage } from '../services/googleDriveApi'
import { buildDriveImageUrl } from '../utils/imageUrl'
import { useGooglePicker } from '../hooks/useGooglePicker'

interface FolderPickerProps {
  onImageClick: (folder: DriveFolder, startIndex: number) => void
}

export function FolderPicker({ onImageClick }: FolderPickerProps) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null)
  const [images, setImages] = useState<DriveImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { openPicker } = useGooglePicker()

  useEffect(() => {
    if (!accessToken || !selectedFolder) return

    setLoading(true)
    setError(null)

    listAllImages(accessToken, selectedFolder.id)
      .then((result) => {
        setImages(result)
      })
      .catch(() => {
        setError('Failed to load images')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [accessToken, selectedFolder])

  const handleOpenPicker = () => {
    openPicker((folder) => {
      if (folder) {
        setSelectedFolder(folder)
        setImages([])
      }
    })
  }

  const handleImageClick = (index: number) => {
    if (selectedFolder) {
      onImageClick(selectedFolder, index)
    }
  }

  if (!selectedFolder) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
        <p className="text-gray-500 mb-4">Choose a folder with photos to sort</p>
        <button
          onClick={handleOpenPicker}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Select folder
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Folder header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="font-medium text-gray-900">{selectedFolder.name}</span>
        </div>
        <button
          onClick={handleOpenPicker}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Change folder
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-2 text-gray-600">Loading images...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-600">{error}</div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <p>No images found in this folder</p>
            <button
              onClick={handleOpenPicker}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700"
            >
              Try another folder
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-3 gap-3">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => handleImageClick(index)}
                  className="flex flex-col items-center hover:bg-gray-100 rounded-lg p-2 transition-colors"
                >
                  <div className="w-full aspect-square overflow-hidden rounded-lg mb-2">
                    <img
                      src={buildDriveImageUrl(image.id)}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-gray-700 truncate w-full text-center">
                    {image.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
