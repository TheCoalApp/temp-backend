UPDATE "Embedding"
SET embedding = $1::vector, "createdAt" = NOW()
WHERE "noteId" = $2;
