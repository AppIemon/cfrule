import type { Color, PieceType, Square } from '@/lib/chess/types';
import type { Effect, EffectKind, GameState } from './types';

let counter = 0;

function nextId(): string {
  counter += 1;
  return `fx${counter}`;
}

/**
 * 효과의 수명은 전부 반수(ply) 로 잰다.
 *
 * 반수는 두 색이 번갈아 가지므로, 지금(ply p)에서 본 상대의 다음 턴은 p+1,
 * 그 다음은 p+3 … 이다. 상대 기준 d 턴짜리 효과는 p + 2d 에서 풀린다.
 * 자기 자신에게 거는 효과라면 자기 다음 턴이 p+2 이므로 p + 2d + 1 이다.
 */
export function opponentTurns(state: GameState, turns: number): number {
  return state.ply + 2 * turns;
}

export function ownTurns(state: GameState, turns: number): number {
  return state.ply + 2 * turns + 1;
}

export function addEffect(state: GameState, effect: Omit<Effect, 'id'>): Effect {
  const full: Effect = { ...effect, id: nextId() };
  state.effects.push(full);
  return full;
}

export function pruneEffects(state: GameState): void {
  state.effects = state.effects.filter((fx) => fx.expiresAtPly > state.ply);
}

export function effectsOfKind(state: GameState, kind: EffectKind): Effect[] {
  return state.effects.filter((fx) => fx.kind === kind);
}

export function isPieceFrozen(state: GameState, pieceId: number): boolean {
  return state.effects.some((fx) => fx.kind === 'frozen' && fx.pieceId === pieceId);
}

export function isPieceInvulnerable(state: GameState, pieceId: number): boolean {
  return state.effects.some((fx) => fx.kind === 'invulnerable' && fx.pieceId === pieceId);
}

export function isSealed(state: GameState, color: Color): boolean {
  return state.effects.some((fx) => fx.kind === 'sealed' && fx.color === color);
}

export function isKingBound(state: GameState, color: Color): boolean {
  return state.effects.some((fx) => fx.kind === 'kingBound' && fx.color === color);
}

export function isPawnOnly(state: GameState, color: Color): boolean {
  return state.effects.some((fx) => fx.kind === 'pawnOnly' && fx.color === color);
}

export function isBlockaded(state: GameState, color: Color, square: Square): boolean {
  return state.effects.some((fx) => fx.kind === 'blockade' && fx.color === color && fx.square === square);
}

export function mimicTypeOf(state: GameState, pieceId: number): PieceType | null {
  const fx = state.effects.find((item) => item.kind === 'mimic' && item.pieceId === pieceId);
  return fx?.mimicType ?? null;
}

/** 상태창에 뿌릴, 지금 살아 있는 효과 목록. */
export function activeEffectLabels(state: GameState, color: Color): string[] {
  return state.effects.filter((fx) => fx.color === color).map((fx) => fx.label);
}
