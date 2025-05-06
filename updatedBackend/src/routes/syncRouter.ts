import express, { Request, Response } from "express"
import { redisClient } from "../queue"

export const syncRouter = express.Router()

syncRouter.get("/web", async (req: Request, res: Response) => {
    let events: string[] = [];
    let event: string | null;
    while ((event = await redisClient.rPop("queue:web")) !== null) {
        events.push(JSON.parse(event));
    }

    return res.status(200).json(events);
})

// syncRouter.get("/mobile", async (req: Request, res: Response) => {
//     let events: string[] = [];
//     let event: string | null;
//     while ((event = await redisClient.rPop("queue:mobile")) !== null) {
//         events.push(JSON.parse(event));
//     }

//     return res.status(200).json(events);

// })

syncRouter.get("/cli", async (req: Request, res: Response) => {
    let events: string[] = [];
    let event: string | null;
    while ((event = await redisClient.rPop("queue:cli")) !== null) {
        events.push(JSON.parse(event));
    }

    return res.status(200).json(events);
})