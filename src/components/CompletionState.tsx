import { usePhotoStore } from '../stores/photoStore'

interface CompletionStateProps {
  onSortAgain: () => void
  onStartOver: () => void
}

export function CompletionState({ onSortAgain, onStartOver }: CompletionStateProps) {
  const { keepIds, discardIds } = usePhotoStore()
  const total = keepIds.length + discardIds.length

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">All done!</h2>
        <p className="text-zinc-400 mb-6">
          You've sorted all {total} photos
        </p>

        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-500">{keepIds.length}</div>
            <div className="text-sm text-zinc-500">Kept</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-rose-500">{discardIds.length}</div>
            <div className="text-sm text-zinc-500">Discarded</div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onSortAgain}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
          >
            Sort again
          </button>
          <button
            onClick={onStartOver}
            className="px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600"
          >
            Sort another folder
          </button>
        </div>
      </div>
    </div>
  )
}
