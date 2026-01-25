import { usePhotoStore } from '../stores/photoStore'

interface CompletionStateProps {
  onStartOver: () => void
}

export function CompletionState({ onStartOver }: CompletionStateProps) {
  const { keepIds, discardIds } = usePhotoStore()
  const total = keepIds.length + discardIds.length

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">All done!</h2>
        <p className="text-gray-600 mb-6">
          You've sorted all {total} photos
        </p>

        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{keepIds.length}</div>
            <div className="text-sm text-gray-500">Kept</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{discardIds.length}</div>
            <div className="text-sm text-gray-500">Discarded</div>
          </div>
        </div>

        <button
          onClick={onStartOver}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Sort another folder
        </button>
      </div>
    </div>
  )
}
