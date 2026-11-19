import { useState } from 'react'
import type { Tag } from '../api'
import type { Range } from '../lib/segments'
import { SpanPicker } from './SpanPicker'
import { TagInput } from './TagInput'

export type NewAnnotationInput = {
  spans: Range[]
  tags: string[]
  description: string
}

type Props = {
  context: string
  tagSuggestions: Tag[]
  onSubmit: (input: NewAnnotationInput) => Promise<void>
  onCancel: () => void
}

// Step 2 of annotating: pick the spans inside the selected context and fill in
// the annotation data. The parent remounts this form when the context changes.
export function NewAnnotationForm({
  context,
  tagSuggestions,
  onSubmit,
  onCancel,
}: Props) {
  const [spans, setSpans] = useState<Range[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (spans.length === 0) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit({ spans, tags, description })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className="editor">
      <h2>新增標註</h2>
      <SpanPicker context={context} spans={spans} onChange={setSpans} />
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
          disabled={spans.length === 0 || busy}
          onClick={submit}
        >
          儲存標註
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  )
}
