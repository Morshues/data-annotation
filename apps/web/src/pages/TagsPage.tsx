import { useState } from 'react'
import { Link } from 'react-router'
import type { TagWithCount } from '../api'
import { api } from '../api'
import { useLayout } from '../layout'

export function TagsPage() {
  const { tags, refreshTags } = useLayout()
  const [editingId, setEditingId] = useState<number | null>(null)

  if (tags.length === 0) {
    return (
      <div className="empty-panel">
        <h2>還沒有任何標籤</h2>
        <p>在全文建立標註時加上標籤，就會出現在這裡。</p>
      </div>
    )
  }

  return (
    <section className="tags-pane" aria-label="標籤列表">
      <p className="muted">共 {tags.length} 個標籤</p>
      <ul className="annotation-list">
        {tags.map((tag) => (
          <li key={tag.id} className="annotation-card">
            <TagRow
              tag={tag}
              editing={editingId === tag.id}
              onEdit={() => setEditingId(tag.id)}
              onClose={() => setEditingId(null)}
              onSave={async (description) => {
                await api.updateTag(tag.id, { description })
                setEditingId(null)
                await refreshTags()
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

type RowProps = {
  tag: TagWithCount
  editing: boolean
  onEdit: () => void
  onClose: () => void
  onSave: (description: string) => Promise<void>
}

function TagRow({ tag, editing, onEdit, onClose, onSave }: RowProps) {
  const [description, setDescription] = useState(tag.description)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await onSave(description)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="card-meta">
        <span>
          <span className="tag">{tag.name}</span>{' '}
          <Link to={`/annotations?tags=${tag.id}`}>
            {tag.annotationCount} 個標註
          </Link>
        </span>
        {!editing && (
          <button
            type="button"
            className="link"
            onClick={() => {
              setDescription(tag.description)
              onEdit()
            }}
          >
            編輯
          </button>
        )}
      </div>
      {editing ? (
        <>
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
              disabled={busy}
              onClick={save}
            >
              儲存
            </button>
            <button type="button" disabled={busy} onClick={onClose}>
              取消
            </button>
          </div>
        </>
      ) : (
        <p className={`tag-description${tag.description ? '' : ' muted'}`}>
          {tag.description || '沒有描述'}
        </p>
      )}
    </>
  )
}
