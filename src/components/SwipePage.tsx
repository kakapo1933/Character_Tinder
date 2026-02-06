import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'
import { usePhotoStore } from '../stores/photoStore'
import { copyFile, deleteFile } from '../services/googleDriveApi'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useAutoHide } from '../hooks/useAutoHide'
import { useImagePreloader } from '../hooks/useImagePreloader'
import { usePhotoLoader } from '../hooks/usePhotoLoader'
import { SwipeCard } from './SwipeCard'
import { ProgressBar } from './ProgressBar'
import { UndoButton } from './UndoButton'
import { DestinationFolderPicker } from './DestinationFolderPicker'
import { CinemaToast } from './CinemaToast'
import type { DriveFolder, DriveImage } from '../services/googleDriveApi'

type ToastType = 'success' | 'error' | 'info' | 'loading'

interface Toast {
  message: string
  type: ToastType
}

interface SwipePageProps {
  folder: DriveFolder
  onComplete: () => void
  onBack: () => void
  startIndex?: number
  initialPhotos?: DriveImage[]
}

export function SwipePage({ folder, onComplete, onBack, startIndex, initialPhotos }: SwipePageProps) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const {
    photos,
    currentPhoto,
    isComplete,
    currentIndex,
    keepIds,
    discardIds,
    history,
    keep,
    discard,
    undo,
    destinationFolder,
    copiedFileIds,
    setCopiedFileId,
    removeCopiedFileId,
  } = usePhotoStore()

  const setDestinationFolder = usePhotoStore((s) => s.setDestinationFolder)
  const { loading, error } = usePhotoLoader({ folderId: folder.id, accessToken, startIndex, initialPhotos })
  const [toast, setToast] = useState<Toast | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showDestinationPicker, setShowDestinationPicker] = useState(false)

  const { isVisible: chromeVisible, show: showChrome } = useAutoHide({ timeout: 3000 })

  // Keep with copy to destination folder
  const handleKeep = useCallback(async () => {
    if (!currentPhoto || !accessToken || isSaving) return

    setIsSaving(true)
    try {
      // Copy to destination folder if set
      if (destinationFolder) {
        // Check if already copied (duplicate prevention)
        if (copiedFileIds[currentPhoto.id]) {
          setToast({ message: `Already in ${destinationFolder.name}`, type: 'info' })
          setTimeout(() => setToast(null), 2000)
        } else {
          setToast({ message: 'Copying...', type: 'loading' })
          try {
            const result = await copyFile(accessToken, currentPhoto.id, destinationFolder.id)
            setCopiedFileId(currentPhoto.id, result.id)
            setToast({ message: `Copied to ${destinationFolder.name}`, type: 'success' })
            setTimeout(() => setToast(null), 2000)
          } catch (err) {
            console.error('Failed to copy file:', err)
            setToast({ message: 'Could not copy photo to destination folder', type: 'error' })
            setTimeout(() => setToast(null), 3000)
          }
        }
      }

      keep()
    } finally {
      setIsSaving(false)
    }
  }, [accessToken, currentPhoto, destinationFolder, keep, setCopiedFileId, isSaving, copiedFileIds])

  // Discard with optional deletion of copied file from target folder
  const handleDiscard = useCallback(async () => {
    if (!currentPhoto || !accessToken || isSaving) return

    const copiedId = copiedFileIds[currentPhoto.id]
    const willDelete = copiedId && destinationFolder

    setIsSaving(true)
    try {
      // If this photo was previously copied, delete it from target folder
      if (willDelete) {
        setToast({ message: 'Deleting...', type: 'loading' })
        try {
          await deleteFile(accessToken, copiedId)
          removeCopiedFileId(currentPhoto.id)
          setToast({ message: `Removed from ${destinationFolder.name}`, type: 'info' })
          setTimeout(() => setToast(null), 2000)
        } catch (err) {
          console.error('Failed to delete copied file:', err)
          setToast({ message: 'Could not remove photo from destination folder', type: 'error' })
          setTimeout(() => setToast(null), 3000)
          // Continue with discard even if delete fails
        }
      }

      discard()
    } finally {
      setIsSaving(false)
    }
  }, [accessToken, currentPhoto, copiedFileIds, discard, removeCopiedFileId, destinationFolder, isSaving])

  useKeyboardShortcuts({
    onKeep: handleKeep,
    onDiscard: handleDiscard,
    onUndo: undo,
    onEscape: onBack,
    onToggleChrome: showChrome,
    disabled: isComplete || loading || isSaving,
  })

  // Preload next images for smooth experience
  useImagePreloader(photos, currentIndex, accessToken)

  useEffect(() => {
    if (isComplete && photos.length > 0) {
      onComplete()
    }
  }, [isComplete, photos.length, onComplete])

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-zinc-400">Loading photos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-dvh flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <p className="text-rose-400 mb-4">{error}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-zinc-800 text-zinc-200 rounded-lg hover:bg-zinc-700"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="h-dvh flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">No photos found in this folder</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-zinc-800 text-zinc-200 rounded-lg hover:bg-zinc-700"
          >
            Choose another folder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh bg-zinc-950 flex flex-col relative overflow-hidden"
         onMouseMove={showChrome}
         onTouchStart={showChrome}
    >
      {/* Top vignette */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent pointer-events-none z-10" />

      {/* Header - frosted glass, auto-hide */}
      <header className={`absolute inset-x-0 top-0 z-20 bg-black/60 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between transition-opacity duration-300 ${
        chromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <button
          onClick={onBack}
          className="text-zinc-300 hover:text-white"
        >
          ← Back
        </button>
        <h1 className="font-medium text-zinc-100">{folder.name}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDestinationPicker(true)}
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200"
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
          <span className="text-sm text-zinc-500">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>
      </header>

      {/* CinemaToast notification */}
      <CinemaToast toast={toast} />

      {/* Main swipe area - full viewport */}
      <main className="flex-1 flex items-center justify-center relative overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {currentPhoto && (
            <motion.div
              key={currentPhoto.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <SwipeCard
                photo={currentPhoto}
                onSwipeLeft={handleDiscard}
                onSwipeRight={handleKeep}
                disabled={isSaving}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom vignette */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 to-transparent pointer-events-none z-10" />

      {/* Footer with controls - frosted glass, auto-hide */}
      <footer className={`absolute inset-x-0 bottom-0 z-20 bg-black/60 backdrop-blur-md border-t border-white/10 p-4 transition-opacity duration-300 ${
        chromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
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
              className="bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center"
            >
              {discardIds.length}
            </span>
            <button
              onClick={handleDiscard}
              disabled={isSaving}
              className={`w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-500/30'}`}
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
              className={`w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-500/30'}`}
              title="Keep (→)"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <span
              data-testid="kept-badge"
              className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center"
            >
              {keepIds.length}
            </span>
          </div>
        </div>

        <div className="mt-2 text-center text-xs text-zinc-500">
          ← → or swipe · Space toggle · Esc back
        </div>
      </footer>

      {/* Destination picker modal */}
      {showDestinationPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden border border-zinc-700">
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
