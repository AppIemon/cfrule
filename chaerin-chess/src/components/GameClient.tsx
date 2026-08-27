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
  const [hint, setHint] = useState<{ text: string; bad: boolean } | null>(null);
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

  const checkSquare = useMemo(
    () => (game.phase === 'playing' && isInCheck(game, turn) ? findKing(game.board, turn) : null),
    [game, turn]
  );

  const blocked = useMemo(
    () => game.effects.filter((fx) => fx.kind === 'blockade' && fx.square != null).map((fx) => fx.square as Square),
    [game.effects]
  );

  function reset(): void {
    setGame(createGame(game.players.w.name, game.players.b.name));
    setSelected(null);
    setArmed(null);
    setPromo(null);
    setHint(null);
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
    if (outcome.error) setHint({ text: outcome.error, bad: true });
    else {
      setGame(outcome.state);
      setHint(null);
    }
    setArmed(null);
    setSelected(null);
  }

  function armAbility(id: string): void {
    if (armed?.id === id) {
      setArmed(null);
      setHint(null);
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
    setHint({ text: `${ability.name} — ${withObjectParticle(abilityStepPrompt(id, 0))} 고르세요.`, bad: false });
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
    setHint({
      text: `${ability.name} — ${withObjectParticle(abilityStepPrompt(armed.id, picks.length))} 고르세요.`,
      bad: false
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
        setHint(null);
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
    setHint(null);
  }

  const draft = game.draft;
  const stepLabel =
    game.phase === 'draft'
      ? draft.step === 'ban'
        ? `${game.players[draft.firstPicker].name} 밴 · 최대 ${draft.maxBans}개`
        : `${game.players[draft.step === 'pick-first' ? draft.firstPicker : draft.firstPicker === 'w' ? 'b' : 'w'].name} 직업 선택`
      : '';

  return (
    <div className="shell">
      <div className="masthead">
        <h1>
          채린룰 <span>체스</span>
        </h1>
        <span className="step">{stepLabel}</span>
      </div>

      {game.phase === 'draft' ? (
        <>
          {draft.step === 'pick-first' ? (
            <div className="names">
              <input value={game.players.w.name} onChange={(event) => rename('w', event.target.value)} aria-label="백 이름" />
              <input value={game.players.b.name} onChange={(event) => rename('b', event.target.value)} aria-label="흑 이름" />
            </div>
          ) : null}

          {draft.step === 'ban' ? (
            <div className="row" style={{ marginBottom: 12 }}>
              <span className="muted">상대가 못 고르게 할 직업 {bans.length}/{draft.maxBans}</span>
              <button type="button" className="solid-btn" onClick={() => { setGame(submitBans(game, bans)); setBans([]); }}>
                {bans.length ? '밴 확정' : '밴 없이 진행'}
              </button>
            </div>
          ) : null}

          <div className="job-grid">
            {JOBS.map((job) => {
              const open = availableJobs(game).includes(job.id);
              const banning = draft.step === 'ban';
              return (
                <JobCard
                  key={job.id}
                  job={job}
                  disabled={!open}
                  on={banning ? bans.includes(job.id) : job.id === game.players[draft.firstPicker].jobId}
                  onClick={() =>
                    banning
                      ? setBans(
                          bans.includes(job.id)
                            ? bans.filter((id) => id !== job.id)
                            : bans.length >= draft.maxBans
                              ? bans
                              : [...bans, job.id]
                        )
                      : setGame(pickJob(game, job.id))
                  }
                />
              );
            })}
          </div>

          <details className="rules">
            <summary>규칙</summary>
            체스 규칙은 그대로입니다. 캐슬링·앙파상·승격·체크메이트·스테일메이트가 모두 동작합니다.
            <br />
            백이 먼저 두는 대신, 직업은 흑이 먼저 고르고 백의 직업을 밴합니다.
            <br />
            능력은 한 턴에 하나. <b>턴 소모</b> 능력은 그 턴의 수를 대신하고, 나머지는 쓴 뒤에도 한 수를 둡니다.
            <br />
            킹은 능력의 표적이 되지 않고, 능력에 묶여 둘 수가 없으면 체크메이트가 아니라 턴을 넘깁니다.
          </details>
        </>
      ) : (
        <>
          {game.result ? (
            <div className="result">
              <span>
                <b>
                  {game.result.winner ? `${game.players[game.result.winner].name} 승리` : '무승부'}
                </b>{' '}
                · {game.result.reason}
              </span>
              <span className="spacer" />
              <button type="button" className="solid-btn" onClick={reset}>
                새 대국
              </button>
            </div>
          ) : null}

          <div className="play">
            <div>
              <div className="turnbar">
                <b>{game.phase === 'playing' ? `${game.players[turn].name} 차례` : '종료'}</b>
                {checkSquare != null ? <span className="pill hot">체크</span> : null}
                {game.pendingExtra ? <span className="pill cool">{game.pendingExtra.label}</span> : null}
                <span className="spacer" />
                <button type="button" className="link-btn" onClick={() => setFlipped((value) => !value)}>
                  뒤집기
                </button>
              </div>

              <BoardView
                board={game.board}
                orientation={flipped ? 'b' : 'w'}
                selected={selected}
                moveTargets={moveTargets}
                abilityTargets={abilityTargets}
                checkSquare={checkSquare}
                blocked={blocked}
                onSquare={onSquare}
              />

              <div className={`hint${hint?.bad ? ' bad' : ''}`}>{hint?.text ?? ''}</div>

              <div className="tools">
                {armed ? (
                  <button type="button" className="link-btn" onClick={() => { setArmed(null); setHint(null); }}>
                    능력 취소
                  </button>
                ) : null}
                {game.phase === 'playing' ? (
                  <button type="button" className="link-btn" onClick={() => setGame(resign(game, turn))}>
                    기권
                  </button>
                ) : null}
                <span className="spacer" />
                <button type="button" className="link-btn" onClick={reset}>
                  처음부터
                </button>
              </div>
            </div>

            <div className="side">
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

              <div className="log">
                {game.log
                  .slice(-8)
                  .reverse()
                  .map((entry) => (
                    <div key={entry.id} className={entry.kind === 'move' ? 'mv' : entry.kind === 'ability' ? 'ab' : ''}>
                      {entry.text}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}

      {promo ? (
        <div className="modal">
          <div className="box">
            <div className="t">무엇으로 승격할까요?</div>
            <div className="opts">
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
