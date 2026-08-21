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

/* 7) 수읽기 헬퍼 노출 — 채린룰/카드처럼 crossSolveApplicable 이 false 인 모드에서
   서버가 같은 헬퍼로 직업 인지 탐색을 돌린다. 전부 클로저 지역 변수라
   Bot.scope 에 올려 주지 않으면 vm 바깥에서 손댈 수가 없다. */
patch(
  '수읽기 헬퍼 노출',
  '  function crossCpuPickWord(game) {',
  `  /* cfrule 적응: 웹 서버의 직업 인지 탐색이 쓰는 헬퍼들. */
  S.crossCpuLevel = crossCpuLevel;
  S.crossSylDiff = crossSylDiff;
  S.crossSylTable = crossSylTable;
  S.crossEndSyl = crossEndSyl;
  S.crossCpuContSyls = crossCpuContSyls;
  S.crossCpuReplyWords = crossCpuReplyWords;
  S.crossCpuReplyCount = crossCpuReplyCount;
  S.crossSolveApplicable = crossSolveApplicable;
  S.crossChainMode = crossChainMode;

  function crossCpuPickWord(game) {`
);

/* 8) 방에 들어온 채린컴퓨터에게도 직업을 배정한다.

   정본은 CPU 직업 자동 배정을 `game.isPractice` 로만 건다. 카톡에서는 CPU 가
   연습 대전에만 들어오므로 맞는 가정이다. 하지만 웹은 일반 방에 봇을 추가할 수
   있고(cpuFill), 그 방은 isPractice 가 false 다. 그래서 사람이 직업을 고른 뒤
   봇이 영영 직업을 안 골라 job_selection 에서 게임이 멈췄다.

   조건을 "연습이거나 CPU 가 끼어 있으면"으로 넓힌다. 카톡 일반전에는 CPU 가
   없으므로 그쪽 동작은 그대로다. */
patch(
  'CPU 직업 배정: 헬퍼',
  '  isCpuPlayerName = function isCpuPlayerName(name) {',
  `  /* cfrule 적응: 이 게임에 채린컴퓨터가 들어와 있는가. */
  Bot.scope.gameHasCpuPlayer = function gameHasCpuPlayer(game) {
    if (!game || !game.players) return false;
    for (var i = 0; i < game.players.length; i++) {
      if (isCpuPlayerName(game.players[i])) return true;
    }
    return false;
  };
  isCpuPlayerName = function isCpuPlayerName(name) {`
);
patch(
  'CPU 직업 배정: 게이트 완화',
  '      if (!game || !game.isPractice) return;\n      let preferredJob = game.practiceCpuJobArg',
  '      if (!game) return;\n      if (!game.isPractice && !Bot.scope.gameHasCpuPlayer(game)) return;\n      let preferredJob = game.practiceCpuJobArg'
);
patch(
  'CPU 직업 배정: 직업 선택 직후',
  '      if (game.isPractice) autoAssignPracticeCpuJobs(game);\n',
  '      if (game.isPractice || Bot.scope.gameHasCpuPlayer(game)) autoAssignPracticeCpuJobs(game);\n'
);
patch(
  'CPU 직업 배정: 밴 확정 직후',
  '        if (game.isPractice) {\n          autoAssignPracticeCpuJobs(game);',
  '        if (game.isPractice || Bot.scope.gameHasCpuPlayer(game)) {\n          autoAssignPracticeCpuJobs(game);'
);

/* 9) 봇 밴 추천 — 선픽한 봇이 밴 권한을 실제로 쓰게 한다.

   정본은 CPU 가 직업을 playerStates 에 직접 꽂아 넣어서 firstPicker 가 되지
   않는다. 그래서 봇은 밴을 해 본 적이 없다. 웹의 "선픽" 옵션은 봇을 먼저 고르게
   해 밴 권한을 주므로, 무엇을 밴할지 고르는 함수가 필요하다.

   arena 의 chooseBans 와 같은 기준이다 — 내 직업을 가장 잘 잡는 순서로 지운다.
   점수 함수는 정본이 이미 갖고 있는 것(__jsonHybridJobScore)을 그대로 쓴다. */
patch(
  '봇 밴 추천',
  '      chooseRecommendedJobForPlayer = function (game, player, selectableJobs, preferredJob) {',
  `      /* cfrule 적응: 내 직업(selfJob)을 가장 잘 잡는 직업부터 최대 limit 개.
         점수가 낮을수록 나에게 나쁜 상대이므로 그 순서로 지운다. */
      Bot.scope.recommendBansForJob = function recommendBansForJob(game, selfJob, pool, limit) {
        if (!selfJob || !pool || !pool.length) return [];
        var scored = [], i;
        for (i = 0; i < pool.length; i++) {
          var enemy = pool[i];
          if (enemy === selfJob) continue;
          var s;
          try { s = __jsonHybridJobScore(selfJob, [enemy], []).total; } catch (e) { s = 0; }
          scored.push({ job: enemy, score: s });
        }
        scored.sort(function (a, b) { return a.score - b.score; });
        var out = [];
        for (i = 0; i < scored.length && out.length < (limit || 6); i++) out.push(scored[i].job);
        return out;
      };

      chooseRecommendedJobForPlayer = function (game, player, selectableJobs, preferredJob) {`
);

/* 10) 직업 없는 모드의 정본 시작 함수 노출 — 표한/검맞.

   웹의 botStartWebLobby 는 이 두 모드를 `phase = 'playing'` 한 줄로 시작시켜
   왔다. 그런데 정본의 startPyohanGame / startGeonmatGame 은 playerStates,
   playerLives, pyohan/geonmat 상태 뭉치, 킥 상태까지 세워 준다. 그게 없으니
   사람의 첫 수에서 cpuPassesDebuffs 가 undefined 상태를 읽고 터졌다
   ("Cannot read properties of undefined (reading 'bulletproof_debuff_turns')").

   웹이 정본과 똑같은 초기화를 타도록 두 함수를 Bot.scope 에 올린다. */
patch(
  '로비 시작 함수 노출',
  '  function startLobbyGame(game, replier) {',
  `  /* cfrule 적응: 웹 로비가 정본과 같은 초기화·검증을 타게 한다.
     validateLobbyStart 는 모드에 필요한 사전을 확인하고 없으면 불러온다.
     이걸 건너뛰면 사전이 빈 채로 방이 열려 모든 단어가 거부된다. */
  Bot.scope.startPyohanGame = startPyohanGame;
  Bot.scope.startGeonmatGame = startGeonmatGame;
  Bot.scope.startCrossGame = startCrossGame;
  Bot.scope.startCharynnLobbyGame = startCharynnLobbyGame;
  Bot.scope.validateLobbyStart = validateLobbyStart;
  Bot.scope.getRuleType = getRuleType;

  function startLobbyGame(game, replier) {`
);

/* 10) eval 관리자 명령 — 웹 운영 중 상태를 들여다볼 수단. */
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
