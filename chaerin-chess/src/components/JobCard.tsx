'use client';

import type { Job } from '@/lib/rule/types';

/** 자세한 설명은 카드 밖으로 뺐다. 마우스를 올리면 title 로 그대로 볼 수 있다. */
function fullText(job: Job): string {
  const lines = [`${job.name} — ${job.tagline}`, `[패시브] ${job.passive.name}: ${job.passive.desc}`];
  for (const ability of job.abilities) {
    const meta = [
      ability.cost ? `${job.resource?.name ?? '자원'} ${ability.cost}` : null,
      ability.cooldown ? `쿨 ${ability.cooldown}` : null,
      ability.uses > 0 ? `${ability.uses}회` : null,
      ability.endsTurn ? '턴 소모' : null
    ]
      .filter(Boolean)
      .join(' · ');
    lines.push(`[${meta}] ${ability.name}: ${ability.desc}`);
  }
  return lines.join('\n\n');
}

interface Props {
  job: Job;
  disabled?: boolean;
  on?: boolean;
  onClick?(): void;
}

export default function JobCard({ job, disabled, on, onClick }: Props) {
  return (
    <button
      type="button"
      className={`job${on ? ' on' : ''}`}
      disabled={disabled}
      onClick={onClick}
      title={fullText(job)}
    >
      <span className="n">{job.name}</span>
      <span className="t">{job.tagline}</span>
      <span className="a">
        {job.passive.name} · {job.abilities.map((ability) => ability.name).join(' · ')}
      </span>
    </button>
  );
}
