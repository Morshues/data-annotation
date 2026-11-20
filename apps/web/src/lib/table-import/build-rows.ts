import type { Range } from '../segments'
import type { ColumnConfig } from './columns'
import { splitCell } from './columns'
import { matchSpans } from './match-spans'

export type ImportTag = { group: string | null; name: string }

export type ImportRow = {
  // 1-based, as shown in the spreadsheet
  rowNumber: number
  source: string
  context: string
  spans: Range[]
  tags: ImportTag[]
  description: string
} & ({ status: 'exact' | 'approx' } | { status: 'skipped'; reason: string })

// Maps table rows to annotations. Rows with nothing in the used columns are
// left out entirely; rows that cannot become an annotation are kept as
// skipped with the reason.
export function buildImportRows(
  body: string[][],
  columns: ColumnConfig[],
  firstRowNumber: number,
): ImportRow[] {
  const used = columns.filter((c) => c.role !== 'ignore')
  const cell = (row: string[], column: ColumnConfig | undefined) =>
    column ? (row[column.index]?.trim() ?? '') : ''
  const contextColumn = used.find((c) => c.role === 'context')
  const spansColumn = used.find((c) => c.role === 'spans')
  const sourceColumn = used.find((c) => c.role === 'source')

  const rows: ImportRow[] = []
  body.forEach((row, i) => {
    if (used.every((c) => !cell(row, c))) return

    const tags: ImportTag[] = []
    for (const column of used.filter((c) => c.role === 'tags')) {
      for (const name of splitCell(cell(row, column), column.separator)) {
        if (!tags.some((t) => t.name === name)) {
          tags.push({ group: column.group.trim() || null, name })
        }
      }
    }

    const base = {
      rowNumber: firstRowNumber + i,
      source: cell(row, sourceColumn),
      context: row[contextColumn?.index ?? -1] ?? '',
      tags,
      description: used
        .filter((c) => c.role === 'description')
        .map((c) => cell(row, c))
        .filter(Boolean)
        .join('\n'),
    }

    const pieces = spansColumn
      ? splitCell(cell(row, spansColumn), spansColumn.separator)
      : []
    if (!base.context.trim()) {
      rows.push({ ...base, spans: [], status: 'skipped', reason: '沒有上下文' })
    } else if (pieces.length === 0) {
      rows.push({
        ...base,
        spans: [],
        status: 'skipped',
        reason: '沒有標註重點',
      })
    } else {
      const { spans, status } = matchSpans(base.context, pieces)
      rows.push(
        status === 'none'
          ? {
              ...base,
              spans,
              status: 'skipped',
              reason: '在上下文中找不到標註',
            }
          : { ...base, spans, status },
      )
    }
  })
  return rows
}

export type TagSummary = {
  groups: { group: string | null; names: string[] }[]
  // Tag names are unique in a project, so a name given under several groups
  // ends up in the first of them (the import API does the same)
  conflicts: { name: string; groups: (string | null)[] }[]
}

export function summarizeTags(rows: ImportRow[]): TagSummary {
  const groupsOf = new Map<string, (string | null)[]>()
  for (const tag of rows.flatMap((r) => r.tags)) {
    const groups = groupsOf.get(tag.name) ?? []
    if (!groups.includes(tag.group)) groups.push(tag.group)
    groupsOf.set(tag.name, groups)
  }

  const groups: TagSummary['groups'] = []
  for (const [name, candidates] of groupsOf) {
    const group = candidates.find((g) => g !== null) ?? null
    let entry = groups.find((g) => g.group === group)
    if (!entry) groups.push((entry = { group, names: [] }))
    entry.names.push(name)
  }
  for (const entry of groups) entry.names.sort()

  return {
    groups,
    conflicts: [...groupsOf]
      .filter(([, g]) => g.length > 1)
      .map(([name, g]) => ({ name, groups: g })),
  }
}
