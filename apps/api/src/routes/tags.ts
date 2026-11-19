import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import type { Prisma } from '../generated/prisma/client.js'
import { HttpError } from '../http-error.js'
import { projectIdOf } from './project-scope.js'

const idParams = z.object({ id: z.coerce.number().int().positive() })

const updateBody = z.object({
  description: z.string().max(2000),
})

const include = {
  _count: { select: { annotations: true } },
} satisfies Prisma.TagInclude

function withCount({
  _count,
  ...tag
}: Prisma.TagGetPayload<{ include: typeof include }>) {
  return { ...tag, annotationCount: _count.annotations }
}

export const tagsRouter = Router({ mergeParams: true })

tagsRouter.get('/', async (_req, res) => {
  const tags = await prisma.tag.findMany({
    where: { projectId: projectIdOf(res) },
    include,
    orderBy: { name: 'asc' },
  })
  res.json(tags.map(withCount))
})

tagsRouter.patch('/:id', async (req, res) => {
  const { id } = idParams.parse(req.params)
  const body = updateBody.parse(req.body)

  const exists = await prisma.tag.count({
    where: { id, projectId: projectIdOf(res) },
  })
  if (!exists) throw new HttpError(404, '找不到這個標籤')

  const tag = await prisma.tag.update({
    where: { id },
    data: { description: body.description },
    include,
  })
  res.json(withCount(tag))
})
