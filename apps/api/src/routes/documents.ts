import express, { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { z } from 'zod'
import { prisma } from '../db.js'
import { HttpError } from '../http-error.js'
import { projectIdOf } from './project-scope.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.txt', '.md']

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
})

const idParams = z.object({ id: z.coerce.number().int().positive() })

const textBody = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string(),
})

const documentSelect = {
  id: true,
  title: true,
  filename: true,
  createdAt: true,
} as const

// Shared by every import source: normalizes line endings and rejects empty
// content before saving.
function createDocument(data: {
  projectId: number
  title: string
  filename: string | null
  content: string
}) {
  const content = data.content.replace(/\r\n?/g, '\n')
  if (content.trim() === '') throw new HttpError(400, '內容是空的')
  return prisma.document.create({
    data: { ...data, content },
    select: documentSelect,
  })
}

export const documentsRouter = Router({ mergeParams: true })

documentsRouter.get('/', async (_req, res) => {
  const documents = await prisma.document.findMany({
    where: { projectId: projectIdOf(res) },
    select: { ...documentSelect, _count: { select: { annotations: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(documents)
})

documentsRouter.get('/:id', async (req, res) => {
  const { id } = idParams.parse(req.params)
  const document = await prisma.document.findFirst({
    where: { id, projectId: projectIdOf(res) },
    include: {
      annotations: {
        include: {
          spans: { orderBy: { start: 'asc' } },
          tags: { orderBy: { name: 'asc' } },
        },
        orderBy: { contextStart: 'asc' },
      },
    },
  })
  if (!document) throw new HttpError(404, '找不到這份文件')
  res.json(document)
})

documentsRouter.post('/', upload.single('file'), async (req, res) => {
  const file = req.file
  if (!file) throw new HttpError(400, '沒有收到檔案')

  // Multer decodes multipart filenames as latin1
  const filename = Buffer.from(file.originalname, 'latin1').toString('utf8')
  const ext = path.extname(filename).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new HttpError(
      400,
      `不支援這種檔案格式，目前只接受 ${ALLOWED_EXTENSIONS.join('、')}`,
    )
  }

  let content: string
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(file.buffer)
  } catch {
    throw new HttpError(
      400,
      '檔案不是 UTF-8 編碼，請先轉成 UTF-8（例如從 Big5 轉換）再上傳',
    )
  }

  const document = await createDocument({
    projectId: projectIdOf(res),
    title: path.basename(filename, ext),
    filename,
    content,
  })
  res.status(201).json(document)
})

// Slightly above MAX_FILE_SIZE so the exact limit is checked below
documentsRouter.post(
  '/text',
  express.json({ limit: '6mb' }),
  async (req, res) => {
    const { title, content } = textBody.parse(req.body)
    if (Buffer.byteLength(content) > MAX_FILE_SIZE) {
      throw new HttpError(413, '內容太大，上限是 5 MB')
    }
    const document = await createDocument({
      projectId: projectIdOf(res),
      title,
      filename: null,
      content,
    })
    res.status(201).json(document)
  },
)
