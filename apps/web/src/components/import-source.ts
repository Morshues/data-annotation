import type { DocumentSummary } from '../api'

// Props shared by every way of importing a document into the corpus.
export type ImportSourceProps = {
  onImported: (document: DocumentSummary) => void | Promise<void>
}
