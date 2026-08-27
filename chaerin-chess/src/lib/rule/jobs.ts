import {
  PIECE_NAME_KO,
  fileOf,
  findKing,
  kingNeighbourhood,
  makeSquare,
  onBoard,
  pawnHomeRank,
  rankOf,
  squaresOf,
  toAlgebraic
} from '@/lib/chess/board';
import type { Color, PieceType, Square } from '@/lib/chess/types';
import { OTHER } from '@/lib/chess/types';
import {
  autoPromote,
  movePieceWithin,
  pushLog,
  removePieceAt,
  spawnPiece
} from './board-ops';
import { addEffect, isPieceInvulnerable, opponentTurns } from './effects';
import type { Ability, GameState, Job, TargetPick, TargetStep } from './types';

/**
 * 직업 데이터. 패시브의 실제 동작은 moves.ts(이동 방식)와 board-ops.ts(잡기·턴
 * 시작 정산)에 있고, 여기에는 이름·설명과 능동 능력만 둔다.
 */

function squareStep(
  prompt: string,
  options: (state: GameState, color: Color, picked: TargetPick[]) => Square[]
): TargetStep {
  return {
    kind: 'square',
    prompt,
    options: (state, color, picked) =>
      options(state, color, picked).map((square) => ({ kind: 'square' as const, square }))
  };
}

function stashStep(prompt: string): TargetStep {
  return {
    kind: 'stash',
    prompt,
    options: (state, color) =>
      state.players[color].stash.map((piece, index) => ({ kind: 'stash' as const, piece, index }))
  };
}

function pickedSquare(picked: TargetPick[], index: number): Square {
  const pick = picked[index];
  if (!pick || pick.kind !== 'square') throw new Error('칸을 고르지 않았습니다.');
  return pick.square;
}

function pickedStash(picked: TargetPick[], index: number): { piece: PieceType; index: number } {
  const pick = picked[index];
  if (!pick || pick.kind !== 'stash') throw new Error('창고에서 고르지 않았습니다.');
  return { piece: pick.piece, index: pick.index };
}

function ownSquares(
  state: GameState,
  color: Color,
  pred: (type: PieceType, square: Square) => boolean
): Square[] {
  return squaresOf(state.board, color).filter((square) => pred(state.board[square]!.type, square));
}

/** 능력의 표적이 될 수 있는 상대 기물. 킹과 〈수호〉로 보호된 기물은 뺀다. */
function enemyTargets(
  state: GameState,
  color: Color,
  pred: (type: PieceType, square: Square) => boolean = () => true
): Square[] {
  const enemy = OTHER[color];
  return squaresOf(state.board, enemy).filter((square) => {
    const piece = state.board[square]!;
    if (piece.type === 'k') return false;
    if (isPieceInvulnerable(state, piece.id)) return false;
    return pred(piece.type, square);
  });
}

function emptySquares(state: GameState, pred: (square: Square) => boolean = () => true): Square[] {
  const out: Square[] = [];
  for (let square = 0; square < 64; square++) {
    if (!state.board[square] && pred(square)) out.push(square);
  }
  return out;
}

function nameAt(state: GameState, square: Square): string {
  const piece = state.board[square];
  return piece ? `${PIECE_NAME_KO[piece.type]}(${toAlgebraic(square)})` : toAlgebraic(square);
}

function adjacentSquares(square: Square): Square[] {
  return kingNeighbourhood(square);
}

/** 나이트 이동 두 번으로 닿는 칸. 나이트 〈돌격〉이 쓴다. */
function doubleKnightSquares(from: Square): Square[] {
  const vecs = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const first = new Set<Square>();
  for (const [df, dr] of vecs) {
    const file = fileOf(from) + df;
    const rank = rankOf(from) + dr;
    if (onBoard(file, rank)) first.add(makeSquare(file, rank));
  }
  const second = new Set<Square>();
  for (const mid of first) {
    for (const [df, dr] of vecs) {
      const file = fileOf(mid) + df;
      const rank = rankOf(mid) + dr;
      if (onBoard(file, rank)) second.add(makeSquare(file, rank));
    }
  }
  second.delete(from);
  return [...second].sort((a, b) => a - b);
}

/** 자기 진영 절반(1~4랭크). 수집가 〈소환〉이 쓴다. */
function ownHalf(color: Color, square: Square): boolean {
  const rank = rankOf(square);
  return color === 'w' ? rank <= 3 : rank >= 4;
}

const hacker: Job = {
  id: 'hacker',
  name: '해커',
  tagline: '판을 뒤에서 건드린다',
  passive: {
    name: '침입',
    desc: '자신의 폰이 상대 진영 절반(백 5랭크 이상 / 흑 4랭크 이하)에 들어가면 나이트처럼도 움직일 수 있습니다.'
  },
  abilities: [
    {
      id: 'hacker.manipulate',
      name: '조작',
      desc: '자신의 기물 하나를 맞닿은 빈 칸으로 옮깁니다. 수로 치지 않으므로 이 턴에 한 수를 더 둡니다.',
      cooldown: 4,
      uses: 2,
      endsTurn: false,
      steps: [
        squareStep('옮길 자기 기물', (state, color) => ownSquares(state, color, (type) => type !== 'k')),
        squareStep('맞닿은 빈 칸', (state, _color, picked) => {
          const from = pickedSquare(picked, 0);
          return adjacentSquares(from).filter((square) => !state.board[square]);
        })
      ],
      apply(state, color, picked) {
        const from = pickedSquare(picked, 0);
        const to = pickedSquare(picked, 1);
        const label = nameAt(state, from);
        movePieceWithin(state, from, to);
        const promoted = autoPromote(state, to);
        return `${label}을 ${toAlgebraic(to)}로 조작${promoted ? ' · 승격' : ''}`;
      }
    },
    {
      id: 'hacker.scorch',
      name: '초토화',
      desc: '상대 폰 하나를 지웁니다. 이 능력이 그 턴의 수를 대신합니다.',
      cooldown: 6,
      uses: 1,
      endsTurn: true,
      steps: [squareStep('지울 상대 폰', (state, color) => enemyTargets(state, color, (type) => type === 'p'))],
      ready: (state, color) =>
        enemyTargets(state, color, (type) => type === 'p').length ? null : '지울 상대 폰이 없습니다.',
      apply(state, color, picked) {
        const square = pickedSquare(picked, 0);
        const label = nameAt(state, square);
        removePieceAt(state, square, color);
        return `${label}을 초토화`;
      }
    }
  ]
};

const shifter: Job = {
  id: 'shifter',
  name: '시프터',
  tagline: '잡은 것을 흉내 낸다',
  passive: {
    name: '모방',
    desc: '자신의 기물이 상대 기물을 잡으면, 그 기물은 다음 자기 턴이 끝날 때까지 잡은 기물의 이동 방식도 함께 씁니다.'
  },
  abilities: [
    {
      id: 'shifter.morph',
      name: '변신',
      desc: '자신의 나이트 하나를 비숍으로, 비숍 하나를 나이트로 바꿉니다. 수로 치지 않습니다.',
      cooldown: 3,
      uses: 3,
      endsTurn: false,
      steps: [
        squareStep('바꿀 나이트나 비숍', (state, color) =>
          ownSquares(state, color, (type) => type === 'n' || type === 'b')
        )
      ],
      ready: (state, color) =>
        ownSquares(state, color, (type) => type === 'n' || type === 'b').length
          ? null
          : '바꿀 나이트나 비숍이 없습니다.',
      apply(state, _color, picked) {
        const square = pickedSquare(picked, 0);
        const piece = state.board[square]!;
        const before = PIECE_NAME_KO[piece.type];
        piece.type = piece.type === 'n' ? 'b' : 'n';
        return `${toAlgebraic(square)}의 ${before}이 ${PIECE_NAME_KO[piece.type]}으로 변신`;
      }
    },
    {
      id: 'shifter.molt',
      name: '탈피',
      desc: '잃은 자기 폰 하나를 자기 폰 자리(백 2랭크 / 흑 7랭크)의 빈 칸에 되살립니다.',
      cooldown: 7,
      uses: 1,
      endsTurn: true,
      steps: [
        squareStep('되살릴 자리', (state, color) =>
          emptySquares(state, (square) => rankOf(square) === pawnHomeRank(color))
        )
      ],
      ready: (state, color) => {
        if (!state.players[color].lost.includes('p')) return '아직 잃은 폰이 없습니다.';
        return emptySquares(state, (square) => rankOf(square) === pawnHomeRank(color)).length
          ? null
          : '되살릴 빈 자리가 없습니다.';
      },
      apply(state, color, picked) {
        const square = pickedSquare(picked, 0);
        const index = state.players[color].lost.indexOf('p');
        if (index >= 0) state.players[color].lost.splice(index, 1);
        spawnPiece(state, square, 'p', color);
        return `폰을 ${toAlgebraic(square)}에 탈피로 되살림`;
      }
    }
  ]
};

const reaper: Job = {
  id: 'reaper',
  name: '사신',
  tagline: '잡을수록 강해진다',
  resource: { name: '사혼', initial: 0, max: 20 },
  passive: {
    name: '사혼',
    desc: '기물을 잡을 때마다 사혼을 얻습니다. 폰 1, 나이트·비숍 2, 룩 3, 퀸 4.'
  },
  abilities: [
    {
      id: 'reaper.harvest',
      name: '수확',
      desc: '사혼 6을 써서 상대 기물 하나(킹 제외)를 지웁니다. 이 능력이 그 턴의 수를 대신합니다.',
      cooldown: 0,
      uses: -1,
      cost: 6,
      endsTurn: true,
      steps: [squareStep('수확할 상대 기물', (state, color) => enemyTargets(state, color))],
      ready: (state, color) => (enemyTargets(state, color).length ? null : '수확할 상대 기물이 없습니다.'),
      apply(state, color, picked) {
        const square = pickedSquare(picked, 0);
        const label = nameAt(state, square);
        // 수확으로 지운 기물은 사혼을 돌려주지 않는다. 지운 뒤 값만큼 되돌린다.
        const piece = state.board[square]!;
        removePieceAt(state, square, color);
        const refunded = { p: 1, n: 2, b: 2, r: 3, q: 4, k: 0 }[piece.type];
        state.players[color].resource = Math.max(0, state.players[color].resource - refunded);
        return `${label}을 수확`;
      }
    },
    {
      id: 'reaper.styx',
      name: '저승길',
      desc: '상대 킹은 다음 상대 턴 동안 움직일 수 없습니다. 수로 치지 않습니다.',
      cooldown: 8,
      uses: 1,
      endsTurn: false,
      apply(state, color) {
        const enemy = OTHER[color];
        addEffect(state, {
          kind: 'kingBound',
          color: enemy,
          expiresAtPly: opponentTurns(state, 1),
          label: '저승길: 킹 이동 불가'
        });
        return '상대 킹을 저승길로 묶음';
      }
    }
  ]
};

const wizard: Job = {
  id: 'wizard',
  name: '마법사',
  tagline: '마나를 모아 판을 비튼다',
  resource: { name: '마나', initial: 2, max: 12 },
  passive: {
    name: '마나',
    desc: '자기 턴이 시작될 때마다 마나를 1 얻습니다. 최대 12까지 쌓입니다.'
  },
  abilities: [
    {
      id: 'wizard.blink',
      name: '순간이동',
      desc: '마나 5를 써서 자신의 기물 하나(킹 제외)를 아무 빈 칸으로 옮깁니다. 이 능력이 그 턴의 수를 대신합니다.',
      cooldown: 0,
      uses: -1,
      cost: 5,
      endsTurn: true,
      steps: [
        squareStep('옮길 자기 기물', (state, color) => ownSquares(state, color, (type) => type !== 'k')),
        squareStep('도착할 빈 칸', (state) => emptySquares(state))
      ],
      apply(state, color, picked) {
        const from = pickedSquare(picked, 0);
        const to = pickedSquare(picked, 1);
        const label = nameAt(state, from);
        movePieceWithin(state, from, to);
        const promoted = autoPromote(state, to);
        return `${label}을 ${toAlgebraic(to)}로 순간이동${promoted ? ' · 승격' : ''}`;
      }
    },
    {
      id: 'wizard.petrify',
      name: '석화',
      desc: '마나 7을 써서 상대 기물 하나(킹 제외)를 2턴간 움직일 수 없게 합니다. 수로 치지 않습니다.',
      cooldown: 0,
      uses: -1,
      cost: 7,
      endsTurn: false,
      steps: [squareStep('석화시킬 상대 기물', (state, color) => enemyTargets(state, color))],
      ready: (state, color) => (enemyTargets(state, color).length ? null : '석화시킬 상대 기물이 없습니다.'),
      apply(state, color, picked) {
        const square = pickedSquare(picked, 0);
        const piece = state.board[square]!;
        addEffect(state, {
          kind: 'frozen',
          color: piece.color,
          pieceId: piece.id,
          expiresAtPly: opponentTurns(state, 2),
          label: `석화: ${PIECE_NAME_KO[piece.type]}(${toAlgebraic(square)}) 이동 불가`
        });
        return `${nameAt(state, square)}을 석화`;
      }
    }
  ]
};

const engineer: Job = {
  id: 'engineer',
  name: '기관사',
  tagline: '룩을 선로 위에 올린다',
  passive: {
    name: '선로',
    desc: '자신의 룩은 경로 위의 자기 기물 하나를 뛰어넘을 수 있습니다.'
  },
  abilities: [
    {
      id: 'engineer.steam',
      name: '증기',
      desc: '이번 턴 룩으로 둔 뒤, 그 룩으로 한 번 더 둡니다. 수로 치지 않습니다.',
      cooldown: 5,
      uses: 2,
      endsTurn: false,
      ready: (state) => (state.steamArmed ? '이미 증기가 걸려 있습니다.' : null),
      apply(state) {
        state.steamArmed = true;
        return '증기를 올림 — 이번 룩 이동 뒤 한 번 더';
      }
    },
    {
      id: 'engineer.whistle',
      name: '기적',
      desc: '상대는 다음 한 수를 폰으로만 둘 수 있습니다. 수로 치지 않습니다.',
      cooldown: 6,
      uses: 1,
      endsTurn: false,
      apply(state, color) {
        addEffect(state, {
          kind: 'pawnOnly',
          color: OTHER[color],
          expiresAtPly: opponentTurns(state, 1),
          label: '기적: 폰으로만 둘 수 있음'
        });
        return '기적을 울려 상대를 폰으로 묶음';
      }
    }
  ]
};

const collector: Job = {
  id: 'collector',
  name: '수집가',
  tagline: '잡은 기물을 다시 꺼낸다',
  passive: {
    name: '수집',
    desc: '자신이 잡은 상대 기물을 창고에 보관합니다.'
  },
  abilities: [
    {
      id: 'collector.summon',
      name: '소환',
      desc: '창고의 기물 하나를 써서 자기 진영 절반(1~4랭크)의 빈 칸에 자기 색으로 놓습니다. 이 능력이 그 턴의 수를 대신합니다.',
      cooldown: 4,
      uses: 2,
      endsTurn: true,
      steps: [
        stashStep('창고에서 꺼낼 기물'),
        squareStep('놓을 빈 칸', (state, color, picked) => {
          const { piece } = pickedStash(picked, 0);
          return emptySquares(state, (square) => {
            if (!ownHalf(color, square)) return false;
            // 놓자마자 승격하는 자리는 애초에 고를 수 없다.
            if (piece === 'p') {
              const rank = rankOf(square);
              return color === 'w' ? rank >= 1 : rank <= 6;
            }
            return true;
          });
        })
      ],
      ready: (state, color) => (state.players[color].stash.length ? null : '창고가 비어 있습니다.'),
      apply(state, color, picked) {
        const { piece, index } = pickedStash(picked, 0);
        const square = pickedSquare(picked, 1);
        state.players[color].stash.splice(index, 1);
        spawnPiece(state, square, piece, color);
        return `${PIECE_NAME_KO[piece]}을 ${toAlgebraic(square)}에 소환`;
      }
    },
    {
      id: 'collector.appraise',
      name: '감정',
      desc: '상대는 다음 2턴간 능력을 쓸 수 없습니다. 수로 치지 않습니다.',
      cooldown: 5,
      uses: 2,
      endsTurn: false,
      apply(state, color) {
        addEffect(state, {
          kind: 'sealed',
          color: OTHER[color],
          expiresAtPly: opponentTurns(state, 2),
          label: '감정: 능력 봉인'
        });
        return '상대 능력을 감정으로 봉인';
      }
    }
  ]
};

const watcher: Job = {
  id: 'watcher',
  name: '감시자',
  tagline: '지켜보다 되돌린다',
  resource: { name: '감시', initial: 0, max: 20 },
  passive: {
    name: '감시',
    desc: '상대가 능력을 쓸 때마다 감시를 2, 자신의 기물이 잡힐 때마다 감시를 1 얻습니다.'
  },
  abilities: [
    {
      id: 'watcher.intercept',
      name: '요격',
      desc: '감시 5를 써서 상대가 방금 둔 수를 무효로 되돌립니다. 상대는 그 수를 다시 둘 수 없습니다. 이 능력이 그 턴의 수를 대신합니다.',
      cooldown: 0,
      uses: -1,
      cost: 5,
      endsTurn: true,
      ready: (state, color) => {
        const rewind = state.rewind;
        if (!rewind || rewind.by === color) return '되돌릴 상대의 수가 없습니다.';
        return null;
      },
      apply(state, color) {
        const rewind = state.rewind!;
        state.board = rewind.board.map((piece) => (piece ? { ...piece } : null));
        state.epSquare = rewind.epSquare;
        state.players[rewind.by] = { ...rewind.moverState, abilities: { ...rewind.moverState.abilities } };
        state.players[color].lost = rewind.victimLost.slice();
        state.bannedMove = { from: rewind.move.from, to: rewind.move.to, color: rewind.by };
        state.rewind = null;
        return `${toAlgebraic(rewind.move.from)}→${toAlgebraic(rewind.move.to)}을 요격으로 무효화`;
      }
    },
    {
      id: 'watcher.blockade',
      name: '저지선',
      desc: '빈 칸 하나를 지정합니다. 상대는 2턴간 그 칸에 들어갈 수 없습니다. 수로 치지 않습니다.',
      cooldown: 5,
      uses: 2,
      endsTurn: false,
      steps: [squareStep('저지선을 칠 빈 칸', (state) => emptySquares(state))],
      apply(state, color, picked) {
        const square = pickedSquare(picked, 0);
        addEffect(state, {
          kind: 'blockade',
          color: OTHER[color],
          square,
          expiresAtPly: opponentTurns(state, 2),
          label: `저지선: ${toAlgebraic(square)} 진입 불가`
        });
        return `${toAlgebraic(square)}에 저지선`;
      }
    }
  ]
};

const jeonuchi: Job = {
  id: 'jeonuchi',
  name: '전우치',
  tagline: '자리를 바꿔 치고 빠진다',
  passive: {
    name: '축지법',
    desc: '자신의 폰은 첫 이동이 아니어도 두 칸 전진할 수 있습니다. 앙파상 대상이 됩니다.'
  },
  abilities: [
    {
      id: 'jeonuchi.swap',
      name: '둔갑',
      desc: '자신의 기물 두 개(킹 제외)의 자리를 서로 바꿉니다. 수로 치지 않습니다.',
      cooldown: 4,
      uses: 3,
      endsTurn: false,
      steps: [
        squareStep('첫 번째 기물', (state, color) => ownSquares(state, color, (type) => type !== 'k')),
        squareStep('자리를 바꿀 기물', (state, color, picked) => {
          const first = pickedSquare(picked, 0);
          return ownSquares(state, color, (type) => type !== 'k').filter((square) => square !== first);
        })
      ],
      ready: (state, color) =>
        ownSquares(state, color, (type) => type !== 'k').length >= 2 ? null : '바꿀 기물이 둘 이상 필요합니다.',
      apply(state, _color, picked) {
        const a = pickedSquare(picked, 0);
        const b = pickedSquare(picked, 1);
        const first = state.board[a]!;
        const second = state.board[b]!;
        state.board[a] = second;
        state.board[b] = first;
        first.moved = true;
        second.moved = true;
        const promotedA = autoPromote(state, a);
        const promotedB = autoPromote(state, b);
        return `${toAlgebraic(a)}과 ${toAlgebraic(b)}을 둔갑${promotedA || promotedB ? ' · 승격' : ''}`;
      }
    },
    {
      id: 'jeonuchi.vanish',
      name: '신출귀몰',
      desc: '자신의 킹과 다른 자기 기물의 자리를 바꿉니다. 이 능력이 그 턴의 수를 대신합니다.',
      cooldown: 7,
      uses: 1,
      endsTurn: true,
      steps: [
        squareStep('킹과 자리를 바꿀 기물', (state, color) => ownSquares(state, color, (type) => type !== 'k'))
      ],
      ready: (state, color) => (findKing(state.board, color) == null ? '킹이 없습니다.' : null),
      apply(state, color, picked) {
        const kingSquare = findKing(state.board, color)!;
        const target = pickedSquare(picked, 0);
        const king = state.board[kingSquare]!;
        const other = state.board[target]!;
        state.board[kingSquare] = other;
        state.board[target] = king;
        king.moved = true;
        other.moved = true;
        autoPromote(state, kingSquare);
        return `킹이 ${toAlgebraic(target)}로 신출귀몰`;
      }
    }
  ]
};

const werewolf: Job = {
  id: 'werewolf',
  name: '늑대인간',
  tagline: '갈수록 짐승이 된다',
  passive: {
    name: '보름달',
    desc: '자기 턴을 8번 받은 뒤부터, 자신의 폰은 모두 나이트처럼도 움직일 수 있습니다.'
  },
  abilities: [
    {
      id: 'werewolf.fang',
      name: '송곳니',
      desc: '이번 턴에 기물을 잡으면, 잡은 칸과 직교로 맞닿은 상대 폰 하나도 함께 지웁니다. 수로 치지 않습니다.',
      cooldown: 4,
      uses: 2,
      endsTurn: false,
      ready: (state) => (state.fangArmed ? '이미 송곳니를 세웠습니다.' : null),
      apply(state) {
        state.fangArmed = true;
        return '송곳니를 세움 — 이번 잡기에 곁의 폰도 함께';
      }
    },
    {
      id: 'werewolf.howl',
      name: '울부짖음',
      desc: '상대 킹과 맞닿은 상대 기물들은 다음 상대 턴 동안 움직일 수 없습니다. 수로 치지 않습니다.',
      cooldown: 6,
      uses: 1,
      endsTurn: false,
      ready: (state, color) => {
        const enemyKing = findKing(state.board, OTHER[color]);
        if (enemyKing == null) return '상대 킹이 없습니다.';
        return null;
      },
      apply(state, color) {
        const enemy = OTHER[color];
        const enemyKing = findKing(state.board, enemy)!;
        let count = 0;
        for (const square of kingNeighbourhood(enemyKing)) {
          const piece = state.board[square];
          if (!piece || piece.color !== enemy || piece.type === 'k') continue;
          addEffect(state, {
            kind: 'frozen',
            color: enemy,
            pieceId: piece.id,
            expiresAtPly: opponentTurns(state, 1),
            label: `울부짖음: ${PIECE_NAME_KO[piece.type]}(${toAlgebraic(square)}) 이동 불가`
          });
          count += 1;
        }
        return count ? `울부짖음으로 상대 기물 ${count}개를 얼림` : '울부짖었지만 킹 곁에 아무도 없었다';
      }
    }
  ]
};

const knightJob: Job = {
  id: 'knight',
  name: '나이트',
  tagline: '한 번 물면 한 번 더 뛴다',
  passive: {
    name: '기사도',
    desc: '자신의 나이트가 기물을 잡으면, 그 나이트로 곧바로 한 번 더 움직입니다. 추가 이동으로는 잡을 수 없습니다.'
  },
  abilities: [
    {
      id: 'knight.charge',
      name: '돌격',
      desc: '자신의 나이트 하나를 나이트 이동 두 번 거리로 보냅니다. 상대 기물이 있으면 잡습니다. 이 능력이 그 턴의 수를 대신합니다.',
      cooldown: 5,
      uses: 2,
      endsTurn: true,
      steps: [
        squareStep('돌격할 나이트', (state, color) => ownSquares(state, color, (type) => type === 'n')),
        squareStep('도착할 칸', (state, color, picked) => {
          const from = pickedSquare(picked, 0);
          return doubleKnightSquares(from).filter((square) => {
            const piece = state.board[square];
            if (!piece) return true;
            if (piece.color === color) return false;
            if (piece.type === 'k') return false;
            return !isPieceInvulnerable(state, piece.id);
          });
        })
      ],
      ready: (state, color) =>
        ownSquares(state, color, (type) => type === 'n').length ? null : '돌격할 나이트가 없습니다.',
      apply(state, color, picked) {
        const from = pickedSquare(picked, 0);
        const to = pickedSquare(picked, 1);
        const victim = state.board[to] ? nameAt(state, to) : '';
        if (state.board[to]) removePieceAt(state, to, color);
        movePieceWithin(state, from, to);
        return victim
          ? `나이트가 ${toAlgebraic(to)}로 돌격해 ${victim}을 잡음`
          : `나이트가 ${toAlgebraic(from)}에서 ${toAlgebraic(to)}로 돌격`;
      }
    },
    {
      id: 'knight.guard',
      name: '수호',
      desc: '자신의 기물 하나(킹 제외)는 2턴간 잡히지 않습니다. 수로 치지 않습니다.',
      cooldown: 6,
      uses: 1,
      endsTurn: false,
      steps: [squareStep('수호할 자기 기물', (state, color) => ownSquares(state, color, (type) => type !== 'k'))],
      ready: (state, color) =>
        ownSquares(state, color, (type) => type !== 'k').length ? null : '수호할 기물이 없습니다.',
      apply(state, color, picked) {
        const square = pickedSquare(picked, 0);
        const piece = state.board[square]!;
        addEffect(state, {
          kind: 'invulnerable',
          color,
          pieceId: piece.id,
          expiresAtPly: opponentTurns(state, 2),
          label: `수호: ${PIECE_NAME_KO[piece.type]}(${toAlgebraic(square)}) 잡히지 않음`
        });
        return `${nameAt(state, square)}을 수호`;
      }
    }
  ]
};

export const JOBS: Job[] = [
  hacker,
  shifter,
  reaper,
  wizard,
  engineer,
  collector,
  watcher,
  jeonuchi,
  werewolf,
  knightJob
];

export const JOB_BY_ID: Record<string, Job> = Object.fromEntries(JOBS.map((job) => [job.id, job]));

export function abilityById(id: string): Ability | null {
  for (const job of JOBS) {
    const found = job.abilities.find((ability) => ability.id === id);
    if (found) return found;
  }
  return null;
}

export function jobOf(state: GameState, color: Color): Job | null {
  const id = state.players[color].jobId;
  return id ? JOB_BY_ID[id] ?? null : null;
}

/**
 * 늑대인간 〈송곳니〉 — 잡은 칸과 직교로 맞닿은 상대 폰 하나를 함께 지운다.
 * 후보가 여럿이면 칸 번호가 작은 쪽(a1 에 가까운 쪽)을 문다.
 */
export function resolveFang(state: GameState, color: Color, at: Square): void {
  if (!state.fangArmed) return;
  state.fangArmed = false;
  const enemy = OTHER[color];
  const neighbours = [at - 8, at + 8, at - 1, at + 1].filter((square) => {
    if (square < 0 || square > 63) return false;
    if (Math.abs(fileOf(square) - fileOf(at)) > 1) return false;
    const piece = state.board[square];
    return !!piece && piece.color === enemy && piece.type === 'p' && !isPieceInvulnerable(state, piece.id);
  });
  const target = neighbours.sort((a, b) => a - b)[0];
  if (target == null) {
    pushLog(state, color, 'ability', '송곳니가 빗나갔다 — 곁에 상대 폰이 없었다');
    return;
  }
  const label = nameAt(state, target);
  removePieceAt(state, target, color);
  pushLog(state, color, 'ability', `송곳니로 ${label}을 함께 물어뜯음`);
}
