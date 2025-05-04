import express from "express"
import { newNoteSchema } from "../types";
import { Request, Response } from "express"
import { deleteEvent, pushToQueue, redisClient } from "../queue";
import { connectClients, wss } from "../socket";
import { prisma } from "../prisma";
import { insertEmbedding } from "@prisma/client/sql";
import { v4 as uuidv4 } from 'uuid';
import { generateEmbedding } from "../gemini";
import { generatePodcastPath } from "../podcast";

export const notesRouter = express.Router()

notesRouter.post('/newnote', async (req: Request, res: Response) => {
    try {
        const parsedBody = newNoteSchema.safeParse(req.body);
        // const currClientId = req.get("x-client-id");

        if (!parsedBody.success) {
            return res.status(400).json({
                error: 'Validation Error',
                details: parsedBody.error.errors,
            });
        }

        const { noteTitle, noteDescription } = parsedBody.data;

        const result = await prisma.note.create({
            data: {
                noteTitle: noteTitle,
                noteDescription: noteDescription,
                version: 1,
                syncStatus: "pending",
            }
        });

        const getEmbedding = await generateEmbedding(noteDescription);
        const embedding = `[${getEmbedding.embedding.values}]`;

        await prisma.$queryRawTyped(insertEmbedding(uuidv4(), result.noteid, embedding));

        // pushToQueue("CREATE", platform, result.noteid, noteTitle, noteDescription);

        // const message = JSON.stringify({
        //     type: 'sync',
        // });

        // wss.clients.forEach((client) => {
        //     if (client.readyState === WebSocket.OPEN){
        //         const clientId = connectClients.get(client);
        //         if (clientId !== currClientId) {
        //             client.send(message);
        //         }
        //     }
        // });

        return res.status(201).json(result);

    } catch (error) {
        console.error('Error creating new note:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while creating the note.',
        });
    }
});


notesRouter.get('/allnotes', async (req: Request, res: Response) => {
    try {
        const allNotes = await prisma.note.findMany();

        if (allNotes.length === 0) {
            return res.status(204).send(); // No Content, but request was successful
        }

        return res.status(200).json(allNotes);

    } catch (error) {
        console.error('Error retrieving all notes:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while retrieving the notes.',
        });
    }
});


notesRouter.put('/updatenote/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Wrong type of ID given.',
            });
        }

        const parsedBody = newNoteSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return res.status(400).json({
                error: 'Validation Error',
                details: parsedBody.error.errors,
            });
        }

        const updatedNote = await prisma.note.update({
            where: {
                noteid: id
            },
            data: {
                noteTitle: parsedBody.data.noteTitle,
                noteDescription: parsedBody.data.noteDescription,
            },
        });

        return res.status(200).json({
            message: 'Note updated successfully',
            updatedNote,
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            // Handle Prisma-specific error for "Record not found"
            return res.status(404).json({
                error: 'Not Found',
                message: `No note found with ID ${req.params.id}.`,
            });
        }

        console.error('Error updating note:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while updating the note.',
        });
    }
});


notesRouter.delete('/deletenote/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { platform } = req.body;
        const currClientId = req.get("x-client-id");

        // Validate the `id` parameter
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid note ID. Note ID must be a number.',
            });
        }

        const deletedNote = await prisma.note.delete({
            where: {
                noteid: id
            },
        });

        deleteEvent("DELETE", platform, deletedNote.noteid);

        const message = JSON.stringify({
            type: 'sync',
        });

        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN){
                const clientId = connectClients.get(client);
                if (clientId !== currClientId) {
                    client.send(message);
                }
            }
        });

        return res.status(200).json({
            message: 'Note deleted successfully',
            deletedNote,
        });

    } catch (error: any) {
        if (error.code === 'P2025') {
            // Prisma-specific error for "Record to delete does not exist"
            return res.status(404).json({
                error: 'Not Found',
                message: `No note found with ID ${req.params.id}.`,
            });
        }

        console.error('Error deleting note:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while deleting the note.',
        });
    }
});