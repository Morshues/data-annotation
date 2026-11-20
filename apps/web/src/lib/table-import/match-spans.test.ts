import { describe, expect, it } from 'vitest'
import { matchSpans } from './match-spans'

// Returns the matched text of each span, for readable expectations
function texts(context: string, pieces: string[]) {
  const { spans, status } = matchSpans(context, pieces)
  return { texts: spans.map((s) => context.slice(s.start, s.end)), status }
}

describe('matchSpans', () => {
  it('finds pieces verbatim', () => {
    expect(matchSpans('今天他不但很快，而且很好', ['不但', '而且'])).toEqual({
      spans: [
        { start: 3, end: 5 },
        { start: 8, end: 10 },
      ],
      status: 'exact',
    })
  })

  it('searches each piece after the previous one first', () => {
    expect(matchSpans('好的好的', ['好的', '好的']).spans).toEqual([
      { start: 0, end: 4 },
    ])
    expect(matchSpans('ab-cd-ab', ['cd', 'ab']).spans).toEqual([
      { start: 3, end: 5 },
      { start: 6, end: 8 },
    ])
  })

  it('falls back to the start when a piece only appears earlier', () => {
    expect(texts('甲乙丙', ['丙', '甲'])).toEqual({
      texts: ['甲', '丙'],
      status: 'exact',
    })
  })

  it('splits a piece around words left out', () => {
    expect(
      texts('以及訂閱我的方格子我們就下集再見囉掰掰', ['我們下集再見']),
    ).toEqual({ texts: ['我們', '下集再見'], status: 'approx' })
  })

  it('skips characters that match nowhere', () => {
    expect(texts('不過我們姑且相信它一個人', ['我們故且相信它'])).toEqual({
      texts: ['我們', '且相信它'],
      status: 'approx',
    })
  })

  it('handles approximate and exact pieces together', () => {
    expect(
      texts('那我們打完AZ疫苗要注意什麼事情呢', ['打完疫苗', '要注意']),
    ).toEqual({ texts: ['打完', '疫苗要注意'], status: 'approx' })
  })

  it('reports no match', () => {
    expect(matchSpans('完全無關的文字', ['蘋果'])).toEqual({
      spans: [],
      status: 'none',
    })
  })

  it('does not match single characters of a longer piece', () => {
    expect(matchSpans('甲乙', ['甲丙']).status).toBe('none')
  })
})
