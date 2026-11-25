import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { formatRupiah } from '../lib/money'
import { Keypad } from './Keypad'

function Harness({ max }: { max?: number }) {
  const [value, setValue] = useState(0)
  return (
    <>
      <output data-testid="nilai">{formatRupiah(value)}</output>
      <Keypad value={value} onChange={setValue} max={max} quickAmounts={[10_000, 50_000]} />
    </>
  )
}

describe('Keypad', () => {
  it('mengetik angka dengan pemisah ribuan otomatis', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: '5' }))
    await user.click(screen.getByRole('button', { name: '000' }))
    expect(screen.getByTestId('nilai')).toHaveTextContent('Rp25.000')
  })

  it('menghapus digit terakhir', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: '000' }))
    await user.click(screen.getByRole('button', { name: 'Hapus satu digit' }))
    expect(screen.getByTestId('nilai')).toHaveTextContent('Rp100')
  })

  it('pintasan cepat menambah jumlah', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Tambah Rp10 rb' }))
    await user.click(screen.getByRole('button', { name: 'Tambah Rp50 rb' }))
    expect(screen.getByTestId('nilai')).toHaveTextContent('Rp60.000')
    expect(screen.getByRole('button', { name: 'Tambah Rp10 rb' })).toHaveTextContent('+10rb')
  })

  it('tidak melewati batas', async () => {
    const user = userEvent.setup()
    render(<Harness max={9_999} />)
    await user.click(screen.getByRole('button', { name: '9' }))
    await user.click(screen.getByRole('button', { name: '000' }))
    await user.click(screen.getByRole('button', { name: '000' }))
    expect(screen.getByTestId('nilai')).toHaveTextContent('Rp9.000')
  })
})
