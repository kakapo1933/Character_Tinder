import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { FolderPicker } from './FolderPicker'
import { useAuthStore } from '../stores/authStore'
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

describe('FolderPicker', () => {
  beforeEach(() => {
    resetPickerState()
    setupGooglePickerMock()
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test', picture: '' },
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
      })
    )
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

  it('shows select folder button initially', () => {
    render(<FolderPicker onImageClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /select folder/i })).toBeInTheDocument()
  })

  it('opens Google Picker when clicking select folder button', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /select folder/i }))

    expect(mockPickerBuilder.build).toHaveBeenCalled()
    expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
  })

  it('shows selected folder name after picker selection', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /select folder/i }))

    simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })
  })

  it('loads and displays images after folder selection', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /select folder/i }))

    simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

    await waitFor(() => {
      expect(screen.getByAltText('sunset.jpg')).toBeInTheDocument()
    })
    expect(screen.getByAltText('beach.png')).toBeInTheDocument()
  })

  it('shows image names below thumbnails', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /select folder/i }))
    simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

    await waitFor(() => {
      expect(screen.getByText('sunset.jpg')).toBeInTheDocument()
    })
    expect(screen.getByText('beach.png')).toBeInTheDocument()
  })

  it('calls onImageClick when clicking an image', async () => {
    const user = userEvent.setup()
    const onImageClick = vi.fn()
    render(<FolderPicker onImageClick={onImageClick} />)

    await user.click(screen.getByRole('button', { name: /select folder/i }))
    simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

    await waitFor(() => {
      expect(screen.getByAltText('sunset.jpg')).toBeInTheDocument()
    })

    await user.click(screen.getByAltText('sunset.jpg'))

    expect(onImageClick).toHaveBeenCalledWith(
      { id: 'folder-1', name: 'Photos 2024' },
      0
    )
  })

  it('shows change folder button after folder is selected', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /select folder/i }))
    simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /change folder/i })).toBeInTheDocument()
    })
  })

  it('opens picker again when clicking change folder', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /select folder/i }))
    simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /change folder/i })).toBeInTheDocument()
    })

    mockPickerBuilder.build.mockClear()
    mockPicker.setVisible.mockClear()

    await user.click(screen.getByRole('button', { name: /change folder/i }))

    expect(mockPickerBuilder.build).toHaveBeenCalled()
    expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
  })

  it('picker opens with shared folders and shared drives tabs', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /select folder/i }))

    expect(mockPickerBuilder.addView).toHaveBeenCalledTimes(3)
    expect(mockPickerBuilder.addView).toHaveBeenNthCalledWith(1, 'FOLDERS')
    expect(mockPickerBuilder.addView).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        setOwnedByMe: expect.any(Function),
        setMimeTypes: expect.any(Function),
      })
    )
    expect(mockPickerBuilder.addView).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        setEnableDrives: expect.any(Function),
        setMimeTypes: expect.any(Function),
      })
    )
  })

  it('shows empty state when folder has no images', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /select folder/i }))
    simulatePickerSelect({ id: 'empty-folder', name: 'Empty Folder' })

    await waitFor(() => {
      expect(screen.getByText(/no images found/i)).toBeInTheDocument()
    })
  })

  it('shows loading state while images are loading', async () => {
    // Delay the API response to catch the loading state
    server.use(
      http.get(DRIVE_API, async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json({ files: mockImages })
      })
    )

    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /select folder/i }))
    simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  it('handles API error when loading images', async () => {
    server.use(
      http.get(DRIVE_API, () =>
        HttpResponse.json({ error: 'Error' }, { status: 500 })
      )
    )

    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /select folder/i }))
    simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

    await waitFor(() => {
      expect(screen.getByText(/failed to load images/i)).toBeInTheDocument()
    })
  })
})
