import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { Sheet } from '../../components/Sheet'
import { TextField } from '../../components/TextField'
import { useSnackbar } from '../../components/useSnackbar'
import { messageOf } from '../../db/errors'
import { wipeAllData } from '../../db/settings'

const CONFIRM_WORD = 'HAPUS'

/** Konfirmasi dua langkah (PRD F9): penjelasan dulu, lalu mengetik kata konfirmasi. */
export function WipeDataSection() {
  const navigate = useNavigate()
  const showSnackbar = useSnackbar((s) => s.show)
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function close() {
    setStep(0)
    setTyped('')
    setError(null)
  }

  async function wipe() {
    setBusy(true)
    try {
      await wipeAllData()
      close()
      showSnackbar('Semua data sudah dihapus.')
      navigate('/')
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="judul-hapus" className="flex flex-col gap-3">
      <h2 id="judul-hapus" className="px-1 font-semibold">
        Hapus data
      </h2>
      <div className="flex flex-col gap-3 rounded-card bg-surface px-4 py-4">
        <p className="text-sm text-muted">Menghapus semua dompet, kategori, transaksi, dan anggaran dari HP ini.</p>
        <Button variant="danger" block onClick={() => setStep(1)}>
          Hapus semua data
        </Button>
      </div>

      <Sheet open={step === 1} title="Hapus semua data?" onClose={close} role="alertdialog">
        <div className="flex flex-col gap-4 pb-2">
          <p className="text-muted">
            Semua data keuangan di HP ini akan dihapus permanen dan tidak bisa dikembalikan, kecuali kamu punya file cadangan.
            Ekspor cadangan dulu di bagian Cadangan data bila masih ingin menyimpannya.
          </p>
          <Button variant="danger" block onClick={() => setStep(2)}>
            Lanjut
          </Button>
          <Button variant="secondary" block onClick={close}>
            Batal
          </Button>
        </div>
      </Sheet>

      <Sheet open={step === 2} title="Konfirmasi terakhir" onClose={close} role="alertdialog">
        <form
          className="flex flex-col gap-4 pb-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (typed.trim() === CONFIRM_WORD) void wipe()
          }}
        >
          <TextField
            label={`Ketik ${CONFIRM_WORD} untuk menghapus semua data`}
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase())}
            autoComplete="off"
            autoCapitalize="characters"
            autoFocus
            error={error}
          />
          <Button type="submit" variant="danger" block disabled={busy || typed.trim() !== CONFIRM_WORD}>
            Hapus semua data
          </Button>
          <Button variant="secondary" block onClick={close}>
            Batal
          </Button>
        </form>
      </Sheet>
    </section>
  )
}
