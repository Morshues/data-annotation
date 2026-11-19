import express, { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import type { Prisma } from '../generated/prisma/client.js'
import { annotationsRouter } from './annotations.js'
import { documentsRouter } from './documents.js'
import { loadProject, projectIdOf } from './project-scope.js'
import { tagGroupsRouter } from './tag-groups.js'
import { tagsRouter } from './tags.js'

const name = z.string().trim().min(1).max(100)
const description = z.string().max(2000)

const createBody = z.object({ name, description: description.default('') })
const updateBody = z.object({
  name: name.optional(),
  description: description.optional(),
})

const include = {
  _count: { select: { documents: true, annotations: true } },
} satisfies Prisma.ProjectInclude

export const projectsRouter = Router()

projectsRouter.use('/:projectId', loadProject)
// Mounted before the JSON parser below because it parses its own larger
// bodies (pasted document text)
projectsRouter.use('/:projectId/documents', documentsRouter)

projectsRouter.use(express.json({ limit: '1mb' }))
projectsRouter.use('/:projectId/annotations', annotationsRouter)
projectsRouter.use('/:projectId/tags', tagsRouter)
projectsRouter.use('/:projectId/tag-groups', tagGroupsRouter)

projectsRouter.get('/', async (_req, res) => {
  const projects = await prisma.project.findMany({
    include,
    orderBy: { createdAt: 'asc' },
  })
  res.json(projects)
})

projectsRouter.post('/', async (req, res) => {
  const body = createBody.parse(req.body)
  const project = await prisma.project.create({ data: body, include })
  res.status(201).json(project)
})

projectsRouter.patch('/:projectId', async (req, res) => {
  const body = updateBody.parse(req.body)
  const project = await prisma.project.update({
    where: { id: projectIdOf(res) },
    data: body,
    include,
  })
  res.json(project)
})
