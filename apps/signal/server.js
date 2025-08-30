const WebSocket = require('ws');
const { nanoid } = require('nanoid');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

/** In-memory room state */
const roomIdToClients = new Map(); // roomId -> Set<Client>

/** Client wrapper */
class Client {
  constructor(ws) {
    this.ws = ws;
    this.clientId = nanoid(10);
    this.roomId = null;
    this.isAlive = true;
  }
}

const wss = new WebSocket.Server({ port: PORT });
console.log(`[signal] WebSocket server listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  const client = new Client(ws);

  ws.on('pong', () => {
    client.isAlive = true;
  });

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      return safeSend(ws, { type: 'error', error: 'Invalid JSON' });
    }

    switch (msg.type) {
      case 'hello': {
        safeSend(ws, { type: 'hello', clientId: client.clientId });
        break;
      }
      case 'join': {
        const roomId = String(msg.roomId || '').trim();
        if (!roomId) {
          return safeSend(ws, { type: 'error', error: 'roomId required' });
        }
        if (client.roomId) {
          return safeSend(ws, { type: 'error', error: 'Already in a room' });
        }
        let clients = roomIdToClients.get(roomId);
        if (!clients) {
          clients = new Set();
          roomIdToClients.set(roomId, clients);
        }
        if (clients.size >= 2) {
          return safeSend(ws, { type: 'room-full', roomId });
        }
        clients.add(client);
        client.roomId = roomId;

        // Notify joiner
        safeSend(ws, { type: 'joined', roomId, clientId: client.clientId, peerCount: clients.size });

        // If second participant joined, kick off call
        if (clients.size === 2) {
          const [a, b] = Array.from(clients);
          safeSend(a.ws, { type: 'start-call', role: 'caller' });
          safeSend(b.ws, { type: 'start-call', role: 'callee' });
          broadcastExcept(clients, client, { type: 'peer-joined', clientId: client.clientId });
        } else {
          // Inform any existing peer about the new joiner
          broadcastExcept(clients, client, { type: 'peer-waiting', clientId: client.clientId });
        }
        break;
      }
      case 'offer':
      case 'answer':
      case 'candidate': {
        if (!client.roomId) return;
        const clients = roomIdToClients.get(client.roomId);
        if (!clients) return;
        // Forward to the other peer only
        for (const peer of clients) {
          if (peer !== client) {
            safeSend(peer.ws, { type: msg.type, from: client.clientId, payload: msg.payload });
          }
        }
        break;
      }
      case 'leave': {
        leaveRoom(client);
        break;
      }
      default: {
        safeSend(ws, { type: 'error', error: `Unknown type: ${msg.type}` });
      }
    }
  });

  ws.on('close', () => {
    leaveRoom(client);
  });

  ws.on('error', () => {
    leaveRoom(client);
  });

  // Initial hello
  safeSend(ws, { type: 'hello', clientId: client.clientId });
});

function safeSend(ws, obj) {
  try {
    ws.send(JSON.stringify(obj));
  } catch (_) {}
}

function broadcastExcept(clients, exceptClient, message) {
  for (const c of clients) {
    if (c !== exceptClient) safeSend(c.ws, message);
  }
}

function leaveRoom(client) {
  if (!client.roomId) return;
  const clients = roomIdToClients.get(client.roomId);
  if (!clients) return;
  clients.delete(client);
  if (clients.size === 0) {
    roomIdToClients.delete(client.roomId);
  } else {
    for (const peer of clients) {
      safeSend(peer.ws, { type: 'peer-left', clientId: client.clientId });
    }
  }
  client.roomId = null;
}

// Heartbeat
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const client = [...roomIdToClients.values()].flatMap(s => [...s]).find(c => c.ws === ws);
    if (!client) return ws.terminate();

    if (client.isAlive === false) return ws.terminate();
    client.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', function close() {
  clearInterval(interval);
}); 