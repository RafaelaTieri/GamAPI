/*
  Warnings:

  - You are about to drop the column `projectId` on the `Challenge` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[iri]` on the table `Challenge` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Challenge" DROP CONSTRAINT "Challenge_projectId_fkey";

-- DropIndex
DROP INDEX "Challenge_projectId_iri_key";

-- AlterTable
ALTER TABLE "Challenge" DROP COLUMN "projectId";

-- CreateTable
CREATE TABLE "ProjectChallenge" (
    "projectId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,

    CONSTRAINT "ProjectChallenge_pkey" PRIMARY KEY ("projectId","challengeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_iri_key" ON "Challenge"("iri");

-- AddForeignKey
ALTER TABLE "ProjectChallenge" ADD CONSTRAINT "ProjectChallenge_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectChallenge" ADD CONSTRAINT "ProjectChallenge_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
