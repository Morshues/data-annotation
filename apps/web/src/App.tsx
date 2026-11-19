import { useCallback, useEffect, useState } from 'react'
import { Outlet, useMatch, useNavigate } from 'react-router'
import type { Project } from './api'
import { api } from './api'
import type { RootContext } from './layout'
import { projectPath } from './layout'

const MANAGE_PROJECTS = 'manage'

function App() {
  const navigate = useNavigate()
  const match = useMatch('/projects/:projectId/*')
  const currentProjectId = match ? Number(match.params.projectId) : null

  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const showError = (err: unknown) =>
    setError(err instanceof Error ? err.message : String(err))

  const refreshProjects = useCallback(
    () => api.listProjects().then(setProjects, showError),
    [],
  )

  useEffect(() => {
    api.listProjects().then(setProjects, showError)
  }, [])

  const context: RootContext = { projects, refreshProjects }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Corpus Analysis</h1>
        <label className="picker">
          <span>專案</span>
          <select
            value={currentProjectId ?? MANAGE_PROJECTS}
            onChange={(e) =>
              navigate(
                e.target.value === MANAGE_PROJECTS
                  ? '/projects'
                  : projectPath(Number(e.target.value)),
              )
            }
          >
            {projects?.map((p) => (
              <option
                key={p.id}
                value={p.id}
                title={p.description || undefined}
              >
                {p.name}
              </option>
            ))}
            <option value={MANAGE_PROJECTS}>管理專案…</option>
          </select>
        </label>
      </header>

      {error && (
        <p className="error page-error" role="alert">
          {error}
        </p>
      )}
      <Outlet context={context} />
    </div>
  )
}

export default App
