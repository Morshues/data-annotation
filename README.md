# Corpus Analysis

給語言學家使用的語料分析網站（Corpus Analysis Web Application）。

## 功能

- **專案**：所有資料都放在專案底下，每個專案有自己的文件、標註和標籤，彼此不共用。用左上角的選單切換專案，或選「管理專案…」建立專案、修改名稱和描述。目前不能刪除專案。
- **匯入文件**：按「匯入文件」選擇匯入方式，上限都是 5 MB。目前不能編輯或刪除文件。
  - 上傳檔案：UTF-8 編碼的 `.txt` 或 `.md` 檔案。
  - 貼上文字：從剪貼簿貼上或直接輸入，並填寫標題。
- **全文標註（兩段式）**：
  1. 在全文上拖選一段文字，作為上下文。
  2. 在右側顯示的上下文中，再拖選要標註的重點，可以選多段。
  3. 加上標籤（可以有多個）和描述後儲存。
- **標註瀏覽**：瀏覽所有標註，可以用標籤（任一 OR／全部 AND）和關鍵字篩選，也可以只看目前文件的標註。
- **標籤管理**：列出所有標籤和各自的標註數，可以編輯標籤的描述。標籤可以在標籤頁或建立標註時新增。
  - 標籤群組：把同類的標籤放在一起，例如「詞性」底下有「主詞」「受詞」。每個標籤最多屬於一個群組，刪除群組時裡面的標籤會變成未分組。
  - 篩選標註時，標籤依照群組分區顯示，可以一次勾選整個群組。

每個標註都會另外保存自己的重點和上下文文字，所以就算對應的文件不存在，標註仍然完整。

## Tech Stack

| 項目          | 技術                           |
| ------------- | ------------------------------ |
| Frontend      | React + TypeScript + Vite      |
| Backend       | Node.js + TypeScript + Express |
| Database      | PostgreSQL + Prisma            |
| Monorepo      | pnpm workspaces                |
| Lint / Format | oxlint / Prettier              |
| Deployment    | Docker Compose                 |

## 專案結構

```
apps/
├── web/   # 前端（Vite + React）
└── api/   # 後端（Express + Prisma）
```

## 需求環境

- Node.js 24 以上
- pnpm（透過 Corepack 啟用，版本固定在根目錄 `package.json` 的 `packageManager`）
- PostgreSQL 17（本機開發用）
- Docker 與 Docker Compose（容器部署用）

## 本機開發

1. 啟用 pnpm 並安裝套件：

   ```sh
   corepack enable
   pnpm install
   ```

   安裝完成後會自動執行 `prisma generate`。

2. 在本機 PostgreSQL 建立資料庫：

   ```sh
   createdb corpus
   ```

3. 建立後端的環境變數檔，並依照本機的 PostgreSQL 帳號修改 `DATABASE_URL`：

   ```sh
   cp apps/api/.env.example apps/api/.env
   ```

4. 建立資料表：

   ```sh
   pnpm --filter @corpus/api exec prisma migrate deploy
   ```

5. 啟動前端與後端：

   ```sh
   pnpm dev
   ```

   - 前端：http://localhost:5173
   - 後端：http://localhost:4000

   開發時，前端的 `/api` 請求會由 Vite proxy 轉給後端。

6. 確認服務狀態：

   ```sh
   curl http://localhost:4000/api/health
   # {"status":"ok","database":"ok"}
   ```

   資料庫連不上時會回傳 HTTP 503。

## IntelliJ IDEA

`.run/` 目錄有共用的 Run Configuration，打開專案後會自動出現在右上角的選單：

| 名稱                  | 用途                                                    |
| --------------------- | ------------------------------------------------------- |
| `dev: all`            | 同時啟動前端與後端（等同 `pnpm dev`）                   |
| `api: dev`            | 啟動後端，修改程式後自動重啟                            |
| `api: debug`          | 用 Debug 模式執行，可以在後端的 `.ts` 設中斷點          |
| `web: dev`            | 啟動前端的 Vite dev server                              |
| `web: debug (Chrome)` | 開 Chrome 並連上 debugger，可以在前端的 `.tsx` 設中斷點 |

- 後端除錯：對 `api: debug` 按 Debug。它不會自動重啟，改完程式要重新執行。
- 前端除錯：先啟動 `web: dev`，再對 `web: debug (Chrome)` 按 Debug。

## Docker Compose

1. 建立環境變數檔，並修改 `POSTGRES_PASSWORD`：

   ```sh
   cp .env.example .env
   ```

2. 建置並啟動所有服務（`db`、`api`、`web`）：

   ```sh
   docker compose up --build -d
   ```

3. 打開 http://localhost:8080，或執行：

   ```sh
   curl http://localhost:8080/api/health
   ```

`web` 用 nginx 提供前端靜態檔，並把 `/api` 轉給 `api`。只有 `web` 會對外開放 port，`db` 和 `api` 只在 Docker 內部網路使用。資料庫的資料存在 `db-data` volume。`api` 每次啟動時會先執行 `prisma migrate deploy`，套用還沒執行的 migration。

停止服務：

```sh
docker compose down        # 保留資料
docker compose down -v     # 連同資料庫資料一起刪除
```

## 常用指令

| 指令                            | 說明                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `pnpm dev`                      | 同時啟動前端與後端的開發伺服器                                                     |
| `pnpm build`                    | Build 所有 apps                                                                    |
| `pnpm lint`                     | 執行 oxlint                                                                        |
| `pnpm format`                   | 用 Prettier 格式化程式碼                                                           |
| `pnpm test`                     | 執行單元測試（Vitest）                                                             |
| `pnpm db:generate`              | 重新產生 Prisma Client                                                             |
| `pnpm db:migrate --name <名稱>` | 修改 `schema.prisma` 後，建立並套用新的 migration；之後要再執行 `pnpm db:generate` |

## 環境變數

**`apps/api/.env`**（本機開發）

| 變數           | 說明                | 預設值 |
| -------------- | ------------------- | ------ |
| `DATABASE_URL` | PostgreSQL 連線字串 | —      |
| `PORT`         | 後端監聽的 port     | `4000` |

**`.env`**（Docker Compose）

| 變數                | 說明            | 預設值 |
| ------------------- | --------------- | ------ |
| `POSTGRES_USER`     | 資料庫使用者    | —      |
| `POSTGRES_PASSWORD` | 資料庫密碼      | —      |
| `POSTGRES_DB`       | 資料庫名稱      | —      |
| `WEB_PORT`          | 網站對外的 port | `8080` |
