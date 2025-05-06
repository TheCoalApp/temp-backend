"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newNoteSchema = void 0;
const zod_1 = require("zod");
exports.newNoteSchema = zod_1.z.object({
    noteTitle: zod_1.z.string().min(1, 'Note title is required'),
    noteDescription: zod_1.z.string().min(1, 'Note description is required'),
    platform: zod_1.z.string(),
    tag: zod_1.z.string().optional(),
});
