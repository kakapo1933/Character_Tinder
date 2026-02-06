import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from './stores/authStore'
import { usePhotoStore } from './stores/photoStore'
import { GoogleSignInButton } from './components/GoogleSignInButton'
import { OAuthCallback } from './components/OAuthCallback'
import { SwipePage } from './components/SwipePage'
import { CompletionState } from './components/CompletionState'
import { useGooglePicker } from './hooks/useGooglePicker'
import { createDestinationFolder } from './services/destinationFolder'
import { resolveSelection } from './services/folderSelection'
import type { DriveFolder } from './services/googleDriveApi'
import type { PickerSelection } from './types/picker'

type AppState = 'auth' | 'picker' | 'swiping' | 'complete'

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const [state, setState] = useState<AppState>(isAuthenticated ? 'picker' : 'auth')
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null)
  const [startIndex, setStartIndex] = useState<number>(0)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [createFolderError, setCreateFolderError] = useState<string | null>(null)
  const destinationFolder = usePhotoStore((s) => s.destinationFolder)
  const setDestinationFolder = usePhotoStore((s) => s.setDestinationFolder)
  const validateDestinationFolder = usePhotoStore((s) => s.validateDestinationFolder)
  const { openPicker } = useGooglePicker()
  const pickerOpenedRef = useRef(false)
  const [pickerCancelled, setPickerCancelled] = useState(false)
  const [pickerError, setPickerError] = useState<string | null>(null)
  const [pickerRetryCount, setPickerRetryCount] = useState(0)

  const autoCreateDestination = async (folderName: string) => {
    if (!destinationFolder && accessToken && user) {
      setIsCreatingFolder(true)
      try {
        const created = await createDestinationFolder(accessToken, folderName, user.name)
        setDestinationFolder(created)
      } catch {
        setCreateFolderError('Could not create destination folder')
      } finally {
        setIsCreatingFolder(false)
      }
    }
  }

  const handleFolderSelect = async (selection: PickerSelection) => {
    setCreateFolderError(null)

    if (!accessToken) return

    const resolved = await resolveSelection(accessToken, selection)
    setStartIndex(resolved.startIndex)
    setSelectedFolder(resolved.folder)
    await autoCreateDestination(resolved.folder.name)

    setState('swiping')
  }

  // Validate destination folder on mount (check if it still exists)
  useEffect(() => {
    if (accessToken) {
      validateDestinationFolder(accessToken)
    }
  }, [accessToken, validateDestinationFolder])

  // Auto-open picker when authenticated and in picker state
  useEffect(() => {
    if (state === 'picker' && isAuthenticated && !pickerOpenedRef.current && !pickerCancelled && !pickerError) {
      pickerOpenedRef.current = true
      openPicker((selection) => {
        pickerOpenedRef.current = false
        if (selection) {
          handleFolderSelect(selection)
        } else {
          setPickerCancelled(true)
        }
      }).catch(() => {
        pickerOpenedRef.current = false
        setPickerError('Failed to load Google Picker')
      })
    }
  }, [state, isAuthenticated, openPicker, pickerCancelled, pickerError, pickerRetryCount])

  // Reset picker guard when leaving picker state
  useEffect(() => {
    if (state !== 'picker') {
      pickerOpenedRef.current = false
    }
  }, [state])

  // Handle OAuth callback (works with both /callback and /Character_Tinder/callback)
  // Also handle when redirected from 404.html with access_token in hash
  if (window.location.pathname.endsWith('/callback') || window.location.hash.includes('access_token')) {
    return <OAuthCallback />
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-100 mb-2">Character Tinder</h1>
          <p className="text-zinc-400 mb-8">Swipe through your Google Drive photos</p>
          <GoogleSignInButton />
        </div>
      </div>
    )
  }

  if (state === 'picker' || !selectedFolder) {
    if (pickerError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
          <div className="text-center">
            <p className="text-rose-400 mb-4">{pickerError}</p>
            <button
              onClick={() => {
                setPickerError(null)
                pickerOpenedRef.current = false
                setPickerRetryCount((c) => c + 1)
              }}
              className="px-4 py-2 bg-zinc-800 text-zinc-200 rounded-lg hover:bg-zinc-700"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    if (pickerCancelled) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Pick a folder</h1>
            <p className="text-zinc-400 mb-6">Select a folder with photos to sort</p>
            <button
              onClick={() => {
                setPickerCancelled(false)
                pickerOpenedRef.current = false
              }}
              className="px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
            >
              Select folder
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-zinc-950">
        <header className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <h1 className="font-bold text-xl text-zinc-100">Character Tinder</h1>
          <GoogleSignInButton />
        </header>
        <main className="max-w-md mx-auto mt-8 bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="p-4 border-b border-zinc-700">
            <h2 className="font-medium text-zinc-100">Select a folder</h2>
            <p className="text-sm text-zinc-400">Choose a folder with photos to sort</p>
          </div>
          {isCreatingFolder && (
            <div className="flex items-center justify-center p-4 bg-sky-900/30 border-b border-zinc-700">
              <div className="animate-spin w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full mr-2" />
              <span className="text-sm text-sky-300">Creating destination folder...</span>
            </div>
          )}
          {createFolderError && (
            <div className="p-4 bg-yellow-900/30 border-b border-zinc-700 text-sm text-yellow-300">
              {createFolderError}
            </div>
          )}
        </main>
      </div>
    )
  }

  if (state === 'swiping') {
    return (
      <SwipePage
        folder={selectedFolder}
        startIndex={startIndex}
        onComplete={() => setState('complete')}
        onBack={() => {
          setState('picker')
        }}
      />
    )
  }

  if (state === 'complete') {
    return (
      <CompletionState
        onSortAgain={() => setState('swiping')}
        onStartOver={() => {
          setSelectedFolder(null)
          setState('picker')
        }}
      />
    )
  }

  return null
}

export default App
