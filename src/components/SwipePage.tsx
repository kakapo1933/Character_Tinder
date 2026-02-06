import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { usePhotoStore } from '../stores/photoStore'
import { listAllImages, copyFile, deleteFile } from '../services/googleDriveApi'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useImagePreloader } from '../hooks/useImagePreloader'
import { SwipeCard } from './SwipeCard'
import { ProgressBar } from './ProgressBar'
import { UndoButton } from './UndoButton'
import { DestinationFolderPicker } from './DestinationFolderPicker'
import type { DriveFolder } from '../services/googleDriveApi'

interface SwipePageProps {
  folder: DriveFolder
  onComplete: () => void
  onBack: () => void
}

export function SwipePage({ folder, onComplete, onBack }: SwipePageProps) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const {
    photos,
    currentPhoto,
    isComplete,
    currentIndex,
    keepIds,
    discardIds,
    history,
    setPhotos,
    keep,
    discard,
    undo,
    destinationFolder,
    copiedFileIds,
    setCopiedFileId,
    removeCopiedFileId,
  } = usePhotoStore()

  const setDestinationFolder = usePhotoStore((s) => s.setDestinationFolder)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [alreadyCopiedInfo, setAlreadyCopiedInfo] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [operationType, setOperationType] = useState<'copy' | 'delete' | null>(null)
  const [showDestinationPicker, setShowDestinationPicker] = useState(false)

  // Keep with copy to destination folder
  const handleKeep = useCallback(async () => {
    if (!currentPhoto || !accessToken || isSaving) return

    setIsSaving(true)
    setOperationType('copy')
    try {
      // Copy to destination folder if set
      if (destinationFolder) {
        // Check if already copied (duplicate prevention)
        if (copiedFileIds[currentPhoto.id]) {
          setAlreadyCopiedInfo(`Already in ${destinationFolder.name}`)
          setTimeout(() => setAlreadyCopiedInfo(null), 2000)
        } else {
          try {
            const result = await copyFile(accessToken, currentPhoto.id, destinationFolder.id)
            setCopiedFileId(currentPhoto.id, result.id)
            setCopySuccess(`Copied to ${destinationFolder.name}`)
            // Auto-clear after 2 seconds
            setTimeout(() => setCopySuccess(null), 2000)
          } catch (err) {
            console.error('Failed to copy file:', err)
            setCopyError('Could not copy photo to destination folder')
            // Auto-clear after 3 seconds
            setTimeout(() => setCopyError(null), 3000)
          }
        }
      }

      keep()
    } finally {
      setIsSaving(false)
      setOperationType(null)
    }
  }, [accessToken, currentPhoto, destinationFolder, keep, setCopiedFileId, isSaving, copiedFileIds])

  // Discard with optional deletion of copied file from target folder
  const handleDiscard = useCallback(async () => {
    if (!currentPhoto || !accessToken || isSaving) return

    const copiedId = copiedFileIds[currentPhoto.id]
    const willDelete = copiedId && destinationFolder

    setIsSaving(true)
    if (willDelete) {
      setOperationType('delete')
    }
    try {
      // If this photo was previously copied, delete it from target folder
      if (willDelete) {
        try {
          await deleteFile(accessToken, copiedId)
          removeCopiedFileId(currentPhoto.id)
          setDeleteSuccess(`Removed from ${destinationFolder.name}`)
          setTimeout(() => setDeleteSuccess(null), 2000)
        } catch (err) {
          console.error('Failed to delete copied file:', err)
          setDeleteError('Could not remove photo from destination folder')
          // Auto-clear after 3 seconds
          setTimeout(() => setDeleteError(null), 3000)
          // Continue with discard even if delete fails
        }
      }

      discard()
    } finally {
      setIsSaving(false)
      setOperationType(null)
    }
  }, [accessToken, currentPhoto, copiedFileIds, discard, removeCopiedFileId, destinationFolder, isSaving])

  useKeyboardShortcuts({
    onKeep: handleKeep,
    onDiscard: handleDiscard,
    onUndo: undo,
    disabled: isComplete || loading || isSaving,
  })

  // Preload next images for smooth experience
  useImagePreloader(photos, currentIndex)

  useEffect(() => {
    if (!accessToken) return

    const loadPhotos = async () => {
      try {
        setLoading(true)
        const images = await listAllImages(accessToken, folder.id)
        setPhotos(images)
      } catch {
        setError('Failed to load photos')
      } finally {
        setLoading(false)
      }
    }

    loadPhotos()
  }, [accessToken, folder.id, setPhotos])

  useEffect(() => {
    if (isComplete && photos.length > 0) {
      onComplete()
    }
  }, [isComplete, photos.length, onComplete])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-600">Loading photos...</p>
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

  if (photos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No photos found in this folder</p>
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDestinationPicker(true)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            title="Change destination folder"
            aria-label="Change destination folder"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            {destinationFolder ? (
              <span className="max-w-[80px] truncate">{destinationFolder.name}</span>
            ) : (
              <span>Set dest</span>
            )}
          </button>
          <span className="text-sm text-gray-500">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>
      </header>

      {/* Copy success toast */}
      {copySuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-100 border border-green-400 text-green-800 px-4 py-2 rounded-lg shadow-lg z-50">
          {copySuccess}
        </div>
      )}

      {/* Copy error toast */}
      {copyError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg z-50">
          {copyError}
        </div>
      )}

      {/* Delete success toast */}
      {deleteSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-blue-100 border border-blue-400 text-blue-800 px-4 py-2 rounded-lg shadow-lg z-50">
          {deleteSuccess}
        </div>
      )}

      {/* Delete error toast */}
      {deleteError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg z-50">
          {deleteError}
        </div>
      )}

      {/* Already copied info toast */}
      {alreadyCopiedInfo && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-gray-100 border border-gray-400 text-gray-800 px-4 py-2 rounded-lg shadow-lg z-50">
          {alreadyCopiedInfo}
        </div>
      )}

      {/* Operation indicator */}
      {isSaving && operationType === 'copy' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          Copying...
        </div>
      )}
      {isSaving && operationType === 'delete' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          Deleting...
        </div>
      )}

      {/* Main swipe area */}
      <main className="flex-1 flex items-center justify-center p-2 relative overflow-hidden min-h-0">
        {currentPhoto && (
          <SwipeCard
            photo={currentPhoto}
            onSwipeLeft={handleDiscard}
            onSwipeRight={handleKeep}
            disabled={isSaving}
          />
        )}
      </main>

      {/* Footer with controls */}
      <footer className="bg-white shadow-sm p-4">
        <div className="max-w-md mx-auto mb-4">
          <ProgressBar
            current={currentIndex}
            total={photos.length}
          />
        </div>

        <div className="flex items-center justify-center gap-8">
          {/* Discard button with badge */}
          <div className="flex items-center gap-2">
            <span
              data-testid="discarded-badge"
              className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center"
            >
              {discardIds.length}
            </span>
            <button
              onClick={handleDiscard}
              disabled={isSaving}
              className={`w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-200'}`}
              title="Discard (←)"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <UndoButton onClick={undo} disabled={history.length === 0 || isSaving} />

          {/* Keep button with badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleKeep}
              disabled={isSaving}
              className={`w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-200'}`}
              title="Keep (→)"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <span
              data-testid="kept-badge"
              className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center"
            >
              {keepIds.length}
            </span>
          </div>
        </div>

        <div className="mt-2 text-center text-xs text-gray-400">
          ← → or swipe
        </div>
      </footer>

      {/* Destination picker modal */}
      {showDestinationPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
            <DestinationFolderPicker
              onSelect={(folder) => {
                setDestinationFolder(folder)
                setShowDestinationPicker(false)
              }}
              onCancel={() => setShowDestinationPicker(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
