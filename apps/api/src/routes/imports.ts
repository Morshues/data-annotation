import express, { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { HttpError } from '../http-error.js'
import { buildSpans, spansInput } from './annotations.js'
import { projectIdOf } from './project-scope.js'

const MAX_ANNOTATIONS = 5000

const tagRef = z.object({
  group: z.string().trim().min(1).max(100).nullable(),
  name: z.string().trim().min(1).max(100),
})

// Rows already mapped and span-matched by the client; the server checks the
// spans against each context and resolves documents, groups and tags.
const importBody = z.object({
  annotations: z
    .array(
      z.object({
        source: z.string().trim().max(200).default(''),
        context: z.string().min(1),
        spans: spansInput,
        tags: z.array(tagRef).max(50).default([]),
        description: z.string().default(''),
      }),
    )
    .min(1)
    .max(MAX_ANNOTATIONS),
})

export const importsRouter = Router({ mergeParams: true })

// Parses its own JSON since a whole table is larger than the default limit
importsRouter.post(
  '/annotations',
  express.json({ limit: '20mb' }),
  async (req, res) => {
    const projectId = projectIdOf(res)
    const { annotations } = importBody.parse(req.body)

    const result = await prisma.$transaction(
      async (tx) => {
        // Documents whose title matches a source; the oldest wins on duplicates
        const sources = [
          ...new Set(annotations.map((a) => a.source).filter(Boolean)),
        ]
        const documents = await tx.document.findMany({
          where: { projectId, title: { in: sources } },
          select: { id: true, title: true, content: true },
          orderBy: { id: 'asc' },
        })
        const documentByTitle = new Map<string, (typeof documents)[number]>()
        for (const d of documents) {
          if (!documentByTitle.has(d.title)) documentByTitle.set(d.title, d)
        }

        // Groups by name, created when missing
        const groupNames = [
          ...new Set(
            annotations.flatMap((a) =>
              a.tags.flatMap((t) => (t.group ? [t.group] : [])),
            ),
          ),
        ]
        const existingGroups = await tx.tagGroup.findMany({
          where: { projectId, name: { in: groupNames } },
        })
        const groupIdByName = new Map(existingGroups.map((g) => [g.name, g.id]))
        const createdGroups: string[] = []
        for (const name of groupNames) {
          if (groupIdByName.has(name)) continue
          const group = await tx.tagGroup.create({ data: { projectId, name } })
          groupIdByName.set(name, group.id)
          createdGroups.push(name)
        }

        // Tags by name; the first group given for a name wins. Existing
        // ungrouped tags join that group, grouped ones keep theirs.
        const groupOfTag = new Map<string, string | null>()
        for (const t of annotations.flatMap((a) => a.tags)) {
          if (!groupOfTag.has(t.name) || groupOfTag.get(t.name) === null) {
            groupOfTag.set(t.name, t.group)
          }
        }
        const existingTags = await tx.tag.findMany({
          where: { projectId, name: { in: [...groupOfTag.keys()] } },
        })
        const tagIdByName = new Map(existingTags.map((t) => [t.name, t.id]))
        for (const tag of existingTags) {
          const group = groupOfTag.get(tag.name)
          if (tag.groupId === null && group) {
            await tx.tag.update({
              where: { id: tag.id },
              data: { groupId: groupIdByName.get(group) },
            })
          }
        }
        const createdTags: string[] = []
        for (const [name, group] of groupOfTag) {
          if (tagIdByName.has(name)) continue
          const tag = await tx.tag.create({
            data: {
              projectId,
              name,
              groupId: group ? groupIdByName.get(group) : null,
            },
          })
          tagIdByName.set(name, tag.id)
          createdTags.push(name)
        }

        let linkedToDocument = 0
        let unpositioned = 0
        for (const [index, a] of annotations.entries()) {
          const document = documentByTitle.get(a.source)
          let contextStart: number | null = null
          if (document) {
            linkedToDocument++
            const found = document.content.indexOf(a.context)
            if (found >= 0) contextStart = found
            else unpositioned++
          }

          let spans
          try {
            spans = buildSpans(a.context, contextStart, a.spans)
          } catch (err) {
            if (err instanceof HttpError) {
              throw new HttpError(400, `第 ${index + 1} 筆：${err.message}`)
            }
            throw err
          }

          const tagIds = [
            ...new Set(a.tags.map((t) => tagIdByName.get(t.name)!)),
          ]
          await tx.annotation.create({
            data: {
              projectId,
              documentId: document?.id,
              source: a.source,
              context: a.context,
              ...(contextStart !== null && {
                contextStart,
                contextEnd: contextStart + a.context.length,
              }),
              spans: { create: spans },
              description: a.description,
              tags: { connect: tagIds.map((id) => ({ id })) },
            },
          })
        }

        return {
          created: annotations.length,
          linkedToDocument,
          unpositioned,
          createdGroups,
          createdTags,
        }
      },
      { timeout: 60_000 },
    )

    res.status(201).json(result)
  },
)
