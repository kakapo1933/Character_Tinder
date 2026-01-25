import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { ImagePreview } from './ImagePreview'
import { useAuthStore } from '../stores/authStore'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

const mockImages = [
  { id: 'img-1', name: 'photo1.jpg' },
  { id: 'img-2', name: 'photo2.jpg' },
  { id: 'img-3', name: 'photo3.jpg' },
]

const mockFolder = { id: 'folder-1', name: 'Test Folder' }

describe('ImagePreview', () => {
  beforeEach(() => {
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test', picture: '' },
      'mock-token'
    )
    server.use(
      http.get(DRIVE_API, ({ request }) => {
        const url = new URL(request.url)
        const q = url.searchParams.get('q') || ''

        if (q.includes("'folder-1' in parents") && q.includes("mimeType contains 'image/'")) {
          return HttpResponse.json({ files: mockImages })
        }
        return HttpResponse.json({ files: [] })
      })
    )
  })

  it('shows loading state initially', () => {
    render(<ImagePreview folder={mockFolder} onImageClick={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays grid of image thumbnails', async () => {
    render(<ImagePreview folder={mockFolder} onImageClick={vi.fn()} onBack={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByAltText('photo1.jpg')).toBeInTheDocument()
    })
    expect(screen.getByAltText('photo2.jpg')).toBeInTheDocument()
    expect(screen.getByAltText('photo3.jpg')).toBeInTheDocument()
  })

  it('shows folder name in header', async () => {
    render(<ImagePreview folder={mockFolder} onImageClick={vi.fn()} onBack={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Test Folder')).toBeInTheDocument()
    })
  })

  it('calls onImageClick with image index when thumbnail is clicked', async () => {
    const onImageClick = vi.fn()
    const user = userEvent.setup()

    render(<ImagePreview folder={mockFolder} onImageClick={onImageClick} onBack={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByAltText('photo2.jpg')).toBeInTheDocument()
    })

    await user.click(screen.getByAltText('photo2.jpg'))

    expect(onImageClick).toHaveBeenCalledWith(1) // Index 1 for photo2
  })

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()

    render(<ImagePreview folder={mockFolder} onImageClick={vi.fn()} onBack={onBack} />)

    await waitFor(() => {
      expect(screen.getByText('Test Folder')).toBeInTheDocument()
    })

    await user.click(screen.getByText('← Back'))

    expect(onBack).toHaveBeenCalled()
  })

  it('shows empty state when no images found', async () => {
    server.use(
      http.get(DRIVE_API, () => HttpResponse.json({ files: [] }))
    )

    render(<ImagePreview folder={mockFolder} onImageClick={vi.fn()} onBack={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/no images found/i)).toBeInTheDocument()
    })
  })

  it('shows image count', async () => {
    render(<ImagePreview folder={mockFolder} onImageClick={vi.fn()} onBack={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('3 images')).toBeInTheDocument()
    })
  })
})
