import { useMemo, useRef } from 'react'
import type { Range } from '../lib/segments'
import { buildSegments, trimRange } from '../lib/segments'
import { getSelectionRange } from '../lib/selection'

type Props = {
  context: string
  spans: Range[]
  // When given, the user can select ranges inside the context
  onSelectFocus?: (range: Range) => void
}

// Shows an annotation's context with its spans emphasized.
export function ContextText({ context, spans, onSelectFocus }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const segments = useMemo(
    () =>
      buildSegments(
        context.length,
        spans.map((span) => ({ ...span, key: true })),
      ),
    [context, spans],
  )

  function handleMouseUp() {
    if (!onSelectFocus || !ref.current) return
    const range = getSelectionRange(ref.current)
    const trimmed = range && trimRange(context, range)
    if (trimmed) {
      onSelectFocus(trimmed)
      window.getSelection()?.removeAllRanges()
    }
  }

  return (
    <div
      ref={ref}
      className={`context-text${onSelectFocus ? ' selectable' : ''}`}
      onMouseUp={handleMouseUp}
    >
      {segments.map((seg) => {
        const text = context.slice(seg.start, seg.end)
        return seg.keys.length > 0 ? (
          <mark key={seg.start} className="focus">
            {text}
          </mark>
        ) : (
          text
        )
      })}
    </div>
  )
}
