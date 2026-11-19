import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import type { AnnotationPage } from '../api'
import { api } from '../api'
import { useLayout } from '../layout'
import { AnnotationEditor } from '../components/AnnotationEditor'
import { ContextText } from '../components/ContextText'

export function AnnotationsPage() {
  const params = useParams()
  const documentId = params.id ? Number(params.id) : undefined
  const { tags, documents, currentDocumentId, refreshTags, refreshDocuments } =
    useLayout()

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
      .listAnnotations({
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
  }, [tagsKey, tagMode, q, documentId, page, reloadToken])

  function toggleTag(id: number) {
    const next = selectedTags.includes(id)
      ? selectedTags.filter((t) => t !== id)
      : [...selectedTags, id]
    updateParams({ tags: next.join(',') })
  }

  const usedTags = tags.filter((t) => t.annotationCount > 0)
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
            placeholder="搜尋標註、上下文、描述、備註"
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
            <ul className="tag-filter">
              {usedTags.map((t) => (
                <li key={t.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(t.id)}
                      onChange={() => toggleTag(t.id)}
                    />
                    <span className="tag-filter-name">{t.name}</span>
                    <span className="count">{t.annotationCount}</span>
                  </label>
                </li>
              ))}
            </ul>
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
                to={`/documents/${currentDocumentId}/annotations?${query}`}
              >
                目前文件{currentDocument && `：${currentDocument.title}`}
              </Link>
            ) : null}
            <Link
              role="radio"
              aria-checked={documentId === undefined}
              to={`/annotations?${query}`}
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
                    await api.updateAnnotation(a.id, changes)
                    setEditingId(null)
                    reload()
                    await refreshTags()
                  }}
                  onDelete={async () => {
                    await api.deleteAnnotation(a.id)
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
                      <Link to={`/documents/${a.document.id}`}>
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
                  <ContextText
                    context={a.context}
                    focus={{ start: a.textStart, end: a.textEnd }}
                  />
                  {a.tags.length > 0 && (
                    <div className="tags">
                      {a.tags.map((t) => (
                        <span key={t.id} className="tag">
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
                  {a.note && (
                    <p className="card-field">
                      <span>備註</span>
                      {a.note}
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
