import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { Project, ProjectChanges, ProjectRole } from '../api'
import { api } from '../api'
import { projectPath, useRoot } from '../layout'
import { useSubmit } from '../lib/use-submit'

export function ProjectsPage() {
  const navigate = useNavigate()
  const { projects, refreshProjects } = useRoot()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  // Counts change while working inside a project, so fetch them fresh
  useEffect(() => {
    void refreshProjects()
  }, [refreshProjects])

  return (
    <main className="app-main">
      <h2 className="page-title">所有專案</h2>
      {projects === null ? (
        <p className="muted">載入中…</p>
      ) : (
        <ul className="project-grid">
          <li className="project-card new-project">
            {creating ? (
              <NewProjectForm
                onCancel={() => setCreating(false)}
                onCreate={async (data) => {
                  const project = await api.createProject(data)
                  await refreshProjects()
                  navigate(projectPath(project.id))
                }}
              />
            ) : (
              <button
                type="button"
                className="new-project-button"
                onClick={() => setCreating(true)}
              >
                ＋ 建立專案
              </button>
            )}
          </li>
          {projects.map((project) => (
            <li key={project.id} className="project-card">
              <ProjectRow
                project={project}
                editing={editingId === project.id}
                onEdit={() => setEditingId(project.id)}
                onClose={() => setEditingId(null)}
                onSave={async (changes) => {
                  await api.updateProject(project.id, changes)
                  setEditingId(null)
                  await refreshProjects()
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {projects?.length === 0 && (
        <p className="muted">還沒有任何專案，先建立一個開始標註。</p>
      )}
    </main>
  )
}

type ProjectFields = { name: string; description: string }

function NewProjectForm({
  onCreate,
  onCancel,
}: {
  onCreate: (data: ProjectFields) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const { busy, error, submit } = useSubmit(onCreate)

  return (
    <form
      className="project-form"
      onSubmit={(e) => {
        e.preventDefault()
        void submit({ name, description })
      }}
    >
      <h2>建立專案</h2>
      <label className="field">
        <span>名稱</span>
        <input
          type="text"
          value={name}
          maxLength={100}
          autoFocus
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
          建立
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  )
}

type RowProps = {
  project: Project
  editing: boolean
  onEdit: () => void
  onClose: () => void
  onSave: (changes: ProjectChanges) => Promise<void>
}

function ProjectRow({ project, editing, onEdit, onClose, onSave }: RowProps) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const { busy, error, submit } = useSubmit(onSave)

  if (editing) {
    return (
      <>
        <label className="field">
          <span>名稱</span>
          <input
            type="text"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          <span>描述</span>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button
            type="button"
            className="primary"
            disabled={busy || !name.trim()}
            onClick={() => submit({ name, description })}
          >
            儲存
          </button>
          <button type="button" disabled={busy} onClick={onClose}>
            取消
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="card-meta">
        {/* Stretched over the whole card, see .project-link */}
        <Link
          className="project-name project-link"
          to={projectPath(project.id)}
        >
          {project.name}
        </Link>
        {project.role === 'OWNER' && (
          <button
            type="button"
            className="link"
            onClick={() => {
              setName(project.name)
              setDescription(project.description)
              onEdit()
            }}
          >
            編輯
          </button>
        )}
      </div>
      {project.description && (
        <p className="project-description">{project.description}</p>
      )}
      <p className="muted project-counts">
        {project._count.documents} 份文件・{project._count.annotations} 個標註
        {project.role !== 'OWNER' && (
          <span className="badge">{SHARED_LABELS[project.role]}</span>
        )}
      </p>
    </>
  )
}

const SHARED_LABELS: Record<Exclude<ProjectRole, 'OWNER'>, string> = {
  EDITOR: '共用・可編輯',
  VIEWER: '共用・唯讀',
}
