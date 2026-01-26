import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { listFolders, listSharedFolders, listSharedDrives, listSharedDriveFolders, listAllImages, type DriveFolder, type DriveImage, type SharedDrive } from '../services/googleDriveApi'
import { buildDriveImageUrl } from '../utils/imageUrl'

interface FolderPickerProps {
  onImageClick: (folder: DriveFolder, startIndex: number) => void
}

interface BreadcrumbItem {
  id: string | null
  name: string
  isShared?: boolean
  isSharedDrives?: boolean
  driveId?: string
}

const SHARED_WITH_ME_ID = '__shared__'
const SHARED_DRIVES_ID = '__shared_drives__'

export function FolderPicker({ onImageClick }: FolderPickerProps) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [sharedDrives, setSharedDrives] = useState<SharedDrive[]>([])
  const [images, setImages] = useState<DriveImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [isInSharedSection, setIsInSharedSection] = useState(false)
  const [isInSharedDrivesSection, setIsInSharedDrivesSection] = useState(false)
  const [currentDriveId, setCurrentDriveId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: 'My Drive' },
  ])

  useEffect(() => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    const fetchData = async () => {
      try {
        if (isInSharedDrivesSection && currentFolderId === SHARED_DRIVES_ID) {
          // Show list of shared drives
          const drives = await listSharedDrives(accessToken)
          setSharedDrives(drives)
          setFolders([])
          setImages([])
        } else if (isInSharedDrivesSection && currentDriveId && currentFolderId) {
          // Navigating inside a shared drive folder - fetch both folders and images
          const [subFolders, folderImages] = await Promise.all([
            listSharedDriveFolders(accessToken, currentDriveId, currentFolderId),
            listAllImages(accessToken, currentFolderId),
          ])
          setSharedDrives([])
          setFolders(subFolders)
          setImages(folderImages)
        } else if (isInSharedDrivesSection && currentDriveId) {
          // At root of a shared drive - show folders in the drive root
          const driveFolders = await listSharedDriveFolders(accessToken, currentDriveId)
          setSharedDrives([])
          setFolders(driveFolders)
          setImages([])
        } else if (isInSharedSection && currentFolderId === SHARED_WITH_ME_ID) {
          // Show shared folders
          const sharedFolders = await listSharedFolders(accessToken)
          setFolders(sharedFolders)
          setSharedDrives([])
          setImages([])
        } else if (isInSharedSection && currentFolderId) {
          // Navigating inside a shared folder - fetch both folders and images
          const [subFolders, folderImages] = await Promise.all([
            listFolders(accessToken, currentFolderId),
            listAllImages(accessToken, currentFolderId),
          ])
          setFolders(subFolders)
          setSharedDrives([])
          setImages(folderImages)
        } else if (currentFolderId) {
          // Inside a My Drive folder - fetch both folders and images
          const [subFolders, folderImages] = await Promise.all([
            listFolders(accessToken, currentFolderId),
            listAllImages(accessToken, currentFolderId),
          ])
          setFolders(subFolders)
          setSharedDrives([])
          setImages(folderImages)
        } else {
          // Show My Drive root folders
          const myFolders = await listFolders(accessToken, undefined)
          setFolders(myFolders)
          setSharedDrives([])
          setImages([])
        }
      } catch {
        setError('Failed to load folders')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accessToken, currentFolderId, isInSharedSection, isInSharedDrivesSection, currentDriveId])

  const navigateToFolder = (folder: DriveFolder) => {
    setCurrentFolderId(folder.id)
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }])
  }

  const navigateToShared = () => {
    setIsInSharedSection(true)
    setIsInSharedDrivesSection(false)
    setCurrentDriveId(null)
    setCurrentFolderId(SHARED_WITH_ME_ID)
    setBreadcrumbs([{ id: SHARED_WITH_ME_ID, name: 'Shared with me', isShared: true }])
  }

  const navigateToSharedDrives = () => {
    setIsInSharedDrivesSection(true)
    setIsInSharedSection(false)
    setCurrentDriveId(null)
    setCurrentFolderId(SHARED_DRIVES_ID)
    setBreadcrumbs([{ id: SHARED_DRIVES_ID, name: 'Shared drives', isSharedDrives: true }])
  }

  const navigateToSharedDrive = (drive: SharedDrive) => {
    setCurrentDriveId(drive.id)
    setCurrentFolderId(null)
    setBreadcrumbs([
      ...breadcrumbs,
      { id: drive.id, name: drive.name, driveId: drive.id },
    ])
  }

  const navigateToSharedDriveFolder = (folder: DriveFolder) => {
    setCurrentFolderId(folder.id)
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name, driveId: currentDriveId! }])
  }

  const navigateToBreadcrumb = (index: number) => {
    const item = breadcrumbs[index]

    if (item.id === null) {
      // Going back to My Drive root
      setIsInSharedSection(false)
      setIsInSharedDrivesSection(false)
      setCurrentDriveId(null)
      setCurrentFolderId(null)
      setBreadcrumbs([{ id: null, name: 'My Drive' }])
    } else if (item.id === SHARED_WITH_ME_ID) {
      // Going back to Shared with me root
      setCurrentFolderId(SHARED_WITH_ME_ID)
      setBreadcrumbs(breadcrumbs.slice(0, index + 1))
    } else if (item.id === SHARED_DRIVES_ID) {
      // Going back to Shared drives list
      setCurrentDriveId(null)
      setCurrentFolderId(SHARED_DRIVES_ID)
      setBreadcrumbs(breadcrumbs.slice(0, index + 1))
    } else if (item.driveId && item.id === item.driveId) {
      // Going back to a shared drive root
      setCurrentDriveId(item.driveId)
      setCurrentFolderId(null)
      setBreadcrumbs(breadcrumbs.slice(0, index + 1))
    } else if (item.driveId) {
      // Going to a folder inside a shared drive
      setCurrentDriveId(item.driveId)
      setCurrentFolderId(item.id)
      setBreadcrumbs(breadcrumbs.slice(0, index + 1))
    } else {
      setCurrentFolderId(item.id)
      setBreadcrumbs(breadcrumbs.slice(0, index + 1))
    }
  }

  const getCurrentFolder = (): DriveFolder | null => {
    const current = breadcrumbs[breadcrumbs.length - 1]
    if (current.id && current.id !== SHARED_WITH_ME_ID && current.id !== SHARED_DRIVES_ID) {
      return { id: current.id, name: current.name }
    }
    return null
  }

  const handleImageClick = (index: number) => {
    const folder = getCurrentFolder()
    if (folder) {
      onImageClick(folder, index)
    }
  }

  const handleFolderClick = (folder: DriveFolder) => {
    if (isInSharedDrivesSection && currentDriveId) {
      navigateToSharedDriveFolder(folder)
    } else {
      navigateToFolder(folder)
    }
  }

  const isAtRoot = currentFolderId === null && !isInSharedSection && !isInSharedDrivesSection
  const isShowingSharedDrivesList = isInSharedDrivesSection && currentFolderId === SHARED_DRIVES_ID

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b text-sm overflow-x-auto">
        {/* Always show My Drive as first breadcrumb */}
        <span className="flex items-center">
          <button
            onClick={() => {
              setIsInSharedSection(false)
              setIsInSharedDrivesSection(false)
              setCurrentDriveId(null)
              setCurrentFolderId(null)
              setBreadcrumbs([{ id: null, name: 'My Drive' }])
            }}
            className={`hover:text-blue-600 ${
              !isInSharedSection && !isInSharedDrivesSection && breadcrumbs.length === 1
                ? 'text-gray-900 font-medium'
                : 'text-gray-500'
            }`}
          >
            My Drive
          </button>
        </span>
        {breadcrumbs.map((item, index) => {
          // Skip My Drive in breadcrumbs when not in shared/shared drives section (already shown above)
          if (item.id === null && !isInSharedSection && !isInSharedDrivesSection) return null
          return (
            <span key={item.id ?? 'root'} className="flex items-center">
              {/* Show separator before each item (except when it's the first My Drive) */}
              {(index > 0 || isInSharedSection || isInSharedDrivesSection) && (
                <span className="mx-1 text-gray-400">/</span>
              )}
              <button
                onClick={() => navigateToBreadcrumb(index)}
                className={`hover:text-blue-600 ${
                  index === breadcrumbs.length - 1
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500'
                }`}
              >
                {item.name}
              </button>
            </span>
          )
        })}
      </div>

      {/* Folder list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-2 text-gray-600">Loading folders...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-600">{error}</div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {/* Shared with me option at root */}
              {isAtRoot && (
                <button
                  onClick={navigateToShared}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span className="text-gray-900 flex-1">Shared with me</span>
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}

              {/* Shared drives option at root */}
              {isAtRoot && (
                <button
                  onClick={navigateToSharedDrives}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <svg
                    className="w-5 h-5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                  <span className="text-gray-900 flex-1">Shared drives</span>
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}

              {/* Shared drives list */}
              {isShowingSharedDrivesList && sharedDrives.map((drive) => (
                <button
                  key={drive.id}
                  onClick={() => navigateToSharedDrive(drive)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <svg
                    className="w-5 h-5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                  <span className="text-gray-900 flex-1">{drive.name}</span>
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              ))}

              {/* Regular folders */}
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderClick(folder)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span className="text-gray-900 flex-1">{folder.name}</span>
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              ))}
            </div>

            {/* Images section */}
            {images.length > 0 && (
              <div className="p-4">
                <div className="grid grid-cols-3 gap-3">
                  {images.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => handleImageClick(index)}
                      className="flex flex-col items-center hover:bg-gray-100 rounded-lg p-2 transition-colors"
                    >
                      <div className="w-full aspect-square overflow-hidden rounded-lg mb-2">
                        <img
                          src={buildDriveImageUrl(image.id)}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs text-gray-700 truncate w-full text-center">
                        {image.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
