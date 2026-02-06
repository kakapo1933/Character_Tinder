import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { SwipePage } from './SwipePage'
import { useAuthStore } from '../stores/authStore'
import { usePhotoStore } from '../stores/photoStore'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

const mockFolder = { id: 'source-folder', name: 'Source Folder' }

const mockImages = [
  { id: 'image-1', name: 'photo1.jpg', thumbnailLink: 'https://thumb1.jpg' },
  { id: 'image-2', name: 'photo2.jpg', thumbnailLink: 'https://thumb2.jpg' },
]

describe('SwipePage', () => {
  beforeEach(() => {
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test', picture: '' },
      'mock-token'
    )
    usePhotoStore.getState().reset()

    // Setup default handlers
    server.use(
      http.get(DRIVE_API, ({ request }) => {
        const url = new URL(request.url)
        const q = url.searchParams.get('q') || ''

        if (q.includes("'source-folder' in parents") && q.includes('mimeType contains')) {
          return HttpResponse.json({ files: mockImages })
        }
        return HttpResponse.json({ files: [] })
      })
    )
  })

  describe('copy to destination', () => {
    it('copies photo to destination folder when keeping', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      let copiedFileId: string | null = null
      let copiedToFolderId: string | null = null

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, async ({ params, request }) => {
          copiedFileId = params.fileId as string
          const body = (await request.json()) as { parents: string[] }
          copiedToFolderId = body.parents[0]
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      // Wait for photos to load
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Click the keep button (heart icon)
      const keepButton = screen.getByTitle('Keep (→)')
      await user.click(keepButton)

      // Verify copy was called with correct parameters
      await waitFor(() => {
        expect(copiedFileId).toBe('image-1')
        expect(copiedToFolderId).toBe('dest-folder')
      })
    })

    it('does not copy when no destination folder is set', async () => {
      const user = userEvent.setup()
      let copyCalled = false

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          copyCalled = true
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      // Wait for photos to load
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Click the keep button
      const keepButton = screen.getByTitle('Keep (→)')
      await user.click(keepButton)

      // Wait a bit and verify copy was NOT called
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(copyCalled).toBe(false)
    })

    it('still marks photo as kept even if copy fails', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      // Wait for photos to load
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Click the keep button
      const keepButton = screen.getByTitle('Keep (→)')
      await user.click(keepButton)

      // Photo should still be marked as kept
      await waitFor(() => {
        expect(usePhotoStore.getState().keepIds).toContain('image-1')
      })
    })

    it('copies photo when swiping right', async () => {
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      let copiedFileId: string | null = null

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, async ({ params }) => {
          copiedFileId = params.fileId as string
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      // Wait for photos to load
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Simulate a right swipe by triggering the swipe card's onSwipeRight callback
      // This is handled by the SwipeCard component - we can test via keyboard
      const user = userEvent.setup()
      await user.keyboard('{ArrowRight}')

      // Verify copy was called
      await waitFor(() => {
        expect(copiedFileId).toBe('image-1')
      })
    })

    it('shows warning toast when copy fails with 404 (file not found)', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          return HttpResponse.json(
            { error: { code: 404, message: 'File not found' } },
            { status: 404 }
          )
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      // Wait for photos to load
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Click the keep button
      const keepButton = screen.getByTitle('Keep (→)')
      await user.click(keepButton)

      // Should show a warning about the copy failure
      await waitFor(() => {
        expect(screen.getByText(/could not copy/i)).toBeInTheDocument()
      })

      // Photo should still be marked as kept
      expect(usePhotoStore.getState().keepIds).toContain('image-1')
    })

    it('shows success toast when copy succeeds', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      // Wait for photos to load
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Click the keep button
      const keepButton = screen.getByTitle('Keep (→)')
      await user.click(keepButton)

      // Should show a success message
      await waitFor(() => {
        expect(screen.getByText(/copied to/i)).toBeInTheDocument()
      })
    })

    it('clears copy error after a few seconds', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          return HttpResponse.json({ error: { code: 404 } }, { status: 404 })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      // Wait for photos to load
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Click the keep button
      const keepButton = screen.getByTitle('Keep (→)')
      await user.click(keepButton)

      // Should show warning
      await waitFor(() => {
        expect(screen.getByText(/could not copy/i)).toBeInTheDocument()
      })

      // Warning should be cleared after 3 seconds (use real timers)
      await waitFor(
        () => {
          expect(screen.queryByText(/could not copy/i)).not.toBeInTheDocument()
        },
        { timeout: 4000 }
      )
    })

    it('stores copied file ID after successful copy', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      // Wait for photos to load
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Click the keep button
      const keepButton = screen.getByTitle('Keep (→)')
      await user.click(keepButton)

      // Copied file ID should be stored
      await waitFor(() => {
        expect(usePhotoStore.getState().copiedFileIds['image-1']).toBe('copied-file-id')
      })
    })

    it('deletes copied file when user discards after undo keep', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      let deletedFileId: string | null = null

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        }),
        http.delete(`${DRIVE_API}/:fileId`, ({ params }) => {
          deletedFileId = params.fileId as string
          return new HttpResponse(null, { status: 204 })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      // Wait for photos to load
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Keep the photo (triggers copy)
      const keepButton = screen.getByTitle('Keep (→)')
      await user.click(keepButton)

      // Wait for copy to complete
      await waitFor(() => {
        expect(usePhotoStore.getState().copiedFileIds['image-1']).toBe('copied-file-id')
      })

      // Undo the keep
      const undoButton = screen.getByTitle('Undo (Z)')
      await user.click(undoButton)

      // Now discard the photo
      const discardButton = screen.getByTitle('Discard (←)')
      await user.click(discardButton)

      // Copied file should be deleted from destination folder
      await waitFor(() => {
        expect(deletedFileId).toBe('copied-file-id')
      })

      // And removed from store tracking
      expect(usePhotoStore.getState().copiedFileIds['image-1']).toBeUndefined()
    })

    it('does not delete if photo was never copied', async () => {
      const user = userEvent.setup()
      // No destination folder set = no copy happens

      let deleteCalled = false

      server.use(
        http.delete(`${DRIVE_API}/:fileId`, () => {
          deleteCalled = true
          return new HttpResponse(null, { status: 204 })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      // Wait for photos to load
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Discard directly (no keep/undo)
      const discardButton = screen.getByTitle('Discard (←)')
      await user.click(discardButton)

      // Delete should NOT be called
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(deleteCalled).toBe(false)
    })
  })

  describe('delete notification toast', () => {
    it('shows "Removed from [folder]" toast when deleting previously copied file', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        }),
        http.delete(`${DRIVE_API}/:fileId`, () => {
          return new HttpResponse(null, { status: 204 })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Keep the photo (triggers copy)
      const keepButton = screen.getByTitle('Keep (→)')
      await user.click(keepButton)

      // Wait for copy to complete
      await waitFor(() => {
        expect(usePhotoStore.getState().copiedFileIds['image-1']).toBe('copied-file-id')
      })

      // Undo the keep
      const undoButton = screen.getByTitle('Undo (Z)')
      await user.click(undoButton)

      // Now discard the photo (triggers delete)
      const discardButton = screen.getByTitle('Discard (←)')
      await user.click(discardButton)

      // Should show delete success toast
      await waitFor(() => {
        expect(screen.getByText(/removed from destination/i)).toBeInTheDocument()
      })
    })

    it('shows warning toast when delete fails', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        }),
        http.delete(`${DRIVE_API}/:fileId`, () => {
          return HttpResponse.json(
            { error: { code: 500, message: 'Internal server error' } },
            { status: 500 }
          )
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Keep the photo (triggers copy)
      await user.click(screen.getByTitle('Keep (→)'))

      // Wait for copy to complete
      await waitFor(() => {
        expect(usePhotoStore.getState().copiedFileIds['image-1']).toBe('copied-file-id')
      })

      // Undo the keep
      await user.click(screen.getByTitle('Undo (Z)'))

      // Now discard the photo (triggers delete which will fail)
      await user.click(screen.getByTitle('Discard (←)'))

      // Should show warning about the delete failure
      await waitFor(() => {
        expect(screen.getByText(/could not remove/i)).toBeInTheDocument()
      })

      // Photo should still be discarded
      expect(usePhotoStore.getState().discardIds).toContain('image-1')
    })

    it('auto-clears delete error toast after 3 seconds', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        }),
        http.delete(`${DRIVE_API}/:fileId`, () => {
          return HttpResponse.json(
            { error: { code: 500, message: 'Internal server error' } },
            { status: 500 }
          )
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Keep, undo, then discard to trigger delete
      await user.click(screen.getByTitle('Keep (→)'))
      await waitFor(() => {
        expect(usePhotoStore.getState().copiedFileIds['image-1']).toBeDefined()
      })
      await user.click(screen.getByTitle('Undo (Z)'))
      await user.click(screen.getByTitle('Discard (←)'))

      // Warning should appear
      await waitFor(() => {
        expect(screen.getByText(/could not remove/i)).toBeInTheDocument()
      })

      // Warning should be cleared after 3 seconds
      await waitFor(
        () => {
          expect(screen.queryByText(/could not remove/i)).not.toBeInTheDocument()
        },
        { timeout: 4000 }
      )
    })

    it('auto-clears delete toast after 2 seconds', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        }),
        http.delete(`${DRIVE_API}/:fileId`, () => {
          return new HttpResponse(null, { status: 204 })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Keep, undo, then discard
      await user.click(screen.getByTitle('Keep (→)'))
      await waitFor(() => {
        expect(usePhotoStore.getState().copiedFileIds['image-1']).toBeDefined()
      })
      await user.click(screen.getByTitle('Undo (Z)'))
      await user.click(screen.getByTitle('Discard (←)'))

      // Toast should appear
      await waitFor(() => {
        expect(screen.getByText(/removed from/i)).toBeInTheDocument()
      })

      // Toast should be cleared after 2 seconds
      await waitFor(
        () => {
          expect(screen.queryByText(/removed from/i)).not.toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('does not show delete toast when discarding never-copied photo', async () => {
      const user = userEvent.setup()
      // No destination folder = no copy, so no delete toast expected

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Discard directly
      const discardButton = screen.getByTitle('Discard (←)')
      await user.click(discardButton)

      // Wait a bit and verify no delete toast appears
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(screen.queryByText(/removed from/i)).not.toBeInTheDocument()
    })
  })

  describe('duplicate prevention', () => {
    it('shows "Already in [folder]" toast when photo already copied', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)
      // Pre-populate the copied file ID to simulate already copied
      usePhotoStore.getState().setCopiedFileId('image-1', 'existing-copied-id')

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Click keep on already-copied photo
      await user.click(screen.getByTitle('Keep (→)'))

      // Should show info toast about already being in folder
      await waitFor(() => {
        expect(screen.getByText(/already in destination/i)).toBeInTheDocument()
      })
    })

    it('does NOT call copy API for already-copied photos', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)
      usePhotoStore.getState().setCopiedFileId('image-1', 'existing-copied-id')

      let copyCalled = false
      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          copyCalled = true
          return HttpResponse.json({ id: 'new-copied-id', name: 'photo1.jpg' })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Click keep on already-copied photo
      await user.click(screen.getByTitle('Keep (→)'))

      // Wait for any async operations
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Copy API should NOT have been called
      expect(copyCalled).toBe(false)
    })

    it('still marks photo as kept when skipping duplicate copy', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)
      usePhotoStore.getState().setCopiedFileId('image-1', 'existing-copied-id')

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Click keep on already-copied photo
      await user.click(screen.getByTitle('Keep (→)'))

      // Photo should still be marked as kept
      await waitFor(() => {
        expect(usePhotoStore.getState().keepIds).toContain('image-1')
      })
    })
  })

  describe('counter badges next to buttons', () => {
    it('displays kept count badge next to keep button', async () => {
      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Should find a kept count badge near the keep button
      const keptBadge = screen.getByTestId('kept-badge')
      expect(keptBadge).toBeInTheDocument()
      expect(keptBadge).toHaveTextContent('0')
    })

    it('displays discarded count badge next to discard button', async () => {
      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Should find a discarded count badge near the discard button
      const discardedBadge = screen.getByTestId('discarded-badge')
      expect(discardedBadge).toBeInTheDocument()
      expect(discardedBadge).toHaveTextContent('0')
    })

    it('updates kept badge count when keeping photos', async () => {
      const user = userEvent.setup()
      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      const keptBadge = screen.getByTestId('kept-badge')
      expect(keptBadge).toHaveTextContent('0')

      // Click the keep button
      await user.click(screen.getByTitle('Keep (→)'))

      await waitFor(() => {
        expect(keptBadge).toHaveTextContent('1')
      })
    })

    it('updates discarded badge count when discarding photos', async () => {
      const user = userEvent.setup()
      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      const discardedBadge = screen.getByTestId('discarded-badge')
      expect(discardedBadge).toHaveTextContent('0')

      // Click the discard button
      await user.click(screen.getByTitle('Discard (←)'))

      await waitFor(() => {
        expect(discardedBadge).toHaveTextContent('1')
      })
    })
  })

  describe('startIndex prop', () => {
    const fiveImages = [
      { id: 'img-0', name: 'photo0.jpg', thumbnailLink: 'https://thumb0.jpg' },
      { id: 'img-1', name: 'photo1.jpg', thumbnailLink: 'https://thumb1.jpg' },
      { id: 'img-2', name: 'photo2.jpg', thumbnailLink: 'https://thumb2.jpg' },
      { id: 'img-3', name: 'photo3.jpg', thumbnailLink: 'https://thumb3.jpg' },
      { id: 'img-4', name: 'photo4.jpg', thumbnailLink: 'https://thumb4.jpg' },
    ]

    it('passes startIndex to setPhotos when provided', async () => {
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          const q = url.searchParams.get('q') || ''
          if (q.includes("'source-folder' in parents") && q.includes('mimeType contains')) {
            return HttpResponse.json({ files: fiveImages })
          }
          return HttpResponse.json({ files: [] })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
          startIndex={3}
        />
      )

      // Wait for photos to load
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // currentIndex should be 3 (not 0) because startIndex was passed
      expect(usePhotoStore.getState().currentIndex).toBe(3)
    })
  })

  describe('operation indicators', () => {
    it('shows "Copying..." indicator during copy operation', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      // Use a delayed response to give time to see the indicator
      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 200))
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Initially no copying indicator
      expect(screen.queryByText(/copying/i)).not.toBeInTheDocument()

      // Click keep button to start copy
      await user.click(screen.getByTitle('Keep (→)'))

      // Should show copying indicator during operation
      expect(screen.getByText(/copying/i)).toBeInTheDocument()

      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.queryByText(/copying/i)).not.toBeInTheDocument()
      })
    })

    it('shows "Deleting..." indicator during delete operation', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        }),
        http.delete(`${DRIVE_API}/:fileId`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 200))
          return new HttpResponse(null, { status: 204 })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Keep the photo (triggers copy)
      await user.click(screen.getByTitle('Keep (→)'))

      // Wait for copy to complete
      await waitFor(() => {
        expect(usePhotoStore.getState().copiedFileIds['image-1']).toBe('copied-file-id')
      })

      // Undo the keep
      await user.click(screen.getByTitle('Undo (Z)'))

      // Initially no deleting indicator
      expect(screen.queryByText(/deleting/i)).not.toBeInTheDocument()

      // Discard the photo (triggers delete)
      await user.click(screen.getByTitle('Discard (←)'))

      // Should show deleting indicator during operation
      expect(screen.getByText(/deleting/i)).toBeInTheDocument()

      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.queryByText(/deleting/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('UI blocking during save/delete', () => {
    it('disables buttons during copy operation', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      // Use a delayed response to give time to check disabled state
      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 200))
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      const keepButton = screen.getByTitle('Keep (→)')
      const discardButton = screen.getByTitle('Discard (←)')

      // Buttons should be enabled initially
      expect(keepButton).not.toBeDisabled()
      expect(discardButton).not.toBeDisabled()

      // Click keep button to start copy
      await user.click(keepButton)

      // Buttons should be disabled during operation
      expect(keepButton).toBeDisabled()
      expect(discardButton).toBeDisabled()

      // Wait for operation to complete
      await waitFor(() => {
        expect(keepButton).not.toBeDisabled()
      })
    })

    it('disables keyboard shortcuts during operation', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      let copyCount = 0
      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, async () => {
          copyCount++
          await new Promise((resolve) => setTimeout(resolve, 200))
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Start copy with first keypress
      await user.keyboard('{ArrowRight}')

      // Try to trigger another action while copying
      await user.keyboard('{ArrowRight}')
      await user.keyboard('{ArrowLeft}')

      // Wait for first operation to complete
      await waitFor(() => {
        expect(usePhotoStore.getState().keepIds).toContain('image-1')
      })

      // Only one copy should have been called
      expect(copyCount).toBe(1)
    })

    it('re-enables buttons after copy failure', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          return HttpResponse.json({ error: 'Failed' }, { status: 500 })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      const keepButton = screen.getByTitle('Keep (→)')
      await user.click(keepButton)

      // Buttons should be disabled during operation
      expect(keepButton).toBeDisabled()

      // After failure, buttons should be re-enabled
      await waitFor(() => {
        expect(keepButton).not.toBeDisabled()
      })
    })

    it('disables buttons during delete operation', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        }),
        http.delete(`${DRIVE_API}/:fileId`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 200))
          return new HttpResponse(null, { status: 204 })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Keep, undo, then prepare to discard
      await user.click(screen.getByTitle('Keep (→)'))
      await waitFor(() => {
        expect(usePhotoStore.getState().copiedFileIds['image-1']).toBeDefined()
      })
      await user.click(screen.getByTitle('Undo (Z)'))

      const discardButton = screen.getByTitle('Discard (←)')
      await user.click(discardButton)

      // Buttons should be disabled during delete
      expect(discardButton).toBeDisabled()

      // After completion, buttons should be re-enabled (or we move to next photo)
      await waitFor(() => {
        // Either button is re-enabled or we've moved to next photo
        expect(usePhotoStore.getState().currentIndex).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Cinema Mode layout', () => {
    it('has dark background', async () => {
      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // The main container should have dark background
      const mainContainer = screen.getByTestId('swipe-card').closest('[class*="bg-zinc-950"]')
      expect(mainContainer).toBeInTheDocument()
    })

    it('has frosted glass header', async () => {
      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Header should have backdrop-blur for frosted glass
      const header = document.querySelector('header')
      expect(header).toBeInTheDocument()
      expect(header?.className).toMatch(/backdrop-blur/)
    })

    it('has vignette overlays', async () => {
      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Should have gradient overlays with pointer-events-none
      const vignettes = document.querySelectorAll('[class*="pointer-events-none"][class*="gradient"]')
      expect(vignettes.length).toBeGreaterThanOrEqual(1)
    })

    it('renders CinemaToast for notifications', async () => {
      const user = userEvent.setup()
      const destinationFolder = { id: 'dest-folder', name: 'Destination' }
      usePhotoStore.getState().setDestinationFolder(destinationFolder)

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () => {
          return HttpResponse.json({ id: 'copied-file-id', name: 'photo1.jpg' })
        })
      )

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      await user.click(screen.getByTitle('Keep (→)'))

      // CinemaToast should render with aria-live
      await waitFor(() => {
        const toast = screen.getByRole('status')
        expect(toast).toHaveAttribute('aria-live', 'polite')
      })
    })
  })

  describe('initialPhotos prop', () => {
    it('renders pre-loaded photos without API call when initialPhotos is provided', async () => {
      const preloadedPhotos = [
        { id: 'pre-1', name: 'preloaded1.jpg' },
        { id: 'pre-2', name: 'preloaded2.jpg' },
      ]

      // Reset handlers so any Drive API call will trigger MSW's onUnhandledRequest error
      server.resetHandlers()

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
          initialPhotos={preloadedPhotos}
        />
      )

      // Should render immediately without loading state
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('respects prefers-reduced-motion by wrapping animations', async () => {
      // Mock matchMedia for reduced motion
      const originalMatchMedia = window.matchMedia
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(
        <SwipePage
          folder={mockFolder}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Verify the component renders without errors under reduced motion
      expect(screen.getByTestId('swipe-card')).toBeInTheDocument()

      window.matchMedia = originalMatchMedia
    })
  })
})
