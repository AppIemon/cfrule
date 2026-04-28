import { createServer } from 'node:http';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';
import { handler } from './build/handler.js';

const port = Number(process.env.PORT || 4173);
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const server = createServer(handler);
const wss = new WebSocketServer({ noServer: true });
let gameModulePromise;

function loadGameModule() {
  if (!gameModulePromise) {
    const chunksDir = path.join(rootDir, 'build', 'server', 'chunks');
    const file = readdirSync(chunksDir).find((name) => /^gameService-.*\.js$/.test(name));
    if (!file) throw new Error('Built gameService chunk was not found.');
    gameModulePromise = import(pathToFileURL(path.join(chunksDir, file)).href);
  }
  return gameModulePromise;
}

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, async (ws) => {
    const room = url.searchParams.get('room') || '';
    const nickname = url.searchParams.get('nickname') || '';
    const send = (payload) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
    };
    const game = await loadGameModule();
    const getRoomSnapshot = game.getRoomSnapshot || game.g;
    const updatePresence = game.updatePresence || (() => {});
    if (!getRoomSnapshot) throw new Error('Built gameService snapshot export was not found.');
    
    if (nickname) updatePresence(room, nickname, true);

    const sendSnapshot = () => getRoomSnapshot(room).then(send).catch(() => {});
    sendSnapshot();
    const interval = setInterval(sendSnapshot, 1000);
    
    ws.on('close', () => {
      clearInterval(interval);
      if (nickname) updatePresence(room, nickname, false);
    });
  });
});

server.listen(port, () => {
  console.log(`listening on http://localhost:${port}`);
});
