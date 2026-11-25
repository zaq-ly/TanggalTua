export type MoveDirection = 'up' | 'down'

/** Menggeser satu id ke atas atau ke bawah. Mengembalikan urutan yang sama bila sudah di ujung. */
export function moveInOrder(ids: readonly string[], id: string, direction: MoveDirection): string[] {
  const result = [...ids]
  const from = result.indexOf(id)
  if (from === -1) return result
  const to = direction === 'up' ? from - 1 : from + 1
  if (to < 0 || to >= result.length) return result
  const [moved] = result.splice(from, 1)
  if (moved !== undefined) result.splice(to, 0, moved)
  return result
}

/** Nilai `sort` berurutan 0, 1, 2, ... sesuai posisi. */
export function sortUpdates(ids: readonly string[]): { id: string; sort: number }[] {
  return ids.map((id, index) => ({ id, sort: index }))
}

export function nextSort(items: readonly { sort: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.sort + 1), 0)
}

export function bySort<T extends { sort: number; name: string }>(a: T, b: T): number {
  return a.sort - b.sort || a.name.localeCompare(b.name, 'id')
}
