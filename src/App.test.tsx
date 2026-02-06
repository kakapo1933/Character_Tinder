import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
      const user = userEvent.setup()
      render(<App />)

      // Click select folder button
      await user.click(screen.getByRole('button', { name: /select folder/i }))

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

      const user = userEvent.setup()
      render(<App />)

      await user.click(screen.getByRole('button', { name: /select folder/i }))
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

      const user = userEvent.setup()
      render(<App />)

      await user.click(screen.getByRole('button', { name: /select folder/i }))
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
      const user = userEvent.setup()
      render(<App />)

      await user.click(screen.getByRole('button', { name: /select folder/i }))
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
})
