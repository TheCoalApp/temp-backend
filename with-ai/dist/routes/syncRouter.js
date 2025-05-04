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
exports.syncRouter = void 0;
const express_1 = __importDefault(require("express"));
const queue_1 = require("../queue");
exports.syncRouter = express_1.default.Router();
exports.syncRouter.get("/web", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let events = [];
    let event;
    while ((event = yield queue_1.redisClient.rPop("queue:web")) !== null) {
        events.push(JSON.parse(event));
    }
    return res.status(200).json(events);
}));
// syncRouter.get("/mobile", async (req: Request, res: Response) => {
//     let events: string[] = [];
//     let event: string | null;
//     while ((event = await redisClient.rPop("queue:mobile")) !== null) {
//         events.push(JSON.parse(event));
//     }
//     return res.status(200).json(events);
// })
exports.syncRouter.get("/cli", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let events = [];
    let event;
    while ((event = yield queue_1.redisClient.rPop("queue:cli")) !== null) {
        events.push(JSON.parse(event));
    }
    return res.status(200).json(events);
}));
