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

// Span offsets within the context, sorted and checked for overlaps
export const spansInput = z
  .array(
    z.object({
      start: z.number().int().min(0),
      end: z.number().int().min(0),
    }),
  )
  .min(1)
  .max(50)
  .transform((spans) => [...spans].sort((a, b) => a.start - b.start))
  .superRefine((spans, ctx) => {
    spans.forEach((span, i) => {
      if (span.start >= span.end || (i > 0 && span.start < spans[i - 1].end)) {
        ctx.addIssue({ code: 'custom', message: '標註範圍不正確' })
      }
    })
  })

type SpanInput = z.infer<typeof spansInput>[number]

// Offsets: context range in the document, spans within the context.
// With documentId the context is taken from the document; without it the
// context text must be given directly.
const createBody = z.object({
  documentId: z.number().int().positive().optional(),
  contextStart: z.number().int().min(0).optional(),
  contextEnd: z.number().int().min(0).optional(),
  context: z.string().optional(),
  spans: spansInput,
  description: z.string().default(''),
  tags: tagNames.default([]),
})

const updateBody = z.object({
  spans: spansInput.optional(),
  description: z.string().optional(),
  tags: tagNames.optional(),
})

const include = {
  spans: { orderBy: { start: 'asc' } },
  tags: { orderBy: { name: 'asc' } },
  document: { select: { id: true, title: true } },
} satisfies Prisma.AnnotationInclude

function connectTags(projectId: number, names: string[]) {
  return names.map((name) => ({
    where: { projectId_name: { projectId, name } },
    create: { projectId, name },
  }))
}

// Snapshots each span's text, and maps it into the document when the context
// came from one
export function buildSpans(
  context: string,
  contextStart: number | null,
  spans: SpanInput[],
) {
  if (spans.some((span) => span.end > context.length)) {
    throw new HttpError(400, '標註範圍不正確')
  }
  return spans.map(({ start, end }) => ({
    text: context.slice(start, end),
    start,
    end,
    ...(contextStart !== null && {
      docStart: contextStart + start,
      docEnd: contextStart + end,
    }),
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
      OR: (['context', 'description', 'source'] as const).map((field) => ({
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

  const spans = buildSpans(context, docRange?.contextStart ?? null, body.spans)

  const annotation = await prisma.annotation.create({
    data: {
      projectId,
      documentId: body.documentId,
      context,
      ...docRange,
      spans: { create: spans },
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

  const current = await prisma.annotation.findFirst({
    where: { id, projectId },
    select: { context: true, contextStart: true },
  })
  if (!current) throw new HttpError(404, '找不到這個標註')

  const annotation = await prisma.annotation.update({
    where: { id },
    data: {
      ...(body.spans && {
        spans: {
          deleteMany: {},
          create: buildSpans(current.context, current.contextStart, body.spans),
        },
      }),
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
