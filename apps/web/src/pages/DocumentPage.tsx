import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import type { AnnotationChanges, DocumentDetail } from '../api'
import { api } from '../api'
import { AnnotationEditor } from '../components/AnnotationEditor'
import { DocumentText } from '../components/DocumentText'
import type { NewAnnotationInput } from '../components/NewAnnotationForm'
import { NewAnnotationForm } from '../components/NewAnnotationForm'
import { useLayout } from '../layout'
import type { Range } from '../lib/segments'

export function DocumentPage() {
  const documentId = Number(useParams().id)
  // Remount per document so selection state starts fresh
  return <DocumentView key={documentId} documentId={documentId} />
}

function DocumentView({ documentId }: { documentId: number }) {
  const { tags, refreshTags, refreshDocuments } = useLayout()

  const [document, setDocument] = useState<DocumentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingContext, setPendingContext] = useState<Range | null>(null)
  const [activeIds, setActiveIds] = useState<number[]>([])

  const showError = (err: unknown) =>
    setError(err instanceof Error ? err.message : String(err))

  useEffect(() => {
    api.getDocument(documentId).then(setDocument, showError)
  }, [documentId])

  const reload = () => api.getDocument(documentId).then(setDocument)

  if (error) return <p className="error">{error}</p>
  if (!document) return <p className="muted">載入中…</p>

  async function createAnnotation(input: NewAnnotationInput) {
    if (!pendingContext) return
    const created = await api.createAnnotation({
      documentId,
      contextStart: pendingContext.start,
      contextEnd: pendingContext.end,
      textStart: input.focus.start,
      textEnd: input.focus.end,
      tags: input.tags,
      description: input.description,
    })
    setPendingContext(null)
    setActiveIds([created.id])
    await Promise.all([reload(), refreshTags(), refreshDocuments()])
  }

  async function updateAnnotation(id: number, changes: AnnotationChanges) {
    await api.updateAnnotation(id, changes)
    await Promise.all([reload(), refreshTags()])
  }

  async function deleteAnnotation(id: number) {
    await api.deleteAnnotation(id)
    setActiveIds((ids) => ids.filter((i) => i !== id))
    await Promise.all([reload(), refreshTags(), refreshDocuments()])
  }

  const activeAnnotations = document.annotations.filter((a) =>
    activeIds.includes(a.id),
  )

  return (
    <div className="document-layout">
      <section className="document-pane" aria-label="全文">
        <h2 className="document-title">{document.title}</h2>
        <DocumentText
          content={document.content}
          annotations={document.annotations}
          pendingContext={pendingContext}
          activeIds={activeIds}
          onSelectContext={(range) => {
            setPendingContext(range)
            setActiveIds([])
          }}
          onClickAnnotations={(ids) => {
            setPendingContext(null)
            setActiveIds(ids)
          }}
        />
      </section>

      <aside className="side-pane" aria-label="標註編輯">
        {pendingContext ? (
          <NewAnnotationForm
            key={`${pendingContext.start}-${pendingContext.end}`}
            context={document.content.slice(
              pendingContext.start,
              pendingContext.end,
            )}
            tagSuggestions={tags}
            onSubmit={createAnnotation}
            onCancel={() => setPendingContext(null)}
          />
        ) : activeAnnotations.length > 0 ? (
          <>
            <h2>
              標註
              {activeAnnotations.length > 1 &&
                `（此處重疊 ${activeAnnotations.length} 個）`}
            </h2>
            {activeAnnotations.map((a) => (
              <AnnotationEditor
                key={`${a.id}-${a.updatedAt}`}
                annotation={a}
                tagSuggestions={tags}
                onSave={(changes) => updateAnnotation(a.id, changes)}
                onDelete={() => deleteAnnotation(a.id)}
                onClose={() =>
                  setActiveIds((ids) => ids.filter((i) => i !== a.id))
                }
              />
            ))}
          </>
        ) : (
          <div className="empty-panel">
            <h2>開始標註</h2>
            <ol>
              <li>在左邊的全文拖選一段文字，作為上下文。</li>
              <li>在這裡顯示的上下文中，再拖選要標註的重點。</li>
              <li>加上標籤和描述後儲存。</li>
            </ol>
            <p className="muted">
              點全文中已標註的文字，可以查看或修改標註。這份文件目前有{' '}
              {document.annotations.length} 個標註。
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
