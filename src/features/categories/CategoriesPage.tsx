import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Tags } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { IconButtonLink } from '../../components/IconButtonLink'
import { ManageList } from '../../components/ManageList'
import { PageHeader } from '../../components/PageHeader'
import { ensureDefaultCategories, reorderCategories, setCategoryArchived } from '../../db/categories'
import { db } from '../../db/db'
import { messageOf } from '../../db/errors'
import type { CategoryKind } from '../../db/types'
import { bySort } from '../../domain/ordering'
import { KIND_LABELS, KIND_PARAM, categoriesPath, kindFromParam, newCategoryPath } from './kindParam'

const KINDS: readonly CategoryKind[] = ['expense', 'income']

export function CategoriesPage() {
  const [params] = useSearchParams()
  const kind = kindFromParam(params.get(KIND_PARAM))
  const all = useLiveQuery(() => db.categories.toArray())
  const [error, setError] = useState<string | null>(null)
  const ofKind = all?.filter((c) => c.kind === kind).sort(bySort)

  return (
    <>
      <PageHeader
        title="Kategori"
        backTo="/pengaturan"
        action={<IconButtonLink to={newCategoryPath(kind)} label={`Tambah kategori ${KIND_LABELS[kind].toLowerCase()}`} icon={Plus} />}
      />

      <nav aria-label="Jenis kategori" className="grid grid-cols-2 gap-1 rounded-control bg-surface-2 p-1">
        {KINDS.map((k) => (
          <Link
            key={k}
            to={categoriesPath(k)}
            replace
            aria-current={k === kind ? 'page' : undefined}
            className="flex min-h-11 items-center justify-center rounded-[calc(var(--radius-control)-0.25rem)] font-medium text-muted aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:shadow-sm"
          >
            {KIND_LABELS[k]}
          </Link>
        ))}
      </nav>

      {all?.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Belum ada kategori"
          description="Pakai kategori bawaan seperti Makanan, Transport, dan Gaji, lalu ubah sesukamu."
          action={
            <div className="flex flex-col items-center gap-2">
              <Button onClick={() => void ensureDefaultCategories().catch((e: unknown) => setError(messageOf(e)))}>
                Pakai kategori bawaan
              </Button>
              {error && (
                <p role="alert" className="text-sm text-expense">
                  {error}
                </p>
              )}
            </div>
          }
        />
      ) : (
        ofKind && (
          <ManageList
            noun={`kategori ${KIND_LABELS[kind].toLowerCase()}`}
            items={ofKind}
            editHref={(id) => `/pengaturan/kategori/${id}`}
            onReorder={(ids) => reorderCategories(ids)}
            onRestore={(id) => setCategoryArchived(id, false)}
          />
        )
      )}
    </>
  )
}
