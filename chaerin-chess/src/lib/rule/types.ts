import type { Board, Color, Move, PieceType, Square } from '@/lib/chess/types';

/** 능력이 판에 남기는 지속 효과. state.ply 가 expiresAtPly 에 닿으면 사라진다. */
export type EffectKind =
  | 'frozen' /** 지정한 기물이 움직일 수 없다 */
  | 'sealed' /** 지정한 색이 능력을 쓸 수 없다 */
  | 'kingBound' /** 지정한 색의 킹이 움직일 수 없다 */
  | 'pawnOnly' /** 지정한 색은 폰으로만 둘 수 있다 */
  | 'blockade' /** 지정한 색이 그 칸에 들어갈 수 없다 */
  | 'invulnerable' /** 지정한 기물을 잡을 수 없다 */
  | 'mimic'; /** 지정한 기물이 다른 종류처럼도 움직인다 */

export interface Effect {
  id: string;
  kind: EffectKind;
  /** 효과를 받는 쪽. 기물 대상 효과라면 그 기물의 주인. */
  color: Color;
  pieceId?: number;
  square?: Square;
  mimicType?: PieceType;
  expiresAtPly: number;
  /** 로그·상태창에 그대로 쓰는 문구. */
  label: string;
}

export interface AbilitySlot {
  /** -1 이면 무제한. */
  uses: number;
  /** 남은 쿨타임(자기 턴 기준). */
  cooldown: number;
}

export interface PlayerState {
  color: Color;
  name: string;
  jobId: string | null;
  /** 직업 고유 자원(사혼·마나·감시). 자원을 안 쓰는 직업은 0 으로 둔다. */
  resource: number;
  /** 자기 턴을 몇 번 받았는가. 늑대인간 〈보름달〉이 본다. */
  turnCount: number;
  /** 수집가가 잡아 보관한 상대 기물. */
  stash: PieceType[];
  /** 잃은 자기 기물. 시프터 〈탈피〉가 본다. */
  lost: PieceType[];
  abilities: Record<string, AbilitySlot>;
}

export interface LogEntry {
  id: string;
  ply: number;
  color: Color | null;
  kind: 'move' | 'ability' | 'system';
  text: string;
}

export type DraftStep = 'pick-first' | 'ban' | 'pick-second' | 'done';

export interface DraftState {
  /** 채린룰과 같이 선픽자가 먼저 고르고, 이어서 상대 직업을 밴한다. */
  firstPicker: Color;
  step: DraftStep;
  banned: string[];
  maxBans: number;
}

export interface GameResult {
  winner: Color | null;
  reason: string;
}

/** 감시자 〈요격〉이 되돌릴 지점 — 상대가 직전 수를 두기 전의 판. */
export interface RewindPoint {
  board: Board;
  epSquare: Square | null;
  move: Move;
  /** 그 수를 둔 색. */
  by: Color;
  /** 그 색의 수 두기 전 상태 — 되돌릴 때 자원·창고까지 함께 돌린다. */
  moverState: PlayerState;
  /** 되돌리는 쪽이 그 수로 잃은 기물 목록의 이전 값. */
  victimLost: PieceType[];
}

export interface GameState {
  phase: 'draft' | 'playing' | 'ended';
  board: Board;
  nextPieceId: number;
  turn: Color;
  /** 반수(half-move) 카운터. 효과의 수명은 전부 이 값 기준이다. */
  ply: number;
  epSquare: Square | null;
  players: Record<Color, PlayerState>;
  effects: Effect[];
  log: LogEntry[];
  draft: DraftState;
  result: GameResult | null;
  /** 같은 턴에 한 번 더 두는 추가 이동(나이트 〈기사도〉, 기관사 〈증기〉). */
  pendingExtra: { pieceId: number; label: string; captureAllowed: boolean; knightOnly: boolean } | null;
  /** 늑대인간 〈송곳니〉가 이번 턴 장전되어 있는가. */
  fangArmed: boolean;
  /** 기관사 〈증기〉가 이번 턴 예약되어 있는가. */
  steamArmed: boolean;
  /** 〈요격〉으로 무효가 된 직후, 그 색이 다시 둘 수 없는 수. */
  bannedMove: { from: Square; to: Square; color: Color } | null;
  rewind: RewindPoint | null;
  /** 한 턴에 능력은 하나만. */
  abilityUsedThisTurn: boolean;
}

export type TargetPick =
  | { kind: 'square'; square: Square }
  | { kind: 'stash'; piece: PieceType; index: number };

export interface TargetStep {
  kind: 'square' | 'stash';
  prompt: string;
  /** 앞 단계에서 고른 값을 보고 이번 단계의 후보를 돌려준다. */
  options(state: GameState, color: Color, picked: TargetPick[]): TargetPick[];
}

export interface Ability {
  id: string;
  name: string;
  desc: string;
  /** 쿨타임(자기 턴 기준). 0 이면 쿨타임 없음. */
  cooldown: number;
  /** 남은 사용 횟수. -1 이면 무제한. */
  uses: number;
  /** 자원 소모량(사혼·마나·감시). */
  cost?: number;
  /** true 면 이 능력이 그 턴의 수를 대신한다. */
  endsTurn: boolean;
  steps?: TargetStep[];
  /** 쿨타임·횟수·봉인 밖의 조건. null 이면 발동 가능, 문자열이면 불가 사유. */
  ready?(state: GameState, color: Color): string | null;
  /** 상태를 직접 고친다. 반환값은 기보에 남길 문장. */
  apply(state: GameState, color: Color, picked: TargetPick[]): string;
}

export interface Job {
  id: string;
  name: string;
  tagline: string;
  resource?: { name: string; initial: number; max: number };
  passive: { name: string; desc: string };
  abilities: Ability[];
}
