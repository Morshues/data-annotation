import { useOutletContext } from 'react-router'
import type { DocumentSummary, Project, TagWithCount } from './api'

// Provided by App to the pages outside a project
export type RootContext = {
  projects: Project[] | null
  refreshProjects: () => Promise<void>
}

export function useRoot() {
  return useOutletContext<RootContext>()
}

// Provided by ProjectLayout to the pages inside a project
export type LayoutContext = {
  projectId: number
  documents: DocumentSummary[] | null
  tags: TagWithCount[]
  currentDocumentId: number | null
  refreshDocuments: () => Promise<void>
  refreshTags: () => Promise<void>
}

export function useLayout() {
  return useOutletContext<LayoutContext>()
}

export function projectPath(projectId: number, path = '') {
  return `/projects/${projectId}${path}`
}

const LAST_PROJECT_KEY = 'lastProjectId'

// Storage can be unavailable (private mode, blocked site data); the app then
// simply falls back to the first project.
export function rememberProject(projectId: number) {
  try {
    localStorage.setItem(LAST_PROJECT_KEY, String(projectId))
  } catch {
    // ignore
  }
}

export function lastProjectId(): number | null {
  try {
    return Number(localStorage.getItem(LAST_PROJECT_KEY)) || null
  } catch {
    return null
  }
}
