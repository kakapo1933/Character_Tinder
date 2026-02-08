import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { useAuthStore } from '../stores/authStore'
import { usePhotoStore } from '../stores/photoStore'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

// Mock useGooglePicker to simulate script load failure
const mockOpenPicker = vi.fn()

vi.mock('../hooks/useGooglePicker', () => ({
  useGooglePicker: () => ({
    openPicker: mockOpenPicker,
  }),
  resetPickerState: vi.fn(),
}))

// Dynamically import App after vi.mock is hoisted
const { default: App } = await import('../App')

describe('Picker Error Handling', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, isAuthenticated: false })
    usePhotoStore.getState().reset()
    mockOpenPicker.mockReset()
    // Default: openPicker rejects with a load failure
    mockOpenPicker.mockRejectedValue(
      new Error('Failed to load Google Picker script')
    )
    // validateToken handler
    server.use(
      http.get(DRIVE_API, ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('pageSize') === '1' && url.searchParams.get('fields') === 'files(id)') {
          return HttpResponse.json({ files: [{ id: 'dummy' }] })
        }
        return HttpResponse.json({ files: [] })
      })
    )
  })

  it('shows error message on FolderSelectPage when picker script fails to load', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
      'mock-token'
    )

    render(<App />)

    // User sees FolderSelectPage, clicks Choose Folder
    const chooseFolderBtn = await screen.findByRole('button', { name: 'Choose Folder' })
    await user.click(chooseFolderBtn)

    // The picker state triggers openPicker which rejects.
    // App catches the error and returns to folder-select with error message.
    await waitFor(() => {
      expect(
        screen.getByText(/failed to load google picker/i)
      ).toBeInTheDocument()
    })
  })

  it('shows Choose Folder button to retry when picker fails', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
      'mock-token'
    )

    render(<App />)

    const chooseFolderBtn = await screen.findByRole('button', { name: 'Choose Folder' })
    await user.click(chooseFolderBtn)

    // After error, should be back on FolderSelectPage with Choose Folder button
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Choose Folder' })
      ).toBeInTheDocument()
    })
  })

  it('retries opening picker when Choose Folder is clicked after error', async () => {
    const user = userEvent.setup()

    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
      'mock-token'
    )

    render(<App />)

    // First attempt: click Choose Folder, picker fails
    const chooseFolderBtn = await screen.findByRole('button', { name: 'Choose Folder' })
    await user.click(chooseFolderBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/failed to load google picker/i)
      ).toBeInTheDocument()
    })

    // Reset mock to succeed on retry
    mockOpenPicker.mockReset()
    mockOpenPicker.mockResolvedValue(undefined)

    // Click Choose Folder again
    await user.click(screen.getByRole('button', { name: 'Choose Folder' }))

    // openPicker should be called again on retry
    await waitFor(() => {
      expect(mockOpenPicker).toHaveBeenCalled()
    })
  })
})
