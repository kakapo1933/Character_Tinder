import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { DestinationFolderPicker } from './DestinationFolderPicker'
import { useAuthStore } from '../stores/authStore'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

const mockRootFolders = [
  { id: 'folder-1', name: 'Photos 2024' },
  { id: 'folder-2', name: 'Vacation' },
]

const mockSubFolders = [
  { id: 'subfolder-1', name: 'January' },
  { id: 'subfolder-2', name: 'February' },
]

describe('DestinationFolderPicker', () => {
  beforeEach(() => {
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test', picture: '' },
      'mock-token'
    )
    server.use(
      http.get(DRIVE_API, ({ request }) => {
        const url = new URL(request.url)
        const q = url.searchParams.get('q') || ''
        const isFolderQuery = q.includes("mimeType='application/vnd.google-apps.folder'")

        if (q.includes("'folder-1' in parents") && isFolderQuery) {
          return HttpResponse.json({ files: mockSubFolders })
        }
        if (q.includes("'root' in parents") && isFolderQuery) {
          return HttpResponse.json({ files: mockRootFolders })
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

  it('shows loading state initially', () => {
    render(<DestinationFolderPicker onSelect={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays list of folders', async () => {
    render(<DestinationFolderPicker onSelect={vi.fn()} onCancel={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })
    expect(screen.getByText('Vacation')).toBeInTheDocument()
  })

  it('shows select button for current folder', async () => {
    const user = userEvent.setup()
    render(<DestinationFolderPicker onSelect={vi.fn()} onCancel={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Photos 2024'))

    await waitFor(() => {
      expect(screen.getByText('January')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /select this folder/i })).toBeInTheDocument()
  })

  it('calls onSelect when selecting a folder', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<DestinationFolderPicker onSelect={onSelect} onCancel={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Photos 2024'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /select this folder/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /select this folder/i }))

    expect(onSelect).toHaveBeenCalledWith({ id: 'folder-1', name: 'Photos 2024' })
  })

  it('shows create new folder button', async () => {
    render(<DestinationFolderPicker onSelect={vi.fn()} onCancel={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /create new folder/i })).toBeInTheDocument()
  })

  it('shows input field when clicking create new folder', async () => {
    const user = userEvent.setup()
    render(<DestinationFolderPicker onSelect={vi.fn()} onCancel={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /create new folder/i }))

    expect(screen.getByPlaceholderText(/folder name/i)).toBeInTheDocument()
  })

  it('creates folder and selects it', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<DestinationFolderPicker onSelect={onSelect} onCancel={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /create new folder/i }))

    const input = screen.getByPlaceholderText(/folder name/i)
    await user.type(input, 'My Liked Photos')

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith({ id: 'new-folder-id', name: 'My Liked Photos' })
    })
  })

  it('calls onCancel when clicking cancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<DestinationFolderPicker onSelect={vi.fn()} onCancel={onCancel} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalled()
  })

  it('navigates into subfolders', async () => {
    const user = userEvent.setup()
    render(<DestinationFolderPicker onSelect={vi.fn()} onCancel={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Photos 2024'))

    await waitFor(() => {
      expect(screen.getByText('January')).toBeInTheDocument()
    })
    expect(screen.getByText('February')).toBeInTheDocument()
  })

  it('shows breadcrumbs for navigation', async () => {
    const user = userEvent.setup()
    render(<DestinationFolderPicker onSelect={vi.fn()} onCancel={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Photos 2024'))

    await waitFor(() => {
      expect(screen.getByText('January')).toBeInTheDocument()
    })

    // Check breadcrumbs
    expect(screen.getByRole('button', { name: 'My Drive' })).toBeInTheDocument()
    expect(screen.getByText('Photos 2024')).toBeInTheDocument()
  })

  it('creates folder in current directory', async () => {
    const user = userEvent.setup()
    let createdParentId = ''

    server.use(
      http.post(DRIVE_API, async ({ request }) => {
        const body = await request.json() as { name: string; parents: string[] }
        createdParentId = body.parents[0]
        return HttpResponse.json({ id: 'new-folder-id', name: body.name })
      })
    )

    render(<DestinationFolderPicker onSelect={vi.fn()} onCancel={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })

    // Navigate into Photos 2024
    await user.click(screen.getByText('Photos 2024'))

    await waitFor(() => {
      expect(screen.getByText('January')).toBeInTheDocument()
    })

    // Create folder here
    await user.click(screen.getByRole('button', { name: /create new folder/i }))
    await user.type(screen.getByPlaceholderText(/folder name/i), 'New Subfolder')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(createdParentId).toBe('folder-1')
    })
  })
})
