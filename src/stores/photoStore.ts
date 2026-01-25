import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DriveImage, DriveFolder } from '../services/googleDriveApi'
import { getFolder } from '../services/googleDriveApi'

interface HistoryEntry {
  action: 'keep' | 'discard'
  photoId: string
}

interface PhotoState {
  photos: DriveImage[]
  currentIndex: number
  keepIds: string[]
  discardIds: string[]
  history: HistoryEntry[]
  currentPhoto: DriveImage | undefined
  isComplete: boolean
  destinationFolder: DriveFolder | null
  copiedFileIds: Record<string, string> // sourceId -> copiedId mapping
  setPhotos: (photos: DriveImage[], startIndex?: number) => void
  keep: () => void
  discard: () => void
  undo: () => void
  reset: () => void
  setDestinationFolder: (folder: DriveFolder | null) => void
  validateDestinationFolder: (accessToken: string) => Promise<void>
  setCopiedFileId: (sourceId: string, copiedId: string) => void
  removeCopiedFileId: (sourceId: string) => void
}

const computeDerived = (photos: DriveImage[], currentIndex: number) => ({
  currentPhoto: photos[currentIndex],
  isComplete: photos.length > 0 && currentIndex >= photos.length,
})

export const usePhotoStore = create<PhotoState>()(
  persist(
    (set, get) => ({
      photos: [],
      currentIndex: 0,
      keepIds: [],
      discardIds: [],
      history: [],
      currentPhoto: undefined,
      isComplete: false,
      destinationFolder: null,
      copiedFileIds: {},

      setPhotos: (photos, startIndex = 0) =>
        set({
          photos,
          currentIndex: startIndex,
          keepIds: [],
          discardIds: [],
          history: [],
          ...computeDerived(photos, startIndex),
        }),

      keep: () => {
        const state = get()
        const currentPhoto = state.photos[state.currentIndex]
        if (!currentPhoto) return

        const newIndex = state.currentIndex + 1
        set({
          keepIds: [...state.keepIds, currentPhoto.id],
          currentIndex: newIndex,
          history: [...state.history, { action: 'keep', photoId: currentPhoto.id }],
          ...computeDerived(state.photos, newIndex),
        })
      },

      discard: () => {
        const state = get()
        const currentPhoto = state.photos[state.currentIndex]
        if (!currentPhoto) return

        const newIndex = state.currentIndex + 1
        set({
          discardIds: [...state.discardIds, currentPhoto.id],
          currentIndex: newIndex,
          history: [...state.history, { action: 'discard', photoId: currentPhoto.id }],
          ...computeDerived(state.photos, newIndex),
        })
      },

      undo: () => {
        const state = get()
        if (state.history.length === 0) return

        const lastAction = state.history[state.history.length - 1]
        const newHistory = state.history.slice(0, -1)
        const newIndex = state.currentIndex - 1

        if (lastAction.action === 'keep') {
          set({
            keepIds: state.keepIds.filter((id) => id !== lastAction.photoId),
            currentIndex: newIndex,
            history: newHistory,
            ...computeDerived(state.photos, newIndex),
          })
        } else {
          set({
            discardIds: state.discardIds.filter((id) => id !== lastAction.photoId),
            currentIndex: newIndex,
            history: newHistory,
            ...computeDerived(state.photos, newIndex),
          })
        }
      },

      reset: () =>
        set({
          photos: [],
          currentIndex: 0,
          keepIds: [],
          discardIds: [],
          history: [],
          currentPhoto: undefined,
          isComplete: false,
          destinationFolder: null,
          copiedFileIds: {},
        }),

      setDestinationFolder: (folder) => set({ destinationFolder: folder }),

      setCopiedFileId: (sourceId, copiedId) =>
        set((state) => ({
          copiedFileIds: { ...state.copiedFileIds, [sourceId]: copiedId },
        })),

      removeCopiedFileId: (sourceId) =>
        set((state) => {
          const { [sourceId]: _removed, ...rest } = state.copiedFileIds
          void _removed // intentionally unused
          return { copiedFileIds: rest }
        }),

      validateDestinationFolder: async (accessToken) => {
        const { destinationFolder } = get()
        if (!destinationFolder) return

        try {
          const folder = await getFolder(accessToken, destinationFolder.id)
          if (!folder) {
            set({ destinationFolder: null })
          }
        } catch {
          // Keep folder on API error (graceful degradation)
        }
      },
    }),
    {
      name: 'photo-storage',
    }
  )
)
