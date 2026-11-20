import { useRef, useState } from 'react'
import { FileImport } from './FileImport'
import type { ImportSourceProps } from './import-source'
import { PasteImport } from './PasteImport'
import { TableImportLink } from './TableImportLink'

// Add new ways of importing a document here; each one gets its own tab.
const sources = [
  { key: 'file', label: '上傳檔案', Component: FileImport },
  { key: 'paste', label: '貼上文字', Component: PasteImport },
  { key: 'table', label: '表格', Component: TableImportLink },
]

export function ImportButton({
  projectId,
  onImported,
}: Omit<ImportSourceProps, 'onClose'>) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // Content is only mounted while open, so every import starts from a blank form
  const [open, setOpen] = useState(false)
  const [activeKey, setActiveKey] = useState(sources[0].key)

  const close = () => dialogRef.current?.close()

  return (
    <div className="import">
      <button
        type="button"
        onClick={() => {
          dialogRef.current?.showModal()
          setOpen(true)
        }}
      >
        匯入
      </button>
      <dialog
        ref={dialogRef}
        className="import-dialog"
        aria-labelledby="import-dialog-title"
        onClose={() => setOpen(false)}
      >
        {open && (
          <>
            <div className="import-dialog-header">
              <h2 id="import-dialog-title">匯入</h2>
              <button type="button" className="link" onClick={close}>
                關閉
              </button>
            </div>
            <div className="segmented" role="tablist" aria-label="匯入方式">
              {sources.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={s.key === activeKey}
                  onClick={() => setActiveKey(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {sources.map(({ key, Component }) => (
              // Kept mounted so switching tabs does not lose what was entered
              <div key={key} role="tabpanel" hidden={key !== activeKey}>
                <Component
                  projectId={projectId}
                  onImported={async (document) => {
                    await onImported(document)
                    close()
                  }}
                  onClose={close}
                />
              </div>
            ))}
          </>
        )}
      </dialog>
    </div>
  )
}
