import { useLiveQuery } from 'dexie-react-hooks'
import { SearchX } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Button } from '../../components/Button'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { EmptyState } from '../../components/EmptyState'
import { EntityFields, type EntityDraft } from '../../components/EntityFields'
import { PageHeader } from '../../components/PageHeader'
import {
  createCategory,
  deleteCategory,
  isCategoryUsed,
  setCategoryArchived,
  updateCategory,
} from '../../db/categories'
import { db } from '../../db/db'
import { messageOf } from '../../db/errors'
import type { Category, CategoryKind } from '../../db/types'
import { KIND_PARAM, categoriesPath, kindFromParam } from './kindParam'

export function CategoryFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const category = useLiveQuery(async () => (id ? ((await db.categories.get(id)) ?? null) : null), [id])

  if (id && category === undefined) return null
  if (id && category === null) {
    return (
      <>
        <PageHeader title="Kategori" backTo={categoriesPath('expense')} backLabel="Kembali ke daftar kategori" />
        <EmptyState icon={SearchX} title="Kategori tidak ditemukan" description="Mungkin sudah dihapus. Kembali ke daftar kategori." />
      </>
    )
  }
  const kind = category?.kind ?? kindFromParam(params.get(KIND_PARAM))
  return <CategoryForm key={id ?? `baru-${kind}`} category={category ?? null} kind={kind} />
}

function CategoryForm({ category, kind }: { category: Category | null; kind: CategoryKind }) {
  const navigate = useNavigate()
  const listPath = categoriesPath(kind)
  const [draft, setDraft] = useState<EntityDraft>({
    name: category?.name ?? '',
    icon: category?.icon ?? 'tag',
    color: category?.color ?? (kind === 'income' ? 'green' : 'orange'),
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const used = useLiveQuery(() => (category ? isCategoryUsed(category.id) : Promise.resolve(false)), [category?.id])

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      navigate(listPath)
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title={category ? 'Ubah kategori' : kind === 'income' ? 'Pemasukan baru' : 'Pengeluaran baru'}
        backTo={listPath}
        backLabel="Kembali ke daftar kategori"
      />
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          void run(() => (category ? updateCategory(category.id, draft) : createCategory(kind, draft)))
        }}
      >
        <EntityFields
          draft={draft}
          onChange={setDraft}
          nameLabel="Nama kategori"
          namePlaceholder={kind === 'income' ? 'Misalnya Gaji' : 'Misalnya Kopi'}
        />
        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}
        <Button type="submit" block disabled={busy}>
          {category ? 'Simpan perubahan' : 'Simpan kategori'}
        </Button>
      </form>

      {category && (
        <section aria-label="Tindakan lain" className="flex flex-col gap-2 border-t border-line pt-5">
          <Button
            variant="secondary"
            block
            disabled={busy}
            onClick={() => void run(() => setCategoryArchived(category.id, !category.archived))}
          >
            {category.archived ? 'Pulihkan kategori' : 'Arsipkan kategori'}
          </Button>
          {used === false && (
            <Button variant="danger" block disabled={busy} onClick={() => setConfirmDelete(true)}>
              Hapus kategori
            </Button>
          )}
          <p className="text-sm text-muted">
            {used
              ? 'Kategori ini sudah dipakai transaksi, jadi hanya bisa diarsipkan. Riwayat dan statistiknya tetap ada.'
              : 'Kategori yang diarsipkan disembunyikan dari pilihan dan bisa dipulihkan kapan saja.'}
          </p>
        </section>
      )}

      {category && (
        <ConfirmSheet
          open={confirmDelete}
          title={`Hapus ${category.name}?`}
          description="Kategori ini belum pernah dipakai transaksi. Menghapusnya tidak bisa dibatalkan."
          confirmLabel="Hapus kategori"
          danger
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteCategory(category.id)
            navigate(listPath)
          }}
        />
      )}
    </>
  )
}
