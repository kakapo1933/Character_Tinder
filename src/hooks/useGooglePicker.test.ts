import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useGooglePicker, resetPickerState } from './useGooglePicker'
import {
  setupGooglePickerMock,
  cleanupGooglePickerMock,
  simulatePickerSelect,
  simulatePickerCancel,
  mockPickerBuilder,
  mockPicker,
  mockDocsViewInstance,
} from '../mocks/googlePicker'
import { useAuthStore } from '../stores/authStore'

describe('useGooglePicker', () => {
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
    mockPickerBuilder.setSelectableMimeTypes.mockClear()
    mockPickerBuilder.build.mockClear()
    mockPicker.setVisible.mockClear()
    mockDocsViewInstance.setOwnedByMe.mockClear()
    mockDocsViewInstance.setMimeTypes.mockClear()
    mockDocsViewInstance.setIncludeFolders.mockClear()
    mockDocsViewInstance.setSelectFolderEnabled.mockClear()
    mockDocsViewInstance.setEnableDrives.mockClear()
  })

  it('returns openPicker function', () => {
    const { result } = renderHook(() => useGooglePicker())
    expect(typeof result.current.openPicker).toBe('function')
  })

  it('loads gapi picker library when opening', async () => {
    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(window.gapi.load).toHaveBeenCalledWith('picker', expect.any(Function))
  })

  it('creates picker with ViewId.FOLDERS', async () => {
    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(mockPickerBuilder.addView).toHaveBeenCalledWith('FOLDERS')
  })

  it('passes OAuth token to picker', async () => {
    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(mockPickerBuilder.setOAuthToken).toHaveBeenCalledWith('mock-token')
  })

  it('enables SUPPORT_DRIVES feature', async () => {
    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(mockPickerBuilder.enableFeature).toHaveBeenCalledWith('SUPPORT_DRIVES')
  })

  it('makes picker visible after build', async () => {
    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(mockPickerBuilder.build).toHaveBeenCalled()
    expect(mockPicker.setVisible).toHaveBeenCalledWith(true)
  })

  it('calls onSelect with folder id and name on PICKED action', async () => {
    const { result } = renderHook(() => useGooglePicker())
    let selectedFolder: { id: string; name: string } | null = null

    await act(async () => {
      result.current.openPicker((folder) => {
        selectedFolder = folder
      })
    })

    act(() => {
      simulatePickerSelect({ id: 'folder-123', name: 'My Photos' })
    })

    expect(selectedFolder).toEqual({ id: 'folder-123', name: 'My Photos' })
  })

  it('calls onSelect with null on CANCEL action', async () => {
    const { result } = renderHook(() => useGooglePicker())
    let called = false
    let selectedFolder: { id: string; name: string } | null = { id: '', name: '' }

    await act(async () => {
      result.current.openPicker((folder) => {
        called = true
        selectedFolder = folder
      })
    })

    act(() => {
      simulatePickerCancel()
    })

    expect(called).toBe(true)
    expect(selectedFolder).toBeNull()
  })

  it('adds a DocsView for shared folders as second view', async () => {
    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(mockPickerBuilder.addView).toHaveBeenNthCalledWith(1, 'FOLDERS')
    expect(mockPickerBuilder.addView).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        setOwnedByMe: expect.any(Function),
        setMimeTypes: expect.any(Function),
      })
    )
  })

  it('does not filter MIME types on shared views so images are visible', async () => {
    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(mockDocsViewInstance.setMimeTypes).not.toHaveBeenCalled()
  })

  it('configures shared DocsView with setOwnedByMe(false)', async () => {
    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(mockDocsViewInstance.setOwnedByMe).toHaveBeenCalledWith(false)
  })

  it('configures shared DocsView to include folders in view', async () => {
    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(mockDocsViewInstance.setIncludeFolders).toHaveBeenCalledWith(true)
  })

  it('configures shared DocsView to allow folder selection', async () => {
    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(mockDocsViewInstance.setSelectFolderEnabled).toHaveBeenCalledWith(true)
  })

  it('calls onSelect when folder is picked from shared tab', async () => {
    const { result } = renderHook(() => useGooglePicker())
    let selectedFolder: { id: string; name: string } | null = null

    await act(async () => {
      result.current.openPicker((folder) => {
        selectedFolder = folder
      })
    })

    act(() => {
      simulatePickerSelect({ id: 'shared-folder-1', name: 'Shared Photos' })
    })

    expect(selectedFolder).toEqual({ id: 'shared-folder-1', name: 'Shared Photos' })
  })

  it('adds a third view for shared drives', async () => {
    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(mockPickerBuilder.addView).toHaveBeenCalledTimes(3)
  })

  it('configures shared drives view with setEnableDrives(true)', async () => {
    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(mockDocsViewInstance.setEnableDrives).toHaveBeenCalledWith(true)
  })

  it('configures shared drives view to include and select folders', async () => {
    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(mockDocsViewInstance.setIncludeFolders).toHaveBeenCalledWith(true)
    expect(mockDocsViewInstance.setSelectFolderEnabled).toHaveBeenCalledWith(true)
  })

  it('restricts selectable items to folders only via setSelectableMimeTypes', async () => {
    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(mockPickerBuilder.setSelectableMimeTypes).toHaveBeenCalledWith(
      'application/vnd.google-apps.folder'
    )
  })

  it('does not open picker when not authenticated', async () => {
    useAuthStore.getState().logout()

    const { result } = renderHook(() => useGooglePicker())

    await act(async () => {
      result.current.openPicker(() => {})
    })

    expect(mockPickerBuilder.build).not.toHaveBeenCalled()
  })
})
