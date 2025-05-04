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
exports.aiRouter = void 0;
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../prisma");
const gemini_1 = require("../gemini");
const sql_1 = require("@prisma/client/sql");
const podcast_1 = require("../podcast");
exports.aiRouter = express_1.default.Router();
exports.aiRouter.post("/summarize/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const note = yield prisma_1.prisma.note.findUnique({
        where: {
            noteid: id
        }
    });
    if (!note) {
        return res.status(404).json({ error: "Note not found" });
    }
    const summarizedNote = yield (0, gemini_1.generateSummary)(note.noteDescription);
    res.json({
        summary: summarizedNote.response.text()
    });
}));
exports.aiRouter.post("/ask", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { question } = req.body;
    if (!question) {
        return res.status(400).json({ error: "Question is required" });
    }
    const questionEmbedding = yield (0, gemini_1.generateEmbedding)(question);
    const similarNotes = yield prisma_1.prisma.$queryRawTyped((0, sql_1.getSimilarNodes)(`[${questionEmbedding.embedding.values.join(",")}]`));
    const context = getContextFromNotes(similarNotes);
    console.log(similarNotes);
    const RAGresponse = yield (0, gemini_1.generateRAGResponse)(question, context);
    res.status(200).json({
        response: RAGresponse.response.text()
    });
}));
exports.aiRouter.post("/podcastify", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { noteId } = req.body;
    if (!noteId) {
        return res.status(400).json({ error: "Note ID is required" });
    }
    const podcastPath = yield (0, podcast_1.generatePodcastPath)(noteId);
    const updatedNote = yield prisma_1.prisma.note.update({
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
}));
// helper functions
function getContextFromNotes(notes) {
    if (!notes || notes.length === 0) {
        return "No relevant information found.";
    }
    return notes.map(note => note.noteDescription).join("\n");
}
