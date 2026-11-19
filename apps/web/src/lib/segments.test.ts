import { describe, expect, it } from 'vitest'
import { addRange, buildSegments, trimRange } from './segments'

describe('buildSegments', () => {
  it('returns a single segment when there are no ranges', () => {
    expect(buildSegments(5, [])).toEqual([{ start: 0, end: 5, keys: [] }])
  })

  it('splits around a range', () => {
    expect(buildSegments(10, [{ start: 2, end: 4, key: 'a' }])).toEqual([
      { start: 0, end: 2, keys: [] },
      { start: 2, end: 4, keys: ['a'] },
      { start: 4, end: 10, keys: [] },
    ])
  })

  it('handles overlapping ranges', () => {
    expect(
      buildSegments(6, [
        { start: 1, end: 4, key: 'a' },
        { start: 3, end: 6, key: 'b' },
      ]),
    ).toEqual([
      { start: 0, end: 1, keys: [] },
      { start: 1, end: 3, keys: ['a'] },
      { start: 3, end: 4, keys: ['a', 'b'] },
      { start: 4, end: 6, keys: ['b'] },
    ])
  })

  it('handles nested and identical ranges', () => {
    expect(
      buildSegments(4, [
        { start: 0, end: 4, key: 'outer' },
        { start: 1, end: 2, key: 'inner' },
        { start: 1, end: 2, key: 'same' },
      ]),
    ).toEqual([
      { start: 0, end: 1, keys: ['outer'] },
      { start: 1, end: 2, keys: ['outer', 'inner', 'same'] },
      { start: 2, end: 4, keys: ['outer'] },
    ])
  })

  it('clamps out-of-bounds ranges and drops empty ones', () => {
    expect(
      buildSegments(3, [
        { start: -1, end: 2, key: 'a' },
        { start: 2, end: 2, key: 'empty' },
        { start: 2, end: 9, key: 'b' },
      ]),
    ).toEqual([
      { start: 0, end: 2, keys: ['a'] },
      { start: 2, end: 3, keys: ['b'] },
    ])
  })

  it('returns no segments for empty text', () => {
    expect(buildSegments(0, [])).toEqual([])
  })
})

describe('trimRange', () => {
  it('removes surrounding whitespace', () => {
    expect(trimRange(' \n天氣 \n', { start: 0, end: 6 })).toEqual({
      start: 2,
      end: 4,
    })
  })

  it('returns null for whitespace-only ranges', () => {
    expect(trimRange('a  b', { start: 1, end: 3 })).toBeNull()
  })
})

describe('addRange', () => {
  it('inserts a separate range in order', () => {
    expect(
      addRange(
        [
          { start: 0, end: 2 },
          { start: 8, end: 9 },
        ],
        { start: 4, end: 6 },
      ),
    ).toEqual([
      { start: 0, end: 2 },
      { start: 4, end: 6 },
      { start: 8, end: 9 },
    ])
  })

  it('merges overlapping and touching ranges', () => {
    expect(
      addRange(
        [
          { start: 0, end: 2 },
          { start: 3, end: 5 },
          { start: 7, end: 9 },
          { start: 12, end: 14 },
        ],
        { start: 4, end: 7 },
      ),
    ).toEqual([
      { start: 0, end: 2 },
      { start: 3, end: 9 },
      { start: 12, end: 14 },
    ])
  })

  it('absorbs ranges it covers', () => {
    expect(addRange([{ start: 2, end: 3 }], { start: 1, end: 5 })).toEqual([
      { start: 1, end: 5 },
    ])
  })
})
