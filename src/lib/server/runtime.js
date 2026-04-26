import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import diesyl from './data/diesyl.json';
import killword from './data/killword.json';
import loot from './data/loot.json';
import wordlist from './data/wordlist.json';

const here = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(here, '../../..');
export const runtimeDir = process.env.VERCEL
  ? path.join('/tmp', 'charynn-rule-runtime')
  : path.join(rootDir, 'data', 'runtime');
export const bundledDataDir = path.join(rootDir, 'src', 'lib', 'server', 'data');
const bundledJson = { 'diesyl.json': diesyl, 'killword.json': killword, 'loot.json': loot, 'wordlist.json': wordlist };

export function ensureRuntimeDir() {
  mkdirSync(runtimeDir, { recursive: true });
}

export function readJsonFile(filePath, fallback = null) {
  const bundled = bundledJson[path.basename(String(filePath || ''))];
  if (bundled) return bundled;
  try {
    if (!existsSync(filePath)) return fallback;
    return JSON.parse(readFileSync(filePath, 'utf8'));
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
  if (name === 'wordlist.json' || name === 'killword.json' || name === 'diesyl.json' || name === 'loot.json') {
    return path.join(bundledDataDir, name);
  }
  if (name) return path.join(runtimeDir, name);
  return '';
}
