'use client';

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
  const effects = activeEffectLabels(game, color);

  return (
    <div className={`player${active ? ' on' : ''}`}>
      <div className="head">
        <span className="name">{player.name}</span>
        <span className="role">{job?.name ?? '직업 미정'}</span>
        {job?.resource ? (
          <span className="res">
            {job.resource.name} {player.resource}
          </span>
        ) : null}
      </div>

      {abilityStatuses(game, color).map(({ ability, slot, usable, reason }) => (
        <button
          key={ability.id}
          type="button"
          className={`abil${armedAbility === ability.id ? ' on' : ''}`}
          disabled={!usable && armedAbility !== ability.id}
          onClick={() => onUseAbility(ability.id)}
          title={ability.desc}
        >
          <span className="t">{ability.name}</span>
          <span className="m">
            {ability.cost ? `${job?.resource?.name ?? ''} ${ability.cost} · ` : ''}
            {slot.uses < 0 ? '무제한' : `${slot.uses}회`}
            {ability.endsTurn ? ' · 턴 소모' : ''}
          </span>
          {/* 설명은 자기 차례일 때만. 나머지 시간엔 이름만 남아 조용하다. */}
          {active ? <span className="d">{usable ? ability.desc : reason}</span> : null}
        </button>
      ))}

      {job?.id === 'collector' && player.stash.length ? (
        <div className="stash">
          창고{' '}
          {player.stash.map((piece, index) => (
            <button
              key={`${piece}-${index}`}
              type="button"
              className={stashPickable ? 'pick' : ''}
              disabled={!stashPickable}
              onClick={() => onPickStash(index)}
            >
              {SOLID[piece]}
            </button>
          ))}
        </div>
      ) : null}

      {effects.length ? <div className="fxlist">{effects.join(' · ')}</div> : null}
    </div>
  );
}
