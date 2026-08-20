/**
 * 봇 드래프트 — 봇이 직업을 **언제** 고르는가.
 *
 * 정본은 CPU 직업을 playerStates 에 직접 꽂아 넣는다. 그래서 CPU 는 firstPicker
 * 가 되지 않고, 밴을 해 본 적도 없다. 결과적으로 사람이 항상 선픽이고 봇은 항상
 * 후픽이었다.
 *
 * 원본 규칙(먼저 고른 쪽이 밴 권한을 갖는다)을 그대로 두고, 봇이 그 자리에 설 수
 * 있게만 해 준다. charynn-arena 의 드래프트와 같은 구도다.
 *
 *   random  아무 직업이나 (밴만 피한다)
 *   pick    방장이 지정한 직업
 *   first   선픽 — 봇이 먼저 고르고 밴 권한을 쓴다.
 *           상대를 모르므로 최악 상대를 가정한 maximin 으로 고른다.
 *   last    후픽 — 사람이 고를 때까지 기다렸다가 대응한다.
 *           상대 직업을 알므로 best-response 로 고른다.
 *
 * first / last 의 "무엇을 고를까"는 엔진의 chooseRecommendedJobForPlayer 가
 * 이미 두 갈래로 처리한다 — 상대 직업을 알면 best-response, 모르면 maximin.
 * 그래서 여기서는 타이밍만 통제하면 된다.
 */

export const DRAFT_MODES = ['random', 'pick', 'first', 'last'];

export const DRAFT_LABEL = {
  random: '랜덤',
  pick: '지정',
  first: '선픽',
  last: '후픽'
};

export function normalizeDraftMode(value) {
  const raw = String(value || '').trim();
  if (DRAFT_MODES.includes(raw)) return raw;
  if (raw === '선픽') return 'first';
  if (raw === '후픽') return 'last';
  if (raw === '지정') return 'pick';
  return 'random';
}

/**
 * 선픽 봇이 지금 직업을 골라야 하는가.
 * 아직 아무도 안 골랐고, 봇이 직업이 없고, 밴 단계도 아직 아닐 때.
 */
export function shouldBotPickFirst(game, cpuName) {
  if (!game || !cpuName) return false;
  if (game.phase !== 'job_selection') return false;
  if (game.firstPicker) return false;
  if (game.banPhase) return false;
  return !game.playerStates?.[cpuName];
}

/** 선픽한 봇이 지금 밴을 내야 하는가. */
export function shouldBotBan(game, cpuName) {
  if (!game || !cpuName) return false;
  if (game.phase !== 'job_selection') return false;
  return game.banPhase === true && game.firstPicker === cpuName;
}

/**
 * 선픽 봇이 고를 직업. 상대를 모르는 국면이라 엔진의 maximin 경로를 탄다.
 * preferred 가 선택 가능하면 그것을 쓴다(지정 모드와 겸용).
 */
export function chooseFirstPickJob(scope, game, cpuName, preferred = '') {
  const all = scope?.ALL_JOBS || [];
  const banned = game?.bannedJobs || [];
  const taken = Object.values(game?.playerStates || {}).map((s) => s?.job).filter(Boolean);
  const pool = all.filter((j) => !banned.includes(j) && !taken.includes(j));
  if (!pool.length) return '';

  const want = String(preferred || '').trim();
  if (want && pool.includes(want)) return want;

  try {
    const picked = scope.chooseRecommendedJobForPlayer?.(game, cpuName, pool, null);
    if (picked && pool.includes(picked)) return picked;
  } catch {}
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 선픽 봇이 낼 밴 목록. 내 직업을 가장 잘 잡는 순서로 지운다.
 * (arena 의 chooseBans 와 같은 기준)
 */
export function chooseBans(scope, game, cpuName, limit = 6) {
  const selfJob = game?.playerStates?.[cpuName]?.job;
  if (!selfJob) return [];
  const all = scope?.ALL_JOBS || [];
  const taken = Object.values(game?.playerStates || {}).map((s) => s?.job).filter(Boolean);
  const pool = all.filter((j) => j !== selfJob && !taken.includes(j));
  if (!pool.length) return [];

  try {
    const bans = scope.recommendBansForJob?.(game, selfJob, pool, limit);
    if (Array.isArray(bans) && bans.length) return bans.slice(0, limit);
  } catch {}
  return [];
}
