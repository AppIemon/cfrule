/**
 * 모드별 스모크 — 방 생성 → 봇 추가 → 시작 → 몇 수 진행이 끝까지 되는가.
 *
 *   npx vite-node scripts/test-modes.js [모드...]
 *
 * "카드는 봇이 안 둔다", "표한은 시작이 안 된다" 같은 모드별 구멍을 잡는다.
 * 각 모드는 서로 다른 코드 경로를 타므로 하나가 되면 다 된다는 보장이 없다.
 */
import {
  createRoom,
  addRoomBot,
  startRoomGame,
  sendCommand,
  isCpuPlayer
} from '../src/lib/server/gameService.js';

const ALL = [
  { id: 'guerule', label: '채린룰', opts: { gameMode: 'guerule' } },
  { id: 'combat', label: '조합', opts: { gameMode: 'guerule', combat: true } },
  { id: 'card', label: '카드', opts: { gameMode: 'card' } },
  { id: 'pyohan', label: '표한룰', opts: { gameMode: 'pyohan', pyohanLives: 3 } },
  { id: 'kkutu', label: '끄투', opts: { gameMode: 'kkutu', dictSource: 'kkutu' } },
  { id: 'geonmat', label: '검맞', opts: { gameMode: 'geonmat:geonmat', geonmatRounds: 3, playerCount: 2 } }
];

const want = process.argv.slice(2);
const modes = want.length ? ALL.filter((m) => want.includes(m.id)) : ALL;
const failures = [];

function note(label, ok, detail = '') {
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` · ${detail}` : ''}`);
}

let seq = 0;
async function runMode(mode) {
  const me = `모드테스터${++seq}`;
  console.log(`\n── ${mode.label} ──`);

  let snap;
  try {
    snap = await createRoom({ nickname: me, mode: 1, rated: false, ...mode.opts });
  } catch (err) {
    note(`${mode.label}: 방 생성`, false, err.message);
    return;
  }
  const room = snap?.room;
  note(`${mode.label}: 방 생성`, !!room, `room=${room}`);
  if (!room) return;

  try {
    snap = await addRoomBot({ room, nickname: me, cpuLevel: '보통' });
  } catch (err) {
    note(`${mode.label}: 봇 추가`, false, err.message);
    return;
  }
  const cpu = (snap?.game?.players || []).find((p) => isCpuPlayer(p)) || '';
  note(`${mode.label}: 봇 참가`, !!cpu, cpu);

  try {
    snap = await startRoomGame({ room, nickname: me });
  } catch (err) {
    note(`${mode.label}: 시작`, false, err.message);
    return;
  }
  const phase = snap?.game?.phase;
  note(`${mode.label}: 시작`, !!phase && phase !== 'waiting', `phase=${phase}`);

  // 직업 선택이 필요한 모드는 통과시킨다.
  if (phase === 'job_selection') {
    const banned = snap?.game?.bannedJobs || [];
    const jobs = (snap?.game?.status?.jobs || snap?.status?.jobs || []).filter((j) => !banned.includes(j));
    const pick = jobs[0] || '해커';
    snap = await sendCommand({ room, nickname: me, command: `1ㅈㅅ ${pick}` });
    if (snap?.game?.banPhase) snap = await sendCommand({ room, nickname: me, command: '1밴' });
    note(`${mode.label}: 직업 선택 통과`, snap?.game?.phase === 'playing',
      `phase=${snap?.game?.phase} 내직업=${snap?.game?.playerStates?.[me]?.job}`);
  }

  if (snap?.game?.phase === 'combat_draft') {
    note(`${mode.label}: 능력 드래프트 진입`, true, `pool=${snap?.game?.combatDraft?.pool?.length ?? 0}`);
    return; // 드래프트는 사람이 골라야 진행된다. 진입까지만 확인.
  }

  if (snap?.game?.phase !== 'playing') {
    note(`${mode.label}: 대국 진입`, false, `phase=${snap?.game?.phase}`);
    return;
  }

  // 몇 수 두어 본다. 봇이 못 두면 여기서 멈춘다.
  let moved = 0;
  for (let turn = 0; turn < 4; turn++) {
    const g = snap?.game;
    if (!g || g.phase !== 'playing') break;
    if (g.currentPlayer && g.currentPlayer !== me) break; // 봇 차례에서 멈춤 = 버그

    const syl = g.nextSyllable || (g.history?.length ? g.history[g.history.length - 1].slice(-1) : '');
    const word = pickWord(snap, syl);
    if (!word) break;
    const before = (g.history || []).length;
    const t = Date.now();
    snap = await sendCommand({ room, nickname: me, command: `0${word}` });
    const after = (snap?.game?.history || []).length;
    if (after > before) moved += after - before;
    else if (turn === 0) {
      const tail = (snap?.log || []).slice(-3).map((l) => l.text).join(' | ');
      console.log(`       진행 안 됨: '${word}' → ${tail}`);
    }
    if (Date.now() - t > 8000) {
      note(`${mode.label}: 응답 시간`, false, `${Date.now() - t}ms`);
      break;
    }
  }
  note(`${mode.label}: 수 진행`, moved > 0, `${moved}수`);
}

/** 스냅샷의 사전에서 이을 수 있는 단어 하나. 없으면 빈 문자열. */
function pickWord(snap, syl) {
  const used = new Set(snap?.game?.history || []);
  const cands = snap?.game?.candidates || null;
  if (Array.isArray(cands) && cands.length) return cands.find((w) => !used.has(w)) || '';
  // 사전 후보가 스냅샷에 없으면 흔한 시작 단어를 쓴다.
  const fallback = { 기: '기차표', 표: '표지판', 차: '차표', 사: '사과', 과: '과일' };
  if (syl && fallback[syl]) return fallback[syl];
  return syl ? '' : '기차표';
}

for (const mode of modes) {
  try {
    await runMode(mode);
  } catch (err) {
    note(`${mode.label}: 예외`, false, err?.message || String(err));
  }
}

if (failures.length) {
  console.error(`\n실패 ${failures.length}건:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('\n모드 스모크 통과');
