-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "podcastPath" TEXT;

-- CreateTable
CREATE TABLE "Embedding" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "embedding" vector(768),
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Embedding_noteId_key" ON "Embedding"("noteId");

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_id_fkey" FOREIGN KEY ("id") REFERENCES "Note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
