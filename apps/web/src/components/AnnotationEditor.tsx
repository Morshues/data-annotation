import { useState } from 'react'
import type { Annotation, AnnotationChanges, Tag } from '../api'
import { ContextText } from './ContextText'
import { TagInput } from './TagInput'

type Props = {
  annotation: Annotation
  tagSuggestions: Tag[]
  onSave: (changes: AnnotationChanges) => Promise<void>
  onDelete: () => Promise<void>
  onClose?: () => void
}

// Edits the tags, description and note of an existing annotation.
export function AnnotationEditor({
  annotation,
  tagSuggestions,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [tags, setTags] = useState(annotation.tags.map((t) => t.name))
  const [description, setDescription] = useState(annotation.description)
  const [note, setNote] = useState(annotation.note)
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
      <ContextText
        context={annotation.context}
        focus={{ start: annotation.textStart, end: annotation.textEnd }}
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
      <label className="field">
        <span>備註</span>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => run(() => onSave({ tags, description, note }))}
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
            if (confirm(`確定要刪除「${annotation.text}」這個標註嗎？`)) {
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
