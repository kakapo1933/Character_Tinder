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
  mockPickerBuilder,
  mockPicker,
  simulatePickerCancel,
} from '../mocks/googlePicker'
import { resetPickerState } from '../hooks/useGooglePicker'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

describe('Auto-open Picker', () => {
  beforeEach(() => {
    resetPickerState()
    setupGooglePickerMock()
    useAuthStore.setState({ accessToken: null, isAuthenticated: false })
    usePhotoStore.getState().reset()
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

  it('picker opens after clicking Choose Folder on FolderSelectPage', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
      'mock-token'
    )

    render(<App />)

    // User sees FolderSelectPage first
    const chooseFolderBtn = await screen.findByRole('button', { name: 'Choose Folder' })
    await user.click(chooseFolderBtn)

    // Picker should open after token validation
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

  it('returns to FolderSelectPage when picker is cancelled', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
      'mock-token'
    )

    render(<App />)

    // Click Choose Folder to open picker
    const chooseFolderBtn = await screen.findByRole('button', { name: 'Choose Folder' })
    await user.click(chooseFolderBtn)

    await waitFor(() => {
      expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
    })

    // Simulate user cancelling the picker
    simulatePickerCancel()

    // Should return to FolderSelectPage with Choose Folder button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Choose Folder' })).toBeInTheDocument()
    })
    expect(screen.getByText('Select a folder with photos to sort')).toBeInTheDocument()
  })

  it('re-opens picker when Choose Folder is clicked after cancel', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test User', picture: '' },
      'mock-token'
    )

    render(<App />)

    // Open picker
    const chooseFolderBtn = await screen.findByRole('button', { name: 'Choose Folder' })
    await user.click(chooseFolderBtn)

    await waitFor(() => {
      expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
    })

    // Cancel the picker
    simulatePickerCancel()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Choose Folder' })).toBeInTheDocument()
    })

    // Clear mock and click Choose Folder again
    mockPicker.setVisible.mockClear()
    await user.click(screen.getByRole('button', { name: 'Choose Folder' }))

    // Picker should re-open
    await waitFor(() => {
      expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
    })
  })
})
