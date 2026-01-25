import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { usePhotoStore } from './photoStore'
import * as googleDriveApi from '../services/googleDriveApi'

vi.mock('../services/googleDriveApi', async () => {
  const actual = await vi.importActual('../services/googleDriveApi')
  return {
    ...actual,
    getFolder: vi.fn(),
  }
})

const mockPhotos = [
  { id: '1', name: 'photo1.jpg', thumbnailLink: 'https://thumb1.jpg' },
  { id: '2', name: 'photo2.jpg', thumbnailLink: 'https://thumb2.jpg' },
  { id: '3', name: 'photo3.jpg', thumbnailLink: 'https://thumb3.jpg' },
]

describe('PhotoStore', () => {
  beforeEach(() => {
    usePhotoStore.getState().reset()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('starts with empty photos', () => {
      expect(usePhotoStore.getState().photos).toEqual([])
    })

    it('starts with currentIndex at 0', () => {
      expect(usePhotoStore.getState().currentIndex).toBe(0)
    })

    it('starts with empty keep list', () => {
      expect(usePhotoStore.getState().keepIds).toEqual([])
    })

    it('starts with empty discard list', () => {
      expect(usePhotoStore.getState().discardIds).toEqual([])
    })
  })

  describe('setPhotos', () => {
    it('sets photos', () => {
      usePhotoStore.getState().setPhotos(mockPhotos)
      expect(usePhotoStore.getState().photos).toEqual(mockPhotos)
    })

    it('resets currentIndex to 0 by default', () => {
      usePhotoStore.getState().setPhotos(mockPhotos)
      usePhotoStore.getState().keep()
      usePhotoStore.getState().setPhotos(mockPhotos)
      expect(usePhotoStore.getState().currentIndex).toBe(0)
    })

    it('sets currentIndex to startIndex when provided', () => {
      usePhotoStore.getState().setPhotos(mockPhotos, 2)
      expect(usePhotoStore.getState().currentIndex).toBe(2)
      expect(usePhotoStore.getState().currentPhoto).toEqual(mockPhotos[2])
    })

    it('sets currentPhoto based on startIndex', () => {
      usePhotoStore.getState().setPhotos(mockPhotos, 1)
      expect(usePhotoStore.getState().currentPhoto).toEqual(mockPhotos[1])
    })
  })

  describe('currentPhoto', () => {
    it('returns current photo', () => {
      usePhotoStore.getState().setPhotos(mockPhotos)
      expect(usePhotoStore.getState().currentPhoto).toEqual(mockPhotos[0])
    })

    it('returns undefined when no photos', () => {
      expect(usePhotoStore.getState().currentPhoto).toBeUndefined()
    })
  })

  describe('keep', () => {
    beforeEach(() => {
      usePhotoStore.getState().setPhotos(mockPhotos)
    })

    it('adds current photo id to keepIds', () => {
      usePhotoStore.getState().keep()
      expect(usePhotoStore.getState().keepIds).toContain('1')
    })

    it('advances to next photo', () => {
      usePhotoStore.getState().keep()
      expect(usePhotoStore.getState().currentIndex).toBe(1)
    })

    it('pushes action to history for undo', () => {
      usePhotoStore.getState().keep()
      expect(usePhotoStore.getState().history.length).toBe(1)
      expect(usePhotoStore.getState().history[0]).toEqual({ action: 'keep', photoId: '1' })
    })
  })

  describe('discard', () => {
    beforeEach(() => {
      usePhotoStore.getState().setPhotos(mockPhotos)
    })

    it('adds current photo id to discardIds', () => {
      usePhotoStore.getState().discard()
      expect(usePhotoStore.getState().discardIds).toContain('1')
    })

    it('advances to next photo', () => {
      usePhotoStore.getState().discard()
      expect(usePhotoStore.getState().currentIndex).toBe(1)
    })

    it('pushes action to history for undo', () => {
      usePhotoStore.getState().discard()
      expect(usePhotoStore.getState().history.length).toBe(1)
      expect(usePhotoStore.getState().history[0]).toEqual({ action: 'discard', photoId: '1' })
    })
  })

  describe('undo', () => {
    beforeEach(() => {
      usePhotoStore.getState().setPhotos(mockPhotos)
    })

    it('reverses keep action', () => {
      usePhotoStore.getState().keep()
      usePhotoStore.getState().undo()
      expect(usePhotoStore.getState().keepIds).not.toContain('1')
      expect(usePhotoStore.getState().currentIndex).toBe(0)
    })

    it('reverses discard action', () => {
      usePhotoStore.getState().discard()
      usePhotoStore.getState().undo()
      expect(usePhotoStore.getState().discardIds).not.toContain('1')
      expect(usePhotoStore.getState().currentIndex).toBe(0)
    })

    it('removes action from history', () => {
      usePhotoStore.getState().keep()
      usePhotoStore.getState().undo()
      expect(usePhotoStore.getState().history.length).toBe(0)
    })

    it('does nothing when history is empty', () => {
      const stateBefore = usePhotoStore.getState()
      usePhotoStore.getState().undo()
      expect(usePhotoStore.getState().currentIndex).toBe(stateBefore.currentIndex)
    })

    it('handles multiple undos', () => {
      usePhotoStore.getState().keep()
      usePhotoStore.getState().discard()
      usePhotoStore.getState().keep()

      expect(usePhotoStore.getState().currentIndex).toBe(3)
      expect(usePhotoStore.getState().keepIds).toEqual(['1', '3'])
      expect(usePhotoStore.getState().discardIds).toEqual(['2'])

      usePhotoStore.getState().undo()
      expect(usePhotoStore.getState().keepIds).toEqual(['1'])
      expect(usePhotoStore.getState().currentIndex).toBe(2)

      usePhotoStore.getState().undo()
      expect(usePhotoStore.getState().discardIds).toEqual([])
      expect(usePhotoStore.getState().currentIndex).toBe(1)

      usePhotoStore.getState().undo()
      expect(usePhotoStore.getState().keepIds).toEqual([])
      expect(usePhotoStore.getState().currentIndex).toBe(0)
    })
  })

  describe('isComplete', () => {
    it('returns false when photos remain', () => {
      usePhotoStore.getState().setPhotos(mockPhotos)
      expect(usePhotoStore.getState().isComplete).toBe(false)
    })

    it('returns true when all photos processed', () => {
      usePhotoStore.getState().setPhotos(mockPhotos)
      usePhotoStore.getState().keep()
      usePhotoStore.getState().keep()
      usePhotoStore.getState().keep()
      expect(usePhotoStore.getState().isComplete).toBe(true)
    })
  })

  describe('destinationFolder', () => {
    it('starts with null destination folder', () => {
      expect(usePhotoStore.getState().destinationFolder).toBeNull()
    })

    it('sets destination folder', () => {
      const folder = { id: 'dest-123', name: 'Liked Photos' }
      usePhotoStore.getState().setDestinationFolder(folder)
      expect(usePhotoStore.getState().destinationFolder).toEqual(folder)
    })

    it('clears destination folder when reset', () => {
      const folder = { id: 'dest-123', name: 'Liked Photos' }
      usePhotoStore.getState().setDestinationFolder(folder)
      usePhotoStore.getState().reset()
      expect(usePhotoStore.getState().destinationFolder).toBeNull()
    })
  })

  describe('copiedFileIds', () => {
    it('starts with empty copiedFileIds map', () => {
      expect(usePhotoStore.getState().copiedFileIds).toEqual({})
    })

    it('tracks copied file ID when setCopiedFileId is called', () => {
      usePhotoStore.getState().setCopiedFileId('source-1', 'copied-1')
      expect(usePhotoStore.getState().copiedFileIds).toEqual({ 'source-1': 'copied-1' })
    })

    it('removes copied file ID when removeCopiedFileId is called', () => {
      usePhotoStore.getState().setCopiedFileId('source-1', 'copied-1')
      usePhotoStore.getState().setCopiedFileId('source-2', 'copied-2')
      usePhotoStore.getState().removeCopiedFileId('source-1')
      expect(usePhotoStore.getState().copiedFileIds).toEqual({ 'source-2': 'copied-2' })
    })

    it('clears copiedFileIds when reset is called', () => {
      usePhotoStore.getState().setCopiedFileId('source-1', 'copied-1')
      usePhotoStore.getState().reset()
      expect(usePhotoStore.getState().copiedFileIds).toEqual({})
    })
  })

  describe('validateDestinationFolder', () => {
    it('keeps folder when it still exists', async () => {
      const folder = { id: 'dest-123', name: 'Liked Photos' }
      usePhotoStore.getState().setDestinationFolder(folder)

      vi.spyOn(googleDriveApi, 'getFolder').mockResolvedValue(folder)

      await usePhotoStore.getState().validateDestinationFolder('mock-token')
      expect(usePhotoStore.getState().destinationFolder).toEqual(folder)
    })

    it('resets to null when folder has been deleted', async () => {
      const folder = { id: 'deleted-folder', name: 'Deleted Folder' }
      usePhotoStore.getState().setDestinationFolder(folder)

      vi.spyOn(googleDriveApi, 'getFolder').mockResolvedValue(null)

      await usePhotoStore.getState().validateDestinationFolder('mock-token')
      expect(usePhotoStore.getState().destinationFolder).toBeNull()
    })

    it('does nothing when no destination folder is set', async () => {
      const getFolderSpy = vi.spyOn(googleDriveApi, 'getFolder')

      await usePhotoStore.getState().validateDestinationFolder('mock-token')
      expect(getFolderSpy).not.toHaveBeenCalled()
    })

    it('keeps folder on API error (graceful degradation)', async () => {
      const folder = { id: 'dest-123', name: 'Liked Photos' }
      usePhotoStore.getState().setDestinationFolder(folder)

      vi.spyOn(googleDriveApi, 'getFolder').mockRejectedValue(new Error('Network error'))

      await usePhotoStore.getState().validateDestinationFolder('mock-token')
      expect(usePhotoStore.getState().destinationFolder).toEqual(folder)
    })
  })
})
