import { useState } from 'react'
import { api } from '../api'
import type { ImportSourceProps } from './import-source'

const TITLE_GUESS_LENGTH = 30

// First non-empty line, cut by code points so surrogate pairs stay intact
function guessTitle(text: string) {
  const line = text
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean)
  return line ? [...line].slice(0, TITLE_GUESS_LENGTH).join('') : ''
}

export function PasteImport({ projectId, onImported }: ImportSourceProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function suggestTitle(text: string) {
    if (!title.trim()) setTitle(guessTitle(text))
  }

  async function readClipboard() {
    setNotice(null)
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        setNotice('剪貼簿裡沒有文字。')
        return
      }
      setContent(text)
      suggestTitle(text)
    } catch {
      setNotice('無法讀取剪貼簿，請在下方文字框按 Ctrl+V（Mac 是 ⌘+V）貼上。')
    }
  }

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await onImported(
        await api.createTextDocument(projectId, { title, content }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="import-source">
      <div className="actions">
        <button type="button" onClick={readClipboard}>
          從剪貼簿貼上
        </button>
      </div>
      {notice && <p className="hint">{notice}</p>}
      <label className="field">
        <span>內容</span>
        <textarea
          rows={12}
          value={content}
          placeholder="把文字貼在這裡"
          onChange={(e) => setContent(e.target.value)}
          onPaste={(e) => suggestTitle(e.clipboardData.getData('text'))}
        />
      </label>
      <label className="field">
        <span>標題</span>
        <input
          type="text"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={busy || !content.trim() || !title.trim()}
          onClick={submit}
        >
          {busy ? '匯入中…' : '匯入'}
        </button>
      </div>
    </div>
  )
}
