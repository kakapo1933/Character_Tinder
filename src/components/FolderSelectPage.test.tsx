import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FolderSelectPage } from './FolderSelectPage'

const defaultProps = {
  onOpenPicker: vi.fn(),
  onSignOut: vi.fn(),
  isValidating: false,
  error: null,
}

describe('FolderSelectPage', () => {
  it('renders title and subtitle', () => {
    render(<FolderSelectPage {...defaultProps} />)

    expect(screen.getByText('Character Tinder')).toBeInTheDocument()
    expect(
      screen.getByText('Select a folder with photos to sort')
    ).toBeInTheDocument()
  })

  it('renders "Choose Folder" button', () => {
    render(<FolderSelectPage {...defaultProps} />)

    expect(
      screen.getByRole('button', { name: 'Choose Folder' })
    ).toBeInTheDocument()
  })

  it('calls onOpenPicker when Choose Folder button is clicked', async () => {
    const user = userEvent.setup()
    const onOpenPicker = vi.fn()

    render(<FolderSelectPage {...defaultProps} onOpenPicker={onOpenPicker} />)

    await user.click(screen.getByRole('button', { name: 'Choose Folder' }))

    expect(onOpenPicker).toHaveBeenCalledOnce()
  })

  it('calls onSignOut when Sign out button is clicked', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()

    render(<FolderSelectPage {...defaultProps} onSignOut={onSignOut} />)

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(onSignOut).toHaveBeenCalledOnce()
  })

  it('shows "Validating..." text when isValidating is true', () => {
    render(<FolderSelectPage {...defaultProps} isValidating={true} />)

    expect(
      screen.getByRole('button', { name: 'Validating...' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Choose Folder' })
    ).not.toBeInTheDocument()
  })

  it('button is disabled when isValidating is true', () => {
    render(<FolderSelectPage {...defaultProps} isValidating={true} />)

    expect(
      screen.getByRole('button', { name: 'Validating...' })
    ).toBeDisabled()
  })

  it('shows error message when error is provided', () => {
    render(
      <FolderSelectPage {...defaultProps} error="Something went wrong" />
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('does not show error message when error is null', () => {
    render(<FolderSelectPage {...defaultProps} error={null} />)

    expect(
      screen.queryByText('Something went wrong')
    ).not.toBeInTheDocument()
  })
})
