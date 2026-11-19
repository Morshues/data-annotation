import type { Range } from '../lib/segments'
import { addRange } from '../lib/segments'
import { ContextText } from './ContextText'

type Props = {
  context: string
  spans: Range[]
  onChange: (spans: Range[]) => void
}

// Picks the annotated spans inside a context. Each drag adds a span, merging
// it with spans it overlaps; each chosen span can be removed again.
export function SpanPicker({ context, spans, onChange }: Props) {
  return (
    <>
      <p className="hint">
        {spans.length === 0
          ? '在上下文中拖選要標註的重點，可以選多段。'
          : '再拖選可以加入更多段。'}
      </p>
      <ContextText
        context={context}
        spans={spans}
        onSelectFocus={(range) => onChange(addRange(spans, range))}
      />
      {spans.length > 0 && (
        <ul className="span-list" aria-label="已選的重點">
          {spans.map((span) => {
            const text = context.slice(span.start, span.end)
            return (
              <li key={span.start} className="span-chip">
                <span>{text}</span>
                <button
                  type="button"
                  className="tag-remove"
                  aria-label={`移除「${text}」`}
                  onClick={() => onChange(spans.filter((s) => s !== span))}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
