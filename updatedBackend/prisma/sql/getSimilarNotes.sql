
SELECT n.* 
FROM "Embedding" e 
JOIN "Note" n  
ON e."id" = n."id" 
WHERE (e.embedding <=> $1::vector) <= 0.5
ORDER BY e.embedding <=> $1::vector 
LIMIT 10;


-- min (of the max notes, and a certain % of my notes)