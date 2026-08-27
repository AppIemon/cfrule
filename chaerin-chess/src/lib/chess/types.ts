/** 채린룰 체스 — 판/기물의 가장 밑바닥 타입들. */

export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

/** 0..63. index = rank * 8 + file, rank 0 이 백의 1랭크다(백은 rank 가 커지는 쪽으로 전진). */
export type Square = number;

export interface Piece {
  /** 기물마다 고유. 능력이 "이 기물"을 지목할 때 칸 대신 이 값을 쓴다. */
  id: number;
  type: PieceType;
  color: Color;
  /** 캐슬링·폰 첫 두 칸 판정용. */
  moved: boolean;
}

export type Board = (Piece | null)[];

export interface Move {
  from: Square;
  to: Square;
  piece: PieceType;
  color: Color;
  /** 잡히는 기물의 종류(앙파상 포함). */
  capture?: PieceType;
  /** 앙파상이면 실제로 사라지는 폰의 칸. to 와 다르다. */
  captureSquare?: Square;
  promotion?: PieceType;
  castle?: 'K' | 'Q';
  /** 폰 두 칸 전진 — 앙파상 칸을 만든다. */
  double?: boolean;
  /** 패시브로 얻은 수라면 그 이름. 기보에 남긴다. */
  passive?: string;
}

export const OTHER: Record<Color, Color> = { w: 'b', b: 'w' };
