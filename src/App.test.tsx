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

const mockFolders = [
  { id: 'folder-1', name: 'Photos 2024' },
  { id: 'folder-2', name: 'Vacation' },
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

  describe('destination folder flow', () => {
    beforeEach(() => {
      useAuthStore.getState().login(
        { id: '1', email: 'test@test.com', name: 'Test', picture: '' },
        'mock-token'
      )
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          const q = url.searchParams.get('q') || ''
          const isImageQuery = q.includes("mimeType contains 'image/'")
          const isFolderQuery = q.includes("mimeType='application/vnd.google-apps.folder'")

          if (q.includes("'folder-1' in parents") && isImageQuery) {
            return HttpResponse.json({ files: mockImages })
          }
          if (q.includes("'root' in parents") && isFolderQuery) {
            return HttpResponse.json({ files: mockFolders })
          }
          if (q.includes('sharedWithMe = true') && isFolderQuery) {
            return HttpResponse.json({ files: [] })
          }
          return HttpResponse.json({ files: [] })
        }),
        http.post(DRIVE_API, async ({ request }) => {
          const body = await request.json() as { name: string }
          return HttpResponse.json({ id: 'new-folder-id', name: body.name })
        })
      )
    })

    it('shows destination folder picker modal when clicking image without destination set', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Use Google Picker to select source folder
      await user.click(screen.getByRole('button', { name: /select folder/i }))
      simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

      // Wait for images to load
      await waitFor(() => {
        expect(screen.getByAltText('sunset.jpg')).toBeInTheDocument()
      })

      // Click on an image without setting destination first
      await user.click(screen.getByAltText('sunset.jpg'))

      // Should show destination folder picker modal
      await waitFor(() => {
        expect(screen.getByText('Select destination folder')).toBeInTheDocument()
      })
    })

    it('proceeds to swiping after selecting destination in modal', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Select source folder via picker
      await user.click(screen.getByRole('button', { name: /select folder/i }))
      simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

      await waitFor(() => {
        expect(screen.getByAltText('sunset.jpg')).toBeInTheDocument()
      })
      await user.click(screen.getByAltText('sunset.jpg'))

      // Should show destination picker modal
      await waitFor(() => {
        expect(screen.getByText('Select destination folder')).toBeInTheDocument()
      })

      // Wait for modal to load folders and select Vacation
      await waitFor(() => {
        expect(screen.getAllByText('Vacation').length).toBeGreaterThanOrEqual(1)
      })
      const vacationButtons = screen.getAllByText('Vacation')
      await user.click(vacationButtons[vacationButtons.length - 1])

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /select this folder/i })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: /select this folder/i }))

      // Should now be in swiping mode
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })
    })

    it('can create new folder as destination in modal', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Select source folder via picker
      await user.click(screen.getByRole('button', { name: /select folder/i }))
      simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

      await waitFor(() => {
        expect(screen.getByAltText('sunset.jpg')).toBeInTheDocument()
      })
      await user.click(screen.getByAltText('sunset.jpg'))

      // Should show destination picker modal
      await waitFor(() => {
        expect(screen.getByText('Select destination folder')).toBeInTheDocument()
      })

      // Create new folder
      await user.click(screen.getByRole('button', { name: /create new folder/i }))
      await user.type(screen.getByPlaceholderText(/folder name/i), 'Liked Photos')
      await user.click(screen.getByRole('button', { name: /^create$/i }))

      // Should now be in swiping mode
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })
    })

    it('shows folder icon in title section for destination selection', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /set destination/i })).toBeInTheDocument()
      })
    })

    it('opens destination picker modal when clicking folder icon', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /set destination/i })).toBeInTheDocument()
      })

      // Click the destination folder icon
      await user.click(screen.getByRole('button', { name: /set destination/i }))

      // Should show destination picker modal
      await waitFor(() => {
        expect(screen.getByText('Select destination folder')).toBeInTheDocument()
      })
    })

    it('shows selected destination folder name in title section', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /set destination/i })).toBeInTheDocument()
      })

      // Click the destination folder icon
      await user.click(screen.getByRole('button', { name: /set destination/i }))

      // Wait for modal to load folders
      await waitFor(() => {
        expect(screen.getAllByText('Vacation').length).toBeGreaterThanOrEqual(1)
      })

      // Click Vacation in the modal (use last one since modal is on top)
      const vacationButtons = screen.getAllByText('Vacation')
      await user.click(vacationButtons[vacationButtons.length - 1])

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /select this folder/i })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: /select this folder/i }))

      // Should show destination folder name in the title section button
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /set destination/i })
        expect(button).toHaveTextContent('Vacation')
      })
    })

    it('proceeds directly to swiping after selecting image when destination is set', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /set destination/i })).toBeInTheDocument()
      })

      // First set destination folder via the icon button
      await user.click(screen.getByRole('button', { name: /set destination/i }))

      // Wait for modal to load folders
      await waitFor(() => {
        expect(screen.getAllByText('Vacation').length).toBeGreaterThanOrEqual(1)
      })

      // Click Vacation in the modal
      const vacationButtons = screen.getAllByText('Vacation')
      await user.click(vacationButtons[vacationButtons.length - 1])

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /select this folder/i })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: /select this folder/i }))

      // Now select source folder via picker and click image
      await user.click(screen.getByRole('button', { name: /select folder/i }))
      simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

      await waitFor(() => {
        expect(screen.getByAltText('sunset.jpg')).toBeInTheDocument()
      })
      await user.click(screen.getByAltText('sunset.jpg'))

      // Should go directly to swiping (no destination picker modal)
      await waitFor(() => {
        expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
      })
    })

    it('validates destination folder on app load and clears if deleted', async () => {
      // Pre-set a destination folder that has been "deleted"
      usePhotoStore.getState().setDestinationFolder({ id: 'deleted-folder', name: 'Deleted Folder' })

      // Mock getFolder to return null (folder deleted)
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

      // UI should show "Set destination" instead of the deleted folder name
      expect(screen.getByRole('button', { name: /set destination/i })).toHaveTextContent('Set destination')
    })

    it('keeps destination folder if it still exists', async () => {
      // Pre-set a valid destination folder
      usePhotoStore.getState().setDestinationFolder({ id: 'valid-folder', name: 'Valid Folder' })

      // Mock getFolder to return the folder (still exists)
      server.use(
        http.get(`${DRIVE_API}/:folderId`, ({ params }) => {
          if (params.folderId === 'valid-folder') {
            return HttpResponse.json({ id: 'valid-folder', name: 'Valid Folder' })
          }
          return HttpResponse.json({ error: { code: 404 } }, { status: 404 })
        })
      )

      render(<App />)

      // Wait for page to render
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /set destination/i })).toBeInTheDocument()
      })

      // Destination folder should still be set
      expect(usePhotoStore.getState().destinationFolder).toEqual({ id: 'valid-folder', name: 'Valid Folder' })

      // UI should show the folder name
      expect(screen.getByRole('button', { name: /set destination/i })).toHaveTextContent('Valid Folder')
    })
  })
})
