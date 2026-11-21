import express, { Router } from 'express'
import { z } from 'zod'
import { userOf } from '../auth.js'
import { prisma } from '../db.js'
import type { Prisma, ProjectRole } from '../generated/prisma/client.js'
import { annotationsRouter } from './annotations.js'
import { documentsRouter } from './documents.js'
import { importsRouter } from './imports.js'
import {
  loadProject,
  projectIdOf,
  projectRoleOf,
  requireRole,
} from './project-scope.js'
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

type ProjectWithCounts = Prisma.ProjectGetPayload<{ include: typeof include }>

// The caller's role tells the client what it may do with the project
function withRole(project: ProjectWithCounts, role: ProjectRole) {
  return { ...project, role }
}

export const projectsRouter = Router()

projectsRouter.use('/:projectId', loadProject)
// Mounted before the JSON parser below because they parse their own larger
// bodies (pasted document text, imported tables)
projectsRouter.use('/:projectId/documents', documentsRouter)
projectsRouter.use('/:projectId/imports', importsRouter)

projectsRouter.use(express.json({ limit: '1mb' }))
projectsRouter.use('/:projectId/annotations', annotationsRouter)
projectsRouter.use('/:projectId/tags', tagsRouter)
projectsRouter.use('/:projectId/tag-groups', tagGroupsRouter)

projectsRouter.get('/', async (_req, res) => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId: userOf(res).id },
    include: { project: { include } },
    orderBy: { project: { createdAt: 'asc' } },
  })
  res.json(memberships.map((m) => withRole(m.project, m.role)))
})

projectsRouter.post('/', async (req, res) => {
  const body = createBody.parse(req.body)
  const project = await prisma.project.create({
    data: {
      ...body,
      members: { create: { userId: userOf(res).id, role: 'OWNER' } },
    },
    include,
  })
  res.status(201).json(withRole(project, 'OWNER'))
})

projectsRouter.patch('/:projectId', requireRole('OWNER'), async (req, res) => {
  const body = updateBody.parse(req.body)
  const project = await prisma.project.update({
    where: { id: projectIdOf(res) },
    data: body,
    include,
  })
  res.json(withRole(project, projectRoleOf(res)))
})
