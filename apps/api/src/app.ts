import express from 'express'
import { prisma } from './db.js'

export const app = express()

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'ok' })
  } catch (err) {
    console.error('Database health check failed:', err)
    res.status(503).json({ status: 'ok', database: 'error' })
  }
})
