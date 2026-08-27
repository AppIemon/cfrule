import { PIECE_NAME_KO, PIECE_VALUE, promotionRank } from '@/lib/chess/board';
import type { Color, Piece, PieceType, Square } from '@/lib/chess/types';
import { OTHER } from '@/lib/chess/types';
import { addEffect, ownTurns } from './effects';
import type { GameState } from './types';

/**
 * 패시브의 실제 동작은 전부 여기와 moves.ts 에 모아 둔다. jobs.ts 는 이름과
 * 설명, 그리고 능동 능력만 들고 있다. 패시브가 판을 건드리는 지점이 흩어지면
 * "이 능력이 언제 발동했는가"를 따라가기가 어려워진다.
 */

export function pushLog(state: GameState, color: Color | null, kind: 'move' | 'ability' | 'system', text: string): void {
  state.log.push({ id: `${state.ply}-${state.log.length}`, ply: state.ply, color, kind, text });
  if (state.log.length > 300) state.log.shift();
}

/** 폰이 마지막 랭크에 놓이면(능력으로 옮겨졌을 때 포함) 퀸으로 승격시킨다. */
export function autoPromote(state: GameState, square: Square): boolean {
  const piece = state.board[square];
  if (!piece || piece.type !== 'p') return false;
  if (rankOfSquare(square) !== promotionRank(piece.color)) return false;
  piece.type = 'q';
  return true;
}

function rankOfSquare(square: Square): number {
  return square >> 3;
}

/**
 * 한 칸에서 기물을 들어낸다. 잡기와 능력에 의한 제거가 모두 여기를 지나므로
 * 수집가의 창고, 사신의 사혼, 감시자의 감시가 한 곳에서만 갱신된다.
 */
export function removePieceAt(state: GameState, square: Square, byColor: Color): Piece | null {
  const piece = state.board[square];
  if (!piece || piece.type === 'k') return null;
  state.board[square] = null;
  onPieceRemoved(state, piece, byColor);
  return piece;
}

/** 판에서 사라진 기물 하나에 대해 양쪽 직업 패시브를 정산한다. */
export function onPieceRemoved(state: GameState, piece: Piece, byColor: Color): void {
  const owner = piece.color;
  const loser = state.players[owner];
  loser.lost.push(piece.type);

  if (byColor === owner) return; // 자기 기물을 스스로 치운 경우(현재는 없음)

  const taker = state.players[byColor];
  if (taker.jobId === 'collector') taker.stash.push(piece.type);
  if (taker.jobId === 'reaper') {
    taker.resource = Math.min(20, taker.resource + PIECE_VALUE[piece.type]);
  }
  if (loser.jobId === 'watcher') {
    loser.resource = Math.min(20, loser.resource + 1);
  }
}

/** 시프터 〈모방〉 — 잡은 기물의 이동 방식을 다음 자기 턴까지 빌린다. */
export function applyMimicPassive(state: GameState, capturer: Piece, captured: PieceType): void {
  if (state.players[capturer.color].jobId !== 'shifter') return;
  if (captured === 'k') return;
  state.effects = state.effects.filter((fx) => !(fx.kind === 'mimic' && fx.pieceId === capturer.id));
  addEffect(state, {
    kind: 'mimic',
    color: capturer.color,
    pieceId: capturer.id,
    mimicType: captured,
    expiresAtPly: ownTurns(state, 1),
    label: `모방: ${PIECE_NAME_KO[capturer.type]}이 ${PIECE_NAME_KO[captured]} 이동을 빌림`
  });
}

/** 감시자 〈감시〉 — 상대가 능력을 쓸 때마다 쌓인다. */
export function onOpponentAbilityUsed(state: GameState, user: Color): void {
  const watcher = state.players[OTHER[user]];
  if (watcher.jobId !== 'watcher') return;
  watcher.resource = Math.min(20, watcher.resource + 2);
}

/** 마법사 〈마나〉 — 자기 턴이 돌아올 때마다 찬다. */
export function onTurnStartPassive(state: GameState, color: Color): void {
  const player = state.players[color];
  if (player.jobId === 'wizard') player.resource = Math.min(12, player.resource + 1);
}

export function spawnPiece(state: GameState, square: Square, type: PieceType, color: Color): Piece {
  const piece: Piece = { id: state.nextPieceId, type, color, moved: true };
  state.nextPieceId += 1;
  state.board[square] = piece;
  return piece;
}

export function movePieceWithin(state: GameState, from: Square, to: Square): void {
  const piece = state.board[from];
  if (!piece) return;
  state.board[from] = null;
  state.board[to] = piece;
  piece.moved = true;
}
