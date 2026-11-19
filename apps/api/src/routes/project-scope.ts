import type { RequestHandler, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { HttpError } from '../http-error.js'

const projectParams = z.object({
  projectId: z.coerce.number().int().positive(),
})

// Checks that the project in the URL exists and stores its id for the
// project-scoped routers below it.
export const loadProject: RequestHandler = async (req, res, next) => {
  const { projectId } = projectParams.parse(req.params)
  const exists = await prisma.project.count({ where: { id: projectId } })
  if (!exists) throw new HttpError(404, '找不到這個專案')
  res.locals.projectId = projectId
  next()
}

export function projectIdOf(res: Response): number {
  return res.locals.projectId as number
}
