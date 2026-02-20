import { useEffect, useMemo, useState } from 'react'
import type { CdrRow } from './cdrTypes'
import { COLUMNS, EDITABLE_COLUMNS } from './cdrColumns'
import { castValue, getRowKey, safeDate } from './cdrUtils'
import { patchCdr } from '../../api/cdrApi'

type Props = {
  rows: CdrRow[]
  onClose: () => void
  onSavedRow: (uniqueid: string, changes: Partial<CdrRow>) => void
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  } as const,
  modal: {
    width: 'min(1200px, 100%)',
    height: 'min(85vh, 900px)',
    background: '#101010',
    border: '1px solid #2a2a2a',
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  } as const,
  header: {
    padding: 12,
    borderBottom: '1px solid #222',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  } as const,
  body: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    padding: 12,
  } as const,
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
  table: {
    borderCollapse: 'collapse',
    width: '100%',
    background: '#0f0f0f',
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
  } as const,
  theadRow: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    background: '#121212',
  } as const,
  th: {
    textAlign: 'left',
    borderBottom: '1px solid #333',
    padding: 8,
    whiteSpace: 'nowrap',
    background: '#121212',
  } as const,
  td: {
    padding: 8,
    borderBottom: '1px solid #2f2f2f',
    whiteSpace: 'nowrap',
  } as const,
  editedCell: {
    background: '#2b5cff22',
    outline: '1px solid #2b5cff55',
  } as const,
  pill: {
    fontSize: 12,
    padding: '4px 8px',
    borderRadius: 999,
    border: '1px solid #333',
    color: '#bbb',
    background: '#151515',
    whiteSpace: 'nowrap',
  } as const,
} as const

function isEditable(key: keyof CdrRow) {
  return EDITABLE_COLUMNS.includes(key)
}

export function CdrEditModal({ rows, onClose, onSavedRow }: Props) {
  const [active, setActive] = useState<{ rowKey: string; col: keyof CdrRow } | null>(null)
  const [draft, setDraft] = useState<Record<string, Partial<CdrRow>>>({})
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalChanges = useMemo(
    () => Object.values(draft).reduce((acc, rowChanges) => acc + Object.keys(rowChanges).length, 0),
    [draft]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const beginEdit = (r: CdrRow, col: keyof CdrRow) => {
    if (!isEditable(col)) return
    const rowKey = getRowKey(r)
    setActive({ rowKey, col })
    const current = draft[rowKey]?.[col] ?? r[col]
    setValue(String(current ?? ''))
    setError(null)
  }

  const commitCell = () => {
    if (!active) return
    const { rowKey, col } = active
    setDraft((prev) => ({
      ...prev,
      [rowKey]: {
        ...(prev[rowKey] ?? {}),
        [col]: castValue(col, value),
      },
    }))
    setActive(null)
  }

  const isCellEdited = (r: CdrRow, col: keyof CdrRow) => {
    const rowKey = getRowKey(r)
    return draft[rowKey]?.[col] !== undefined
  }

  const saveAll = async () => {
    setSaving(true)
    setError(null)
    try {
      for (const r of rows) {
        const rowKey = getRowKey(r)
        const changes = draft[rowKey]
        if (!changes || Object.keys(changes).length === 0) continue
        await patchCdr(r.uniqueid, changes)
        onSavedRow(r.uniqueid, changes)
      }
      setDraft({})
      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <strong>Editar CDR</strong>
            <span style={styles.pill}>Cambios: {totalChanges}</span>
            <span style={styles.pill}>Doble click para editar • Enter para confirmar</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={styles.button} disabled={saving}>
              Cancelar
            </button>
            <button onClick={saveAll} style={styles.buttonPrimary} disabled={saving || totalChanges === 0}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        {error && <div style={{ padding: 12, color: '#ffb4b4' }}>{error}</div>}

        <div style={styles.body}>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  {COLUMNS.map((c) => (
                    <th key={c.key} style={styles.th}>
                      {c.label}
                      {isEditable(c.key) ? (
                        <span style={{ marginLeft: 8, fontSize: 11, color: '#8aa2ff' }}>(editable)</span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((r, idx) => (
                  <tr key={`${r.uniqueid}-${r.calldate}-${idx}`}>
                    {COLUMNS.map((c) => {
                      const col = c.key
                      const isEditing = active?.rowKey === getRowKey(r) && active?.col === col

                      const baseText = col === 'calldate' ? safeDate(r[col]) : String(r[col] ?? '')
                      const shownText = isCellEdited(r, col)
                        ? String((draft[getRowKey(r)]?.[col] as any) ?? '')
                        : baseText

                      return (
                        <td
                          key={col}
                          style={{
                            ...styles.td,
                            ...(isCellEdited(r, col) ? styles.editedCell : null),
                            cursor: isEditable(col) ? 'text' : 'default',
                          }}
                          onDoubleClick={() => beginEdit(r, col)}
                        >
                          {isEditing ? (
                            <input
                              value={value}
                              onChange={(e) => setValue(e.target.value)}
                              autoFocus
                              onBlur={commitCell}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitCell()
                                if (e.key === 'Escape') setActive(null)
                              }}
                              style={{ ...styles.input, padding: 8, width: '100%' }}
                            />
                          ) : (
                            <span>{shownText}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} style={{ padding: 12 }}>
                      No hay datos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
