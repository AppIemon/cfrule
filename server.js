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

const PING_INTERVAL = 25000;
const PING_TIMEOUT = 10000;

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }

  socket.on('error', () => socket.destroy());

  wss.handleUpgrade(request, socket, head, async (ws) => {
    const room = url.searchParams.get('room') || '';
    let isAlive = true;

    const send = (payload) => {
      if (ws.readyState === ws.OPEN) {
        try { ws.send(JSON.stringify(payload)); } catch {}
      }
    };

    let game;
    try {
      game = await loadGameModule();
    } catch (err) {
      console.error('Failed to load game module:', err);
      ws.close(1011, 'server error');
      return;
    }

    const getRoomSnapshot = game.getRoomSnapshot || game.g;
    const updatePresence = game.updatePresence || (() => {});
    const addChatMessage = game.addChatMessage || (() => {});
    const addDirectMessage = game.addDirectMessage || (() => {});
    const lookupSession = game.lookupSessionFromCookieHeader;
    const realtime = game.realtime || game.r;

    if (!getRoomSnapshot) {
      ws.close(1011, 'server error');
      return;
    }

    let nickname = '';
    if (typeof lookupSession === 'function') {
      try {
        const sessionUser = await lookupSession(request.headers.cookie || '');
        nickname = sessionUser?.nickname || '';
      } catch {}
    }

    if (nickname) updatePresence(room, nickname, true);

    const sendSnapshot = (payload) => {
      if (payload) send(payload);
      else getRoomSnapshot(room).then(send).catch(() => {});
    };

    // Initial snapshot
    sendSnapshot();

    // Subscribe to real-time updates
    const onUpdate = (payload) => send(payload);
    let pollInterval;
    if (realtime) {
      realtime.on(`room:${room}`, onUpdate);
    } else {
      // Fallback to polling if realtime is not available in the chunk
      pollInterval = setInterval(() => sendSnapshot(), 2000);
    }

    // Keepalive ping/pong to prevent proxy timeouts (esp. on mobile connections)
    ws.on('pong', () => { isAlive = true; });
    const pingTimer = setInterval(() => {
      if (!isAlive) {
        ws.terminate();
        return;
      }
      isAlive = false;
      try { ws.ping(); } catch {}
    }, PING_INTERVAL);

    ws.on('ping', () => {
      try { ws.pong(); } catch {}
    });

    ws.on('message', async (data) => {
      if (!nickname) return;
      try {
        const buf = data.toString();
        if (buf.length > 2048) return;
        const payload = JSON.parse(buf);
        if (payload.type === 'chat' && payload.text) {
          await addChatMessage({ room, nickname, text: String(payload.text).slice(0, 500) });
        } else if (payload.type === 'dm' && payload.to && payload.text) {
          await addDirectMessage({
            from: nickname,
            to: String(payload.to).slice(0, 32),
            text: String(payload.text).slice(0, 500)
          });
        }
      } catch {}
    });

    ws.on('error', () => {
      if (realtime) realtime.off(`room:${room}`, onUpdate);
      if (pollInterval) clearInterval(pollInterval);
      clearInterval(pingTimer);
    });

    ws.on('close', () => {
      if (realtime) realtime.off(`room:${room}`, onUpdate);
      if (pollInterval) clearInterval(pollInterval);
      clearInterval(pingTimer);
      if (nickname) updatePresence(room, nickname, false);
    });
  });
});

server.on('error', (err) => {
  console.error('HTTP server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

server.listen(port, () => {
  console.log(`listening on http://localhost:${port}`);
});
