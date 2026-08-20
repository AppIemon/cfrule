/**
 * 방 생성 → 봇 추가 → 시작 → 직업 선택 → 밴 → 게임 시작 → 첫 수까지
 * **웹이 실제로 쓰는 경로**(gameService)로 그대로 돌린다.
 *
 *   npx vite-node scripts/test-room-flow.js
 *
 * 사용자가 겪는 순서 그대로다. 여기서 막히면 웹에서도 막힌다.
 * MongoDB 없이 돌아간다 (레이팅 저장만 건너뛴다).
 */
import {
  createRoom,
  addRoomBot,
  startRoomGame,
  sendCommand,
  getRoomSnapshot,
  isCpuPlayer
} from '../src/lib/server/gameService.js';

const ME = '테스터';
const failures = [];

function check(label, ok, detail = '') {
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` · ${detail}` : ''}`);
}

function phaseOf(snap) { return snap?.game?.phase; }
function statesOf(snap) { return snap?.game?.playerStates || {}; }
function playersOf(snap) { return snap?.game?.players || []; }

// ── 1. 채린룰 방 생성 ──────────────────────────────────────────────
let snap = await createRoom({ nickname: ME, mode: 1, gameMode: 'guerule', rated: false });
const room = snap?.room;
check('방 생성', !!room, `room=${room} phase=${phaseOf(snap)}`);
if (!room) process.exit(1);

// ── 2. 봇 추가 ────────────────────────────────────────────────────
try {
  snap = await addRoomBot({ room, nickname: ME, cpuLevel: '보통' });
} catch (err) {
  check('봇 추가', false, err.message);
}
const cpuName = playersOf(snap).find((p) => isCpuPlayer(p)) || '';
check('봇 참가', !!cpuName, `players=${JSON.stringify(playersOf(snap))}`);

// ── 3. 시작 → 직업 선택 단계 ──────────────────────────────────────
try {
  snap = await startRoomGame({ room, nickname: ME });
} catch (err) {
  check('게임 시작 명령', false, err.message);
}
check('직업 선택 단계 진입', phaseOf(snap) === 'job_selection', `phase=${phaseOf(snap)}`);

// ── 4. 사람이 직업 선택 → 밴 권한 ─────────────────────────────────
snap = await sendCommand({ room, nickname: ME, command: '1ㅈㅅ 해커' });
check('사람 직업 등록', !!statesOf(snap)[ME], `내 직업=${statesOf(snap)[ME]?.job}`);
check('선픽자가 밴 권한',
  snap?.game?.firstPicker === ME && snap?.game?.banPhase === true,
  `firstPicker=${snap?.game?.firstPicker} banPhase=${snap?.game?.banPhase}`);

// ── 5. 밴 없이 진행 → 여기서 CPU 가 직업을 받아야 한다 ─────────────
snap = await sendCommand({ room, nickname: ME, command: '1밴' });
const cpuState = cpuName ? statesOf(snap)[cpuName] : null;
check('CPU 직업 배정', !!cpuState, cpuState ? `${cpuName}=${cpuState.job}` : `${cpuName} 상태 없음`);
check('모든 참가자 직업 보유',
  Object.keys(statesOf(snap)).length === playersOf(snap).length,
  `${Object.keys(statesOf(snap)).length}/${playersOf(snap).length}`);

// ── 6. 게임이 실제로 시작됐는가 ────────────────────────────────────
check('게임 시작', phaseOf(snap) === 'playing', `phase=${phaseOf(snap)}`);

// ── 7. 사람 수 → 봇 응수 ──────────────────────────────────────────
if (phaseOf(snap) === 'playing') {
  const before = (snap.game.history || []).length;
  snap = await sendCommand({ room, nickname: ME, command: '0기차표' });
  const hist = snap?.game?.history || [];
  check('사람 단어 반영', hist.length > before, `history=${JSON.stringify(hist.slice(-4))}`);
  check('봇 응수', hist.length >= before + 2, `${hist.length - before}수 진행`);
}

// ── 8. 이미 고른 직업을 다시 고르면 원래 직업이 유지돼야 한다 ──────
//     한 사람은 한 게임에만 들어갈 수 있으므로 다른 닉네임으로 새 방을 판다.
{
  const ME2 = '테스터2';
  const fresh = await createRoom({ nickname: ME2, mode: 1, gameMode: 'guerule', rated: false });
  const r2 = fresh.room;
  await addRoomBot({ room: r2, nickname: ME2, cpuLevel: '쉬움' });
  await startRoomGame({ room: r2, nickname: ME2 });
  await sendCommand({ room: r2, nickname: ME2, command: '1ㅈㅅ 해커' });
  const again = await sendCommand({ room: r2, nickname: ME2, command: '1ㅈㅅ 사과' });
  const still = statesOf(again)[ME2]?.job;
  check('직업 재선택 시 원래 직업 유지', still === '해커', `현재 직업=${still}`);
  const rejected = (again?.log || []).some((l) => String(l.text || '').includes('이미 직업을 선택'));
  check('재선택은 명확히 거부됨', rejected, rejected ? '이미 직업을 선택하셨습니다' : '거부 메시지 없음');
}

const finalSnap = await getRoomSnapshot(room);
console.log(`\n최종 phase=${phaseOf(finalSnap)} · 수 ${(finalSnap?.game?.history || []).length}`);

if (failures.length) {
  console.error(`\n실패 ${failures.length}건:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('\n방 흐름 정상');
