import { useRef, useState } from 'react'
import { api, type DocumentSummary } from '../api'
import type { ImportSourceProps } from './import-source'

type UploadResult =
  | { filename: string; document: DocumentSummary }
  | { filename: string; error: string }

export function FileImport({
  projectId,
  onImported,
  onDocumentsChanged,
}: ImportSourceProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // [done, total] while uploading
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [results, setResults] = useState<UploadResult[]>([])

  async function upload(files: File[]) {
    setResults([])
    const uploaded: UploadResult[] = []
    // One at a time so each file gets its own result and the server is not
    // flooded
    for (const [index, file] of files.entries()) {
      setProgress([index, files.length])
      try {
        const document = await api.uploadDocument(projectId, file)
        uploaded.push({ filename: file.name, document })
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        uploaded.push({ filename: file.name, error })
      }
    }
    setProgress(null)
    if (inputRef.current) inputRef.current.value = ''

    const created = uploaded.flatMap((r) => ('document' in r ? r.document : []))
    if (created.length === uploaded.length) {
      await onImported(created[0])
      return
    }
    // Keep the dialog open so the failures can be read
    setResults(uploaded)
    if (created.length > 0) await onDocumentsChanged()
  }

  return (
    <div className="import-source">
      <p className="hint">
        支援 UTF-8 編碼的 .txt 或 .md 檔案，每個上限 5
        MB，可以一次選擇多個檔案。
      </p>
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={progress !== null}
          onClick={() => inputRef.current?.click()}
        >
          {progress
            ? `上傳中 ${progress[0] + 1} / ${progress[1]}…`
            : '選擇檔案（可多選）'}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length > 0) void upload(files)
        }}
      />
      {results.length > 0 && (
        <ul className="upload-results" role="alert">
          {results.map((r, i) => (
            <li key={i} className={'error' in r ? 'failed' : undefined}>
              <span className="filename">{r.filename}</span>
              {'error' in r ? `✗ ${r.error}` : '✓ 已建立'}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
