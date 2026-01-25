import { useState, useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import { usePhotoStore } from './stores/photoStore'
import { GoogleSignInButton } from './components/GoogleSignInButton'
import { OAuthCallback } from './components/OAuthCallback'
import { FolderPicker } from './components/FolderPicker'
import { DestinationFolderPicker } from './components/DestinationFolderPicker'
import { SwipePage } from './components/SwipePage'
import type { DriveFolder } from './services/googleDriveApi'

type AppState = 'auth' | 'folder-select' | 'swiping' | 'complete'

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const accessToken = useAuthStore((s) => s.accessToken)
  const [state, setState] = useState<AppState>(isAuthenticated ? 'folder-select' : 'auth')
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null)
  const [startIndex, setStartIndex] = useState(0)
  const [showDestinationPicker, setShowDestinationPicker] = useState(false)
  const destinationFolder = usePhotoStore((s) => s.destinationFolder)
  const setDestinationFolder = usePhotoStore((s) => s.setDestinationFolder)
  const validateDestinationFolder = usePhotoStore((s) => s.validateDestinationFolder)

  // Validate destination folder on mount (check if it still exists)
  useEffect(() => {
    if (accessToken) {
      validateDestinationFolder(accessToken)
    }
  }, [accessToken, validateDestinationFolder])

  // Handle OAuth callback (works with both /callback and /Character_Tinder/callback)
  if (window.location.pathname.endsWith('/callback')) {
    return <OAuthCallback />
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Character Tinder</h1>
          <p className="text-gray-600 mb-8">Swipe through your Google Drive photos</p>
          <GoogleSignInButton />
        </div>
      </div>
    )
  }

  if (state === 'folder-select' || !selectedFolder) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm p-4 flex items-center justify-between">
          <h1 className="font-bold text-xl text-gray-900">Character Tinder</h1>
          <GoogleSignInButton />
        </header>
        <main className="max-w-md mx-auto mt-8 bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h2 className="font-medium text-gray-900">Select a folder</h2>
              <p className="text-sm text-gray-500">Choose a folder with photos to sort</p>
            </div>
            <button
              onClick={() => setShowDestinationPicker(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
              title="Set destination folder"
              aria-label="Set destination folder"
            >
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              {destinationFolder ? (
                <span className="text-gray-700 max-w-[100px] truncate">{destinationFolder.name}</span>
              ) : (
                <span className="text-gray-500">Set destination</span>
              )}
            </button>
          </div>
          <FolderPicker
            onImageClick={(folder, index) => {
              setSelectedFolder(folder)
              setStartIndex(index)
              if (destinationFolder) {
                setState('swiping')
              } else {
                setShowDestinationPicker(true)
              }
            }}
          />
        </main>

        {/* Destination picker modal */}
        {showDestinationPicker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
              <DestinationFolderPicker
                onSelect={(folder) => {
                  setDestinationFolder(folder)
                  setShowDestinationPicker(false)
                  if (selectedFolder) {
                    setState('swiping')
                  }
                }}
                onCancel={() => {
                  setShowDestinationPicker(false)
                }}
              />
            </div>
          </div>
        )}
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
          setStartIndex(0)
          setState('folder-select')
        }}
      />
    )
  }

  if (state === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">All done!</h2>
          <p className="text-gray-600 mb-8">You've sorted all the photos</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setState('swiping')
              }}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Sort again
            </button>
            <button
              onClick={() => {
                setSelectedFolder(null)
                setState('folder-select')
              }}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Sort another folder
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default App
