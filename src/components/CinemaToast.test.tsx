import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CinemaToast } from './CinemaToast'

describe('CinemaToast', () => {
  it('renders nothing when toast is null', () => {
    const { container } = render(<CinemaToast toast={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders success toast with message', () => {
    render(<CinemaToast toast={{ message: 'Copied to Destination', type: 'success' }} />)
    expect(screen.getByText('Copied to Destination')).toBeInTheDocument()
  })

  it('renders error toast with message', () => {
    render(<CinemaToast toast={{ message: 'Could not copy photo', type: 'error' }} />)
    expect(screen.getByText('Could not copy photo')).toBeInTheDocument()
  })

  it('renders info toast with message', () => {
    render(<CinemaToast toast={{ message: 'Already in Destination', type: 'info' }} />)
    expect(screen.getByText('Already in Destination')).toBeInTheDocument()
  })

  it('renders loading toast with message', () => {
    render(<CinemaToast toast={{ message: 'Copying...', type: 'loading' }} />)
    expect(screen.getByText('Copying...')).toBeInTheDocument()
  })

  it('has aria-live="polite" for accessibility', () => {
    render(<CinemaToast toast={{ message: 'Test', type: 'info' }} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('has backdrop-blur for frosted glass effect', () => {
    const { container } = render(
      <CinemaToast toast={{ message: 'Test', type: 'info' }} />
    )
    // The toast container should have backdrop-blur class for frosted glass
    const toastEl = container.firstChild as HTMLElement
    expect(toastEl.className).toMatch(/backdrop-blur/)
  })

  it('shows loading spinner for loading type', () => {
    render(<CinemaToast toast={{ message: 'Copying...', type: 'loading' }} />)
    // Loading toast should have an animated spinner
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('does not show spinner for non-loading types', () => {
    render(<CinemaToast toast={{ message: 'Done', type: 'success' }} />)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).not.toBeInTheDocument()
  })
})
