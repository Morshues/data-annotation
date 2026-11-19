/*
  Warnings:

  - You are about to drop the column `note` on the `Annotation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Annotation" DROP COLUMN "note";

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '';
