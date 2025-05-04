import { z } from "zod";

export const newNoteSchema = z.object({
    noteTitle: z.string().min(1, 'Note title is required'),
    noteDescription: z.string().min(1, 'Note description is required'),
});