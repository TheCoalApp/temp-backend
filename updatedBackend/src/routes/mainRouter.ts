import express from "express";
import { notesRouter } from "./notesRouter";

export const v1_router = express.Router();

v1_router.use("/notes", notesRouter);