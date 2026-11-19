import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import type { Prisma } from '../generated/prisma/client.js'
import { HttpError } from '../http-error.js'
import { projectIdOf } from './project-scope.js'
import { assertTagGroup } from './tag-groups.js'

const idParams = z.object({ id: z.coerce.number().int().positive() })

const description = z.string().max(2000)
const groupId = z.number().int().positive().nullable()

const createBody = z.object({
  name: z.string().trim().min(1).max(100),
  description: description.default(''),
  groupId: groupId.default(null),
})

const updateBody = z.object({
  description: description.optional(),
  groupId: groupId.optional(),
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

tagsRouter.post('/', async (req, res) => {
  const projectId = projectIdOf(res)
  const body = createBody.parse(req.body)
  if (body.groupId !== null) await assertTagGroup(projectId, body.groupId)

  const tag = await prisma.tag.create({
    data: { ...body, projectId },
    include,
  })
  res.status(201).json(withCount(tag))
})

tagsRouter.patch('/:id', async (req, res) => {
  const projectId = projectIdOf(res)
  const { id } = idParams.parse(req.params)
  const body = updateBody.parse(req.body)

  const exists = await prisma.tag.count({ where: { id, projectId } })
  if (!exists) throw new HttpError(404, '找不到這個標籤')
  if (body.groupId) await assertTagGroup(projectId, body.groupId)

  const tag = await prisma.tag.update({
    where: { id },
    data: body,
    include,
  })
  res.json(withCount(tag))
})
