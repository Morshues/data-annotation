import { describe, expect, it } from 'vitest'
import { jsonToRows, readTable } from './read-table'

const file = (parts: BlobPart[], name: string) => new File(parts, name)

describe('readTable', () => {
  it('reads UTF-8 CSV with a BOM and keeps values as typed', async () => {
    const [sheet] = await readTable(
      file(['﻿編號,時間,內文\nB1,2024-1-1,"兩行\n內容"\n007,0,\n\n'], 'a.csv'),
    )
    expect(sheet.rows).toEqual([
      ['編號', '時間', '內文'],
      ['B1', '2024-1-1', '兩行\n內容'],
      ['007', '0', ''],
    ])
  })

  it('reads Big5 CSV', async () => {
    // 「你好,世界」 in Big5
    const bytes = new Uint8Array([
      0xa7, 0x41, 0xa6, 0x6e, 0x2c, 0xa5, 0x40, 0xac, 0xc9,
    ])
    const [sheet] = await readTable(file([bytes], 'b.csv'))
    expect(sheet.rows).toEqual([['你好', '世界']])
  })

  it('reads a JSON array of objects', async () => {
    const [sheet] = await readTable(
      file(
        [
          JSON.stringify([
            { a: 1, b: 'x' },
            { b: 'y', c: { d: 2 } },
          ]),
        ],
        'c.json',
      ),
    )
    expect(sheet.rows).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x', ''],
      ['', 'y', '{"d":2}'],
    ])
  })

  it('rejects other file types', async () => {
    await expect(readTable(file(['x'], 'd.txt'))).rejects.toThrow('不支援')
  })
})

describe('jsonToRows', () => {
  it('passes arrays of arrays through', () => {
    expect(jsonToRows([['a'], ['b', 'c']])).toEqual([['a'], ['b', 'c']])
  })

  it('finds the array inside an object', () => {
    expect(jsonToRows({ data: [{ a: 1 }] })).toEqual([['a'], [1]])
  })

  it('rejects data without an array', () => {
    expect(() => jsonToRows({ a: 1 })).toThrow('需要是陣列')
  })
})
