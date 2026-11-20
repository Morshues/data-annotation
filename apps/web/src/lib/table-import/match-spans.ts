import type { Range } from '../segments'
import { addRange } from '../segments'

export type MatchStatus = 'exact' | 'approx' | 'none'

// Finds the annotated pieces inside the context. Each piece is searched from
// where the previous one ended, then from the start. When a piece is not in
// the context verbatim (words left out, typos), it is split into the longest
// runs that are, skipping characters that match nowhere.
export function matchSpans(
  context: string,
  pieces: string[],
): { spans: Range[]; status: MatchStatus } {
  const exact = matchExact(context, pieces)
  if (exact) return { spans: exact, status: 'exact' }

  const spans = matchApprox(context, pieces)
  return { spans, status: spans.length > 0 ? 'approx' : 'none' }
}

function find(context: string, text: string, from: number): number {
  const index = context.indexOf(text, from)
  return index >= 0 ? index : context.indexOf(text)
}

function matchExact(context: string, pieces: string[]): Range[] | null {
  let spans: Range[] = []
  let cursor = 0
  for (const piece of pieces) {
    const start = find(context, piece, cursor)
    if (start < 0) return null
    cursor = start + piece.length
    spans = addRange(spans, { start, end: cursor })
  }
  return spans.length > 0 ? spans : null
}

function matchApprox(context: string, pieces: string[]): Range[] {
  let spans: Range[] = []
  let cursor = 0
  for (const piece of pieces) {
    // Single characters only count when they are the whole piece
    const minLength = Math.min(2, piece.length)
    let i = 0
    while (i < piece.length) {
      let matched = false
      for (let length = piece.length - i; length >= minLength; length--) {
        const start = find(context, piece.slice(i, i + length), cursor)
        if (start >= 0) {
          cursor = start + length
          spans = addRange(spans, { start, end: cursor })
          i += length
          matched = true
          break
        }
      }
      if (!matched) i++
    }
  }
  return spans
}
