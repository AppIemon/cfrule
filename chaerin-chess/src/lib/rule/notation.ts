import { PIECE_GLYPH, PIECE_NAME_KO, toAlgebraic } from '@/lib/chess/board';
import type { Move } from '@/lib/chess/types';

/** 기보 한 줄. 정식 SAN 대신 읽기 쉬운 형태로 남긴다. */
export function describeMove(move: Move, extras: { check: boolean; mate: boolean }): string {
  if (move.castle) {
    return `${PIECE_GLYPH[move.color].k} ${move.castle === 'K' ? '킹사이드' : '퀸사이드'} 캐슬링${suffix(extras)}`;
  }
  const glyph = PIECE_GLYPH[move.color][move.piece];
  const arrow = move.capture ? '×' : '→';
  const promo = move.promotion ? ` =${PIECE_NAME_KO[move.promotion]}` : '';
  const passive = move.passive ? ` (${move.passive})` : '';
  return `${glyph} ${toAlgebraic(move.from)}${arrow}${toAlgebraic(move.to)}${promo}${passive}${suffix(extras)}`;
}

function suffix(extras: { check: boolean; mate: boolean }): string {
  if (extras.mate) return ' #';
  if (extras.check) return ' +';
  return '';
}
