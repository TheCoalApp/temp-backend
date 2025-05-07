import express, { Request, Response } from "express";
import { body, param, header, validationResult } from "express-validator";
import { newNoteSchema } from "../types";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { generateEmbedding, generateRAGResponse, generateSummary } from "../gemini";
import { getSimilarNotes, insertEmbedding, updateEmbedding } from "@prisma/client/sql";
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type to include user
interface AuthRequest extends Request {
  user?: { username: string };
}

const prisma = new PrismaClient();
export const notesRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in .env");
}

// Middleware to verify JWT
const authenticateToken = (req: AuthRequest, res: Response, next: express.NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user as { username: string };
    next();
  });
};

// Validation middleware to handle errors
const validate = (req: Request, res: Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation Error",
      details: errors.array(),
    });
  }
  next();
};

// Login endpoint
notesRouter.post("/login", [
  body("username").trim().notEmpty().withMessage("Username is required").isString().withMessage("Username must be a string"),
  body("password").trim().notEmpty().withMessage("Password is required").isString().withMessage("Password must be a string"),
  validate
], async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ username: user.username }, JWT_SECRET, {
    expiresIn: "1h",
  });
  res.json({ token });
});

// Register endpoint
notesRouter.post("/register", [
  body("username").trim().notEmpty().withMessage("Username is required").isString().withMessage("Username must be a string").isLength({ min: 3, max: 50 }).withMessage("Username must be between 3 and 50 characters"),
  body("password").trim().notEmpty().withMessage("Password is required").isString().withMessage("Password must be a string").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  validate
], async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const user = await prisma.user.create({
      data: { username, password: hashedPassword },
    });
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(201).json({ token });
  } catch (error) {
    res.status(409).json({ error: "Username already exists" });
  }
});

// Create a new note
notesRouter.post("/newnote", authenticateToken, [
  body("noteTitle").trim().notEmpty().withMessage("Note title is required").isString().withMessage("Note title must be a string").isLength({ max: 100 }).withMessage("Note title must be at most 100 characters"),
  body("noteDescription").trim().notEmpty().withMessage("Note description is required").isString().withMessage("Note description must be a string"),
  body("tag").optional().trim().isString().withMessage("Tag must be a string").isLength({ max: 50 }).withMessage("Tag must be at most 50 characters"),
  validate
], async (req: AuthRequest, res: Response) => {
  try {
    const parsedBody = newNoteSchema.safeParse(req.body);
    const currClientId = req.get("x-client-id");
    const user = req.user!; // Non-null assertion since middleware ensures it

    if (!parsedBody.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parsedBody.error.errors,
      });
    }

    const { noteTitle, noteDescription, tag } = parsedBody.data;

    const result = await prisma.note.create({
      data: {
        noteTitle,
        noteDescription,
        tag,
        syncStatus: "pending",
        user: { connect: { username: user.username } },
      },
    });

    const getEmbedding = await generateEmbedding(noteDescription);
    const embedding = `[${getEmbedding.embedding.values}]`;

    await prisma.$queryRawTyped(insertEmbedding(uuidv4(), result.id, embedding));

    return res.status(201).json(result);
    
  } catch (error) {
    console.error("Error creating new note:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred while creating the note.",
    });
  }
});

// Get all notes (user-specific)
notesRouter.get("/allnotes", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const allNotes = await prisma.note.findMany({
      where: { user: { username: user.username } },
    });

    if (allNotes.length === 0) {
      return res.status(204).send();
    }

    return res.status(200).json(allNotes);
  } catch (error) {
    console.error("Error retrieving all notes:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred while retrieving the notes.",
    });
  }
});

// Get timestamps (user-specific)
notesRouter.get("/timestamps", authenticateToken, async (req: AuthRequest, res: Response) => {
  console.log("Reached /api/v1/notes/timestamps");
  try {
    const user = req.user!;
    const timestamps = await prisma.note.findMany({
      where: { user: { username: user.username } },
      select: { id: true, updatedAt: true },
    });
    if (timestamps.length === 0) {
      return res.status(204).send();
    }
    return res.status(200).json(timestamps);
  } catch (error) {
    console.error("Error retrieving timestamps:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred while retrieving timestamps.",
    });
  }
});

// Update a note
notesRouter.put(
  "/updatenote/:id",
  authenticateToken,
  [
    param("id")
      .notEmpty().withMessage("Note ID is required")
      .isString().withMessage("Note ID must be a string"),
    body("noteTitle")
      .trim().notEmpty().withMessage("Note title is required")
      .isString().withMessage("Note title must be a string")
      .isLength({ max: 100 }).withMessage("Note title must be at most 100 characters"),
    body("noteDescription")
      .trim().notEmpty().withMessage("Note description is required")
      .isString().withMessage("Note description must be a string"),
    body("tag")                       // ← new
      .optional()
      .trim()
      .isString().withMessage("Tag must be a string")
      .isLength({ max: 50 }).withMessage("Tag must be at most 50 characters"),
    validate
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const parsed = newNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation Error",
          details: parsed.error.errors,
        });
      }

      const { noteTitle, noteDescription, tag } = parsed.data;

      const updatedNote = await prisma.note.update({
        where: { id, user: { username: user.username } },
        data: {
          noteTitle,
          noteDescription,
          tag,                // ← now we persist it
        },
      });

      const getEmbedding = await generateEmbedding(noteDescription);
      const embedding = `[${getEmbedding.embedding.values}]`;
  
      await prisma.$queryRawTyped(updateEmbedding(embedding, id));

      return res.status(200).json({
        message: "Note updated successfully",
        updatedNote,
      });
    } catch (error: any) {
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
  }
);

// Delete a note
notesRouter.delete("/deletenote/:id", authenticateToken, [
  param("id").notEmpty().withMessage("Note ID is required").isString().withMessage("Note ID must be a string"),
  body("platform").trim().notEmpty().withMessage("Platform is required").isString().withMessage("Platform must be a string"),
  validate
], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { platform } = req.body;
    const currClientId = req.get("x-client-id");
    const user = req.user!;

    // Fetch note to check lock status
    const note = await prisma.note.findUnique({
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
    const deletedNote = await prisma.note.delete({
      where: { id },
    });

    return res.status(200).json({
      message: "Note deleted successfully",
      deletedNote,
    });
  } catch (error: any) {
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
});

// Lock a note
notesRouter.post("/locknote/:id", authenticateToken, [
  param("id").notEmpty().withMessage("Note ID is required").isString().withMessage("Note ID must be a string"),
  header("x-session-id").notEmpty().withMessage("Session ID is required").isString().withMessage("Session ID must be a string"),
  validate
], async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const sessionId = req.get("x-session-id");
  const user = req.user!;

  try {
    const note = await prisma.note.findUnique({
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

    await prisma.note.update({
      where: { id },
      data: { lockedBy: sessionId },
    });

    return res.status(200).json({ message: "Note locked successfully." });
  } catch (error) {
    console.error("Error locking note:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Unlock a note
notesRouter.post("/unlock/:id", authenticateToken, [
  param("id").notEmpty().withMessage("Note ID is required").isString().withMessage("Note ID must be a string"),
  header("x-session-id").notEmpty().withMessage("Session ID is required").isString().withMessage("Session ID must be a string"),
  validate
], async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const sessionId = req.get("x-session-id");
  const user = req.user!;

  try {
    const note = await prisma.note.findUnique({
      where: { id, user: { username: user.username } },
    });

    if (!note || note.lockedBy !== sessionId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to unlock this note.",
      });
    }

    await prisma.note.update({
      where: { id },
      data: { lockedBy: null },
    });

    return res.status(200).json({ message: "Note unlocked successfully." });
  } catch (error) {
    console.error("Error unlocking note:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get a single note
notesRouter.get("/:id", authenticateToken, [
  param("id").notEmpty().withMessage("Note ID is required").isString().withMessage("Note ID must be a string"),
  validate
], async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  try {
    const note = await prisma.note.findUnique({
      where: { id, user: { username: user.username } },
    });
    if (!note) return res.status(404).json({ error: "Not Found" });
    return res.status(200).json(note);
  } catch (error) {
    console.error("Error fetching note:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Debug logging
console.log("notesRouter routes:");
notesRouter.stack.forEach((r: any) => {
  if (r.route && r.route.path) {
    console.log(r.route.path);
  }
});




notesRouter.post("/summarize/:id", 
  authenticateToken, 
  [
    param("id")
      .notEmpty().withMessage("Note ID is required")
      .isString().withMessage("Note ID must be a string"),
    validate
  ],
  async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const note = await prisma.note.findUnique({
      where: {
          id: id
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


notesRouter.post("/ask",
  authenticateToken,
  [
    body("question")
      .trim().notEmpty().withMessage("A question is required")
      .isString().withMessage("The question must be a string"),
    validate
  ],
  async (req: Request, res: Response) => {
  const { question } = req.body;

  if (!question) {
      return res.status(400).json({ error: "Question is required" });
  }

  const questionEmbedding = await generateEmbedding(question);
  const similarNotes = await prisma.$queryRawTyped(getSimilarNotes(`[${questionEmbedding.embedding.values.join(",")}]`));
  const context = getContextFromNotes(similarNotes);

  const RAGresponse = await generateRAGResponse(question, context);


  res.status(200).json({
      response: RAGresponse.response.text()
  });

})




// helper functions

function getContextFromNotes(notes: any[]) {
  if (!notes || notes.length === 0) {
      return "No relevant information found.";
  }
  return notes.map(note => note.noteDescription).join("\n");
}