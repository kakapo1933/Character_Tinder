import { useEffect } from 'react'

interface KeyboardShortcutHandlers {
  onKeep: () => void
  onDiscard: () => void
  onUndo: () => void
  disabled?: boolean
}

export function useKeyboardShortcuts({
  onKeep,
  onDiscard,
  onUndo,
  disabled = false,
}: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return

      switch (event.key) {
        case 'ArrowRight':
          onKeep()
          break
        case 'ArrowLeft':
          onDiscard()
          break
        case 'z':
          onUndo()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onKeep, onDiscard, onUndo, disabled])
}
