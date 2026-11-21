import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useMatch, useNavigate, useParams } from 'react-router'
import type { DocumentSummary, TagGroup, TagWithCount } from './api'
import { api } from './api'
import { ImportButton } from './components/ImportButton'
import type { LayoutContext } from './layout'
import { projectPath } from './layout'

export function ProjectLayout() {
  const projectId = Number(useParams().projectId)
  // Remount per project so no state leaks from one project to another
  return <ProjectView key={projectId} projectId={projectId} />
}

function ProjectView({ projectId }: { projectId: number }) {
  const navigate = useNavigate()
  const match = useMatch('/projects/:projectId/documents/:id/*')
  const routeDocumentId = match ? Number(match.params.id) : null

  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null)
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([])
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
    () => api.listDocuments(projectId).then(setDocuments, showError),
    [projectId],
  )
  const refreshTags = useCallback(
    () =>
      Promise.all([api.listTags(projectId), api.listTagGroups(projectId)]).then(
        ([tags, groups]) => {
          setTags(tags)
          setTagGroups(groups)
        },
        showError,
      ),
    [projectId],
  )

  useEffect(() => {
    api.listDocuments(projectId).then(setDocuments, showError)
    void refreshTags()
  }, [projectId, refreshTags])

  const context: LayoutContext = {
    projectId,
    documents,
    tags,
    tagGroups,
    currentDocumentId,
    refreshDocuments,
    refreshTags,
  }

  return (
    <>
      <div className="project-bar">
        <nav className="tabs" aria-label="功能">
          {currentDocumentId !== null ? (
            <NavLink
              to={projectPath(projectId, `/documents/${currentDocumentId}`)}
              end
            >
              全文
            </NavLink>
          ) : (
            <span className="tab-disabled">全文</span>
          )}
          <NavLink
            to={projectPath(
              projectId,
              currentDocumentId !== null && routeDocumentId !== null
                ? `/documents/${currentDocumentId}/annotations`
                : '/annotations',
            )}
            className={({ isActive }) =>
              isActive || match?.params['*'] === 'annotations' ? 'active' : ''
            }
          >
            標註
          </NavLink>
          <NavLink to={projectPath(projectId, '/tags')}>標籤</NavLink>
        </nav>
        <div className="project-actions">
          <label className="picker">
            <span>文件</span>
            <select
              value={currentDocumentId ?? ''}
              onChange={(e) =>
                navigate(projectPath(projectId, `/documents/${e.target.value}`))
              }
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
          <ImportButton
            projectId={projectId}
            onImported={async (doc) => {
              await refreshDocuments()
              navigate(projectPath(projectId, `/documents/${doc.id}`))
            }}
            onDocumentsChanged={refreshDocuments}
          />
        </div>
      </div>

      {error && (
        <p className="error page-error" role="alert">
          {error}
        </p>
      )}
      <main className="app-main">
        <Outlet context={context} />
      </main>
    </>
  )
}
