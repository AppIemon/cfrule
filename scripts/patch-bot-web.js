#!/usr/bin/env node
/**
 * Replace Kakao slot-based 1채린/1연습 handlers with web room handlers.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const botPath = path.join(root, 'bot.js');
const backupPath = path.join(root, 'bot.js.web-backup');

const bot = readFileSync(botPath, 'utf8');
const backup = readFileSync(backupPath, 'utf8');

const charynnRe = /let teamModeMatch = msg\.match\(new RegExp\("\^" \+ escapeRegExp\(PREFIX\) \+ "\(\?:채린\|ㅊㄹ\)\(\[23\]\)\?\$"\)\);\s+if \(teamModeMatch\) \{[\s\S]*?return;\s+\}/;
const practiceRe = /let pracModeMatch = msg\.match\(new RegExp\("\^" \+ escapeRegExp\(PREFIX\) \+ "\(\?:ㅇㅅ\|연습\)\(\[23\]\)\?\(\\?:\\\\s\+\(\.\*\)\)\?\$"\)\);\s+if \(pracModeMatch && !isCpuPlayerName\(sender\)\) \{[\s\S]*?return;\s+\}/;

const charynnBlock = backup.match(charynnRe);
const practiceBlock = backup.match(practiceRe);

if (!charynnBlock || !practiceBlock) {
  console.error('Could not extract web handlers from backup');
  process.exit(1);
}

let out = bot.replace(charynnRe, charynnBlock[0]);
out = out.replace(practiceRe, practiceBlock[0]);

// Disable cross-mode lobby dispatch on web.
out = out.replace(
  'if (S.__crossMode && S.__crossMode.handle(String(room), String(msg == null ? "" : msg), String(sender), replier)) return;',
  'if (!globalThis.__WEB_RUNTIME && S.__crossMode && S.__crossMode.handle(String(room), String(msg == null ? "" : msg), String(sender), replier)) return;'
);
out = out.replace(
  'if (S.__crossMode && S.__crossMode.relayChat) S.__crossMode.relayChat(String(room), String(msg == null ? "" : msg), String(sender));',
  'if (!globalThis.__WEB_RUNTIME && S.__crossMode && S.__crossMode.relayChat) S.__crossMode.relayChat(String(room), String(msg == null ? "" : msg), String(sender));'
);
out = out.replace(
  'if (S.normalizeChosungCommand) {',
  'if (!globalThis.__WEB_RUNTIME && S.normalizeChosungCommand) {'
);

writeFileSync(botPath, out, 'utf8');
console.log('Patched bot.js for web-only handlers');
