#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'src', 'lib', 'server', 'data');
const kkutuSrc = path.join(root, 'kkutu_wordlist.txt');
const wordlistPath = path.join(dataDir, 'wordlist.json');

mkdirSync(dataDir, { recursive: true });

function writeLines(filePath, words) {
  writeFileSync(filePath, words.join('\n'), 'utf8');
  console.log(`wrote ${filePath} (${words.length} words)`);
}

if (!existsSync(kkutuSrc)) {
  console.warn('skip dict prep: kkutu_wordlist.txt missing');
  process.exit(0);
}

const kkutu = JSON.parse(readFileSync(kkutuSrc, 'utf8'));
const wordlist = JSON.parse(readFileSync(wordlistPath, 'utf8'));

writeFileSync(path.join(dataDir, 'kkutu_wordlist.json'), JSON.stringify(kkutu), 'utf8');
console.log(`wrote kkutu_wordlist.json (${kkutu.length} words)`);

writeLines(path.join(dataDir, 'urimalsam_wordlist.txt'), kkutu);
writeLines(path.join(dataDir, 'roble_wordlist.txt'), kkutu);
writeLines(path.join(dataDir, 'jime_wordlist.txt'), wordlist);
