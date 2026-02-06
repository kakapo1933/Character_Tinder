import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import App from '../App'
import { useAuthStore } from '../stores/authStore'
import { usePhotoStore } from '../stores/photoStore'
import {
  setupGooglePickerMock,
  cleanupGooglePickerMock,
  mockPickerBuilder,
  mockPicker,
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
