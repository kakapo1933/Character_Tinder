import { useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { config } from '../config'

type OnSelect = (selection: { id: string; name: string; mimeType: string } | null) => void

const PICKER_SCRIPT_URL = 'https://apis.google.com/js/api.js'

let scriptLoaded = false
let scriptLoading = false

function loadPickerScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve()

  return new Promise((resolve, reject) => {
    if (scriptLoading) {
      const check = setInterval(() => {
        if (scriptLoaded) {
          clearInterval(check)
          resolve()
        }
      }, 50)
      return
    }

    scriptLoading = true

    if (window.gapi) {
      window.gapi.load('picker', () => {
        scriptLoaded = true
        scriptLoading = false
        resolve()
      })
      return
    }

    const script = document.createElement('script')
    script.src = PICKER_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => {
      window.gapi.load('picker', () => {
        scriptLoaded = true
        scriptLoading = false
        resolve()
      })
    }
    script.onerror = () => {
      scriptLoading = false
      reject(new Error('Failed to load Google Picker script'))
    }
    document.head.appendChild(script)
  })
}

export function useGooglePicker() {
  const accessToken = useAuthStore((s) => s.accessToken)

  const openPicker = useCallback(
    async (onSelect: OnSelect) => {
      if (!accessToken) return

      await loadPickerScript()

      const myDriveView = new window.google.picker.DocsView()
        .setOwnedByMe(true)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)

      const sharedFoldersView = new window.google.picker.DocsView()
        .setOwnedByMe(false)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)

      const sharedDrivesView = new window.google.picker.DocsView()
        .setEnableDrives(true)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)

      const picker = new window.google.picker.PickerBuilder()
        .addView(myDriveView)
        .addView(sharedFoldersView)
        .addView(sharedDrivesView)
        .setOAuthToken(accessToken)
        .setDeveloperKey(config.googleApiKey)
        .setAppId(config.googleAppId)
        .enableFeature(window.google.picker.Feature.SUPPORT_DRIVES)
        .setCallback((data: google.picker.ResponseObject) => {
          if (data.action === window.google.picker.Action.PICKED && data.docs?.length) {
            const doc = data.docs[0]
            onSelect({ id: doc.id, name: doc.name, mimeType: doc.mimeType })
          } else if (data.action === window.google.picker.Action.CANCEL) {
            onSelect(null)
          }
        })
        .build()

      picker.setVisible(true)
    },
    [accessToken]
  )

  return { openPicker }
}

export function resetPickerState() {
  scriptLoaded = false
  scriptLoading = false
}
