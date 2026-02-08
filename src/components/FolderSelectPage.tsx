interface FolderSelectPageProps {
  onOpenPicker: () => void
  onSignOut: () => void
  isValidating: boolean
  error: string | null
}

export function FolderSelectPage({ onOpenPicker, onSignOut, isValidating, error }: FolderSelectPageProps) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-100 mb-2">Character Tinder</h1>
        <p className="text-zinc-400 mb-8">Select a folder with photos to sort</p>
        {error && <p className="text-rose-400 mb-4">{error}</p>}
        <button
          onClick={onOpenPicker}
          disabled={isValidating}
          className={`px-6 py-3 bg-sky-500 text-white rounded-lg transition-colors${isValidating ? ' opacity-75 cursor-not-allowed' : ' hover:bg-sky-600'}`}
        >
          {isValidating ? 'Validating...' : 'Choose Folder'}
        </button>
        <button
          onClick={onSignOut}
          className="block mx-auto mt-4 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
