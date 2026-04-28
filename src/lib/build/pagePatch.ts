export function patchPageSvelte(code: string): string {
  if (!code.includes("let selectedAbility = $state")) {
    code = code.replace("let ability = $state('');", "let ability = $state('');\n  let selectedAbility = $state('');");
  }
  if (!code.includes("let floatingSearchOpen")) {
    code = code.replace(
      "let searchFilter = $state('전체');",
      "let searchFilter = $state('전체');\n  let floatingSearchOpen = $state(false);\n  let floatingSearchText = $state('');\n  let floatingSearchResults = $state([]);\n  let floatingSearchTotal = $state(0);\n  let floatingSearchBusy = $state(false);\n  let hoverJob = $state('');"
    );
  }

  if (!code.includes("const JOB_INFO")) {
    code = code.replace(
      "const ACTIVE_BY_JOB = {",
      `const JOB_INFO = {
    해커: '상대의 규칙과 상태를 조작해 선택지를 무너뜨리는 컨트롤 직업',
    투자자: '주가 조작으로 장기 이득을 굴리는 성장형 직업',
    환자: '환각증으로 상대 판단과 규칙 적용을 흔드는 방해형 직업',
    수집가: '제작과 채굴로 자원을 모아 변수를 만드는 직업',
    감시자: '탐지로 상대의 선택과 위험을 읽는 정보형 직업',
    뜀틀선수: '허들 넘기로 불리한 조건을 회피하는 기동형 직업',
    전우치: '직격뢰로 강하게 압박하는 공격형 직업',
    시프터: '시프트 계열로 음절과 흐름을 바꾸는 변칙 직업',
    비밀요원: '포획으로 상대 선택지를 묶는 제압형 직업',
    사과: '사구아를 중심으로 특수 규칙을 거는 직업',
    시인: '2음절과 시적 허용으로 단어 조건을 비트는 직업',
    공룡: '삼키기와 브레스로 직접적인 압박을 넣는 직업',
    마법사: '공허와 폭발로 판을 크게 흔드는 고위험 직업',
    사신: '사형 선고와 영혼으로 지연 킬각을 만드는 직업',
    수학자: 'A/B/C 선택지로 계산형 분기를 만드는 직업',
    과학자: 'DNA파괴로 상대 능력 구조를 망가뜨리는 직업',
    작곡가: '쪼개기와 쉼표로 단어 흐름을 분절하는 직업',
    스폰지밥: '게살버거/감자튀김/보너스로 여러 보조 효과를 쓰는 직업',
    나이트: '체크메이트와 교환으로 위치 싸움을 하는 직업',
    생존자: '긴급 구조로 위험 상황을 버티는 직업',
    악당: '결계와 왜곡으로 상대 행동을 비트는 직업',
    기자: '거짓 보도와 거짓 뉴스로 상태를 왜곡하는 직업',
    검객: '찌르기와 가르기로 직접 공격하는 직업',
    마하트마간디: '억제로 상대 능력을 누르는 직업',
    수리사: '수리로 손상된 상태를 회복하는 직업',
    우라늄: '핵분열로 강한 폭발적 변수를 만드는 직업',
    고죠: '무량공처로 상대를 봉쇄하는 직업',
    스핔이: '물걸레질과 호박으로 특수 유틸을 쓰는 직업',
    해달: '조개와 깨부수기로 방어/파괴를 오가는 직업',
    프로그래머: 'Shift, Caps Lock, Backspace, Tab으로 입력 규칙을 제어하는 직업'
  };

  const ACTIVE_BY_JOB = {`
    );
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
      `const rawGame = $derived.by(() => {
    if (snapshot?.room && room && snapshot.room !== room) return lastPlayingGame || null;
    return snapshot?.game || null;
  });
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
    const targetRoom = room;
    try {
      const res = await fetch(\`/api/room?room=\${encodeURIComponent(targetRoom)}\`, { cache: 'no-store' });
      if (!res.ok || targetRoom !== room) return;
      const data = await res.json();
      if (data?.room && data.room !== targetRoom) return;
      if ((cpuThinking || holdPlayingSnapshot) && lastPlayingGame?.phase === 'playing' && (!data?.game || data.game.phase === 'waiting' || data.game.phase === 'job_selection')) {
        snapshot = { ...data, room: targetRoom, game: lastPlayingGame };
        return;
      }
      snapshot = data;
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
  function getJobInfo(job) { return JOB_INFO[job] || ((ACTIVE_BY_JOB[job] || []).length ? '능력: ' + ACTIVE_BY_JOB[job].join(', ') : '직업 정보 없음'); }
  function jobTooltip(job) { return job + '\\n' + getJobInfo(job) + '\\n능력: ' + ((ACTIVE_BY_JOB[job] || []).join(', ') || '없음'); }
  const stateKeyLabels = {
    no_all_batchim_turns: '올받침 금지 남은 턴',
    no_hanbang_turns: '한방 금지 남은 턴',
    no_yudo_turns: '유도 금지 남은 턴',
    no_root_turns: '루트 금지 남은 턴',
    no_ability_turns: '능력 금지 남은 턴',
    ability_disabled_turns: '능력 봉쇄 남은 턴',
    ability_lock_turns: '능력 잠금 남은 턴',
    skip_turns: '턴 넘김 남은 턴',
    stun_turns: '기절 남은 턴',
    silence_turns: '침묵 남은 턴',
    hallucination_turns: '환각 남은 턴',
    shield_turns: '보호막 남은 턴',
    immune_turns: '면역 남은 턴',
    protected_turns: '보호 남은 턴',
    cooldown: '쿨타임',
    cooldowns: '쿨타임',
    abilityCooldowns: '능력 쿨타임',
    ability_cooldowns: '능력 쿨타임',
    abilityUses: '능력 사용 횟수',
    ability_uses: '능력 사용 횟수',
    usedAbilities: '사용한 능력',
    used_abilities: '사용한 능력',
    forcedSyllable: '강제 음절',
    forced_syllable: '강제 음절',
    bannedWords: '금지 단어',
    banned_words: '금지 단어',
    wordBan: '단어 금지',
    word_ban: '단어 금지',
    lastAbility: '마지막 능력',
    last_ability: '마지막 능력',
    stacks: '중첩',
    stack: '중첩',
    charges: '충전량',
    charge: '충전량',
    money: '보유 자금',
    stock: '주식',
    stocks: '주식',
    combo: '콤보',
    mode: '모드',
    stance: '태세',
    shield: '보호막',
    passive: '패시브'
  };
  function displayStateKey(key) {
    const raw = String(key || '');
    if (stateKeyLabels[raw]) return stateKeyLabels[raw];
    const spaced = raw.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().replace(/_/g, ' ');
    return spaced.replace(/no /g, '금지 ').replace(/all batchim/g, '올받침').replace(/hanbang/g, '한방').replace(/yudo/g, '유도').replace(/root/g, '루트').replace(/ability/g, '능력').replace(/passive/g, '패시브').replace(/cooldown/g, '쿨타임').replace(/turns/g, '남은 턴').replace(/turn/g, '턴').replace(/count/g, '횟수').replace(/uses/g, '사용 횟수').replace(/used/g, '사용됨').replace(/charge/g, '충전').replace(/shield/g, '보호막').replace(/immune/g, '면역').replace(/stun/g, '기절').replace(/silence/g, '침묵').replace(/hallucination/g, '환각').replace(/forced syllable/g, '강제 음절').replace(/word ban/g, '단어 금지').trim() || raw;
  }
  function displayStateValue(value) {
    if (value === true) return '활성';
    if (value === false) return '비활성';
    if (Array.isArray(value)) return value.length ? value.join(', ') : '없음';
    if (value && typeof value === 'object') return Object.entries(value).map(([k, v]) => displayStateKey(k) + ': ' + displayStateValue(v)).join(' / ');
    return String(value);
  }
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
  async function submitSelectedAbility() { await useAbility(selectedAbility); }
  async function searchFloatingWords() {
    floatingSearchBusy = true;
    try {
      const used = encodeURIComponent((game?.history || []).join(','));
      const res = await fetch(\`/api/word-search?q=\${encodeURIComponent(floatingSearchText)}&start=\${encodeURIComponent(nextSyllable === '자유' ? '' : nextSyllable[0])}&used=\${used}\`, { cache: 'no-store' });
      if (!res.ok) throw new Error('검색 실패');
      const data = await res.json();
      floatingSearchResults = data.results || [];
      floatingSearchTotal = data.total || 0;
    } catch (err) {
      error = err?.message || '검색 실패';
    } finally {
      floatingSearchBusy = false;
    }
  }`
    );
  }

  code = code.replace(
    "cpuThinking = true;\n    try {\n      await send(`0${text}`);\n    } finally {\n      cpuThinking = false;\n    }",
    `cpuThinking = true;
    holdPlayingSnapshot = true;
    const targetRoom = room;
    try { await send(\`0\${text}\`); }
    finally {
      cpuThinking = false;
      if (targetRoom !== room && snapshot?.room === targetRoom) room = targetRoom;
    }`
  );

  code = code.replace(/생각 과정 보기/g, '');
  code = code.replace(/<details class="think-log-panel">[\s\S]*?<\/details>/, '');

  const battle = `
        <div class="battle-v3">
          <button class="floating-search-toggle" type="button" onclick={() => (floatingSearchOpen = !floatingSearchOpen)}>단어 검색</button>
          {#if floatingSearchOpen}
            <div class="floating-word-search">
              <div class="fws-head"><b>인게임 단어 검색</b><button type="button" onclick={() => (floatingSearchOpen = false)}>×</button></div>
              <form class="fws-form" onsubmit={(e) => { e.preventDefault(); searchFloatingWords(); }}>
                <input bind:value={floatingSearchText} placeholder="검색어 / 비우면 현재 음절 후보" />
                <button disabled={floatingSearchBusy}>{floatingSearchBusy ? '검색 중' : '검색'}</button>
              </form>
              <div class="fws-meta">현재 음절: {nextSyllable} · 결과 {floatingSearchTotal}개</div>
              <div class="fws-list">
                {#each floatingSearchResults as row}
                  <button type="button" onclick={() => (word = row.word)}><b>{row.word}</b><span>{row.kind} · 끝 {row.end} · 응답 {row.replyCount}</span></button>
                {:else}
                  <p>검색 결과 없음</p>
                {/each}
              </div>
            </div>
          {/if}
          <section class="battle-top-v3">
            <div>ROOM <b>{room}</b></div>
            <div class="bt-syllable"><span>이을 음절</span><strong>{nextSyllable}</strong></div>
            <div>TURN <b>{game.turnCount || 1}</b><br />차례 <b>{currentPlayer || '—'}</b></div>
            <div class="bt-players">{#each game.players || [] as player}<span class:active={player === currentPlayer}>{player}<small>{game.playerStates?.[player]?.job || '미선택'}</small></span>{/each}</div>
          </section>
          <aside class="battle-left-v3">
            <div class="job-core-v3"><b>{myState?.job || '미선택'}</b><span>{jobInitial(myState?.job)}</span></div>
            <div class="ability-list-v3">{#each abilityButtons as name}<button class:chosen={selectedAbility === name} onclick={() => triggerAbility(name)}><b>{name}</b><small>{abilityHint(name)}</small></button>{:else}<div class="empty-box">능력 없음</div>{/each}</div>
            <div class="passive-list-v3">{#each passiveEntries(myState) as item}<div><b>{displayStateKey(item.key)}</b><span>{displayStateValue(item.value)}</span></div>{:else}<div class="empty-box">패시브 없음</div>{/each}</div>
          </aside>
          <main class="battle-center-v3">
            <div class="word-stream-v3" bind:this={historyEl}>{#each game.history || [] as item, i}<div class="word-chip-v3" class:right={i % 2 === 1}>{item}</div>{:else}<div class="empty-board-v3">첫 단어 대기</div>{/each}{#if cpuThinking}<div class="thinking-chip-v3">컴퓨터 계산 중...</div>{/if}</div>
            <form class="word-input-v3" onsubmit={sendWord}><input bind:value={word} placeholder={canPlay ? '단어 입력' : '내 차례가 아닙니다'} disabled={!canPlay} /><button disabled={!canPlay || !word.trim() || busy}>입력</button></form>
          </main>
          <aside class="battle-right-v3">{#each game.players || [] as player}{@const state = game.playerStates?.[player]}<div class="status-card-v3" class:active={player === currentPlayer}><div><b>{player}</b><span>{state?.job || '미선택'}</span></div><p>{#each visibleEffects(state) as ef}<em>{ef}</em>{:else}<small>상태 이상 없음</small>{/each}</p></div>{/each}</aside>
          <section class="battle-bottom-v3"><div class="cooldown-v3">{#each cooldownEntries(myState) as item}<div><b>{displayStateKey(item.key)}</b><span>{displayStateValue(item.value)}</span></div>{:else}<div class="empty-box">쿨타임 / 횟수 없음</div>{/each}</div><div class="ability-use-v3"><b>{selectedAbility || '능력 선택'}</b>{#if selectedAbility && abilityRequiresTarget(selectedAbility)}<input bind:value={ability} placeholder="대상 / 단어 / 값" />{/if}<button onclick={submitSelectedAbility} disabled={!selectedAbility || busy}>능력 사용</button></div></section>
        </div>`;
  if (!code.includes('battle-v3')) code = code.replace('<div class="ingame">', '<div class="ingame ingame-v3">' + battle);

  if (!code.includes('rank-slim-panel')) {
    code = code.replace("{:else if tab === 'analysis'}", `{#if tab === 'rank'}<section class="rank-slim-panel"><div class="rank-slim-head"><h2>랭킹</h2><button class="accent-btn" onclick={loadRanking}>새로고침</button></div>{#if rankLoading}<div class="rank-loading">랭킹을 불러오는 중입니다...</div>{:else if !ranking?.ranking?.length}<div class="rank-loading">랭킹 데이터가 아직 없습니다.</div>{:else}<div class="rank-tabs"><button class:active={rankMode === 'overall'} onclick={() => (rankMode = 'overall')}>전체</button><button class:active={rankMode === 'job'} onclick={() => (rankMode = 'job')}>직업별</button></div>{/if}</section>{/if}\n\n    {:else if tab === 'analysis'}`);
  }

  if (!code.includes('.battle-v3')) {
    code = code.replace("</style>", `.ingame-v3 > .syl-hero,.ingame-v3 > .game-columns{display:none!important}.battle-v3{position:relative;min-height:calc(100vh - 90px);display:grid;grid-template-columns:270px minmax(0,1fr)290px;grid-template-rows:104px minmax(360px,1fr)150px;gap:12px;color:#052e16}.battle-v3 section,.battle-v3 aside,.battle-v3 main{border-radius:24px;background:rgba(255,255,255,.92);border:1px solid rgba(34,197,94,.18);box-shadow:0 16px 48px rgba(22,101,52,.10);overflow:hidden}.battle-top-v3{grid-column:1/4;display:grid;grid-template-columns:150px 220px 180px 1fr;align-items:center;gap:12px;padding:14px 18px}.bt-syllable span{display:block;font-size:11px;color:#16a34a;font-weight:900}.bt-syllable strong{font-size:42px;color:#15803d}.bt-players{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.bt-players span{display:flex;flex-direction:column;padding:7px 10px;border-radius:14px;background:#f0fdf4;font-weight:900}.bt-players span.active{background:#16a34a;color:white}.battle-left-v3{grid-column:1;grid-row:2;padding:14px;display:flex;flex-direction:column;gap:12px}.job-core-v3,.empty-box{padding:12px;border-radius:16px;background:#f0fdf4;color:#166534}.ability-list-v3{display:flex;flex-direction:column;gap:8px;overflow:auto}.ability-list-v3 button{text-align:left;padding:10px 12px;border-radius:15px;border:1px solid rgba(34,197,94,.18);background:#fff;color:#052e16;cursor:pointer}.ability-list-v3 button.chosen{outline:2px solid rgba(34,197,94,.45);background:#f0fdf4}.ability-list-v3 small{display:block;color:#166534;opacity:.72}.passive-list-v3,.cooldown-v3{display:flex;flex-direction:column;gap:7px;overflow:auto}.passive-list-v3 div,.cooldown-v3 div{display:flex;justify-content:space-between;padding:8px 10px;border-radius:13px;background:#f7fff9;border:1px solid rgba(34,197,94,.14);font-size:12px}.battle-center-v3{grid-column:2;grid-row:2;display:grid;grid-template-rows:1fr auto}.word-stream-v3{padding:18px;overflow:auto;display:flex;flex-direction:column;gap:10px}.word-chip-v3{align-self:flex-start;padding:10px 14px;border-radius:18px;background:#f0fdf4;border:1px solid rgba(34,197,94,.16);font-size:20px;font-weight:900}.word-chip-v3.right{align-self:flex-end;background:#ecfdf5}.word-input-v3{display:flex;gap:10px;padding:14px;border-top:1px solid rgba(34,197,94,.14)}.word-input-v3 input,.ability-use-v3 input{flex:1;padding:12px 14px;border-radius:15px;border:1px solid rgba(34,197,94,.22)}.word-input-v3 button,.ability-use-v3 button,.floating-search-toggle,.fws-form button{padding:12px 16px;border:0;border-radius:15px;background:#16a34a;color:white;font-weight:1000;cursor:pointer}.floating-search-toggle{position:absolute;right:14px;top:116px;z-index:10;box-shadow:0 10px 24px rgba(22,101,52,.18)}.floating-word-search{position:absolute;right:14px;top:166px;z-index:20;width:min(420px,calc(100vw - 32px));max-height:520px;display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:22px;background:rgba(255,255,255,.96);border:1px solid rgba(34,197,94,.22);box-shadow:0 24px 70px rgba(22,101,52,.22);backdrop-filter:blur(12px)}.fws-head{display:flex;justify-content:space-between;align-items:center}.fws-head button{border:0;background:#f0fdf4;color:#166534;border-radius:999px;width:28px;height:28px;font-weight:1000}.fws-form{display:flex;gap:8px}.fws-form input{flex:1;padding:10px 12px;border-radius:14px;border:1px solid rgba(34,197,94,.22)}.fws-meta{font-size:12px;color:#166534;font-weight:800}.fws-list{overflow:auto;display:flex;flex-direction:column;gap:7px}.fws-list button{text-align:left;padding:9px 10px;border-radius:14px;border:1px solid rgba(34,197,94,.16);background:#f7fff9;color:#052e16}.fws-list b,.fws-list span{display:block}.fws-list span{font-size:11px;color:#166534;opacity:.78}.battle-right-v3{grid-column:3;grid-row:2;padding:14px;overflow:auto;display:flex;flex-direction:column;gap:10px}.status-card-v3{padding:12px;border-radius:17px;background:#fff;border:1px solid rgba(34,197,94,.14)}.status-card-v3.active{background:#f0fdf4;outline:2px solid rgba(34,197,94,.26)}.status-card-v3 div{display:flex;justify-content:space-between}.status-card-v3 em{display:inline-block;margin:2px;padding:5px 8px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-style:normal;font-weight:800}.battle-bottom-v3{grid-column:1/4;grid-row:3;display:grid;grid-template-columns:1fr 1.25fr;gap:12px;padding:14px}.ability-use-v3{display:flex;align-items:center;gap:10px;padding:10px;border-radius:18px;background:#f0fdf4}.job-hover-panel{grid-column:1/-1;margin-bottom:10px;padding:12px 14px;border-radius:18px;background:#f0fdf4;border:1px solid rgba(34,197,94,.22);color:#052e16;box-shadow:0 12px 32px rgba(22,101,52,.10)}.job-hover-panel b,.job-hover-panel span,.job-hover-panel small{display:block}.job-hover-panel span{margin-top:4px;color:#166534}.job-hover-panel small{margin-top:6px;opacity:.75}@media(max-width:980px){.battle-v3{grid-template-columns:1fr;grid-template-rows:auto}.battle-top-v3,.battle-left-v3,.battle-center-v3,.battle-right-v3,.battle-bottom-v3{grid-column:1;grid-row:auto}.battle-top-v3,.battle-bottom-v3{grid-template-columns:1fr}.floating-search-toggle{position:fixed;right:12px;bottom:12px;top:auto}.floating-word-search{position:fixed;right:12px;left:12px;top:auto;bottom:64px;width:auto}}</style>`);
  }

  return code;
}
