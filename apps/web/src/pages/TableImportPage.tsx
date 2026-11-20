import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { ImportResult } from '../api'
import { api } from '../api'
import { ContextText } from '../components/ContextText'
import { projectPath, useLayout } from '../layout'
import type { ImportRow } from '../lib/table-import/build-rows'
import { buildImportRows, summarizeTags } from '../lib/table-import/build-rows'
import type { ColumnConfig, ColumnRole } from '../lib/table-import/columns'
import {
  ROLE_LABELS,
  columnLetter,
  guessColumns,
  validateColumns,
} from '../lib/table-import/columns'
import type { Sheet } from '../lib/table-import/read-table'
import { ACCEPTED_EXTENSIONS, readTable } from '../lib/table-import/read-table'
import { useSubmit } from '../lib/use-submit'

// Matches the limit of the import API
const MAX_ROWS = 5000
const PREVIEW_LIMIT = 200

type Loaded = { fileName: string; sheets: Sheet[] }

export function TableImportPage() {
  const { projectId, refreshTags, refreshDocuments } = useLayout()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const { busy, error, submit } = useSubmit(async (file: File) => {
    setLoaded({ fileName: file.name, sheets: await readTable(file) })
  })

  if (result) {
    return (
      <ImportDone
        projectId={projectId}
        result={result}
        onAgain={() => {
          setResult(null)
          setLoaded(null)
        }}
      />
    )
  }

  return (
    <section className="import-page" aria-label="表格匯入">
      <h2>表格匯入</h2>
      <p className="muted">
        支援 .xlsx、.xls、.csv（UTF-8 或 Big5）和 .json，上限 5
        MB。每一列會匯入成一筆標註，檔案只在瀏覽器中讀取。
      </p>
      <label className="field file-field">
        <span>檔案</span>
        <input
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void submit(file)
          }}
        />
      </label>
      {busy && <p className="muted">讀取中…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loaded && !busy && (
        <ImportSettings
          key={loaded.fileName}
          loaded={loaded}
          onImport={async (annotations) => {
            const created = await api.importAnnotations(projectId, annotations)
            await Promise.all([refreshTags(), refreshDocuments()])
            setResult(created)
          }}
        />
      )}
    </section>
  )
}

type ImportSettingsProps = {
  loaded: Loaded
  onImport: (rows: ImportRow[]) => Promise<void>
}

function ImportSettings({ loaded, onImport }: ImportSettingsProps) {
  const { tags, tagGroups, documents } = useLayout()
  const [sheetIndex, setSheetIndex] = useState(0)
  const [hasHeader, setHasHeader] = useState(true)
  const [includeApprox, setIncludeApprox] = useState(true)
  const [filter, setFilter] = useState<'all' | 'approx' | 'skipped'>('all')

  const rows = useMemo(
    () => loaded.sheets[sheetIndex]?.rows ?? [],
    [loaded, sheetIndex],
  )
  const header = hasHeader ? (rows[0] ?? []) : []
  const body = useMemo(
    () => (hasHeader ? rows.slice(1) : rows),
    [rows, hasHeader],
  )
  const width = rows[0]?.length ?? 0

  // Guessed again whenever the sheet or the header setting changes
  const [columns, setColumns] = useState(() => guessColumns(header, body))
  const [guessedFor, setGuessedFor] = useState({ sheetIndex, hasHeader })
  if (
    guessedFor.sheetIndex !== sheetIndex ||
    guessedFor.hasHeader !== hasHeader
  ) {
    setGuessedFor({ sheetIndex, hasHeader })
    setColumns(guessColumns(header, body))
  }

  const errors = validateColumns(columns)
  const importRows = useMemo(
    () =>
      validateColumns(columns).length > 0
        ? []
        : buildImportRows(body, columns, hasHeader ? 2 : 1),
    [body, columns, hasHeader],
  )
  const count = (status: ImportRow['status']) =>
    importRows.filter((r) => r.status === status).length
  const selected = importRows.filter(
    (r) => r.status === 'exact' || (r.status === 'approx' && includeApprox),
  )
  const tagSummary = summarizeTags(selected)
  const existingTags = new Set(tags.map((t) => t.name))
  const existingGroups = new Set(tagGroups.map((g) => g.name))
  const documentTitles = new Set(documents?.map((d) => d.title))
  const linked = selected.filter((r) => documentTitles.has(r.source)).length

  const shown = importRows.filter(
    (r) => filter === 'all' || r.status === filter,
  )
  const { busy, error, submit } = useSubmit(onImport)

  function updateColumn(index: number, changes: Partial<ColumnConfig>) {
    setColumns((cols) =>
      cols.map((c) => (c.index === index ? { ...c, ...changes } : c)),
    )
  }

  return (
    <>
      <div className="import-options">
        {loaded.sheets.length > 1 && (
          <label className="field">
            <span>工作表</span>
            <select
              value={sheetIndex}
              onChange={(e) => setSheetIndex(Number(e.target.value))}
            >
              {loaded.sheets.map((s, i) => (
                <option key={s.name} value={i}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="checkbox">
          <input
            type="checkbox"
            checked={hasHeader}
            onChange={(e) => setHasHeader(e.target.checked)}
          />
          第一列是標題
        </label>
      </div>

      <h3>欄位設定</h3>
      <p className="muted">
        已自動判斷每一欄的用途，請確認或調整。
        {width > columns.length &&
          `已隱藏 ${width - columns.length} 個空白欄。`}
      </p>
      <div className="table-scroll">
        <table className="import-table">
          <thead>
            <tr>
              <th>欄</th>
              <th>標題</th>
              <th>範例</th>
              <th>用途</th>
              <th>設定</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((column) => (
              <ColumnRow
                key={column.index}
                column={column}
                samples={body
                  .map((row) => row[column.index]?.trim())
                  .filter(Boolean)
                  .slice(0, 3)}
                onChange={(changes) => updateColumn(column.index, changes)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {errors.map((message) => (
        <p key={message} className="error" role="alert">
          {message}
        </p>
      ))}

      {errors.length === 0 && (
        <>
          <h3>預覽</h3>
          <div className="import-summary">
            <p>
              會匯入 <strong>{selected.length}</strong> 筆標註
              {count('approx') > 0 &&
                `（其中 ${includeApprox ? count('approx') : 0} 筆是近似比對）`}
              ，略過 {importRows.length - selected.length} 筆。
              {linked > 0 &&
                `有 ${linked} 筆的來源和現有文件同名，會連到那份文件。`}
            </p>
            {count('approx') > 0 && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={includeApprox}
                  onChange={(e) => setIncludeApprox(e.target.checked)}
                />
                包含近似比對的 {count('approx')}{' '}
                筆（標註文字和上下文不完全相同，已拆成能對上的片段）
              </label>
            )}
            {tagSummary.groups.map(({ group, names }) => (
              <div key={group ?? ''} className="import-tag-group">
                <span className="import-tag-group-name">
                  {group ?? '未分組'}
                  {group && !existingGroups.has(group) && (
                    <span className="badge">新群組</span>
                  )}
                </span>
                <span className="tags">
                  {names.map((name) => (
                    <span
                      key={name}
                      className={`tag${existingTags.has(name) ? '' : ' new'}`}
                      title={existingTags.has(name) ? '已存在的標籤' : '新標籤'}
                    >
                      {name}
                    </span>
                  ))}
                </span>
              </div>
            ))}
            {tagSummary.conflicts.map(({ name, groups }) => (
              <p key={name} className="warning">
                標籤「{name}」出現在多個群組（
                {groups.map((g) => g ?? '未分組').join('、')}
                ），標籤名稱不能重複，會放在第一個群組。
              </p>
            ))}
          </div>

          <div className="segmented" role="radiogroup" aria-label="顯示">
            {(
              [
                ['all', '全部', importRows.length],
                ['approx', '近似', count('approx')],
                ['skipped', '略過', count('skipped')],
              ] as const
            ).map(([key, label, n]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}（{n}）
              </button>
            ))}
          </div>
          <div className="table-scroll">
            <table className="import-table">
              <thead>
                <tr>
                  <th>列</th>
                  <th>來源</th>
                  <th>上下文</th>
                  <th>標籤</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, PREVIEW_LIMIT).map((row) => (
                  <PreviewRow key={row.rowNumber} row={row} />
                ))}
              </tbody>
            </table>
          </div>
          {shown.length > PREVIEW_LIMIT && (
            <p className="muted">
              只顯示前 {PREVIEW_LIMIT} 筆，共 {shown.length} 筆。
            </p>
          )}

          {selected.length > MAX_ROWS && (
            <p className="error" role="alert">
              一次最多匯入 {MAX_ROWS} 筆，請把表格分成幾個檔案。
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button
              type="button"
              className="primary"
              disabled={
                busy || selected.length === 0 || selected.length > MAX_ROWS
              }
              onClick={() => submit(selected)}
            >
              {busy ? '匯入中…' : `匯入 ${selected.length} 筆標註`}
            </button>
          </div>
        </>
      )}
    </>
  )
}

const ROLES = Object.keys(ROLE_LABELS) as ColumnRole[]

function ColumnRow({
  column,
  samples,
  onChange,
}: {
  column: ColumnConfig
  samples: string[]
  onChange: (changes: Partial<ColumnConfig>) => void
}) {
  const letter = columnLetter(column.index)
  return (
    <tr>
      <td>{letter}</td>
      <td>{column.header || <span className="muted">（無標題）</span>}</td>
      <td className="samples">
        {samples.map((s, i) => (
          <span key={i}>{s.length > 40 ? `${s.slice(0, 40)}…` : s}</span>
        ))}
      </td>
      <td>
        <select
          aria-label={`${letter} 欄的用途`}
          value={column.role}
          onChange={(e) => onChange({ role: e.target.value as ColumnRole })}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </td>
      <td>
        <div className="column-settings">
          {column.role === 'tags' && (
            <label>
              群組
              <input
                type="text"
                value={column.group}
                maxLength={100}
                placeholder="留空就是未分組"
                onChange={(e) => onChange({ group: e.target.value })}
              />
            </label>
          )}
          {(column.role === 'tags' || column.role === 'spans') && (
            <label>
              分隔符號
              <input
                type="text"
                className="separator"
                value={column.separator}
                maxLength={5}
                placeholder="不拆"
                onChange={(e) => onChange({ separator: e.target.value })}
              />
            </label>
          )}
        </div>
      </td>
    </tr>
  )
}

function PreviewRow({ row }: { row: ImportRow }) {
  return (
    <tr className={row.status === 'skipped' ? 'skipped' : undefined}>
      <td>{row.rowNumber}</td>
      <td>{row.source}</td>
      <td className="preview-context">
        <ContextText context={row.context} spans={row.spans} />
      </td>
      <td>
        <span className="tags">
          {row.tags.map((t) => (
            <span key={t.name} className="tag" title={t.group ?? '未分組'}>
              {t.name}
            </span>
          ))}
        </span>
      </td>
      <td>
        {row.status === 'exact' && <span className="status">完全相符</span>}
        {row.status === 'approx' && <span className="status approx">近似</span>}
        {row.status === 'skipped' && (
          <span className="status skipped">略過：{row.reason}</span>
        )}
      </td>
    </tr>
  )
}

function ImportDone({
  projectId,
  result,
  onAgain,
}: {
  projectId: number
  result: ImportResult
  onAgain: () => void
}) {
  return (
    <section className="import-page" aria-label="匯入結果">
      <div className="empty-panel">
        <h2>已匯入 {result.created} 筆標註</h2>
        <ul>
          {result.linkedToDocument > 0 && (
            <li>
              {result.linkedToDocument} 筆連到同名文件
              {result.unpositioned > 0 &&
                `，其中 ${result.unpositioned} 筆在全文中找不到上下文，不會在全文上標示`}
              。
            </li>
          )}
          {result.createdGroups.length > 0 && (
            <li>新增群組：{result.createdGroups.join('、')}</li>
          )}
          {result.createdTags.length > 0 && (
            <li>新增 {result.createdTags.length} 個標籤</li>
          )}
        </ul>
        <div className="actions">
          <Link
            className="button primary"
            to={projectPath(projectId, '/annotations')}
          >
            查看標註
          </Link>
          <button type="button" onClick={onAgain}>
            再匯入一個檔案
          </button>
        </div>
      </div>
    </section>
  )
}
