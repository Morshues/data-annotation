import { Router } from 'express'
import { prisma } from '../db.js'

export const tagsRouter = Router()

tagsRouter.get('/', async (_req, res) => {
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { annotations: true } } },
    orderBy: { name: 'asc' },
  })
  res.json(
    tags.map(({ _count, ...tag }) => ({
      ...tag,
      annotationCount: _count.annotations,
    })),
  )
})
