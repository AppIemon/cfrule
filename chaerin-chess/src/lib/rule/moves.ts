import {
  fileOf,
  findKing,
  forward,
  makeSquare,
  onBoard,
  pawnHomeRank,
  promotionRank,
  rankOf,
  squaresOf
} from '@/lib/chess/board';
import type { Color, Move, Piece, PieceType, Square } from '@/lib/chess/types';
import { OTHER } from '@/lib/chess/types';
import {
  isBlockaded,
  isKingBound,
  isPawnOnly,
  isPieceFrozen,
  isPieceInvulnerable,
  mimicTypeOf
} from './effects';
import type { GameState } from './types';

type Vec = [number, number];

const KNIGHT_VECS: Vec[] = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]
];
const DIAGONAL_VECS: Vec[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTHOGONAL_VECS: Vec[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ROYAL_VECS: Vec[] = [...DIAGONAL_VECS, ...ORTHOGONAL_VECS];

/** 캐슬링 판정에 쓰는 제자리들. */
export function kingHome(color: Color): Square {
  return makeSquare(4, color === 'w' ? 0 : 7);
}

export function rookHome(color: Color, side: 'k' | 'q'): Square {
  return makeSquare(side === 'k' ? 7 : 0, color === 'w' ? 0 : 7);
}

/**
 * 이 기물이 이번에 쓸 수 있는 이동 방식.
 *
 * 직업 패시브와 〈모방〉 효과가 여기서 한 번에 합쳐진다. 이동 생성과 공격 판정이
 * 같은 함수를 보게 해서, 패시브로 얻은 수가 체크에도 그대로 반영되게 한다.
 */
export function movePatterns(
  state: GameState,
  piece: Piece,
  from: Square
): { types: PieceType[]; pawnAlwaysDouble: boolean; rookJump: boolean } {
  const types = new Set<PieceType>([piece.type]);
  let pawnAlwaysDouble = false;
  let rookJump = false;
  const jobId = state.players[piece.color].jobId;
  const rank = rankOf(from);

  if (jobId === 'hacker' && piece.type === 'p') {
    const inEnemyHalf = piece.color === 'w' ? rank >= 4 : rank <= 3;
    if (inEnemyHalf) types.add('n');
  }
  if (jobId === 'werewolf' && piece.type === 'p' && state.players[piece.color].turnCount >= 8) {
    types.add('n');
  }
  if (jobId === 'jeonuchi' && piece.type === 'p') pawnAlwaysDouble = true;
  if (jobId === 'engineer' && piece.type === 'r') rookJump = true;

  const mimic = mimicTypeOf(state, piece.id);
  if (mimic && mimic !== 'k') types.add(mimic);

  return { types: [...types], pawnAlwaysDouble, rookJump };
}

function pushMove(out: Move[], move: Move): void {
  out.push(move);
}

function slide(
  state: GameState,
  out: Move[],
  piece: Piece,
  from: Square,
  vecs: Vec[],
  rookJump: boolean,
  passive?: string
): void {
  const board = state.board;
  for (const [df, dr] of vecs) {
    let file = fileOf(from);
    let rank = rankOf(from);
    let jumped = false;
    for (;;) {
      file += df;
      rank += dr;
      if (!onBoard(file, rank)) break;
      const to = makeSquare(file, rank);
      const target = board[to];
      if (!target) {
        pushMove(out, { from, to, piece: piece.type, color: piece.color, passive });
        continue;
      }
      if (target.color !== piece.color) {
        pushMove(out, {
          from,
          to,
          piece: piece.type,
          color: piece.color,
          capture: target.type,
          captureSquare: to,
          passive
        });
        break;
      }
      // 기관사 〈선로〉: 경로 위 자기 기물 하나를 넘어간다. 넘은 칸 자체는 목적지가 아니다.
      if (rookJump && !jumped) {
        jumped = true;
        continue;
      }
      break;
    }
  }
}

function step(
  state: GameState,
  out: Move[],
  piece: Piece,
  from: Square,
  vecs: Vec[],
  passive?: string
): void {
  const board = state.board;
  for (const [df, dr] of vecs) {
    const file = fileOf(from) + df;
    const rank = rankOf(from) + dr;
    if (!onBoard(file, rank)) continue;
    const to = makeSquare(file, rank);
    const target = board[to];
    if (target && target.color === piece.color) continue;
    pushMove(out, {
      from,
      to,
      piece: piece.type,
      color: piece.color,
      capture: target ? target.type : undefined,
      captureSquare: target ? to : undefined,
      passive
    });
  }
}

function pawnMoves(
  state: GameState,
  out: Move[],
  piece: Piece,
  from: Square,
  alwaysDouble: boolean,
  passive?: string
): void {
  const board = state.board;
  const dir = forward(piece.color);
  const file = fileOf(from);
  const rank = rankOf(from);
  const promoRank = promotionRank(piece.color);
  const canPromote = piece.type === 'p';

  const emit = (to: Square, capture?: PieceType, captureSquare?: Square, double?: boolean) => {
    const base: Move = {
      from,
      to,
      piece: piece.type,
      color: piece.color,
      capture,
      captureSquare,
      double,
      passive
    };
    if (canPromote && rankOf(to) === promoRank) {
      for (const promotion of ['q', 'r', 'b', 'n'] as PieceType[]) {
        pushMove(out, { ...base, promotion });
      }
    } else {
      pushMove(out, base);
    }
  };

  const oneRank = rank + dir;
  if (onBoard(file, oneRank)) {
    const one = makeSquare(file, oneRank);
    if (!board[one]) {
      emit(one);
      const twoRank = rank + dir * 2;
      const mayDouble = alwaysDouble || (!piece.moved && rank === pawnHomeRank(piece.color));
      if (mayDouble && onBoard(file, twoRank)) {
        const two = makeSquare(file, twoRank);
        if (!board[two]) emit(two, undefined, undefined, true);
      }
    }
  }

  for (const df of [-1, 1]) {
    const captureFile = file + df;
    if (!onBoard(captureFile, oneRank)) continue;
    const to = makeSquare(captureFile, oneRank);
    const target = board[to];
    if (target && target.color !== piece.color) {
      emit(to, target.type, to);
    } else if (!target && state.epSquare === to) {
      const victimSquare = makeSquare(captureFile, rank);
      const victim = board[victimSquare];
      if (victim && victim.color !== piece.color && victim.type === 'p') {
        emit(to, 'p', victimSquare);
      }
    }
  }
}

function movesForType(
  state: GameState,
  out: Move[],
  piece: Piece,
  from: Square,
  type: PieceType,
  opts: { pawnAlwaysDouble: boolean; rookJump: boolean },
  passive?: string
): void {
  switch (type) {
    case 'p':
      pawnMoves(state, out, piece, from, opts.pawnAlwaysDouble, passive);
      break;
    case 'n':
      step(state, out, piece, from, KNIGHT_VECS, passive);
      break;
    case 'b':
      slide(state, out, piece, from, DIAGONAL_VECS, false, passive);
      break;
    case 'r':
      slide(state, out, piece, from, ORTHOGONAL_VECS, opts.rookJump, passive);
      break;
    case 'q':
      slide(state, out, piece, from, ROYAL_VECS, false, passive);
      break;
    case 'k':
      step(state, out, piece, from, ROYAL_VECS, passive);
      break;
  }
}

/** 캐슬링을 뺀, 한 기물의 의사합법 수. */
export function movesFrom(state: GameState, from: Square): Move[] {
  const piece = state.board[from];
  if (!piece) return [];
  const patterns = movePatterns(state, piece, from);
  const out: Move[] = [];
  const seen = new Set<string>();
  for (const type of patterns.types) {
    const before = out.length;
    movesForType(state, out, piece, from, type, patterns, type === piece.type ? undefined : labelFor(type));
    // 같은 칸에 여러 방식으로 갈 수 있으면 본래 이동 방식을 남긴다.
    for (let i = before; i < out.length; i++) {
      const key = `${out[i].to}:${out[i].promotion ?? ''}`;
      if (seen.has(key)) {
        out.splice(i, 1);
        i -= 1;
        continue;
      }
      seen.add(key);
    }
  }
  return out;
}

function labelFor(type: PieceType): string {
  return { p: '폰', n: '나이트', b: '비숍', r: '룩', q: '퀸', k: '킹' }[type] + ' 이동';
}

export function canCastle(state: GameState, color: Color, side: 'k' | 'q'): boolean {
  const kingSquare = kingHome(color);
  const king = state.board[kingSquare];
  if (!king || king.type !== 'k' || king.color !== color || king.moved) return false;
  const rookSquare = rookHome(color, side);
  const rook = state.board[rookSquare];
  if (!rook || rook.type !== 'r' || rook.color !== color || rook.moved) return false;

  const rank = color === 'w' ? 0 : 7;
  const betweenFiles = side === 'k' ? [5, 6] : [1, 2, 3];
  for (const file of betweenFiles) {
    if (state.board[makeSquare(file, rank)]) return false;
  }
  const pathFiles = side === 'k' ? [4, 5, 6] : [4, 3, 2];
  const enemy = OTHER[color];
  for (const file of pathFiles) {
    const square = makeSquare(file, rank);
    if (isBlockaded(state, color, square)) return false;
    if (isSquareAttacked(state, enemy, square)) return false;
  }
  return true;
}

function castlingMoves(state: GameState, color: Color): Move[] {
  if (isKingBound(state, color)) return [];
  const kingSquare = kingHome(color);
  const king = state.board[kingSquare];
  if (!king || isPieceFrozen(state, king.id)) return [];
  const rank = color === 'w' ? 0 : 7;
  const out: Move[] = [];
  if (canCastle(state, color, 'k')) {
    out.push({ from: kingSquare, to: makeSquare(6, rank), piece: 'k', color, castle: 'K' });
  }
  if (canCastle(state, color, 'q')) {
    out.push({ from: kingSquare, to: makeSquare(2, rank), piece: 'k', color, castle: 'Q' });
  }
  return out;
}

/** 그 색이 지금 공격하고 있는 칸인가. 얼어붙은 기물은 공격하지 못한다. */
export function isSquareAttacked(state: GameState, byColor: Color, target: Square): boolean {
  for (const from of squaresOf(state.board, byColor)) {
    const piece = state.board[from]!;
    if (isPieceFrozen(state, piece.id)) continue;
    if (isBlockaded(state, byColor, target)) continue;
    const patterns = movePatterns(state, piece, from);
    for (const type of patterns.types) {
      if (attacksAs(state, piece, from, type, target, patterns.rookJump)) return true;
    }
  }
  return false;
}

function attacksAs(
  state: GameState,
  piece: Piece,
  from: Square,
  type: PieceType,
  target: Square,
  rookJump: boolean
): boolean {
  const file = fileOf(from);
  const rank = rankOf(from);
  if (type === 'p') {
    const dir = forward(piece.color);
    return [-1, 1].some((df) => onBoard(file + df, rank + dir) && makeSquare(file + df, rank + dir) === target);
  }
  if (type === 'n') {
    return KNIGHT_VECS.some(([df, dr]) => onBoard(file + df, rank + dr) && makeSquare(file + df, rank + dr) === target);
  }
  if (type === 'k') {
    return ROYAL_VECS.some(([df, dr]) => onBoard(file + df, rank + dr) && makeSquare(file + df, rank + dr) === target);
  }
  const vecs = type === 'b' ? DIAGONAL_VECS : type === 'r' ? ORTHOGONAL_VECS : ROYAL_VECS;
  const jumpAllowed = type === 'r' && rookJump;
  for (const [df, dr] of vecs) {
    let f = file;
    let r = rank;
    let jumped = false;
    for (;;) {
      f += df;
      r += dr;
      if (!onBoard(f, r)) break;
      const square = makeSquare(f, r);
      if (square === target) return true;
      const occupant = state.board[square];
      if (!occupant) continue;
      if (jumpAllowed && !jumped && occupant.color === piece.color) {
        jumped = true;
        continue;
      }
      break;
    }
  }
  return false;
}

export function isInCheck(state: GameState, color: Color): boolean {
  const kingSquare = findKing(state.board, color);
  if (kingSquare == null) return false;
  return isSquareAttacked(state, OTHER[color], kingSquare);
}

/** 능력 효과까지 반영한, 그 색이 실제로 둘 수 있는 수. */
export function legalMoves(state: GameState, color: Color): Move[] {
  if (state.phase !== 'playing') return [];
  const extra = state.pendingExtra;
  const pawnOnly = isPawnOnly(state, color);
  const kingBound = isKingBound(state, color);

  const out: Move[] = [];
  for (const from of squaresOf(state.board, color)) {
    const piece = state.board[from]!;
    if (extra && piece.id !== extra.pieceId) continue;
    if (isPieceFrozen(state, piece.id)) continue;
    if (kingBound && piece.type === 'k') continue;
    if (pawnOnly && piece.type !== 'p') continue;
    for (const move of movesFrom(state, from)) {
      if (extra) {
        if (!extra.captureAllowed && move.capture) continue;
        if (extra.knightOnly && move.passive !== '나이트 이동' && piece.type !== 'n') continue;
      }
      out.push(move);
    }
  }
  if (!extra && !pawnOnly) out.push(...castlingMoves(state, color));

  return out.filter((move) => isMoveAllowed(state, move));
}

function isMoveAllowed(state: GameState, move: Move): boolean {
  if (isBlockaded(state, move.color, move.to)) return false;
  if (move.captureSquare != null) {
    const victim = state.board[move.captureSquare];
    if (victim && isPieceInvulnerable(state, victim.id)) return false;
  }
  const banned = state.bannedMove;
  if (banned && banned.color === move.color && banned.from === move.from && banned.to === move.to) return false;
  return !leavesKingInCheck(state, move);
}

function leavesKingInCheck(state: GameState, move: Move): boolean {
  const probe = cloneForProbe(state);
  applyMoveToBoard(probe, move);
  return isInCheck(probe, move.color);
}

/** 합법성 검사용 얕은 복제. 판과 효과만 있으면 충분하다. */
export function cloneForProbe(state: GameState): GameState {
  return {
    ...state,
    board: state.board.map((piece) => (piece ? { ...piece } : null)),
    effects: state.effects.map((fx) => ({ ...fx })),
    players: {
      w: { ...state.players.w },
      b: { ...state.players.b }
    }
  };
}

/**
 * 판만 바꾼다. 자원·기보·턴 넘김 같은 판 바깥 일은 engine 이 맡는다.
 * 잡힌 기물을 돌려주므로 호출한 쪽이 뒷정리를 이어서 할 수 있다.
 */
export function applyMoveToBoard(state: GameState, move: Move): Piece | null {
  const board = state.board;
  const piece = board[move.from];
  if (!piece) return null;

  let captured: Piece | null = null;
  if (move.captureSquare != null) {
    captured = board[move.captureSquare];
    board[move.captureSquare] = null;
  }
  board[move.from] = null;
  board[move.to] = piece;
  piece.moved = true;
  if (move.promotion && piece.type === 'p') piece.type = move.promotion;

  if (move.castle) {
    const rank = rankOf(move.to);
    const rookFrom = makeSquare(move.castle === 'K' ? 7 : 0, rank);
    const rookTo = makeSquare(move.castle === 'K' ? 5 : 3, rank);
    const rook = board[rookFrom];
    if (rook) {
      board[rookFrom] = null;
      board[rookTo] = rook;
      rook.moved = true;
    }
  }

  state.epSquare = move.double ? makeSquare(fileOf(move.to), (rankOf(move.from) + rankOf(move.to)) / 2) : null;
  return captured;
}

export function hasLegalMove(state: GameState, color: Color): boolean {
  return legalMoves(state, color).length > 0;
}

/**
 * 능력으로 걸린 일시 효과를 걷어낸 판에서도 둘 수 없는지 본다.
 * 효과 때문에 둘 수 없을 뿐이면 체크메이트가 아니라 그 턴을 넘긴다.
 */
export function hasLegalMoveIgnoringEffects(state: GameState, color: Color): boolean {
  const probe = cloneForProbe(state);
  probe.effects = [];
  probe.pendingExtra = null;
  probe.bannedMove = null;
  return legalMoves(probe, color).length > 0;
}
