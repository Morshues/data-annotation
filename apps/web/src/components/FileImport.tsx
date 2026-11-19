import { useRef, useState } from 'react'
import { api } from '../api'
import type { ImportSourceProps } from './import-source'

export function FileImport({ onImported }: ImportSourceProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    try {
      await onImported(await api.uploadDocument(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="import-source">
      <p className="hint">支援 UTF-8 編碼的 .txt 或 .md 檔案，上限 5 MB。</p>
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? '上傳中…' : '選擇檔案'}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
        }}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
