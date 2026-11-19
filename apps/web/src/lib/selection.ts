import type { Range } from './segments'

// Character offset of a DOM position, counted from the start of the container's
// text. The container must render its text verbatim (no extra text nodes).
function offsetWithin(container: Node, node: Node, offset: number): number {
  const range = document.createRange()
  range.selectNodeContents(container)
  range.setEnd(node, offset)
  return range.toString().length
}

// Returns the current selection as offsets in the container's text, clipped to
// the container. Returns null when nothing inside the container is selected.
export function getSelectionRange(container: HTMLElement): Range | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null
  }
  const domRange = selection.getRangeAt(0)
  if (!domRange.intersectsNode(container)) return null

  const length = container.textContent?.length ?? 0
  const start = container.contains(domRange.startContainer)
    ? offsetWithin(container, domRange.startContainer, domRange.startOffset)
    : 0
  const end = container.contains(domRange.endContainer)
    ? offsetWithin(container, domRange.endContainer, domRange.endOffset)
    : length
  return start < end ? { start, end } : null
}
