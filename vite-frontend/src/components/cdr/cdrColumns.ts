import type { CdrRow, ColumnDef } from './cdrTypes'

export const COLUMNS: ColumnDef<CdrRow>[] = [
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

// Recomendado: whitelist de editables
export const EDITABLE_COLUMNS: (keyof CdrRow)[] = [
  'accountcode',
  'userfield',
  'disposition',
  'amaflags',
  'lastdata',
]
