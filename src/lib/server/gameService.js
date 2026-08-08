import { randomBytes, createHash } from 'node:crypto';
import { botAddCpuToLobby, botAllRoomStates, botBootStatus, botCreateWebLobby, botJoinWebLobby, botLeaveWebLobby, botRankings, botRestoreWebLobby, botRoomState, botSetRoomCombat, botStartWebLobby, configureBotRoom, dispatchBotMessage } from './botEngine.js';
import { isAllowedWebCommand } from './webCommands.js';
import { publishRoom } from './realtime.js';
import { getSessionCookieName, getUserByToken } from './auth.js';

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
// room -> Promise, so concurrent requests during a cold start await the SAME restore
// instead of racing against a half-replayed game object.
const restoreInFlight = new Map();
const restoredRooms = new Set();
// room -> timestamp. The bot deletes games[room] when a match is finalized, so the
// game object itself can never report an "ended" phase; this is the durable marker.
const finishedRooms = new Map();
const restartTimers = new Map();
const clockTimers = new Map();
const clockFinalizing = new Set();
const presence = new Map(); // room -> { nickname -> { online: boolean, lastSeen: timestamp } }
const roomChats = new Map(); // room -> [{ id, sender, text, at }]
const directMessages = new Map(); // conversationKey -> [{ id, from, to, text, at }]
const roomInvites = new Map(); // nickname -> [{ from, room, roomName, at }]
const INVITE_TTL_MS = 15 * 60 * 1000;

function dmKey(a, b) {
  return [a, b].sort().join('\x00');
}

const QUEST_COUNT = 16;
const CPU_RANDOM_JOBS = [
  '해커', '투자자', '환자', '수집가', '감시자', '뜀틀선수', '전우치', '기관사', '늑대인간', '시프터', '비밀요원', '67', '사과', '시인', '공룡', '마법사', '사신', '수학자', '과학자', '갈릴레오', '작곡가', '스폰지밥', '나이트', '생존자', '악당', '기자', '검객', '마하트마간디', '은하계전사', '혜성전사', '수리사', '우라늄', '고죠', '스핔이', '해달', '피보나치', '?', '프로그래머', '홍명보', '페인터', '반장'
];

function code() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 300; attempt++) {
    const room =
      letters[Math.floor(Math.random() * 26)] +
      letters[Math.floor(Math.random() * 26)];
    if (!roomMeta.has(room)) return room;
  }
  throw new Error('방 코드를 만들 수 없습니다. 잠시 후 다시 시도하세요.');
}

function hashRoomPassword(password) {
  const value = String(password || '').trim();
  if (!value) return '';
  return createHash('sha256').update(value).digest('hex');
}

function verifyRoomPassword(meta, password) {
  if (!meta?.passwordHash) return true;
  return hashRoomPassword(password) === meta.passwordHash;
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
      lastGame: state?.game || null,
      finishedAt: finishedRooms.get(room) || 0
    });
  } catch {
    // Mongo unavailable; in-memory room still works in local/dev.
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

function restoreRoom(room) {
  if (restoredRooms.has(room)) return Promise.resolve();
  // Two requests can hit a cold-started instance at once. Marking the room restored
  // before the async work finished let the second caller proceed against a partially
  // replayed game, which surfaced as the game snapping back to job selection.
  const existing = restoreInFlight.get(room);
  if (existing) return existing;
  const task = performRestore(room).finally(() => {
    restoreInFlight.delete(room);
    restoredRooms.add(room);
  });
  restoreInFlight.set(room, task);
  return task;
}

// A replayed command list has to reproduce the whole game or none of it. Stopping
// halfway leaves games[room] sitting in whatever phase it happened to reach — almost
// always job_selection, right after the room-creating command.
async function performRestore(room) {
  const persisted = await loadPersistedRoom(room);
  if (!persisted) return;
  if (persisted.meta) roomMeta.set(room, persisted.meta);
  if (Array.isArray(persisted.log)) logs.set(room, persisted.log);
  if (Array.isArray(persisted.commands)) commandHistory.set(room, persisted.commands);
  if (persisted.finishedAt) finishedRooms.set(room, persisted.finishedAt);
  // The bot-side registry is per-VM, so a cold start has to re-declare it before any
  // replayed command re-creates the game.
  await botSetRoomCombat(room, !!persisted.meta?.combat);

  // Best effort replay for active rooms. This keeps the VM game object alive after a serverless cold start.
  // A finished match must never be replayed: the bot would re-create the room and walk
  // it back to job selection, and rating-changing commands would run a second time.
  if (finishedRooms.has(room)) return;
  const lastGame = persisted.lastGame || persisted.snapshot?.game || null;
  const lastPhase = lastGame?.phase || '';
  if (!lastPhase || lastPhase === 'ended' || lastPhase === 'finished') return;

  const commands = persisted.commands || [];
  // The command log is capped, so an older room may no longer hold the command that
  // created the game. Replaying from the middle just throws on every entry.
  const startIndex = commands.findIndex((item) => isGameStartCommand(item?.command));
  if (startIndex !== -1) {
    for (const item of commands.slice(startIndex)) {
      try {
        await dispatchBotMessage(room, item.command, item.sender);
      } catch {
        // Drop the partial game rather than exposing a half-replayed state; callers
        // fall back to the persisted snapshot, which is at least self-consistent.
        await discardBotRoom(room);
        break;
      }
    }
  }

  // Web lobbies are created without a 1채린/1연습 command, so command replay cannot
  // rebuild them after a serverless cold start. Rehydrate active web games from the
  // persisted game snapshot instead.
  const webRestorePhases = new Set(['waiting', 'job_selection', 'combat_draft', 'playing']);
  if (!(await botRoomState(room)) && webRestorePhases.has(lastPhase) && persisted.meta && !persisted.meta.practice) {
    await botRestoreWebLobby(room, { game: lastGame, meta: persisted.meta });
    await applyRoomOptions(room);
  }
}

function isGameStartCommand(command) {
  return /^1(채린|연습)/.test(String(command || '').trim());
}

async function discardBotRoom(room) {
  try {
    const { botDeleteRoom } = await import('./botEngine.js');
    await botDeleteRoom(room);
  } catch {
    // Nothing to clean up if the engine never created the room.
  }
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
  const extras = [];
  if (meta.cpuLevel) extras.push(`난이도 ${meta.cpuLevel}`);
  if (meta.cpuThink) extras.push('과정 켬');
  const suffix = extras.length ? ` ${extras.join(' ')}` : '';
  return `1연습${modeText}${job ? ` ${job}` : ''}${suffix}`;
}

function scheduleAutoRestart(room, sender, ended) {
  const meta = roomMeta.get(room);
  if (!meta || !ended) return;
  if (restartTimers.has(room)) clearTimeout(restartTimers.get(room));
  append(room, 'system', '', ['[시스템]: 사람이 충분하다고 보고 다음 게임을 자동으로 준비합니다.']);
  const timer = setTimeout(async () => {
    restartTimers.delete(room);
    try {
      const command = startCommand(meta);
      // A new match starts here, so the finished marker lifts and the previous game's
      // commands must not stay in the replay log — they would rebuild the old game.
      finishedRooms.delete(room);
      commandHistory.set(room, []);
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

export function isCpuPlayer(name) {
  return /^채린컴퓨터\d*$/.test(String(name || '').trim());
}

async function destroyWaitingRoom(room) {
  await discardBotRoom(room);
  roomMeta.delete(room);
  logs.delete(room);
  roomChats.delete(room);
  presence.delete(room);
  commandHistory.delete(room);
  try {
    const { deleteRoomSnapshot } = await import('./db.js');
    await deleteRoomSnapshot(room);
  } catch {}
  publishRoom(room, { room, meta: null, game: null, log: [], chats: [] });
}

async function cleanupRoomIfCpuOnly(room) {
  const game = await botRoomState(room);
  if (!game || game.phase !== 'waiting') return false;
  const humans = (game.players || []).filter((p) => !isCpuPlayer(p));
  if (!humans.length) {
    await destroyWaitingRoom(room);
    return true;
  }
  return false;
}

function requiredPlayersFromMeta(meta, game = null) {
  if (!meta && !game) return 2;
  const gameMode = String(meta?.gameMode || '');
  const gs = game?.gueruleSettings;
  if (gameMode.startsWith('geonmat:') || gs?.geonmatRounds > 0 || Number(meta?.geonmatPlayerCap) >= 1) {
    const cap = Number(meta?.geonmatPlayerCap) || Number(gs?.geonmatPlayerCap) || 0;
    return cap >= 1 ? cap : 4;
  }
  return Number(meta?.mode || game?.teamMode || 1) * 2;
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
    timer: publicTimer(meta.timer),
    ready: { ...(meta.ready || {}) },
    hasPassword: !!meta.passwordHash,
    passwordHash: undefined
  };
}

function roomOptionsFromMeta(meta) {
  const options = {};
  if (!meta) return options;
  const disabled = sanitizeJobs(meta.disabledJobs);
  if (disabled.length) options.disabledJobs = disabled;
  if (meta.dictSource) options.dictSource = meta.dictSource;
  if (meta.gameMode) options.gameMode = meta.gameMode;
  if (meta.pyohanLives) options.pyohanLives = meta.pyohanLives;
  if (meta.geonmatRounds) options.geonmatRounds = meta.geonmatRounds;
  if (meta.geonmatPlayerCap >= 1) options.geonmatPlayerCap = meta.geonmatPlayerCap;
  if (meta.searchAllowed !== undefined) options.searchAllowed = !!meta.searchAllowed;
  if (meta.cpuLevel) options.cpuLevel = meta.cpuLevel;
  if (meta.cpuThink !== undefined) options.cpuThink = !!meta.cpuThink;
  if (meta.chainMode) options.chainMode = meta.chainMode;
  if (meta.duEum !== undefined) options.duEum = !!meta.duEum;
  if (meta.rated !== undefined) options.rated = !!meta.rated;
  return options;
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

async function updateRoomClock(room, options = {}) {
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

async function applyRoomOptions(room) {
  const meta = roomMeta.get(room);
  if (!meta) return;
  const options = roomOptionsFromMeta(meta);
  if (Object.keys(options).length) {
    await configureBotRoom(room, options);
  }
  if (meta.timer?.enabled) ensureClockLoop(room);
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

export async function createRoom({
  nickname,
  mode = 1,
  practice = false,
  cpuJob = '',
  timer = {},
  disabledJobs = [],
  combat = false,
  dictSource = 'default',
  gameMode = 'guerule',
  pyohanLives = 3,
  geonmatRounds = 5,
  geonmatPlayerCap = 0,
  playerCount = 0,
  searchAllowed = false,
  cpuLevel = '',
  cpuThink = false,
  chainMode = 'end',
  duEum = true,
  rated = true,
  roomName = '',
  roomPassword = '',
  isGuest = false
}) {
  const room = code();
  const owner = String(nickname || '').trim() || 'player';
  const resolvedGameMode = combat ? 'combat' : String(gameMode || 'guerule');
  const isGeonmat = String(resolvedGameMode).startsWith('geonmat:');
  let cleanMode = sanitizeMode(mode);
  let resolvedCap = 0;
  let resolvedCount = 0;
  if (isGeonmat) {
    resolvedCap = Math.min(20, Math.max(1, Math.floor(Number(geonmatPlayerCap || playerCount) || 4)));
    resolvedCount = resolvedCap;
    cleanMode = 1;
  } else {
    const rawCount = Math.floor(Number(playerCount) || cleanMode * 2 || 2);
    const even = Math.min(6, Math.max(2, rawCount % 2 === 0 ? rawCount : rawCount - 1));
    resolvedCount = even;
    cleanMode = even / 2;
  }
  const passwordHash = hashRoomPassword(roomPassword);
  let resolvedChain = chainMode === 'start' ? 'start' : 'end';
  if (isGeonmat) resolvedChain = 'end';
  const cleanDisabledJobs = sanitizeJobs(disabledJobs);
  const cleanCpuJob = cleanDisabledJobs.includes(cpuJob) ? '' : String(cpuJob || '').trim();
  roomMeta.set(room, {
    createdAt: Date.now(),
    name: String(roomName || '').trim().slice(0, 32),
    passwordHash: passwordHash || '',
    mode: cleanMode,
    playerCount: resolvedCount,
    geonmatPlayerCap: resolvedCap,
    practice,
    cpuJob: cleanCpuJob,
    owner,
    practiceGuest: null,
    disabledJobs: cleanDisabledJobs,
    combat: !!combat,
    dictSource: String(dictSource || 'default'),
    gameMode: resolvedGameMode,
    pyohanLives: Number(pyohanLives) || 3,
    geonmatRounds: Number(geonmatRounds) || 5,
    searchAllowed: !!searchAllowed,
    cpuLevel: String(cpuLevel || ''),
    cpuThink: !!cpuThink,
    chainMode: resolvedChain,
    duEum: duEum !== false,
    rated: isGuest ? false : rated !== false,
    ready: { [owner]: true },
    timer: normalizeTimer(timer)
  });
  logs.set(room, []);
  commandHistory.set(room, []);
  await botSetRoomCombat(room, !!combat);
  if (practice) {
    await sendCommand({ room, nickname: owner, command: startCommand(roomMeta.get(room)), internal: true });
  } else {
    await botCreateWebLobby(room, { owner, mode: cleanMode, combat: !!combat });
    append(room, 'system', '', [`[시스템]: ${owner}님이 방을 만들었습니다. 플레이어가 모이면 준비 후 시작하세요.`]);
  }
  await applyRoomOptions(room);
  return await getRoomSnapshot(room);
}

export async function joinRoom({ room, nickname, password = '' }) {
  await restoreRoom(room);
  const meta = roomMeta.get(room);
  if (!meta) throw new Error('방을 찾을 수 없습니다.');
  if (!verifyRoomPassword(meta, password)) throw new Error('비밀번호가 틀렸습니다.');
  const sender = String(nickname || '').trim() || 'player';
  if (meta.practice && meta.owner && meta.owner !== sender) {
    meta.practiceGuest = sender;
    meta.practiceGuestAt = Date.now();
    roomMeta.set(room, meta);
    append(room, 'system', '', [`[시스템]: 연습방 알림: ${sender}님이 방 코드로 들어왔습니다.`]);
    const state = await getRoomSnapshot(room);
    await persistRoom(room, state);
    publishRoom(room, state);
    return state;
  }
  if (!roomMeta.has(room)) roomMeta.set(room, meta);
  if (!meta.practice) {
    await botJoinWebLobby(room, sender);
    meta.ready = meta.ready || {};
    meta.ready[sender] = false;
    roomMeta.set(room, meta);
    append(room, 'system', '', [`[시스템]: ${sender}님이 입장했습니다.`]);
    const state = await getRoomSnapshot(room);
    await persistRoom(room, state);
    publishRoom(room, state);
    return state;
  }
  roomMeta.set(room, meta);
  return sendCommand({ room, nickname, command: startCommand(meta), internal: true });
}

export async function setRoomReady({ room, nickname, ready = true }) {
  await restoreRoom(room);
  await ensureWebGameRoom(room);
  const meta = roomMeta.get(room);
  if (!meta) throw new Error('방을 찾을 수 없습니다.');
  const sender = String(nickname || '').trim();
  const game = await botRoomState(room);
  if (!game || game.phase !== 'waiting') throw new Error('대기 중인 방이 아닙니다.');
  if (!(game.players || []).includes(sender)) throw new Error('방에 참가 중이 아닙니다.');
  meta.ready = meta.ready || {};
  meta.ready[sender] = !!ready;
  roomMeta.set(room, meta);
  append(room, 'system', '', [`[시스템]: ${sender}님이 ${ready ? '준비' : '대기'} 상태입니다.`]);
  const state = await getRoomSnapshot(room);
  await persistRoom(room, state);
  publishRoom(room, state);
  return state;
}

export async function startRoomGame({ room, nickname }) {
  await restoreRoom(room);
  await ensureWebGameRoom(room);
  const meta = roomMeta.get(room);
  if (!meta) throw new Error('방을 찾을 수 없습니다.');
  const sender = String(nickname || '').trim();
  if (meta.owner !== sender) throw new Error('방장만 게임을 시작할 수 있습니다.');
  const game = await botRoomState(room);
  if (!game || game.phase !== 'waiting') throw new Error('대기 중인 방이 아닙니다.');
  const players = game.players || [];
  const required = requiredPlayersFromMeta(meta, game);
  if (players.length < required) throw new Error(`인원이 부족합니다. (${players.length}/${required})`);
  const ready = meta.ready || {};
  for (const player of players) {
    if (player === meta.owner) continue;
    if (!ready[player]) throw new Error(`${player}님이 아직 준비하지 않았습니다.`);
  }
  await botStartWebLobby(room, meta);
  append(room, 'system', '', ['[시스템]: 게임을 시작합니다.']);
  const state = await getRoomSnapshot(room);
  await persistRoom(room, state);
  publishRoom(room, state);
  return state;
}

export async function addRoomBot({ room, nickname, cpuLevel = '보통', cpuThink = false, cpuJob = '' }) {
  await restoreRoom(room);
  await ensureWebGameRoom(room);
  const meta = roomMeta.get(room);
  if (!meta) throw new Error('방을 찾을 수 없습니다.');
  const sender = String(nickname || '').trim();
  if (meta.owner !== sender) throw new Error('방장만 봇을 추가할 수 있습니다.');
  const game = await botRoomState(room);
  if (!game || game.phase !== 'waiting') throw new Error('대기 중인 방이 아닙니다.');

  const { cpuName } = await botAddCpuToLobby(room, { cpuLevel, cpuThink, cpuJob });
  meta.ready = meta.ready || {};
  meta.ready[cpuName] = true;
  roomMeta.set(room, meta);
  append(room, 'system', '', [`[시스템]: ${cpuName}이(가) 참가했습니다.`]);
  const state = await getRoomSnapshot(room);
  await persistRoom(room, state);
  publishRoom(room, state);
  return state;
}

export async function leaveRoom({ room, nickname }) {
  await restoreRoom(room);
  const sender = String(nickname || '').trim();
  const meta = roomMeta.get(room);
  if (!meta) return { left: true, room: '' };
  if (meta.practice) {
    return sendCommand({ room, nickname: sender, command: 'ㅈㅈ', internal: false });
  }
  const game = await botRoomState(room);
  if (game?.phase === 'waiting') {
    await botLeaveWebLobby(room, sender);
    if (meta.ready) delete meta.ready[sender];
    const after = await botRoomState(room);
    if (!after) {
      await destroyWaitingRoom(room);
      return { left: true, room: '' };
    }
    if (await cleanupRoomIfCpuOnly(room)) {
      return { left: true, room: '' };
    }
    if (meta.owner === sender) {
      const remaining = (await botRoomState(room))?.players || [];
      const nextOwner = remaining.find((p) => !isCpuPlayer(p)) || remaining[0];
      if (nextOwner) meta.owner = nextOwner;
    }
    roomMeta.set(room, meta);
    append(room, 'system', '', [`[시스템]: ${sender}님이 퇴장했습니다.`]);
    const state = await getRoomSnapshot(room);
    await persistRoom(room, state);
    publishRoom(room, state);
    return { left: true, room: '' };
  }
  return sendCommand({ room, nickname: sender, command: 'ㅈㅈ' });
}

export async function updateRoomSettings({ room, nickname, patch = {} }) {
  await restoreRoom(room);
  await ensureWebGameRoom(room);
  const meta = roomMeta.get(room);
  if (!meta) throw new Error('방을 찾을 수 없습니다.');
  const sender = String(nickname || '').trim();
  if (meta.owner !== sender) throw new Error('방장만 설정을 변경할 수 있습니다.');
  const game = await botRoomState(room);
  if (!game || game.phase !== 'waiting') throw new Error('대기 중인 방만 설정을 변경할 수 있습니다.');

  if (patch.roomName !== undefined) {
    meta.name = String(patch.roomName || '').trim().slice(0, 32);
  }
  if (patch.roomPassword !== undefined) {
    meta.passwordHash = hashRoomPassword(patch.roomPassword);
  }
  const isGeonmat = String(meta.gameMode || '').startsWith('geonmat:');
  if (patch.chainMode !== undefined && !isGeonmat) {
    meta.chainMode = patch.chainMode === 'start' ? 'start' : 'end';
  }
  if (patch.dictSource) {
    meta.dictSource = String(patch.dictSource);
  }
  if (patch.duEum !== undefined) meta.duEum = !!patch.duEum;
  if (patch.searchAllowed !== undefined) meta.searchAllowed = !!patch.searchAllowed;
  if (patch.rated !== undefined) meta.rated = !!patch.rated;
  if (patch.pyohanLives !== undefined && meta.gameMode === 'pyohan') {
    meta.pyohanLives = Math.min(9, Math.max(1, Math.floor(Number(patch.pyohanLives) || 3)));
  }
  if (patch.geonmatRounds !== undefined && isGeonmat) {
    meta.geonmatRounds = Math.min(20, Math.max(1, Math.floor(Number(patch.geonmatRounds) || 5)));
  }
  if (patch.disabledJobs !== undefined) {
    meta.disabledJobs = sanitizeJobs(patch.disabledJobs);
  }
  if (patch.timer) {
    const prev = meta.timer || normalizeTimer({});
    meta.timer = normalizeTimer({
      enabled: patch.timer.enabled ?? prev.enabled,
      minutes: patch.timer.minutes ?? Math.floor((prev.initialSeconds || 600) / 60),
      increment: patch.timer.increment ?? prev.incrementSeconds ?? 0
    });
  }
  if (patch.playerCount !== undefined) {
    const count = Math.floor(Number(patch.playerCount) || 2);
    if (isGeonmat) {
      const cap = Math.min(20, Math.max(1, count));
      meta.geonmatPlayerCap = cap;
      meta.playerCount = cap;
      meta.mode = 1;
    } else {
      const even = Math.min(6, Math.max(2, count % 2 === 0 ? count : count - 1));
      meta.playerCount = even;
      meta.mode = even / 2;
    }
    const required = requiredPlayersFromMeta(meta, game);
    if ((game.players || []).length > required) {
      throw new Error(`현재 ${game.players.length}명이 참가 중이라 인원을 ${required}명 미만으로 줄일 수 없습니다.`);
    }
  }

  meta.ready = {};
  for (const player of game.players || []) {
    if (isCpuPlayer(player)) meta.ready[player] = true;
    else if (player === meta.owner) meta.ready[player] = true;
    else meta.ready[player] = false;
  }

  roomMeta.set(room, meta);
  await applyRoomOptions(room);
  append(room, 'system', '', ['[시스템]: 방장이 방 설정을 변경했습니다. 다시 준비해 주세요.']);
  const state = await getRoomSnapshot(room);
  await persistRoom(room, state);
  publishRoom(room, state);
  return state;
}

async function ensureWebGameRoom(room) {
  if (await botRoomState(room)) return;
  const meta = roomMeta.get(room);
  if (!meta || meta.practice) return;
  const persisted = await loadPersistedRoom(room);
  const lastGame = persisted?.lastGame || persisted?.snapshot?.game || null;
  const phases = new Set(['waiting', 'job_selection', 'combat_draft', 'playing']);
  if (!lastGame?.phase || !phases.has(lastGame.phase)) return;
  if (lastGame.phase === 'waiting' && lastGame.started) return;
  await botRestoreWebLobby(room, { game: lastGame, meta: persisted?.meta || meta });
  await applyRoomOptions(room);
}

export async function sendCommand({ room, nickname, command, internal = false }) {
  await restoreRoom(room);
  await ensureWebGameRoom(room);
  const sender = String(nickname || '').trim() || 'player';
  updatePresence(room, sender, true);
  const msg = String(command || '').trim();
  if (!internal && msg && !isAllowedWebCommand(msg)) {
    throw new Error('사이트 버튼으로만 조작할 수 있습니다.');
  }
  // Starting a fresh match clears the finished marker and the previous game's replay log.
  if (isGameStartCommand(msg)) {
    finishedRooms.delete(room);
    commandHistory.set(room, []);
  }
  await updateRoomClock(room, { finalize: true });
  const blockedJob = selectionBlocked(room, msg);
  // finalizeMatch deletes games[room] on the bot side, so "the game object existed
  // before this command and is gone afterwards" is the authoritative end-of-match
  // signal. Matching on reply text missed practice-mode endings and fired on any
  // message that merely mentioned 승리/종료.
  const hadGame = !!(await botRoomState(room));
  const replies = blockedJob
    ? [`[시스템]: ${blockedJob} 직업은 이 방에서 선택 불가능합니다.`]
    : (msg ? await dispatchBotMessage(room, msg, sender) : []);
  const ended = hadGame && !(await botRoomState(room));
  if (ended) finishedRooms.set(room, Date.now());
  if (msg) rememberCommand(room, sender, msg);
  append(room, sender, msg, replies);
  await applyRoomOptions(room);
  await updateRoomClock(room, { finalize: true });
  scheduleAutoRestart(room, sender, ended);
  const state = await buildRoomSnapshot(room, true);
  await persistRoom(room, state);
  publishRoom(room, state);
  return state;
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
  await restoreRoom(room);
  await updateRoomClock(room, { finalize: true });
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
      name: meta?.name || '',
      hasPassword: !!meta?.passwordHash,
      phase: game?.phase || 'waiting',
      players: game?.players || [],
      currentPlayer: game?.currentPlayer || '',
      turnCount: game?.turnCount || 1,
      requiredPlayers: requiredPlayersFromMeta(meta, game),
      createdAt: meta?.createdAt || 0
    });
  }
  for (const [room, game] of Object.entries(allGames)) {
    if (seen.has(room) || game?.phase === 'ended' || game?.phase === 'finished') continue;
    rooms.push({
      room,
      meta: metaForSnapshot(room),
      name: meta?.name || '',
      hasPassword: !!meta?.passwordHash,
      phase: game?.phase || 'waiting',
      players: game?.players || [],
      currentPlayer: game?.currentPlayer || '',
      turnCount: game?.turnCount || 1,
      requiredPlayers: requiredPlayersFromMeta(roomMeta.get(room), game),
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

function pruneRoomInvites(nickname) {
  const user = String(nickname || '').trim();
  if (!user) return [];
  const now = Date.now();
  const list = (roomInvites.get(user) || []).filter((item) => now - item.at < INVITE_TTL_MS);
  if (list.length) roomInvites.set(user, list);
  else roomInvites.delete(user);
  return list;
}

export function sendRoomInvite({ from, to, room, roomName = '' }) {
  const target = String(to || '').trim();
  const sender = String(from || '').trim();
  const code = String(room || '').toUpperCase();
  if (!target || !sender || !code) throw new Error('invalid');
  const list = pruneRoomInvites(target);
  const filtered = list.filter((item) => item.room !== code);
  const invite = {
    from: sender,
    room: code,
    roomName: String(roomName || '').trim(),
    at: Date.now()
  };
  filtered.unshift(invite);
  roomInvites.set(target, filtered.slice(0, 10));
  const label = invite.roomName || code;
  addDirectMessage({
    from: sender,
    to: target,
    text: `🎮 "${label}" 방에 초대합니다. 로비 방 목록에서 참가하세요.`
  });
  return { ok: true, invite };
}

export function getRoomInvites(nickname) {
  return pruneRoomInvites(nickname);
}

export function dismissRoomInvite(nickname, room) {
  const user = String(nickname || '').trim();
  const code = String(room || '').toUpperCase();
  const list = pruneRoomInvites(user).filter((item) => item.room !== code);
  if (list.length) roomInvites.set(user, list);
  else roomInvites.delete(user);
}
