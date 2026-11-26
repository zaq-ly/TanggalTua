import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Sheet } from './Sheet'

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  return (
    <>
      <button type="button">Di belakang</button>
      <Sheet open title="Contoh" onClose={onClose}>
        <button type="button">Pertama</button>
        <button type="button">Kedua</button>
      </Sheet>
    </>
  )
}

describe('Sheet', () => {
  it('fokus pindah ke lembar dan Tab berputar di dalamnya', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByRole('dialog', { name: 'Contoh' })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Tutup' })).toHaveFocus()
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Kedua' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Tutup' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Kedua' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Di belakang' })).not.toHaveFocus()
  })

  it('Escape menutup', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<Harness onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })
})
