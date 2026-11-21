import type { RequestHandler, Response } from 'express'
import { z } from 'zod'
import { userOf } from '../auth.js'
import { prisma } from '../db.js'
import type { ProjectRole } from '../generated/prisma/client.js'
import { HttpError } from '../http-error.js'

const projectParams = z.object({
  projectId: z.coerce.number().int().positive(),
})

// Checks that the signed-in user is a member of the project in the URL and
// stores the project id and role for the project-scoped routers below it.
// Viewers may only read.
export const loadProject: RequestHandler = async (req, res, next) => {
  const { projectId } = projectParams.parse(req.params)
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: userOf(res).id } },
  })
  // Same answer as a missing project, so others cannot tell it exists
  if (!member) throw new HttpError(404, '找不到這個專案')
  if (member.role === 'VIEWER' && req.method !== 'GET') {
    throw new HttpError(403, '沒有修改權限')
  }
  res.locals.projectId = projectId
  res.locals.projectRole = member.role
  next()
}

export function requireRole(...roles: ProjectRole[]): RequestHandler {
  return (_req, res, next) => {
    if (!roles.includes(projectRoleOf(res))) {
      throw new HttpError(403, '沒有權限')
    }
    next()
  }
}

export function projectIdOf(res: Response): number {
  return res.locals.projectId as number
}

export function projectRoleOf(res: Response): ProjectRole {
  return res.locals.projectRole as ProjectRole
}
