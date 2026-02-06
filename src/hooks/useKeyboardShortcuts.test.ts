import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  const handlers = {
    onKeep: vi.fn(),
    onDiscard: vi.fn(),
    onUndo: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls onKeep on right arrow', () => {
    renderHook(() => useKeyboardShortcuts(handlers))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(handlers.onKeep).toHaveBeenCalledTimes(1)
  })

  it('calls onDiscard on left arrow', () => {
    renderHook(() => useKeyboardShortcuts(handlers))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(handlers.onDiscard).toHaveBeenCalledTimes(1)
  })

  it('calls onUndo on z key', () => {
    renderHook(() => useKeyboardShortcuts(handlers))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }))
    expect(handlers.onUndo).toHaveBeenCalledTimes(1)
  })

  it('calls onUndo on Cmd+Z (Mac)', () => {
    renderHook(() => useKeyboardShortcuts(handlers))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true }))
    expect(handlers.onUndo).toHaveBeenCalledTimes(1)
  })

  it('calls onUndo on Ctrl+Z (Windows/Linux)', () => {
    renderHook(() => useKeyboardShortcuts(handlers))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    expect(handlers.onUndo).toHaveBeenCalledTimes(1)
  })

  it('does not call handlers when disabled', () => {
    renderHook(() => useKeyboardShortcuts({ ...handlers, disabled: true }))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }))

    expect(handlers.onKeep).not.toHaveBeenCalled()
    expect(handlers.onDiscard).not.toHaveBeenCalled()
    expect(handlers.onUndo).not.toHaveBeenCalled()
  })

  it('cleans up event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers))

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('calls onEscape on Escape key', () => {
    const onEscape = vi.fn()
    renderHook(() => useKeyboardShortcuts({ ...handlers, onEscape }))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('calls onToggleChrome on Space key', () => {
    const onToggleChrome = vi.fn()
    renderHook(() => useKeyboardShortcuts({ ...handlers, onToggleChrome }))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    expect(onToggleChrome).toHaveBeenCalledTimes(1)
  })

  it('does not throw when onEscape is not provided and Escape is pressed', () => {
    renderHook(() => useKeyboardShortcuts(handlers))

    expect(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    }).not.toThrow()
  })

  it('does not throw when onToggleChrome is not provided and Space is pressed', () => {
    renderHook(() => useKeyboardShortcuts(handlers))

    expect(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    }).not.toThrow()
  })

  it('does not call onEscape when disabled', () => {
    const onEscape = vi.fn()
    renderHook(() => useKeyboardShortcuts({ ...handlers, onEscape, disabled: true }))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onEscape).not.toHaveBeenCalled()
  })

  it('does not call onToggleChrome when disabled', () => {
    const onToggleChrome = vi.fn()
    renderHook(() => useKeyboardShortcuts({ ...handlers, onToggleChrome, disabled: true }))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    expect(onToggleChrome).not.toHaveBeenCalled()
  })
})
