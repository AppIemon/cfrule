import { initialBoard, findPiece } from '@/lib/chess/board';
import type { Color, Move, PieceType, Square } from '@/lib/chess/types';
import { OTHER } from '@/lib/chess/types';
import {
  applyMimicPassive,
  onOpponentAbilityUsed,
  onPieceRemoved,
  onTurnStartPassive,
  pushLog
} from './board-ops';
import { isSealed, pruneEffects } from './effects';
import { JOBS, JOB_BY_ID, abilityById, jobOf, resolveFang } from './jobs';
import {
  applyMoveToBoard,
  cloneForProbe,
  hasLegalMoveIgnoringEffects,
  isInCheck,
  legalMoves
} from './moves';
import { describeMove } from './notation';
import type { Ability, GameState, PlayerState, TargetPick } from './types';

const MAX_BANS = 2;

function emptyPlayer(color: Color, name: string): PlayerState {
  return {
    color,
    name,
    jobId: null,
    resource: 0,
    turnCount: 0,
    stash: [],
    lost: [],
    abilities: {}
  };
}

export function createGame(whiteName = '백', blackName = '흑'): GameState {
  const { board, nextPieceId } = initialBoard();
  const state: GameState = {
    phase: 'draft',
    board,
    nextPieceId,
    turn: 'w',
    ply: 0,
    epSquare: null,
    players: {
      w: emptyPlayer('w', whiteName || '백'),
      b: emptyPlayer('b', blackName || '흑')
    },
    effects: [],
    log: [],
    // 백이 먼저 두는 만큼 직업은 흑이 먼저 고르고, 이어서 흑이 백의 직업을 밴한다.
    draft: { firstPicker: 'b', step: 'pick-first', banned: [], maxBans: MAX_BANS },
    result: null,
    pendingExtra: null,
    fangArmed: false,
    steamArmed: false,
    bannedMove: null,
    rewind: null,
    abilityUsedThisTurn: false
  };
  pushLog(state, null, 'system', '채린룰 체스 — 흑이 먼저 직업을 고르고 백의 직업을 밴합니다.');
  return state;
}

function clone(state: GameState): GameState {
  return structuredClone(state);
}

export function availableJobs(state: GameState): string[] {
  const taken = [state.players.w.jobId, state.players.b.jobId].filter(Boolean) as string[];
  return JOBS.map((job) => job.id).filter((id) => !state.draft.banned.includes(id) && !taken.includes(id));
}

export function pickJob(state: GameState, jobId: string): GameState {
  const next = clone(state);
  const draft = next.draft;
  if (next.phase !== 'draft') return state;
  if (!JOB_BY_ID[jobId]) return state;
  if (!availableJobs(next).includes(jobId)) return state;

  if (draft.step === 'pick-first') {
    next.players[draft.firstPicker].jobId = jobId;
    pushLog(next, draft.firstPicker, 'system', `${next.players[draft.firstPicker].name}의 직업은 ${JOB_BY_ID[jobId].name}`);
    draft.step = 'ban';
    return next;
  }
  if (draft.step === 'pick-second') {
    const second = OTHER[draft.firstPicker];
    next.players[second].jobId = jobId;
    pushLog(next, second, 'system', `${next.players[second].name}의 직업은 ${JOB_BY_ID[jobId].name}`);
    draft.step = 'done';
    return beginPlaying(next);
  }
  return state;
}

export function submitBans(state: GameState, jobIds: string[]): GameState {
  if (state.phase !== 'draft' || state.draft.step !== 'ban') return state;
  const next = clone(state);
  const own = next.players[next.draft.firstPicker].jobId;
  const bans = [...new Set(jobIds)]
    .filter((id) => JOB_BY_ID[id] && id !== own)
    .slice(0, next.draft.maxBans);
  next.draft.banned = bans;
  next.draft.step = 'pick-second';
  pushLog(
    next,
    next.draft.firstPicker,
    'system',
    bans.length ? `밴: ${bans.map((id) => JOB_BY_ID[id].name).join(', ')}` : '밴 없이 진행합니다.'
  );
  return next;
}

function beginPlaying(state: GameState): GameState {
  state.phase = 'playing';
  state.turn = 'w';
  state.ply = 0;
  for (const color of ['w', 'b'] as Color[]) {
    const player = state.players[color];
    const job = player.jobId ? JOB_BY_ID[player.jobId] : null;
    player.resource = job?.resource?.initial ?? 0;
    player.abilities = {};
    for (const ability of job?.abilities ?? []) {
      player.abilities[ability.id] = { uses: ability.uses, cooldown: 0 };
    }
  }
  pushLog(state, null, 'system', '대국 시작 — 백부터 둡니다.');
  beginTurn(state, 'w');
  return state;
}

/** 자기 턴이 열릴 때의 정산: 턴 수, 자원, 쿨타임, 수명이 끝난 효과. */
function beginTurn(state: GameState, color: Color): void {
  const player = state.players[color];
  player.turnCount += 1;
  onTurnStartPassive(state, color);
  for (const slot of Object.values(player.abilities)) {
    if (slot.cooldown > 0) slot.cooldown -= 1;
  }
  state.abilityUsedThisTurn = false;
  state.pendingExtra = null;
  state.fangArmed = false;
  state.steamArmed = false;
  if (state.bannedMove && state.bannedMove.color !== color) state.bannedMove = null;
  pruneEffects(state);
  evaluateTurnStart(state, color, 0);
}

/**
 * 둘 수 있는 수가 없을 때의 판정.
 *
 * 능력에 묶여 못 두는 것과, 판 자체가 끝난 것을 갈라야 한다. 일시 효과를 걷어낸
 * 판에서는 둘 수 있다면 체크메이트가 아니라 그 턴을 넘긴다 — 능력 한 방으로
 * 판이 끝나 버리는 일을 막는다.
 */
function evaluateTurnStart(state: GameState, color: Color, depth: number): void {
  if (state.phase !== 'playing') return;
  if (legalMoves(state, color).length > 0) return;

  if (hasLegalMoveIgnoringEffects(state, color) && depth < 4) {
    pushLog(state, color, 'system', `${state.players[color].name}은(는) 능력에 묶여 이번 턴을 넘깁니다.`);
    passTurn(state, depth + 1);
    return;
  }

  if (isInCheck(state, color)) {
    const winner = OTHER[color];
    state.phase = 'ended';
    state.result = { winner, reason: '체크메이트' };
    markMate(state);
    pushLog(state, winner, 'system', `체크메이트 — ${state.players[winner].name} 승리`);
    return;
  }
  state.phase = 'ended';
  state.result = { winner: null, reason: '스테일메이트' };
  pushLog(state, null, 'system', '스테일메이트 — 무승부');
}

function markMate(state: GameState): void {
  for (let i = state.log.length - 1; i >= 0; i--) {
    if (state.log[i].kind === 'move') {
      state.log[i].text = state.log[i].text.replace(/ \+$/, '') + ' #';
      return;
    }
  }
}

function passTurn(state: GameState, depth: number): void {
  state.ply += 1;
  pruneEffects(state);
  const next = OTHER[state.turn];
  state.turn = next;
  const player = state.players[next];
  player.turnCount += 1;
  onTurnStartPassive(state, next);
  for (const slot of Object.values(player.abilities)) {
    if (slot.cooldown > 0) slot.cooldown -= 1;
  }
  state.abilityUsedThisTurn = false;
  state.pendingExtra = null;
  state.fangArmed = false;
  state.steamArmed = false;
  if (state.bannedMove && state.bannedMove.color !== next) state.bannedMove = null;
  evaluateTurnStart(state, next, depth);
}

function endTurn(state: GameState): void {
  state.ply += 1;
  const next = OTHER[state.turn];
  state.turn = next;
  beginTurn(state, next);
}

export function movesFor(state: GameState, color: Color): Move[] {
  return legalMoves(state, color);
}

export function movesFromSquare(state: GameState, from: Square): Move[] {
  return legalMoves(state, state.turn).filter((move) => move.from === from);
}

export function submitMove(state: GameState, from: Square, to: Square, promotion?: PieceType): GameState {
  if (state.phase !== 'playing') return state;
  const color = state.turn;
  const candidates = legalMoves(state, color).filter((move) => move.from === from && move.to === to);
  if (!candidates.length) return state;
  const move = promotion ? candidates.find((item) => item.promotion === promotion) ?? candidates[0] : candidates[0];

  const next = clone(state);
  const wasExtra = !!next.pendingExtra;

  // 〈요격〉이 되돌릴 지점은 그 턴의 첫 수 직전이다.
  if (!wasExtra) {
    next.rewind = {
      board: next.board.map((piece) => (piece ? { ...piece } : null)),
      epSquare: next.epSquare,
      move,
      by: color,
      moverState: structuredClone(next.players[color]),
      victimLost: next.players[OTHER[color]].lost.slice()
    };
  }

  next.pendingExtra = null;
  const movingPieceId = next.board[from]?.id ?? null;
  const captured = applyMoveToBoard(next, move);
  if (captured) {
    onPieceRemoved(next, captured, color);
    const mover = movingPieceId != null ? findPieceById(next, movingPieceId) : null;
    if (mover) applyMimicPassive(next, mover, captured.type);
    if (move.captureSquare != null) resolveFang(next, color, move.captureSquare);
  }

  const enemy = OTHER[color];
  const check = isInCheck(next, enemy);
  pushLog(next, color, 'move', describeMove(move, { check, mate: false }));

  if (!wasExtra) next.pendingExtra = armExtraMove(next, color, move, movingPieceId, !!captured);

  const extra = next.pendingExtra;
  if (extra) {
    const pieceStillThere = findPiece(next.board, extra.pieceId) != null;
    if (!pieceStillThere || legalMoves(next, color).length === 0) {
      pushLog(next, color, 'system', `${extra.label}: 이어서 둘 수 있는 수가 없어 턴을 넘깁니다.`);
      next.pendingExtra = null;
    }
  }

  if (!next.pendingExtra) endTurn(next);
  return next;
}

function findPieceById(state: GameState, pieceId: number) {
  const square = findPiece(state.board, pieceId);
  return square == null ? null : state.board[square];
}

/** 나이트 〈기사도〉와 기관사 〈증기〉의 추가 이동을 건다. */
function armExtraMove(
  state: GameState,
  color: Color,
  move: Move,
  movingPieceId: number | null,
  captured: boolean
): GameState['pendingExtra'] {
  if (movingPieceId == null) return null;
  if (findPiece(state.board, movingPieceId) == null) return null;
  const jobId = state.players[color].jobId;

  if (jobId === 'knight' && move.piece === 'n' && captured) {
    pushLog(state, color, 'ability', '기사도 — 나이트가 한 번 더 뜁니다(잡기 불가).');
    return { pieceId: movingPieceId, label: '기사도', captureAllowed: false, knightOnly: true };
  }
  if (jobId === 'engineer' && state.steamArmed && move.piece === 'r') {
    state.steamArmed = false;
    pushLog(state, color, 'ability', '증기 — 그 룩으로 한 번 더 둡니다.');
    return { pieceId: movingPieceId, label: '증기', captureAllowed: true, knightOnly: false };
  }
  return null;
}

export interface AbilityStatus {
  ability: Ability;
  slot: { uses: number; cooldown: number };
  usable: boolean;
  reason: string | null;
}

export function abilityStatuses(state: GameState, color: Color): AbilityStatus[] {
  const job = jobOf(state, color);
  if (!job) return [];
  return job.abilities.map((ability) => {
    const slot = state.players[color].abilities[ability.id] ?? { uses: ability.uses, cooldown: 0 };
    const reason = abilityBlockReason(state, color, ability, slot);
    return { ability, slot, usable: reason === null, reason };
  });
}

function abilityBlockReason(
  state: GameState,
  color: Color,
  ability: Ability,
  slot: { uses: number; cooldown: number }
): string | null {
  if (state.phase !== 'playing') return '대국 중이 아닙니다.';
  if (state.turn !== color) return '자기 차례가 아닙니다.';
  if (state.pendingExtra) return '추가 이동을 먼저 마쳐야 합니다.';
  if (state.abilityUsedThisTurn) return '한 턴에 능력은 하나만 쓸 수 있습니다.';
  if (isSealed(state, color)) return '능력이 봉인되어 있습니다.';
  if (slot.uses === 0) return '남은 횟수가 없습니다.';
  if (slot.cooldown > 0) return `쿨타임 ${slot.cooldown}턴`;
  const job = jobOf(state, color);
  if (ability.cost && state.players[color].resource < ability.cost) {
    return `${job?.resource?.name ?? '자원'}이 ${ability.cost} 필요합니다.`;
  }
  return ability.ready ? ability.ready(state, color) : null;
}

export interface AbilityOutcome {
  state: GameState;
  error: string | null;
}

export function useAbility(
  state: GameState,
  color: Color,
  abilityId: string,
  picks: TargetPick[] = []
): AbilityOutcome {
  const ability = abilityById(abilityId);
  if (!ability) return { state, error: '없는 능력입니다.' };
  const slot = state.players[color].abilities[abilityId];
  if (!slot) return { state, error: '이 직업의 능력이 아닙니다.' };
  const blocked = abilityBlockReason(state, color, ability, slot);
  if (blocked) return { state, error: blocked };
  if ((ability.steps?.length ?? 0) !== picks.length) return { state, error: '대상을 모두 고르지 않았습니다.' };

  const next = clone(state);
  if (ability.cost) next.players[color].resource -= ability.cost;

  let text: string;
  try {
    text = ability.apply(next, color, picks);
  } catch (error) {
    return { state, error: error instanceof Error ? error.message : '능력을 쓸 수 없습니다.' };
  }

  if (ability.endsTurn) {
    if (isInCheck(next, color)) return { state, error: '그 능력을 쓰면 자기 킹이 체크에 놓입니다.' };
  } else if (legalMoves(next, color).length === 0 && !hasLegalMoveIgnoringEffects(next, color)) {
    return { state, error: '그 능력을 쓰면 둘 수 있는 수가 없어집니다.' };
  }

  if (slot.uses > 0) next.players[color].abilities[abilityId].uses -= 1;
  next.players[color].abilities[abilityId].cooldown = ability.cooldown;
  next.abilityUsedThisTurn = true;
  onOpponentAbilityUsed(next, color);
  pushLog(next, color, 'ability', `〈${ability.name}〉 ${text}`);

  if (ability.endsTurn) {
    const enemy = OTHER[color];
    if (isInCheck(next, enemy)) pushLog(next, color, 'system', '체크!');
    endTurn(next);
  }
  return { state: next, error: null };
}

/** 능력 대상 고르기 — 지금 단계에서 고를 수 있는 후보. */
export function abilityOptions(
  state: GameState,
  color: Color,
  abilityId: string,
  picked: TargetPick[]
): TargetPick[] {
  const ability = abilityById(abilityId);
  if (!ability?.steps || picked.length >= ability.steps.length) return [];
  const probe = cloneForProbe(state);
  try {
    return ability.steps[picked.length].options(probe, color, picked);
  } catch {
    return [];
  }
}

export function abilityStepPrompt(abilityId: string, index: number): string {
  const ability = abilityById(abilityId);
  return ability?.steps?.[index]?.prompt ?? '';
}

export function resign(state: GameState, color: Color): GameState {
  if (state.phase !== 'playing') return state;
  const next = clone(state);
  next.phase = 'ended';
  next.result = { winner: OTHER[color], reason: '기권' };
  pushLog(next, color, 'system', `${next.players[color].name} 기권 — ${next.players[OTHER[color]].name} 승리`);
  return next;
}
