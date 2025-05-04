INSERT INTO "Embedding" (embeddingId, noteId, embedding, createdAt)
VALUES ($1, $2, $3::vector, NOW());
