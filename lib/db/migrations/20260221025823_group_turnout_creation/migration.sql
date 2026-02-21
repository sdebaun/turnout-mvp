-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('PHYSICAL', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "TurnoutStatus" AS ENUM ('UPCOMING', 'CANCELED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationType" "LocationType" NOT NULL DEFAULT 'PHYSICAL',
    "formattedAddress" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "placeId" TEXT,
    "meetingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mission" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "about" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupOrganizer" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupOrganizer_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "Turnout" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "groupId" TEXT NOT NULL,
    "primaryLocationId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "TurnoutStatus" NOT NULL DEFAULT 'UPCOMING',
    "recurrenceRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Turnout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "turnoutId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "meetingLocationId" TEXT,
    "meetingTime" TIMESTAMP(3),
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupOrganizer_groupId_idx" ON "GroupOrganizer"("groupId");

-- CreateIndex
CREATE INDEX "GroupOrganizer_userId_idx" ON "GroupOrganizer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Turnout_slug_key" ON "Turnout"("slug");

-- CreateIndex
CREATE INDEX "Turnout_groupId_idx" ON "Turnout"("groupId");

-- CreateIndex
CREATE INDEX "Turnout_startsAt_idx" ON "Turnout"("startsAt");

-- CreateIndex
CREATE INDEX "Opportunity_turnoutId_idx" ON "Opportunity"("turnoutId");

-- AddForeignKey
ALTER TABLE "GroupOrganizer" ADD CONSTRAINT "GroupOrganizer_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupOrganizer" ADD CONSTRAINT "GroupOrganizer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turnout" ADD CONSTRAINT "Turnout_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turnout" ADD CONSTRAINT "Turnout_primaryLocationId_fkey" FOREIGN KEY ("primaryLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turnout" ADD CONSTRAINT "Turnout_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_turnoutId_fkey" FOREIGN KEY ("turnoutId") REFERENCES "Turnout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_meetingLocationId_fkey" FOREIGN KEY ("meetingLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
