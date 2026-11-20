export type Sheet = {
  name: string
  // Every cell as display text; all rows have the same length
  rows: string[][]
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024

export const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.json']

// Reads a spreadsheet, CSV or JSON file into sheets of text cells.
export async function readTable(file: File): Promise<Sheet[]> {
  if (file.size > MAX_FILE_SIZE) throw new Error('檔案太大，上限是 5 MB')
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  const buffer = await file.arrayBuffer()

  switch (ext) {
    case '.json':
      return [
        { name: file.name, rows: normalize(jsonToRows(parseJson(buffer))) },
      ]
    case '.csv':
      return parseWorkbook(decodeText(buffer), 'string')
    case '.xlsx':
    case '.xls':
      return parseWorkbook(buffer, 'array')
    default:
      throw new Error('不支援這種檔案，請使用 .xlsx、.xls、.csv 或 .json')
  }
}

// UTF-8 first; Excel in Taiwan often saves CSV as Big5 instead.
export function decodeText(buffer: ArrayBuffer): string {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    text = new TextDecoder('big5').decode(buffer)
  }
  return text.replace(/^﻿/, '')
}

async function parseWorkbook(
  data: string | ArrayBuffer,
  type: 'string' | 'array',
): Promise<Sheet[]> {
  // Loaded on demand; the library is large and only this page needs it
  const XLSX = await import('xlsx')
  // raw keeps CSV values as typed instead of guessing numbers and dates
  const workbook = XLSX.read(data, {
    type,
    raw: type === 'string',
    dense: true,
  })
  return workbook.SheetNames.map((name) => ({
    name,
    rows: normalize(
      XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
        header: 1,
        defval: '',
        raw: false,
        blankrows: true,
      }),
    ),
  }))
}

function parseJson(buffer: ArrayBuffer): unknown {
  try {
    return JSON.parse(decodeText(buffer))
  } catch {
    throw new Error('JSON 格式不正確')
  }
}

// Accepts an array of arrays, an array of objects, or an object holding one
// of those. Object keys become the header row.
export function jsonToRows(data: unknown): unknown[][] {
  if (!Array.isArray(data)) {
    const nested =
      data && typeof data === 'object'
        ? Object.values(data).find(Array.isArray)
        : undefined
    if (!nested) throw new Error('無法辨識 JSON 的資料格式，需要是陣列')
    return jsonToRows(nested)
  }
  if (data.every(Array.isArray)) return data

  const keys: string[] = []
  for (const item of data) {
    if (item && typeof item === 'object') {
      for (const key of Object.keys(item)) {
        if (!keys.includes(key)) keys.push(key)
      }
    }
  }
  return [
    keys,
    ...data.map((item) =>
      item && typeof item === 'object'
        ? keys.map((key) => (item as Record<string, unknown>)[key])
        : [item],
    ),
  ]
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// Converts cells to text, pads rows to the same width and drops trailing
// blank rows.
function normalize(rows: unknown[][]): string[][] {
  const text = rows.map((row) => row.map(cellText))
  while (text.length > 0 && text.at(-1)!.every((cell) => !cell.trim())) {
    text.pop()
  }
  const width = Math.max(0, ...text.map((row) => row.length))
  return text.map((row) => [
    ...row,
    ...Array<string>(width - row.length).fill(''),
  ])
}
