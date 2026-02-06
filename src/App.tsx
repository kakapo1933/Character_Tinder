import { useState, useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import { usePhotoStore } from './stores/photoStore'
import { GoogleSignInButton } from './components/GoogleSignInButton'
import { OAuthCallback } from './components/OAuthCallback'
import { FolderPicker } from './components/FolderPicker'
import { SwipePage } from './components/SwipePage'
import { createFolder } from './services/googleDriveApi'
import type { DriveFolder } from './services/googleDriveApi'

type AppState = 'auth' | 'folder-select' | 'swiping' | 'complete'

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const [state, setState] = useState<AppState>(isAuthenticated ? 'folder-select' : 'auth')
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [createFolderError, setCreateFolderError] = useState<string | null>(null)
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
  // Also handle when redirected from 404.html with access_token in hash
  if (window.location.pathname.endsWith('/callback') || window.location.hash.includes('access_token')) {
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

  const handleFolderSelect = async (folder: DriveFolder) => {
    setSelectedFolder(folder)
    setCreateFolderError(null)

    // Auto-create destination folder if not set
    if (!destinationFolder && accessToken && user) {
      setIsCreatingFolder(true)
      try {
        const date = new Date().toISOString().split('T')[0]
        const folderName = `${date}_${folder.name}_${user.name}`
        const created = await createFolder(accessToken, folderName)
        setDestinationFolder(created)
      } catch {
        setCreateFolderError('Could not create destination folder')
      } finally {
        setIsCreatingFolder(false)
      }
    }

    setState('swiping')
  }

  if (state === 'folder-select' || !selectedFolder) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm p-4 flex items-center justify-between">
          <h1 className="font-bold text-xl text-gray-900">Character Tinder</h1>
          <GoogleSignInButton />
        </header>
        <main className="max-w-md mx-auto mt-8 bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-medium text-gray-900">Select a folder</h2>
            <p className="text-sm text-gray-500">Choose a folder with photos to sort</p>
          </div>
          {isCreatingFolder && (
            <div className="flex items-center justify-center p-4 bg-blue-50 border-b">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
              <span className="text-sm text-blue-700">Creating destination folder...</span>
            </div>
          )}
          {createFolderError && (
            <div className="p-4 bg-yellow-50 border-b text-sm text-yellow-700">
              {createFolderError}
            </div>
          )}
          <FolderPicker onFolderSelect={handleFolderSelect} />
        </main>
      </div>
    )
  }

  if (state === 'swiping') {
    return (
      <SwipePage
        folder={selectedFolder}
        onComplete={() => setState('complete')}
        onBack={() => {
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
