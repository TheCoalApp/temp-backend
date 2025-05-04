-- SELECT * FROM Notes 
-- WHERE id IN (
--     SELECT note_id FROM Embeddings 
--     ORDER BY embedding <=> $1 
--     LIMIT 5
-- );

-- SELECT n.*
-- FROM "Embedding" e
-- JOIN "Note" n 
-- ON e."noteid" = n."noteid"
-- ORDER BY e.embedding <=> $1::vector
-- LIMIT 5;

SELECT n.* 
FROM "Embedding" e 
JOIN "Note" n  
ON e."noteid" = n."noteid" 
WHERE (e.embedding <=> $1::vector) <= 0.5
ORDER BY e.embedding <=> $1::vector 
LIMIT 10;


-- min (of the max notes, and a certain % of my notes)