import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import bundledBotSource from '../../../bot.js?raw';
import { resolveBotDataPath, readJsonFile, writeJsonFile, ensureRuntimeDir, runtimeDir } from './runtime.js';

let enginePromise = null;

// Fire-and-forget: persist tier data to MongoDB whenever the bot saves it
async function syncRatingsToMongo(data) {
  try {
    const { saveRatings } = await import('./db.js');
    await saveRatings(data);
  } catch {
    // MongoDB unavailable — file-based data is the fallback
  }
}

function createContext() {
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
        writeJsonFile(resolveBotDataPath(inputPath), value);
        if (path.basename(String(inputPath || '')) === 'tierbot_data.json') {
          syncRatingsToMongo(value).catch(() => {});
        }
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
  sandbox.globalThis = sandbox;
  return vm.createContext(sandbox);
}

function normalizeLine(text) {
  return String(text || '')
    .replace(/​+/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

function bootSync() {
  ensureRuntimeDir();
  const source = (bundledBotSource || readFileSync(fileURLToPath(new URL('../../../bot.js', import.meta.url)), 'utf8'))
    .replace('buildCpuJobSyllableKnowledge();', '/* skipped in web runtime: buildCpuJobSyllableKnowledge(); */');
  const context = createContext();
  vm.runInContext(`${source}\n;globalThis.__Bot = Bot; globalThis.__response = response;`, context, { filename: 'bot.js' });

  const response = context.__response;
  if (typeof response !== 'function') {
    throw new Error('bot.js did not expose a response function.');
  }

  const out = [];
  response('admin_room', '1t listload', 'admin', true, { reply: (text) => out.push(normalizeLine(text)) });
  return { context, response, bootLog: out.filter(Boolean) };
}

export async function getBotEngine() {
  if (!enginePromise) enginePromise = Promise.resolve().then(() => bootSync());
  return enginePromise;
}

export async function dispatchBotMessage(room, msg, sender) {
  const bot = await getBotEngine();
  const replies = [];
  const replier = {
    reply(text) {
      const clean = normalizeLine(text);
      if (clean) replies.push(clean);
    }
  };
  bot.response(String(room), String(msg), String(sender), true, replier, null, 'web', false);
  return replies;
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
  const raw = bot.context.__Bot?.scope?.games?.[room];
  if (!raw) return null;
  return serializeGame(raw);
}

export async function botRankings() {
  const bot = await getBotEngine();
  const players = bot.context.__Bot?.scope?.tierPlayerData || {};
  return Object.entries(players)
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 50);
}

function serializeSet(value) {
  if (!value) return [];
  try {
    if (typeof value[Symbol.iterator] === 'function') return Array.from(value);
  } catch {}
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
