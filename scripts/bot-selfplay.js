/**
 * 직업 모드에서 봇이 실제로 두는지, 그리고 난이도가 실력 차이를 만드는지 잰다.
 *
 *   npx vite-node scripts/bot-selfplay.js [판수] [난이도A] [난이도B]
 *
 * 채린룰 방을 vm 안에 직접 만들고 양쪽을 봇으로 채워 끝까지 둔다.
 * 웹 API 를 타지 않으므로 MongoDB 없이 돈다.
 */
import { getBotEngine } from '../src/lib/server/botEngine.js';
import { ensureEngineLevel } from '../src/lib/server/botDifficulty.js';

const rounds = Number(process.argv[2] || 20);

const bot = await getBotEngine();
const S = bot.context.__Bot?.scope || {};

// 프리셋 이름과 D 난이도를 모두 받는다. D 는 엔진 테이블에 항목을 만들어 넣어야 한다.
const levelA = ensureEngineLevel(S, process.argv[3] || '지옥').name;
const levelB = ensureEngineLevel(S, process.argv[4] || '쉬움').name;

function makeGame(jobA, jobB, lvA, lvB) {
  const game = {
    players: ['봇A', '봇B'],
    currentTurnIndex: 0,
    history: [],
    used: new Set(),
    bannedWords: new Set(),
    turnCount: 0,
    teamMode: 1,
    phase: 'playing',
    lastLetter: null,
    playerStates: {},
    gueruleSettings: { jobsMode: 'charynn', duEum: true, cpuLevel: lvA }
  };
  for (const [name, job] of [['봇A', jobA], ['봇B', jobB]]) {
    const st = typeof S.initJobState === 'function' ? S.initJobState(job) : { job };
    st.job = job;
    game.playerStates[name] = st;
  }
  game.__levels = { 봇A: lvA, 봇B: lvB };
  return game;
}

/**
 * 첫 수는 사람이 둘 만한 **무해한** 단어로 연다.
 *
 * arena 가 실측으로 잡아낸 함정이다: 무작위 첫 수를 주면 받은 쪽이 그 자리에서
 * 지므로 판이 5수에 끝나고, 그 국면에서는 깊이도 학습도 차이를 못 낸다.
 * 끝음절에 이을 단어가 넉넉한 단어로 열어야 실제 중반전이 생긴다.
 */
function openingWord(game) {
  const list = S.WORD_LIST || [];
  for (let tries = 0; tries < 2000; tries++) {
    const w = list[Math.floor(Math.random() * list.length)];
    if (!w || w.length < 3 || w.length > 4) continue;
    try {
      if (S.isHanbang?.(w) || S.isYudo?.(w)) continue;
      // 끝음절이 넉넉해야 상대가 바로 죽지 않는다.
      if (Number(S.cpuCountAvailFast?.(w[w.length - 1], game) || 0) < 60) continue;
    } catch {
      continue;
    }
    return w;
  }
  return '기차표';
}

function applyWord(game, word) {
  const last = word[word.length - 1];
  let s2 = last;
  try {
    const du = S.applyDuEum?.(last);
    if (du && du !== last) s2 = du;
  } catch {}
  game.lastLetter = { s1: last, s2, split: false };
  game.history.push(word);
  game.used.add(word);
  game.turnCount += 1;
}

/**
 * @param first 0 이면 봇A 가 오프닝 다음 수를 둔다.
 *   arena 가 잡아낸 편향: 오프닝을 받은 쪽이 거의 무조건 지므로, 같은 오프닝으로
 *   선후를 바꿔 두 판씩 둬야 "직업/난이도가 센가"를 재게 된다.
 */
function playGame(jobA, jobB, first, opening) {
  const game = makeGame(jobA, jobB, levelA, levelB);
  applyWord(game, opening || openingWord(game));
  game.currentTurnIndex = first;

  for (let turn = 0; turn < 200; turn++) {
    const me = game.players[game.currentTurnIndex];
    game.gueruleSettings.cpuLevel = game.__levels[me];

    let picked = null;
    try {
      picked = S.cpuPickWord(game, me);
    } catch (err) {
      return { winner: game.players[1 - game.currentTurnIndex], reason: 'error: ' + err.message, turns: turn };
    }
    const word = typeof picked === 'string' ? picked : picked?.word;
    if (!word) return { winner: game.players[1 - game.currentTurnIndex], reason: '둘 수 없음', turns: turn };
    if (game.used.has(word)) {
      return { winner: game.players[1 - game.currentTurnIndex], reason: '중복 단어 ' + word, turns: turn };
    }
    applyWord(game, word);
    game.currentTurnIndex = 1 - game.currentTurnIndex;
  }
  return { winner: null, reason: '200수 초과', turns: 200 };
}

const jobs = (S.ALL_JOBS || []).filter((j) => j && j !== '?');
let aWins = 0, bWins = 0, draws = 0, totalTurns = 0, errors = 0;
const t0 = Date.now();

for (let i = 0; i < rounds; i++) {
  const jobA = jobs[Math.floor(Math.random() * jobs.length)];
  const jobB = jobs[Math.floor(Math.random() * jobs.length)];
  // 같은 오프닝으로 선후를 바꿔 두 판.
  const probe = makeGame(jobA, jobB, levelA, levelB);
  const opening = openingWord(probe);
  for (const first of [0, 1]) {
    const r = playGame(jobA, jobB, first, opening);
    totalTurns += r.turns;
    if (r.reason?.startsWith('error')) errors += 1;
    if (r.winner === '봇A') aWins += 1;
    else if (r.winner === '봇B') bWins += 1;
    else draws += 1;
  }
}

const games = rounds * 2;
const ms = Date.now() - t0;
console.log(`${games}판(선후 교대) · ${ms}ms (판당 ${(ms / games).toFixed(0)}ms)`);
console.log(`평균 ${(totalTurns / games).toFixed(1)}수`);
console.log(`${levelA}(A) ${aWins}승 · ${levelB}(B) ${bWins}승 · 무 ${draws} · 오류 ${errors}`);
const decided = aWins + bWins;
if (decided) console.log(`A 승률 ${((aWins / decided) * 100).toFixed(1)}%`);
else console.log('결판 없음');
if (errors) process.exitCode = 1;
