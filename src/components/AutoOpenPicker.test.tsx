import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import App from '../App'
import { useAuthStore } from '../stores/authStore'
import { usePhotoStore } from '../stores/photoStore'
import {
  setupGooglePickerMock,
  cleanupGooglePickerMock,
  mockPickerBuilder,
  mockPicker,
  simulatePickerCancel,
} from '../mocks/googlePicker'
import { resetPickerState } from '../hooks/useGooglePicker'

describe('Auto-open Picker', () => {
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

  it('picker auto-opens when user is authenticated', async () => {
    // Login the user before rendering
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
      'mock-token'
    )

    render(<App />)

    // Picker should auto-open without any user click
    await waitFor(() => {
      expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
    })
  })

  it('picker does NOT open when not authenticated', () => {
    // Do NOT login — user is unauthenticated
    render(<App />)

    // Should show login screen
    expect(screen.getByText('Character Tinder')).toBeInTheDocument()
    expect(screen.getByText('Swipe through your Google Drive photos')).toBeInTheDocument()

    // Picker should NOT have been opened
    expect(mockPicker.setVisible).not.toHaveBeenCalled()
  })
})

describe('Picker cancel behavior', () => {
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

  it('shows minimal page with re-open button when picker is cancelled', async () => {
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
      'mock-token'
    )

    render(<App />)

    // Wait for picker to auto-open
    await waitFor(() => {
      expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
    })

    // Simulate user cancelling the picker
    simulatePickerCancel()

    // Should show minimal page with "Pick a folder" text and re-open button
    await waitFor(() => {
      expect(screen.getByText(/pick a folder/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /open picker|select folder|pick folder/i })).toBeInTheDocument()
  })

  it('re-opens picker when button is clicked after cancel', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
      'mock-token'
    )

    render(<App />)

    // Wait for initial auto-open
    await waitFor(() => {
      expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
    })

    // Cancel the picker
    simulatePickerCancel()

    await waitFor(() => {
      expect(screen.getByText(/pick a folder/i)).toBeInTheDocument()
    })

    // Clear mock and click re-open button
    mockPicker.setVisible.mockClear()
    await user.click(screen.getByRole('button', { name: /open picker|select folder|pick folder/i }))

    // Picker should re-open
    await waitFor(() => {
      expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
    })
  })
})
