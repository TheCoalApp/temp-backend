/*
  Warnings:

  - You are about to drop the column `podcastUrl` on the `Note` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Note" DROP COLUMN "podcastUrl",
ADD COLUMN     "podcastPath" TEXT;
