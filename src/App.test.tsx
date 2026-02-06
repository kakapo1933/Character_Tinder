import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'
import App from './App'
import { useAuthStore } from './stores/authStore'
import { usePhotoStore } from './stores/photoStore'
import {
  setupGooglePickerMock,
  cleanupGooglePickerMock,
  simulatePickerSelect,
  simulatePickerImageSelect,
  mockPickerBuilder,
  mockPicker,
} from './mocks/googlePicker'
import { resetPickerState } from './hooks/useGooglePicker'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

const mockImages = [
  { id: 'image-1', name: 'sunset.jpg' },
  { id: 'image-2', name: 'beach.png' },
]

describe('App', () => {
  beforeEach(() => {
    resetPickerState()
    setupGooglePickerMock()
    useAuthStore.setState({ accessToken: null, isAuthenticated: false })
    usePhotoStore.getState().reset()
  })

  afterEach(() => {
    cleanupGooglePickerMock()
    mockPickerBuilder.addView.mockClear()
    mockPickerBuilder.setOAuthToken.mockClear()
    mockPickerBuilder.setDeveloperKey.mockClear()
    mockPickerBuilder.setAppId.mockClear()
    mockPickerBuilder.setCallback.mockClear()
    mockPickerBuilder.enableFeature.mockClear()
    mockPickerBuilder.build.mockClear()
    mockPicker.setVisible.mockClear()
  })

  it('renders the title', () => {
    render(<App />)
    expect(screen.getByText('Character Tinder')).toBeInTheDocument()
  })

  describe('streamlined user flow', () => {
    beforeEach(() => {
      useAuthStore.getState().login(
        { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
        'mock-token'
      )
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          const q = url.searchParams.get('q') || ''
          const isImageQuery = q.includes("mimeType contains 'image/'")

          if (q.includes("'folder-1' in parents") && isImageQuery) {
            return HttpResponse.json({ files: mockImages })
          }
          return HttpResponse.json({ files: [] })
        }),
        http.post(DRIVE_API, async ({ request }) => {
          const body = await request.json() as { name: string }
          return HttpResponse.json({ id: 'auto-dest-id', name: body.name })
        })
      )
    })

    it('enters swiping directly after picking a folder (auto-creates destination)', async () => {
      render(<App />)

      // Picker auto-opens when authenticated
      await waitFor(() => {
        expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
      })

      // Simulate Google Picker folder selection
      simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

      // Should go directly to SwipePage
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Destination folder should have been auto-created
      const dest = usePhotoStore.getState().destinationFolder
      expect(dest).not.toBeNull()
      expect(dest!.name).toMatch(/Photos 2024/)
      expect(dest!.name).toMatch(/Test User/)
    })

    it('skips auto-create when destination folder already exists', async () => {
      // Pre-set a destination folder
      usePhotoStore.getState().setDestinationFolder({ id: 'existing-dest', name: 'My Dest' })

      render(<App />)

      // Picker auto-opens when authenticated
      await waitFor(() => {
        expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
      })

      simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

      // Should go to SwipePage
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Destination folder should remain the pre-set one
      expect(usePhotoStore.getState().destinationFolder).toEqual({ id: 'existing-dest', name: 'My Dest' })
    })

    it('still enters swiping even if auto-create fails', async () => {
      // Make createFolder fail
      server.use(
        http.post(DRIVE_API, () => {
          return HttpResponse.json({ error: 'Error' }, { status: 500 })
        })
      )

      render(<App />)

      // Picker auto-opens when authenticated
      await waitFor(() => {
        expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
      })

      simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

      // Should still go to SwipePage (graceful degradation)
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // No destination folder set
      expect(usePhotoStore.getState().destinationFolder).toBeNull()
    })

    it('validates destination folder on app load and clears if deleted', async () => {
      // Pre-set a destination folder that has been "deleted"
      usePhotoStore.getState().setDestinationFolder({ id: 'deleted-folder', name: 'Deleted Folder' })

      // Mock getFolder to return 404 (folder deleted)
      server.use(
        http.get(`${DRIVE_API}/:folderId`, ({ params }) => {
          if (params.folderId === 'deleted-folder') {
            return HttpResponse.json({ error: { code: 404 } }, { status: 404 })
          }
          return HttpResponse.json({ id: params.folderId, name: 'Test Folder' })
        })
      )

      render(<App />)

      // Wait for validation to complete and destination folder to be cleared
      await waitFor(() => {
        expect(usePhotoStore.getState().destinationFolder).toBeNull()
      })
    })

    it('auto-created folder name includes date, source folder name, and user name', async () => {
      render(<App />)

      // Picker auto-opens when authenticated
      await waitFor(() => {
        expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
      })

      simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      const dest = usePhotoStore.getState().destinationFolder
      expect(dest).not.toBeNull()
      // Format: YYYY-MM-DD_FolderName_UserName
      expect(dest!.name).toMatch(/^\d{4}-\d{2}-\d{2}_Photos 2024_Test User$/)
    })
  })

  describe('image selection from picker', () => {
    const allImagesInFolder = [
      { id: 'img-0', name: 'alpha.jpg' },
      { id: 'img-1', name: 'bravo.jpg' },
      { id: 'img-2', name: 'charlie.jpg' },
      { id: 'selected-image', name: 'delta.png' },
      { id: 'img-4', name: 'echo.jpg' },
    ]

    beforeEach(() => {
      useAuthStore.getState().login(
        { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
        'mock-token'
      )

      server.use(
        // getFileParent: first call gets file's parents, second gets folder metadata
        http.get(`${DRIVE_API}/:fileId`, ({ params, request }) => {
          const url = new URL(request.url)
          const fields = url.searchParams.get('fields') || ''

          // getFileParent step 1: get file's parent IDs
          if (params.fileId === 'selected-image' && fields.includes('parents')) {
            return HttpResponse.json({ id: 'selected-image', parents: ['parent-folder-1'] })
          }

          // getFileParent step 2: get parent folder metadata
          if (params.fileId === 'parent-folder-1' && fields.includes('name')) {
            return HttpResponse.json({ id: 'parent-folder-1', name: 'Parent Folder' })
          }

          return HttpResponse.json({ id: params.fileId, name: 'Unknown' })
        }),
        // listAllImages for the parent folder
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          const q = url.searchParams.get('q') || ''
          const isImageQuery = q.includes("mimeType contains 'image/'")

          if (q.includes("'parent-folder-1' in parents") && isImageQuery) {
            return HttpResponse.json({ files: allImagesInFolder })
          }
          return HttpResponse.json({ files: [] })
        }),
        // createFolder for auto-destination
        http.post(DRIVE_API, async ({ request }) => {
          const body = await request.json() as { name: string }
          return HttpResponse.json({ id: 'auto-dest-id', name: body.name })
        })
      )
    })

    it('image selection triggers getFileParent and starts swiping from correct index', async () => {
      render(<App />)

      // Picker auto-opens when authenticated
      await waitFor(() => {
        expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
      })

      // Simulate picking an image (not a folder) from the picker
      simulatePickerImageSelect({
        id: 'selected-image',
        name: 'delta.png',
        mimeType: 'image/png',
      })

      // Should enter swiping mode with photos loaded
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // The selected image is at index 3 in allImagesInFolder
      // SwipePage should start at that index, so counter shows "4 / 5"
      expect(screen.getByText('4 / 5')).toBeInTheDocument()
    })

    it('passes pre-loaded images to SwipePage so listAllImages is only called once', async () => {
      let listImagesCallCount = 0

      // Override listAllImages handler to count calls
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          const q = url.searchParams.get('q') || ''
          const isImageQuery = q.includes("mimeType contains 'image/'")

          if (q.includes("'parent-folder-1' in parents") && isImageQuery) {
            listImagesCallCount++
            return HttpResponse.json({ files: allImagesInFolder })
          }
          return HttpResponse.json({ files: [] })
        }),
      )

      render(<App />)

      // Picker auto-opens when authenticated
      await waitFor(() => {
        expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
      })

      simulatePickerImageSelect({
        id: 'selected-image',
        name: 'delta.png',
        mimeType: 'image/png',
      })

      // Should enter swiping mode
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // resolveSelection calls listAllImages once.
      // If App passes initialPhotos to SwipePage, usePhotoLoader skips the API call.
      // Without initialPhotos, usePhotoLoader calls listAllImages again (count = 2).
      expect(listImagesCallCount).toBe(1)
    })

    it('folder selection still works as before (no startIndex)', async () => {
      render(<App />)

      // Picker auto-opens when authenticated
      await waitFor(() => {
        expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
      })

      // Simulate picking a folder (existing behavior)
      simulatePickerSelect({ id: 'parent-folder-1', name: 'Parent Folder' })

      // Should enter swiping mode
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })

      // Folder selection starts from index 0, so counter shows "1 / 5"
      expect(screen.getByText('1 / 5')).toBeInTheDocument()
    })
  })
})
