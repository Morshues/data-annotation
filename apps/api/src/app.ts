import express, { type ErrorRequestHandler } from 'express'
import multer from 'multer'
import { ZodError } from 'zod'
import { prisma } from './db.js'
import { HttpError } from './http-error.js'
import { Prisma } from './generated/prisma/client.js'
import { projectsRouter } from './routes/projects.js'

export const app = express()

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'ok' })
  } catch (err) {
    console.error('Database health check failed:', err)
    res.status(503).json({ status: 'ok', database: 'error' })
  }
})

// JSON bodies are parsed inside the router, see projects.ts
app.use('/api/projects', projectsRouter)

app.use('/api', (_req, res) => {
  res.status(404).json({ error: '找不到這個 API' })
})

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
  } else if (err instanceof ZodError) {
    res.status(400).json({ error: '請求內容不正確', issues: err.issues })
  } else if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: '檔案太大，上限是 5 MB' })
    } else {
      res.status(400).json({ error: `上傳失敗：${err.message}` })
    }
  } else if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    res.status(409).json({ error: '名稱已經存在' })
  } else if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: '請求內容太大' })
  } else {
    console.error(err)
    res.status(500).json({ error: '伺服器發生錯誤' })
  }
}
app.use(errorHandler)
