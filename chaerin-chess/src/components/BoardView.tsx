'use client';

import { fileOf, makeSquare, rankOf, toAlgebraic } from '@/lib/chess/board';
import type { Board, Color, PieceType, Square } from '@/lib/chess/types';

/** 양쪽 모두 채워진 글자를 쓰고 색으로만 구분한다. 작은 화면에서 훨씬 잘 읽힌다. */
const SOLID: Record<PieceType, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };

interface Props {
  board: Board;
  orientation: Color;
  selected: Square | null;
  moveTargets: Square[];
  abilityTargets: Square[];
  checkSquare: Square | null;
  marked: Square[];
  onSquare(square: Square): void;
}

export default function BoardView({
  board,
  orientation,
  selected,
  moveTargets,
  abilityTargets,
  checkSquare,
  marked,
  onSquare
}: Props) {
  const ranks = orientation === 'w' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const files = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  return (
    <div className="board">
      {ranks.map((rank) =>
        files.map((file) => {
          const square = makeSquare(file, rank);
          const piece = board[square];
          const isDark = (file + rank) % 2 === 0;
          const classes = ['square'];
          if (isDark) classes.push('dark');
          if (square === selected) classes.push('selected');
          if (abilityTargets.includes(square)) classes.push('ability-target');
          else if (moveTargets.includes(square) && piece) classes.push('target');
          if (square === checkSquare) classes.push('check');
          if (marked.includes(square)) classes.push('marked');

          return (
            <button
              key={square}
              type="button"
              className={classes.join(' ')}
              onClick={() => onSquare(square)}
              aria-label={`${toAlgebraic(square)}${piece ? ` ${piece.color === 'w' ? '백' : '흑'} ${piece.type}` : ''}`}
            >
              {moveTargets.includes(square) && !piece && !abilityTargets.includes(square) ? (
                <span className="dot" />
              ) : null}
              {piece ? <span className={`piece ${piece.color}`}>{SOLID[piece.type]}</span> : null}
              {fileOf(square) === (orientation === 'w' ? 0 : 7) || rankOf(square) === (orientation === 'w' ? 0 : 7) ? (
                <span className="coord">{toAlgebraic(square)}</span>
              ) : null}
            </button>
          );
        })
      )}
    </div>
  );
}
