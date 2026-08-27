'use client';

import { PIECE_NAME_KO } from '@/lib/chess/board';
import type { Color, PieceType } from '@/lib/chess/types';
import { abilityStatuses } from '@/lib/rule/engine';
import { activeEffectLabels } from '@/lib/rule/effects';
import { JOB_BY_ID } from '@/lib/rule/jobs';
import type { GameState } from '@/lib/rule/types';

const SOLID: Record<PieceType, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };

interface Props {
  game: GameState;
  color: Color;
  armedAbility: string | null;
  stashPickable: boolean;
  onUseAbility(abilityId: string): void;
  onPickStash(index: number): void;
}

export default function PlayerPanel({
  game,
  color,
  armedAbility,
  stashPickable,
  onUseAbility,
  onPickStash
}: Props) {
  const player = game.players[color];
  const job = player.jobId ? JOB_BY_ID[player.jobId] : null;
  const active = game.phase === 'playing' && game.turn === color;
  const statuses = abilityStatuses(game, color);
  const effects = activeEffectLabels(game, color);

  return (
    <div className={`player${active ? ' active' : ''}`}>
      <div className="top">
        <span className={`chip ${color}`} />
        <span className="who">{player.name}</span>
        <span className="job">{job ? `${job.name} · ${job.passive.name}` : '직업 미정'}</span>
      </div>

      {job?.resource ? (
        <div className="meter">
          {job.resource.name} <b>{player.resource}</b> / {job.resource.max}
        </div>
      ) : null}

      {statuses.map(({ ability, slot, usable, reason }) => (
        <button
          key={ability.id}
          type="button"
          className={`ability-btn${armedAbility === ability.id ? ' armed' : ''}`}
          disabled={!usable && armedAbility !== ability.id}
          onClick={() => onUseAbility(ability.id)}
        >
          <span className="line1">
            <b>〈{ability.name}〉</b>
            <span className="cost">
              {ability.cost ? `${job?.resource?.name ?? '자원'} ${ability.cost} · ` : ''}
              {slot.uses < 0 ? '무제한' : `${slot.uses}회 남음`}
              {ability.cooldown ? ` · 쿨 ${ability.cooldown}` : ''}
              {ability.endsTurn ? ' · 턴 소모' : ''}
            </span>
          </span>
          <span className="why">{usable ? ability.desc : reason}</span>
        </button>
      ))}

      {job?.id === 'collector' ? (
        <div className="stash">
          창고:{' '}
          {player.stash.length === 0 ? (
            '비어 있음'
          ) : (
            player.stash.map((piece, index) => (
              <button
                key={`${piece}-${index}`}
                type="button"
                className={stashPickable ? 'pickable' : ''}
                disabled={!stashPickable}
                onClick={() => onPickStash(index)}
                title={PIECE_NAME_KO[piece]}
              >
                {SOLID[piece]}
              </button>
            ))
          )}
        </div>
      ) : null}

      {effects.length ? (
        <div className="effects">
          {effects.map((label) => (
            <span className="effect" key={label}>
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
