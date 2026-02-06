import { useEffect } from 'react'

interface KeyboardShortcutHandlers {
  onKeep: () => void
  onDiscard: () => void
  onUndo: () => void
  onEscape?: () => void
  onToggleChrome?: () => void
  disabled?: boolean
}

export function useKeyboardShortcuts({
  onKeep,
  onDiscard,
  onUndo,
  onEscape,
  onToggleChrome,
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
        case 'Escape':
          onEscape?.()
          break
        case ' ':
          onToggleChrome?.()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onKeep, onDiscard, onUndo, onEscape, onToggleChrome, disabled])
}
