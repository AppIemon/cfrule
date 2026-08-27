'use client';

import type { Job } from '@/lib/rule/types';

interface Props {
  job: Job;
  disabled?: boolean;
  selected?: boolean;
  onClick?(): void;
}

export default function JobCard({ job, disabled, selected, onClick }: Props) {
  return (
    <button
      type="button"
      className={`job-card${selected ? ' selected' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="head">
        <span className="name">{job.name}</span>
        <span className="tagline">{job.tagline}</span>
      </span>
      <span className="ability-line">
        <span className="tag passive">패시브</span>
        <b>{job.passive.name}</b> — {job.passive.desc}
      </span>
      {job.abilities.map((ability) => (
        <span className="ability-line" key={ability.id}>
          {ability.endsTurn ? <span className="tag turn">턴 소모</span> : <span className="tag">수로 안 침</span>}
          <b>{ability.name}</b>
          {ability.cost ? ` (${job.resource?.name ?? '자원'} ${ability.cost})` : ''}
          {ability.cooldown ? ` · 쿨 ${ability.cooldown}` : ''}
          {ability.uses > 0 ? ` · ${ability.uses}회` : ''} — {ability.desc}
        </span>
      ))}
    </button>
  );
}
