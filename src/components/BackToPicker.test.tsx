import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import App from '../App'
import { useAuthStore } from '../stores/authStore'
import { usePhotoStore } from '../stores/photoStore'
import {
  setupGooglePickerMock,
  cleanupGooglePickerMock,
  simulatePickerSelect,
  mockPickerBuilder,
  mockPicker,
} from '../mocks/googlePicker'
import { resetPickerState } from '../hooks/useGooglePicker'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

const mockImages = [
  { id: 'image-1', name: 'sunset.jpg' },
  { id: 'image-2', name: 'beach.png' },
]

describe('Back to Picker', () => {
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

  it('clicking Back on SwipePage re-opens the picker', async () => {
    const user = userEvent.setup()

    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
      'mock-token'
    )

    server.use(
      http.get(DRIVE_API, ({ request }) => {
        const url = new URL(request.url)
        const q = url.searchParams.get('q') || ''
        // List images in the selected folder
        if (q.includes("'folder-1' in parents") && q.includes('mimeType contains')) {
          return HttpResponse.json({ files: mockImages })
        }
        // validateDestinationFolder - getFolder call
        return HttpResponse.json({ id: 'some-id', name: 'some-folder', trashed: false })
      }),
      // createDestinationFolder - POST to create folder
      http.post(DRIVE_API, async ({ request }) => {
        const body = (await request.json()) as { name: string }
        return HttpResponse.json({ id: 'auto-dest-id', name: body.name })
      })
    )

    render(<App />)

    // Picker auto-opens
    await waitFor(() => {
      expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
    })

    // Select a folder
    simulatePickerSelect({ id: 'folder-1', name: 'Photos' })

    // Should enter swiping mode
    await waitFor(() => {
      expect(screen.getByTestId('swipe-card')).toBeInTheDocument()
    })

    // Clear the mock to track re-open
    mockPicker.setVisible.mockClear()

    // Click Back button
    await user.click(screen.getByText('← Back'))

    // Picker should re-open
    await waitFor(() => {
      expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
    })
  })
})
