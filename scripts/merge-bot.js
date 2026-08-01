#!/usr/bin/env node
/**
 * Merge 1ㅊㄹ.js (full feature set) into bot.js with web-runtime patches.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = path.join(root, '1ㅊㄹ.js');
const webPath = path.join(root, 'bot.js.web-backup');
const outPath = path.join(root, 'bot.js');

// Backup current bot.js
const currentBot = readFileSync(path.join(root, 'bot.js'), 'utf8');
writeFileSync(webPath, currentBot, 'utf8');

let bot = readFileSync(srcPath, 'utf8');

// 1) Re-enable 1채린 for web (replace disabled stub with web handler from backup)
const webCharynnBlock = currentBot.match(
  /let teamModeMatch = msg\.match\(new RegExp\("\^" \+ escapeRegExp\(PREFIX\) \+ "\(\?:채린\|ㅊㄹ\)\(\[23\]\)\?\$"\)\);\s+if \(teamModeMatch\) \{[\s\S]*?return;\s+\}/
);
if (webCharynnBlock) {
  bot = bot.replace(
    /let teamModeMatch = msg\.match\(new RegExp\("\^" \+ escapeRegExp\(PREFIX\) \+ "\(\?:채린\|ㅊㄹ\)\(\[23\]\)\?\$"\)\);\s+if \(teamModeMatch\) \{\s+replier\.reply\(systemLine\("1ㅊㄹ 참가는 종료되었습니다\. 1참가 \/ 1ㅁㄹ \/ 1ㅅㅈ 를 사용하세요\."\)\);\s+return;\s+\}\s+if \(false && teamModeMatch\) \{[\s\S]*?return;\s+\}/,
    webCharynnBlock[0]
  );
}

// 2) Web practice handler (games[room] direct, not slot-based)
const webPracticeBlock = currentBot.match(
  /let pracModeMatch = msg\.match\(new RegExp\("\^" \+ escapeRegExp\(PREFIX\) \+ "\(\?:ㅇㅅ\|연습\)\(\[23\]\)\?\(\\?:\\\\s\+\(\.\*\)\)\?\$"\)\);\s+if \(pracModeMatch && !isCpuPlayerName\(sender\)\) \{[\s\S]*?return;\s+\}/
);
if (webPracticeBlock) {
  bot = bot.replace(
    /let pracModeMatch = msg\.match\(new RegExp\("\^" \+ escapeRegExp\(PREFIX\) \+ "\(\?:ㅇㅅ\|연습\)\(\[23\]\)\?\(\\?:\\\\s\+\(\.\*\)\)\?\$"\)\);\s+if \(pracModeMatch && !isCpuPlayerName\(sender\)\) \{[\s\S]*?return;\s+\}/,
    webPracticeBlock[0]
  );
}

// 3) 항복/기권 aliases
bot = bot.replace(
  /if \(msg === "ㅈㅈ"\) \{/,
  'if (msg === "ㅈㅈ" || msg === "항복" || msg === "기권") {'
);

// 4) isPlayersTeamTurn in scope
if (!bot.includes('isPlayersTeamTurn: undefined')) {
  bot = bot.replace(
    '  getPlayerTeamIndex: undefined,',
    '  getPlayerTeamIndex: undefined,\n  isPlayersTeamTurn: undefined,'
  );
}
if (!bot.includes('isPlayersTeamTurn = function')) {
  const fn = currentBot.match(/isPlayersTeamTurn = function isPlayersTeamTurn[\s\S]*?return __botResult;\s+\};/);
  if (fn) {
    bot = bot.replace(
      /getPlayerTeamIndex = function getPlayerTeamIndex[\s\S]*?return __botResult;\s+\};/,
      (m) => m + '\n  ' + fn[0].replace(/^\s+/, '')
    );
  }
}

// 5) eval admin command
if (!bot.includes('cmd.indexOf("eval ")')) {
  bot = bot.replace(
    /if \(cmd\.indexOf\("cpuknow "\) === 0\) \{[\s\S]*?return true;\s+\}/,
    (m) => m + `
      if (cmd.indexOf("eval ") === 0) {
        var code = cmd.slice(5);
        try { replier.reply(String(eval(code))); } catch (e) { replier.reply("eval 오류: " + String(e)); }
        return true;
      }`
  );
}

// 6) Bot.combat.roomDefaults + POOL_SIZE 16
bot = bot.replace('POOL_SIZE: 8,', 'POOL_SIZE: 16,');
if (!bot.includes('Bot.combat.roomDefaults')) {
  bot = bot.replace(
    '  Bot.combat.session = {};\n\n  /* ---------- owns:',
    `  Bot.combat.session = {};

  /* cfrule 적응: 웹 런타임은 방 생성 시 서버가 조합 여부를 기록한다. */
  Bot.combat.roomDefaults = {};
  Bot.combat.setRoomDefault = function (room, on) {
    if (on) Bot.combat.roomDefaults[room] = { combat: true };
    else delete Bot.combat.roomDefaults[room];
  };
  Bot.combat.applyRoomDefault = function (room, game) {
    var def = Bot.combat.roomDefaults[room];
    if (!def || !game) return;
    game.gueruleSettings = game.gueruleSettings || {};
    if (def.combat) game.gueruleSettings.combat = true;
  };

  /* ---------- owns:`
  );
}

// 7) Help text: 항복/기권
bot = bot.replace(
  /systemLine\("기권: ㅈㅈ"\)/g,
  'systemLine("ㅈㅈ / 항복 / 기권: 기권 및 종료")'
);

writeFileSync(outPath, bot, 'utf8');
console.log('Merged bot.js:', bot.length, 'chars,', bot.split('\n').length, 'lines');
