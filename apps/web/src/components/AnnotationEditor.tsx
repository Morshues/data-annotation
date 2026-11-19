import { useState } from 'react'
import type { Annotation, AnnotationChanges, Tag } from '../api'
import { SpanPicker } from './SpanPicker'
import { TagInput } from './TagInput'

type Props = {
  annotation: Annotation
  tagSuggestions: Tag[]
  onSave: (changes: AnnotationChanges) => Promise<void>
  onDelete: () => Promise<void>
  onClose?: () => void
}

// Edits the spans, tags and description of an existing annotation. The
// context itself cannot change.
export function AnnotationEditor({
  annotation,
  tagSuggestions,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [spans, setSpans] = useState(
    annotation.spans.map(({ start, end }) => ({ start, end })),
  )
  const [tags, setTags] = useState(annotation.tags.map((t) => t.name))
  const [description, setDescription] = useState(annotation.description)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="editor">
      <SpanPicker
        context={annotation.context}
        spans={spans}
        onChange={setSpans}
      />
      <label className="field">
        <span>標籤</span>
        <TagInput
          value={tags}
          suggestions={tagSuggestions}
          onChange={setTags}
        />
      </label>
      <label className="field">
        <span>描述</span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={busy || spans.length === 0}
          onClick={() => run(() => onSave({ spans, tags, description }))}
        >
          儲存變更
        </button>
        {onClose && (
          <button type="button" disabled={busy} onClick={onClose}>
            關閉
          </button>
        )}
        <button
          type="button"
          className="danger"
          disabled={busy}
          onClick={() => {
            const text = annotation.spans.map((s) => s.text).join('、')
            if (confirm(`確定要刪除「${text}」這個標註嗎？`)) {
              void run(onDelete)
            }
          }}
        >
          刪除標註
        </button>
      </div>
    </div>
  )
}
