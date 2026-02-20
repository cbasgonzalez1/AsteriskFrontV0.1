export type CdrRow = {
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

export type ColumnDef<T> = { key: keyof T; label: string }

export type ColFilterState = { text: string; selected: string[] }
export type FiltersState<T> = Partial<Record<keyof T, ColFilterState>>
