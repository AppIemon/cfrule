import type { Board, Color, Piece, PieceType, Square } from './types';

export const FILES = 'abcdefgh';

export function fileOf(sq: Square): number {
  return sq & 7;
}

export function rankOf(sq: Square): number {
  return sq >> 3;
}

export function makeSquare(file: number, rank: number): Square {
  return rank * 8 + file;
}

export function onBoard(file: number, rank: number): boolean {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

export function toAlgebraic(sq: Square): string {
  return `${FILES[fileOf(sq)]}${rankOf(sq) + 1}`;
}

/** 백은 rank 증가 방향, 흑은 감소 방향으로 전진한다. */
export function forward(color: Color): number {
  return color === 'w' ? 1 : -1;
}

/** 폰이 승격하는 랭크. */
export function promotionRank(color: Color): number {
  return color === 'w' ? 7 : 0;
}

/** 폰이 처음 놓이는 랭크. */
export function pawnHomeRank(color: Color): number {
  return color === 'w' ? 1 : 6;
}

export const PIECE_NAME_KO: Record<PieceType, string> = {
  p: '폰',
  n: '나이트',
  b: '비숍',
  r: '룩',
  q: '퀸',
  k: '킹'
};

export const PIECE_GLYPH: Record<Color, Record<PieceType, string>> = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' }
};

/** 능력 비용·가치 계산에 쓰는 기물 가치. */
export const PIECE_VALUE: Record<PieceType, number> = { p: 1, n: 2, b: 2, r: 3, q: 4, k: 0 };

export function emptyBoard(): Board {
  return new Array<Piece | null>(64).fill(null);
}

const BACK_RANK: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

/** 초기 배치와, 다음에 발급할 기물 id 를 함께 돌려준다. */
export function initialBoard(): { board: Board; nextPieceId: number } {
  const board = emptyBoard();
  let id = 1;
  for (let file = 0; file < 8; file++) {
    board[makeSquare(file, 0)] = { id: id++, type: BACK_RANK[file], color: 'w', moved: false };
    board[makeSquare(file, 1)] = { id: id++, type: 'p', color: 'w', moved: false };
    board[makeSquare(file, 6)] = { id: id++, type: 'p', color: 'b', moved: false };
    board[makeSquare(file, 7)] = { id: id++, type: BACK_RANK[file], color: 'b', moved: false };
  }
  return { board, nextPieceId: id };
}

export function findPiece(board: Board, pieceId: number): Square | null {
  for (let sq = 0; sq < 64; sq++) {
    if (board[sq]?.id === pieceId) return sq;
  }
  return null;
}

export function findKing(board: Board, color: Color): Square | null {
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (piece && piece.type === 'k' && piece.color === color) return sq;
  }
  return null;
}

export function squaresOf(board: Board, color: Color): Square[] {
  const out: Square[] = [];
  for (let sq = 0; sq < 64; sq++) {
    if (board[sq]?.color === color) out.push(sq);
  }
  return out;
}

/** 직교로 맞닿은 칸들. 늑대인간 〈송곳니〉가 쓴다. */
export function orthogonalNeighbours(sq: Square): Square[] {
  const file = fileOf(sq);
  const rank = rankOf(sq);
  const out: Square[] = [];
  for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (onBoard(file + df, rank + dr)) out.push(makeSquare(file + df, rank + dr));
  }
  return out;
}

/** 킹 주변 8칸. 늑대인간 〈울부짖음〉이 쓴다. */
export function kingNeighbourhood(sq: Square): Square[] {
  const file = fileOf(sq);
  const rank = rankOf(sq);
  const out: Square[] = [];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      if (onBoard(file + df, rank + dr)) out.push(makeSquare(file + df, rank + dr));
    }
  }
  return out;
}
