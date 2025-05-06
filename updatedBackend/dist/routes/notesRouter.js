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
const express_validator_1 = require("express-validator");
const types_1 = require("../types");
const client_1 = require("@prisma/client");
const queue_1 = require("../queue");
const socket_1 = require("../socket");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
exports.notesRouter = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in .env");
}
// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
    if (!token)
        return res.status(401).json({ error: "Unauthorized" });
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err)
            return res.status(403).json({ error: "Forbidden" });
        req.user = user;
        next();
    });
};
// Validation middleware to handle errors
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: "Validation Error",
            details: errors.array(),
        });
    }
    next();
};
// Login endpoint
exports.notesRouter.post("/login", [
    (0, express_validator_1.body)("username").trim().notEmpty().withMessage("Username is required").isString().withMessage("Username must be a string"),
    (0, express_validator_1.body)("password").trim().notEmpty().withMessage("Password is required").isString().withMessage("Password must be a string"),
    validate
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    const user = yield prisma.user.findUnique({ where: { username } });
    if (!user || !bcryptjs_1.default.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jsonwebtoken_1.default.sign({ username: user.username }, JWT_SECRET, {
        expiresIn: "1h",
    });
    res.json({ token });
}));
// Register endpoint
exports.notesRouter.post("/register", [
    (0, express_validator_1.body)("username").trim().notEmpty().withMessage("Username is required").isString().withMessage("Username must be a string").isLength({ min: 3, max: 50 }).withMessage("Username must be between 3 and 50 characters"),
    (0, express_validator_1.body)("password").trim().notEmpty().withMessage("Password is required").isString().withMessage("Password must be a string").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    validate
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    const hashedPassword = bcryptjs_1.default.hashSync(password, 10);
    try {
        const user = yield prisma.user.create({
            data: { username, password: hashedPassword },
        });
        const token = jsonwebtoken_1.default.sign({ username: user.username }, JWT_SECRET, {
            expiresIn: "1h",
        });
        res.status(201).json({ token });
    }
    catch (error) {
        res.status(409).json({ error: "Username already exists" });
    }
}));
// Create a new note
exports.notesRouter.post("/newnote", authenticateToken, [
    (0, express_validator_1.body)("platform").trim().notEmpty().withMessage("Platform is required").isString().withMessage("Platform must be a string"),
    (0, express_validator_1.body)("noteTitle").trim().notEmpty().withMessage("Note title is required").isString().withMessage("Note title must be a string").isLength({ max: 100 }).withMessage("Note title must be at most 100 characters"),
    (0, express_validator_1.body)("noteDescription").trim().notEmpty().withMessage("Note description is required").isString().withMessage("Note description must be a string"),
    (0, express_validator_1.body)("tag").optional().trim().isString().withMessage("Tag must be a string").isLength({ max: 50 }).withMessage("Tag must be at most 50 characters"),
    validate
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parsedBody = types_1.newNoteSchema.safeParse(req.body);
        const currClientId = req.get("x-client-id");
        const user = req.user; // Non-null assertion since middleware ensures it
        if (!parsedBody.success) {
            return res.status(400).json({
                error: "Validation Error",
                details: parsedBody.error.errors,
            });
        }
        const { platform, noteTitle, noteDescription, tag } = parsedBody.data;
        const result = yield prisma.note.create({
            data: {
                noteTitle,
                noteDescription,
                tag,
                syncStatus: "pending",
                user: { connect: { username: user.username } },
            },
        });
        (0, queue_1.pushToQueue)("CREATE", platform, result.id, noteTitle, noteDescription);
        const message = JSON.stringify({ type: "sync" });
        socket_1.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                const clientId = socket_1.connectClients.get(client);
                if (clientId !== currClientId) {
                    client.send(message);
                }
            }
        });
        return res.status(201).json(result);
    }
    catch (error) {
        console.error("Error creating new note:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: "An unexpected error occurred while creating the note.",
        });
    }
}));
// Get all notes (user-specific)
exports.notesRouter.get("/allnotes", authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const allNotes = yield prisma.note.findMany({
            where: { user: { username: user.username } },
        });
        if (allNotes.length === 0) {
            return res.status(204).send();
        }
        return res.status(200).json(allNotes);
    }
    catch (error) {
        console.error("Error retrieving all notes:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: "An unexpected error occurred while retrieving the notes.",
        });
    }
}));
// Test route (unprotected for debugging)
exports.notesRouter.get("/test", (req, res) => {
    console.log("Hit /test");
    res.status(200).json({ message: "Test route works" });
});
// Get timestamps (user-specific)
exports.notesRouter.get("/timestamps", authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Reached /api/v1/notes/timestamps");
    try {
        const user = req.user;
        const timestamps = yield prisma.note.findMany({
            where: { user: { username: user.username } },
            select: { id: true, updatedAt: true },
        });
        if (timestamps.length === 0) {
            return res.status(204).send();
        }
        return res.status(200).json(timestamps);
    }
    catch (error) {
        console.error("Error retrieving timestamps:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: "An unexpected error occurred while retrieving timestamps.",
        });
    }
}));
// Update a note
exports.notesRouter.put("/updatenote/:id", authenticateToken, [
    (0, express_validator_1.param)("id")
        .notEmpty().withMessage("Note ID is required")
        .isString().withMessage("Note ID must be a string"),
    (0, express_validator_1.body)("noteTitle")
        .trim().notEmpty().withMessage("Note title is required")
        .isString().withMessage("Note title must be a string")
        .isLength({ max: 100 }).withMessage("Note title must be at most 100 characters"),
    (0, express_validator_1.body)("noteDescription")
        .trim().notEmpty().withMessage("Note description is required")
        .isString().withMessage("Note description must be a string"),
    (0, express_validator_1.body)("tag") // ← new
        .optional()
        .trim()
        .isString().withMessage("Tag must be a string")
        .isLength({ max: 50 }).withMessage("Tag must be at most 50 characters"),
    validate
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = req.user;
        const parsed = types_1.newNoteSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation Error",
                details: parsed.error.errors,
            });
        }
        const { noteTitle, noteDescription, tag } = parsed.data;
        const updatedNote = yield prisma.note.update({
            where: { id, user: { username: user.username } },
            data: {
                noteTitle,
                noteDescription,
                tag, // ← now we persist it
            },
        });
        return res.status(200).json({
            message: "Note updated successfully",
            updatedNote,
        });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({
                error: "Not Found",
                message: `No note found with ID ${req.params.id}.`,
            });
        }
        console.error("Error updating note:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: "An unexpected error occurred while updating the note.",
        });
    }
}));
// Delete a note
exports.notesRouter.delete("/deletenote/:id", authenticateToken, [
    (0, express_validator_1.param)("id").notEmpty().withMessage("Note ID is required").isString().withMessage("Note ID must be a string"),
    (0, express_validator_1.body)("platform").trim().notEmpty().withMessage("Platform is required").isString().withMessage("Platform must be a string"),
    validate
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { platform } = req.body;
        const currClientId = req.get("x-client-id");
        const user = req.user;
        // Fetch note to check lock status
        const note = yield prisma.note.findUnique({
            where: { id, user: { username: user.username } },
        });
        if (!note) {
            return res.status(404).json({
                error: "Not Found",
                message: `No note found with ID ${id}.`,
            });
        }
        if (note.lockedBy) {
            return res.status(423).json({
                error: "Locked",
                message: `Note is locked by machine '${note.lockedBy}' and cannot be deleted.`,
                lockedBy: note.lockedBy,
            });
        }
        // Proceed with deletion
        const deletedNote = yield prisma.note.delete({
            where: { id },
        });
        (0, queue_1.deleteEvent)("DELETE", platform, deletedNote.id);
        const message = JSON.stringify({ type: "sync" });
        socket_1.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                const clientId = socket_1.connectClients.get(client);
                if (clientId !== currClientId) {
                    client.send(message);
                }
            }
        });
        return res.status(200).json({
            message: "Note deleted successfully",
            deletedNote,
        });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({
                error: "Not Found",
                message: `No note found with ID ${req.params.id}.`,
            });
        }
        console.error("Error deleting note:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: "An unexpected error occurred while deleting the note.",
        });
    }
}));
// Lock a note
exports.notesRouter.post("/locknote/:id", authenticateToken, [
    (0, express_validator_1.param)("id").notEmpty().withMessage("Note ID is required").isString().withMessage("Note ID must be a string"),
    (0, express_validator_1.header)("x-session-id").notEmpty().withMessage("Session ID is required").isString().withMessage("Session ID must be a string"),
    validate
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const sessionId = req.get("x-session-id");
    const user = req.user;
    try {
        const note = yield prisma.note.findUnique({
            where: { id, user: { username: user.username } },
        });
        if (!note) {
            return res.status(404).json({ error: "Not Found", message: `No note found with ID ${id}.` });
        }
        if (note.lockedBy && note.lockedBy !== sessionId) {
            return res.status(423).json({
                error: "Locked",
                message: "This note is currently locked by another session.",
            });
        }
        yield prisma.note.update({
            where: { id },
            data: { lockedBy: sessionId },
        });
        return res.status(200).json({ message: "Note locked successfully." });
    }
    catch (error) {
        console.error("Error locking note:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}));
// Unlock a note
exports.notesRouter.post("/unlock/:id", authenticateToken, [
    (0, express_validator_1.param)("id").notEmpty().withMessage("Note ID is required").isString().withMessage("Note ID must be a string"),
    (0, express_validator_1.header)("x-session-id").notEmpty().withMessage("Session ID is required").isString().withMessage("Session ID must be a string"),
    validate
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const sessionId = req.get("x-session-id");
    const user = req.user;
    try {
        const note = yield prisma.note.findUnique({
            where: { id, user: { username: user.username } },
        });
        if (!note || note.lockedBy !== sessionId) {
            return res.status(403).json({
                error: "Forbidden",
                message: "You do not have permission to unlock this note.",
            });
        }
        yield prisma.note.update({
            where: { id },
            data: { lockedBy: null },
        });
        return res.status(200).json({ message: "Note unlocked successfully." });
    }
    catch (error) {
        console.error("Error unlocking note:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}));
// Get a single note
exports.notesRouter.get("/:id", authenticateToken, [
    (0, express_validator_1.param)("id").notEmpty().withMessage("Note ID is required").isString().withMessage("Note ID must be a string"),
    validate
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const user = req.user;
    try {
        const note = yield prisma.note.findUnique({
            where: { id, user: { username: user.username } },
        });
        if (!note)
            return res.status(404).json({ error: "Not Found" });
        return res.status(200).json(note);
    }
    catch (error) {
        console.error("Error fetching note:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}));
// Debug logging
console.log("notesRouter routes:");
exports.notesRouter.stack.forEach((r) => {
    if (r.route && r.route.path) {
        console.log(r.route.path);
    }
});
