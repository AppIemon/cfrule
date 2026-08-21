/**
 * 같은 방에 요청이 동시에 들어와도 상태가 깨지지 않는가.
 *
 *   npx vite-node scripts/test-concurrency.js
 *
 * 방 하나의 상태 변경은 여러 await 를 거치는 여러 단계짜리다. 줄을 세우지
 * 않으면 두 요청이 그 사이에 끼어들어 반쯤 진행된 상태를 덮어쓴다.
 * 사용자가 "서버가 불안정하다"고 느끼는 증상 — 봇이 둘 붙고, 낸 단어가
 * 사라지고, 멀쩡한 방이 튕기는 것 — 이 대부분 여기서 나온다.
 */
import {
  createRoom,
  addRoomBot,
  startRoomGame,
  sendCommand,
  getRoomSnapshot,
  isCpuPlayer,
  withRoomLock
} from '../src/lib/server/gameService.js';

const failures = [];
function check(label, ok, detail = '') {
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` · ${detail}` : ''}`);
}

/** 동시에 보낸 요청들. 거부는 정상이다 — 상태가 깨지지 않는 게 핵심. */
function all(list) {
  return Promise.allSettled(list);
}

// ── 0. 자물쇠 자체 — 같은 방은 겹치지 않고, 다른 방은 안 기다린다 ──
//     아래 2~5번은 "상태가 깨지지 않았다"만 본다. 이 환경에는 MongoDB 가 없어
//     저장이 즉시 끝나므로 끼어들 지점이 사실상 없다 — 즉 2~5번은 자물쇠를
//     떼어내도 통과한다. 그래서 성질 자체를 여기서 직접 확인한다.
{
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let live = 0, maxLive = 0;
  const body = async () => {
    live++;
    maxLive = Math.max(maxLive, live);
    await sleep(20);
    live--;
  };

  await Promise.all([1, 2, 3, 4].map(() => withRoomLock('AA', body)));
  check('같은 방: 한 번에 하나씩', maxLive === 1, `동시 실행 최대 ${maxLive}`);

  live = 0; maxLive = 0;
  const t = Date.now();
  await Promise.all(['B1', 'B2', 'B3', 'B4'].map((r) => withRoomLock(r, body)));
  check('다른 방: 동시에 진행', maxLive === 4, `동시 실행 최대 ${maxLive}`);
  check('다른 방: 줄서지 않음', Date.now() - t < 60, `${Date.now() - t}ms`);

  // 한 작업이 던져도 사슬이 끊기면 안 된다 — 끊기면 그 방이 영영 잠긴다.
  await withRoomLock('CC', async () => { throw new Error('일부러 실패'); }).catch(() => {});
  let after = false;
  await withRoomLock('CC', async () => { after = true; });
  check('실패해도 다음 작업이 돈다', after);
}

// ── 1. 봇 추가를 동시에 4번 → 봇은 한 마리만 ──────────────────────
{
  const ME = '동시테스터1';
  const room = (await createRoom({ nickname: ME, mode: 1, gameMode: 'guerule', rated: false })).room;
  await all([
    addRoomBot({ room, nickname: ME, cpuLevel: '쉬움' }),
    addRoomBot({ room, nickname: ME, cpuLevel: '쉬움' }),
    addRoomBot({ room, nickname: ME, cpuLevel: '쉬움' }),
    addRoomBot({ room, nickname: ME, cpuLevel: '쉬움' })
  ]);
  const players = (await getRoomSnapshot(room))?.game?.players || [];
  const bots = players.filter(isCpuPlayer);
  check('봇 동시 추가: 정원 초과 없음', players.length <= 2, `players=${JSON.stringify(players)}`);
  check('봇 동시 추가: 봇 1마리', bots.length === 1, `${bots.length}마리`);
}

// ── 2. 시작을 동시에 3번 → 한 번만 시작 ───────────────────────────
{
  const ME = '동시테스터2';
  const room = (await createRoom({ nickname: ME, mode: 1, gameMode: 'guerule', rated: false })).room;
  await addRoomBot({ room, nickname: ME, cpuLevel: '쉬움' });
  const results = await all([
    startRoomGame({ room, nickname: ME }),
    startRoomGame({ room, nickname: ME }),
    startRoomGame({ room, nickname: ME })
  ]);
  const ok = results.filter((r) => r.status === 'fulfilled').length;
  const snap = await getRoomSnapshot(room);
  check('시작 동시 요청: 한 번만 성공', ok === 1, `성공 ${ok}건`);
  check('시작 동시 요청: 단계 정상', snap?.game?.phase === 'job_selection', `phase=${snap?.game?.phase}`);
}

// ── 3. 직업 선택을 동시에 → 내 직업은 하나 ────────────────────────
{
  const ME = '동시테스터3';
  const room = (await createRoom({ nickname: ME, mode: 1, gameMode: 'guerule', rated: false })).room;
  await addRoomBot({ room, nickname: ME, cpuLevel: '쉬움' });
  await startRoomGame({ room, nickname: ME });
  await all([
    sendCommand({ room, nickname: ME, command: '1ㅈㅅ 해커' }),
    sendCommand({ room, nickname: ME, command: '1ㅈㅅ 사과' }),
    sendCommand({ room, nickname: ME, command: '1ㅈㅅ 시인' })
  ]);
  const snap = await getRoomSnapshot(room);
  const job = snap?.game?.playerStates?.[ME]?.job;
  check('직업 동시 선택: 한 직업만 확정', !!job, `내 직업=${job}`);
  check('직업 동시 선택: 상태 개수 정상',
    Object.keys(snap?.game?.playerStates || {}).length <= (snap?.game?.players || []).length,
    `${Object.keys(snap?.game?.playerStates || {}).length}/${(snap?.game?.players || []).length}`);
}

// ── 4. 대국 중 같은 단어를 연타 → 기보에 한 번만 ──────────────────
{
  const ME = '동시테스터4';
  const room = (await createRoom({ nickname: ME, mode: 1, gameMode: 'guerule', rated: false })).room;
  await addRoomBot({ room, nickname: ME, cpuLevel: '쉬움' });
  await startRoomGame({ room, nickname: ME });
  await sendCommand({ room, nickname: ME, command: '1ㅈㅅ 해커' });
  await sendCommand({ room, nickname: ME, command: '1밴' });
  const snap0 = await getRoomSnapshot(room);
  if (snap0?.game?.phase !== 'playing') {
    check('단어 연타: 대국 진입', false, `phase=${snap0?.game?.phase}`);
  } else {
    await all([
      sendCommand({ room, nickname: ME, command: '0기차표' }),
      sendCommand({ room, nickname: ME, command: '0기차표' }),
      sendCommand({ room, nickname: ME, command: '0기차표' })
    ]);
    const hist = (await getRoomSnapshot(room))?.game?.history || [];
    const count = hist.filter((w) => w === '기차표').length;
    check('단어 연타: 기보에 한 번만', count === 1, `${count}회 · ${JSON.stringify(hist.slice(0, 4))}`);
    check('단어 연타: 기보 중복 없음', new Set(hist).size === hist.length, JSON.stringify(hist));
  }
}

if (failures.length) {
  console.error(`\n실패 ${failures.length}건:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('\n동시 요청 정상');
