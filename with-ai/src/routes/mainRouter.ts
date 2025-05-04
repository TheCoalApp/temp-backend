import express from "express"
import { notesRouter } from "./notesRouter"
import { syncRouter } from "./syncRouter"
import { aiRouter } from "./aiRouter"
export const v1_router = express.Router()

v1_router.use("/notes", notesRouter)
v1_router.use("/sync", syncRouter)
v1_router.use("/ai", aiRouter)
