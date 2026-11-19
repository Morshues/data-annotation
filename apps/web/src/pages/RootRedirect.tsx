import { Navigate } from 'react-router'
import { lastProjectId, projectPath, useRoot } from '../layout'

// Opens the last used project, falling back to the first one, or the project
// list when there is none yet.
export function RootRedirect() {
  const { projects } = useRoot()

  if (projects === null) return <p className="muted app-main">載入中…</p>
  if (projects.length === 0) return <Navigate to="/projects" replace />

  const lastId = lastProjectId()
  const project = projects.find((p) => p.id === lastId) ?? projects[0]
  return <Navigate to={projectPath(project.id)} replace />
}
