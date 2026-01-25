import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('displays current and total count', () => {
    render(<ProgressBar current={3} total={10} />)
    expect(screen.getByText('3 / 10')).toBeInTheDocument()
  })

  it('renders progress bar with correct width', () => {
    const { container } = render(
      <ProgressBar current={5} total={10} />
    )
    const progressBar = container.querySelector('[style*="width"]')
    expect(progressBar).toHaveStyle({ width: '50%' })
  })

  it('handles zero total gracefully', () => {
    const { container } = render(
      <ProgressBar current={0} total={0} />
    )
    const progressBar = container.querySelector('[style*="width"]')
    expect(progressBar).toHaveStyle({ width: '0%' })
  })
})
