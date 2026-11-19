import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { z } from 'zod'
import { prisma } from '../db.js'
import { HttpError } from '../http-error.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.txt', '.md']

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
})

const idParams = z.object({ id: z.coerce.number().int().positive() })

export const documentsRouter = Router()

documentsRouter.get('/', async (_req, res) => {
  const documents = await prisma.document.findMany({
    select: {
      id: true,
      title: true,
      filename: true,
      createdAt: true,
      _count: { select: { annotations: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(documents)
})

documentsRouter.get('/:id', async (req, res) => {
  const { id } = idParams.parse(req.params)
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      annotations: {
        include: { tags: { orderBy: { name: 'asc' } } },
        orderBy: { docStart: 'asc' },
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
  content = content.replace(/\r\n?/g, '\n')
  if (content.trim() === '') throw new HttpError(400, '檔案沒有內容')

  const document = await prisma.document.create({
    data: { title: path.basename(filename, ext), filename, content },
    select: { id: true, title: true, filename: true, createdAt: true },
  })
  res.status(201).json(document)
})
