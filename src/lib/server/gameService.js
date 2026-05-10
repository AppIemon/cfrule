import { randomBytes } from 'node:crypto';
import { botAllRoomStates, botBootStatus, botRankings, botRoomState, configureBotRoom, dispatchBotMessage } from './botEngine.js';
import { publishRoom, realtime } from './realtime.js';
import { getSessionCookieName, getUserByToken } from './auth.js';

export { realtime };

// Re-exported for the standalone WebSocket server (server.js) so it can resolve
// a nickname from the session cookie without reaching into a separate auth chunk.
export { getSessionCookieName, getUserByToken };

export async function lookupSessionFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const name = getSessionCookieName();
  const target = `${name}=`;
  for (const part of String(cookieHeader).split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      const raw = trimmed.slice(target.length);
      try {
        return await getUserByToken(decodeURIComponent(raw));
      } catch {
        return null;
      }
    }
  }
  return null;
}

const logs = new Map();
const roomMeta = new Map();
const commandHistory = new Map();
const restoredRooms = new Set();
const restorationPromises = new Map();
const roomLocks = new Map(); // room -> Promise (queue of operations)
const restartTimers = new Map();
const clockTimers = new Map();
const clockFinalizing = new Set();
const presence = new Map(); // room -> { nickname -> { online: boolean, lastSeen: timestamp } }
const roomChats = new Map(); // room -> [{ id, sender, text, at }]
const directMessages = new Map(); // conversationKey -> [{ id, from, to, text, at }]

async function withRoomLock(room, fn) {
  if (!roomLocks.has(room)) {
    roomLocks.set(room, Promise.resolve());
  }
  const previous = roomLocks.get(room);
  const current = previous.then(async () => {
    try {
      return await fn();
    } catch (error) {
      console.error(`[gameService] Lock operation failed for room ${room}:`, error);
      throw error;
    }
  }).catch(() => {}); // Ensure queue continues even on failure
  roomLocks.set(room, current);
  return current;
}

function dmKey(a, b) {
  return [a, b].sort().join('\x00');
}

const QUEST_COUNT = 16;
const CPU_RANDOM_JOBS = [
  '해커', '투자자', '환자', '수집가', '감시자', '뜀틀선수', '전우치', '기관사', '늑대인간', '시프터', '비밀요원', '67', '사과', '시인', '공룡', '마법사', '사신', '수학자', '과학자', '갈릴레오', '작곡가', '스폰지밥', '나이트', '생존자', '악당', '기자', '검객', '마하트마간디', '은하계전사', '혜성전사', '수리사', '우라늄', '고죠', '스핔이', '해달', '피보나치', '?', '프로그래머', '볼링선수', '반장'
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
  } catch (error) {
    // Mongo unavailable; in-memory room still works in local/dev.
    console.warn(`[gameService] persistRoom failed for ${room}:`, error?.message);
  }
}

async function loadPersistedRoom(room) {
  try {
    const { loadRoomSnapshot } = await import('./db.js');
    return await loadRoomSnapshot(room);
  } catch {
    return null;
  }
}

async function restoreRoom(room) {
  if (restoredRooms.has(room)) return;
  if (restorationPromises.has(room)) return restorationPromises.get(room);

  const promise = (async () => {
    try {
      const persisted = await loadPersistedRoom(room);
      if (!persisted) return;
      if (persisted.meta) roomMeta.set(room, persisted.meta);
      if (Array.isArray(persisted.log)) logs.set(room, persisted.log);
      if (Array.isArray(persisted.commands)) commandHistory.set(room, persisted.commands);

      // Best effort replay for active rooms.
      const lastPhase = persisted.lastGame?.phase || persisted.snapshot?.game?.phase || '';
      const replayable = lastPhase && lastPhase !== 'ended' && lastPhase !== 'finished' && !/종료|승리|패배/.test((persisted.log || []).slice(-8).map((x) => x.text).join('\n'));
      if (replayable) {
        const commands = (persisted.commands || []).slice(-120);
        for (const item of commands) {
          try {
            await dispatchBotMessage(room, item.command, item.sender);
          } catch {
            break;
          }
        }
      }
      restoredRooms.add(room);
    } catch (error) {
      console.error(`[gameService] restoreRoom failed for ${room}:`, error);
    } finally {
      restorationPromises.delete(room);
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
  return /\[\s*(팀\s*)?티어전 결과\s*\]|경기 종료|게임 종료|경기가 끝난다|^.+ 승리! /m.test(text);
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
    } catch {}
  }, 900);
  restartTimers.set(room, timer);
}

function rememberCommand(room, sender, command) {
  const list = commandHistory.get(room) || [];
  list.push({ sender, command, at: Date.now() });
  while (list.length > 140) list.shift();
  commandHistory.set(room, list);
}

function sanitizeMode(value) {
  const num = Math.floor(Number(value) || 1);
  return Math.min(3, Math.max(1, num));
}

function sanitizeJobs(value) {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const job = String(raw || '').trim();
    if (!job || seen.has(job)) continue;
    seen.add(job);
    out.push(job);
  }
  return out;
}

function normalizeTimer(value = {}) {
  const enabled = !!value.enabled;
  const minutes = Math.min(60, Math.max(1, Math.floor(Number(value.minutes) || 10)));
  const increment = Math.min(60, Math.max(0, Math.floor(Number(value.increment) || 0)));
  return {
    enabled,
    initialSeconds: minutes * 60,
    incrementSeconds: increment,
    remaining: {},
    activePlayer: '',
    lastStartedAt: 0,
    expired: false
  };
}

function publicTimer(timer) {
  if (!timer?.enabled) return null;
  const remaining = { ...(timer.remaining || {}) };
  if (timer.activePlayer && timer.lastStartedAt && remaining[timer.activePlayer] !== undefined) {
    const elapsed = Math.max(0, Math.floor((Date.now() - timer.lastStartedAt) / 1000));
    remaining[timer.activePlayer] = Math.max(0, remaining[timer.activePlayer] - elapsed);
  }
  return {
    enabled: true,
    initialSeconds: timer.initialSeconds,
    incrementSeconds: timer.incrementSeconds,
    remaining,
    activePlayer: timer.activePlayer || '',
    expired: !!timer.expired
  };
}

function metaForSnapshot(room) {
  const meta = roomMeta.get(room);
  if (!meta) return null;
  return {
    ...meta,
    timer: publicTimer(meta.timer)
  };
}

function ensureClockLoop(room) {
  if (clockTimers.has(room)) return;
  const timer = setInterval(async () => {
    try {
      await updateRoomClock(room, { publish: true, finalize: true });
    } catch {}
  }, 1000);
  clockTimers.set(room, timer);
}

function stopClockLoop(room) {
  const timer = clockTimers.get(room);
  if (timer) clearInterval(timer);
  clockTimers.delete(room);
}

async function updateRoomClockInternal(room, options = {}) {
  const meta = roomMeta.get(room);
  const timer = meta?.timer;
  if (!timer?.enabled || timer.expired) return null;
  const game = await botRoomState(room);
  if (!game || game.phase === 'ended' || game.phase === 'finished') {
    stopClockLoop(room);
    return game;
  }
  if (game.phase !== 'playing' || !game.currentPlayer) return game;

  const now = Date.now();
  for (const player of game.players || []) {
    if (timer.remaining[player] === undefined) timer.remaining[player] = timer.initialSeconds;
  }

  if (!timer.activePlayer) {
    timer.activePlayer = game.currentPlayer;
    timer.lastStartedAt = now;
  } else if (timer.activePlayer !== game.currentPlayer) {
    if (timer.remaining[timer.activePlayer] !== undefined) {
      timer.remaining[timer.activePlayer] += timer.incrementSeconds;
    }
    timer.activePlayer = game.currentPlayer;
    timer.lastStartedAt = now;
  } else if (timer.lastStartedAt) {
    const elapsed = Math.max(0, Math.floor((now - timer.lastStartedAt) / 1000));
    if (elapsed > 0) {
      timer.remaining[timer.activePlayer] = Math.max(0, (timer.remaining[timer.activePlayer] ?? timer.initialSeconds) - elapsed);
      timer.lastStartedAt = now;
    }
  } else {
    timer.lastStartedAt = now;
  }

  if (timer.remaining[timer.activePlayer] <= 0 && options.finalize && !clockFinalizing.has(room)) {
    clockFinalizing.add(room);
    timer.expired = true;
    try {
      const loser = timer.activePlayer;
      append(room, 'system', '', [`[시스템]: ${loser}님의 시간이 모두 소진되었습니다.`]);
      const replies = await dispatchBotMessage(room, 'ㅈㅈ', loser);
      rememberCommand(room, loser, 'ㅈㅈ');
      append(room, loser, '시간패', replies);
      const state = await buildRoomSnapshot(room, false);
      await persistRoom(room, state);
      publishRoom(room, state);
    } finally {
      clockFinalizing.delete(room);
      stopClockLoop(room);
    }
    return await botRoomState(room);
  }

  if (options.publish) {
    const state = await buildRoomSnapshot(room, false);
    publishRoom(room, state);
  }
  return game;
}

export async function updateRoomClock(room, options = {}) {
  return withRoomLock(room, () => updateRoomClockInternal(room, options));
}

async function applyRoomOptionsInternal(room) {
  const meta = roomMeta.get(room);
  if (!meta) return;
  const disabled = sanitizeJobs(meta.disabledJobs);
  if (disabled.length) {
    await configureBotRoom(room, { disabledJobs: disabled });
  }
  if (meta.timer?.enabled) ensureClockLoop(room);
}

export async function applyRoomOptions(room) {
  return withRoomLock(room, () => applyRoomOptionsInternal(room));
}

function selectionBlocked(room, command) {
  const meta = roomMeta.get(room);
  const disabled = sanitizeJobs(meta?.disabledJobs);
  if (!disabled.length) return '';
  const match = String(command || '').match(/^1(?:ㅈㅅ|직업)\s+(.+)$/);
  if (!match) return '';
  const requested = match[1].trim();
  return disabled.find((job) => job === requested || job.replace(/\s+/g, '') === requested.replace(/\s+/g, '')) || '';
}

export async function createRoom({ nickname, mode = 1, practice = false, cpuJob = '', timer = {}, disabledJobs = [] }) {
  const room = code();
  const cleanMode = sanitizeMode(mode);
  const cleanDisabledJobs = sanitizeJobs(disabledJobs);
  const cleanCpuJob = cleanDisabledJobs.includes(cpuJob) ? '' : String(cpuJob || '').trim();
  
  // No lock needed for a brand new room code
  roomMeta.set(room, {
    createdAt: Date.now(),
    mode: cleanMode,
    practice,
    cpuJob: cleanCpuJob,
    owner: String(nickname || '').trim() || 'player',
    practiceGuest: null,
    disabledJobs: cleanDisabledJobs,
    timer: normalizeTimer(timer)
  });
  logs.set(room, []);
  commandHistory.set(room, []);
  
  return withRoomLock(room, async () => {
    const state = await sendCommandInternal({ room, nickname, command: startCommand(roomMeta.get(room)) });
    await applyRoomOptionsInternal(room);
    return state;
  });
}

export async function joinRoom({ room, nickname }) {
  return withRoomLock(room, async () => {
    await restoreRoom(room);
    const meta = roomMeta.get(room) || { createdAt: Date.now(), mode: 1, practice: false, owner: String(nickname || '').trim() || 'player', practiceGuest: null };
    const sender = String(nickname || '').trim() || 'player';
    if (meta.practice && meta.owner && meta.owner !== sender) {
      meta.practiceGuest = sender;
      meta.practiceGuestAt = Date.now();
      roomMeta.set(room, meta);
      append(room, 'system', '', [`[시스템]: 연습방 알림: ${sender}님이 방 코드로 들어왔습니다. 연습 종료 버튼을 눌러 일반 방으로 전환할 수 있습니다.`]);
      const state = await buildRoomSnapshot(room, true);
      await persistRoom(room, state);
      publishRoom(room, state);
      return state;
    }
    roomMeta.set(room, meta);
    return sendCommandInternal({ room, nickname, command: startCommand(meta) });
  });
}

async function sendCommandInternal({ room, nickname, command }) {
  await restoreRoom(room);
  const sender = String(nickname || '').trim() || 'player';
  updatePresence(room, sender, true);
  const msg = String(command || '').trim();
  await updateRoomClockInternal(room, { finalize: true });
  const blockedJob = selectionBlocked(room, msg);
  const replies = blockedJob
    ? [`[시스템]: ${blockedJob} 직업은 이 방에서 선택 불가능합니다.`]
    : (msg ? await dispatchBotMessage(room, msg, sender) : []);
  if (msg) rememberCommand(room, sender, msg);
  append(room, sender, msg, replies);
  await applyRoomOptionsInternal(room);
  await updateRoomClockInternal(room, { finalize: true });
  scheduleAutoRestart(room, sender, replies);
  const state = await buildRoomSnapshot(room, true);
  await persistRoom(room, state);
  publishRoom(room, state);
  return state;
}

export async function sendCommand({ room, nickname, command }) {
  return withRoomLock(room, () => sendCommandInternal({ room, nickname, command }));
}

export async function addChatMessage({ room, nickname, text }) {
  return withRoomLock(room, async () => {
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
    
    const state = await buildRoomSnapshot(room, true);
    publishRoom(room, state);
    return state;
  });
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
    meta: metaForSnapshot(room),
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
  return withRoomLock(room, async () => {
    await restoreRoom(room);
    await updateRoomClockInternal(room, { finalize: true });
    return await buildRoomSnapshot(room, true);
  });
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

export async function listRooms() {
  const allGames = await botAllRoomStates().catch(() => ({}));
  const rooms = [];
  const seen = new Set();
  for (const [room, meta] of roomMeta.entries()) {
    const game = allGames[room] || null;
    if (game?.phase === 'ended' || game?.phase === 'finished') continue;
    seen.add(room);
    rooms.push({
      room,
      meta: metaForSnapshot(room),
      phase: game?.phase || 'waiting',
      players: game?.players || [],
      currentPlayer: game?.currentPlayer || '',
      turnCount: game?.turnCount || 1,
      requiredPlayers: Number(meta?.mode || 1) * 2,
      createdAt: meta?.createdAt || 0
    });
  }
  for (const [room, game] of Object.entries(allGames)) {
    if (seen.has(room) || game?.phase === 'ended' || game?.phase === 'finished') continue;
    rooms.push({
      room,
      meta: metaForSnapshot(room),
      phase: game?.phase || 'waiting',
      players: game?.players || [],
      currentPlayer: game?.currentPlayer || '',
      turnCount: game?.turnCount || 1,
      requiredPlayers: Number(game?.teamMode || 1) * 2,
      createdAt: 0
    });
  }
  return rooms.sort((a, b) => {
    const openA = a.phase === 'waiting' || a.phase === 'job_selection';
    const openB = b.phase === 'waiting' || b.phase === 'job_selection';
    if (openA !== openB) return openA ? -1 : 1;
    return Number(b.createdAt || 0) - Number(a.createdAt || 0);
  });
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
