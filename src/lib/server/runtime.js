import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import diesyl from './data/diesyl.json';
import killword from './data/killword.json';
import loot from './data/loot.json';
import wordlist from './data/wordlist.json';
// Roblox dictionary (548k words, one per line) extracted from the deploy-vercel
// 전수 평가기. Imported as raw text so it is included in the Vercel/app bundle.
import robleWordlistRaw from './data/roble_wordlist.txt?raw';
import { PRIMARY_DICTIONARY } from './engineConfig.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(here, '../../..');
export const runtimeDir = process.env.VERCEL
  ? path.join('/tmp', 'charynn-rule-runtime')
  : path.join(rootDir, 'data', 'runtime');
export const bundledDataDir = path.join(rootDir, 'src', 'lib', 'server', 'data');
const bundledJson = { 'diesyl.json': diesyl, 'killword.json': killword, 'loot.json': loot, 'wordlist.json': wordlist };

// Newline-separated word lists that ship with the app.
const bundledText = { 'roble_wordlist.txt': robleWordlistRaw };

// Data files the bot knows how to read that live in the bundled data dir (as
// opposed to the writable runtime dir). Keeps admin loaders (robleload /
// kkutuload) pointed at committed data.
const bundledDataNames = new Set([
  'wordlist.json', 'killword.json', 'diesyl.json', 'loot.json',
  'roble_wordlist.txt', 'kkutu_wordlist.json', 'kkutu_diesyl.json'
]);

let robleWordsCache;
function robleWords() {
  if (!robleWordsCache) {
    robleWordsCache = String(robleWordlistRaw || '')
      .split(/\r?\n/)
      .map((w) => w.trim())
      .filter(Boolean);
  }
  return robleWordsCache;
}

export function ensureRuntimeDir() {
  mkdirSync(runtimeDir, { recursive: true });
}

export function readJsonFile(filePath, fallback = null) {
  const name = path.basename(String(filePath || ''));
  // When the main game is configured to use the Roblox dictionary, serve the
  // Roblox words wherever the bot asks for the default wordlist.
  if (name === 'wordlist.json' && PRIMARY_DICTIONARY === 'roble') {
    return robleWords();
  }
  const bundled = bundledJson[name];
  if (bundled) return bundled;
  try {
    if (!existsSync(filePath)) return fallback;
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

// Raw text read for newline-separated word lists (roble/kkutu txt loaders).
export function readTextFile(filePath, fallback = null) {
  const name = path.basename(String(filePath || ''));
  if (bundledText[name]) return bundledText[name];
  try {
    if (!existsSync(filePath)) return fallback;
    return readFileSync(filePath, 'utf8');
  } catch {
    return fallback;
  }
}

export function writeJsonFile(filePath, value) {
  ensureRuntimeDir();
  writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

export function resolveBotDataPath(inputPath) {
  const name = path.basename(String(inputPath || ''));
  if (bundledDataNames.has(name)) {
    return path.join(bundledDataDir, name);
  }
  if (name) return path.join(runtimeDir, name);
  return '';
}
