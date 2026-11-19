import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import type { AnnotationPage } from '../api'
import { api } from '../api'
import { projectPath, useLayout } from '../layout'
import { AnnotationEditor } from '../components/AnnotationEditor'
import { ContextText } from '../components/ContextText'
import { groupTags } from '../lib/tag-groups'

export function AnnotationsPage() {
  const params = useParams()
  const documentId = params.id ? Number(params.id) : undefined
  const {
    projectId,
    tags,
    tagGroups,
    documents,
    currentDocumentId,
    refreshTags,
    refreshDocuments,
  } = useLayout()

  const [searchParams, setSearchParams] = useSearchParams()
  const selectedTags = (searchParams.get('tags') ?? '')
    .split(',')
    .filter(Boolean)
    .map(Number)
  const tagMode = searchParams.get('mode') === 'and' ? 'and' : 'or'
  const q = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? 1) || 1

  const [keyword, setKeyword] = useState(q)
  const [result, setResult] = useState<AnnotationPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  function updateParams(changes: Record<string, string | null>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        if (!('page' in changes)) next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  // Debounce the keyword before it goes into the URL and triggers a search
  useEffect(() => {
    if (keyword.trim() === q) return
    const timer = setTimeout(() => updateParams({ q: keyword.trim() }), 300)
    return () => clearTimeout(timer)
  })

  // Bumped after edits to fetch the current page again
  const [reloadToken, setReloadToken] = useState(0)
  const reload = () => setReloadToken((t) => t + 1)

  const tagsKey = selectedTags.join(',')
  useEffect(() => {
    let ignore = false
    api
      .listAnnotations(projectId, {
        tags: tagsKey ? tagsKey.split(',').map(Number) : [],
        tagMode,
        q,
        documentId,
        page,
      })
      .then(
        (data) => {
          if (ignore) return
          setResult(data)
          setError(null)
        },
        (err: unknown) => {
          if (!ignore)
            setError(err instanceof Error ? err.message : String(err))
        },
      )
    return () => {
      ignore = true
    }
  }, [projectId, tagsKey, tagMode, q, documentId, page, reloadToken])

  function setSelectedTags(ids: number[]) {
    updateParams({ tags: ids.join(',') })
  }

  function toggleTag(id: number) {
    setSelectedTags(
      selectedTags.includes(id)
        ? selectedTags.filter((t) => t !== id)
        : [...selectedTags, id],
    )
  }

  // Selects every tag of a group, or clears them when all are selected
  function toggleGroup(ids: number[]) {
    const allSelected = ids.every((id) => selectedTags.includes(id))
    setSelectedTags(
      allSelected
        ? selectedTags.filter((id) => !ids.includes(id))
        : [...new Set([...selectedTags, ...ids])],
    )
  }

  const usedTags = tags.filter((t) => t.annotationCount > 0)
  const tagSections = groupTags(usedTags, tagGroups)
  const currentDocument = documents?.find((d) => d.id === currentDocumentId)
  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0
  const query = searchParams.toString()

  return (
    <div className="annotations-layout">
      <aside className="filter-pane" aria-label="篩選">
        <label className="field">
          <span>關鍵字</span>
          <input
            type="search"
            value={keyword}
            placeholder="搜尋標註、上下文、描述"
            onChange={(e) => setKeyword(e.target.value)}
          />
        </label>

        <div className="field">
          <span>標籤</span>
          <div
            className="segmented"
            role="radiogroup"
            aria-label="標籤篩選方式"
          >
            <button
              type="button"
              role="radio"
              aria-checked={tagMode === 'or'}
              onClick={() => updateParams({ mode: null })}
            >
              任一（OR）
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={tagMode === 'and'}
              onClick={() => updateParams({ mode: 'and' })}
            >
              全部（AND）
            </button>
          </div>
          {usedTags.length === 0 ? (
            <p className="muted">還沒有任何標籤。</p>
          ) : (
            tagSections.map(({ group, tags: sectionTags }) => {
              const ids = sectionTags.map((t) => t.id)
              const allSelected = ids.every((id) => selectedTags.includes(id))
              return (
                <div
                  key={group?.id ?? 'ungrouped'}
                  className="tag-filter-group"
                >
                  {/* With no groups at all, a lone "ungrouped" heading is noise */}
                  {tagGroups.length > 0 && (
                    <div className="tag-filter-heading">
                      <span title={group?.description || undefined}>
                        {group?.name ?? '未分組'}
                      </span>
                      {group && (
                        <button
                          type="button"
                          className="link"
                          onClick={() => toggleGroup(ids)}
                        >
                          {allSelected ? '取消' : '全選'}
                        </button>
                      )}
                    </div>
                  )}
                  <ul className="tag-filter">
                    {sectionTags.map((t) => (
                      <li key={t.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(t.id)}
                            onChange={() => toggleTag(t.id)}
                          />
                          <span
                            className="tag-filter-name"
                            title={t.description || undefined}
                          >
                            {t.name}
                          </span>
                          <span className="count">{t.annotationCount}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })
          )}
          {selectedTags.length > 0 && (
            <button
              type="button"
              className="link"
              onClick={() => updateParams({ tags: null })}
            >
              清除標籤篩選
            </button>
          )}
        </div>
      </aside>

      <section className="results-pane" aria-label="標註列表">
        <div className="results-header">
          <div className="segmented" role="radiogroup" aria-label="範圍">
            {currentDocumentId !== null ? (
              <Link
                role="radio"
                aria-checked={documentId !== undefined}
                to={projectPath(
                  projectId,
                  `/documents/${currentDocumentId}/annotations?${query}`,
                )}
              >
                目前文件{currentDocument && `：${currentDocument.title}`}
              </Link>
            ) : null}
            <Link
              role="radio"
              aria-checked={documentId === undefined}
              to={projectPath(projectId, `/annotations?${query}`)}
            >
              全部文件
            </Link>
          </div>
          {result && <span className="muted">共 {result.total} 筆</span>}
        </div>

        {error && <p className="error">{error}</p>}
        {!result && !error && <p className="muted">載入中…</p>}
        {result?.items.length === 0 && (
          <p className="muted">沒有符合條件的標註。</p>
        )}

        <ul className="annotation-list">
          {result?.items.map((a) => (
            <li key={a.id} className="annotation-card">
              {editingId === a.id ? (
                <AnnotationEditor
                  key={a.updatedAt}
                  annotation={a}
                  tagSuggestions={tags}
                  onSave={async (changes) => {
                    await api.updateAnnotation(projectId, a.id, changes)
                    setEditingId(null)
                    reload()
                    await refreshTags()
                  }}
                  onDelete={async () => {
                    await api.deleteAnnotation(projectId, a.id)
                    setEditingId(null)
                    reload()
                    await Promise.all([refreshTags(), refreshDocuments()])
                  }}
                  onClose={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="card-meta">
                    {a.document ? (
                      <Link
                        to={projectPath(
                          projectId,
                          `/documents/${a.document.id}`,
                        )}
                      >
                        {a.document.title}
                      </Link>
                    ) : (
                      <span className="muted">無對應全文</span>
                    )}
                    <button
                      type="button"
                      className="link"
                      onClick={() => setEditingId(a.id)}
                    >
                      編輯
                    </button>
                  </div>
                  <ContextText context={a.context} spans={a.spans} />
                  {a.tags.length > 0 && (
                    <div className="tags">
                      {a.tags.map((t) => (
                        <span
                          key={t.id}
                          className="tag"
                          title={t.description || undefined}
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {a.description && (
                    <p className="card-field">
                      <span>描述</span>
                      {a.description}
                    </p>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              上一頁
            </button>
            <span>
              第 {page} / {totalPages} 頁
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              下一頁
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
