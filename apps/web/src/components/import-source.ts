import type { DocumentSummary } from '../api'

// Props shared by every way of importing into the corpus.
export type ImportSourceProps = {
  projectId: number
  onImported: (document: DocumentSummary) => void | Promise<void>
  // Reloads the document list without closing the dialog
  onDocumentsChanged: () => void | Promise<void>
  // Closes the import dialog, for sources that continue elsewhere
  onClose: () => void
}
