import { Navigate } from 'react-router'
import { useLayout } from '../layout'

// Opens the most recent document, or explains how to get started.
export function HomePage() {
  const { documents } = useLayout()

  if (documents === null) return <p className="muted">載入中…</p>
  if (documents.length > 0) {
    return <Navigate to={`/documents/${documents[0].id}`} replace />
  }
  return (
    <div className="empty-panel">
      <h2>還沒有任何文件</h2>
      <p>
        按右上角的「上傳文件」，上傳 UTF-8 編碼的 .txt 或 .md
        檔案，就可以開始標註。
      </p>
    </div>
  )
}
