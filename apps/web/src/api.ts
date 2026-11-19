import type { Range } from './lib/segments'

export type Project = {
  id: number
  name: string
  description: string
  createdAt: string
  _count: { documents: number; annotations: number }
}

export type ProjectChanges = { name?: string; description?: string }

export type Tag = {
  id: number
  groupId: number | null
  name: string
  description: string
}

export type TagGroup = {
  id: number
  name: string
  description: string
  createdAt: string
}

export type TagGroupFields = { name: string; description: string }

export type TagChanges = { description?: string; groupId?: number | null }

export type TagWithCount = Tag & { annotationCount: number }

export type DocumentSummary = {
  id: number
  title: string
  filename: string | null
  createdAt: string
  _count?: { annotations: number }
}

export type AnnotationSpan = {
  id: number
  text: string
  start: number
  end: number
  docStart: number | null
  docEnd: number | null
}

export type Annotation = {
  id: number
  documentId: number | null
  context: string
  contextStart: number | null
  contextEnd: number | null
  spans: AnnotationSpan[]
  description: string
  tags: Tag[]
  document?: { id: number; title: string } | null
  createdAt: string
  updatedAt: string
}

export type DocumentDetail = DocumentSummary & {
  content: string
  annotations: Annotation[]
}

export type AnnotationPage = {
  items: Annotation[]
  total: number
  page: number
  pageSize: number
}

export type AnnotationQuery = {
  tags: number[]
  tagMode: 'and' | 'or'
  q: string
  documentId?: number
  page: number
}

export type NewAnnotation = {
  documentId: number
  contextStart: number
  contextEnd: number
  spans: Range[]
  tags: string[]
  description: string
}

export type AnnotationChanges = {
  spans: Range[]
  tags: string[]
  description: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(body?.error ?? `請求失敗（HTTP ${res.status}）`)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

// Paths of everything that lives inside a project
const scoped = (projectId: number, path: string) =>
  `/projects/${projectId}${path}`

export const api = {
  listProjects: () => request<Project[]>('/projects'),

  createProject: (data: { name: string; description: string }) =>
    request<Project>('/projects', json('POST', data)),

  updateProject: (projectId: number, data: ProjectChanges) =>
    request<Project>(`/projects/${projectId}`, json('PATCH', data)),

  listDocuments: (projectId: number) =>
    request<DocumentSummary[]>(scoped(projectId, '/documents')),

  getDocument: (projectId: number, id: number) =>
    request<DocumentDetail>(scoped(projectId, `/documents/${id}`)),

  uploadDocument: (projectId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<DocumentSummary>(scoped(projectId, '/documents'), {
      method: 'POST',
      body: form,
    })
  },

  createTextDocument: (
    projectId: number,
    data: { title: string; content: string },
  ) =>
    request<DocumentSummary>(
      scoped(projectId, '/documents/text'),
      json('POST', data),
    ),

  listAnnotations: (projectId: number, query: AnnotationQuery) => {
    const params = new URLSearchParams({
      tagMode: query.tagMode,
      page: String(query.page),
    })
    if (query.tags.length > 0) params.set('tags', query.tags.join(','))
    if (query.q) params.set('q', query.q)
    if (query.documentId) params.set('documentId', String(query.documentId))
    return request<AnnotationPage>(scoped(projectId, `/annotations?${params}`))
  },

  createAnnotation: (projectId: number, data: NewAnnotation) =>
    request<Annotation>(scoped(projectId, '/annotations'), json('POST', data)),

  updateAnnotation: (projectId: number, id: number, data: AnnotationChanges) =>
    request<Annotation>(
      scoped(projectId, `/annotations/${id}`),
      json('PATCH', data),
    ),

  deleteAnnotation: (projectId: number, id: number) =>
    request<void>(scoped(projectId, `/annotations/${id}`), {
      method: 'DELETE',
    }),

  listTags: (projectId: number) =>
    request<TagWithCount[]>(scoped(projectId, '/tags')),

  createTag: (
    projectId: number,
    data: { name: string; groupId: number | null },
  ) => request<TagWithCount>(scoped(projectId, '/tags'), json('POST', data)),

  updateTag: (projectId: number, id: number, data: TagChanges) =>
    request<TagWithCount>(
      scoped(projectId, `/tags/${id}`),
      json('PATCH', data),
    ),

  listTagGroups: (projectId: number) =>
    request<TagGroup[]>(scoped(projectId, '/tag-groups')),

  createTagGroup: (projectId: number, data: TagGroupFields) =>
    request<TagGroup>(scoped(projectId, '/tag-groups'), json('POST', data)),

  updateTagGroup: (projectId: number, id: number, data: TagGroupFields) =>
    request<TagGroup>(
      scoped(projectId, `/tag-groups/${id}`),
      json('PATCH', data),
    ),

  deleteTagGroup: (projectId: number, id: number) =>
    request<void>(scoped(projectId, `/tag-groups/${id}`), {
      method: 'DELETE',
    }),
}
