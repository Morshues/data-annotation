export type Range = {
  start: number
  end: number
}

export type KeyedRange<K> = Range & { key: K }

export type Segment<K> = Range & {
  keys: K[]
}

// Splits [0, length) at every range boundary so each segment is covered by
// the same set of ranges. Ranges may overlap.
export function buildSegments<K>(
  length: number,
  ranges: KeyedRange<K>[],
): Segment<K>[] {
  const valid = ranges
    .map((r) => ({
      ...r,
      start: Math.max(0, r.start),
      end: Math.min(length, r.end),
    }))
    .filter((r) => r.start < r.end)

  const boundaries = new Set([0, length])
  for (const r of valid) {
    boundaries.add(r.start)
    boundaries.add(r.end)
  }
  const points = [...boundaries].sort((a, b) => a - b)

  const segments: Segment<K>[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]
    const end = points[i + 1]
    const keys = valid
      .filter((r) => r.start <= start && end <= r.end)
      .map((r) => r.key)
    segments.push({ start, end, keys })
  }
  return segments
}

// Shrinks a range so it does not start or end with whitespace.
export function trimRange(text: string, range: Range): Range | null {
  let { start, end } = range
  while (start < end && /\s/.test(text[start])) start++
  while (end > start && /\s/.test(text[end - 1])) end--
  return start < end ? { start, end } : null
}
