import { useRef } from 'react'
import type { Range } from '../lib/segments'
import { trimRange } from '../lib/segments'
import { getSelectionRange } from '../lib/selection'

type Props = {
  context: string
  focus: Range | null
  // When given, the user can select the focus inside the context
  onSelectFocus?: (range: Range) => void
}

// Shows an annotation's context with its focus text emphasized.
export function ContextText({ context, focus, onSelectFocus }: Props) {
  const ref = useRef<HTMLDivElement>(null)

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
      {focus ? (
        <>
          {context.slice(0, focus.start)}
          <mark className="focus">{context.slice(focus.start, focus.end)}</mark>
          {context.slice(focus.end)}
        </>
      ) : (
        context
      )}
    </div>
  )
}
