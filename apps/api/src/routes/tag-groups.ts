import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { HttpError } from '../http-error.js'
import { projectIdOf } from './project-scope.js'

const idParams = z.object({ id: z.coerce.number().int().positive() })

const name = z.string().trim().min(1).max(100)
const description = z.string().max(2000)

const createBody = z.object({ name, description: description.default('') })
const updateBody = z.object({
  name: name.optional(),
  description: description.optional(),
})

// Throws 404 unless the group exists in the project
export async function assertTagGroup(projectId: number, id: number) {
  const exists = await prisma.tagGroup.count({ where: { id, projectId } })
  if (!exists) throw new HttpError(404, '找不到這個群組')
}

export const tagGroupsRouter = Router({ mergeParams: true })

tagGroupsRouter.get('/', async (_req, res) => {
  const groups = await prisma.tagGroup.findMany({
    where: { projectId: projectIdOf(res) },
    orderBy: { name: 'asc' },
  })
  res.json(groups)
})

tagGroupsRouter.post('/', async (req, res) => {
  const body = createBody.parse(req.body)
  const group = await prisma.tagGroup.create({
    data: { ...body, projectId: projectIdOf(res) },
  })
  res.status(201).json(group)
})

tagGroupsRouter.patch('/:id', async (req, res) => {
  const { id } = idParams.parse(req.params)
  const body = updateBody.parse(req.body)
  await assertTagGroup(projectIdOf(res), id)

  const group = await prisma.tagGroup.update({ where: { id }, data: body })
  res.json(group)
})

// Tags in the group become ungrouped (onDelete: SetNull)
tagGroupsRouter.delete('/:id', async (req, res) => {
  const { id } = idParams.parse(req.params)
  const { count } = await prisma.tagGroup.deleteMany({
    where: { id, projectId: projectIdOf(res) },
  })
  if (count === 0) throw new HttpError(404, '找不到這個群組')
  res.status(204).end()
})
