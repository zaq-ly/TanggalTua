import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { messageOf } from '../db/errors'
import { moveInOrder, type MoveDirection } from '../domain/ordering'
import { EntityIcon } from './EntityIcon'

export interface ManageItem {
  id: string
  name: string
  icon: string
  color: string
  archived: boolean
  subtitle?: string
}

interface ManageListProps {
  /** Sudah terurut. */
  items: readonly ManageItem[]
  editHref: (id: string) => string
  onReorder: (orderedIds: string[]) => Promise<void>
  onRestore: (id: string) => Promise<void>
  noun: string
}

const iconButton =
  'flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent'

export function ManageList({ items, editHref, onReorder, onRestore, noun }: ManageListProps) {
  const [error, setError] = useState<string | null>(null)
  const active = items.filter((item) => !item.archived)
  const archived = items.filter((item) => item.archived)

  async function run(action: () => Promise<void>) {
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(messageOf(e))
    }
  }

  function move(id: string, direction: MoveDirection) {
    void run(() => onReorder(moveInOrder(active.map((item) => item.id), id, direction)))
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="rounded-control bg-surface px-4 py-3 text-sm text-expense">
          {error}
        </p>
      )}

      <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface">
        {active.map((item, index) => (
          <li key={item.id} className="flex items-center gap-1 py-1 pr-1 pl-2">
            <Link
              to={editHref(item.id)}
              className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-control px-1 hover:bg-surface-2"
            >
              <EntityIcon icon={item.icon} color={item.color} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.name}</span>
                {item.subtitle && <span className="block truncate text-sm text-muted tabular-nums">{item.subtitle}</span>}
              </span>
            </Link>
            <button
              type="button"
              className={iconButton}
              aria-label={`Naikkan ${item.name}`}
              disabled={index === 0}
              onClick={() => move(item.id, 'up')}
            >
              <ChevronUp aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              className={iconButton}
              aria-label={`Turunkan ${item.name}`}
              disabled={index === active.length - 1}
              onClick={() => move(item.id, 'down')}
            >
              <ChevronDown aria-hidden="true" className="size-5" />
            </button>
          </li>
        ))}
        {active.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted">Belum ada {noun} aktif. Tambahkan lewat tombol + di atas.</li>
        )}
      </ul>

      {archived.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 font-medium text-muted">
            <ChevronRight aria-hidden="true" className="size-5 transition-transform group-open:rotate-90" />
            Diarsipkan ({archived.length})
          </summary>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-card bg-surface">
            {archived.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2 pr-2 pl-3">
                <Link to={editHref(item.id)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 opacity-70">
                  <EntityIcon icon={item.icon} color={item.color} />
                  <span className="truncate font-medium">{item.name}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void run(() => onRestore(item.id))}
                  className="min-h-11 rounded-full px-4 text-sm font-semibold text-accent hover:bg-accent-soft"
                >
                  Pulihkan
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
