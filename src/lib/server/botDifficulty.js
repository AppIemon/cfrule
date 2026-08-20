/**
 * 봇 난이도.
 *
 * 두 갈래로 노출한다.
 *   · 이름 프리셋  쉬움 / 보통 / 어려움 / 지옥 — 기본값. 고르기 쉽다.
 *   · D1~D20      깊이를 직접 지정. 정본의 독립 엔진 대전과 같은 눈금이다.
 *
 * 둘 다 결국 같은 노브 묶음으로 내려간다. 정본 엔진은 난이도를
 * `CROSS_CPU_LEVELS[이름]` 으로만 찾으므로, D 를 고르면 그 이름의 항목을
 * 엔진 테이블에 만들어 넣는다. 그러면 정본의 끝말잇기 수읽기와
 * jobSearch 의 직업 모드 수읽기가 **같은 난이도를 자동으로 함께** 쓴다.
 *
 * 노브의 뜻 (정본 주석과 동일)
 *   maxLen     아는 단어의 최대 길이
 *   endDiff    다룰 수 있는 끝음절 난이도 상한 (0 매우쉬움 ~ 4 매우어려움)
 *   atkDiff    공격단어인 줄 아는 음절 난이도 상한. -1 이면 공격 개념이 없다
 *   atkMaxLen  공격단어로 알아보는 단어의 최대 길이
 *   routeDiff  루트단어인 줄 아는 난이도 상한. -1 이면 루트 개념이 없다
 *   depth      수읽기 깊이. 2 미만이면 탐색을 안 한다
 *   budget     한 수에 볼 노드 상한
 *   width      각 노드에서 읽을 후보 수
 *   timeMs     한 수 시간 상한 (cfrule 추가 — 웹은 턴이 멈추면 안 된다)
 */

export const PRESET_ORDER = ['쉬움', '보통', '어려움', '지옥'];

/** 정본 CROSS_CPU_LEVELS 와 같은 값 + 웹용 timeMs. */
export const PRESETS = {
  쉬움:   { maxLen: 3,  endDiff: 0, atkDiff: -1, atkMaxLen: 0,  routeDiff: -1, depth: 1, syl: true, budget: 200,  width: 4, routePick: 'any',           timeMs: 250 },
  보통:   { maxLen: 3,  endDiff: 1, atkDiff: 1,  atkMaxLen: 2,  routeDiff: -1, depth: 1, syl: true, budget: 400,  width: 5, routePick: 'any',           timeMs: 400 },
  어려움: { maxLen: 4,  endDiff: 3, atkDiff: 3,  atkMaxLen: 4,  routeDiff: 1,  depth: 3, syl: true, budget: 900,  width: 7, routePick: 'best',          timeMs: 700 },
  지옥:   { maxLen: 99, endDiff: 4, atkDiff: 4,  atkMaxLen: 99, routeDiff: 4,  depth: 5, syl: true, budget: 1600, width: 9, routePick: 'randomNoCycle', timeMs: 1100 }
};

export const MIN_DEPTH = 1;
export const MAX_DEPTH = 20;

/**
 * 이름 프리셋이 실제로 쓰는 깊이 — 고급 슬라이더의 시작점.
 * 쉬움과 보통이 같은 깊이인 것은 의도다. 둘은 읽는 깊이가 아니라
 * "아는 단어와 음절"이 다르다 (maxLen / atkDiff).
 * 지옥이 D5 인 것도 사실대로다 — D20 은 프리셋보다 더 깊게 읽는다.
 */
export const PRESET_DEPTH = { 쉬움: 1, 보통: 1, 어려움: 3, 지옥: 5 };

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * D 값 하나에서 노브 묶음을 만든다.
 *
 * 낮은 D 는 "계산을 덜 하는 봇"이 아니라 **아는 게 적은 봇**이어야 한다.
 * 그래서 깊이만 올리는 게 아니라 단어 길이·음절 난이도 상한을 함께 연다.
 * 그렇지 않으면 D1 도 한방단어를 척척 찾아내 약하게 느껴지지 않는다.
 */
export function depthProfile(depth) {
  const d = clamp(Math.round(Number(depth) || 1), MIN_DEPTH, MAX_DEPTH);
  const t = (d - 1) / (MAX_DEPTH - 1); // 0 ~ 1

  return {
    depth: d,
    maxLen: d <= 2 ? 3 : d <= 4 ? 4 : d <= 7 ? 5 : 99,
    endDiff: d <= 1 ? 0 : d <= 2 ? 1 : d <= 4 ? 2 : d <= 6 ? 3 : 4,
    atkDiff: d <= 1 ? -1 : d <= 3 ? 1 : d <= 5 ? 3 : 4,
    atkMaxLen: d <= 1 ? 0 : d <= 2 ? 2 : d <= 4 ? 4 : 99,
    routeDiff: d <= 2 ? -1 : d <= 5 ? 1 : 4,
    syl: true,
    routePick: d <= 3 ? 'any' : d <= 7 ? 'best' : 'randomNoCycle',
    // 깊이가 오르면 폭과 예산도 따라 올라야 그 깊이가 의미를 갖는다.
    width: Math.round(4 + t * 10),
    budget: Math.round(200 + t * 5000),
    // 웹 턴이 멈추지 않게 시간 상한을 둔다. 깊이가 깊어도 여기서 끊긴다.
    timeMs: Math.round(250 + t * 2250)
  };
}

/** 'D8' · 'd8' · 8 · '8' 을 깊이 숫자로. 아니면 null. */
export function parseDepthLevel(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  const m = raw.match(/^[Dd]\s*(\d{1,2})$/) || raw.match(/^(\d{1,2})$/);
  if (!m) return null;
  const d = Number(m[1]);
  if (!Number.isFinite(d) || d < MIN_DEPTH || d > MAX_DEPTH) return null;
  return d;
}

/**
 * 사용자가 고른 값을 { name, knobs } 로 정규화한다.
 * name 은 엔진 테이블의 키로 쓰이므로 D 모드면 'D8' 같은 이름이 된다.
 */
export function resolveDifficulty(value) {
  const raw = String(value ?? '').trim();
  if (PRESETS[raw]) return { name: raw, knobs: PRESETS[raw], depth: PRESET_DEPTH[raw] };

  const d = parseDepthLevel(raw);
  if (d != null) return { name: `D${d}`, knobs: depthProfile(d), depth: d };

  return { name: '보통', knobs: PRESETS['보통'], depth: PRESET_DEPTH['보통'] };
}

/** 고를 수 있는 값인가 (API 검증용). */
export function isValidDifficulty(value) {
  const raw = String(value ?? '').trim();
  return !!PRESETS[raw] || parseDepthLevel(raw) != null;
}

/**
 * 엔진 테이블에 이 난이도를 보장한다. D 항목은 없으면 만들어 넣는다.
 * 이렇게 해야 정본의 crossCpuPickWord 와 jobSearch 가 같은 값을 본다.
 */
export function ensureEngineLevel(scope, value) {
  const resolved = resolveDifficulty(value);
  if (!scope) return resolved;

  const table = scope.CROSS_CPU_LEVELS;
  if (table && !table[resolved.name]) table[resolved.name] = { ...resolved.knobs };
  else if (table && resolved.name.startsWith('D')) Object.assign(table[resolved.name], resolved.knobs);

  // 프리셋에도 timeMs 를 얹는다 (정본 테이블에는 없는 cfrule 전용 노브).
  if (table && PRESETS[resolved.name] && table[resolved.name] && table[resolved.name].timeMs == null) {
    table[resolved.name].timeMs = PRESETS[resolved.name].timeMs;
  }
  return resolved;
}

/** UI/도움말용 라벨. */
export function difficultyLabel(value) {
  const { name, depth } = resolveDifficulty(value);
  return PRESETS[name] ? `${name} (D${depth} 상당)` : `${name} · 깊이 ${depth}`;
}
