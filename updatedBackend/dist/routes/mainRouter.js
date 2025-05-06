"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.v1_router = void 0;
const express_1 = __importDefault(require("express"));
const notesRouter_1 = require("./notesRouter");
const syncRouter_1 = require("./syncRouter");
exports.v1_router = express_1.default.Router();
exports.v1_router.use("/notes", notesRouter_1.notesRouter);
exports.v1_router.use("/sync", syncRouter_1.syncRouter);
