import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useMatch, useNavigate } from 'react-router'
import type { DocumentSummary, TagWithCount } from './api'
import { api } from './api'
import { UploadButton } from './components/UploadButton'
import type { LayoutContext } from './layout'

function App() {
  const navigate = useNavigate()
  const match = useMatch('/documents/:id/*')
  const routeDocumentId = match ? Number(match.params.id) : null

  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null)
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [error, setError] = useState<string | null>(null)
  // Remembered so "all annotations" can still link back to the last document
  const [lastDocumentId, setLastDocumentId] = useState<number | null>(null)
  if (routeDocumentId !== null && routeDocumentId !== lastDocumentId) {
    setLastDocumentId(routeDocumentId)
  }
  const currentDocumentId = routeDocumentId ?? lastDocumentId

  const showError = (err: unknown) =>
    setError(err instanceof Error ? err.message : String(err))

  const refreshDocuments = useCallback(
    () => api.listDocuments().then(setDocuments, showError),
    [],
  )
  const refreshTags = useCallback(
    () => api.listTags().then(setTags, showError),
    [],
  )

  useEffect(() => {
    api.listDocuments().then(setDocuments, showError)
    api.listTags().then(setTags, showError)
  }, [])

  const context: LayoutContext = {
    documents,
    tags,
    currentDocumentId,
    refreshDocuments,
    refreshTags,
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Corpus Analysis</h1>
        <label className="document-picker">
          <span>文件</span>
          <select
            value={currentDocumentId ?? ''}
            onChange={(e) => navigate(`/documents/${e.target.value}`)}
            disabled={!documents?.length}
          >
            {currentDocumentId === null && (
              <option value="" disabled>
                {documents?.length ? '選擇文件' : '還沒有文件'}
              </option>
            )}
            {documents?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </label>
        <UploadButton
          onUploaded={async (doc) => {
            await refreshDocuments()
            navigate(`/documents/${doc.id}`)
          }}
        />
      </header>

      <nav className="tabs" aria-label="功能">
        {currentDocumentId !== null ? (
          <NavLink to={`/documents/${currentDocumentId}`} end>
            全文
          </NavLink>
        ) : (
          <span className="tab-disabled">全文</span>
        )}
        <NavLink
          to={
            currentDocumentId !== null && routeDocumentId !== null
              ? `/documents/${currentDocumentId}/annotations`
              : '/annotations'
          }
          className={({ isActive }) =>
            isActive || match?.params['*'] === 'annotations' ? 'active' : ''
          }
        >
          標註
        </NavLink>
      </nav>

      {error && (
        <p className="error page-error" role="alert">
          {error}
        </p>
      )}
      <main className="app-main">
        <Outlet context={context} />
      </main>
    </div>
  )
}

export default App
