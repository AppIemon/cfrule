// Central, customizable configuration for the 채린룰 game engine (charynnBot.js).
//
// This is the single place to tune which bot source powers the game, which
// dictionary the main game uses, and which extra ("cross") dictionaries can be
// loaded on demand for alternate rule sets (구엜룰 / 로블 / 끄투).
//
// Everything here can be overridden with environment variables so deployments
// (Vercel, the Android app build, local dev) can pick a different setup without
// code changes.

function envValue(key, fallback) {
  const raw = process.env[key];
  return raw && String(raw).trim() ? String(raw).trim() : fallback;
}

// Dictionary catalogue. `wordlist` is the data file (relative to the bundled
// data dir). `kind` tells the runtime how to read it: a JSON array ("json") or
// a newline-separated text list ("txt").
export const DICTIONARIES = {
  // 기본 구엜 사전 (기존 채린룰 사전)
  default: {
    id: 'default',
    label: '구엜(기본) 사전',
    wordlist: 'wordlist.json',
    kind: 'json'
  },
  // 로블록스 전용 사전 (deploy-vercel 전수 평가기에서 추출, 548k 단어)
  roble: {
    id: 'roble',
    label: '로블록스 사전',
    wordlist: 'roble_wordlist.txt',
    kind: 'txt'
  },
  // 끄투 사전 (JSON 배열, 약 569k 단어)
  kkutu: {
    id: 'kkutu',
    label: '끄투 사전',
    wordlist: 'kkutu_wordlist.json',
    kind: 'json'
  },
  // 우리말샘(신엜) 사전, 약 212k 단어
  urimalsam: {
    id: 'urimalsam',
    label: '우리말샘 사전',
    wordlist: 'urimalsam_wordlist.txt',
    kind: 'txt'
  },
  // 지메 사전 (Geometry Dash 레벨명, 영문 포함)
  jime: {
    id: 'jime',
    label: '지메 사전',
    wordlist: 'jime_wordlist.txt',
    kind: 'txt'
  }
};

// Which dictionary the *main* game (WORD_SET) is built from. Set
// CHARYNN_PRIMARY_DICT=roble to make every default room play on the Roblox
// dictionary instead of the classic 구엜 list.
export const PRIMARY_DICTIONARY = (() => {
  const id = envValue('CHARYNN_PRIMARY_DICT', 'default');
  return DICTIONARIES[id] ? id : 'default';
})();

// Extra dictionaries the bot can load on demand (admin commands / /api/engine).
// The keys map to the bot's built-in cross-dictionary loaders.
export const CROSS_DICTIONARIES = {
  roble: { command: '1t robleload', dictionary: 'roble', setKey: 'ROBLE_WORD_SET' },
  kkutu: { command: '1t kkutuload', dictionary: 'kkutu', setKey: 'KKUTU_WORD_SET' },
  urimalsam: { command: '1t urimalsamload', dictionary: 'urimalsam', setKey: 'URIMALSAM_WORD_SET' },
  jime: { command: '1t jimeload', dictionary: 'jime', setKey: 'JIME_WORD_SET' }
};

// Command prefixes the bot understands (kept in sync with charynnBot.js
// defaults). Exposed here so the customization surface is in one place.
export const PREFIXES = {
  normal: envValue('CHARYNN_PREFIX', '1'),
  input: envValue('CHARYNN_INPUT_PREFIX', '0'),
  admin: envValue('CHARYNN_ADMIN_PREFIX', '1t')
};

// Filename of the bot engine source at the repo root.
export const BOT_SOURCE_FILE = 'charynnBot.js';

export function primaryDictionary() {
  return DICTIONARIES[PRIMARY_DICTIONARY];
}

export function dictionaryList() {
  return Object.values(DICTIONARIES).map(({ id, label, wordlist, kind }) => ({
    id,
    label,
    wordlist,
    kind,
    primary: id === PRIMARY_DICTIONARY
  }));
}
