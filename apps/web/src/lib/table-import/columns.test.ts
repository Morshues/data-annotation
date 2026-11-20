import { describe, expect, it } from 'vitest'
import { columnLetter, guessColumns, validateColumns } from './columns'

// Shaped like an annotation spreadsheet: id, context, unlabeled annotated
// text, tag columns (one without a header) and a trailing blank column
const header = ['編號', '例子', '', '主詞/受詞', '類型', '', '']
const body = [
  ['B1', '我們今天來談疫苗', '我們/疫苗', '主詞', 'mental', '', ''],
  ['B1', '我們下集再見囉', '我們下集再見', '主詞', 'verbal', '', ''],
  ['B2', '他們的政府要開始', '他們的政府', '所有', 'material', '', ''],
  ['B2', '我們發現了一些問題', '我們發現', '主詞', '', 'x', ''],
  ['B2', '我們的國家很好', '我們的國家', '所有', 'mental', 'x', ''],
]

describe('columnLetter', () => {
  it('names columns like a spreadsheet', () => {
    expect([0, 25, 26, 27, 701, 702].map(columnLetter)).toEqual([
      'A',
      'Z',
      'AA',
      'AB',
      'ZZ',
      'AAA',
    ])
  })
})

describe('guessColumns', () => {
  const columns = guessColumns(header, body)
  const roleOf = (index: number) => columns.find((c) => c.index === index)?.role

  it('recognizes roles from headers and content', () => {
    expect([0, 1, 2, 3, 4, 5].map(roleOf)).toEqual([
      'source',
      'context',
      'spans',
      'tags',
      'tags',
      'tags',
    ])
  })

  it('leaves out blank columns', () => {
    expect(roleOf(6)).toBeUndefined()
  })

  it('names tag groups after the header or the column letter', () => {
    expect(columns.find((c) => c.index === 3)?.group).toBe('主詞/受詞')
    expect(columns.find((c) => c.index === 5)?.group).toBe('欄 F')
  })

  it('picks the longest column as context without a matching header', () => {
    const guessed = guessColumns(
      ['a', 'b'],
      [
        ['x', '這是一段比較長的上下文內容'],
        ['y', '另外一段也很長的上下文內容'],
      ],
    )
    expect(guessed.map((c) => c.role)).toEqual(['ignore', 'context'])
  })

  it('does not take numbers as tags', () => {
    const guessed = guessColumns(
      ['內文', '按讚數'],
      [
        ['一段貼文', '0'],
        ['另一段貼文', '0'],
      ],
    )
    expect(guessed.map((c) => c.role)).toEqual(['context', 'ignore'])
  })
})

describe('validateColumns', () => {
  const column = (role: Parameters<typeof validateColumns>[0][0]['role']) => ({
    index: 0,
    header: '',
    role,
    group: '',
    separator: '/',
  })

  it('accepts one context and one spans column', () => {
    expect(validateColumns([column('context'), column('spans')])).toEqual([])
  })

  it('requires context and spans', () => {
    expect(validateColumns([column('tags')])).toEqual([
      '請指定「上下文」欄。',
      '請指定「標註重點」欄。',
    ])
  })

  it('rejects duplicates', () => {
    expect(
      validateColumns([
        column('context'),
        column('spans'),
        column('spans'),
        column('source'),
        column('source'),
      ]),
    ).toEqual(['「標註重點」只能有一欄。', '「來源／文件編號」最多一欄。'])
  })
})
