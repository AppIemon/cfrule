<script>
  import { browser } from '$app/environment';
  import { onDestroy, tick } from 'svelte';
  import {
    BarChart3, Bot, Flag, Info, LogIn, LogOut, Plus,
    Search, Send, Shuffle, Sparkles, Swords, UserRoundPlus, Vote
  } from 'lucide-svelte';

  const ACTIVE_BY_JOB = {
    해커: ['조작', '복제', '초토화'],
    투자자: ['주가 조작'],
    환자: ['환각증'],
    수집가: ['제작', '채굴'],
    감시자: ['탐지'],
    뜀틀선수: ['허들 넘기'],
    전우치: ['직격뢰'],
    시프터: ['시프트', '빅 시프트'],
    비밀요원: ['포획'],
    사과: ['사구아'],
    시인: ['2음절', '시적 허용'],
    공룡: ['삼키기', '브레스', '꼬리 날리기'],
    마법사: ['공허', '폭발'],
    사신: ['사형 선고', '영혼'],
    수학자: ['A', 'B', 'C'],
    과학자: ['DNA파괴'],
    작곡가: ['쪼개기', '쉼표'],
    스폰지밥: ['게살버거', '감자튀김', '보너스', '강도 채용'],
    나이트: ['체크메이트', '교환', '울음'],
    생존자: ['긴급 구조'],
    악당: ['결계', '왜곡'],
    기자: ['거짓 보도', '거짓 뉴스'],
    검객: ['찌르기', '가르기'],
    마하트마간디: ['억제'],
    수리사: ['수리'],
    우라늄: ['핵분열'],
    고죠: ['무량공처'],
    스핔이: ['물걸레질', '호박'],
    해달: ['조개', '깨부수기'],
    프로그래머: ['Shift', 'Caps Lock', 'Backspace', 'Tab']
  };

  let nickname = $state('');
  let username = $state('');
  let password = $state('');
  let authMode = $state('login');
  let user = $state(null);
  let roomInput = $state('');
  let room = $state('');
  let mode = $state(1);
  let practice = $state(false);
  let cpuJob = $state('');
  let word = $state('');
  let ability = $state('');
  let selectedJob = $state('');
  let selectedBans = $state([]);
  let searchText = $state('');
  let searchResults = $state([]);
  let searchTotal = $state(0);
  let searchFilter = $state('전체');
  let snapshot = $state(null);
  let ranking = $state(null);
  let analysisJobA = $state('해커');
  let analysisJobB = $state('사과');
  let analysisSyllable = $state('');
  let analysisSituation = $state('');
  let analysis = $state(null);
  let analysisMode = $state('syllable');
  let batchAnalysis = $state(null);
  let analysisBusy = $state(false);
  let tab = $state('game');
  let busy = $state(false);
  let cpuThinking = $state(false);
  let error = $state('');
  let poller;
  let socket;
  let historyEl = $state();

  let showMatchBanner = $state(false);
  let showPracticeBar = $state(false);
  let prevPhase = '';
  let matchBannerTimer;

  const jobs = $derived(snapshot?.status?.jobs || []);
  const availableJobs = $derived(jobs.length ? jobs : Object.keys(ACTIVE_BY_JOB));
  const game = $derived(snapshot?.game || null);
  const myState = $derived(game?.playerStates?.[nickname] || null);
  const currentPlayer = $derived(game?.currentPlayer || '');
  const nextSyllable = $derived(formatSyllable(game));
  const canPlay = $derived(game?.phase === 'playing' && (!currentPlayer || currentPlayer === nickname));
  const log = $derived(snapshot?.log || []);
  const notices = $derived(log.filter((item) => item.type === 'system' && !isGuiOnlyNotice(item.text)).slice(-4).reverse());
  const abilityButtons = $derived(ACTIVE_BY_JOB[myState?.job] || []);
  const cpuThinkLog = $derived(
    log.filter(item => item.type === 'system' && (
      item.text?.includes('생각 중이다') ||
      item.text?.includes('분석하며') ||
      item.text?.includes('계산 중')
    )).slice(-5)
  );
  const isBanPhase = $derived(game?.phase === 'job_selection' && game?.banPhase);
  const isBanPicker = $derived(isBanPhase && game?.firstPicker === nickname);
  const isBanWaiting = $derived(isBanPhase && game?.firstPicker && game?.firstPicker !== nickname);
  const bannedJobs = $derived(game?.bannedJobs || []);
  const selectableJobs = $derived(availableJobs.filter((job) => !bannedJobs.includes(job)));
  const maxBanCount = 6;

  $effect(() => {
    const phase = game?.phase ?? '';
    if (!practice && prevPhase === 'waiting' && phase && phase !== 'waiting') {
      showMatchBanner = true;
      clearTimeout(matchBannerTimer);
      matchBannerTimer = setTimeout(() => (showMatchBanner = false), 3200);
    }
    prevPhase = phase;
  });

  $effect(() => {
    if (historyEl && game?.history?.length) {
      tick().then(() => { historyEl.scrollTop = historyEl.scrollHeight; });
    }
  });

  $effect(() => {
    if (!isBanPhase && selectedBans.length) selectedBans = [];
  });

  async function request(path, options = {}) {
    busy = true;
    error = '';
    try {
      const res = await fetch(path, options);
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (err) {
      error = err?.message || 'error';
      throw err;
    } finally {
      busy = false;
    }
  }

  async function loadMe() {
    const data = await request('/api/auth');
    user = data.user;
    if (user?.nickname) nickname = user.nickname;
  }

  async function auth() {
    const data = await request('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: authMode, username, password })
    });
    user = data.user;
    if (user?.nickname) nickname = user.nickname;
    password = '';
  }

  async function signout() {
    await request('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    });
    user = null;
    nickname = '';
    room = '';
    snapshot = null;
  }

  async function create() {
    if (!user?.nickname) {
      error = '로그인 후 이용할 수 있습니다.';
      return;
    }
    nickname = user.nickname;
    const data = await request('/api/room', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: user.nickname, mode: Number(mode), practice, cpuJob })
    });
    room = data.room;
    snapshot = data;
    startLiveUpdates();
  }

  async function join() {
    if (!user?.nickname) {
      error = '로그인 후 이용할 수 있습니다.';
      return;
    }
    nickname = user.nickname;
    const target = roomInput.trim().toUpperCase();
    const data = await request('/api/room', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'join', room: target, nickname: user.nickname })
    });
    room = data.room;
    snapshot = data;
    startLiveUpdates();
  }

  async function refresh() {
    if (!room) return;
    snapshot = await request(`/api/room?room=${encodeURIComponent(room)}`);
  }

  function startPolling() {
    clearInterval(poller);
    poller = setInterval(refresh, 1200);
  }

  function startLiveUpdates() {
    clearInterval(poller);
    if (socket) socket.close();
    if (browser && room) {
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${protocol}://${location.host}/ws?room=${encodeURIComponent(room)}`);
      socket.onmessage = (event) => { try { snapshot = JSON.parse(event.data); } catch {} };
      socket.onerror = () => startPolling();
      socket.onclose = () => startPolling();
      return;
    }
    startPolling();
  }

  async function send(commandText) {
    if (!room || !commandText.trim() || !user?.nickname) return;
    snapshot = await request('/api/action', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ room, nickname: user.nickname, command: commandText.trim() })
    });
  }

  async function sendWord(event) {
    event?.preventDefault?.();
    const text = word.trim();
    if (!text || !canPlay) return;
    word = '';
    cpuThinking = true;
    try {
      await send(`0${text}`);
    } finally {
      cpuThinking = false;
    }
  }

  async function sendAbility() {
    await send(`2${ability}`);
    ability = '';
  }

  function isGuiOnlyNotice(text) {
    const value = String(text || '');
    return [
      '상대 직업을 최대',
      '명령어:',
      '예시:',
      '축약 예시:',
      '밴 없이 진행하려면',
      '전체 직업 목록:',
      '밴을 마치면 남은 CPU 직업',
      '선택 가능 직업:',
      '다른 참가자들은 이제 직업을 선택',
      '끝말잇기 경기가 시작',
      '참가자:',
      '시작은 아무나',
      '단어 입력:',
      '능력 사용:',
      '현황 확인:',
      '무효 요청:',
      '무르기 요청:',
      '입장 바꾸기:',
      '기권:',
      '잠수 확인:',
      '첫 수에는',
      '두음법칙:'
    ].some((needle) => value.includes(needle));
  }

  function toggleBan(job) {
    if (!isBanPicker || bannedJobs.includes(job) || myState?.job === job) return;
    if (selectedBans.includes(job)) {
      selectedBans = selectedBans.filter((item) => item !== job);
      return;
    }
    if (selectedBans.length >= maxBanCount) return;
    selectedBans = [...selectedBans, job];
  }

  async function submitBans() {
    if (!isBanPicker) return;
    await send(`1밴 ${selectedBans.join(' ')}`.trim());
  }

  async function useAbility(name) {
    await send(`2${name}${ability.trim() && !ability.trim().startsWith(name) ? ` ${ability.trim()}` : ''}`);
    ability = '';
  }

  async function searchWords() {
    const data = await request(`/api/search?q=${encodeURIComponent(searchText)}`);
    searchResults = data.results || [];
    searchTotal = data.total || 0;
  }

  async function loadRanking() {
    ranking = await request('/api/ranking');
  }

  function submitSearch(event) {
    event.preventDefault();
    searchWords();
  }

  async function runAnalysis() {
    analysisBusy = true;
    analysis = null;
    batchAnalysis = null;
    try {
      analysis = await request('/api/analysis', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          attackerJob: analysisJobA, defenderJob: analysisJobB,
          syllable: analysisSyllable, situation: analysisSituation
        })
      });
    } finally { analysisBusy = false; }
  }

  async function runBatchAnalysis(type) {
    analysisBusy = true;
    analysis = null;
    batchAnalysis = null;
    try {
      batchAnalysis = await request('/api/analysis', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ attackerJob: analysisJobA, defenderJob: analysisJobB, type })
      });
    } finally { analysisBusy = false; }
  }

  const filteredSearch = $derived(
    searchFilter === '전체' ? searchResults : searchResults.filter(r => r.kind === searchFilter)
  );

  async function startPractice() {
    showPracticeBar = false;
    room = '';
    snapshot = null;
    practice = true;
    await create();
  }

  function formatSyllable(state) {
    if (!state?.lastLetter || !state.history?.length) return '자유';
    const { s1, s2 } = state.lastLetter;
    return s1 && s2 && s1 !== s2 ? `${s2}(${s1})` : s2 || s1 || '자유';
  }

  function visibleEffects(state) {
    if (!state) return [];
    const labels = {
      disabled_turns: '능력불가', absolutely_disabled: '절대봉쇄',
      no_yudo_turns: '유도불가', no_root_turns: '루트불가',
      no_hanbang_turns: '한방불가', no_du_eum_turns: '두음불가',
      only_even_turns: '짝수', only_odd_turns: '홀수',
      only_length_2_turns: '2글자', no_length_2_turns: '2글자금지',
      only_root_turns: '루트만', last_route_only_turns: '끝루트',
      limited_length: '최대', min_length: '최소'
    };
    return Object.entries(labels).filter(([key]) => state[key]).map(([key, label]) => `${label} ${state[key]}`);
  }

  function jobInitial(name) {
    return name ? name[0] : '?';
  }

  function jobImageSrc(name) {
    return `/job-images/${encodeURIComponent(encodeURIComponent(name))}.jpg`;
  }

  function hideBrokenImage(event) {
    event.currentTarget.hidden = true;
  }

  onDestroy(() => {
    clearInterval(poller);
    if (socket) socket.close();
    clearTimeout(matchBannerTimer);
  });

  if (browser) loadMe();
</script>

<svelte:head>
  <title>채린룰</title>
</svelte:head>

<div class="app">
  <!-- ══════════════════════ TOPBAR ══════════════════════ -->
  <header class="topbar">
    <div class="brand">
      <span class="brand-gem">◆</span>채린룰
    </div>
    <nav class="top-nav">
      <button class="nav-btn" class:nav-active={tab === 'game'} onclick={() => (tab = 'game')}>
        <Swords size={15} />게임
      </button>
      <button class="nav-btn" class:nav-active={tab === 'search'} onclick={() => (tab = 'search')}>
        <Search size={15} />검색
      </button>
      <button class="nav-btn" class:nav-active={tab === 'rank'} onclick={() => { tab = 'rank'; loadRanking(); }}>
        <BarChart3 size={15} />랭킹
      </button>
      <button class="nav-btn" class:nav-active={tab === 'analysis'} onclick={() => (tab = 'analysis')}>
        <Bot size={15} />분석
      </button>
    </nav>
    <div class="top-auth">
      {#if user}
        <span class="auth-name">{user.nickname}</span>
        <button class="icon-btn" onclick={signout} title="로그아웃"><LogOut size={16} /></button>
      {:else}
        <select class="auth-select" bind:value={authMode}>
          <option value="login">로그인</option>
          <option value="signup">회원가입</option>
        </select>
        <input class="auth-input" bind:value={username} placeholder="아이디" />
        <input class="auth-input" bind:value={password} placeholder="비밀번호" type="password" />
        <button class="icon-btn accent" onclick={auth} disabled={!username.trim() || !password.trim()}>
          <LogIn size={16} />
        </button>
      {/if}
    </div>
  </header>

  {#if error}
    <div class="toast-error" role="alert">
      <span class="toast-dot"></span>{error}
    </div>
  {/if}

  <!-- ══════════════════════ GAME TAB ══════════════════════ -->
  {#if tab === 'game'}

    {#if !room}
      <!-- ─── LOBBY ─── -->
      <div class="lobby">
        <div class="lobby-card">
          <div class="lobby-title">
            <span class="lobby-gem">◆</span>
            <h1>채린룰</h1>
            <p>끝말잇기 배틀</p>
          </div>
          <div class="lobby-fields">
            {#if !user}
              <div class="login-required">
                <LogIn size={18} />
                <strong>로그인이 필요합니다</strong>
                <span>상단에서 로그인하거나 회원가입 후 게임을 시작하세요.</span>
              </div>
            {:else}
              <div class="player-badge">
                <UserRoundPlus size={16} />
                <span>{user.nickname}</span>
              </div>
              <div class="mode-row">
                {#each [1,2,3] as m}
                  <button
                    class="mode-btn"
                    class:mode-active={mode == m}
                    onclick={() => (mode = m)}
                  >{m}대{m}</button>
                {/each}
              </div>
              <button class="lobby-cta" onclick={create} disabled={busy}>
                <Plus size={18} />방 만들기
              </button>
              <div class="lobby-sep"><span>또는</span></div>
              <div class="join-row">
                <input class="join-input" bind:value={roomInput} placeholder="방 코드" />
                <button class="join-btn" onclick={join} disabled={busy || !roomInput.trim()}>
                  입장
                </button>
              </div>
              <label class="practice-toggle">
                <input type="checkbox" bind:checked={practice} />
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
                <Bot size={14} />연습 모드
              </label>
              {#if practice}
                <input class="lobby-input" bind:value={cpuJob} placeholder="CPU 직업 (비우면 랜덤)" />
              {/if}
            {/if}
          </div>
        </div>
      </div>

    {:else if !practice && (!game || game.phase === 'waiting')}
      <!-- ─── MATCHING ─── -->
      <div class="matching-screen">
        <div class="radar">
          <div class="radar-ring rr1"></div>
          <div class="radar-ring rr2"></div>
          <div class="radar-ring rr3"></div>
          <div class="radar-ring rr4"></div>
          <div class="radar-core"><Swords size={28} /></div>
        </div>
        <h2 class="matching-label">상대를 찾고 있어요<span class="dots"></span></h2>
        <div class="room-code-pill">
          방 코드 <strong>{room}</strong>
        </div>
        {#if (game?.players || []).length}
          <div class="players-found">
            {#each game.players as p}
              <div class="found-chip">{p}</div>
            {/each}
          </div>
        {/if}
        {#if !showPracticeBar}
          <button class="ghost-btn" onclick={() => (showPracticeBar = true)}>
            <Bot size={15} />연습으로 전환
          </button>
        {:else}
          <div class="practice-setup">
            <select class="prac-select" bind:value={cpuJob}>
              <option value="">CPU 직업 (랜덤)</option>
              {#each availableJobs as j}<option value={j}>{j}</option>{/each}
            </select>
            <button class="accent-btn" onclick={startPractice} disabled={busy}>
              <Bot size={15} />연습 시작
            </button>
            <button class="ghost-btn" onclick={() => (showPracticeBar = false)}>취소</button>
          </div>
        {/if}
      </div>

    {:else if !game || game.phase === 'waiting' || game.phase === 'job_selection'}
      <!-- ─── JOB SELECTION ─── -->
      <div class="job-screen">
        <div class="job-screen-header">
          <div>
            <h2>{isBanPicker ? '밴할 직업을 고르세요' : isBanWaiting ? '상대가 밴을 고르는 중' : '직업을 선택하세요'}</h2>
            {#if isBanPicker}
              <p>최대 {maxBanCount}개 선택 · 밴 없이 시작할 수도 있어요</p>
            {:else if isBanWaiting}
              <p>{game.firstPicker}님의 밴 선택이 끝나면 직업을 고를 수 있어요</p>
            {/if}
          </div>
          {#if selectedJob}
            <div class="selected-pill">
              <span class="sel-gem">◆</span>{selectedJob}
            </div>
          {/if}
        </div>

        {#if isBanPicker}
          <div class="ban-panel">
            <div class="ban-panel-top">
              <div>
                <span class="panel-kicker">BAN PHASE</span>
                <strong>{selectedBans.length}/{maxBanCount}</strong>
              </div>
              <div class="ban-actions">
                <button class="action-btn" onclick={() => (selectedBans = [])} disabled={!selectedBans.length || busy}>초기화</button>
                <button class="ban-btn primary" onclick={submitBans} disabled={busy}>
                  <Flag size={14} />확정
                </button>
                <button class="action-btn" onclick={submitBans} disabled={selectedBans.length > 0 || busy}>밴 없이 진행</button>
              </div>
            </div>
            {#if selectedBans.length}
              <div class="selected-ban-row">
                {#each selectedBans as job}
                  <button class="ban-chip selected" onclick={() => toggleBan(job)}>{job}</button>
                {/each}
              </div>
            {:else}
              <div class="ban-empty">아래 직업을 눌러 상대 선택지를 제한하세요</div>
            {/if}
          </div>
        {:else if bannedJobs.length}
          <div class="ban-panel compact">
            <span class="panel-kicker">BANNED</span>
            <div class="selected-ban-row">
              {#each bannedJobs as job}
                <span class="ban-chip locked">{job}</span>
              {/each}
            </div>
          </div>
        {/if}

        <div class="job-grid">
          {#each availableJobs as job, i}
            <button
              class="job-card"
              class:job-selected={selectedJob === job}
              class:job-ban-pick={isBanPicker && selectedBans.includes(job)}
              class:job-banned={bannedJobs.includes(job)}
              style="--i:{i}"
              onclick={() => isBanPicker ? toggleBan(job) : (selectedJob = job, send(`1ㅈㅅ ${job}`))}
              disabled={busy || isBanWaiting || (!isBanPicker && bannedJobs.includes(job)) || (isBanPicker && myState?.job === job)}
            >
              <span class="jc-portrait">
                <img src={jobImageSrc(job)} alt="" loading="lazy" onerror={hideBrokenImage} />
                <span class="jc-initial">{jobInitial(job)}</span>
              </span>
              <span class="jc-name">{job}</span>
              {#if isBanPicker && selectedBans.includes(job)}
                <span class="jc-check">밴</span>
              {:else if bannedJobs.includes(job)}
                <span class="jc-check">잠김</span>
              {:else if selectedJob === job}
                <span class="jc-check">✓</span>
              {/if}
            </button>
          {/each}
        </div>
        {#if !isBanPicker}
          <div class="job-actions">
            <button class="action-btn" onclick={() => send('1ㅈㅅㄹㄷ')} disabled={busy || isBanWaiting}>
              <Shuffle size={16} />랜덤
            </button>
            <div class="job-count">
              선택 가능 <strong>{selectableJobs.length}</strong>개
            </div>
          </div>
        {/if}
        {#if notices.length}
          <div class="notice-list">
            {#each notices as item (item.id)}
              <div class="notice-item">
                <Info size={13} /><span>{item.text}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if game.phase === 'playing'}
      <!-- ─── IN-GAME ─── -->
      <div class="ingame">

        <!-- Syllable Hero Bar -->
        <div class="syl-hero" class:my-turn-hero={canPlay}>
          <div class="syl-meta">
            <span class="syl-meta-item">ROOM <strong>{room}</strong></span>
            <span class="syl-meta-sep">·</span>
            <span class="syl-meta-item">TURN <strong>{game.turnCount || 1}</strong></span>
          </div>
          <div class="syl-display">
            <span class="syl-label">이을 음절</span>
            <div class="syl-main" class:syl-free={nextSyllable === '자유'} class:syl-glow={canPlay}>
              {nextSyllable}
            </div>
          </div>
          <div class="syl-player">
            <span class="syl-player-label">현재 차례</span>
            <span class="syl-player-name" class:syl-myturn={canPlay}>{currentPlayer || '—'}</span>
          </div>
        </div>

        <!-- Three-column game layout -->
        <div class="game-columns">

          <!-- LEFT: Players -->
          <aside class="col-players">
            <div class="col-label">PLAYERS</div>
            {#each game.players || [] as player, index}
              <div class="player-card" class:player-active={player === currentPlayer}>
                <div class="player-avatar" class:avatar-active={player === currentPlayer}>
                  {jobInitial(player)}
                </div>
                <div class="player-body">
                  <div class="player-name">{player}</div>
                  <div class="player-job">
                    {game.playerStates?.[player]?.job || '미선택'}
                  </div>
                  {#if visibleEffects(game.playerStates?.[player]).length}
                    <div class="effect-list">
                      {#each visibleEffects(game.playerStates?.[player]) as ef}
                        <span class="effect-tag">{ef}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
                <div class="team-dot team-{(index % 2) + 1}"></div>
                {#if player === currentPlayer}
                  <div class="turn-indicator"></div>
                {/if}
              </div>
            {/each}
          </aside>

          <!-- CENTER: Board -->
          <main class="col-board">
            <!-- Word history -->
            <div class="word-history" bind:this={historyEl}>
              {#if !(game.history || []).length}
                <div class="history-empty">첫 번째 단어를 입력하세요</div>
              {/if}
              {#each game.history || [] as item, i}
                <div class="word-bubble" style="--bi:{i % 2}">
                  <span class="bubble-text">{item}</span>
                </div>
              {/each}
              {#if cpuThinking}
                <div class="cpu-thinking-row">
                  <span class="think-dot"></span>
                  <span class="think-dot"></span>
                  <span class="think-dot"></span>
                  <span class="think-label">컴퓨터가 생각 중입니다...</span>
                </div>
              {/if}
            </div>
            {#if !cpuThinking && cpuThinkLog.length}
              <details class="think-log-panel">
                <summary>생각 과정 보기</summary>
                {#each cpuThinkLog as item (item.id)}
                  <div class="think-log-entry">{item.text}</div>
                {/each}
              </details>
            {/if}
          </main>

          <!-- RIGHT: Control -->
          <aside class="col-control">
            {#if myState?.job}
              <div class="my-job-panel">
                <div class="mj-badge">MY JOB</div>
                <div class="mj-icon">
                  <img src={jobImageSrc(myState.job)} alt="" onerror={hideBrokenImage} />
                  <span>{jobInitial(myState.job)}</span>
                </div>
                <div class="mj-name">{myState.job}</div>
                {#if visibleEffects(myState).length}
                  <div class="mj-effects">
                    {#each visibleEffects(myState) as ef}
                      <span class="effect-tag">{ef}</span>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            <div class="ctrl-actions">
              <button class="ctrl-btn" onclick={() => send('1무효')} disabled={busy}>
                <Vote size={14} />무효 신청
              </button>
              <button class="ctrl-btn danger" onclick={() => send('ㅈㅈ')} disabled={busy}>
                항복
              </button>
            </div>

            {#if game.isWaitingVote}
              <div class="vote-panel">
                <div class="vote-icon"><Vote size={18} /></div>
                <div class="vote-type">{game.voteType}</div>
                <div class="vote-req">{game.requester} 요청</div>
                <div class="vote-btns">
                  <button class="vote-yes" onclick={() => send('1동의')}>동의</button>
                  <button class="vote-no" onclick={() => send('1거절')}>거절</button>
                </div>
              </div>
            {/if}

            <div class="game-guide-panel">
              <div class="col-label">GAME</div>
              <div class="guide-row">
                <span>시작</span>
                <strong>{(game.history || []).length ? '진행 중' : '아무나 첫 단어'}</strong>
              </div>
              <div class="guide-row">
                <span>첫 수 제한</span>
                <strong>한방 · 유도 불가</strong>
              </div>
              <div class="guide-actions">
                <button class="guide-btn" onclick={() => send('1상태')} disabled={busy}>상태</button>
                <button class="guide-btn" onclick={() => send('1바꾸기')} disabled={busy}>입장</button>
                <button class="guide-btn" onclick={() => send('1킥')} disabled={busy}>잠수</button>
              </div>
            </div>
          </aside>
        </div>

        <div class="bottom-composer" class:composer-active={canPlay}>
          {#if abilityButtons.length}
            <div class="ability-bar">
              <input
                class="ability-target"
                bind:value={ability}
                placeholder="능력 대상"
                disabled={!canPlay}
              />
              <div class="ability-grid">
                {#each abilityButtons as ab, ai}
                  <button
                    class="ab-btn"
                    style="--ai:{ai}"
                    onclick={() => useAbility(ab)}
                    disabled={!canPlay}
                  >
                    <Sparkles size={13} />
                    <span>{ab}</span>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
          <form class="input-zone" class:input-active={canPlay} onsubmit={sendWord}>
            <input
              class="word-input"
              bind:value={word}
              placeholder={canPlay ? `${nextSyllable}(으)로 시작하는 단어` : '상대방 차례...'}
              disabled={!canPlay}
              autocomplete="off"
            />
            <button class="send-btn" class:send-ready={canPlay && word.trim()} type="submit" disabled={!canPlay || !word.trim()}>
              <Send size={17} />
            </button>
          </form>
        </div>
      </div>
    {/if}

    <!-- Match found overlay -->
    {#if showMatchBanner}
      <div class="match-overlay" onclick={() => (showMatchBanner = false)} onkeydown={(e) => e.key === 'Enter' && (showMatchBanner = false)} role="button" tabindex="0">
        <div class="match-particles">
          {#each {length: 18} as _, pi}
            <div class="particle" style="--pi:{pi}"></div>
          {/each}
        </div>
        <div class="match-content">
          <div class="match-swords">⚔️</div>
          <div class="match-title">매칭 완료</div>
          <div class="match-sub">게임을 시작합니다</div>
        </div>
      </div>
    {/if}

  <!-- ══════════════════════ SEARCH TAB ══════════════════════ -->
  {:else if tab === 'search'}
    <div class="content-page">
      <form class="search-bar" onsubmit={submitSearch}>
        <input class="search-input" bind:value={searchText} placeholder="기* · *차 · 기*차 · 기차" />
        <button class="search-submit"><Search size={16} />검색</button>
      </form>
      {#if searchResults.length}
        <div class="search-meta">
          <span>총 <strong>{searchTotal}</strong>개 · 표시 <strong>{filteredSearch.length}</strong>개</span>
          <div class="kind-pills">
            {#each ['전체','한방','유도','루트','일반'] as f}
              <button class="kind-pill" class:kind-active={searchFilter === f} onclick={() => (searchFilter = f)}>{f}</button>
            {/each}
          </div>
        </div>
        <div class="word-grid">
          {#each filteredSearch as r (r.word)}
            <div class="word-card wc-{r.kind}">
              <div class="wc-top">
                <span class="wc-word">{r.word}</span>
                <span class="wc-kind-badge">{r.kind}</span>
              </div>
              <div class="wc-row">
                <span class="wc-len">{r.len}글자</span>
                <span class="wc-path">{r.first} → {r.last}</span>
                <span class="wc-replies">↩ {r.replies}</span>
              </div>
              {#if r.turnsToWin !== null && r.turnsToWin !== undefined}
                <div class="wc-win" class:wc-urgent={r.turnsToWin <= 3}>{r.turnsToWin}턴 뒤 승리</div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

  <!-- ══════════════════════ ANALYSIS TAB ══════════════════════ -->
  {:else if tab === 'analysis'}
    <div class="content-page">
      <div class="job-pair-row">
        <div class="jp-side atk">
          <span class="jp-label">⚔ 공격</span>
          <select class="jp-select" bind:value={analysisJobA}>
            {#each Object.keys(ACTIVE_BY_JOB) as j}<option value={j}>{j}</option>{/each}
          </select>
        </div>
        <div class="jp-vs">VS</div>
        <div class="jp-side def">
          <span class="jp-label">🛡 수비</span>
          <select class="jp-select" bind:value={analysisJobB}>
            {#each Object.keys(ACTIVE_BY_JOB) as j}<option value={j}>{j}</option>{/each}
          </select>
        </div>
      </div>

      <div class="mode-tabs">
        {#each [['syllable','음절 분석'],['I','유도 전체'],['R','루트 전체'],['A','A급 전체'],['K','한방 전체']] as [m, label]}
          <button class="mode-tab mt-{m}" class:mt-active={analysisMode === m} onclick={() => (analysisMode = m)}>{label}</button>
        {/each}
      </div>

      {#if analysisMode === 'syllable'}
        <div class="syl-form-row">
          <input class="syl-inp" bind:value={analysisSyllable} maxlength="1" placeholder="음절" />
          <button class="accent-btn" onclick={runAnalysis} disabled={analysisBusy}><Swords size={16} />분석</button>
        </div>
        <textarea class="situ-text" bind:value={analysisSituation} placeholder="공격: 해커&#10;수비: 사과&#10;음절: 기&#10;기보: 기차 차표"></textarea>
      {:else}
        <button class="accent-btn batch-run" onclick={() => runBatchAnalysis(analysisMode)} disabled={analysisBusy}>
          <Swords size={16} />전체 분석 실행
        </button>
      {/if}

      {#if analysisBusy}
        <div class="analysis-spinner">
          <div class="spin-ring"></div>분석 중...
        </div>
      {/if}

      {#if analysis && analysisMode === 'syllable'}
        {#if analysis.attackerForceSyllables?.length}
          <div class="force-bar">
            <span class="force-lbl">⚡ {analysis.attackerJob} 변환</span>
            {#each analysis.attackerForceSyllables as fs}
              <span class="force-chip">
                <span class="fc-via">{fs.via}</span>→<strong class="fc-syl">{fs.syllable}</strong>
                <span class="fc-cnt">{fs.wordCount}</span>
                {#if fs.profile?.kill}<span class="fc-k">K{fs.profile.kill}</span>{/if}
                {#if fs.profile?.yudo}<span class="fc-i">I{fs.profile.yudo}</span>{/if}
              </span>
            {/each}
          </div>
        {/if}
        <div class="ability-info-row">
          <div class="ai-side ai-atk">
            <span class="ai-label">⚔ {analysis.attackerJob}</span>
            <div class="ai-chips">
              {#each analysis.attackerAbilities?.attack || [] as ab}<span class="ai-chip">{ab}</span>{/each}
            </div>
          </div>
          <div class="ai-side ai-def">
            <span class="ai-label">🛡 {analysis.defenderJob}</span>
            <div class="ai-chips">
              {#each analysis.defenderAbilities?.defense || [] as ab}<span class="ai-chip def">{ab}</span>{/each}
            </div>
          </div>
        </div>
        <div class="summary-grid">
          {#each analysis.summary || [] as item}
            <div class="sum-card" class:sc-win={item.counts?.이김 > 0} class:sc-danger={item.verdict?.includes('위험')}>
              <div class="sc-syl">{item.syllable}</div>
              <div class="sc-verdict">{item.verdict}</div>
              {#if item.winIn}<div class="sc-win-badge">{item.winIn}턴</div>{/if}
              <div class="sc-score">{item.score}pt</div>
            </div>
          {/each}
        </div>
        <div class="detail-grid">
          {#each (analysis.syllables || []).slice(0, 6) as item}
            <div class="detail-card">
              <div class="dc-header">
                <span class="dc-syl">{item.syllable}</span>
                {#if item.profile?.dueumSyllable}
                  <span class="dc-dueum">두음→{item.profile.dueumSyllable}(+{item.profile.dueumExtra})</span>
                {/if}
                <span class="dc-verdict">{item.verdict}</span>
                {#if item.winIn}<span class="dc-win">{item.winIn}턴</span>{/if}
              </div>
              <div class="dc-counts">
                {#each Object.entries(item.counts || {}) as [k, v]}
                  {#if v > 0}<span class="cnt-chip cnt-{k.replace(/ /g,'_')}">{k} {v}</span>{/if}
                {/each}
              </div>
              <div class="move-list">
                {#each (item.best || []).slice(0, 8) as row}
                  <div class="move-block">
                    <div class="move-row">
                      <span class="mv-word">{row.word}</span>
                      <span class="mv-kind mk-{row.kind}">{row.kind}</span>
                      <span class="mv-res mr-{row.result?.replace(/ /g,'_')}">{row.result}</span>
                      <span class="mv-reply">↩{row.replyCount}</span>
                      {#if row.winIn}<span class="mv-win">{row.winIn}턴</span>{/if}
                    </div>
                    <!-- 결과 원인 설명 -->
                    {#if row.resultExplain}
                      <div class="result-explain">💡 {row.resultExplain}</div>
                    {/if}
                    <!-- 상대가 이어야 할 음절 -->
                    {#if row.replySyllables?.length}
                      <div class="sub-row">
                        <span class="sub-lbl">상대 응수:</span>
                        {#each row.replySyllables as syl, si}
                          <span class="rs-chip">{syl}
                            ({row.replyProfiles?.[si]?.total ?? 0}개{row.replyProfiles?.[si]?.kill ? ` · K${row.replyProfiles[si].kill}` : ''}{row.replyProfiles?.[si]?.yudo ? ` · I${row.replyProfiles[si].yudo}` : ''})</span>
                        {/each}
                      </div>
                    {/if}
                    <!-- 수비자 능력 탈출 옵션 -->
                    {#if row.defenderEscapes?.length}
                      <div class="sub-row">
                        <span class="sub-lbl esc-lbl">🛡 {analysis.defenderJob} 탈출:</span>
                        {#each row.defenderEscapes as esc}
                          <span class="esc-chip" class:esc-zero={esc.wordCount === 0}>
                            {esc.via}→{esc.syllable}({esc.wordCount}개{esc.kill ? ` K${esc.kill}` : ''}{esc.yudo ? ` I${esc.yudo}` : ''})
                          </span>
                        {/each}
                      </div>
                    {/if}
                    <!-- 공격자 보유 능력 -->
                    {#if row.attackerAbilities?.length}
                      <div class="sub-row">
                        <span class="sub-lbl atk-lbl">⚔ {analysis.attackerJob}:</span>
                        {#each row.attackerAbilities as ab}<span class="atk-chip">{ab}</span>{/each}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if batchAnalysis && analysisMode !== 'syllable'}
        <div class="batch-header">
          <span class="bh-type">{batchAnalysis.type === 'I' ? '유도' : batchAnalysis.type === 'R' ? '루트' : batchAnalysis.type === 'A' ? 'A급' : '한방'}음절</span>
          <span class="bh-count">총 {batchAnalysis.total}개</span>
          <span class="bh-vs">{batchAnalysis.attackerJob} vs {batchAnalysis.defenderJob}</span>
        </div>
        <div class="batch-grid">
          {#each (batchAnalysis.syllables || []).slice(0, 60) as item}
            <div class="batch-card bc-w{item.winIn || 0}">
              <div class="bc-top">
                <span class="bc-syl">{item.syllable}</span>
                {#if item.winIn}<span class="bc-win">{item.winIn}턴</span>{/if}
              </div>
              <div class="bc-verdict">{item.verdict}</div>
              <div class="bc-score">{item.score}pt · {item.profile?.total || 0}개</div>
              <div class="bc-moves">
                {#each (item.best || []).slice(0, 3) as row}
                  <div class="bc-move">
                    <span class="mv-word">{row.word}</span>
                    <span class="mv-kind mk-{row.kind}">{row.kind}</span>
                    {#if row.winIn}<span class="mv-win">{row.winIn}턴</span>{/if}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  <!-- ══════════════════════ RANKING TAB ══════════════════════ -->
  {:else}
    <div class="content-page rank-page">
      <h2 class="rank-title">랭킹</h2>
      {#each ranking?.ranking || [] as row, index}
        <div class="rank-row" style="--ri:{index}">
          <div class="rank-num" class:rank-top={index < 3}>
            {#if index === 0}🥇{:else if index === 1}🥈{:else if index === 2}🥉{:else}{index + 1}{/if}
          </div>
          <div class="rank-avatar">{row.name[0]}</div>
          <div class="rank-info">
            <span class="rank-name">{row.name}</span>
            <span class="rank-record">{row.wins || 0}W / {row.losses || 0}L</span>
          </div>
          <div class="rank-rating">{row.rating || 1000}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* ═══════════════════════════════════════════
     TOKENS & RESET
  ═══════════════════════════════════════════ */
  :global(*) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    font-family: 'Pretendard', 'Noto Sans KR', Inter, ui-sans-serif, system-ui, sans-serif;
    background: #f7f8fb;
    color: #151922;
    min-height: 100vh;
    overflow-x: hidden;
  }
  :root {
    --bg:       #f7f8fb;
    --bg2:      #ffffff;
    --bg3:      #f2f4f8;
    --border:   #e6e9ef;
    --border2:  #d8dde7;
    --accent:   #2563eb;
    --accent2:  #1d4ed8;
    --red:      #dc2626;
    --orange:   #f97316;
    --blue:     #3b82f6;
    --green:    #22c55e;
    --gold:     #f59e0b;
    --text:     #151922;
    --text2:    #596273;
    --text3:    #8a93a3;
    --radius:   8px;
    --radius-sm:8px;
  }

  button, input, select, textarea { font: inherit; color: inherit; }
  button { cursor: pointer; border: none; background: none; }
  button:disabled { opacity: .4; cursor: default; }
  input, select, textarea {
    background: var(--bg3);
    border: 1px solid var(--border2);
    border-radius: var(--radius-sm);
    color: var(--text);
    outline: none;
    transition: border-color .18s, box-shadow .18s;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(99,102,241,.18);
  }
  input, select { height: 40px; padding: 0 12px; }
  textarea { padding: 10px 12px; resize: vertical; min-height: 90px; }
  select option { background: #fff; }
  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* ═══════════════════════════════════════════
     TOPBAR
  ═══════════════════════════════════════════ */
  .topbar {
    height: 56px;
    background: rgba(255,255,255,.92);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 16px;
    position: sticky;
    top: 0;
    z-index: 100;
    animation: slideDown .3s ease both;
  }
  .brand {
    font-size: 20px;
    font-weight: 900;
    letter-spacing: -.5px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text);
    white-space: nowrap;
  }
  .brand-gem { color: var(--accent); font-size: 14px; }
  .top-nav { display: flex; gap: 4px; flex: 1; }
  .nav-btn {
    height: 36px;
    padding: 0 14px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 600;
    color: var(--text2);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background .18s, color .18s;
  }
  .nav-btn:hover { background: var(--bg3); color: var(--text); }
  .nav-btn.nav-active {
    background: var(--accent);
    color: #fff;
    box-shadow: none;
  }
  .top-auth { display: flex; align-items: center; gap: 8px; margin-left: auto; }
  .auth-name { font-size: 13px; font-weight: 700; color: var(--text2); white-space: nowrap; }
  .auth-input { width: 130px; height: 34px; font-size: 13px; }
  .auth-select { height: 34px; width: 90px; font-size: 13px; }
  .icon-btn {
    width: 36px; height: 36px;
    border-radius: var(--radius-sm);
    background: var(--bg3);
    border: 1px solid var(--border2);
    display: inline-flex; align-items: center; justify-content: center;
    color: var(--text2);
    transition: background .18s, color .18s, border-color .18s;
  }
  .icon-btn:hover:not(:disabled) { background: var(--bg2); color: var(--text); border-color: var(--border2); }
  .icon-btn.accent { background: var(--accent); border-color: var(--accent); color: #fff; }
  .icon-btn.accent:hover:not(:disabled) { background: var(--accent2); border-color: var(--accent2); }

  /* ═══════════════════════════════════════════
     ERROR TOAST
  ═══════════════════════════════════════════ */
  .toast-error {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 12px 20px 0;
    padding: 12px 16px;
    background: rgba(239,68,68,.12);
    border: 1px solid rgba(239,68,68,.3);
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: #b91c1c;
    animation: slideIn .22s ease both;
  }
  .toast-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--red); flex-shrink: 0; animation: pulse 1.4s ease-in-out infinite; }

  /* ═══════════════════════════════════════════
     LOBBY
  ═══════════════════════════════════════════ */
  .lobby {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    position: relative;
    overflow: hidden;
  }
  .lobby-card {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: #fff;
    border: 1px solid var(--border2);
    border-radius: 8px;
    padding: 40px 32px;
    display: flex;
    flex-direction: column;
    gap: 28px;
    box-shadow: 0 18px 50px rgba(15,23,42,.08);
    animation: fadeUp .4s cubic-bezier(.22,1,.36,1) both;
  }
  .lobby-title { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .lobby-gem { font-size: 28px; color: var(--accent); }
  .lobby-title h1 { font-size: 36px; font-weight: 900; letter-spacing: 0; }
  .lobby-title p { font-size: 14px; color: var(--text2); }
  .lobby-fields { display: flex; flex-direction: column; gap: 12px; }
  .login-required {
    min-height: 150px;
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    background: var(--bg3);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px;
    text-align: center;
    color: var(--text2);
  }
  .login-required :global(svg) { color: var(--accent); }
  .login-required strong {
    font-size: 17px;
    color: var(--text);
  }
  .login-required span {
    font-size: 13px;
    line-height: 1.45;
  }
  .player-badge {
    height: 44px;
    border: 1px solid var(--border2);
    border-radius: var(--radius-sm);
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--accent2);
    font-weight: 800;
  }
  .lobby-input { height: 48px; font-size: 15px; border-radius: var(--radius); }
  .mode-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .mode-btn {
    height: 42px;
    border-radius: var(--radius-sm);
    background: var(--bg3);
    border: 1px solid var(--border2);
    font-size: 14px;
    font-weight: 700;
    color: var(--text2);
    transition: background .18s, color .18s, border-color .18s, box-shadow .18s;
  }
  .mode-btn:hover { border-color: var(--accent); color: var(--text); }
  .mode-btn.mode-active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    box-shadow: none;
  }
  .lobby-cta {
    height: 52px;
    border-radius: var(--radius);
    background: var(--accent);
    color: #fff;
    font-size: 16px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background .18s, box-shadow .18s, transform .16s;
    box-shadow: none;
  }
  .lobby-cta:hover:not(:disabled) { background: var(--accent2); transform: translateY(-1px); box-shadow: none; }
  .lobby-cta:active:not(:disabled) { transform: translateY(0); }
  .lobby-sep { display: flex; align-items: center; gap: 12px; color: var(--text3); font-size: 12px; }
  .lobby-sep::before, .lobby-sep::after { content:''; flex:1; height:1px; background: var(--border); }
  .join-row { display: flex; gap: 8px; }
  .join-input { flex: 1; height: 44px; font-size: 14px; border-radius: var(--radius-sm); }
  .join-btn {
    height: 44px;
    padding: 0 20px;
    border-radius: var(--radius-sm);
    background: var(--bg3);
    border: 1px solid var(--border2);
    font-weight: 700;
    font-size: 14px;
    color: var(--text);
    transition: background .18s, border-color .18s;
  }
  .join-btn:hover:not(:disabled) { background: var(--bg2); border-color: var(--accent); }
  .practice-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--text2);
    cursor: pointer;
    user-select: none;
    padding: 4px 0;
  }
  .practice-toggle input[type=checkbox] { display: none; }
  .toggle-track {
    width: 36px; height: 20px;
    border-radius: 999px;
    background: var(--bg3);
    border: 1px solid var(--border2);
    position: relative;
    transition: background .2s;
    flex-shrink: 0;
  }
  .practice-toggle input:checked + .toggle-track { background: var(--accent); border-color: var(--accent); }
  .toggle-thumb {
    position: absolute;
    top: 2px; left: 2px;
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--text2);
    transition: transform .2s, background .2s;
  }
  .practice-toggle input:checked + .toggle-track .toggle-thumb { transform: translateX(16px); background: #fff; }

  /* ═══════════════════════════════════════════
     MATCHING SCREEN
  ═══════════════════════════════════════════ */
  .matching-screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    padding: 60px 20px;
    position: relative;
    overflow: hidden;
  }
  .matching-bg { position: absolute; inset: 0; pointer-events: none; }
  .radar {
    position: relative;
    width: 140px; height: 140px;
    display: flex; align-items: center; justify-content: center;
  }
  .radar-ring {
    position: absolute;
    border-radius: 50%;
    border: 1.5px solid rgba(99,102,241,.3);
    animation: radarExpand 3s ease-out infinite;
  }
  .rr1 { width: 56px; height: 56px; }
  .rr2 { width: 56px; height: 56px; animation-delay: .75s; }
  .rr3 { width: 56px; height: 56px; animation-delay: 1.5s; }
  .rr4 { width: 56px; height: 56px; animation-delay: 2.25s; }
  .radar-core {
    width: 60px; height: 60px;
    border-radius: 50%;
    background: var(--accent);
    display: flex; align-items: center; justify-content: center;
    color: #fff;
    z-index: 1;
    box-shadow: 0 8px 32px rgba(99,102,241,.5);
    animation: corePulse 2s ease-in-out infinite;
  }
  .matching-label {
    font-size: 22px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -.5px;
  }
  .dots::after {
    content: '';
    animation: dotAnim 1.8s steps(1) infinite;
  }
  .room-code-pill {
    border: 1px solid var(--border2);
    border-radius: 999px;
    padding: 8px 22px;
    font-size: 14px;
    color: var(--text2);
    background: var(--bg3);
  }
  .room-code-pill strong { color: var(--accent2); margin-left: 6px; letter-spacing: 1px; }
  .players-found { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
  .found-chip {
    border: 1.5px solid var(--accent);
    border-radius: 999px;
    padding: 8px 20px;
    font-size: 14px;
    font-weight: 700;
    color: var(--accent2);
    background: rgba(99,102,241,.1);
    animation: popIn .35s cubic-bezier(.34,1.56,.64,1) both;
  }
  .ghost-btn {
    height: 40px;
    padding: 0 18px;
    border-radius: 999px;
    border: 1px solid var(--border2);
    background: transparent;
    color: var(--text2);
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: border-color .18s, color .18s;
  }
  .ghost-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--text); }
  .accent-btn {
    height: 42px;
    padding: 0 20px;
    border-radius: var(--radius-sm);
    background: var(--accent);
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    transition: background .18s, box-shadow .18s;
    box-shadow: 0 4px 16px rgba(99,102,241,.35);
  }
  .accent-btn:hover:not(:disabled) { background: var(--accent2); }
  .practice-setup { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: center; animation: fadeUp .2s ease both; }
  .prac-select { height: 40px; min-width: 160px; }

  /* ═══════════════════════════════════════════
     JOB SELECTION
  ═══════════════════════════════════════════ */
  .job-screen {
    flex: 1;
    padding: 28px 24px;
    max-width: 980px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    animation: fadeUp .3s ease both;
  }
  .job-screen-header {
    display: flex;
    align-items: center;
    gap: 16px;
    justify-content: space-between;
  }
  .job-screen-header p {
    margin-top: 6px;
    font-size: 13px;
    color: var(--text2);
  }
  .job-screen-header h2 {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -.5px;
  }
  .selected-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1.5px solid var(--accent);
    border-radius: 999px;
    padding: 5px 16px;
    font-size: 13px;
    font-weight: 700;
    color: var(--accent2);
    background: #eff6ff;
    animation: popIn .25s cubic-bezier(.34,1.56,.64,1) both;
  }
  .sel-gem { font-size: 11px; }
  .ban-panel {
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    background: #fff;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 12px 30px rgba(15,23,42,.06);
  }
  .ban-panel.compact {
    box-shadow: none;
    padding: 12px 14px;
  }
  .ban-panel-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .ban-panel-top strong {
    display: block;
    margin-top: 2px;
    font-size: 22px;
    line-height: 1;
  }
  .panel-kicker {
    font-size: 11px;
    font-weight: 800;
    color: var(--text3);
    letter-spacing: 1px;
  }
  .ban-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .selected-ban-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .ban-empty {
    min-height: 36px;
    display: flex;
    align-items: center;
    color: var(--text3);
    font-size: 13px;
  }
  .ban-chip {
    min-height: 32px;
    border-radius: var(--radius-sm);
    padding: 0 12px;
    border: 1px solid var(--border2);
    background: var(--bg3);
    color: var(--text2);
    font-size: 13px;
    font-weight: 800;
  }
  .ban-chip.selected {
    background: #fee2e2;
    border-color: #fecaca;
    color: #b91c1c;
  }
  .ban-chip.locked {
    display: inline-flex;
    align-items: center;
    background: #f1f5f9;
    color: #475569;
  }
  .job-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 10px;
  }
  .job-card {
    height: 92px;
    border-radius: var(--radius);
    background: #fff;
    border: 1px solid var(--border2);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    animation: jobIn .5s cubic-bezier(.22,1,.36,1) both;
    animation-delay: calc(var(--i) * 22ms);
    transition: border-color .18s, background .18s, transform .18s, box-shadow .18s;
  }
  .job-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: #eff6ff;
    opacity: 0;
    transition: opacity .18s;
  }
  .job-card:hover:not(:disabled):not(.job-selected) {
    border-color: var(--accent);
    transform: translateY(-3px) scale(1.03);
    box-shadow: 0 10px 22px rgba(15,23,42,.08);
  }
  .job-card:hover:not(:disabled)::before { opacity: 1; }
  .job-card.job-selected {
    background: var(--accent);
    border-color: var(--accent);
    box-shadow: 0 12px 28px rgba(37,99,235,.22);
    transform: scale(1.06);
    animation: jobIn .5s cubic-bezier(.22,1,.36,1) both, selectedGlow 2s ease-in-out infinite;
  }
  .jc-portrait {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #e0ecff;
    border: 2px solid rgba(37,99,235,.18);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
    z-index: 1;
  }
  .jc-portrait img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .jc-portrait img:not([hidden]) + .jc-initial { display: none; }
  .jc-initial {
    font-size: 22px;
    font-weight: 900;
    line-height: 1;
    color: var(--accent2);
    transition: color .18s;
  }
  .job-card.job-selected .jc-portrait {
    border-color: rgba(255,255,255,.7);
    background: rgba(255,255,255,.18);
  }
  .job-card.job-selected .jc-initial { color: rgba(255,255,255,.7); }
  .jc-name {
    font-size: 12px;
    font-weight: 700;
    color: var(--text2);
    transition: color .18s;
    position: relative;
    z-index: 1;
  }
  .job-card.job-selected .jc-name { color: #fff; }
  .job-card.job-ban-pick {
    background: #fee2e2;
    border-color: #ef4444;
    box-shadow: 0 12px 28px rgba(220,38,38,.16);
  }
  .job-card.job-ban-pick .jc-initial,
  .job-card.job-ban-pick .jc-name,
  .job-card.job-ban-pick .jc-check {
    color: #b91c1c;
  }
  .job-card.job-ban-pick .jc-portrait {
    border-color: #ef4444;
    background: #fecaca;
  }
  .job-card.job-banned {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #94a3b8;
  }
  .job-card.job-banned .jc-initial,
  .job-card.job-banned .jc-name,
  .job-card.job-banned .jc-check {
    color: #94a3b8;
  }
  .job-card.job-banned .jc-portrait {
    filter: grayscale(.8);
    opacity: .55;
  }
  .jc-check {
    position: absolute;
    top: 7px; right: 9px;
    font-size: 12px;
    color: rgba(255,255,255,.8);
    animation: popIn .2s ease both;
    z-index: 2;
  }
  .job-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .job-count {
    font-size: 13px;
    color: var(--text2);
    margin-left: auto;
  }
  .job-count strong { color: var(--accent2); }
  .action-btn {
    height: 40px;
    padding: 0 18px;
    border-radius: var(--radius-sm);
    background: var(--bg3);
    border: 1px solid var(--border2);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    display: inline-flex;
    align-items: center;
    gap: 7px;
    transition: background .18s, border-color .18s;
  }
  .action-btn:hover:not(:disabled) { background: var(--bg2); border-color: var(--accent); }
  .ban-btn {
    height: 40px;
    padding: 0 14px;
    border-radius: var(--radius-sm);
    background: #fee2e2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    font-size: 13px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background .18s;
  }
  .ban-btn.primary {
    background: var(--red);
    border-color: var(--red);
    color: #fff;
  }
  .ban-btn:hover:not(:disabled) { background: #fecaca; }
  .ban-btn.primary:hover:not(:disabled) { background: #b91c1c; }
  .notice-list { display: flex; flex-direction: column; gap: 6px; }
  .notice-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 14px;
    border: 1px solid var(--border2);
    border-radius: var(--radius-sm);
    background: var(--bg3);
    font-size: 13px;
    color: var(--text2);
    animation: slideIn .24s ease both;
  }
  .notice-item :global(svg) { flex-shrink: 0; margin-top: 1px; color: var(--accent2); }

  /* ═══════════════════════════════════════════
     IN-GAME
  ═══════════════════════════════════════════ */
  .ingame {
    flex: 1;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    min-height: calc(100dvh - 56px);
    animation: fadeUp .25s ease both;
  }

  /* Syllable Hero */
  .syl-hero {
    padding: 14px 24px;
    background: var(--bg2);
    border-bottom: 1px solid var(--border);
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 20px;
    transition: background .3s;
  }
  .syl-hero.my-turn-hero { background: rgba(99,102,241,.08); border-bottom-color: rgba(99,102,241,.25); }
  .syl-meta { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text3); }
  .syl-meta-item strong { color: var(--text2); margin-left: 4px; font-size: 13px; }
  .syl-meta-sep { color: var(--border2); }
  .syl-display { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .syl-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: var(--text3); text-transform: uppercase; }
  .syl-main {
    font-size: 48px;
    font-weight: 900;
    letter-spacing: -2px;
    line-height: 1;
    color: var(--text);
    transition: color .3s, text-shadow .3s;
  }
  .syl-main.syl-free { color: var(--text3); }
  .syl-main.syl-glow {
    color: var(--accent2);
    text-shadow: 0 0 24px rgba(99,102,241,.6), 0 0 48px rgba(99,102,241,.3);
    animation: sylPulse 1.6s ease-in-out infinite;
  }
  .syl-player { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .syl-player-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: var(--text3); text-transform: uppercase; }
  .syl-player-name { font-size: 16px; font-weight: 800; color: var(--text2); transition: color .2s; }
  .syl-player-name.syl-myturn { color: var(--accent2); animation: namePulse 1.4s ease-in-out infinite; }

  /* Game columns */
  .game-columns {
    display: grid;
    grid-template-columns: 220px minmax(0,1fr) 260px;
    min-height: 0;
    overflow: hidden;
  }
  .col-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--text3);
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  /* Players column */
  .col-players {
    padding: 16px 14px;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    background: var(--bg2);
  }
  .player-card {
    position: relative;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: var(--bg3);
    transition: border-color .2s, box-shadow .2s;
    overflow: hidden;
    animation: fadeUp .22s ease both;
  }
  .player-card.player-active {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(99,102,241,.2), 0 8px 24px rgba(99,102,241,.15);
  }
  .player-avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; font-weight: 800;
    flex-shrink: 0;
    color: var(--text2);
    transition: background .2s, border-color .2s, color .2s;
  }
  .player-avatar.avatar-active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    box-shadow: 0 4px 16px rgba(99,102,241,.4);
  }
  .player-body { flex: 1; min-width: 0; }
  .player-name { font-size: 13px; font-weight: 700; overflow-wrap: anywhere; }
  .player-job { font-size: 11px; color: var(--text3); margin-top: 2px; }
  .effect-list { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 6px; }
  .effect-tag {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 999px;
    background: rgba(249,115,22,.12);
    border: 1px solid rgba(249,115,22,.3);
    color: #fdba74;
    animation: popIn .18s ease both;
  }
  .team-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 4px;
  }
  .team-dot.team-1 { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
  .team-dot.team-2 { background: var(--red); box-shadow: 0 0 6px var(--red); }
  .turn-indicator {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: var(--accent);
    border-radius: 0 2px 2px 0;
    animation: turnBar 1.6s ease-in-out infinite;
  }

  /* Board column */
  .col-board {
    display: flex;
    flex-direction: column;
    padding: 16px;
    overflow: hidden;
  }
  .word-history {
    flex: 1;
    min-height: 200px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg2);
    padding: 14px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    scroll-behavior: smooth;
  }
  .history-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--text3);
    font-style: italic;
  }
  .word-bubble {
    display: flex;
    justify-content: calc(var(--bi) * 100%);
    animation: bubbleIn .3s cubic-bezier(.22,1,.36,1) both;
  }
  .word-bubble:nth-child(odd) { justify-content: flex-start; }
  .word-bubble:nth-child(even) { justify-content: flex-end; }
  .bubble-text {
    display: inline-block;
    padding: 7px 14px;
    border-radius: 18px;
    font-size: 15px;
    font-weight: 600;
    max-width: 75%;
    word-break: break-all;
    border: 1px solid var(--border2);
    background: var(--bg3);
    color: var(--text);
    transition: border-color .15s, box-shadow .15s;
  }
  .word-bubble:nth-child(even) .bubble-text {
    background: rgba(99,102,241,.12);
    border-color: rgba(99,102,241,.25);
    color: var(--accent2);
  }
  .bubble-text:hover { border-color: var(--accent); box-shadow: 0 4px 12px rgba(99,102,241,.15); }

  /* Input zone */
  .bottom-composer {
    border-top: 1px solid var(--border);
    background: rgba(255,255,255,.96);
    backdrop-filter: blur(14px);
    padding: 12px 16px;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    z-index: 40;
    box-shadow: 0 -14px 36px rgba(15,23,42,.06);
  }
  .bottom-composer.composer-active {
    border-top-color: rgba(37,99,235,.25);
  }
  .input-zone {
    display: flex;
    gap: 8px;
    transition: opacity .2s;
    width: 100%;
    max-width: 980px;
    margin: 0 auto;
  }
  .word-input {
    flex: 1;
    height: 50px;
    font-size: 16px;
    font-weight: 700;
    border-radius: var(--radius);
    transition: border-color .18s, box-shadow .18s;
  }
  .input-zone.input-active .word-input {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(99,102,241,.18);
  }
  .send-btn {
    width: 50px; height: 50px;
    border-radius: var(--radius);
    background: var(--bg3);
    border: 1px solid var(--border2);
    display: flex; align-items: center; justify-content: center;
    color: var(--text3);
    transition: background .18s, border-color .18s, color .18s, box-shadow .18s;
    flex-shrink: 0;
  }
  .send-btn.send-ready {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    box-shadow: 0 4px 20px rgba(99,102,241,.45);
    animation: sendPulse 1.8s ease-in-out infinite;
  }

  /* Ability bar */
  .ability-bar {
    width: 100%;
    max-width: 980px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(140px, 220px) minmax(0, 1fr);
    align-items: start;
    gap: 8px;
    animation: fadeUp .3s ease both;
  }
  .ability-target { height: 38px; font-size: 13px; border-radius: var(--radius-sm); }
  .ability-grid { display: flex; flex-wrap: wrap; gap: 7px; }
  .ab-btn {
    height: 38px;
    padding: 0 14px;
    border-radius: var(--radius-sm);
    background: var(--bg3);
    border: 1px solid var(--border2);
    font-size: 13px;
    font-weight: 700;
    color: var(--text2);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    position: relative;
    overflow: hidden;
    animation: fadeUp .25s ease both;
    animation-delay: calc(var(--ai) * 40ms);
    transition: border-color .18s, color .18s, background .18s, box-shadow .18s;
  }
  .ab-btn:not(:disabled):hover {
    border-color: var(--accent);
    color: var(--accent2);
    background: rgba(99,102,241,.1);
    box-shadow: 0 4px 14px rgba(99,102,241,.2);
  }
  .ab-btn::after {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.06), transparent);
    animation: shimmer 3.5s ease-in-out infinite;
  }

  /* Control column */
  .col-control {
    border-left: 1px solid var(--border);
    padding: 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
    background: var(--bg2);
  }
  .my-job-panel {
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    padding: 16px;
    background: var(--bg3);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    animation: fadeUp .22s ease both;
    position: relative;
    overflow: hidden;
  }
  .my-job-panel::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(99,102,241,.08), transparent);
    pointer-events: none;
  }
  .mj-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--accent2);
    text-transform: uppercase;
  }
  .mj-icon {
    width: 52px; height: 52px;
    border-radius: 50%;
    background: var(--accent);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 900;
    color: #fff;
    box-shadow: 0 8px 24px rgba(99,102,241,.4);
    overflow: hidden;
    position: relative;
  }
  .mj-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .mj-icon img:not([hidden]) + span {
    display: none;
  }
  .mj-name { font-size: 20px; font-weight: 900; letter-spacing: -.5px; }
  .mj-effects { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
  .ctrl-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .ctrl-btn {
    height: 40px;
    border-radius: var(--radius-sm);
    background: var(--bg3);
    border: 1px solid var(--border2);
    font-size: 13px;
    font-weight: 700;
    color: var(--text2);
    display: flex; align-items: center; justify-content: center; gap: 6px;
    transition: background .18s, border-color .18s, color .18s;
  }
  .ctrl-btn:hover:not(:disabled) { background: var(--bg2); border-color: var(--accent); color: var(--text); }
  .ctrl-btn.danger:hover:not(:disabled) { border-color: var(--red); color: #fca5a5; background: rgba(239,68,68,.1); }
  .vote-panel {
    border: 1.5px solid var(--accent);
    border-radius: var(--radius);
    padding: 16px;
    background: rgba(99,102,241,.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    animation: voteIn .3s cubic-bezier(.34,1.56,.64,1) both;
  }
  .vote-icon { color: var(--accent2); }
  .vote-type { font-size: 16px; font-weight: 800; }
  .vote-req { font-size: 12px; color: var(--text2); }
  .vote-btns { display: flex; gap: 8px; width: 100%; }
  .vote-yes {
    flex: 1; height: 38px;
    border-radius: var(--radius-sm);
    background: var(--accent); color: #fff;
    font-weight: 800; font-size: 14px;
    transition: background .18s;
  }
  .vote-yes:hover { background: var(--accent2); }
  .vote-no {
    flex: 1; height: 38px;
    border-radius: var(--radius-sm);
    background: transparent;
    border: 1px solid var(--border2);
    color: var(--text2);
    font-weight: 700; font-size: 14px;
    transition: background .18s, border-color .18s;
  }
  .vote-no:hover { background: var(--bg3); border-color: var(--red); color: #fca5a5; }
  .notice-panel { display: flex; flex-direction: column; gap: 6px; }
  .notice-panel .notice-item { padding: 8px 10px; font-size: 12px; }
  .notice-text { font-size: 12px; color: var(--text2); line-height: 1.5; }
  .game-guide-panel {
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    background: var(--bg3);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .guide-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 12px;
    color: var(--text2);
  }
  .guide-row strong {
    color: var(--text);
    font-size: 12px;
    text-align: right;
  }
  .guide-actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .guide-btn {
    height: 34px;
    border-radius: var(--radius-sm);
    background: #fff;
    border: 1px solid var(--border2);
    color: var(--text2);
    font-size: 12px;
    font-weight: 800;
  }
  .guide-btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent2);
  }

  /* ═══════════════════════════════════════════
     MATCH OVERLAY
  ═══════════════════════════════════════════ */
  .match-overlay {
    position: fixed; inset: 0;
    background: rgba(5,5,12,.95);
    display: flex; align-items: center; justify-content: center;
    z-index: 300;
    cursor: pointer;
    animation: overlayIn .3s ease both;
  }
  .match-particles { position: absolute; inset: 0; pointer-events: none; }
  .particle {
    position: absolute;
    top: 50%; left: 50%;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: particleFly 1.2s cubic-bezier(.22,1,.36,1) both;
    animation-delay: calc(var(--pi) * 40ms);
    transform-origin: center;
    --angle: calc(var(--pi) * 20deg);
    --dist: calc(180px + var(--pi) * 12px);
  }
  .particle:nth-child(3n) { background: #ec4899; }
  .particle:nth-child(3n+1) { background: var(--gold); }
  .match-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: #fff;
    text-align: center;
    position: relative;
    animation: matchPop .5s cubic-bezier(.34,1.56,.64,1) .1s both;
  }
  .match-swords {
    font-size: 80px;
    line-height: 1;
    animation: iconBounce .6s cubic-bezier(.34,1.56,.64,1) both;
    filter: drop-shadow(0 0 32px rgba(99,102,241,.7));
  }
  .match-title {
    font-size: 52px;
    font-weight: 900;
    letter-spacing: -3px;
    background: linear-gradient(135deg, #fff, var(--accent2));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .match-sub { font-size: 16px; color: rgba(255,255,255,.45); animation: fadeUp .4s ease .4s both; }

  /* ═══════════════════════════════════════════
     CONTENT PAGE (search/analysis/ranking)
  ═══════════════════════════════════════════ */
  .content-page {
    flex: 1;
    padding: 24px;
    max-width: 1120px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
    animation: fadeUp .28s ease both;
  }

  /* Search */
  .search-bar { display: flex; gap: 10px; }
  .search-input { flex: 1; height: 48px; font-size: 16px; border-radius: var(--radius); }
  .search-submit {
    height: 48px; padding: 0 24px;
    border-radius: var(--radius);
    background: var(--accent);
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    display: inline-flex; align-items: center; gap: 8px;
    transition: background .18s, box-shadow .18s;
    box-shadow: 0 4px 16px rgba(99,102,241,.35);
  }
  .search-submit:hover { background: var(--accent2); }
  .search-meta { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: 13px; color: var(--text2); }
  .search-meta strong { color: var(--text); }
  .kind-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .kind-pill {
    height: 30px; padding: 0 14px;
    border-radius: 999px;
    border: 1px solid var(--border2);
    background: transparent;
    font-size: 12px; font-weight: 700;
    color: var(--text2);
    transition: background .18s, border-color .18s, color .18s;
  }
  .kind-pill:hover { border-color: var(--accent); color: var(--text); }
  .kind-pill.kind-active { background: var(--accent); border-color: var(--accent); color: #fff; }
  .word-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap: 10px; }
  .word-card {
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 14px;
    background: var(--bg2);
    display: flex; flex-direction: column; gap: 7px;
    animation: popIn .22s cubic-bezier(.34,1.56,.64,1) both;
    transition: border-color .15s, box-shadow .15s, transform .15s;
  }
  .word-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.25); }
  .word-card.wc-한방 { border-color: rgba(239,68,68,.3); background: rgba(239,68,68,.05); }
  .word-card.wc-유도 { border-color: rgba(249,115,22,.3); background: rgba(249,115,22,.05); }
  .word-card.wc-루트 { border-color: rgba(59,130,246,.3); background: rgba(59,130,246,.05); }
  .wc-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .wc-word { font-size: 17px; font-weight: 800; overflow-wrap: anywhere; }
  .wc-kind-badge {
    font-size: 11px; font-weight: 800;
    padding: 2px 8px; border-radius: 999px;
    border: 1px solid currentColor; flex-shrink: 0;
  }
  .wc-한방 .wc-kind-badge { color: var(--red); }
  .wc-유도 .wc-kind-badge { color: var(--orange); }
  .wc-루트 .wc-kind-badge { color: var(--blue); }
  .wc-일반 .wc-kind-badge { color: var(--text3); }
  .wc-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; color: var(--text3); }
  .wc-win {
    font-size: 11px; font-weight: 800;
    padding: 3px 10px; border-radius: 999px;
    background: rgba(34,197,94,.15);
    border: 1px solid rgba(34,197,94,.3);
    color: var(--green);
  }
  .wc-win.wc-urgent { background: rgba(245,158,11,.15); border-color: rgba(245,158,11,.3); color: var(--gold); }

  /* Analysis */
  .job-pair-row {
    display: flex; align-items: center; gap: 16px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
  }
  .jp-side { flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .jp-label { font-size: 12px; font-weight: 700; color: var(--text3); }
  .jp-side.atk .jp-label { color: #fca5a5; }
  .jp-side.def .jp-label { color: #93c5fd; }
  .jp-select { height: 44px; font-size: 14px; font-weight: 600; }
  .jp-vs { font-size: 22px; font-weight: 900; color: var(--border2); flex-shrink: 0; }
  .mode-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
  .mode-tab {
    height: 36px; padding: 0 16px;
    border-radius: 999px;
    border: 1px solid var(--border2);
    background: var(--bg3);
    font-size: 13px; font-weight: 600;
    color: var(--text2);
    transition: all .18s;
  }
  .mode-tab:hover { border-color: var(--accent); color: var(--text); }
  .mode-tab.mt-active { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,.3); }
  .mode-tab.mt-I.mt-active { background: var(--orange); border-color: var(--orange); box-shadow: 0 4px 14px rgba(249,115,22,.3); }
  .mode-tab.mt-R.mt-active { background: var(--blue); border-color: var(--blue); box-shadow: 0 4px 14px rgba(59,130,246,.3); }
  .mode-tab.mt-A.mt-active { background: #7c3aed; border-color: #7c3aed; box-shadow: 0 4px 14px rgba(124,58,237,.3); }
  .mode-tab.mt-K.mt-active { background: var(--red); border-color: var(--red); box-shadow: 0 4px 14px rgba(239,68,68,.3); }
  .syl-form-row { display: flex; gap: 10px; align-items: center; }
  .syl-inp { width: 72px; height: 52px; font-size: 26px; font-weight: 900; text-align: center; border-radius: var(--radius-sm); }
  .situ-text { border-radius: var(--radius-sm); min-height: 80px; font-size: 13px; }
  .batch-run { height: 48px; padding: 0 28px; font-size: 15px; align-self: flex-start; }
  .analysis-spinner { display: flex; align-items: center; gap: 14px; padding: 32px; justify-content: center; color: var(--text2); font-size: 14px; }
  .spin-ring { width: 30px; height: 30px; border-radius: 50%; border: 3px solid var(--border2); border-top-color: var(--accent); animation: spin .7s linear infinite; }
  .cpu-thinking-row { display: flex; align-items: center; gap: 5px; padding: 12px 16px; justify-content: center; }
  .think-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); opacity: 0.3; animation: think-pulse .9s ease-in-out infinite; }
  .think-dot:nth-child(2) { animation-delay: .2s; }
  .think-dot:nth-child(3) { animation-delay: .4s; }
  .think-label { font-size: 13px; color: var(--text2); margin-left: 8px; }
  @keyframes think-pulse { 0%,100% { opacity: .25; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.1); } }
  .think-log-panel { margin: 4px 8px 0; border: 1px solid var(--border2); border-radius: 8px; overflow: hidden; font-size: 12px; }
  .think-log-panel summary { padding: 6px 12px; cursor: pointer; color: var(--text2); background: var(--bg2); user-select: none; }
  .think-log-panel summary:hover { color: var(--accent); }
  .think-log-entry { padding: 4px 14px; color: var(--text2); border-top: 1px solid var(--border); background: var(--bg); }
  .force-bar {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 10px 14px;
    background: rgba(245,158,11,.08);
    border: 1px solid rgba(245,158,11,.2);
    border-radius: var(--radius-sm);
    font-size: 12px;
  }
  .force-lbl { font-weight: 700; color: var(--gold); white-space: nowrap; }
  .force-chip {
    display: inline-flex; align-items: center; gap: 4px;
    background: var(--bg3); border: 1px solid rgba(245,158,11,.3); border-radius: 999px;
    padding: 3px 10px; font-size: 12px;
  }
  .fc-via { font-weight: 700; color: var(--gold); font-size: 11px; }
  .fc-syl { font-size: 15px; font-weight: 900; }
  .fc-cnt { color: var(--text3); font-size: 11px; }
  .fc-k { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 999px; background: rgba(239,68,68,.15); color: #fca5a5; }
  .fc-i { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 999px; background: rgba(249,115,22,.15); color: #fdba74; }
  .ability-info-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .ai-side {
    flex: 1; min-width: 180px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 10px 12px;
    display: flex; flex-direction: column; gap: 6px;
  }
  .ai-side.ai-atk { border-color: rgba(239,68,68,.25); background: rgba(239,68,68,.05); }
  .ai-side.ai-def { border-color: rgba(59,130,246,.25); background: rgba(59,130,246,.05); }
  .ai-label { font-size: 11px; font-weight: 700; }
  .ai-side.ai-atk .ai-label { color: #fca5a5; }
  .ai-side.ai-def .ai-label { color: #93c5fd; }
  .ai-chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .ai-chip {
    font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
    background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.25); color: #fca5a5;
  }
  .ai-chip.def { background: rgba(59,130,246,.12); border-color: rgba(59,130,246,.25); color: #93c5fd; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px,1fr)); gap: 8px; }
  .sum-card {
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 12px;
    background: var(--bg2);
    display: flex; flex-direction: column; gap: 4px;
    cursor: default;
    animation: popIn .25s ease both;
    transition: border-color .15s;
  }
  .sum-card:hover { border-color: var(--border2); }
  .sum-card.sc-win { border-color: rgba(34,197,94,.35); background: rgba(34,197,94,.06); }
  .sum-card.sc-danger { border-color: rgba(239,68,68,.35); background: rgba(239,68,68,.06); }
  .sc-syl { font-size: 30px; font-weight: 900; line-height: 1; }
  .sc-verdict { font-size: 11px; color: var(--text3); line-height: 1.3; }
  .sc-win-badge {
    font-size: 11px; font-weight: 800; color: var(--green);
    background: rgba(34,197,94,.12); border-radius: 999px;
    padding: 2px 8px; align-self: flex-start;
  }
  .sc-score { font-size: 11px; color: var(--text3); }
  .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px,1fr)); gap: 12px; }
  .detail-card {
    border: 1.5px solid var(--border); border-radius: var(--radius);
    padding: 14px; background: var(--bg2);
    animation: fadeUp .22s ease both;
  }
  .dc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .dc-syl { font-size: 28px; font-weight: 900; }
  .dc-verdict { font-size: 12px; color: var(--text3); flex: 1; }
  .dc-win {
    font-size: 11px; font-weight: 800; color: var(--green);
    background: rgba(34,197,94,.12); border-radius: 999px; padding: 2px 8px;
  }
  .dc-counts { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
  .cnt-chip {
    border: 1px solid var(--border); border-radius: 999px;
    padding: 2px 9px; font-size: 11px; color: var(--text3);
  }
  .cnt-chip.cnt-이김 { border-color: rgba(34,197,94,.3); color: var(--green); background: rgba(34,197,94,.08); }
  .cnt-chip.cnt-짐 { border-color: rgba(239,68,68,.3); color: #fca5a5; background: rgba(239,68,68,.08); }
  .cnt-chip.cnt-능력_소모_유도 { border-color: rgba(249,115,22,.3); color: #fdba74; background: rgba(249,115,22,.08); }
  .move-list { display: flex; flex-direction: column; gap: 2px; }
  .move-block { border-top: 1px solid var(--border); padding: 5px 0 4px; display: flex; flex-direction: column; gap: 3px; }
  .move-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .mv-word { font-size: 13px; font-weight: 700; min-width: 0; overflow-wrap: anywhere; }
  .mv-kind {
    font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; flex-shrink: 0;
  }
  .mk-한방 { background: rgba(239,68,68,.15); color: #fca5a5; }
  .mk-유도 { background: rgba(249,115,22,.15); color: #fdba74; }
  .mk-루트 { background: rgba(59,130,246,.15); color: #93c5fd; }
  .mk-일반 { background: var(--bg3); color: var(--text3); }
  .mv-res { font-size: 11px; color: var(--text3); flex-shrink: 0; }
  .mr-이김 { color: var(--green); font-weight: 700; }
  .mr-짐 { color: var(--red); font-weight: 700; }
  .mv-reply { font-size: 11px; color: var(--text3); flex-shrink: 0; }
  .mv-win {
    font-size: 10px; font-weight: 800; color: var(--green);
    background: rgba(34,197,94,.12); border-radius: 999px; padding: 1px 6px; flex-shrink: 0;
  }
  .sub-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 2px 0; }
  .sub-lbl { font-size: 10px; color: var(--text3); white-space: nowrap; }
  .esc-lbl { color: #93c5fd; font-weight: 700; }
  .atk-lbl { color: #fca5a5; font-weight: 700; }
  .rs-chip {
    font-size: 11px; padding: 1px 7px; border-radius: 999px;
    background: var(--bg3); color: var(--text2);
  }
  .esc-chip {
    font-size: 10px; font-weight: 600; padding: 1px 7px; border-radius: 999px;
    background: rgba(59,130,246,.1); border: 1px solid rgba(59,130,246,.25); color: #93c5fd;
  }
  .esc-chip.esc-zero { background: rgba(34,197,94,.1); border-color: rgba(34,197,94,.25); color: var(--green); }
  .atk-chip {
    font-size: 10px; padding: 1px 7px; border-radius: 999px;
    background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.2); color: #fca5a5;
  }
  .batch-header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .bh-type { font-size: 17px; font-weight: 800; }
  .bh-count, .bh-vs { font-size: 13px; color: var(--text3); }
  .batch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); gap: 10px; }
  .batch-card {
    border: 1.5px solid var(--border); border-radius: var(--radius);
    padding: 12px; background: var(--bg2);
    display: flex; flex-direction: column; gap: 6px;
    animation: popIn .3s cubic-bezier(.34,1.56,.64,1) both;
    transition: border-color .15s, box-shadow .15s;
  }
  .batch-card:hover { border-color: var(--border2); box-shadow: 0 6px 20px rgba(0,0,0,.2); }
  .batch-card.bc-w1 { border-color: rgba(34,197,94,.4); background: rgba(34,197,94,.06); }
  .batch-card.bc-w2 { border-color: rgba(101,163,13,.4); background: rgba(101,163,13,.06); }
  .batch-card.bc-w3 { border-color: rgba(245,158,11,.4); background: rgba(245,158,11,.06); }
  .bc-top { display: flex; align-items: center; justify-content: space-between; }
  .bc-syl { font-size: 32px; font-weight: 900; line-height: 1; }
  .bc-win {
    font-size: 12px; font-weight: 800; padding: 3px 8px; border-radius: 999px;
    background: var(--bg3); color: var(--text2);
  }
  .bc-w1 .bc-win { background: rgba(34,197,94,.2); color: var(--green); }
  .bc-w2 .bc-win { background: rgba(101,163,13,.2); color: #86efac; }
  .bc-w3 .bc-win { background: rgba(245,158,11,.2); color: var(--gold); }
  .bc-verdict { font-size: 11px; color: var(--text3); line-height: 1.3; }
  .bc-score { font-size: 11px; color: var(--text3); }
  .bc-moves { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
  .bc-move { display: flex; align-items: center; gap: 5px; font-size: 12px; }

  /* Ranking */
  .rank-page { max-width: 640px; }
  .rank-title { font-size: 24px; font-weight: 900; letter-spacing: -.5px; }
  .rank-row {
    display: flex; align-items: center; gap: 14px;
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 14px 18px; background: var(--bg2);
    animation: fadeUp .2s ease both;
    animation-delay: calc(var(--ri) * 40ms);
    transition: border-color .18s;
  }
  .rank-row:hover { border-color: var(--border2); }
  .rank-num { width: 36px; text-align: center; font-size: 18px; font-weight: 900; color: var(--text3); }
  .rank-num.rank-top { font-size: 22px; }
  .rank-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: var(--accent); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px; font-weight: 900;
    box-shadow: 0 4px 14px rgba(99,102,241,.3);
    flex-shrink: 0;
  }
  .rank-info { flex: 1; min-width: 0; }
  .rank-name { font-size: 15px; font-weight: 800; display: block; overflow-wrap: anywhere; }
  .rank-record { font-size: 12px; color: var(--text3); }
  .rank-rating { font-size: 20px; font-weight: 900; color: var(--accent2); letter-spacing: -.5px; }

  /* ═══════════════════════════════════════════
     KEYFRAMES
  ═══════════════════════════════════════════ */
  @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes popIn { from { opacity:0; transform:scale(.85); } to { opacity:1; transform:scale(1); } }
  @keyframes slideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
  @keyframes bubbleIn { from { opacity:0; transform:translateY(10px) scale(.92); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes jobIn { from { opacity:0; transform:translateY(16px) scale(.88); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes radarExpand { 0% { transform:scale(1); opacity:.5; } 100% { transform:scale(3.5); opacity:0; } }
  @keyframes corePulse { 0%,100% { box-shadow:0 8px 32px rgba(99,102,241,.5); } 50% { box-shadow:0 8px 48px rgba(99,102,241,.8); } }
  @keyframes orbFloat { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(30px,-20px) scale(1.05); } }
  @keyframes gemSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
  @keyframes selectedGlow {
    0%,100% { box-shadow:0 12px 36px rgba(99,102,241,.45); }
    50% { box-shadow:0 16px 48px rgba(99,102,241,.7); }
  }
  @keyframes sylPulse {
    0%,100% { text-shadow:0 0 24px rgba(99,102,241,.6),0 0 48px rgba(99,102,241,.3); }
    50% { text-shadow:0 0 36px rgba(99,102,241,.9),0 0 72px rgba(99,102,241,.5); }
  }
  @keyframes namePulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
  @keyframes turnBar { 0%,100% { opacity:1; } 50% { opacity:.4; } }
  @keyframes sendPulse { 0%,100% { box-shadow:0 4px 20px rgba(99,102,241,.45); } 50% { box-shadow:0 4px 28px rgba(99,102,241,.7); } }
  @keyframes shimmer { 0% { left:-100%; } 60%,100% { left:180%; } }
  @keyframes pulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.3); opacity:.7; } }
  @keyframes voteIn { from { opacity:0; transform:scale(.88); } to { opacity:1; transform:scale(1); } }
  @keyframes overlayIn { from { opacity:0; } to { opacity:1; } }
  @keyframes matchPop { from { opacity:0; transform:scale(.5); } to { opacity:1; transform:scale(1); } }
  @keyframes iconBounce { from { opacity:0; transform:rotate(-180deg) scale(0); } to { opacity:1; transform:rotate(0) scale(1); } }
  @keyframes particleFly {
    0% { transform:translate(-50%,-50%) rotate(var(--angle)) translateX(0) scale(1); opacity:1; }
    100% { transform:translate(-50%,-50%) rotate(var(--angle)) translateX(var(--dist)) scale(0); opacity:0; }
  }
  @keyframes dotAnim { 0%{content:''} 25%{content:'.'} 50%{content:'..'} 75%{content:'...'} 100%{content:''} }
  @keyframes spin { to { transform:rotate(360deg); } }

  /* ═══════════════════════════════════════════
     RESPONSIVE
  ═══════════════════════════════════════════ */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; }
  }
  @media (max-width:1000px) {
    .game-columns { grid-template-columns: 190px minmax(0,1fr) 220px; }
  }
  @media (max-width:800px) {
    .ingame { min-height: calc(100dvh - 104px); }
    .game-columns { grid-template-columns: 1fr; overflow-y: auto; }
    .col-players { border-right: none; border-bottom: 1px solid var(--border); max-height: 180px; flex-direction: row; flex-wrap: wrap; gap: 8px; }
    .col-control { border-left: none; border-top: 1px solid var(--border); }
    .col-board { min-height: 300px; }
    .job-pair-row { flex-direction: column; }
    .jp-vs { display: none; }
  }
  @media (max-width:640px) {
    .topbar { height: auto; padding: 10px 14px; flex-wrap: wrap; gap: 10px; }
    .top-nav { order: 3; width: 100%; }
    .nav-btn { flex: 1; justify-content: center; }
    .top-auth { margin-left: 0; }
    .auth-input { width: 100px; }
    .syl-hero { grid-template-columns: 1fr auto; gap: 12px; padding: 12px 16px; }
    .syl-meta { display: none; }
    .syl-main { font-size: 38px; }
    .job-grid { grid-template-columns: repeat(auto-fill, minmax(88px,1fr)); }
    .ban-group { margin-left: 0; }
    .job-actions { flex-wrap: wrap; }
    .word-grid { grid-template-columns: 1fr 1fr; }
    .batch-grid { grid-template-columns: repeat(auto-fill, minmax(130px,1fr)); }
    .content-page { padding: 16px; }
    .match-title { font-size: 40px; }
    .match-swords { font-size: 64px; }
    .bottom-composer { padding: 10px; }
    .ability-bar { grid-template-columns: 1fr; }
    .ability-grid { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 2px; }
    .ab-btn { flex: 0 0 auto; }
  }
</style>
