import express, { type CookieOptions, Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { z } from 'zod'
import {
  findSessionUser,
  hashToken,
  newSessionToken,
  readSessionCookie,
  SESSION_COOKIE,
  SESSION_DAYS,
} from '../auth.js'
import { prisma } from '../db.js'
import type { User } from '../generated/prisma/client.js'
import { HttpError } from '../http-error.js'

const googleClientId = process.env.GOOGLE_CLIENT_ID || null
const googleClient = new OAuth2Client()

const loginBody = z.object({ credential: z.string().min(1) })

function publicUser(user: User) {
  const { id, email, name, picture } = user
  return { id, email, name, picture }
}

function cookieOptions(secure: boolean): CookieOptions {
  // Only the API reads the cookie
  return { httpOnly: true, sameSite: 'lax', secure, path: '/api' }
}

// Verifies a Google ID token and returns the account it belongs to
async function verifyGoogleToken(credential: string) {
  if (!googleClientId) throw new HttpError(503, '尚未設定 Google 登入')
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    })
    const payload = ticket.getPayload()
    if (payload?.email && payload.email_verified) return payload
  } catch {
    // Treated the same as an unverified account below
  }
  throw new HttpError(401, 'Google 登入驗證失敗')
}

export const authRouter = Router()

authRouter.use(express.json())

authRouter.get('/config', (_req, res) => {
  res.json({ googleClientId })
})

authRouter.get('/me', async (req, res) => {
  const user = await findSessionUser(req)
  if (!user) throw new HttpError(401, '請先登入')
  res.json(publicUser(user))
})

authRouter.post('/google', async (req, res) => {
  const { credential } = loginBody.parse(req.body)
  const payload = await verifyGoogleToken(credential)
  const profile = {
    email: payload.email!,
    name: payload.name ?? '',
    picture: payload.picture ?? '',
  }
  const user = await prisma.user.upsert({
    where: { googleId: payload.sub },
    create: { googleId: payload.sub, ...profile },
    update: profile,
  })

  const token = newSessionToken()
  const maxAge = SESSION_DAYS * 24 * 60 * 60 * 1000
  await prisma.session.create({
    data: {
      id: hashToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + maxAge),
    },
  })
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(req.secure), maxAge })
  res.json(publicUser(user))
})

authRouter.post('/logout', async (req, res) => {
  const token = readSessionCookie(req)
  if (token) {
    await prisma.session.deleteMany({ where: { id: hashToken(token) } })
  }
  res.clearCookie(SESSION_COOKIE, cookieOptions(req.secure))
  res.status(204).end()
})
