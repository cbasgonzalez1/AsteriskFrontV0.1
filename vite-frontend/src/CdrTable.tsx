import { useEffect, useMemo, useState } from 'react'

type CdrRow = {
  calldate: string
  clid: string
  src: string
  dst: string
  dcontext: string
  channel: string
  dstchannel: string
  lastapp: string
  lastdata: string
  duration: number
  billsec: number
  disposition: string
  amaflags: number
  accountcode: string
  uniqueid: string
  userfield: string
}

const COLUMNS: { key: keyof CdrRow; label: string }[] = [
  { key: 'calldate', label: 'Fecha' },
  { key: 'clid', label: 'CLID' },
  { key: 'src', label: 'SRC' },
  { key: 'dst', label: 'DST' },
  { key: 'dcontext', label: 'Contexto' },
  { key: 'channel', label: 'Channel' },
  { key: 'dstchannel', label: 'DstChannel' },
  { key: 'lastapp', label: 'LastApp' },
  { key: 'lastdata', label: 'LastData' },
  { key: 'duration', label: 'Dur' },
  { key: 'billsec', label: 'Bill' },
  { key: 'disposition', label: 'Estado' },
  { key: 'amaflags', label: 'AmaFlags' },
  { key: 'accountcode', label: 'Account' },
  { key: 'uniqueid', label: 'UniqueID' },
  { key: 'userfield', label: 'UserField' },
]

const PAGE_SIZE = 20
const MAX_OPTIONS = 80
const MAX_UNIQUES_HARD = 500

function safeDate(v: unknown) {
  const d = new Date(String(v))
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString()
}

function normalize(v: unknown) {
  return String(v ?? '').toLowerCase().trim()
}

function valueToText(row: CdrRow, key: keyof CdrRow) {
  const v = row[key]
  return key === 'calldate' ? safeDate(v) : String(v ?? '')
}

type ColFilterState = { text: string; selected: string[] }
type FiltersState = Partial<Record<keyof CdrRow, ColFilterState>>

const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: '1px solid #444',
  background: '#111',
  color: '#fff',
  outline: 'none',
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #444',
  background: '#161616',
  color: '#fff',
  cursor: 'pointer',
}

const smallButtonStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 10,
  border: '1px solid #444',
  background: '#161616',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 12,
}

export function CdrTable() {
  const [rows, setRows] = useState<CdrRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [openFilterKey, setOpenFilterKey] = useState<keyof CdrRow | null>(null)
  const [filters, setFilters] = useState<FiltersState>({})
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/cdr?limit=500')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: CdrRow[]) => setRows(data))
      .catch((e) => setError(String(e)))
  }, [])

  // Cerrar popover al click afuera + Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (!el.closest('[data-filter-popover="true"]') && !el.closest('[data-filter-btn="true"]')) {
        setOpenFilterKey(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenFilterKey(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // Reset de página cuando cambien filtros
  useEffect(() => {
    setPage(1)
  }, [q, filters])

  // ✅ Orden: numérico si es número, fecha si es fecha, texto natural si no
  const uniqueOptionsByColumn = useMemo(() => {
    const map = {} as Record<keyof CdrRow, string[]>

    const smartSort = (a: string, b: string) => {
      if (!a) return -1
      if (!b) return 1

      const na = Number(a)
      const nb = Number(b)
      if (!isNaN(na) && !isNaN(nb)) return na - nb

      const da = new Date(a)
      const db = new Date(b)
      if (!isNaN(da.getTime()) && !isNaN(db.getTime())) return da.getTime() - db.getTime()

      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    }

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

  const filteredRows = useMemo(() => {
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

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredRows.slice(start, start + PAGE_SIZE)
  }, [filteredRows, safePage])

  const clearAll = () => {
    setQ('')
    setFilters({})
    setOpenFilterKey(null)
  }

  const setColText = (key: keyof CdrRow, text: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: { text, selected: prev[key]?.selected ?? [] },
    }))
  }

  const setColSelected = (key: keyof CdrRow, selected: string[]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: { text: prev[key]?.text ?? '', selected },
    }))
  }

  const clearCol = (key: keyof CdrRow) => {
    setFilters((prev) => {
      const copy = { ...prev }
      delete copy[key]
      return copy
    })
  }

  if (error) return <div style={{ padding: 16 }}>Error: {error}</div>

  return (
    <div
      style={{
        padding: 16,
        height: '100vh', // ✅ evita scroll del body
        overflow: 'hidden', // ✅ scroll solo en la tabla
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <h2 style={{ margin: 0 }}>
        CDR (mostrando {pagedRows.length} de {filteredRows.length})
      </h2>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en toda la tabla..."
          style={{ ...inputStyle, minWidth: 320 }}
        />

        <button onClick={clearAll} style={buttonStyle}>
          Limpiar filtros
        </button>
      </div>

      {/* ✅ Área tabla: ocupa lo disponible, sin padding extra -> no deja hueco raro */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          borderRadius: 12,
          border: '1px solid #2a2a2a',
          background: '#0f0f0f',
        }}
      >
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            {/* ✅ header sticky tipo Excel */}
            <tr
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 20,
                background: '#121212',
              }}
            >
              {COLUMNS.map((c) => {
                const st = filters[c.key]
                const isOpen = openFilterKey === c.key
                const active = Boolean(st?.text?.trim() || st?.selected?.length)

                const options = uniqueOptionsByColumn[c.key] ?? []
                const isHighCardinality = options.length > MAX_OPTIONS

                const popoverSearch = st?.text ?? ''
                const popoverSearchN = normalize(popoverSearch)

                const filteredOptions = !isHighCardinality
                  ? options.filter((opt) => normalize(opt).includes(popoverSearchN)).slice(0, MAX_OPTIONS)
                  : []

                return (
                  <th
                    key={c.key}
                    style={{
                      textAlign: 'left',
                      borderBottom: '1px solid #333',
                      padding: 8,
                      whiteSpace: 'nowrap',
                      position: 'relative',
                      background: '#121212',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      {c.label}

                      <button
                        type="button"
                        data-filter-btn="true"
                        onClick={() => setOpenFilterKey((k) => (k === c.key ? null : c.key))}
                        title="Filtrar"
                        style={{
                          fontSize: 12,
                          padding: '2px 6px',
                          borderRadius: 8,
                          border: '1px solid #444',
                          background: active ? '#2b5cff33' : '#161616',
                          color: active ? '#9bb4ff' : '#ddd',
                          cursor: 'pointer',
                        }}
                      >
                        ▼
                      </button>
                    </span>

                    {isOpen && (
                      <div
                        data-filter-popover="true"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          marginTop: 8,
                          zIndex: 50,
                          background: '#1a1a1a',
                          border: '1px solid #444',
                          borderRadius: 12,
                          padding: 12,
                          minWidth: 260,
                          boxShadow: '0 10px 28px rgba(0,0,0,.45)',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <input
                            autoFocus
                            value={st?.text ?? ''}
                            onChange={(e) => setColText(c.key, e.target.value)}
                            placeholder={`Buscar en ${c.label}...`}
                            style={inputStyle}
                          />

                          {!isHighCardinality ? (
                            <div style={{ border: '1px solid #333', borderRadius: 10, overflow: 'hidden' }}>
                              <div style={{ maxHeight: 220, overflow: 'auto', background: '#111' }}>
                                {filteredOptions.length === 0 ? (
                                  <div style={{ padding: 10, color: '#aaa', fontSize: 12 }}>
                                    Sin opciones que coincidan.
                                  </div>
                                ) : (
                                  filteredOptions.map((opt) => {
                                    const checked = Boolean(st?.selected?.includes(opt))
                                    return (
                                      <label
                                        key={opt}
                                        style={{
                                          display: 'flex',
                                          gap: 10,
                                          alignItems: 'center',
                                          padding: '8px 10px',
                                          borderBottom: '1px solid #1f1f1f',
                                          cursor: 'pointer',
                                          userSelect: 'none',
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(e) => {
                                            const prevSel = st?.selected ?? []
                                            const next = e.target.checked
                                              ? Array.from(new Set([...prevSel, opt]))
                                              : prevSel.filter((x) => x !== opt)
                                            setColSelected(c.key, next)
                                          }}
                                        />
                                        <span style={{ color: '#eee', fontSize: 13 }}>{opt || '(vacío)'}</span>
                                      </label>
                                    )
                                  })
                                )}
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  gap: 8,
                                  padding: 10,
                                  background: '#141414',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <button
                                  type="button"
                                  style={smallButtonStyle}
                                  onClick={() => setColSelected(c.key, filteredOptions)}
                                >
                                  Seleccionar todo
                                </button>

                                <button
                                  type="button"
                                  style={smallButtonStyle}
                                  onClick={() => setColSelected(c.key, [])}
                                >
                                  Limpiar selección
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ color: '#aaa', fontSize: 12, lineHeight: 1.3 }}>
                              Esta columna tiene muchos valores distintos. <br />
                              Usa “Buscar en {c.label}...” (contiene) para filtrar.
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => {
                                clearCol(c.key)
                                setOpenFilterKey(null)
                              }}
                              style={smallButtonStyle}
                            >
                              Quitar
                            </button>

                            <button type="button" onClick={() => setOpenFilterKey(null)} style={smallButtonStyle}>
                              Cerrar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {pagedRows.map((r, idx) => (
              <tr key={`${r.uniqueid}-${r.calldate}-${idx}`}>
                {COLUMNS.map((c) => {
                  const v = r[c.key]
                  const text = c.key === 'calldate' ? safeDate(v) : String(v)
                  return (
                    <td
                      key={c.key}
                      style={{
                        padding: 8,
                        borderBottom: '1px solid #2f2f2f',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {text}
                    </td>
                  )
                })}
              </tr>
            ))}

            {pagedRows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} style={{ padding: 12 }}>
                  No hay resultados con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ Footer SIEMPRE visible, sin necesidad de scroll */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage === 1}
          style={buttonStyle}
        >
          ← Anterior
        </button>

        <span style={{ whiteSpace: 'nowrap', color: '#ddd' }}>
          Página {safePage} / {totalPages}
        </span>

        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage === totalPages}
          style={buttonStyle}
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
