import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

describe('FolderPicker', () => {
  beforeEach(() => {
    resetPickerState()
    setupGooglePickerMock()
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test', picture: '' },
      'mock-token'
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

  it('shows select folder button', () => {
    render(<FolderPicker onFolderSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: /select folder/i })).toBeInTheDocument()
  })

  it('opens Google Picker when clicking select folder button', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onFolderSelect={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /select folder/i }))

    expect(mockPickerBuilder.build).toHaveBeenCalled()
    expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
  })

  it('calls onFolderSelect with folder after picker selection', async () => {
    const user = userEvent.setup()
    const onFolderSelect = vi.fn()
    render(<FolderPicker onFolderSelect={onFolderSelect} />)

    await user.click(screen.getByRole('button', { name: /select folder/i }))
    simulatePickerSelect({ id: 'folder-1', name: 'Photos 2024' })

    expect(onFolderSelect).toHaveBeenCalledWith({ id: 'folder-1', name: 'Photos 2024', mimeType: 'application/vnd.google-apps.folder' })
  })

  it('picker opens with My Drive, shared folders, and shared drives tabs', async () => {
    const user = userEvent.setup()
    render(<FolderPicker onFolderSelect={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /select folder/i }))

    expect(mockPickerBuilder.addView).toHaveBeenCalledTimes(3)
    // First tab: My Drive only (DocsView with setOwnedByMe(true))
    expect(mockPickerBuilder.addView).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        setOwnedByMe: expect.any(Function),
        setMimeTypes: expect.any(Function),
      })
    )
    // Second tab: Shared with me
    expect(mockPickerBuilder.addView).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        setOwnedByMe: expect.any(Function),
        setMimeTypes: expect.any(Function),
      })
    )
    // Third tab: Shared drives
    expect(mockPickerBuilder.addView).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        setEnableDrives: expect.any(Function),
        setMimeTypes: expect.any(Function),
      })
    )
  })
})
