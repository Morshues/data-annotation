import { useNavigate } from 'react-router'
import { projectPath } from '../layout'
import type { ImportSourceProps } from './import-source'

// Table imports need room for column settings and a preview, so they get a
// page of their own; this tab only leads there.
export function TableImportLink({ projectId, onClose }: ImportSourceProps) {
  const navigate = useNavigate()

  return (
    <div className="import-source">
      <p className="hint">
        從 .xlsx、.xls、.csv 或 .json
        匯入整理好的標註。每一列是一筆標註，可以設定每一欄是上下文、標註重點、標籤或描述，確認預覽後再匯入。
      </p>
      <div className="actions">
        <button
          type="button"
          className="primary"
          onClick={() => {
            onClose()
            navigate(projectPath(projectId, '/import'))
          }}
        >
          開啟表格匯入
        </button>
      </div>
    </div>
  )
}
