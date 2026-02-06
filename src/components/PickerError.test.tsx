import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../stores/authStore'
import { usePhotoStore } from '../stores/photoStore'

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
  })

  it('shows error message when picker script fails to load', async () => {
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
      'mock-token'
    )

    render(<App />)

    // The auto-open useEffect should call openPicker, which rejects.
    // App should catch the error and display a message.
    await waitFor(() => {
      expect(
        screen.getByText(/failed to load|error|couldn't load/i)
      ).toBeInTheDocument()
    })
  })

  it('shows retry button when picker fails to load', async () => {
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
      'mock-token'
    )

    render(<App />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /retry|try again/i })
      ).toBeInTheDocument()
    })
  })

  it('retries opening picker when retry button is clicked', async () => {
    const user = userEvent.setup()

    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
      'mock-token'
    )

    render(<App />)

    // Wait for error state to appear
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /retry|try again/i })
      ).toBeInTheDocument()
    })

    // Reset mock to succeed on retry
    mockOpenPicker.mockReset()
    mockOpenPicker.mockResolvedValue(undefined)

    await user.click(screen.getByRole('button', { name: /retry|try again/i }))

    // openPicker should be called again on retry
    await waitFor(() => {
      expect(mockOpenPicker).toHaveBeenCalled()
    })
  })
})
