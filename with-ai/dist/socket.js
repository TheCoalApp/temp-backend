"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectClients = exports.wss = void 0;
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const ws_1 = require("ws");
const app = (0, express_1.default)();
const httpServer = app.listen(8081, '0.0.0.0');
exports.wss = new ws_1.WebSocketServer({ server: httpServer });
exports.connectClients = new Map();
exports.wss.on('connection', function connection(ws) {
    const clientId = (0, uuid_1.v4)();
    exports.connectClients.set(ws, clientId);
    ws.on('error', console.error);
    // ws.on('message', function message(data, isBinary) {
    //   const jsonstring = JSON.parse(data.toString())
    //   console.log(jsonstring)
    //   wss.clients.forEach(function each(client) {
    //     if (client.readyState === WebSocket.OPEN) {
    //       client.send(data, { binary: isBinary });
    //     }
    //   });
    // });
    ws.send(JSON.stringify({
        type: 'connection',
        message: 'Socket server connected!',
        clientId: clientId,
    }));
    console.log("Socket server connected!");
});
