import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import bundledBotSource from '../../../bot.js?raw';
import { resolveBotDataPath, readJsonFile, writeJsonFile, ensureRuntimeDir, runtimeDir } from './runtime.js';
import { installCpuStrategyPatch } from './cpuStrategyPatch.js';
import { flushRatingSyncs, isRatingJsonPath, queueRatingSync } from './ratingSync.js';

let enginePromise = null;

const QUESTS = [
  { id: 'first_win', title: '첫 승리', reward: '첫 승의 증인', desc: '아무 경기에서 1승', target: 1, progress: (p) => p.wins || 0 },
  { id: 'win_10', title: '10승 달성', reward: '연승 입문자', desc: '누적 10승', target: 10, progress: (p) => p.wins || 0 },
  { id: 'win_50', title: '50승 달성', reward: '끝말 사냥꾼', desc: '누적 50승', target: 50, progress: (p) => p.wins || 0 },
  { id: 'win_100', title: '100승 달성', reward: '채린룰 고인물', desc: '누적 100승', target: 100, progress: (p) => p.wins || 0 },
  { id: 'job_5', title: '직업 숙련 I', reward: '직업 견습생', desc: '한 직업으로 5승', target: 5, progress: (p) => bestJobWins(p) },
  { id: 'job_20', title: '직업 숙련 II', reward: '직업 장인', desc: '한 직업으로 20승', target: 20, progress: (p) => bestJobWins(p) },
  { id: 'job_50', title: '직업 숙련 III', reward: '직업의 지배자', desc: '한 직업으로 50승', target: 50, progress: (p) => bestJobWins(p) },
  { id: 'rating_400', title: '실버권 진입', reward: '랭크 등반가', desc: '레이팅 400 달성', target: 400, progress: (p) => p.rating || 0 },
  { id: 'rating_600', title: '골드권 진입', reward: '황금 감각', desc: '레이팅 600 달성', target: 600, progress: (p) => p.rating || 0 },
  { id: 'rating_800', title: '플래티넘권 진입', reward: '백금 전략가', desc: '레이팅 800 달성', target: 800, progress: (p) => p.rating || 0 },
  { id: 'rating_1000', title: '다이아몬드 달성', reward: '다이아몬드', desc: '레이팅 1000 달성', target: 1000, progress: (p) => p.rating || 0 },
  { id: 'challenger', title: '챌린저 달성', reward: '챌린저', desc: '레이팅 1800 달성', target: 1800, progress: (p) => p.rating || 0 },
  { id: 'streak_5', title: '5연승', reward: '불붙은 연승러', desc: '최대/현재 5연승', target: 5, progress: (p) => p.maxWinStreak || p.winStreak || 0 },
  { id: 'streak_10', title: '10연승', reward: '무패의 압박', desc: '최대/현재 10연승', target: 10, progress: (p) => p.maxWinStreak || p.winStreak || 0 },
  { id: 'games_100', title: '100판 플레이', reward: '전장의 기록자', desc: '누적 100판', target: 100, progress: (p) => p.games || ((p.wins || 0) + (p.losses || 0)) },
  { id: 'beat_rank1', title: '랭킹 1위 격파', reward: '왕좌 파괴자', desc: '경기 시작 전 전체 랭킹 1위에게 승리', target: 1, progress: (p) => p.beatRank1 ? 1 : 0 }
];

// Queue DB sync whenever bot JSON data is saved. The queue is flushed before API responses return.
function syncRatingsToMongo(data) {
  queueRatingSync(data);
}

function cloneJson(value, fallback = {}) {
  try {
    return JSON.parse(JSON.stringify(value ?? fallback));
  } catch (e) {
    console.warn('[botEngine] JSON 복제 실패:', e?.message);
    return fallback;
  }
}

function createContext(initialRatings = {}) {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Math,
    Date,
    JSON,
    FileStream: {
      readJson(inputPath) {
        return readJsonFile(resolveBotDataPath(inputPath), null);
      },
      writeJson(inputPath, value) {
        if (isRatingJsonPath(inputPath)) {
          syncRatingsToMongo(value);
        } else {
          writeJsonFile(resolveBotDataPath(inputPath), value);
        }
      }
    },
    RatingDB: {
      load() {
        return cloneJson(initialRatings, {});
      },
      save(value) {
        syncRatingsToMongo(value);
      }
    },
    Api: { gc() {} },
    java: {
      lang: { System: { gc() {} } },
      io: {
        File: function File(inputPath) {
          return { exists: () => existsSync(resolveBotDataPath(inputPath)) };
        },
        RandomAccessFile: function RandomAccessFile() {
          throw new Error('RandomAccessFile is not available in the web runtime.');
        }
      },
      nio: {
        ByteBuffer: { allocateDirect: () => ({ order() {}, putFloat() {}, rewind() {}, getFloat: () => 0 }) },
        ByteOrder: { nativeOrder: () => null },
        channels: { FileChannel: { MapMode: { READ_ONLY: 'READ_ONLY' } } }
      }
    },
    Packages: {}
  };
  return vm.createContext(sandbox);
}

function normalizeLine(text) {
  return String(text || '')
    .replace(/​+/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

function bootSync(initialRatings = {}) {
  ensureRuntimeDir();
  const source = (bundledBotSource || readFileSync(fileURLToPath(new URL('../../../bot.js', import.meta.url)), 'utf8'))
    .replace('buildCpuJobSyllableKnowledge();', '/* skipped in web runtime: buildCpuJobSyllableKnowledge(); */');
  const context = createContext(initialRatings);
  const result = vm.runInContext(`${source}\n; ({ Bot, response })`, context, { filename: 'bot.js' });
  context.__Bot = result.Bot;
  context.__response = result.response;
  installCpuStrategyPatch(context);

  const response = context.__response;
  if (typeof response !== 'function') {
    throw new Error('bot.js did not expose a response function.');
  }

  const out = [];
  response('admin_room', '1t listload', 'admin', true, { reply: (text) => out.push(normalizeLine(text)) });
  return { context, response, bootLog: out.filter(Boolean) };
}

export async function getBotEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      let dbRatings = {};
      try {
        const { loadRatings } = await import('./db.js');
        dbRatings = await loadRatings();
      } catch (err) {
        console.warn('[botEngine] DB 레이팅 로드 실패:', err?.message);
      }
      const engine = bootSync(dbRatings);
      return engine;
    })();
  }
  return enginePromise;
}

function getTierPlayers(context) {
  const scopePlayers = context.__Bot?.scope?.tierPlayerData;
  if (scopePlayers && typeof scopePlayers === 'object') return scopePlayers;
  if (context.tierPlayerData && typeof context.tierPlayerData === 'object') return context.tierPlayerData;
  if (context.__Bot?.scope) context.__Bot.scope.tierPlayerData = {};
  return context.__Bot?.scope?.tierPlayerData || {};
}

function getGames(context) {
  return context.__Bot?.scope?.games || context.games || {};
}

function bestJobWins(player) {
  const stats = player?.jobStats || {};
  return Object.values(stats).reduce((best, row) => Math.max(best, Number(row?.wins || 0)), 0);
}

function bestJobName(player) {
  const stats = player?.jobStats || {};
  let bestName = '';
  let bestWins = -1;
  for (const [name, row] of Object.entries(stats)) {
    const wins = Number(row?.wins || 0);
    if (wins > bestWins) {
      bestName = name;
      bestWins = wins;
    }
  }
  return bestName;
}

function normalizePlayerRecord(player) {
  if (!player || typeof player !== 'object') return null;
  player.wins = Number(player.wins || 0);
  player.losses = Number(player.losses || 0);
  player.rating = Number(player.rating || 0);
  player.games = Number(player.games || (player.wins + player.losses));
  player.winStreak = Number(player.winStreak || 0);
  player.maxWinStreak = Math.max(Number(player.maxWinStreak || 0), player.winStreak);
  if (!player.achievements || typeof player.achievements !== 'object') player.achievements = {};
  if (!Array.isArray(player.titles)) player.titles = [];
  if (!player.equippedTitle && player.titles.length) player.equippedTitle = player.titles[0];
  return player;
}

function rankLeaderName(players) {
  return Object.entries(players)
    .sort((a, b) => Number(b[1]?.rating || 0) - Number(a[1]?.rating || 0))[0]?.[0] || '';
}

function questProgress(player, quest) {
  try {
    return Math.max(0, Number(quest.progress(player) || 0));
  } catch (e) {
    console.warn('[botEngine] 퀘스트 진행도 계산 실패:', e?.message);
    return 0;
  }
}

function achievementRate(player) {
  const done = QUESTS.filter((quest) => !!player?.achievements?.[quest.id]).length;
  return Math.round((done / QUESTS.length) * 100);
}

function checkAchievementsFor(context, playerName, options = {}) {
  const players = getTierPlayers(context);
  const player = normalizePlayerRecord(players[playerName]);
  if (!player) return [];
  if (options.beatRank1) player.beatRank1 = true;
  const unlocked = [];
  for (const quest of QUESTS) {
    if (player.achievements[quest.id]) continue;
    if (questProgress(player, quest) >= quest.target) {
      player.achievements[quest.id] = { at: Date.now(), title: quest.title, reward: quest.reward };
      if (!player.titles.includes(quest.reward)) player.titles.push(quest.reward);
      if (!player.equippedTitle) player.equippedTitle = quest.reward;
      unlocked.push(quest);
    }
  }
  player.achievementRate = achievementRate(player);
  return unlocked;
}

function persistTierData(context) {
  const players = getTierPlayers(context);
  try {
    if (typeof context.saveTierData === 'function') context.saveTierData();
  } catch (e) { console.warn('[botEngine] 티어 데이터 저장 실패:', e?.message); }
  syncRatingsToMongo(players);
}

function questStatusText(context, playerName) {
  const players = getTierPlayers(context);
  const player = normalizePlayerRecord(players[playerName] || (players[playerName] = { wins: 0, losses: 0, rating: 0, games: 0, winStreak: 0, jobStats: {} }));
  checkAchievementsFor(context, playerName);
  const done = QUESTS.filter((quest) => player.achievements?.[quest.id]).length;
  const lines = [
    `[시스템]: ${playerName} 퀘스트`,
    `달성률: ${done}/${QUESTS.length} (${achievementRate(player)}%)`,
    `장착 칭호: ${player.equippedTitle || '없음'}`,
    `최고 직업 승수: ${bestJobName(player) || '없음'} ${bestJobWins(player)}승`,
    ''
  ];
  for (const quest of QUESTS) {
    const value = Math.min(questProgress(player, quest), quest.target);
    const mark = player.achievements?.[quest.id] ? '완료' : `${value}/${quest.target}`;
    lines.push(`${player.achievements?.[quest.id] ? '✓' : '·'} ${quest.title} - ${quest.desc} (${mark}) / 보상: ${quest.reward}`);
  }
  persistTierData(context);
  return lines.join('\n');
}

function titleText(context, playerName, arg = '') {
  const players = getTierPlayers(context);
  const player = normalizePlayerRecord(players[playerName] || (players[playerName] = { wins: 0, losses: 0, rating: 0, games: 0, winStreak: 0, jobStats: {} }));
  checkAchievementsFor(context, playerName);
  const wanted = String(arg || '').trim();
  if (wanted) {
    const found = player.titles.find((title) => title === wanted || title.replace(/\s+/g, '') === wanted.replace(/\s+/g, ''));
    if (!found) return `[시스템]: 보유하지 않은 칭호입니다. 1칭호 로 목록을 확인하세요.`;
    player.equippedTitle = found;
    player.achievementRate = achievementRate(player);
    persistTierData(context);
    return `[시스템]: 칭호 장착 완료: [${found}] ${playerName}`;
  }
  const list = player.titles.length ? player.titles.map((title) => `${title === player.equippedTitle ? '장착 ' : ''}${title}`).join('\n') : '아직 획득한 칭호가 없습니다. 1퀘스트로 조건을 확인하세요.';
  return `[시스템]: ${playerName} 칭호 목록\n달성률: ${achievementRate(player)}%\n${list}\n\n사용법: 1칭호 칭호이름`;
}

function snapshotPlayerStats(players) {
  const out = {};
  for (const [name, value] of Object.entries(players || {})) {
    out[name] = { wins: Number(value?.wins || 0), rating: Number(value?.rating || 0) };
  }
  return out;
}

function buildCpuThoughtLines(bot, room, msg) {
  const context = bot.context;
  const game = getGames(context)?.[room];
  if (!game?.isPractice) return [];
  if (!/^0/.test(String(msg || ''))) return [];
  const word = String(msg || '').slice(1).trim();
  const next = word ? word[word.length - 1] : game?.lastLetter?.s2 || '';
  const replies = [];
  try {
    let count = 0;
    if (typeof context.cpuCountAvailFast === 'function' && next) count = context.cpuCountAvailFast(next, game) || 0;
    else if (context.WORDS_BY_START?.[next]) count = context.WORDS_BY_START[next].length;
    const kind = [];
    if (typeof context.isHanbang === 'function' && context.isHanbang(word)) kind.push('한방');
    if (typeof context.isYudo === 'function' && context.isYudo(word)) kind.push('유도');
    if (typeof context.isRoot === 'function' && context.isRoot(word)) kind.push('루트');
    replies.push(`[시스템]: 생각 과정: 입력 단어 '${word}'의 끝음절 '${next}'에서 사용 가능한 응답을 ${count}개로 계산했습니다.`);
    replies.push(`[시스템]: 생각 과정: '${word}' 분류는 ${kind.length ? kind.join(', ') : '일반'}이며, CPU는 응답 수와 위험 음절을 비교해 후보를 골랐습니다.`);
  } catch (e) { console.warn('[botEngine] CPU 사고 로그 생성 실패:', e?.message); }
  return replies;
}

export async function dispatchBotMessage(room, msg, sender, isRestore = false) {
  const bot = await getBotEngine();
  const context = bot.context;
  installCpuStrategyPatch(context);
  const players = getTierPlayers(context);
  const before = snapshotPlayerStats(players);
  const beforeLeader = rankLeaderName(players);
  const cleanMsg = String(msg || '').trim();

  if (/^1퀘스트/.test(cleanMsg)) {
    const result = [questStatusText(context, String(sender))];
    await flushRatingSyncs();
    return result;
  }
  if (/^1칭호/.test(cleanMsg)) {
    const result = [titleText(context, String(sender), cleanMsg.replace(/^1칭호/, ''))];
    await flushRatingSyncs();
    return result;
  }

  const replies = [];
  const thoughtLines = isRestore ? [] : buildCpuThoughtLines(bot, room, cleanMsg);
  if (thoughtLines.length) replies.push(`[시스템]: 컴퓨터가 생각 중입니다... 계산 과정을 문장화합니다.`);
  const replier = {
    reply(text) {
      const clean = normalizeLine(text);
      if (clean) replies.push(clean);
    }
  };
  bot.response(String(room), cleanMsg, String(sender), true, replier, null, 'web', false);
  replies.push(...thoughtLines);

  const afterPlayers = getTierPlayers(context);
  const unlockLines = [];
  for (const [name, after] of Object.entries(afterPlayers)) {
    const prev = before[name] || { wins: 0, rating: Number(after?.rating || 0) };
    const wonNow = Number(after?.wins || 0) > prev.wins;
    const beatRank1 = wonNow && beforeLeader && beforeLeader !== name && (before[beforeLeader]?.wins !== undefined || before[beforeLeader]?.rating !== undefined);
    const unlocked = checkAchievementsFor(context, name, { beatRank1 });
    if (unlocked.length) {
      unlockLines.push(`[시스템]: ${name} 퀘스트 완료: ${unlocked.map((q) => `${q.title} → 칭호 '${q.reward}'`).join(', ')}`);
    }
  }
  if (unlockLines.length) {
    persistTierData(context);
    replies.push(...unlockLines);
  }
  syncRatingsToMongo(getTierPlayers(context));
  if (!isRestore) await flushRatingSyncs();
  return replies;
}

export async function botJobInfo() {
  const bot = await getBotEngine();
  return bot.context.__Bot?.scope?.JOB_INFO || {};
}

export async function botBootStatus() {
  const bot = await getBotEngine();
  const scope = bot.context.__Bot?.scope || {};
  return {
    loaded: !!scope.WORD_SET,
    words: scope.WORD_SET?.size || 0,
    jobs: Array.isArray(scope.ALL_JOBS) ? scope.ALL_JOBS.slice() : [],
    bootLog: bot.bootLog
  };
}

export async function botRoomState(room) {
  const bot = await getBotEngine();
  const raw = bot.context.__Bot?.scope?.games?.[room] || bot.context.games?.[room];
  if (!raw) return null;
  return serializeGame(raw);
}

export async function botAllRoomStates() {
  const bot = await getBotEngine();
  const games = bot.context.__Bot?.scope?.games || bot.context.games || {};
  const out = {};
  for (const [room, raw] of Object.entries(games)) {
    out[room] = serializeGame(raw);
  }
  return out;
}

export async function botRankings() {
  const bot = await getBotEngine();
  const players = getTierPlayers(bot.context);
  for (const name of Object.keys(players)) {
    normalizePlayerRecord(players[name]);
    checkAchievementsFor(bot.context, name);
  }
  syncRatingsToMongo(players);
  await flushRatingSyncs();
  return Object.entries(players)
    .map(([name, value]) => ({ name, ...value, achievementRate: achievementRate(value) }))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 50);
}

function serializeSet(value) {
  if (!value) return [];
  try {
    if (typeof value[Symbol.iterator] === 'function') return Array.from(value);
  } catch (e) { console.warn('[botEngine] Set 변환 실패:', e?.message); }
  return [];
}

function copyState(state) {
  if (!state) return null;
  const out = {};
  for (const [key, value] of Object.entries(state)) {
    if (typeof value === 'function') continue;
    if (value instanceof Set) out[key] = serializeSet(value);
    else if (Array.isArray(value)) out[key] = value.slice();
    else if (value && typeof value === 'object') out[key] = JSON.parse(JSON.stringify(value));
    else out[key] = value;
  }
  return out;
}

function serializeGame(game) {
  const players = Array.isArray(game.players) ? game.players.slice() : [];
  const playerStates = {};
  for (const name of players) playerStates[name] = copyState(game.playerStates?.[name]);
  return {
    phase: game.phase,
    players,
    started: !!game.started,
    history: Array.isArray(game.history) ? game.history.slice() : [],
    turnCount: game.turnCount || 1,
    currentTurnIndex: game.currentTurnIndex ?? -1,
    firstTurnIndex: game.firstTurnIndex ?? -1,
    currentPlayer: players[game.currentTurnIndex] || '',
    lastLetter: game.lastLetter ? { ...game.lastLetter } : { s1: '', s2: '' },
    isWaitingVote: !!game.isWaitingVote,
    voteType: game.voteType || null,
    targetWord: game.targetWord || null,
    requester: game.requester || null,
    teamMode: game.teamMode || 1,
    teamLives: Array.isArray(game.teamLives) ? game.teamLives.slice() : [1, 1],
    bannedJobs: Array.isArray(game.bannedJobs) ? game.bannedJobs.slice() : [],
    firstPicker: game.firstPicker || null,
    banPhase: !!game.banPhase,
    isPractice: !!game.isPractice,
    used: serializeSet(game.used),
    playerStates
  };
}
