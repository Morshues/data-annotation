import { describe, expect, it } from 'vitest'
import { buildImportRows, summarizeTags } from './build-rows'
import type { ColumnConfig } from './columns'

const columns: ColumnConfig[] = [
  { index: 0, header: '編號', role: 'source', group: '', separator: '/' },
  { index: 1, header: '例子', role: 'context', group: '', separator: '/' },
  { index: 2, header: '', role: 'spans', group: '', separator: '/' },
  { index: 3, header: '詞性', role: 'tags', group: '詞性', separator: '/' },
  { index: 4, header: '', role: 'tags', group: '', separator: '' },
  { index: 5, header: '備註', role: 'description', group: '', separator: '/' },
  { index: 6, header: '其他', role: 'ignore', group: '', separator: '/' },
]

describe('buildImportRows', () => {
  it('splits spans and tags and keeps the spreadsheet row number', () => {
    const [row] = buildImportRows(
      [
        [
          'B1',
          '那我們打完AZ疫苗',
          '打完/疫苗',
          '主詞/受詞',
          'a/b',
          '說明',
          'x',
        ],
      ],
      columns,
      2,
    )
    expect(row).toEqual({
      rowNumber: 2,
      source: 'B1',
      context: '那我們打完AZ疫苗',
      spans: [
        { start: 3, end: 5 },
        { start: 7, end: 9 },
      ],
      tags: [
        { group: '詞性', name: '主詞' },
        { group: '詞性', name: '受詞' },
        { group: null, name: 'a/b' },
      ],
      description: '說明',
      status: 'exact',
    })
  })

  it('leaves out blank rows and explains skipped ones', () => {
    const rows = buildImportRows(
      [
        ['B1', '上下文', '上下', '', '', '', ''],
        ['', '', '', '', '', '', 'only ignored'],
        ['B1', '', '上下', '', '', '', ''],
        ['B1', '上下文', '', '', '', '', ''],
        ['B1', '上下文', '蘋果', '', '', '', ''],
      ],
      columns,
      2,
    )
    expect(
      rows.map((r) => [
        r.rowNumber,
        r.status,
        r.status === 'skipped' ? r.reason : '',
      ]),
    ).toEqual([
      [2, 'exact', ''],
      [4, 'skipped', '沒有上下文'],
      [5, 'skipped', '沒有標註重點'],
      [6, 'skipped', '在上下文中找不到標註'],
    ])
  })
})

describe('summarizeTags', () => {
  it('lists tags per group and reports names in several groups', () => {
    const rows = buildImportRows(
      [
        ['B1', '上下文', '上下', '主詞', '', '', ''],
        ['B1', '上下文', '上下', '受詞', '主詞', '', ''],
        ['B1', '上下文', '上下', '', 'x', '', ''],
      ],
      columns,
      2,
    )
    expect(summarizeTags(rows)).toEqual({
      groups: [
        { group: '詞性', names: ['主詞', '受詞'] },
        { group: null, names: ['x'] },
      ],
      conflicts: [{ name: '主詞', groups: ['詞性', null] }],
    })
  })
})
