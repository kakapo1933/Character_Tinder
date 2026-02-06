declare namespace google.picker {
  class PickerBuilder {
    addView(viewId: string): this
    setOAuthToken(token: string): this
    setDeveloperKey(key: string): this
    setAppId(appId: string): this
    setCallback(callback: (data: ResponseObject) => void): this
    enableFeature(feature: string): this
    setSize(width: number, height: number): this
    build(): Picker
  }

  interface Picker {
    setVisible(visible: boolean): void
  }

  interface ResponseObject {
    [key: string]: unknown
    action: string
    docs?: DocumentObject[]
  }

  interface DocumentObject {
    id: string
    name: string
    mimeType: string
  }

  const ViewId: {
    DOCS: string
    FOLDERS: string
    DOCUMENTS: string
  }

  const Action: {
    PICKED: string
    CANCEL: string
  }

  const Response: {
    ACTION: string
    DOCUMENTS: string
  }

  const Document: {
    ID: string
    NAME: string
    MIME_TYPE: string
  }

  const Feature: {
    SUPPORT_DRIVES: string
    MULTISELECT_ENABLED: string
  }
}

interface Window {
  gapi: {
    load: (library: string, callback: () => void) => void
  }
  google: {
    picker: typeof google.picker
  }
}
