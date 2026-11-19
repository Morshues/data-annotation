export type Tag = {
  id: number
  name: string
  description: string
}

export type TagWithCount = Tag & { annotationCount: number }

export type DocumentSummary = {
  id: number
  title: string
  filename: string
  createdAt: string
  _count?: { annotations: number }
}

export type Annotation = {
  id: number
  documentId: number | null
  text: string
  context: string
  textStart: number
  textEnd: number
  docStart: number | null
  docEnd: number | null
  contextStart: number | null
  contextEnd: number | null
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
  textStart: number
  textEnd: number
  tags: string[]
  description: string
}

export type AnnotationChanges = {
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

export const api = {
  listDocuments: () => request<DocumentSummary[]>('/documents'),

  getDocument: (id: number) => request<DocumentDetail>(`/documents/${id}`),

  uploadDocument: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<DocumentSummary>('/documents', {
      method: 'POST',
      body: form,
    })
  },

  listAnnotations: (query: AnnotationQuery) => {
    const params = new URLSearchParams({
      tagMode: query.tagMode,
      page: String(query.page),
    })
    if (query.tags.length > 0) params.set('tags', query.tags.join(','))
    if (query.q) params.set('q', query.q)
    if (query.documentId) params.set('documentId', String(query.documentId))
    return request<AnnotationPage>(`/annotations?${params}`)
  },

  createAnnotation: (data: NewAnnotation) =>
    request<Annotation>('/annotations', json('POST', data)),

  updateAnnotation: (id: number, data: AnnotationChanges) =>
    request<Annotation>(`/annotations/${id}`, json('PATCH', data)),

  deleteAnnotation: (id: number) =>
    request<void>(`/annotations/${id}`, { method: 'DELETE' }),

  listTags: () => request<TagWithCount[]>('/tags'),

  updateTag: (id: number, data: { description: string }) =>
    request<TagWithCount>(`/tags/${id}`, json('PATCH', data)),
}
