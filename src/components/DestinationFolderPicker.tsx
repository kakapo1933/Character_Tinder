import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { listFolders, listSharedFolders, createFolder, type DriveFolder } from '../services/googleDriveApi'

interface DestinationFolderPickerProps {
  onSelect: (folder: DriveFolder) => void
  onCancel: () => void
}

interface BreadcrumbItem {
  id: string | null
  name: string
  isShared?: boolean
}

const SHARED_WITH_ME_ID = '__shared__'

export function DestinationFolderPicker({ onSelect, onCancel }: DestinationFolderPickerProps) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [isInSharedSection, setIsInSharedSection] = useState(false)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: 'My Drive' },
  ])
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  useEffect(() => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    const fetchData = async () => {
      try {
        if (isInSharedSection && currentFolderId === SHARED_WITH_ME_ID) {
          const sharedFolders = await listSharedFolders(accessToken)
          setFolders(sharedFolders)
        } else if (isInSharedSection && currentFolderId) {
          const subFolders = await listFolders(accessToken, currentFolderId)
          setFolders(subFolders)
        } else if (currentFolderId) {
          const subFolders = await listFolders(accessToken, currentFolderId)
          setFolders(subFolders)
        } else {
          const myFolders = await listFolders(accessToken, undefined)
          setFolders(myFolders)
        }
      } catch {
        setError('Failed to load folders')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accessToken, currentFolderId, isInSharedSection])

  const navigateToFolder = (folder: DriveFolder) => {
    setCurrentFolderId(folder.id)
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }])
  }

  const navigateToShared = () => {
    setIsInSharedSection(true)
    setCurrentFolderId(SHARED_WITH_ME_ID)
    setBreadcrumbs([{ id: SHARED_WITH_ME_ID, name: 'Shared with me', isShared: true }])
  }

  const navigateToBreadcrumb = (index: number) => {
    const item = breadcrumbs[index]

    if (item.id === null) {
      setIsInSharedSection(false)
      setCurrentFolderId(null)
      setBreadcrumbs([{ id: null, name: 'My Drive' }])
    } else if (item.id === SHARED_WITH_ME_ID) {
      setCurrentFolderId(SHARED_WITH_ME_ID)
      setBreadcrumbs(breadcrumbs.slice(0, index + 1))
    } else {
      setCurrentFolderId(item.id)
      setBreadcrumbs(breadcrumbs.slice(0, index + 1))
    }
  }

  const getCurrentFolder = (): DriveFolder | null => {
    const current = breadcrumbs[breadcrumbs.length - 1]
    if (current.id && current.id !== SHARED_WITH_ME_ID) {
      return { id: current.id, name: current.name }
    }
    return null
  }

  const handleSelectCurrentFolder = () => {
    const folder = getCurrentFolder()
    if (folder) {
      onSelect(folder)
    }
  }

  const handleCreateFolder = async () => {
    if (!accessToken || !newFolderName.trim()) return

    setCreateLoading(true)
    try {
      const parentId = currentFolderId && currentFolderId !== SHARED_WITH_ME_ID
        ? currentFolderId
        : undefined
      const newFolder = await createFolder(accessToken, newFolderName.trim(), parentId)
      onSelect(newFolder)
    } catch {
      setError('Failed to create folder')
    } finally {
      setCreateLoading(false)
    }
  }

  const isAtRoot = currentFolderId === null && !isInSharedSection
  const canSelectCurrent = currentFolderId !== null && currentFolderId !== SHARED_WITH_ME_ID

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-medium text-gray-900">Select destination folder</h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b text-sm overflow-x-auto">
        <span className="flex items-center">
          <button
            onClick={() => {
              setIsInSharedSection(false)
              setCurrentFolderId(null)
              setBreadcrumbs([{ id: null, name: 'My Drive' }])
            }}
            className={`hover:text-blue-600 ${
              !isInSharedSection && breadcrumbs.length === 1
                ? 'text-gray-900 font-medium'
                : 'text-gray-500'
            }`}
          >
            My Drive
          </button>
        </span>
        {breadcrumbs.map((item, index) => {
          if (item.id === null && !isInSharedSection) return null
          return (
            <span key={item.id ?? 'root'} className="flex items-center">
              {(index > 0 || isInSharedSection) && (
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

            {/* Folders */}
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigateToFolder(folder)}
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
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t bg-gray-50 space-y-3">
        {/* Create new folder */}
        {isCreating ? (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleCreateFolder}
              disabled={createLoading || !newFolderName.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {createLoading ? '...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setIsCreating(false)
                setNewFolderName('')
              }}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create new folder
          </button>
        )}

        {/* Select current folder button */}
        {canSelectCurrent && (
          <button
            onClick={handleSelectCurrentFolder}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Select this folder
          </button>
        )}
      </div>
    </div>
  )
}
