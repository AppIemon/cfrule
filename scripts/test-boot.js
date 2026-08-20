/**
 * bot.js 가 vm 안에서 실제로 뜨는지, 그리고 서버 래퍼가 의존하는 것들이
 * 살아 있는지 확인한다. merge-bot.js 를 돌린 뒤에는 항상 이걸 통과시킨다.
 *
 *   npx vite-node scripts/test-boot.js
 */
import { readFileSync } from 'node:fs';
import { getBotEngine } from '../src/lib/server/botEngine.js';

const bot = await getBotEngine();
const scope = bot.context.__Bot?.scope || {};
const failures = [];

function expect(label, ok, detail = '') {
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` · ${detail}` : ''}`);
}

const jobs = scope.ALL_JOBS || [];
expect('직업 로스터', jobs.length >= 40, `${jobs.length}개`);
for (const job of ['해커', '반장', '홍명보', '페인터']) {
  expect(`직업 등록: ${job}`, jobs.includes(job));
}

expect('기본 사전', (scope.WORD_SET?.size || 0) > 200000, `${scope.WORD_SET?.size || 0}단어`);

// 서버 래퍼(botEngine.js)가 이름으로 잡아 쓰는 것들.
expect('CROSS_CPU_LEVELS', Object.keys(scope.CROSS_CPU_LEVELS || {}).length > 0,
  Object.keys(scope.CROSS_CPU_LEVELS || {}).join(', '));
expect('CROSS_CPU_LEVEL_ORDER', Array.isArray(scope.CROSS_CPU_LEVEL_ORDER));
expect('isPlayersTeamTurn 패치', typeof scope.isPlayersTeamTurn === 'function');
expect('조합 방 기본값 패치', typeof bot.context.__Bot?.combat?.applyRoomDefault === 'function');

// merge-bot.js 가 얹는 웹 적응들이 실제 bot.js 에 남아 있는지.
const src = readFileSync(new URL('../bot.js', import.meta.url), 'utf8');
expect('웹 1채린 핸들러', src.includes('let teamModeMatch = msg.match(') && !src.includes('1ㅊㄹ 참가는 종료되었습니다'));
expect('항복/기권 별칭', src.includes('msg === "항복"'));
expect('__WEB_RUNTIME 가드', (src.match(/__WEB_RUNTIME/g) || []).length >= 3);
expect('조합 카드 풀 16', src.includes('POOL_SIZE: 16,'));
expect('eval 관리자 명령', src.includes('cmd.indexOf("eval ") === 0'));

console.log('\n사전 적재 상태', {
  base: scope.WORD_SET?.size || 0,
  urimalsam: scope.URIMALSAM_WORD_SET?.size || 0,
  roble: scope.ROBLE_WORD_SET?.size || 0,
  jime: scope.JIME_WORD_SET?.size || 0,
  kkutu: scope.KKUTU_WORD_SET?.size || 0
});

if (failures.length) {
  console.error(`\n실패 ${failures.length}건:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('\nboot ok');
