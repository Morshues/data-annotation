import { useState } from 'react'
import { Link } from 'react-router'
import type { TagChanges, TagGroup, TagGroupFields, TagWithCount } from '../api'
import { api } from '../api'
import { projectPath, useLayout } from '../layout'
import { groupTags } from '../lib/tag-groups'
import { useSubmit } from '../lib/use-submit'

export function TagsPage() {
  const { projectId, tags, tagGroups, refreshTags } = useLayout()
  const [editingTagId, setEditingTagId] = useState<number | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)

  const sections = groupTags(tags, tagGroups, true)
  // Always offer the ungrouped section so tags can be added there
  if (sections.at(-1)?.group !== null) sections.push({ group: null, tags: [] })

  return (
    <section className="tags-pane" aria-label="標籤列表">
      <GroupForm
        title="新增群組"
        submitLabel="建立"
        onSubmit={async (fields) => {
          await api.createTagGroup(projectId, fields)
          await refreshTags()
        }}
      />

      {tags.length === 0 && tagGroups.length === 0 ? (
        <div className="empty-panel">
          <h2>還沒有任何標籤</h2>
          <p>
            可以在下面新增標籤，或是在全文建立標註時加上標籤。用群組把同類的標籤放在一起，例如「詞性」底下有「主詞」「受詞」。
          </p>
        </div>
      ) : (
        <p className="muted">
          共 {tags.length} 個標籤、{tagGroups.length} 個群組
        </p>
      )}

      {sections.map(({ group, tags: groupTagList }) => (
        <section key={group?.id ?? 'ungrouped'} className="tag-group">
          {group === null ? (
            <h2 className="tag-group-name">未分組</h2>
          ) : editingGroupId === group.id ? (
            <GroupForm
              title="編輯群組"
              submitLabel="儲存"
              initial={group}
              onSubmit={async (fields) => {
                await api.updateTagGroup(projectId, group.id, fields)
                setEditingGroupId(null)
                await refreshTags()
              }}
              onCancel={() => setEditingGroupId(null)}
            />
          ) : (
            <GroupHeader
              group={group}
              onEdit={() => setEditingGroupId(group.id)}
              onDelete={async () => {
                const message = `刪除群組「${group.name}」？裡面的 ${groupTagList.length} 個標籤會變成未分組。`
                if (!confirm(message)) return
                await api.deleteTagGroup(projectId, group.id)
                await refreshTags()
              }}
            />
          )}

          {groupTagList.length > 0 && (
            <ul className="annotation-list">
              {groupTagList.map((tag) => (
                <li key={tag.id} className="annotation-card">
                  <TagRow
                    tag={tag}
                    groups={tagGroups}
                    annotationsPath={projectPath(
                      projectId,
                      `/annotations?tags=${tag.id}`,
                    )}
                    editing={editingTagId === tag.id}
                    onEdit={() => setEditingTagId(tag.id)}
                    onClose={() => setEditingTagId(null)}
                    onSave={async (changes) => {
                      await api.updateTag(projectId, tag.id, changes)
                      setEditingTagId(null)
                      await refreshTags()
                    }}
                  />
                </li>
              ))}
            </ul>
          )}

          <NewTagInput
            onCreate={async (name) => {
              await api.createTag(projectId, {
                name,
                groupId: group?.id ?? null,
              })
              await refreshTags()
            }}
          />
        </section>
      ))}
    </section>
  )
}

function GroupHeader({
  group,
  onEdit,
  onDelete,
}: {
  group: TagGroup
  onEdit: () => void
  onDelete: () => Promise<void>
}) {
  const { busy, error, submit } = useSubmit<void>(onDelete)

  return (
    <div className="tag-group-header">
      <div className="card-meta">
        <h2 className="tag-group-name">{group.name}</h2>
        <span className="actions">
          <button type="button" className="link" onClick={onEdit}>
            編輯
          </button>
          <button
            type="button"
            className="link danger"
            disabled={busy}
            onClick={() => submit()}
          >
            刪除
          </button>
        </span>
      </div>
      {group.description && (
        <p className="tag-description">{group.description}</p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

function GroupForm({
  title,
  submitLabel,
  initial,
  onSubmit,
  onCancel,
}: {
  title: string
  submitLabel: string
  initial?: TagGroupFields
  onSubmit: (fields: TagGroupFields) => Promise<void>
  onCancel?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const { busy, error, submit } = useSubmit(async (fields: TagGroupFields) => {
    await onSubmit(fields)
    // The edit form unmounts after saving; the create form starts over
    if (!initial) {
      setName('')
      setDescription('')
    }
  })

  return (
    <form
      className="annotation-card"
      onSubmit={(e) => {
        e.preventDefault()
        void submit({ name, description })
      }}
    >
      <h2>{title}</h2>
      <label className="field">
        <span>名稱</span>
        <input
          type="text"
          value={name}
          maxLength={100}
          placeholder="例如：詞性"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="field">
        <span>描述（選填）</span>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button
          type="submit"
          className="primary"
          disabled={busy || !name.trim()}
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" disabled={busy} onClick={onCancel}>
            取消
          </button>
        )}
      </div>
    </form>
  )
}

function NewTagInput({
  onCreate,
}: {
  onCreate: (name: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const { busy, error, submit } = useSubmit(async (value: string) => {
    await onCreate(value)
    setName('')
  })

  return (
    <form
      className="new-tag"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) void submit(name.trim())
      }}
    >
      <input
        type="text"
        value={name}
        maxLength={100}
        placeholder="新增標籤，按 Enter 建立"
        aria-label="新增標籤"
        disabled={busy}
        onChange={(e) => setName(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
    </form>
  )
}

type RowProps = {
  tag: TagWithCount
  groups: TagGroup[]
  annotationsPath: string
  editing: boolean
  onEdit: () => void
  onClose: () => void
  onSave: (changes: TagChanges) => Promise<void>
}

function TagRow({
  tag,
  groups,
  annotationsPath,
  editing,
  onEdit,
  onClose,
  onSave,
}: RowProps) {
  const [description, setDescription] = useState(tag.description)
  const [groupId, setGroupId] = useState(tag.groupId)
  const { busy, error, submit } = useSubmit(onSave)

  return (
    <>
      <div className="card-meta">
        <span>
          <span className="tag">{tag.name}</span>{' '}
          <Link to={annotationsPath}>{tag.annotationCount} 個標註</Link>
        </span>
        {!editing && (
          <button
            type="button"
            className="link"
            onClick={() => {
              setDescription(tag.description)
              setGroupId(tag.groupId)
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
            <span>群組</span>
            <select
              value={groupId ?? ''}
              onChange={(e) =>
                setGroupId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">未分組</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
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
              disabled={busy}
              onClick={() => submit({ description, groupId })}
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
