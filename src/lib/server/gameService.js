import { randomBytes } from 'node:crypto';
import { botBootStatus, botRankings, botRoomState, dispatchBotMessage } from './botEngine.js';
import { publishRoom } from './realtime.js';

const logs = new Map();
const roomMeta = new Map();
const restartTimers = new Map();

const QUEST_COUNT = 16;

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

function normalizeRankingRow(row) {
  const achievements = row?.achievements && typeof row.achievements === 'object' ? row.achievements : {};
  const titles = Array.isArray(row?.titles) ? row.titles : [];
  const done = Object.keys(achievements).length;
  return {
    ...row,
    titles,
    equippedTitle: row?.equippedTitle || titles[0] || '',
    achievementRate: Number.isFinite(Number(row?.achievementRate))
      ? Number(row.achievementRate)
      : Math.round((done / QUEST_COUNT) * 100)
  };
}

function normalizeRanking(rows) {
  return (rows || []).map(normalizeRankingRow);
}

function buildJobRanking(ranking) {
  const byJob = {};
  for (const player of ranking || []) {
    const stats = player?.jobStats || {};
    for (const [job, stat] of Object.entries(stats)) {
      const wins = Number(stat?.wins || 0);
      const losses = Number(stat?.losses || 0);
      const picks = Number(stat?.picks || 0);
      const games = Math.max(picks, wins + losses);
      if (!games) continue;
      if (!byJob[job]) byJob[job] = [];
      byJob[job].push({
        job,
        name: player.name,
        rating: Number(player.rating || 0),
        wins,
        losses,
        games,
        winRate: Math.round((wins / Math.max(1, wins + losses)) * 100),
        equippedTitle: player.equippedTitle || '',
        achievementRate: Number(player.achievementRate || 0),
        score: wins * 100000 + Number(player.rating || 0)
      });
    }
  }
  for (const rows of Object.values(byJob)) rows.sort((a, b) => b.score - a.score || b.winRate - a.winRate);
  return byJob;
}

function startCommand(meta) {
  const modeText = meta.mode === 1 ? '' : meta.mode;
  return meta.practice ? `1연습${modeText}${meta.cpuJob ? ` ${meta.cpuJob}` : ''}` : `1채린${modeText}`;
}

function looksLikeGameEnd(replies) {
  const text = (replies || []).join('\n');
  return /승리|패배|레이팅|티어 변경|경기 종료|게임 종료/.test(text);
}

function scheduleAutoRestart(room, sender, replies) {
  const meta = roomMeta.get(room);
  if (!meta || !looksLikeGameEnd(replies)) return;
  if (restartTimers.has(room)) clearTimeout(restartTimers.get(room));
  append(room, 'system', '', ['[시스템]: 사람이 충분하다고 보고 다음 게임을 자동으로 준비합니다.']);
  const timer = setTimeout(async () => {
    restartTimers.delete(room);
    try {
      const command = startCommand(meta);
      const restartReplies = await dispatchBotMessage(room, command, sender || meta.owner || 'player');
      append(room, sender || meta.owner || 'system', command, restartReplies);
      publishRoom(room, await getRoomSnapshot(room));
    } catch {}
  }, 900);
  restartTimers.set(room, timer);
}

export async function createRoom({ nickname, mode = 1, practice = false, cpuJob = '' }) {
  const room = code();
  roomMeta.set(room, { createdAt: Date.now(), mode, practice, cpuJob, owner: String(nickname || '').trim() || 'player', practiceGuest: null });
  logs.set(room, []);
  return sendCommand({ room, nickname, command: startCommand(roomMeta.get(room)) });
}

export async function joinRoom({ room, nickname }) {
  const meta = roomMeta.get(room) || { createdAt: Date.now(), mode: 1, practice: false, owner: String(nickname || '').trim() || 'player', practiceGuest: null };
  const sender = String(nickname || '').trim() || 'player';
  if (meta.practice && meta.owner && meta.owner !== sender) {
    meta.practiceGuest = sender;
    meta.practiceGuestAt = Date.now();
    roomMeta.set(room, meta);
    append(room, 'system', '', [`[시스템]: 연습방 알림: ${sender}님이 방 코드로 들어왔습니다. 연습 종료 버튼을 눌러 일반 방으로 전환할 수 있습니다.`]);
    const state = await getRoomSnapshot(room);
    publishRoom(room, state);
    return state;
  }
  roomMeta.set(room, meta);
  return sendCommand({ room, nickname, command: startCommand(meta) });
}

export async function sendCommand({ room, nickname, command }) {
  const sender = String(nickname || '').trim() || 'player';
  const msg = String(command || '').trim();
  const replies = msg ? await dispatchBotMessage(room, msg, sender) : [];
  append(room, sender, msg, replies);
  scheduleAutoRestart(room, sender, replies);
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
    const ranking = normalizeRanking(await getRatingRanking(100));
    if (ranking.length > 0) {
      return { ranking, jobRanking: buildJobRanking(ranking) };
    }
  } catch {
    // MongoDB unavailable
  }
  const ranking = normalizeRanking(await botRankings());
  return { ranking, jobRanking: buildJobRanking(ranking) };
}
