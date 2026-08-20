#!/usr/bin/env node
/**
 * 1ㅊㄹ.js (카카오톡 봇 정본) → bot.js (웹 런타임)
 *
 * cfrule 웹은 카카오톡 메시지 대신 서버가 vm 안에서 봇을 직접 호출한다. 그래서
 * 정본을 그대로 쓰지 못하고 아래 적응 패치를 얹는다. 각 패치는 대상이 **정확히
 * 한 번** 나타나야 하고, 아니면 즉시 실패한다 — 예전 스크립트는 정규식이 빗나가면
 * 조용히 건너뛰어서 bot.js 와 정본이 양방향으로 갈라져 있었다.
 *
 * 사용법:  node scripts/merge-bot.js [소스경로]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, '1ㅊㄹ.js');
const outPath = path.join(root, 'bot.js');
const patchDir = path.join(root, 'scripts', 'bot-patches');

if (!existsSync(srcPath)) {
  console.error(`소스를 찾을 수 없습니다: ${srcPath}`);
  process.exit(1);
}

let bot = readFileSync(srcPath, 'utf8');
const applied = [];

/** 대상이 정확히 expected 번 있어야 치환한다. 아니면 던진다. */
function patch(name, find, replaceWith, expected = 1) {
  const count = typeof find === 'string'
    ? bot.split(find).length - 1
    : (bot.match(new RegExp(find.source, find.flags.includes('g') ? find.flags : find.flags + 'g')) || []).length;
  if (count !== expected) {
    throw new Error(`[${name}] 대상이 ${expected}개여야 하는데 ${count}개입니다. 정본이 바뀌었으니 패치를 갱신하세요.`);
  }
  bot = typeof find === 'string'
    ? bot.split(find).join(replaceWith)
    : bot.replace(new RegExp(find.source, find.flags.includes('g') ? find.flags : find.flags + 'g'), replaceWith);
  applied.push(`${name} (${expected})`);
}

/* 1) 팀 턴 판정 — 웹은 팀전 차례를 서버에서 물어본다. */
patch(
  'isPlayersTeamTurn: 스코프 선언',
  '  getPlayerTeamIndex: undefined,',
  '  getPlayerTeamIndex: undefined,\n  isPlayersTeamTurn: undefined,'
);

const teamTurnImpl = `
  isPlayersTeamTurn = function isPlayersTeamTurn(game, player) {
    let __botResult = function () {
      if (!game || !game.players || game.currentTurnIndex === -1) return true;
      let currentPlayer = game.players[game.currentTurnIndex];
      if (player === currentPlayer) return true;
      if (game.teamMode <= 1) return false;
      let playerTeam = getPlayerTeamIndex(game, player);
      let currentTeam = getPlayerTeamIndex(game, currentPlayer);
      return playerTeam !== -1 && playerTeam === currentTeam;
    }.call(this);
    if (__botResult && __botResult.__botControl && __botResult.type === "return") return __botResult.value;
    return __botResult;
  };`;
patch(
  'isPlayersTeamTurn: 구현',
  /(getPlayerTeamIndex = function getPlayerTeamIndex[\s\S]*?return __botResult;\n  \};)/,
  (m) => m + teamTurnImpl
);

/* 2) 웹 1채린 핸들러 — 정본은 카톡에서 이 명령을 껐지만 웹은 방 생성에 쓴다. */
const webCharynn = readFileSync(path.join(patchDir, 'web-charynn-handler.js'), 'utf8');
patch(
  '웹 1채린 핸들러 복구',
  /      let teamModeMatch = msg\.match\(new RegExp\("\^" \+ escapeRegExp\(PREFIX\) \+ "\(\?:채린\|ㅊㄹ\)\(\[23\]\)\?\$"\)\);\n      if \(teamModeMatch\) \{\n        replier\.reply\(systemLine\("1ㅊㄹ 참가는 종료되었습니다\. 1참가 \/ 1ㅁㄹ \/ 1ㅅㅈ 를 사용하세요\."\)\);\n        return;\n      \}\n      if \(false && teamModeMatch\) \{[\s\S]*?\n      \}\n/,
  () => webCharynn
);

/* 3) 조합 방 기본값 — 웹은 방 생성 시 조합 여부를 서버가 기록한다. */
patch(
  '조합 방 기본값: 헬퍼',
  '  Bot.combat.session = {};\n',
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
`
);

/* 연습 대전이 시작되는 자리에서 기본값을 적용한다.
   1채린 쪽 적용 지점은 위 웹 핸들러 패치 파일에 이미 들어 있다. */
patch(
  '조합 방 기본값: 연습 적용 지점',
  '        let humanPlayers = getHumanPlayers(game);\n        game.mapApplied = false;\n        game.selectedMap = null;\n',
  '        let humanPlayers = getHumanPlayers(game);\n        game.mapApplied = false;\n        game.selectedMap = null;\n        if (Bot.combat) Bot.combat.applyRoomDefault(room, game);\n'
);

/* 4) 항복/기권 별칭 */
patch('항복/기권 별칭', 'if (msg === "ㅈㅈ") {', 'if (msg === "ㅈㅈ" || msg === "항복" || msg === "기권") {');
patch(
  '도움말: 항복/기권',
  'systemLine("기권: ㅈㅈ")',
  'systemLine("ㅈㅈ / 항복 / 기권: 기권 및 종료")',
  3
);

/* 5) 카톡 전용 경로 차단 — 초성 명령 정규화와 크로스룸 중계는 웹에 없다. */
patch(
  '웹: 초성 명령 정규화 제외',
  'if (S.normalizeChosungCommand) {',
  'if (!globalThis.__WEB_RUNTIME && S.normalizeChosungCommand) {'
);
patch(
  '웹: 크로스룸 채팅 중계 제외',
  'if (S.__crossMode && S.__crossMode.relayChat)',
  'if (!globalThis.__WEB_RUNTIME && S.__crossMode && S.__crossMode.relayChat)'
);
patch(
  '웹: 크로스룸 명령 처리 제외',
  'if (S.__crossMode && S.__crossMode.handle(',
  'if (!globalThis.__WEB_RUNTIME && S.__crossMode && S.__crossMode.handle('
);

/* 6) 조합 카드 풀 — 웹은 인원이 많아 후보를 넓게 준다. */
patch('조합 카드 풀 16', 'POOL_SIZE: 8,', 'POOL_SIZE: 16,');

/* 7) eval 관리자 명령 — 웹 운영 중 상태를 들여다볼 수단. */
patch(
  'eval 관리자 명령',
  /(if \(cmd\.indexOf\("cpuknow "\) === 0\) \{[\s\S]*?return true;\n      \})/,
  (m) => m + `
      if (cmd.indexOf("eval ") === 0) {
        var code = cmd.slice(5);
        try { replier.reply(String(eval(code))); } catch (e) { replier.reply("eval 오류: " + String(e)); }
        return true;
      }`
);

writeFileSync(outPath, bot, 'utf8');

console.log(`소스: ${path.relative(root, srcPath)}`);
console.log(`패치 ${applied.length}개 적용:`);
for (const name of applied) console.log(`  · ${name}`);
console.log(`bot.js: ${bot.length} chars, ${bot.split('\n').length} lines`);
