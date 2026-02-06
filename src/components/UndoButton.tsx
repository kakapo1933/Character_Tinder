interface UndoButtonProps {
  onClick: () => void
  disabled?: boolean
}

export function UndoButton({ onClick, disabled = false }: UndoButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Undo (Z)"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    </button>
  )
}
