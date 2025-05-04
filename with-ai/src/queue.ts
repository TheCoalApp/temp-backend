import { env } from "process";
import { createClient } from "redis";


export const redisClient = createClient({
	url: "redis://3.140.100.220:6379",
	password: env.REDIS_PASSWORD,
});

redisClient.connect()
    .then(() => console.log("Connected to Redis"))
    .catch(console.error);


export function pushToQueue(event: string, platform: string, id: string, noteTitle: string, noteDescription: string) {
    switch (platform) {
        case "web":
            redisClient.lPush("queue:cli", JSON.stringify({
                event: event,
                id: id,
                noteTitle: noteTitle,
                noteDescription: noteDescription,
            }));
            break;

        case "cli":
            redisClient.lPush("queue:web", JSON.stringify({
                event: event,
                id: id,
                noteTitle: noteTitle,
                noteDescription: noteDescription,
            }));
            break;     
    }
}

export function deleteEvent(event: string, platform: string, id: string) {
    switch (platform) {
        case "web":
            redisClient.lPush("queue:cli", JSON.stringify({
                event: event,
                id: id,
            }));
            break;

        case "cli":
            redisClient.lPush("queue:web", JSON.stringify({
                event: event,
                id: id,
            }));
            break;     
    }
}
