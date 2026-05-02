import { randomBytes } from 'node:crypto';
import { botBootStatus, botRankings, botRoomState, dispatchBotMessage } from './botEngine.js';
import { publishRoom } from './realtime.js';

const logs = new Map();
const roomMeta = new Map();
const commandHistory = new Map();
const restorationPromises = new Map(); // room -> Promise (wait for restore)
const restartTimers = new Map();
const presence = new Map(); // room -> { nickname -> { online: boolean, lastSeen: timestamp } }
const roomChats = new Map(); // room -> [{ id, sender, text, at }]
const directMessages = new Map(); // conversationKey -> [{ id, from, to, text, at }]

function dmKey(a, b) {
  return [a, b].sort().join('\x00');
}

const roomLocks = new Map(); // room -> Promise (per-room mutex)

function withRoomLock(room, fn) {
  const prev = roomLocks.get(room) || Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  roomLocks.set(room, next.catch(() => {}));
  return next;
}

const QUEST_COUNT = 16;
const CPU_RANDOM_JOBS = [
  '해커','투자자','환자','수집가','감시자','뜀틀선수','전우치','시프터','비밀요원','사과','시인','공룡','마법사','사신','수학자','과학자','작곡가','스폰지밥','나이트','생존자','악당','기자','검객','마하트마간디','수리사','우라늄','고죠','스핔이','해달','프로그래머'
];

function code() {
  return randomBytes(3).toString('hex').toUpperCase();
}

function pickRandomJob(meta) {
  if (meta?.cpuJob) return meta.cpuJob;
  const pool = Array.isArray(meta?.availableJobs) && meta.availableJobs.length ? meta.availableJobs : CPU_RANDOM_JOBS;
  return pool[Math.floor(Math.random() * pool.length)] || '';
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

async function persistRoom(room, stateOverride = null) {
  try {
    const { saveRoomSnapshot } = await import('./db.js');
    const state = stateOverride || await buildRoomSnapshot(room, false);
    await saveRoomSnapshot(room, {
      meta: roomMeta.get(room) || null,
      log: logs.get(room) || [],
      commands: commandHistory.get(room) || [],
      snapshot: state,
      lastGame: state?.game || null
    });
  } catch (e) {
    console.warn('[gameService] DB 저장 실패 (인메모리로 계속 동작):', e?.message);
  }
}

async function loadPersistedRoom(room) {
  try {
    const { loadRoomSnapshot } = await import('./db.js');
    return await loadRoomSnapshot(room);
  } catch (e) {
    console.warn('[gameService] DB 로드 실패:', e?.message);
    return null;
  }
}

async function restoreRoom(room) {
  if (restorationPromises.has(room)) return restorationPromises.get(room);
  
  const promise = (async () => {
    try {
      const persisted = await loadPersistedRoom(room);
      if (!persisted) return;
      if (persisted.meta) roomMeta.set(room, persisted.meta);
      if (Array.isArray(persisted.log)) logs.set(room, persisted.log);
      if (Array.isArray(persisted.commands)) commandHistory.set(room, persisted.commands);

      const lastPhase = persisted.lastGame?.phase || persisted.snapshot?.game?.phase || '';
      const replayable = lastPhase && lastPhase !== 'ended' && lastPhase !== 'finished' && !/종료|승리|패배/.test((persisted.log || []).slice(-8).map((x) => x.text).join('\n'));
      if (!replayable) return;
      
      const commands = (persisted.commands || []).slice(-120);
      for (const item of commands) {
        try {
          await dispatchBotMessage(room, item.command, item.sender, true);
        } catch {
          break;
        }
      }
    } catch (e) {
      restorationPromises.delete(room);
      throw e;
    }
  })();
  
  restorationPromises.set(room, promise);
  return promise;
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
  if (!meta.practice) return `1채린${modeText}`;
  const job = pickRandomJob(meta);
  meta.currentCpuJob = job;
  return `1연습${modeText}${job ? ` ${job}` : ''}`;
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
      rememberCommand(room, sender || meta.owner || 'player', command);
      append(room, sender || meta.owner || 'system', command, restartReplies);
      const state = await getRoomSnapshot(room);
      await persistRoom(room, state);
      publishRoom(room, state);
    } catch (e) { console.warn('[gameService] 자동 재시작 실패:', e?.message); }
  }, 900);
  restartTimers.set(room, timer);
}

function rememberCommand(room, sender, command) {
  const list = commandHistory.get(room) || [];
  list.push({ sender, command, at: Date.now() });
  while (list.length > 140) list.shift();
  commandHistory.set(room, list);
}

export async function createRoom({ nickname, mode = 1, practice = false, cpuJob = '' }) {
  const room = code();
  roomMeta.set(room, { createdAt: Date.now(), mode, practice, cpuJob, owner: String(nickname || '').trim() || 'player', practiceGuest: null });
  logs.set(room, []);
  commandHistory.set(room, []);
  return sendCommand({ room, nickname, command: startCommand(roomMeta.get(room)) });
}

export async function joinRoom({ room, nickname }) {
  await restoreRoom(room);
  const meta = roomMeta.get(room) || { createdAt: Date.now(), mode: 1, practice: false, owner: String(nickname || '').trim() || 'player', practiceGuest: null };
  const sender = String(nickname || '').trim() || 'player';
  if (meta.practice && meta.owner && meta.owner !== sender) {
    meta.practiceGuest = sender;
    meta.practiceGuestAt = Date.now();
    roomMeta.set(room, meta);
    append(room, 'system', '', [`[시스템]: 연습방 알림: ${sender}님이 방 코드로 들어왔습니다. 연습 종료 버튼을 눌러 일반 방으로 전환할 수 있습니다.`]);
    const state = await getRoomSnapshot(room);
    await persistRoom(room, state);
    publishRoom(room, state);
    return state;
  }
  roomMeta.set(room, meta);
  return sendCommand({ room, nickname, command: startCommand(meta) });
}

export async function sendCommand({ room, nickname, command }) {
  return withRoomLock(room, async () => {
    await restoreRoom(room);
    const sender = String(nickname || '').trim() || 'player';
    updatePresence(room, sender, true);
    const msg = String(command || '').trim();
    const replies = msg ? await dispatchBotMessage(room, msg, sender) : [];
    if (msg) rememberCommand(room, sender, msg);
    append(room, sender, msg, replies);
    scheduleAutoRestart(room, sender, replies);
    const state = await getRoomSnapshot(room);
    await persistRoom(room, state);
    publishRoom(room, state);
    return state;
  });
}

export async function addChatMessage({ room, nickname, text }) {
  await restoreRoom(room);
  const sender = String(nickname || '').trim() || 'player';
  const list = roomChats.get(room) || [];
  list.push({
    id: `${Date.now()}-${Math.random()}`,
    sender,
    text: String(text || '').trim(),
    at: Date.now()
  });
  while (list.length > 50) list.shift();
  roomChats.set(room, list);
  
  const state = await getRoomSnapshot(room);
  publishRoom(room, state);
  return state;
}

export function updatePresence(room, nickname, online) {
  if (!room || !nickname) return;
  const roomPresence = presence.get(room) || {};
  roomPresence[nickname] = { online, lastSeen: Date.now() };
  presence.set(room, roomPresence);
}

async function buildRoomSnapshot(room, allowPersistedFallback = true) {
  const game = await botRoomState(room);
  const state = {
    room,
    meta: roomMeta.get(room) || null,
    status: await botBootStatus(),
    game,
    log: logs.get(room) || [],
    chats: roomChats.get(room) || [],
    presence: presence.get(room) || {}
  };
  if ((!state.game || !state.meta) && allowPersistedFallback) {
    const persisted = await loadPersistedRoom(room);
    if (persisted?.snapshot) {
      return {
        ...persisted.snapshot,
        room,
        meta: state.meta || persisted.snapshot.meta || persisted.meta || null,
        game: state.game || persisted.snapshot.game || persisted.lastGame || null,
        log: state.log.length ? state.log : (persisted.snapshot.log || persisted.log || [])
      };
    }
  }
  return state;
}

export async function getRoomSnapshot(room) {
  await restoreRoom(room);
  const state = await buildRoomSnapshot(room, true);
  if (state.game || state.meta) persistRoom(room, state).catch(() => {});
  return state;
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

export async function getOngoingGames(nickname) {
  const ongoing = [];
  const sender = String(nickname || '').trim();
  if (!sender) return [];

  const { botAllRoomStates } = await import('./botEngine.js');
  const allGames = await botAllRoomStates();

  for (const [room, game] of Object.entries(allGames)) {
    if (game.players?.includes(sender) && game.phase !== 'ended' && game.phase !== 'finished') {
      const meta = roomMeta.get(room);
      ongoing.push({
        room,
        meta,
        phase: game.phase,
        turnCount: game.turnCount,
        currentPlayer: game.currentPlayer
      });
    }
  }
  return ongoing;
}

export function addDirectMessage({ from, to, text }) {
  if (!from || !to || !text) return;
  const key = dmKey(from, to);
  const list = directMessages.get(key) || [];
  list.push({
    id: `${Date.now()}-${Math.random()}`,
    from: String(from).trim(),
    to: String(to).trim(),
    text: String(text).trim(),
    at: Date.now()
  });
  while (list.length > 200) list.shift();
  directMessages.set(key, list);
}

export function getDirectMessages(userA, userB) {
  return directMessages.get(dmKey(userA, userB)) || [];
}

export function getDMInbox(nickname) {
  const user = String(nickname || '').trim();
  if (!user) return [];
  const convos = [];
  for (const [key, msgs] of directMessages) {
    const [a, b] = key.split('\x00');
    if (a !== user && b !== user) continue;
    const other = a === user ? b : a;
    const last = msgs[msgs.length - 1];
    const unread = msgs.filter(m => m.to === user).length;
    convos.push({ with: other, last, unread });
  }
  convos.sort((a, b) => (b.last?.at || 0) - (a.last?.at || 0));
  return convos;
}
