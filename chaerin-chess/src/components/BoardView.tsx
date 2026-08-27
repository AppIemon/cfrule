'use client';

import { fileOf, makeSquare, rankOf, toAlgebraic } from '@/lib/chess/board';
import type { Board, Color, PieceType, Square } from '@/lib/chess/types';

/** 양쪽 다 채워진 글자를 쓰고 색으로만 구분한다. 작은 화면에서 더 잘 읽힌다. */
const SOLID: Record<PieceType, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };
const FILES = 'abcdefgh';

interface Props {
  board: Board;
  orientation: Color;
  selected: Square | null;
  moveTargets: Square[];
  abilityTargets: Square[];
  checkSquare: Square | null;
  blocked: Square[];
  onSquare(square: Square): void;
}

export default function BoardView({
  board,
  orientation,
  selected,
  moveTargets,
  abilityTargets,
  checkSquare,
  blocked,
  onSquare
}: Props) {
  const ranks = orientation === 'w' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const files = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const bottomRank = ranks[7];
  const leftFile = files[0];

  return (
    <div className="board">
      {ranks.map((rank) =>
        files.map((file) => {
          const square = makeSquare(file, rank);
          const piece = board[square];
          const isTarget = moveTargets.includes(square);
          const classes = ['sq'];
          if ((file + rank) % 2 === 0) classes.push('d');
          if (square === selected) classes.push('sel');
          if (abilityTargets.includes(square)) classes.push('fx');
          else if (isTarget && piece) classes.push('cap');
          if (square === checkSquare) classes.push('chk');
          if (blocked.includes(square)) classes.push('blk');

          return (
            <button
              key={square}
              type="button"
              className={classes.join(' ')}
              onClick={() => onSquare(square)}
              aria-label={toAlgebraic(square)}
            >
              {rank === bottomRank || file === leftFile ? (
                <span className="co">
                  {rank === bottomRank && file === leftFile
                    ? toAlgebraic(square)
                    : rank === bottomRank
                      ? FILES[fileOf(square)]
                      : rankOf(square) + 1}
                </span>
              ) : null}
              {isTarget && !piece && !abilityTargets.includes(square) ? <span className="dot" /> : null}
              {piece ? <span className={`p ${piece.color}`}>{SOLID[piece.type]}</span> : null}
            </button>
          );
        })
      )}
    </div>
  );
}
