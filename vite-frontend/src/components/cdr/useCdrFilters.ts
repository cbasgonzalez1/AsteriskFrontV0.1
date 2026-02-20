import { useMemo } from 'react'
import type { CdrRow, FiltersState } from './cdrTypes'
import { MAX_UNIQUES_HARD, normalize, smartSort, valueToText } from './cdrUtils'
import { COLUMNS } from './cdrColumns'

export function useUniqueOptions(rows: CdrRow[]) {
  return useMemo(() => {
    const map = {} as Record<keyof CdrRow, string[]>

    for (const c of COLUMNS) {
      const uniques = new Set<string>()
      for (const r of rows) {
        uniques.add(valueToText(r, c.key))
        if (uniques.size >= MAX_UNIQUES_HARD) break
      }
      map[c.key] = Array.from(uniques).sort(smartSort)
    }

    return map
  }, [rows])
}

export function useFilteredRows(rows: CdrRow[], q: string, filters: FiltersState<CdrRow>) {
  return useMemo(() => {
    const qn = normalize(q)

    return rows.filter((r) => {
      if (qn) {
        const passGlobal = COLUMNS.some((c) => normalize(r[c.key]).includes(qn))
        if (!passGlobal) return false
      }

      for (const c of COLUMNS) {
        const st = filters[c.key]
        if (!st) continue

        const cellRaw = normalize(r[c.key])
        const cellShown = normalize(valueToText(r, c.key))

        const text = normalize(st.text)
        if (text) {
          if (!cellRaw.includes(text) && !cellShown.includes(text)) return false
        }

        if (st.selected?.length) {
          const shown = valueToText(r, c.key)
          if (!st.selected.includes(shown)) return false
        }
      }

      return true
    })
  }, [rows, q, filters])
}

export function usePagedRows<T>(rows: T[], page: number, pageSize: number) {
  return useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    return {
      safePage,
      totalPages,
      pagedRows: rows.slice(start, start + pageSize),
    }
  }, [rows, page, pageSize])
}
