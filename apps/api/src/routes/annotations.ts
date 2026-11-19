import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import type { Prisma } from '../generated/prisma/client.js'
import { HttpError } from '../http-error.js'
import { projectIdOf } from './project-scope.js'

const PAGE_SIZE = 50

const idParams = z.object({ id: z.coerce.number().int().positive() })

const tagNames = z
  .array(z.string().trim().min(1).max(100))
  .max(50)
  .transform((names) => [...new Set(names)])

const listQuery = z.object({
  tags: z
    .string()
    .optional()
    .transform((value) =>
      value ? value.split(',').map(Number).filter(Number.isInteger) : [],
    ),
  tagMode: z.enum(['and', 'or']).default('or'),
  q: z.string().trim().optional(),
  documentId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
})

// Offsets: context range in the document, focus range within the context.
// With documentId the context is taken from the document; without it the
// context text must be given directly.
const createBody = z.object({
  documentId: z.number().int().positive().optional(),
  contextStart: z.number().int().min(0).optional(),
  contextEnd: z.number().int().min(0).optional(),
  context: z.string().optional(),
  textStart: z.number().int().min(0),
  textEnd: z.number().int().min(0),
  description: z.string().default(''),
  tags: tagNames.default([]),
})

const updateBody = z.object({
  description: z.string().optional(),
  tags: tagNames.optional(),
})

const include = {
  tags: { orderBy: { name: 'asc' } },
  document: { select: { id: true, title: true } },
} satisfies Prisma.AnnotationInclude

function connectTags(projectId: number, names: string[]) {
  return names.map((name) => ({
    where: { projectId_name: { projectId, name } },
    create: { projectId, name },
  }))
}

export const annotationsRouter = Router({ mergeParams: true })

annotationsRouter.get('/', async (req, res) => {
  const { tags, tagMode, q, documentId, page } = listQuery.parse(req.query)

  const conditions: Prisma.AnnotationWhereInput[] = [
    { projectId: projectIdOf(res) },
  ]
  if (documentId) conditions.push({ documentId })
  if (tags.length > 0) {
    if (tagMode === 'and') {
      conditions.push(...tags.map((id) => ({ tags: { some: { id } } })))
    } else {
      conditions.push({ tags: { some: { id: { in: tags } } } })
    }
  }
  if (q) {
    conditions.push({
      OR: (['text', 'context', 'description'] as const).map((field) => ({
        [field]: { contains: q, mode: 'insensitive' },
      })),
    })
  }
  const where: Prisma.AnnotationWhereInput = { AND: conditions }

  const [items, total] = await prisma.$transaction([
    prisma.annotation.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.annotation.count({ where }),
  ])
  res.json({ items, total, page, pageSize: PAGE_SIZE })
})

annotationsRouter.post('/', async (req, res) => {
  const projectId = projectIdOf(res)
  const body = createBody.parse(req.body)

  let context: string
  let docRange: { contextStart: number; contextEnd: number } | null = null
  if (body.documentId) {
    const { contextStart, contextEnd } = body
    if (contextStart === undefined || contextEnd === undefined) {
      throw new HttpError(400, '缺少上下文範圍')
    }
    const document = await prisma.document.findFirst({
      where: { id: body.documentId, projectId },
      select: { content: true },
    })
    if (!document) throw new HttpError(404, '找不到這份文件')
    if (contextStart >= contextEnd || contextEnd > document.content.length) {
      throw new HttpError(400, '上下文範圍不正確')
    }
    context = document.content.slice(contextStart, contextEnd)
    docRange = { contextStart, contextEnd }
  } else {
    if (!body.context) throw new HttpError(400, '缺少上下文')
    context = body.context
  }

  const { textStart, textEnd } = body
  if (textStart >= textEnd || textEnd > context.length) {
    throw new HttpError(400, '標註範圍不正確')
  }

  const annotation = await prisma.annotation.create({
    data: {
      projectId,
      documentId: body.documentId,
      context,
      text: context.slice(textStart, textEnd),
      textStart,
      textEnd,
      ...(docRange && {
        ...docRange,
        docStart: docRange.contextStart + textStart,
        docEnd: docRange.contextStart + textEnd,
      }),
      description: body.description,
      tags: { connectOrCreate: connectTags(projectId, body.tags) },
    },
    include,
  })
  res.status(201).json(annotation)
})

annotationsRouter.patch('/:id', async (req, res) => {
  const projectId = projectIdOf(res)
  const { id } = idParams.parse(req.params)
  const body = updateBody.parse(req.body)

  const exists = await prisma.annotation.count({ where: { id, projectId } })
  if (!exists) throw new HttpError(404, '找不到這個標註')

  const annotation = await prisma.annotation.update({
    where: { id },
    data: {
      description: body.description,
      ...(body.tags && {
        tags: { set: [], connectOrCreate: connectTags(projectId, body.tags) },
      }),
    },
    include,
  })
  res.json(annotation)
})

annotationsRouter.delete('/:id', async (req, res) => {
  const { id } = idParams.parse(req.params)
  const { count } = await prisma.annotation.deleteMany({
    where: { id, projectId: projectIdOf(res) },
  })
  if (count === 0) throw new HttpError(404, '找不到這個標註')
  res.status(204).end()
})
