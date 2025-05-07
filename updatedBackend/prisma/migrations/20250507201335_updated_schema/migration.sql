/*
  Warnings:

  - You are about to drop the column `createdat` on the `Embedding` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Embedding" DROP COLUMN "createdat",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
