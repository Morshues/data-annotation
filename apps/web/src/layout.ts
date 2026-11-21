import { useOutletContext } from 'react-router'
import type { DocumentSummary, Project, TagGroup, TagWithCount } from './api'

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
  tagGroups: TagGroup[]
  currentDocumentId: number | null
  refreshDocuments: () => Promise<void>
  // Reloads both the tags and the tag groups
  refreshTags: () => Promise<void>
}

export function useLayout() {
  return useOutletContext<LayoutContext>()
}

export function projectPath(projectId: number, path = '') {
  return `/projects/${projectId}${path}`
}
