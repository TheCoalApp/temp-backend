-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "Note" (
    "noteid" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "noteTitle" TEXT NOT NULL,
    "noteDescription" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tags" TEXT[],

    CONSTRAINT "Note_pkey" PRIMARY KEY ("noteid")
);

-- CreateTable
CREATE TABLE "Embedding" (
    "embeddingid" TEXT NOT NULL,
    "noteid" TEXT NOT NULL,
    "embedding" vector(768),
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("embeddingid")
);

-- CreateIndex
CREATE UNIQUE INDEX "Embedding_noteid_key" ON "Embedding"("noteid");

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_noteid_fkey" FOREIGN KEY ("noteid") REFERENCES "Note"("noteid") ON DELETE RESTRICT ON UPDATE CASCADE;
