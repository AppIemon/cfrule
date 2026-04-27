export function patchPageSvelte(code: string): string {
  if (!code.includes("let selectedAbility = $state")) {
    code = code.replace("let ability = $state('');", "let ability = $state('');\n  let selectedAbility = $state('');");
  }

  if (!code.includes("let rankLoading")) {
    code = code.replace(
      "let rankMode = $state('overall');\n  let rankJob = $state('');",
      "let rankMode = $state('overall');\n  let rankJob = $state('');\n  let rankLoading = $state(false);\n  let lastPlayingGame = $state(null);\n  let holdPlayingSnapshot = $state(false);\n  const abilityNeedsTarget = new Set(['조작','복제','초토화','포획','사구아','2음절','시적 허용','삼키기','브레스','사형 선고','DNA파괴','쪼개기','체크메이트','교환','울음','거짓 보도','거짓 뉴스','찌르기','가르기','수리','핵분열','무량공처','조개','깨부수기','Backspace','Tab']);"
    );
  }

  if (!code.includes("const rawGame")) {
    code = code.replace(
      "const game = $derived(snapshot?.game || null);",
      `const rawGame = $derived(snapshot?.game || null);
  const game = $derived.by(() => {
    if (rawGame?.phase === 'playing') return rawGame;
    if ((holdPlayingSnapshot || cpuThinking) && lastPlayingGame?.phase === 'playing') return lastPlayingGame;
    return rawGame;
  });`
    );
    code = code.replace(
      "const maxBanCount = 6;",
      `const maxBanCount = 6;

  $effect(() => {
    if (rawGame?.phase === 'playing') {
      lastPlayingGame = rawGame;
      holdPlayingSnapshot = true;
    } else if (rawGame && rawGame.phase !== 'waiting' && rawGame.phase !== 'job_selection') {
      holdPlayingSnapshot = false;
    }
  });`
    );
  }

  code = code.replace(
    /async function refresh\(\) \{\n\s*if \(!room\) return;\n\s*snapshot = await request\(`\/api\/room\?room=\$\{encodeURIComponent\(room\)\}`\);\n\s*\}/,
    `async function refresh() {
    if (!room) return;
    try {
      const res = await fetch(\`/api/room?room=\${encodeURIComponent(room)}\`, { cache: 'no-store' });
      if (res.ok) snapshot = await res.json();
    } catch {}
  }`
  );

  if (!code.includes("function abilityRequiresTarget")) {
    code = code.replace(
      "async function sendAbility() {\n    await send(`2${ability}`);\n    ability = '';\n  }",
      "async function sendAbility() {\n    await submitSelectedAbility();\n  }"
    );
    code = code.replace(
      "async function useAbility(name) {\n    await send(`2${name}${ability.trim() && !ability.trim().startsWith(name) ? ` ${ability.trim()}` : ''}`);\n    ability = '';\n  }",
      `function abilityRequiresTarget(name) { return abilityNeedsTarget.has(name); }
  function abilityHint(name) { return abilityRequiresTarget(name) ? '대상 필요' : '즉시 사용'; }
  function cooldownEntries(state) {
    if (!state) return [];
    return Object.entries(state).filter(([k,v]) => v && /cool|count|uses|used|charge|turns|stack|쿨|횟수|충전/i.test(k)).map(([key,value]) => ({ key, value }));
  }
  function passiveEntries(state) {
    if (!state) return [];
    return Object.entries(state).filter(([k,v]) => v && /passive|immune|bonus|shield|mode|stance|패시브|면역|보호/i.test(k)).map(([key,value]) => ({ key, value }));
  }
  async function useAbility(name = selectedAbility) {
    const abilityName = String(name || '').trim();
    if (!abilityName) { error = '사용할 능력을 먼저 선택하세요.'; return; }
    const target = ability.trim();
    if (abilityRequiresTarget(abilityName) && !target) { selectedAbility = abilityName; error = abilityName + ' 능력은 대상이 필요합니다.'; return; }
    await send(\`2\${abilityName}\${target && !target.startsWith(abilityName) ? \` \${target}\` : ''}\`);
    ability = '';
  }
  async function triggerAbility(name) { selectedAbility = name; if (!abilityRequiresTarget(name)) await useAbility(name); }
  async function submitSelectedAbility() { await useAbility(selectedAbility); }`
    );
  }

  code = code.replace(
    "cpuThinking = true;\n    try {\n      await send(`0${text}`);\n    } finally {\n      cpuThinking = false;\n    }",
    `cpuThinking = true;
    holdPlayingSnapshot = true;
    try { await send(\`0\${text}\`); }
    finally { cpuThinking = false; }`
  );

  code = code.replace(/생각 과정 보기/g, '');
  code = code.replace(/<details class="think-log-panel">[\s\S]*?<\/details>/, '');

  const battle = `
        <div class="battle-v3">
          <section class="battle-top-v3">
            <div>ROOM <b>{room}</b></div>
            <div class="bt-syllable"><span>이을 음절</span><strong>{nextSyllable}</strong></div>
            <div>TURN <b>{game.turnCount || 1}</b><br />차례 <b>{currentPlayer || '—'}</b></div>
            <div class="bt-players">{#each game.players || [] as player}<span class:active={player === currentPlayer}>{player}<small>{game.playerStates?.[player]?.job || '미선택'}</small></span>{/each}</div>
          </section>
          <aside class="battle-left-v3">
            <div class="job-core-v3"><b>{myState?.job || '미선택'}</b><span>{jobInitial(myState?.job)}</span></div>
            <div class="ability-list-v3">{#each abilityButtons as name}<button class:chosen={selectedAbility === name} onclick={() => triggerAbility(name)}><b>{name}</b><small>{abilityHint(name)}</small></button>{:else}<div class="empty-box">능력 없음</div>{/each}</div>
            <div class="passive-list-v3">{#each passiveEntries(myState) as item}<div><b>{item.key}</b><span>{String(item.value)}</span></div>{:else}<div class="empty-box">패시브 없음</div>{/each}</div>
          </aside>
          <main class="battle-center-v3">
            <div class="word-stream-v3" bind:this={historyEl}>{#each game.history || [] as item, i}<div class="word-chip-v3" class:right={i % 2 === 1}>{item}</div>{:else}<div class="empty-board-v3">첫 단어 대기</div>{/each}{#if cpuThinking}<div class="thinking-chip-v3">컴퓨터 계산 중...</div>{/if}</div>
            <form class="word-input-v3" onsubmit={sendWord}><input bind:value={word} placeholder={canPlay ? '단어 입력' : '내 차례가 아닙니다'} disabled={!canPlay} /><button disabled={!canPlay || !word.trim() || busy}>입력</button></form>
          </main>
          <aside class="battle-right-v3">{#each game.players || [] as player}{@const state = game.playerStates?.[player]}<div class="status-card-v3" class:active={player === currentPlayer}><div><b>{player}</b><span>{state?.job || '미선택'}</span></div><p>{#each visibleEffects(state) as ef}<em>{ef}</em>{:else}<small>상태 이상 없음</small>{/each}</p></div>{/each}</aside>
          <section class="battle-bottom-v3"><div class="cooldown-v3">{#each cooldownEntries(myState) as item}<div><b>{item.key}</b><span>{String(item.value)}</span></div>{:else}<div class="empty-box">쿨타임 / 횟수 없음</div>{/each}</div><div class="ability-use-v3"><b>{selectedAbility || '능력 선택'}</b>{#if selectedAbility && abilityRequiresTarget(selectedAbility)}<input bind:value={ability} placeholder="대상 / 단어 / 값" />{/if}<button onclick={submitSelectedAbility} disabled={!selectedAbility || busy}>능력 사용</button></div></section>
        </div>`;
  if (!code.includes('battle-v3')) code = code.replace('<div class="ingame">', '<div class="ingame ingame-v3">' + battle);

  if (!code.includes('rank-slim-panel')) {
    code = code.replace("{:else if tab === 'analysis'}", `{#if tab === 'rank'}<section class="rank-slim-panel"><div class="rank-slim-head"><h2>랭킹</h2><button class="accent-btn" onclick={loadRanking}>새로고침</button></div>{#if rankLoading}<div class="rank-loading">랭킹을 불러오는 중입니다...</div>{:else if !ranking?.ranking?.length}<div class="rank-loading">랭킹 데이터가 아직 없습니다.</div>{:else}<div class="rank-tabs"><button class:active={rankMode === 'overall'} onclick={() => (rankMode = 'overall')}>전체</button><button class:active={rankMode === 'job'} onclick={() => (rankMode = 'job')}>직업별</button></div>{/if}</section>{/if}\n\n    {:else if tab === 'analysis'}`);
  }

  if (!code.includes('.battle-v3')) {
    code = code.replace("</style>", `.ingame-v3 > .syl-hero,.ingame-v3 > .game-columns{display:none!important}.battle-v3{min-height:calc(100vh - 90px);display:grid;grid-template-columns:270px minmax(0,1fr)290px;grid-template-rows:104px minmax(360px,1fr)150px;gap:12px;color:#052e16}.battle-v3 section,.battle-v3 aside,.battle-v3 main{border-radius:24px;background:rgba(255,255,255,.92);border:1px solid rgba(34,197,94,.18);box-shadow:0 16px 48px rgba(22,101,52,.10);overflow:hidden}.battle-top-v3{grid-column:1/4;display:grid;grid-template-columns:150px 220px 180px 1fr;align-items:center;gap:12px;padding:14px 18px}.bt-syllable span{display:block;font-size:11px;color:#16a34a;font-weight:900}.bt-syllable strong{font-size:42px;color:#15803d}.bt-players{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.bt-players span{display:flex;flex-direction:column;padding:7px 10px;border-radius:14px;background:#f0fdf4;font-weight:900}.bt-players span.active{background:#16a34a;color:white}.battle-left-v3{grid-column:1;grid-row:2;padding:14px;display:flex;flex-direction:column;gap:12px}.job-core-v3,.empty-box{padding:12px;border-radius:16px;background:#f0fdf4;color:#166534}.ability-list-v3{display:flex;flex-direction:column;gap:8px;overflow:auto}.ability-list-v3 button{text-align:left;padding:10px 12px;border-radius:15px;border:1px solid rgba(34,197,94,.18);background:#fff;color:#052e16;cursor:pointer}.ability-list-v3 button.chosen{outline:2px solid rgba(34,197,94,.45);background:#f0fdf4}.ability-list-v3 small{display:block;color:#166534;opacity:.72}.passive-list-v3,.cooldown-v3{display:flex;flex-direction:column;gap:7px;overflow:auto}.passive-list-v3 div,.cooldown-v3 div{display:flex;justify-content:space-between;padding:8px 10px;border-radius:13px;background:#f7fff9;border:1px solid rgba(34,197,94,.14);font-size:12px}.battle-center-v3{grid-column:2;grid-row:2;display:grid;grid-template-rows:1fr auto}.word-stream-v3{padding:18px;overflow:auto;display:flex;flex-direction:column;gap:10px}.word-chip-v3{align-self:flex-start;padding:10px 14px;border-radius:18px;background:#f0fdf4;border:1px solid rgba(34,197,94,.16);font-size:20px;font-weight:900}.word-chip-v3.right{align-self:flex-end;background:#ecfdf5}.word-input-v3{display:flex;gap:10px;padding:14px;border-top:1px solid rgba(34,197,94,.14)}.word-input-v3 input,.ability-use-v3 input{flex:1;padding:12px 14px;border-radius:15px;border:1px solid rgba(34,197,94,.22)}.word-input-v3 button,.ability-use-v3 button{padding:12px 16px;border:0;border-radius:15px;background:#16a34a;color:white;font-weight:1000;cursor:pointer}.battle-right-v3{grid-column:3;grid-row:2;padding:14px;overflow:auto;display:flex;flex-direction:column;gap:10px}.status-card-v3{padding:12px;border-radius:17px;background:#fff;border:1px solid rgba(34,197,94,.14)}.status-card-v3.active{background:#f0fdf4;outline:2px solid rgba(34,197,94,.26)}.status-card-v3 div{display:flex;justify-content:space-between}.status-card-v3 em{display:inline-block;margin:2px;padding:5px 8px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-style:normal;font-weight:800}.battle-bottom-v3{grid-column:1/4;grid-row:3;display:grid;grid-template-columns:1fr 1.25fr;gap:12px;padding:14px}.ability-use-v3{display:flex;align-items:center;gap:10px;padding:10px;border-radius:18px;background:#f0fdf4}@media(max-width:980px){.battle-v3{grid-template-columns:1fr;grid-template-rows:auto}.battle-top-v3,.battle-left-v3,.battle-center-v3,.battle-right-v3,.battle-bottom-v3{grid-column:1;grid-row:auto}.battle-top-v3,.battle-bottom-v3{grid-template-columns:1fr}}</style>`);
  }

  return code;
}
