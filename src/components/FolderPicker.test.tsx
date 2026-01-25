import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { FolderPicker } from './FolderPicker'
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

const mockSharedFolders = [
  { id: 'shared-1', name: 'Team Photos' },
  { id: 'shared-2', name: 'Client Assets' },
]

const mockImages = [
  { id: 'image-1', name: 'sunset.jpg' },
  { id: 'image-2', name: 'beach.png' },
]

describe('FolderPicker', () => {
  beforeEach(() => {
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test', picture: '' },
      'mock-token'
    )
    server.use(
      http.get(DRIVE_API, ({ request }) => {
        const url = new URL(request.url)
        const q = url.searchParams.get('q') || ''

        // Check for image query (uses "mimeType contains 'image/'")
        const isImageQuery = q.includes("mimeType contains 'image/'")
        // Check for folder query (uses "mimeType='application/vnd.google-apps.folder'")
        const isFolderQuery = q.includes("mimeType='application/vnd.google-apps.folder'")

        // Return subfolders when querying a specific parent for folders
        if (q.includes("'folder-1' in parents") && isFolderQuery) {
          return HttpResponse.json({ files: mockSubFolders })
        }
        // Return empty images for folder-1 (no images by default)
        if (q.includes("'folder-1' in parents") && isImageQuery) {
          return HttpResponse.json({ files: [] })
        }
        // Return root folders by default
        if (q.includes("'root' in parents") && isFolderQuery) {
          return HttpResponse.json({ files: mockRootFolders })
        }
        // Return shared folders
        if (q.includes('sharedWithMe = true') && isFolderQuery) {
          return HttpResponse.json({ files: mockSharedFolders })
        }
        return HttpResponse.json({ files: [] })
      })
    )
  })

  it('shows loading state initially', () => {
    render(<FolderPicker onImageClick={vi.fn()} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays list of root folders', async () => {
    render(<FolderPicker onImageClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })
    expect(screen.getByText('Vacation')).toBeInTheDocument()
  })

  it('shows breadcrumb starting with My Drive', async () => {
    render(<FolderPicker onImageClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('My Drive')).toBeInTheDocument()
    })
  })

  it('navigates into folder on click', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Photos 2024'))

    await waitFor(() => {
      expect(screen.getByText('January')).toBeInTheDocument()
    })
    expect(screen.getByText('February')).toBeInTheDocument()
  })

  it('updates breadcrumbs when navigating into folder', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Photos 2024'))

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
      expect(screen.getByText('My Drive')).toBeInTheDocument()
    })
  })

  it('does not show select button in a subfolder (removed feature)', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Photos 2024'))

    await waitFor(() => {
      expect(screen.getByText('January')).toBeInTheDocument()
    })

    // Select button should not exist anymore
    expect(screen.queryByText('Select this folder')).not.toBeInTheDocument()
  })

  it('navigates back via breadcrumb', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })

    // Navigate into folder
    await user.click(screen.getByText('Photos 2024'))

    await waitFor(() => {
      expect(screen.getByText('January')).toBeInTheDocument()
    })

    // Click My Drive breadcrumb to go back
    await user.click(screen.getByText('My Drive'))

    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })
  })

  it('shows error message on API failure', async () => {
    server.use(
      http.get(DRIVE_API, () =>
        HttpResponse.json({ error: 'Error' }, { status: 500 })
      )
    )

    render(<FolderPicker onImageClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load folders/i)).toBeInTheDocument()
    })
  })

  it('handles folder with no subfolders gracefully', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    // First navigate into a folder
    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Photos 2024'))

    await waitFor(() => {
      expect(screen.getByText('January')).toBeInTheDocument()
    })

    // Set up empty response for subfolder-1 (January folder)
    server.use(
      http.get(DRIVE_API, ({ request }) => {
        const url = new URL(request.url)
        const q = url.searchParams.get('q') || ''
        const isImageQuery = q.includes("mimeType contains 'image/'")
        const isFolderQuery = q.includes("mimeType='application/vnd.google-apps.folder'")

        // Empty folders and no images for subfolder-1
        if (q.includes("'subfolder-1' in parents")) {
          return HttpResponse.json({ files: [] })
        }
        // Keep subfolder response for folder-1
        if (q.includes("'folder-1' in parents") && isFolderQuery) {
          return HttpResponse.json({ files: mockSubFolders })
        }
        if (q.includes("'folder-1' in parents") && isImageQuery) {
          return HttpResponse.json({ files: [] })
        }
        return HttpResponse.json({ files: [] })
      })
    )

    // Navigate into January which has no subfolders
    await user.click(screen.getByText('January'))

    // Should not show "No subfolders found" message anymore
    // and should not crash - just show empty folder list
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })
    expect(screen.queryByText(/no subfolders found/i)).not.toBeInTheDocument()
  })

  it('shows Shared with me option at root level', async () => {
    render(<FolderPicker onImageClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Shared with me')).toBeInTheDocument()
    })
  })

  it('shows shared folders when clicking Shared with me', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Shared with me')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Shared with me'))

    await waitFor(() => {
      expect(screen.getByText('Team Photos')).toBeInTheDocument()
    })
    expect(screen.getByText('Client Assets')).toBeInTheDocument()
  })

  it('shows My Drive link when in Shared with me section', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Shared with me')).toBeInTheDocument()
    })

    // Navigate to Shared with me
    await user.click(screen.getByText('Shared with me'))

    await waitFor(() => {
      expect(screen.getByText('Team Photos')).toBeInTheDocument()
    })

    // My Drive link should be visible in breadcrumbs to go back
    expect(screen.getByRole('button', { name: 'My Drive' })).toBeInTheDocument()
  })

  it('can navigate back to My Drive from Shared with me section', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onImageClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Shared with me')).toBeInTheDocument()
    })

    // Navigate to Shared with me
    await user.click(screen.getByText('Shared with me'))

    await waitFor(() => {
      expect(screen.getByText('Team Photos')).toBeInTheDocument()
    })

    // Click My Drive to go back
    await user.click(screen.getByRole('button', { name: 'My Drive' }))

    // Should now see root folders and Shared with me option again
    await waitFor(() => {
      expect(screen.getByText('Photos 2024')).toBeInTheDocument()
    })
    expect(screen.getByText('Vacation')).toBeInTheDocument()
    expect(screen.getByText('Shared with me')).toBeInTheDocument()
  })

  describe('images in folder', () => {
    beforeEach(() => {
      // Reset handlers and set up fresh ones that distinguish folder vs image queries
      server.resetHandlers(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          const q = url.searchParams.get('q') || ''

          // Check for image query (uses "mimeType contains 'image/'")
          const isImageQuery = q.includes("mimeType contains 'image/'")
          // Check for folder query (uses "mimeType='application/vnd.google-apps.folder'")
          const isFolderQuery = q.includes("mimeType='application/vnd.google-apps.folder'")

          // Return images when querying folder-1 for images
          if (q.includes("'folder-1' in parents") && isImageQuery) {
            return HttpResponse.json({ files: mockImages })
          }
          // Return subfolders when querying folder-1 for folders
          if (q.includes("'folder-1' in parents") && isFolderQuery) {
            return HttpResponse.json({ files: mockSubFolders })
          }
          // Return root folders
          if (q.includes("'root' in parents") && isFolderQuery) {
            return HttpResponse.json({ files: mockRootFolders })
          }
          // Return shared folders
          if (q.includes('sharedWithMe = true') && isFolderQuery) {
            return HttpResponse.json({ files: mockSharedFolders })
          }
          return HttpResponse.json({ files: [] })
        })
      )
    })

    it('should display images when folder contains images', async () => {
      const user = userEvent.setup()
      render(<FolderPicker onImageClick={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Photos 2024')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Photos 2024'))

      await waitFor(() => {
        expect(screen.getByAltText('sunset.jpg')).toBeInTheDocument()
      })
      expect(screen.getByAltText('beach.png')).toBeInTheDocument()
    })

    it('should show image names below thumbnails', async () => {
      const user = userEvent.setup()
      render(<FolderPicker onImageClick={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Photos 2024')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Photos 2024'))

      await waitFor(() => {
        expect(screen.getByText('sunset.jpg')).toBeInTheDocument()
      })
      expect(screen.getByText('beach.png')).toBeInTheDocument()
    })

    it('should call onImageClick when clicking an image', async () => {
      const user = userEvent.setup()
      const onImageClick = vi.fn()
      render(<FolderPicker onImageClick={onImageClick} />)

      await waitFor(() => {
        expect(screen.getByText('Photos 2024')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Photos 2024'))

      await waitFor(() => {
        expect(screen.getByAltText('sunset.jpg')).toBeInTheDocument()
      })

      await user.click(screen.getByAltText('sunset.jpg'))

      expect(onImageClick).toHaveBeenCalledWith(
        { id: 'folder-1', name: 'Photos 2024' },
        0
      )
    })

    it('should not show "Select this folder" button', async () => {
      const user = userEvent.setup()
      render(<FolderPicker onImageClick={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Photos 2024')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Photos 2024'))

      await waitFor(() => {
        expect(screen.getByAltText('sunset.jpg')).toBeInTheDocument()
      })

      expect(screen.queryByText('Select this folder')).not.toBeInTheDocument()
    })

    it('should not show "No subfolders found" message when images exist', async () => {
      // Set up handler to return no subfolders but have images
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          const q = url.searchParams.get('q') || ''

          if (q.includes("'folder-1' in parents") && q.includes("mimeType contains 'image/'")) {
            return HttpResponse.json({ files: mockImages })
          }
          if (q.includes("'folder-1' in parents") && q.includes("mimeType='application/vnd.google-apps.folder'")) {
            return HttpResponse.json({ files: [] }) // No subfolders
          }
          if (q.includes("'root' in parents")) {
            return HttpResponse.json({ files: mockRootFolders })
          }
          return HttpResponse.json({ files: [] })
        })
      )

      const user = userEvent.setup()
      render(<FolderPicker onImageClick={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Photos 2024')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Photos 2024'))

      await waitFor(() => {
        expect(screen.getByAltText('sunset.jpg')).toBeInTheDocument()
      })

      expect(screen.queryByText(/no subfolders found/i)).not.toBeInTheDocument()
    })

    it('should show both subfolders and images when both exist', async () => {
      const user = userEvent.setup()
      render(<FolderPicker onImageClick={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Photos 2024')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Photos 2024'))

      // Should show both subfolders and images
      await waitFor(() => {
        expect(screen.getByText('January')).toBeInTheDocument()
      })
      expect(screen.getByText('February')).toBeInTheDocument()
      expect(screen.getByAltText('sunset.jpg')).toBeInTheDocument()
      expect(screen.getByAltText('beach.png')).toBeInTheDocument()
    })
  })
})
