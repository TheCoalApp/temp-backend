"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
exports.pushToQueue = pushToQueue;
exports.deleteEvent = deleteEvent;
const redis_1 = require("redis");
exports.redisClient = (0, redis_1.createClient)({
    url: "redis://3.140.100.220:6379",
    password: "sX6r#wEG6B7W",
});
exports.redisClient.connect()
    .then(() => console.log("Connected to Redis"))
    .catch(console.error);
function pushToQueue(event, platform, id, noteTitle, noteDescription) {
    switch (platform) {
        case "web":
            exports.redisClient.lPush("queue:cli", JSON.stringify({
                event: event,
                id: id,
                noteTitle: noteTitle,
                noteDescription: noteDescription,
            }));
            break;
        case "cli":
            exports.redisClient.lPush("queue:web", JSON.stringify({
                event: event,
                id: id,
                noteTitle: noteTitle,
                noteDescription: noteDescription,
            }));
            break;
    }
}
function deleteEvent(event, platform, id) {
    switch (platform) {
        case "web":
            exports.redisClient.lPush("queue:cli", JSON.stringify({
                event: event,
                id: id,
            }));
            break;
        case "cli":
            exports.redisClient.lPush("queue:web", JSON.stringify({
                event: event,
                id: id,
            }));
            break;
    }
}
