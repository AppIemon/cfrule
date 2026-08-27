/**
 * 엔진 자체 점검. 체스 규칙(perft)과 직업 능력 동작을 한 번에 확인한다.
 *   npm test
 */
import { emptyBoard, makeSquare, findKing } from '../src/lib/chess/board';
import type { Color, PieceType, Square } from '../src/lib/chess/types';
import { OTHER } from '../src/lib/chess/types';
import { applyMoveToBoard, isInCheck, legalMoves } from '../src/lib/rule/moves';
import { createGame, pickJob, submitBans, submitMove, useAbility, abilityStatuses } from '../src/lib/rule/engine';
import type { GameState } from '../src/lib/rule/types';

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${ok ? '' : ` — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`);
}

function assert(label: string, ok: boolean): void {
  if (!ok) failures += 1;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}`);
}

/** 직업 없는 순수 체스 판을 만든다. perft 는 이 위에서 돈다. */
function plainGame(): GameState {
  const state = createGame();
  state.phase = 'playing';
  return state;
}

function perft(state: GameState, depth: number): number {
  if (depth === 0) return 1;
  const moves = legalMoves(state, state.turn);
  if (depth === 1) return moves.length;
  let total = 0;
  for (const move of moves) {
    const next: GameState = structuredClone(state);
    applyMoveToBoard(next, move);
    next.turn = OTHER[next.turn];
    total += perft(next, depth - 1);
  }
  return total;
}

function place(state: GameState, square: Square, type: PieceType, color: Color): void {
  state.board[square] = { id: state.nextPieceId++, type, color, moved: false };
}

function sq(file: string, rank: number): Square {
  return makeSquare('abcdefgh'.indexOf(file), rank - 1);
}

console.log('\n[체스 규칙 — perft]');
const start = plainGame();
check('초기 위치 depth 1', perft(start, 1), 20);
check('초기 위치 depth 2', perft(start, 2), 400);
check('초기 위치 depth 3', perft(start, 3), 8902);

// Kiwipete: 캐슬링·앙파상·핀이 한꺼번에 걸린 표준 시험 위치.
function kiwipete(): GameState {
  const state = plainGame();
  state.board = emptyBoard();
  state.nextPieceId = 1;
  const rows: [string, PieceType, Color][] = [
    ['a1', 'r', 'w'], ['e1', 'k', 'w'], ['h1', 'r', 'w'],
    ['a2', 'p', 'w'], ['b2', 'p', 'w'], ['c2', 'p', 'w'], ['f2', 'p', 'w'], ['g2', 'p', 'w'], ['h2', 'p', 'w'],
    ['d2', 'b', 'w'], ['e2', 'b', 'w'], ['c3', 'n', 'w'], ['f3', 'q', 'w'],
    ['d5', 'p', 'w'], ['e5', 'n', 'w'], ['e4', 'p', 'w'],
    ['a8', 'r', 'b'], ['e8', 'k', 'b'], ['h8', 'r', 'b'],
    ['a7', 'p', 'b'], ['b4', 'p', 'b'], ['c7', 'p', 'b'], ['d7', 'p', 'b'],
    ['e6', 'p', 'b'], ['f7', 'p', 'b'], ['g6', 'p', 'b'], ['h3', 'p', 'b'],
    ['e7', 'q', 'b'], ['g7', 'b', 'b'], ['a6', 'b', 'b'], ['b6', 'n', 'b'], ['f6', 'n', 'b']
  ];
  for (const [name, type, color] of rows) place(state, sq(name[0], Number(name[1])), type, color);
  return state;
}
const kiwi = kiwipete();
check('Kiwipete depth 1', perft(kiwi, 1), 48);
check('Kiwipete depth 2', perft(kiwi, 2), 2039);

console.log('\n[체스 규칙 — 마무리]');
const mate = plainGame();
mate.board = emptyBoard();
mate.nextPieceId = 1;
place(mate, sq('a', 1), 'k', 'w');
place(mate, sq('h', 8), 'k', 'b');
place(mate, sq('g', 7), 'q', 'w');
place(mate, sq('g', 1), 'r', 'w');
mate.turn = 'b';
assert('킹 앞 퀸 + 룩이면 흑은 둘 수 없다', legalMoves(mate, 'b').length === 0);
assert('그 상태는 체크다', isInCheck(mate, 'b'));

const stale = plainGame();
stale.board = emptyBoard();
stale.nextPieceId = 1;
place(stale, sq('a', 1), 'k', 'w');
place(stale, sq('h', 8), 'k', 'b');
place(stale, sq('g', 6), 'q', 'w');
stale.turn = 'b';
assert('스테일메이트 위치에서 흑은 둘 수 없다', legalMoves(stale, 'b').length === 0);
assert('그 상태는 체크가 아니다', !isInCheck(stale, 'b'));

console.log('\n[드래프트]');
let game = createGame('백플레이어', '흑플레이어');
check('선픽은 흑', game.draft.firstPicker, 'b');
game = pickJob(game, 'wizard');
check('흑 직업', game.players.b.jobId, 'wizard');
check('밴 단계로', game.draft.step, 'ban');
game = submitBans(game, ['reaper', 'watcher', 'hacker']);
check('밴은 최대 2개', game.draft.banned.length, 2);
const blocked = pickJob(game, game.draft.banned[0]);
check('밴된 직업은 못 고른다', blocked.players.w.jobId, null);
game = pickJob(game, 'engineer');
check('백 직업', game.players.w.jobId, 'engineer');
check('대국 시작', game.phase, 'playing');
check('백부터', game.turn, 'w');
check('마법사 초기 마나', game.players.b.resource, 2);

console.log('\n[직업 — 기관사 〈선로〉와 〈증기〉]');
{
  const state = plainGame();
  state.players.w.jobId = 'engineer';
  // a1 룩이 a2 자기 폰을 뛰어넘어 a3~a7 까지 간다.
  const rookMoves = legalMoves(state, 'w').filter((move) => move.from === sq('a', 1));
  assert('선로로 자기 폰을 넘어간다', rookMoves.some((move) => move.to === sq('a', 3)));
  assert('넘은 칸 자체는 목적지가 아니다', !rookMoves.some((move) => move.to === sq('a', 2)));
  const plain = plainGame();
  assert('패시브가 없으면 못 넘는다', !legalMoves(plain, 'w').some((move) => move.from === sq('a', 1)));
}

console.log('\n[직업 — 해커 〈침입〉]');
{
  const state = plainGame();
  state.players.w.jobId = 'hacker';
  state.board[sq('e', 2)] = null;
  place(state, sq('e', 5), 'p', 'w');
  const pawnMoves = legalMoves(state, 'w').filter((move) => move.from === sq('e', 5));
  assert('상대 진영 폰이 나이트처럼 뛴다', pawnMoves.some((move) => move.to === sq('f', 7)));
}

console.log('\n[직업 — 마법사 〈석화〉와 봉인]');
{
  let state = plainGame();
  state.players.w.jobId = 'wizard';
  state.players.b.jobId = 'collector';
  state.players.w.resource = 12;
  state.players.w.abilities = { 'wizard.blink': { uses: -1, cooldown: 0 }, 'wizard.petrify': { uses: -1, cooldown: 0 } };
  state.players.b.abilities = {
    'collector.summon': { uses: 2, cooldown: 0 },
    'collector.appraise': { uses: 2, cooldown: 0 }
  };
  const result = useAbility(state, 'w', 'wizard.petrify', [{ kind: 'square', square: sq('b', 8) }]);
  check('석화에 실패 사유 없음', result.error, null);
  state = result.state;
  check('마나가 7 줄었다', state.players.w.resource, 5);
  assert('석화 효과가 붙었다', state.effects.some((fx) => fx.kind === 'frozen'));
  // 백은 아직 수를 둬야 한다 — 석화는 턴을 쓰지 않는다.
  check('턴은 그대로 백', state.turn, 'w');
  const frozenId = state.effects.find((fx) => fx.kind === 'frozen')!.pieceId;
  state = submitMove(state, sq('e', 2), sq('e', 4));
  check('턴이 흑으로', state.turn, 'b');
  assert('석화된 나이트는 못 움직인다', !legalMoves(state, 'b').some((move) => state.board[move.from]?.id === frozenId));
}

console.log('\n[직업 — 수집가 〈감정〉이 상대 능력을 봉인한다]');
{
  let state = plainGame();
  state.players.w.jobId = 'collector';
  state.players.b.jobId = 'wizard';
  state.players.w.abilities = {
    'collector.summon': { uses: 2, cooldown: 0 },
    'collector.appraise': { uses: 2, cooldown: 0 }
  };
  state.players.b.abilities = { 'wizard.blink': { uses: -1, cooldown: 0 }, 'wizard.petrify': { uses: -1, cooldown: 0 } };
  state.players.b.resource = 12;
  state = useAbility(state, 'w', 'collector.appraise', []).state;
  state = submitMove(state, sq('e', 2), sq('e', 4));
  const statuses = abilityStatuses(state, 'b');
  assert('흑 능력이 전부 막혔다', statuses.every((status) => !status.usable));
  assert('사유가 봉인이다', statuses.every((status) => status.reason === '능력이 봉인되어 있습니다.'));
}

console.log('\n[직업 — 나이트 〈기사도〉 추가 이동]');
{
  let state = plainGame();
  state.players.w.jobId = 'knight';
  state.players.w.abilities = { 'knight.charge': { uses: 2, cooldown: 0 }, 'knight.guard': { uses: 1, cooldown: 0 } };
  state.board[sq('d', 5)] = null;
  place(state, sq('d', 5), 'p', 'b');
  place(state, sq('c', 3), 'n', 'w');
  state.board[sq('b', 1)] = null;
  state = submitMove(state, sq('c', 3), sq('d', 5));
  assert('잡은 뒤에도 백 차례', state.turn === 'w');
  assert('추가 이동이 걸렸다', state.pendingExtra?.label === '기사도');
  const extra = legalMoves(state, 'w');
  assert('추가 이동은 그 나이트만', extra.every((move) => move.from === sq('d', 5)));
  assert('추가 이동으로는 못 잡는다', extra.every((move) => !move.capture));
  state = submitMove(state, sq('d', 5), sq('c', 3));
  check('추가 이동을 마치면 흑 차례', state.turn, 'b');
}

console.log('\n[직업 — 감시자 〈요격〉]');
{
  let state = plainGame();
  state.players.w.jobId = 'hacker';
  state.players.b.jobId = 'watcher';
  state.players.w.abilities = { 'hacker.manipulate': { uses: 2, cooldown: 0 }, 'hacker.scorch': { uses: 1, cooldown: 0 } };
  state.players.b.abilities = { 'watcher.intercept': { uses: -1, cooldown: 0 }, 'watcher.blockade': { uses: 2, cooldown: 0 } };
  state.players.b.resource = 8;
  state = submitMove(state, sq('e', 2), sq('e', 4));
  assert('백 폰이 e4 로 갔다', state.board[sq('e', 4)]?.type === 'p');
  const outcome = useAbility(state, 'b', 'watcher.intercept', []);
  check('요격 사유 없음', outcome.error, null);
  state = outcome.state;
  assert('e4 가 비었다', state.board[sq('e', 4)] === null);
  assert('e2 로 돌아왔다', state.board[sq('e', 2)]?.type === 'p');
  check('감시 5 소모', state.players.b.resource, 3);
  check('다시 백 차례', state.turn, 'w');
  assert('같은 수는 다시 못 둔다', !legalMoves(state, 'w').some((move) => move.from === sq('e', 2) && move.to === sq('e', 4)));
  assert('한 칸 전진은 둘 수 있다', legalMoves(state, 'w').some((move) => move.from === sq('e', 2) && move.to === sq('e', 3)));
}

console.log('\n[직업 — 사신 〈수확〉]');
{
  let state = plainGame();
  state.players.w.jobId = 'reaper';
  state.players.w.abilities = { 'reaper.harvest': { uses: -1, cooldown: 0 }, 'reaper.styx': { uses: 1, cooldown: 0 } };
  state.players.w.resource = 6;
  const outcome = useAbility(state, 'w', 'reaper.harvest', [{ kind: 'square', square: sq('d', 8) }]);
  check('수확 사유 없음', outcome.error, null);
  state = outcome.state;
  assert('흑 퀸이 사라졌다', state.board[sq('d', 8)] === null);
  check('사혼은 되돌려주지 않는다', state.players.w.resource, 0);
  check('수확은 턴을 쓴다', state.turn, 'b');
}

console.log('\n[직업 — 킹은 능력의 표적이 되지 않는다]');
{
  const state = plainGame();
  state.players.w.jobId = 'reaper';
  state.players.w.abilities = { 'reaper.harvest': { uses: -1, cooldown: 0 }, 'reaper.styx': { uses: 1, cooldown: 0 } };
  state.players.w.resource = 20;
  const outcome = useAbility(state, 'w', 'reaper.harvest', [{ kind: 'square', square: findKing(state.board, 'b')! }]);
  assert('킹은 수확되지 않는다', outcome.error !== null || outcome.state.board[findKing(state.board, 'b')!] !== null);
}


console.log('\n[체스 규칙 — 승격]');
{
  let state = plainGame();
  state.board = emptyBoard();
  state.nextPieceId = 1;
  place(state, sq('a', 1), 'k', 'w');
  place(state, sq('h', 8), 'k', 'b');
  place(state, sq('b', 7), 'p', 'w');
  const promos = legalMoves(state, 'w').filter((move) => move.from === sq('b', 7) && move.to === sq('b', 8));
  check('승격 후보는 네 가지', promos.length, 4);
  state = submitMove(state, sq('b', 7), sq('b', 8), 'n');
  check('고른 대로 나이트가 된다', state.board[sq('b', 8)]?.type, 'n');
}

console.log('\n[직업 — 전우치 〈축지법〉]');
{
  const state = plainGame();
  state.players.w.jobId = 'jeonuchi';
  state.board[sq('e', 2)] = null;
  place(state, sq('e', 3), 'p', 'w');
  state.board[sq('e', 3)]!.moved = true;
  const moves = legalMoves(state, 'w').filter((move) => move.from === sq('e', 3));
  assert('이미 움직인 폰도 두 칸 간다', moves.some((move) => move.to === sq('e', 5)));
  const plain = plainGame();
  plain.board[sq('e', 2)] = null;
  place(plain, sq('e', 3), 'p', 'w');
  plain.board[sq('e', 3)]!.moved = true;
  assert('패시브가 없으면 한 칸뿐', !legalMoves(plain, 'w').some((move) => move.from === sq('e', 3) && move.to === sq('e', 5)));
}

console.log('\n[직업 — 시프터 〈모방〉]');
{
  let state = plainGame();
  state.players.w.jobId = 'shifter';
  place(state, sq('d', 5), 'r', 'b');
  state.board[sq('c', 1)] = null;
  place(state, sq('c', 4), 'b', 'w');
  state = submitMove(state, sq('c', 4), sq('d', 5));
  const mimic = state.effects.find((fx) => fx.kind === 'mimic');
  check('룩을 잡으면 룩 이동을 빌린다', mimic?.mimicType, 'r');
  state.turn = 'w';
  const moves = legalMoves(state, 'w').filter((move) => move.from === sq('d', 5));
  assert('비숍이 직선으로도 간다', moves.some((move) => move.to === sq('d', 6)));
}

console.log('\n[직업 — 늑대인간 〈송곳니〉]');
{
  let state = plainGame();
  state.players.w.jobId = 'werewolf';
  state.players.w.abilities = { 'werewolf.fang': { uses: 2, cooldown: 0 }, 'werewolf.howl': { uses: 1, cooldown: 0 } };
  state.board[sq('c', 1)] = null;
  place(state, sq('c', 4), 'b', 'w');
  place(state, sq('d', 5), 'n', 'b');
  place(state, sq('d', 6), 'p', 'b');
  state = useAbility(state, 'w', 'werewolf.fang', []).state;
  assert('송곳니가 장전됐다', state.fangArmed);
  state = submitMove(state, sq('c', 4), sq('d', 5));
  assert('잡은 기물이 사라졌다', state.board[sq('d', 5)]?.color === 'w');
  assert('곁의 폰도 함께 사라졌다', state.board[sq('d', 6)] === null);
}

console.log('\n[직업 — 기관사 〈증기〉 추가 이동]');
{
  let state = plainGame();
  state.players.w.jobId = 'engineer';
  state.players.w.abilities = { 'engineer.steam': { uses: 2, cooldown: 0 }, 'engineer.whistle': { uses: 1, cooldown: 0 } };
  state = useAbility(state, 'w', 'engineer.steam', []).state;
  state = submitMove(state, sq('a', 1), sq('a', 3));
  check('룩 이동 뒤에도 백 차례', state.turn, 'w');
  check('추가 이동은 증기', state.pendingExtra?.label, '증기');
  state = submitMove(state, sq('a', 3), sq('c', 3));
  check('두 번째 룩 이동 뒤 흑 차례', state.turn, 'b');
}

console.log('\n[직업 — 수집가 〈수집〉과 〈소환〉]');
{
  let state = plainGame();
  state.players.w.jobId = 'collector';
  state.players.w.abilities = {
    'collector.summon': { uses: 2, cooldown: 0 },
    'collector.appraise': { uses: 2, cooldown: 0 }
  };
  state.board[sq('c', 1)] = null;
  place(state, sq('c', 4), 'b', 'w');
  place(state, sq('d', 5), 'n', 'b');
  state = submitMove(state, sq('c', 4), sq('d', 5));
  check('잡은 나이트를 창고에 넣는다', state.players.w.stash, ['n']);
  state.turn = 'w';
  const outcome = useAbility(state, 'w', 'collector.summon', [
    { kind: 'stash', piece: 'n', index: 0 },
    { kind: 'square', square: sq('c', 4) }
  ]);
  check('소환 사유 없음', outcome.error, null);
  state = outcome.state;
  check('내 색 나이트가 놓인다', state.board[sq('c', 4)]?.type, 'n');
  check('창고가 비었다', state.players.w.stash, []);
  check('소환은 턴을 쓴다', state.turn, 'b');
}

console.log('\n[직업 — 감시자 〈저지선〉]');
{
  let state = plainGame();
  state.players.w.jobId = 'watcher';
  state.players.w.abilities = { 'watcher.intercept': { uses: -1, cooldown: 0 }, 'watcher.blockade': { uses: 2, cooldown: 0 } };
  state = useAbility(state, 'w', 'watcher.blockade', [{ kind: 'square', square: sq('e', 5) }]).state;
  state = submitMove(state, sq('a', 2), sq('a', 3));
  assert('흑은 저지선 칸에 못 들어간다', !legalMoves(state, 'b').some((move) => move.to === sq('e', 5)));
  assert('다른 칸은 멀쩡하다', legalMoves(state, 'b').some((move) => move.to === sq('e', 6)));
}

console.log('\n[규칙 — 능력에 묶이면 체크메이트가 아니라 턴을 넘긴다]');
{
  let state = plainGame();
  state.board = emptyBoard();
  state.nextPieceId = 1;
  place(state, sq('a', 1), 'k', 'w');
  place(state, sq('h', 8), 'k', 'b');
  place(state, sq('h', 5), 'p', 'b');
  state.players.w.jobId = 'reaper';
  state.players.w.abilities = { 'reaper.harvest': { uses: -1, cooldown: 0 }, 'reaper.styx': { uses: 1, cooldown: 0 } };
  // 흑 킹을 묶어 두면 흑은 폰밖에 못 둔다. 폰까지 막히면 턴만 넘어가야 한다.
  place(state, sq('h', 4), 'p', 'w');
  state = useAbility(state, 'w', 'reaper.styx', []).state;
  state = submitMove(state, sq('a', 1), sq('a', 2));
  check('묶인 흑은 둘 수 없어 턴이 넘어간다', state.turn, 'w');
  check('판은 계속된다', state.phase, 'playing');
}

console.log(`\n${failures === 0 ? '모든 점검 통과' : `${failures}건 실패`}\n`);
process.exit(failures === 0 ? 0 : 1);
