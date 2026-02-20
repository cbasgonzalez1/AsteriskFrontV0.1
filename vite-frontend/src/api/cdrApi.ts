import type { CdrRow } from '../components/cdr/cdrTypes'

export async function fetchCdr(limit = 500): Promise<CdrRow[]> {
  const res = await fetch(`/api/cdr?limit=${limit}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Backend contract esperado:
// PATCH /api/cdr/:uniqueid  body: { campo: valor, ... }
export async function patchCdr(uniqueid: string, changes: Partial<CdrRow>) {
  const res = await fetch(`/api/cdr/${encodeURIComponent(uniqueid)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  })
  if (!res.ok) throw new Error(`No se pudo guardar: HTTP ${res.status}`)
  return res.json().catch(() => null)
}
