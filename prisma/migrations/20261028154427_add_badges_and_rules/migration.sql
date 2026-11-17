-- CreateEnum
CREATE TYPE "BadgeRuleType" AS ENUM ('POINTS_THRESHOLD', 'CHALLENGE_COMPLETED');

-- CreateEnum
CREATE TYPE "BadgeRuleOperator" AS ENUM ('ALL', 'ANY');

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iri" TEXT NOT NULL,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ruleOperator" "BadgeRuleOperator" NOT NULL DEFAULT 'ALL',
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeRule" (
    "id" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "type" "BadgeRuleType" NOT NULL,
    "requiredPoints" INTEGER,
    "challengeId" TEXT,

    CONSTRAINT "BadgeRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Badge_iri_key" ON "Badge"("iri");

-- CreateIndex
CREATE INDEX "Badge_projectId_idx" ON "Badge"("projectId");

-- CreateIndex
CREATE INDEX "BadgeRule_badgeId_idx" ON "BadgeRule"("badgeId");

-- CreateIndex
CREATE INDEX "BadgeRule_challengeId_idx" ON "BadgeRule"("challengeId");

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeRule" ADD CONSTRAINT "BadgeRule_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeRule" ADD CONSTRAINT "BadgeRule_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
