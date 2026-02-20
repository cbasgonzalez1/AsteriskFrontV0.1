import type { CdrRow } from './cdrTypes'

export const PAGE_SIZE = 20
export const MAX_OPTIONS = 80
export const MAX_UNIQUES_HARD = 500

export function safeDate(v: unknown) {
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString()
}

export function normalize(v: unknown) {
  return String(v ?? '').toLowerCase().trim()
}

export function valueToText(row: CdrRow, key: keyof CdrRow) {
  const v = row[key]
  return key === 'calldate' ? safeDate(v) : String(v ?? '')
}

export function smartSort(a: string, b: string) {
  if (!a) return -1
  if (!b) return 1

  const na = Number(a)
  const nb = Number(b)
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb

  const da = new Date(a)
  const db = new Date(b)
  if (!Number.isNaN(da.getTime()) && !Number.isNaN(db.getTime())) return da.getTime() - db.getTime()

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export function getRowKey(r: CdrRow) {
  return `${r.uniqueid}|${r.calldate}`
}

export function castValue(key: keyof CdrRow, raw: string) {
  if (key === 'duration' || key === 'billsec' || key === 'amaflags') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : raw
  }
  return raw
}
