import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAutoHide } from './useAutoHide'

describe('useAutoHide', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with isVisible true', () => {
    const { result } = renderHook(() => useAutoHide())
    expect(result.current.isVisible).toBe(true)
  })

  it('hides after default timeout (3000ms)', () => {
    const { result } = renderHook(() => useAutoHide())

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.isVisible).toBe(false)
  })

  it('stays visible before timeout', () => {
    const { result } = renderHook(() => useAutoHide())

    act(() => {
      vi.advanceTimersByTime(2999)
    })

    expect(result.current.isVisible).toBe(true)
  })

  it('accepts custom timeout', () => {
    const { result } = renderHook(() => useAutoHide({ timeout: 5000 }))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.isVisible).toBe(true)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.isVisible).toBe(false)
  })

  it('show() makes controls visible and resets timer', () => {
    const { result } = renderHook(() => useAutoHide())

    // Wait until hidden
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.isVisible).toBe(false)

    // Call show()
    act(() => {
      result.current.show()
    })
    expect(result.current.isVisible).toBe(true)

    // Should hide again after timeout
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.isVisible).toBe(false)
  })

  it('hide() immediately hides controls', () => {
    const { result } = renderHook(() => useAutoHide())

    expect(result.current.isVisible).toBe(true)

    act(() => {
      result.current.hide()
    })

    expect(result.current.isVisible).toBe(false)
  })

  it('cleans up timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const { unmount } = renderHook(() => useAutoHide())

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
