import { Navigate } from 'react-router'
import { projectPath, useLayout } from '../layout'

// Opens the project's most recent document, or explains how to get started.
export function ProjectHomePage() {
  const { projectId, documents } = useLayout()

  if (documents === null) return <p className="muted">載入中…</p>
  if (documents.length > 0) {
    return (
      <Navigate
        to={projectPath(projectId, `/documents/${documents[0].id}`)}
        replace
      />
    )
  }
  return (
    <div className="empty-panel">
      <h2>這個專案還沒有任何文件</h2>
      <p>按右上角的「匯入文件」，上傳檔案或貼上文字，就可以開始標註。</p>
    </div>
  )
}
