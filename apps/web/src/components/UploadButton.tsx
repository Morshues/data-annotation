import { useRef, useState } from 'react'
import type { DocumentSummary } from '../api'
import { api } from '../api'

type Props = {
  onUploaded: (document: DocumentSummary) => void
}

export function UploadButton({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    try {
      onUploaded(await api.uploadDocument(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="upload">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? '上傳中…' : '上傳文件'}
      </button>
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
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
