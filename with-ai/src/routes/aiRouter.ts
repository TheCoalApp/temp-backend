import express, { Request, response, Response } from "express"
import { prisma } from "../prisma"
import { generateEmbedding, generatePodcastScript, generateRAGResponse, generateSummary } from "../gemini";
import { getSimilarNodes } from "@prisma/client/sql";
import { generatePodcastPath } from "../podcast";

export const aiRouter = express.Router()

aiRouter.post("/summarize/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const note = await prisma.note.findUnique({
        where: {
            noteid: id
        }
    });

    if (!note) {
        return res.status(404).json({ error: "Note not found" });
    }

    const summarizedNote = await generateSummary(note.noteDescription);

    res.json({
        summary: summarizedNote.response.text()
    });
})

aiRouter.post("/ask", async (req: Request, res: Response) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ error: "Question is required" });
    }

    const questionEmbedding = await generateEmbedding(question);
    const similarNotes = await prisma.$queryRawTyped(getSimilarNodes(`[${questionEmbedding.embedding.values.join(",")}]`));
    const context = getContextFromNotes(similarNotes);

    console.log(similarNotes)

    const RAGresponse = await generateRAGResponse(question, context);


    res.status(200).json({
        response: RAGresponse.response.text()
    });
})

aiRouter.post("/podcastify", async (req: Request, res: Response) => {
    const { noteId } = req.body

    if (!noteId) {
        return res.status(400).json({ error: "Note ID is required" });
    }

    const podcastPath = await generatePodcastPath(noteId);
    
    const updatedNote = await prisma.note.update({
        where: { 
            noteid: noteId
        },
        data: {
            podcastPath: podcastPath
        },
    });
    

    res.status(200).json({
        audioUrl: podcastPath
    });
})


// helper functions

function getContextFromNotes(notes: any[]) {
    if (!notes || notes.length === 0) {
        return "No relevant information found.";
    }
    return notes.map(note => note.noteDescription).join("\n");
}