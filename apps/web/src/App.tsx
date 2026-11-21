import { useCallback, useEffect, useState } from 'react'
import { Outlet, useMatch, useNavigate } from 'react-router'
import type { Project, User } from './api'
import { api, UNAUTHORIZED_EVENT } from './api'
import type { RootContext } from './layout'
import { projectPath } from './layout'
import { LoginPage } from './pages/LoginPage'

const ALL_PROJECTS = 'all'

function App() {
  // undefined while checking the session; null when signed out
  const [user, setUser] = useState<User | null | undefined>()

  useEffect(() => {
    // Any failure shows the sign-in page, which reports server problems
    api.me().then(setUser, () => setUser(null))
    const signOut = () => setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, signOut)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, signOut)
  }, [])

  const onLogin = useCallback((user: User) => setUser(user), [])

  if (user === undefined) return <p className="muted app-main">載入中…</p>
  if (user === null) return <LoginPage onLogin={onLogin} />
  // Keyed by user so nothing from a previous account survives a re-login
  return (
    <SignedInApp key={user.id} user={user} onLogout={() => setUser(null)} />
  )
}

function SignedInApp({ user, onLogout }: { user: User; onLogout: () => void }) {
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
            value={currentProjectId ?? ALL_PROJECTS}
            onChange={(e) =>
              navigate(
                e.target.value === ALL_PROJECTS
                  ? '/'
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
            <option value={ALL_PROJECTS}>所有專案</option>
          </select>
        </label>
        <div className="user-menu">
          {user.picture && (
            <img
              className="avatar"
              src={user.picture}
              alt=""
              referrerPolicy="no-referrer"
            />
          )}
          <span title={user.email}>{user.name || user.email}</span>
          <button
            type="button"
            className="link"
            onClick={() => {
              api.logout().then(onLogout, showError)
            }}
          >
            登出
          </button>
        </div>
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
