import { useState, useRef, useCallback, useEffect } from 'react'

interface UseAutoHideOptions {
  timeout?: number
}

interface UseAutoHideReturn {
  isVisible: boolean
  show: () => void
  hide: () => void
}

export function useAutoHide(options?: UseAutoHideOptions): UseAutoHideReturn {
  const timeout = options?.timeout ?? 3000
  const [isVisible, setIsVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    clearTimer()
    timerRef.current = setTimeout(() => {
      setIsVisible(false)
    }, timeout)
  }, [timeout, clearTimer])

  const show = useCallback(() => {
    setIsVisible(true)
    startTimer()
  }, [startTimer])

  const hide = useCallback(() => {
    clearTimer()
    setIsVisible(false)
  }, [clearTimer])

  // Start the auto-hide timer on mount
  useEffect(() => {
    startTimer()
    return clearTimer
  }, [startTimer, clearTimer])

  return { isVisible, show, hide }
}
