# Corpus Analysis

給語言學家使用的語料分析網站（Corpus Analysis Web Application）。目前只有基礎專案架構，還沒有業務功能。

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

4. 啟動前端與後端：

   ```sh
   pnpm dev
   ```

   - 前端：http://localhost:5173
   - 後端：http://localhost:4000

   開發時，前端的 `/api` 請求會由 Vite proxy 轉給後端。

5. 確認服務狀態：

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

`web` 用 nginx 提供前端靜態檔，並把 `/api` 轉給 `api`。只有 `web` 會對外開放 port，`db` 和 `api` 只在 Docker 內部網路使用。資料庫的資料存在 `db-data` volume。

停止服務：

```sh
docker compose down        # 保留資料
docker compose down -v     # 連同資料庫資料一起刪除
```

## 常用指令

| 指令               | 說明                           |
| ------------------ | ------------------------------ |
| `pnpm dev`         | 同時啟動前端與後端的開發伺服器 |
| `pnpm build`       | Build 所有 apps                |
| `pnpm lint`        | 執行 oxlint                    |
| `pnpm format`      | 用 Prettier 格式化程式碼       |
| `pnpm db:generate` | 重新產生 Prisma Client         |

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
