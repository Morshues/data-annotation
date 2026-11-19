import { useOutletContext } from 'react-router'
import type { DocumentSummary, TagWithCount } from './api'

export type LayoutContext = {
  documents: DocumentSummary[] | null
  tags: TagWithCount[]
  currentDocumentId: number | null
  refreshDocuments: () => Promise<void>
  refreshTags: () => Promise<void>
}

export function useLayout() {
  return useOutletContext<LayoutContext>()
}
