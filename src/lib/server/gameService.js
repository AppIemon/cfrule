import { randomBytes } from 'node:crypto';
import { botBootStatus, botRankings, botRoomState, dispatchBotMessage } from './botEngine.js';
import { publishRoom } from './realtime.js';

const logs = new Map();
const roomMeta = new Map();

function code() {
  return randomBytes(3).toString('hex').toUpperCase();
}

function append(room, sender, msg, replies) {
  const list = logs.get(room) || [];
  if (msg) list.push({ id: `${Date.now()}-${Math.random()}`, type: 'input', sender, text: msg, at: Date.now() });
  for (const text of replies || []) {
    list.push({ id: `${Date.now()}-${Math.random()}`, type: 'system', sender: 'system', text, at: Date.now() });
  }
  while (list.length > 160) list.shift();
  logs.set(room, list);
}

export async function createRoom({ nickname, mode = 1, practice = false, cpuJob = '' }) {
  const room = code();
  roomMeta.set(room, { createdAt: Date.now(), mode, practice });
  logs.set(room, []);
  const command = practice ? `1연습${mode === 1 ? '' : mode}${cpuJob ? ` ${cpuJob}` : ''}` : `1채린${mode === 1 ? '' : mode}`;
  return sendCommand({ room, nickname, command });
}

export async function joinRoom({ room, nickname }) {
  const meta = roomMeta.get(room) || { createdAt: Date.now(), mode: 1, practice: false };
  roomMeta.set(room, meta);
  const command = meta.practice ? `1연습${meta.mode === 1 ? '' : meta.mode}` : `1채린${meta.mode === 1 ? '' : meta.mode}`;
  return sendCommand({ room, nickname, command });
}

export async function sendCommand({ room, nickname, command }) {
  const sender = String(nickname || '').trim() || 'player';
  const msg = String(command || '').trim();
  const replies = msg ? await dispatchBotMessage(room, msg, sender) : [];
  append(room, sender, msg, replies);
  const state = await getRoomSnapshot(room);
  publishRoom(room, state);
  return state;
}

export async function getRoomSnapshot(room) {
  return {
    room,
    meta: roomMeta.get(room) || null,
    status: await botBootStatus(),
    game: await botRoomState(room),
    log: logs.get(room) || []
  };
}

export async function rankingSnapshot() {
  // Prefer MongoDB as source of truth; fall back to bot in-memory data
  try {
    const { getRatingRanking } = await import('./db.js');
    const ranking = await getRatingRanking(100);
    if (ranking.length > 0) {
      return { ranking };
    }
  } catch {
    // MongoDB unavailable
  }
  return { ranking: await botRankings() };
}
