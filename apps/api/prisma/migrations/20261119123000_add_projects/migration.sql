-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- Existing data goes into a default project, created only when there is any
INSERT INTO "Project" ("name")
SELECT '預設專案'
WHERE EXISTS (SELECT 1 FROM "Document")
   OR EXISTS (SELECT 1 FROM "Annotation")
   OR EXISTS (SELECT 1 FROM "Tag");

-- AlterTable: add as nullable, backfill, then require
ALTER TABLE "Document" ADD COLUMN "projectId" INTEGER;
ALTER TABLE "Annotation" ADD COLUMN "projectId" INTEGER;
ALTER TABLE "Tag" ADD COLUMN "projectId" INTEGER;

UPDATE "Document" SET "projectId" = (SELECT min("id") FROM "Project");
UPDATE "Annotation" SET "projectId" = (SELECT min("id") FROM "Project");
UPDATE "Tag" SET "projectId" = (SELECT min("id") FROM "Project");

ALTER TABLE "Document" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "Annotation" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "Tag" ALTER COLUMN "projectId" SET NOT NULL;

-- Tag names are now unique per project
DROP INDEX "Tag_name_key";
CREATE UNIQUE INDEX "Tag_projectId_name_key" ON "Tag"("projectId", "name");

-- CreateIndex
CREATE INDEX "Annotation_projectId_idx" ON "Annotation"("projectId");

-- CreateIndex
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
