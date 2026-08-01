import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(root, 'bot.js'), 'utf8')
  .replace(/if \(!fastMode\) buildCpuJobSyllableKnowledge\(\);/g, 'if (!fastMode) { /* skipped */ }')
  .replace(/buildCpuJobSyllableKnowledge\(\);/g, '/* skipped */');

const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Math, Date, JSON,
  FileStream: {
    read() { return null; },
    readJson() { return null; },
    writeJson() {}
  },
  RatingDB: { load: () => ({}), save: () => {} },
  Api: { gc() {} },
  java: {
    lang: { System: { gc() {} } },
    io: { File: function () { return { exists: () => false }; }, RandomAccessFile: function () { throw new Error('n/a'); } },
    nio: { ByteBuffer: { allocateDirect: () => ({ order() {}, putFloat() {}, rewind() {}, getFloat: () => 0 }) }, ByteOrder: { nativeOrder: () => null }, channels: { FileChannel: { MapMode: { READ_ONLY: 'READ_ONLY' } } } }
  },
  Packages: {}
};
sandbox.globalThis = sandbox;
const context = vm.createContext(sandbox);
vm.runInContext(`${source}\n;globalThis.__Bot = Bot; globalThis.__response = response;`, context, { filename: 'bot.js' });

const response = context.__response;
const out = [];
response('admin_room', '1t listload', 'admin', true, { reply: (t) => out.push(t) });
console.log('Boot lines:', out.length);
console.log('Words loaded:', context.__Bot?.scope?.WORD_SET?.size || 0);
console.log('Has kkutu:', typeof context.__Bot?.scope?.loadKkutuWords === 'function');
console.log('Has cross mode:', typeof context.__Bot?.scope?.normalizeChosungCommand === 'function');
console.log('Has pyohan:', typeof context.__Bot?.scope?.defaultGueruleSettings === 'function');

const out2 = [];
response('WEB01', '1연습 해커', 'p1', true, { reply: (t) => out2.push(t) });
console.log('Practice replies:', out2.length);
const games = context.__Bot?.scope?.games?.WEB01;
const game = games?.__multiSlotContainer ? games.A : games;
console.log('Game phase:', game?.phase, 'players:', game?.players?.join(','));
