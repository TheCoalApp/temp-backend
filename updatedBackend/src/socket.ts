import express from 'express'
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';

//const app = express()
//const httpServer = app.listen(8081, '0.0.0.0')

export const wss = new WebSocketServer({ port: 8081});

export const connectClients = new Map();


wss.on('connection', function connection(ws) {

  const clientId = uuidv4()
  connectClients.set(ws, clientId)


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


