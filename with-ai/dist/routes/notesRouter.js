"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notesRouter = void 0;
const express_1 = __importDefault(require("express"));
const types_1 = require("../types");
const queue_1 = require("../queue");
const socket_1 = require("../socket");
const prisma_1 = require("../prisma");
const sql_1 = require("@prisma/client/sql");
const uuid_1 = require("uuid");
const gemini_1 = require("../gemini");
exports.notesRouter = express_1.default.Router();
exports.notesRouter.post('/newnote', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parsedBody = types_1.newNoteSchema.safeParse(req.body);
        // const currClientId = req.get("x-client-id");
        if (!parsedBody.success) {
            return res.status(400).json({
                error: 'Validation Error',
                details: parsedBody.error.errors,
            });
        }
        const { noteTitle, noteDescription } = parsedBody.data;
        const result = yield prisma_1.prisma.note.create({
            data: {
                noteTitle: noteTitle,
                noteDescription: noteDescription,
                version: 1,
                syncStatus: "pending",
            }
        });
        const getEmbedding = yield (0, gemini_1.generateEmbedding)(noteDescription);
        const embedding = `[${getEmbedding.embedding.values}]`;
        yield prisma_1.prisma.$queryRawTyped((0, sql_1.insertEmbedding)((0, uuid_1.v4)(), result.noteid, embedding));
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
    }
    catch (error) {
        console.error('Error creating new note:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while creating the note.',
        });
    }
}));
exports.notesRouter.get('/allnotes', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allNotes = yield prisma_1.prisma.note.findMany();
        if (allNotes.length === 0) {
            return res.status(204).send(); // No Content, but request was successful
        }
        return res.status(200).json(allNotes);
    }
    catch (error) {
        console.error('Error retrieving all notes:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while retrieving the notes.',
        });
    }
}));
exports.notesRouter.put('/updatenote/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Wrong type of ID given.',
            });
        }
        const parsedBody = types_1.newNoteSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return res.status(400).json({
                error: 'Validation Error',
                details: parsedBody.error.errors,
            });
        }
        const updatedNote = yield prisma_1.prisma.note.update({
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
    }
    catch (error) {
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
}));
exports.notesRouter.delete('/deletenote/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const deletedNote = yield prisma_1.prisma.note.delete({
            where: {
                noteid: id
            },
        });
        (0, queue_1.deleteEvent)("DELETE", platform, deletedNote.noteid);
        const message = JSON.stringify({
            type: 'sync',
        });
        socket_1.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                const clientId = socket_1.connectClients.get(client);
                if (clientId !== currClientId) {
                    client.send(message);
                }
            }
        });
        return res.status(200).json({
            message: 'Note deleted successfully',
            deletedNote,
        });
    }
    catch (error) {
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
}));
