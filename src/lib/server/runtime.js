import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(here, '../../..');
export const runtimeDir = path.join(rootDir, 'data', 'runtime');
export const bundledDataDir = path.join(rootDir, 'src', 'lib', 'server', 'data');

export function ensureRuntimeDir() {
  mkdirSync(runtimeDir, { recursive: true });
}

export function readJsonFile(filePath, fallback = null) {
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
