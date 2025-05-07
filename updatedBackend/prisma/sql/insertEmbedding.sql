INSERT INTO "Embedding" (id, "noteId", embedding, "createdAt")
VALUES ($1, $2, $3::vector, NOW());
