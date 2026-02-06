import { vi } from 'vitest'

type PickerCallback = (data: {
  [key: string]: unknown
  action: string
  docs?: Array<{ id: string; name: string; mimeType: string }>
}) => void

let storedCallback: PickerCallback | null = null

const mockPicker = {
  setVisible: vi.fn(),
}

const mockPickerBuilder = {
  addView: vi.fn().mockReturnThis(),
  setOAuthToken: vi.fn().mockReturnThis(),
  setDeveloperKey: vi.fn().mockReturnThis(),
  setAppId: vi.fn().mockReturnThis(),
  setCallback: vi.fn().mockImplementation((cb: PickerCallback) => {
    storedCallback = cb
    return mockPickerBuilder
  }),
  enableFeature: vi.fn().mockReturnThis(),
  setSize: vi.fn().mockReturnThis(),
  build: vi.fn().mockReturnValue(mockPicker),
}

// Use a class so it works with `new` keyword
class MockPickerBuilder {
  addView = mockPickerBuilder.addView
  setOAuthToken = mockPickerBuilder.setOAuthToken
  setDeveloperKey = mockPickerBuilder.setDeveloperKey
  setAppId = mockPickerBuilder.setAppId
  setCallback = mockPickerBuilder.setCallback
  enableFeature = mockPickerBuilder.enableFeature
  setSize = mockPickerBuilder.setSize
  build = mockPickerBuilder.build
}

const mockDocsViewInstance = {
  setOwnedByMe: vi.fn().mockReturnThis(),
  setMimeTypes: vi.fn().mockReturnThis(),
  setIncludeFolders: vi.fn().mockReturnThis(),
  setSelectFolderEnabled: vi.fn().mockReturnThis(),
}

class MockDocsView {
  setOwnedByMe = mockDocsViewInstance.setOwnedByMe
  setMimeTypes = mockDocsViewInstance.setMimeTypes
  setIncludeFolders = mockDocsViewInstance.setIncludeFolders
  setSelectFolderEnabled = mockDocsViewInstance.setSelectFolderEnabled
}

export const mockGooglePicker = {
  PickerBuilder: MockPickerBuilder,
  DocsView: MockDocsView,
  ViewId: {
    DOCS: 'DOCS',
    FOLDERS: 'FOLDERS',
    DOCUMENTS: 'DOCUMENTS',
  },
  Action: {
    PICKED: 'picked',
    CANCEL: 'cancel',
  },
  Response: {
    ACTION: 'action',
    DOCUMENTS: 'docs',
  },
  Document: {
    ID: 'id',
    NAME: 'name',
    MIME_TYPE: 'mimeType',
  },
  Feature: {
    SUPPORT_DRIVES: 'SUPPORT_DRIVES',
    MULTISELECT_ENABLED: 'MULTISELECT_ENABLED',
  },
}

export function simulatePickerSelect(folder: { id: string; name: string }) {
  if (storedCallback) {
    storedCallback({
      action: 'picked',
      docs: [{ id: folder.id, name: folder.name, mimeType: 'application/vnd.google-apps.folder' }],
    })
  }
}

export function simulatePickerCancel() {
  if (storedCallback) {
    storedCallback({ action: 'cancel' })
  }
}

export function setupGooglePickerMock() {
  storedCallback = null

  const mockGapi = {
    load: vi.fn((_lib: string, callback: () => void) => {
      callback()
    }),
  }

  Object.defineProperty(window, 'gapi', {
    value: mockGapi,
    writable: true,
    configurable: true,
  })

  Object.defineProperty(window, 'google', {
    value: { picker: mockGooglePicker },
    writable: true,
    configurable: true,
  })

  return { mockGapi, mockPickerBuilder, mockPicker }
}

export function cleanupGooglePickerMock() {
  storedCallback = null
}

export { mockPickerBuilder, mockPicker, mockDocsViewInstance }
