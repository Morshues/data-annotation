export type ColumnRole =
  'context' | 'spans' | 'source' | 'tags' | 'description' | 'ignore'

export const ROLE_LABELS: Record<ColumnRole, string> = {
  context: '上下文',
  spans: '標註重點',
  source: '來源／文件編號',
  tags: '標籤',
  description: '描述',
  ignore: '不匯入',
}

export type ColumnConfig = {
  index: number
  header: string
  role: ColumnRole
  // Tag group for tag columns; empty means ungrouped
  group: string
  // Splits one cell into several spans or tags; empty means no splitting
  separator: string
}

export const DEFAULT_SEPARATOR = '/'

// A, B, …, Z, AA, AB, …
export function columnLetter(index: number): string {
  let letters = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters
  }
  return letters
}

export function splitCell(value: string, separator: string): string[] {
  const parts = separator ? value.split(separator) : [value]
  return parts.map((part) => part.trim()).filter(Boolean)
}

const KEYWORDS: [ColumnRole, RegExp][] = [
  ['source', /編號|來源|檔案|^id$|source|file/i],
  ['context', /例子|例句|前後文|上下文|內文|context|sentence|text/i],
  ['description', /描述|備註|說明|note|comment|description/i],
]

// Guesses what each column is for. Blank columns are left out.
export function guessColumns(
  header: string[],
  body: string[][],
): ColumnConfig[] {
  const width = Math.max(header.length, ...body.map((row) => row.length))
  const values = (index: number) => body.map((row) => row[index]?.trim() ?? '')

  const columns: ColumnConfig[] = []
  for (let index = 0; index < width; index++) {
    if (values(index).every((v) => !v)) continue
    const text = header[index]?.trim() ?? ''
    columns.push({
      index,
      header: text,
      role: 'ignore',
      group: text || `欄 ${columnLetter(index)}`,
      separator: DEFAULT_SEPARATOR,
    })
  }

  const free = () => columns.filter((c) => c.role === 'ignore')
  const has = (role: ColumnRole) => columns.some((c) => c.role === role)

  for (const [role, pattern] of KEYWORDS) {
    const column = free().find((c) => pattern.test(c.header))
    if (column && (role === 'description' || !has(role))) column.role = role
  }

  const averageLength = (index: number) => {
    const filled = values(index).filter(Boolean)
    return filled.reduce((sum, v) => sum + v.length, 0) / filled.length
  }

  if (!has('context')) {
    const longest = free()
      .filter((c) => averageLength(c.index) >= 10)
      .sort((a, b) => averageLength(b.index) - averageLength(a.index))[0]
    if (longest) longest.role = 'context'
  }

  // The annotated text is the column whose values mostly appear in the context
  const context = columns.find((c) => c.role === 'context')
  if (context) {
    const contexts = values(context.index)
    const coverage = (index: number) => {
      const cells = values(index)
      const filled = cells.filter(Boolean).length
      const inside = cells.filter(
        (cell, row) =>
          cell &&
          splitCell(cell, DEFAULT_SEPARATOR).every((piece) =>
            contexts[row].includes(piece),
          ),
      ).length
      return filled > 0 ? inside / filled : 0
    }
    const best = free()
      .map((c) => ({ column: c, score: coverage(c.index) }))
      .sort((a, b) => b.score - a.score)[0]
    if (best && best.score >= 0.5) best.column.role = 'spans'
  }

  // Short, repeating, non-numeric values look like tags
  for (const column of free()) {
    const filled = values(column.index).filter(Boolean)
    const distinct = new Set(filled).size
    const numeric = filled.every((v) => !Number.isNaN(Number(v)))
    if (
      !numeric &&
      averageLength(column.index) <= 20 &&
      distinct <= filled.length * 0.8
    ) {
      column.role = 'tags'
    }
  }

  return columns
}

// Problems that block the import; empty when the columns can be used
export function validateColumns(columns: ColumnConfig[]): string[] {
  const count = (role: ColumnRole) =>
    columns.filter((c) => c.role === role).length
  const errors: string[] = []
  for (const role of ['context', 'spans'] as const) {
    if (count(role) === 0) errors.push(`請指定「${ROLE_LABELS[role]}」欄。`)
    if (count(role) > 1) errors.push(`「${ROLE_LABELS[role]}」只能有一欄。`)
  }
  if (count('source') > 1) {
    errors.push(`「${ROLE_LABELS.source}」最多一欄。`)
  }
  return errors
}
