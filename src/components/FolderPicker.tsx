import { useGooglePicker } from '../hooks/useGooglePicker'

interface PickerSelection {
  id: string
  name: string
  mimeType: string
}

interface FolderPickerProps {
  onFolderSelect: (selection: PickerSelection) => void
}

export function FolderPicker({ onFolderSelect }: FolderPickerProps) {
  const { openPicker } = useGooglePicker()

  const handleOpenPicker = () => {
    openPicker((selection) => {
      if (selection) {
        onFolderSelect({ id: selection.id, name: selection.name, mimeType: selection.mimeType })
      }
    })
  }

  return (
    <div className="flex flex-col items-center justify-center p-12">
      <svg className="w-16 h-16 text-gray-300 mb-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
      <p className="text-gray-500 mb-4">Choose a folder with photos to sort</p>
      <button
        onClick={handleOpenPicker}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Select folder
      </button>
    </div>
  )
}
