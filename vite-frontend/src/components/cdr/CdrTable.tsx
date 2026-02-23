import { useEffect, useState } from 'react'
import type { CdrRow, FiltersState } from './cdrTypes'
import { COLUMNS } from './cdrColumns'
import { fetchCdr } from '../../api/cdrApi'
import { MAX_OPTIONS, PAGE_SIZE, normalize, safeDate } from './cdrUtils'
import { useFilteredRows, usePagedRows, useUniqueOptions } from './useCdrFilters'
import { CdrEditModal } from './CdrEditModal'

const styles = {
  root: {
    padding: 16,
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  } as const,
  title: { margin: 0 } as const,
  topBar: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' } as const,
  input: {
    padding: 10,
    borderRadius: 10,
    border: '1px solid #444',
    background: '#111',
    color: '#fff',
    outline: 'none',
  } as const,
  button: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #444',
    background: '#161616',
    color: '#fff',
    cursor: 'pointer',
  } as const,
  buttonPrimary: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #2b5cff55',
    background: '#2b5cff33',
    color: '#cdd7ff',
    cursor: 'pointer',
  } as const,
  tableViewport: { flex: 1, minHeight: 0, overflow: 'auto' } as const,
  table: {
    borderCollapse: 'collapse',
    width: '100%',
    background: '#0f0f0f',
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
  } as const,
  theadRow: { position: 'sticky', top: 0, zIndex: 20, background: '#121212' } as const,
  th: {
    textAlign: 'left',
    borderBottom: '1px solid #333',
    padding: 8,
    whiteSpace: 'nowrap',
    position: 'relative',
    background: '#121212',
  } as const,
  td: { padding: 8, borderBottom: '1px solid #2f2f2f', whiteSpace: 'nowrap' } as const,
  footer: { display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' } as const,
  popover: {
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
  } as const,
  smallButton: {
    padding: '6px 10px',
    borderRadius: 10,
    border: '1px solid #444',
    background: '#161616',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 12,
  } as const,
} as const

export function CdrTable() {
  const [rows, setRows] = useState<CdrRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<FiltersState<CdrRow>>({})
  const [openFilterKey, setOpenFilterKey] = useState<keyof CdrRow | null>(null)

  const [page, setPage] = useState(1)
  const [isEditOpen, setIsEditOpen] = useState(false)

  useEffect(() => {
    fetchCdr(500).then(setRows).catch((e) => setError(String(e)))
  }, [])

  // cerrar popover click afuera + Escape
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

  const uniqueOptionsByColumn = useUniqueOptions(rows)
  const filteredRows = useFilteredRows(rows, q, filters)
  const { pagedRows, safePage, totalPages } = usePagedRows(filteredRows, page, PAGE_SIZE)

  // ✅ Evita setState en effects: clamp solo cuando el usuario navega
  const clampPage = (p: number) => Math.min(totalPages, Math.max(1, p))

  const clearAll = () => {
    setQ('')
    setFilters({})
    setOpenFilterKey(null)
    // opcional: si quieres que el botón "Limpiar filtros" vuelva a la primera página
    setPage(1)
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

  const onSavedRow = (uniqueid: string, changes: Partial<CdrRow>) => {
    setRows((prev) => prev.map((r) => (r.uniqueid === uniqueid ? ({ ...r, ...changes } as CdrRow) : r)))
  }

  if (error) return <div style={{ padding: 16 }}>Error: {error}</div>

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>
        CDR (mostrando {pagedRows.length} de {filteredRows.length})
      </h2>

      <div style={styles.topBar}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en toda la tabla..."
          style={{ ...styles.input, minWidth: 320 }}
        />

        <button onClick={clearAll} style={styles.button}>
          Limpiar filtros
        </button>

        <button onClick={() => setIsEditOpen(true)} style={styles.buttonPrimary}>
          Editar
        </button>
      </div>

      <div style={styles.tableViewport}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
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
                  <th key={c.key} style={styles.th}>
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
                      <div data-filter-popover="true" style={styles.popover}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <input
                            autoFocus
                            value={st?.text ?? ''}
                            onChange={(e) => setColText(c.key, e.target.value)}
                            placeholder={`Buscar en ${c.label}...`}
                            style={styles.input}
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
                                  style={styles.smallButton}
                                  onClick={() => setColSelected(c.key, filteredOptions)}
                                >
                                  Seleccionar todo
                                </button>

                                <button
                                  type="button"
                                  style={styles.smallButton}
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
                                setPage(1) // opcional: al cambiar filtro de columna, vuelve a la primera página
                              }}
                              style={styles.smallButton}
                            >
                              Quitar
                            </button>

                            <button type="button" onClick={() => setOpenFilterKey(null)} style={styles.smallButton}>
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
                  const text = c.key === 'calldate' ? safeDate(r[c.key]) : String(r[c.key] ?? '')
                  return (
                    <td key={c.key} style={styles.td}>
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

      <div style={styles.footer}>
        <button
          onClick={() => setPage((p) => clampPage(p - 1))}
          disabled={safePage === 1}
          style={styles.button}
        >
          ← Anterior
        </button>

        <span style={{ whiteSpace: 'nowrap', color: '#ddd' }}>
          Página {safePage} / {totalPages}
        </span>

        <button
          onClick={() => setPage((p) => clampPage(p + 1))}
          disabled={safePage === totalPages}
          style={styles.button}
        >
          Siguiente →
        </button>
      </div>

      {isEditOpen && (
        <CdrEditModal
          rows={filteredRows} // o pagedRows si solo quieres editar la página actual
          onClose={() => setIsEditOpen(false)}
          onSavedRow={onSavedRow}
        />
      )}
    </div>
  )
}