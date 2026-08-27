'use client';

import { useMemo, useState } from 'react';
import { findKing } from '@/lib/chess/board';
import type { Color, PieceType, Square } from '@/lib/chess/types';
import {
  abilityOptions,
  abilityStepPrompt,
  availableJobs,
  createGame,
  movesFromSquare,
  pickJob,
  resign,
  submitBans,
  submitMove,
  useAbility
} from '@/lib/rule/engine';
import { JOBS, abilityById } from '@/lib/rule/jobs';
import { isInCheck } from '@/lib/rule/moves';
import type { GameState, TargetPick } from '@/lib/rule/types';
import BoardView from './BoardView';
import JobCard from './JobCard';
import PlayerPanel from './PlayerPanel';

const PROMO_GLYPH: Record<string, string> = { q: '♛', r: '♜', b: '♝', n: '♞' };

/** 받침 유무에 따라 을/를 을 고른다. 안내문이 어색해지지 않게. */
function withObjectParticle(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return `${word}을`;
  return (last - 0xac00) % 28 === 0 ? `${word}를` : `${word}을`;
}

export default function GameClient() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [selected, setSelected] = useState<Square | null>(null);
  const [armed, setArmed] = useState<{ id: string; picks: TargetPick[] } | null>(null);
  const [promo, setPromo] = useState<{ from: Square; to: Square; options: PieceType[] } | null>(null);
  const [notice, setNotice] = useState<{ text: string; kind: 'error' | 'info' } | null>(null);
  const [bans, setBans] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);

  const turn = game.turn;
  const options = useMemo(
    () => (armed ? abilityOptions(game, turn, armed.id, armed.picks) : []),
    [armed, game, turn]
  );
  const abilityTargets = options.filter((pick) => pick.kind === 'square').map((pick) => pick.square);
  const stashStepActive = options.some((pick) => pick.kind === 'stash');

  const moveTargets = useMemo(() => {
    if (armed || selected == null || game.phase !== 'playing') return [];
    return [...new Set(movesFromSquare(game, selected).map((move) => move.to))];
  }, [armed, game, selected]);

  const checkSquare = useMemo(() => {
    if (game.phase !== 'playing') return null;
    return isInCheck(game, turn) ? findKing(game.board, turn) : null;
  }, [game, turn]);

  const marked = useMemo(
    () => game.effects.filter((fx) => fx.kind === 'blockade' && fx.square != null).map((fx) => fx.square as Square),
    [game.effects]
  );

  function resetGame(): void {
    setGame(createGame(game.players.w.name, game.players.b.name));
    setSelected(null);
    setArmed(null);
    setPromo(null);
    setNotice(null);
    setBans([]);
  }

  function rename(color: Color, value: string): void {
    setGame((current) => {
      const next = structuredClone(current);
      next.players[color].name = value;
      return next;
    });
  }

  function runAbility(id: string, picks: TargetPick[]): void {
    const outcome = useAbility(game, turn, id, picks);
    if (outcome.error) {
      setNotice({ text: outcome.error, kind: 'error' });
    } else {
      setGame(outcome.state);
      setNotice(null);
    }
    setArmed(null);
    setSelected(null);
  }

  function armAbility(id: string): void {
    if (armed?.id === id) {
      setArmed(null);
      return;
    }
    const ability = abilityById(id);
    if (!ability) return;
    if (!ability.steps?.length) {
      runAbility(id, []);
      return;
    }
    setArmed({ id, picks: [] });
    setSelected(null);
    setNotice({ text: `${ability.name}: ${withObjectParticle(abilityStepPrompt(id, 0))} 고르세요.`, kind: 'info' });
  }

  function pushPick(pick: TargetPick): void {
    if (!armed) return;
    const ability = abilityById(armed.id);
    if (!ability) return;
    const picks = [...armed.picks, pick];
    if (picks.length === (ability.steps?.length ?? 0)) {
      runAbility(armed.id, picks);
      return;
    }
    setArmed({ ...armed, picks });
    setNotice({
      text: `${ability.name}: ${withObjectParticle(abilityStepPrompt(armed.id, picks.length))} 고르세요.`,
      kind: 'info'
    });
  }

  function onSquare(square: Square): void {
    if (armed) {
      const match = options.find((pick) => pick.kind === 'square' && pick.square === square);
      if (match) pushPick(match);
      return;
    }
    if (game.phase !== 'playing') return;

    if (selected != null) {
      const moves = movesFromSquare(game, selected).filter((move) => move.to === square);
      if (moves.length) {
        const promotions = moves.map((move) => move.promotion).filter(Boolean) as PieceType[];
        if (promotions.length > 1) {
          setPromo({ from: selected, to: square, options: promotions });
          return;
        }
        setGame(submitMove(game, selected, square, promotions[0]));
        setSelected(null);
        setNotice(null);
        return;
      }
    }
    const piece = game.board[square];
    setSelected(piece && piece.color === turn ? square : null);
  }

  function choosePromotion(type: PieceType): void {
    if (!promo) return;
    setGame(submitMove(game, promo.from, promo.to, type));
    setPromo(null);
    setSelected(null);
    setNotice(null);
  }

  const orientation: Color = flipped ? 'b' : 'w';

  return (
    <div className="shell">
      <header className="masthead">
        <h1>
          채린룰 <span className="accent">체스</span>
        </h1>
        <p>직업을 고르고, 밴하고, 능력을 쓰면서 두는 체스</p>
      </header>

      {game.phase === 'draft' ? (
        <DraftView
          game={game}
          bans={bans}
          setBans={setBans}
          onRename={rename}
          onPick={(jobId) => setGame(pickJob(game, jobId))}
          onConfirmBans={() => {
            setGame(submitBans(game, bans));
            setBans([]);
          }}
        />
      ) : (
        <>
          {game.result ? (
            <div className="banner">
              <b>
                {game.result.winner
                  ? `${game.players[game.result.winner].name}(${game.result.winner === 'w' ? '백' : '흑'}) 승리`
                  : '무승부'}
              </b>{' '}
              — {game.result.reason}
              <div className="row" style={{ marginTop: 10 }}>
                <button type="button" className="btn primary" onClick={resetGame}>
                  새 대국
                </button>
              </div>
            </div>
          ) : null}

          <div className="play">
            <div className="board-wrap">
              <div className="row" style={{ marginBottom: 10 }}>
                <strong>
                  {game.phase === 'playing'
                    ? `${game.players[turn].name}(${turn === 'w' ? '백' : '흑'}) 차례`
                    : '대국 종료'}
                </strong>
                {game.pendingExtra ? <span className="tag">{game.pendingExtra.label} 추가 이동</span> : null}
                {checkSquare != null ? <span className="tag turn">체크</span> : null}
                <span className="spacer" />
                <button type="button" className="btn ghost" onClick={() => setFlipped((value) => !value)}>
                  판 뒤집기
                </button>
              </div>

              <BoardView
                board={game.board}
                orientation={orientation}
                selected={selected}
                moveTargets={moveTargets}
                abilityTargets={abilityTargets}
                checkSquare={checkSquare}
                marked={marked}
                onSquare={onSquare}
              />

              {notice ? <div className={`notice${notice.kind === 'info' ? ' info' : ''}`}>{notice.text}</div> : null}

              <div className="row" style={{ marginTop: 12 }}>
                {armed ? (
                  <button type="button" className="btn ghost" onClick={() => { setArmed(null); setNotice(null); }}>
                    능력 취소
                  </button>
                ) : null}
                {game.phase === 'playing' ? (
                  <button type="button" className="btn ghost" onClick={() => setGame(resign(game, turn))}>
                    기권
                  </button>
                ) : null}
                <span className="spacer" />
                <button type="button" className="btn ghost" onClick={resetGame}>
                  처음부터
                </button>
              </div>
            </div>

            <div>
              {(['b', 'w'] as Color[]).map((color) => (
                <PlayerPanel
                  key={color}
                  game={game}
                  color={color}
                  armedAbility={turn === color ? armed?.id ?? null : null}
                  stashPickable={turn === color && stashStepActive}
                  onUseAbility={armAbility}
                  onPickStash={(index) => {
                    const pick = options.find((item) => item.kind === 'stash' && item.index === index);
                    if (pick) pushPick(pick);
                  }}
                />
              ))}

              <div className="card" style={{ marginTop: 14 }}>
                <h2>기보</h2>
                <div className="log">
                  {game.log
                    .slice()
                    .reverse()
                    .map((entry) => (
                      <div className={`entry ${entry.kind}`} key={entry.id}>
                        {entry.text}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {promo ? (
        <div className="modal">
          <div className="box">
            <h2 style={{ margin: 0 }}>무엇으로 승격할까요?</h2>
            <div className="choices">
              {promo.options.map((type) => (
                <button key={type} type="button" onClick={() => choosePromotion(type)}>
                  {PROMO_GLYPH[type]}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface DraftProps {
  game: GameState;
  bans: string[];
  setBans(value: string[]): void;
  onRename(color: Color, value: string): void;
  onPick(jobId: string): void;
  onConfirmBans(): void;
}

function DraftView({ game, bans, setBans, onRename, onPick, onConfirmBans }: DraftProps) {
  const draft = game.draft;
  const first = draft.firstPicker;
  const second: Color = first === 'w' ? 'b' : 'w';
  const open = availableJobs(game);
  const picker = draft.step === 'ban' ? first : draft.step === 'pick-first' ? first : second;
  const pickerName = `${game.players[picker].name}(${picker === 'w' ? '백' : '흑'})`;

  return (
    <>
      {draft.step === 'pick-first' ? (
        <div className="card">
          <h2>플레이어</h2>
          <p className="sub">한 화면에서 번갈아 두는 대국입니다. 이름을 정하세요.</p>
          <div className="names">
            <div className="field">
              <label htmlFor="name-w">백</label>
              <input id="name-w" value={game.players.w.name} onChange={(event) => onRename('w', event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="name-b">흑</label>
              <input id="name-b" value={game.players.b.name} onChange={(event) => onRename('b', event.target.value)} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <h2>
          {draft.step === 'pick-first'
            ? `${pickerName}의 직업 선택`
            : draft.step === 'ban'
              ? `${pickerName}의 밴 — 최대 ${draft.maxBans}개`
              : `${pickerName}의 직업 선택`}
        </h2>
        <p className="sub">
          {draft.step === 'ban'
            ? '상대가 고를 수 없게 만들 직업을 고르세요. 밴 없이 넘어가도 됩니다.'
            : '채린룰과 같이 백이 먼저 두는 대신, 직업은 흑이 먼저 고르고 백의 직업을 밴합니다.'}
        </p>

        {draft.step === 'ban' ? (
          <div className="row" style={{ marginBottom: 12 }}>
            <span className="tag">고른 밴 {bans.length}/{draft.maxBans}</span>
            <button type="button" className="btn primary" onClick={onConfirmBans}>
              밴 확정
            </button>
          </div>
        ) : null}

        <div className="job-grid">
          {JOBS.map((job) => {
            const taken = job.id === game.players[first].jobId || job.id === game.players[second].jobId;
            const banned = draft.banned.includes(job.id);
            if (draft.step === 'ban') {
              return (
                <JobCard
                  key={job.id}
                  job={job}
                  selected={bans.includes(job.id)}
                  disabled={taken}
                  onClick={() =>
                    setBans(
                      bans.includes(job.id)
                        ? bans.filter((id) => id !== job.id)
                        : bans.length >= draft.maxBans
                          ? bans
                          : [...bans, job.id]
                    )
                  }
                />
              );
            }
            return (
              <JobCard
                key={job.id}
                job={job}
                disabled={!open.includes(job.id)}
                selected={taken && !banned}
                onClick={() => onPick(job.id)}
              />
            );
          })}
        </div>
      </div>

      <div className="card">
        <h2>규칙 요약</h2>
        <div className="rules">
          <b>체스 규칙은 그대로입니다.</b> 캐슬링·앙파상·승격·체크메이트·스테일메이트가 모두 정상 동작합니다.
          <br />
          <b>능력은 한 턴에 하나만.</b> 〈턴 소모〉 표시가 있는 능력은 그 턴의 수를 대신하고, 나머지는 능력을 쓴 뒤에도
          한 수를 둡니다.
          <br />
          <b>킹은 능력의 표적이 되지 않습니다.</b> 능력만으로 판을 끝낼 수는 없습니다.
          <br />
          <b>능력에 묶여 둘 수 있는 수가 없으면</b> 체크메이트가 아니라 그 턴을 넘깁니다.
        </div>
      </div>
    </>
  );
}
