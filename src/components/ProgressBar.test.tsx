import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('exposes current and total via aria attributes', () => {
    render(<ProgressBar current={3} total={10} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemax', '10')
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
