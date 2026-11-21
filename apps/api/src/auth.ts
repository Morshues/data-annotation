import { createHash, randomBytes } from 'node:crypto'
import type { Request, RequestHandler, Response } from 'express'
import { prisma } from './db.js'
import type { User } from './generated/prisma/client.js'
import { HttpError } from './http-error.js'

export const SESSION_COOKIE = 'session'
export const SESSION_DAYS = 30

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export function readSessionCookie(req: Request): string | null {
  for (const part of req.headers.cookie?.split(';') ?? []) {
    const [name, ...value] = part.trim().split('=')
    if (name === SESSION_COOKIE) return decodeURIComponent(value.join('='))
  }
  return null
}

export async function findSessionUser(req: Request): Promise<User | null> {
  const token = readSessionCookie(req)
  if (!token) return null
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  })
  if (!session || session.expiresAt <= new Date()) return null
  return session.user
}

export const requireUser: RequestHandler = async (req, res, next) => {
  const user = await findSessionUser(req)
  if (!user) throw new HttpError(401, '請先登入')
  res.locals.user = user
  next()
}

export function userOf(res: Response): User {
  return res.locals.user as User
}
