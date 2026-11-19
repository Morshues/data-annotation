import { useState } from 'react'
import type { Tag } from '../api'
import type { Range } from '../lib/segments'
import { ContextText } from './ContextText'
import { TagInput } from './TagInput'

export type NewAnnotationInput = {
  focus: Range
  tags: string[]
  description: string
}

type Props = {
  context: string
  tagSuggestions: Tag[]
  onSubmit: (input: NewAnnotationInput) => Promise<void>
  onCancel: () => void
}

// Step 2 of annotating: pick the focus inside the selected context and fill in
// the annotation data. The parent remounts this form when the context changes.
export function NewAnnotationForm({
  context,
  tagSuggestions,
  onSubmit,
  onCancel,
}: Props) {
  const [focus, setFocus] = useState<Range | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!focus) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit({ focus, tags, description })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className="editor">
      <h2>新增標註</h2>
      <p className="hint">
        {focus
          ? '已選好重點。要換的話，在下面重新拖選。'
          : '在下面的上下文中拖選要標註的重點。'}
      </p>
      <ContextText context={context} focus={focus} onSelectFocus={setFocus} />
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
          disabled={!focus || busy}
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
