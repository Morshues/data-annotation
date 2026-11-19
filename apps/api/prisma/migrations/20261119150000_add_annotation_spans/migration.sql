-- CreateTable
CREATE TABLE "AnnotationSpan" (
    "id" SERIAL NOT NULL,
    "annotationId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,
    "docStart" INTEGER,
    "docEnd" INTEGER,

    CONSTRAINT "AnnotationSpan_pkey" PRIMARY KEY ("id")
);

-- Move each existing annotation's single focus into a span
INSERT INTO "AnnotationSpan" ("annotationId", "text", "start", "end", "docStart", "docEnd")
SELECT "id", "text", "textStart", "textEnd", "docStart", "docEnd"
FROM "Annotation"
ORDER BY "id";

-- AlterTable
ALTER TABLE "Annotation" DROP COLUMN "docEnd",
DROP COLUMN "docStart",
DROP COLUMN "text",
DROP COLUMN "textEnd",
DROP COLUMN "textStart";

-- CreateIndex
CREATE INDEX "AnnotationSpan_annotationId_idx" ON "AnnotationSpan"("annotationId");

-- AddForeignKey
ALTER TABLE "AnnotationSpan" ADD CONSTRAINT "AnnotationSpan_annotationId_fkey" FOREIGN KEY ("annotationId") REFERENCES "Annotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
