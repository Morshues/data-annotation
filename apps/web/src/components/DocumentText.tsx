import { useMemo, useRef } from 'react'
import type { Annotation } from '../api'
import type { KeyedRange, Range } from '../lib/segments'
import { buildSegments, trimRange } from '../lib/segments'
import { getSelectionRange } from '../lib/selection'

const CONTEXT_KEY = 'context'

type Key = number | typeof CONTEXT_KEY

type Props = {
  content: string
  annotations: Annotation[]
  pendingContext: Range | null
  activeIds: number[]
  onSelectContext: (range: Range) => void
  onClickAnnotations: (ids: number[]) => void
}

// Renders the full text with annotation highlights. Dragging selects a context
// range; clicking a highlight reports the annotations under the cursor.
export function DocumentText({
  content,
  annotations,
  pendingContext,
  activeIds,
  onSelectContext,
  onClickAnnotations,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const segments = useMemo(() => {
    const ranges: KeyedRange<Key>[] = annotations.flatMap((a) =>
      a.spans
        .filter((s) => s.docStart !== null && s.docEnd !== null)
        .map((s) => ({ start: s.docStart!, end: s.docEnd!, key: a.id })),
    )
    if (pendingContext) ranges.push({ ...pendingContext, key: CONTEXT_KEY })
    return buildSegments(content.length, ranges)
  }, [content, annotations, pendingContext])

  function handleMouseUp(e: React.MouseEvent) {
    if (!ref.current) return
    const range = getSelectionRange(ref.current)
    if (range) {
      const trimmed = trimRange(content, range)
      if (trimmed) onSelectContext(trimmed)
      window.getSelection()?.removeAllRanges()
      return
    }
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-ids]')
    if (target?.dataset.ids) {
      onClickAnnotations(target.dataset.ids.split(',').map(Number))
    }
  }

  return (
    <div ref={ref} className="document-text" onMouseUp={handleMouseUp}>
      {segments.map((seg) => {
        const text = content.slice(seg.start, seg.end)
        const ids = seg.keys.filter((k): k is number => k !== CONTEXT_KEY)
        const inContext = seg.keys.includes(CONTEXT_KEY)
        if (ids.length === 0 && !inContext) return text

        const classes = []
        if (ids.length > 0) {
          classes.push('annotated', `depth-${Math.min(ids.length, 3)}`)
          if (ids.some((id) => activeIds.includes(id))) classes.push('active')
        }
        if (inContext) classes.push('pending-context')
        return (
          <span
            key={seg.start}
            className={classes.join(' ')}
            data-ids={ids.length > 0 ? ids.join(',') : undefined}
          >
            {text}
          </span>
        )
      })}
    </div>
  )
}
