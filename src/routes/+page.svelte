<script>
  import { browser } from '$app/environment';
  import { onDestroy, tick } from 'svelte';
  import {
    BarChart3, Bot, Flag, Info, LogIn, LogOut, Mail, MessageSquare, Moon, Plus,
    Search, Send, Settings, Shuffle, Sparkles, Sun, Swords, UserRoundPlus, Vote, X
  } from 'lucide-svelte';

  const TIER_INFO = [
    { name: '아이언 V',      min: 0,    max: 39,       color: '#9E9E9E' },
    { name: '아이언 IV',     min: 40,   max: 79,       color: '#9E9E9E' },
    { name: '아이언 III',    min: 80,   max: 119,      color: '#9E9E9E' },
    { name: '아이언 II',     min: 120,  max: 159,      color: '#9E9E9E' },
    { name: '아이언 I',      min: 160,  max: 199,      color: '#9E9E9E' },
    { name: '브론즈 V',      min: 200,  max: 239,      color: '#CD7F32' },
    { name: '브론즈 IV',     min: 240,  max: 279,      color: '#CD7F32' },
    { name: '브론즈 III',    min: 280,  max: 319,      color: '#CD7F32' },
    { name: '브론즈 II',     min: 320,  max: 359,      color: '#CD7F32' },
    { name: '브론즈 I',      min: 360,  max: 399,      color: '#CD7F32' },
    { name: '실버 V',        min: 400,  max: 439,      color: '#B0BEC5' },
    { name: '실버 IV',       min: 440,  max: 479,      color: '#B0BEC5' },
    { name: '실버 III',      min: 480,  max: 519,      color: '#B0BEC5' },
    { name: '실버 II',       min: 520,  max: 559,      color: '#B0BEC5' },
    { name: '실버 I',        min: 560,  max: 599,      color: '#B0BEC5' },
    { name: '골드 V',        min: 600,  max: 639,      color: '#FFD700' },
    { name: '골드 IV',       min: 640,  max: 679,      color: '#FFD700' },
    { name: '골드 III',      min: 680,  max: 719,      color: '#FFD700' },
    { name: '골드 II',       min: 720,  max: 759,      color: '#FFD700' },
    { name: '골드 I',        min: 760,  max: 799,      color: '#FFD700' },
    { name: '플래티넘 V',    min: 800,  max: 839,      color: '#90CAF9' },
    { name: '플래티넘 IV',   min: 840,  max: 879,      color: '#90CAF9' },
    { name: '플래티넘 III',  min: 880,  max: 919,      color: '#90CAF9' },
    { name: '플래티넘 II',   min: 920,  max: 959,      color: '#90CAF9' },
    { name: '플래티넘 I',    min: 960,  max: 999,      color: '#90CAF9' },
    { name: '다이아몬드 V',  min: 1000, max: 1199,     color: '#4FC3F7' },
    { name: '다이아몬드 IV', min: 1200, max: 1399,     color: '#4FC3F7' },
    { name: '다이아몬드 III',min: 1400, max: 1599,     color: '#4FC3F7' },
    { name: '다이아몬드 II', min: 1600, max: 1799,     color: '#4FC3F7' },
    { name: '다이아몬드 I',  min: 1800, max: Infinity, color: '#4FC3F7' },
  ];

  function getTierInfo(rating) {
    const r = Number(rating) || 1000;
    return TIER_INFO.find(t => r >= t.min && r <= t.max) || TIER_INFO[TIER_INFO.length - 1];
  }

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
  let rankMode = $state('overall');
  let rankJob = $state('');
  let matchResult = $state(null);
  let matchResultTimer;
  let tab = $state('game');
  let busy = $state(false);
  let cpuThinking = $state(false);
  let error = $state('');
  let hasMatched = $state(false);
  let poller;
  let socket;
  let historyEl = $state();
  let wordInputEl = $state();
  let jobInfoByJob = $state({});
  let showWordSearch = $state(false);
  let inGameTabs = $state([{ id: Date.now(), query: '', results: [] }]);
  let activeInGameTabId = $state(inGameTabs[0].id);
  const activeInGameTab = $derived(inGameTabs.find(t => t.id === activeInGameTabId) || inGameTabs[0]);

  let showChat = $state(false);
  let chatInput = $state('');
  let chatEl = $state();
  const chats = $derived(snapshot?.chats || []);

  let lineColor = $state(browser ? (localStorage.getItem('lineColor') || '#2563eb') : '#2563eb');
  $effect(() => {
    if (!browser) return;
    localStorage.setItem('lineColor', lineColor);
    document.documentElement.style.setProperty('--accent', lineColor);
    document.documentElement.style.setProperty('--accent2', lineColor);
    document.documentElement.style.setProperty('--my-color', lineColor);
  });

  // Dark/light mode
  let theme = $state('light');
  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    if (browser) {
      localStorage.setItem('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      const metaTheme = document.getElementById('meta-theme-color');
      if (metaTheme) metaTheme.content = theme === 'dark' ? '#111318' : '#f7f8fb';
    }
  }
  $effect(() => {
    if (browser) {
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = saved || (prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    }
  });

  // DM (Direct Message)
  let showDM = $state(false);
  let dmTarget = $state('');
  let dmInput = $state('');
  let dmMessages = $state([]);
  let dmInbox = $state([]);
  let dmEl = $state();

  async function fetchDMConversation() {
    if (!dmTarget.trim() || !user) return;
    try {
      const res = await fetch(`/api/dm?with=${encodeURIComponent(dmTarget.trim())}`);
      if (res.ok) { const d = await res.json(); dmMessages = d.messages || []; }
    } catch {}
  }

  async function fetchDMInbox() {
    if (!user) return;
    try {
      const res = await fetch('/api/dm');
      if (res.ok) { const d = await res.json(); dmInbox = d.inbox || []; }
    } catch {}
  }

  async function sendDM(e) {
    e?.preventDefault?.();
    const text = dmInput.trim();
    const to = dmTarget.trim();
    if (!text || !to || !user) return;
    dmInput = '';
    try {
      await fetch('/api/dm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to, text })
      });
      await fetchDMConversation();
      await fetchDMInbox();
      await tick();
      if (dmEl) dmEl.scrollTop = dmEl.scrollHeight;
    } catch {}
  }

  $effect(() => {
    if (showDM && user) {
      fetchDMInbox();
      const intv = setInterval(() => {
        fetchDMInbox();
        if (dmTarget) fetchDMConversation();
      }, 3000);
      return () => clearInterval(intv);
    }
  });

  $effect(() => {
    if (dmTarget && showDM) fetchDMConversation();
  });

  function addInGameTab() {
    const newId = Date.now();
    inGameTabs = [...inGameTabs, { id: newId, query: '', results: [] }];
    activeInGameTabId = newId;
  }
  function removeInGameTab(id, e) {
    e?.stopPropagation();
    if (inGameTabs.length <= 1) return;
    const idx = inGameTabs.findIndex(t => t.id === id);
    inGameTabs = inGameTabs.filter(t => t.id !== id);
    if (activeInGameTabId === id) {
      activeInGameTabId = inGameTabs[Math.max(0, idx - 1)].id;
    }
  }

  let showMatchBanner = $state(false);
  let showPracticeBar = $state(false);
  let prevPhase = '';
  let matchBannerTimer;

  let ongoingGames = $state([]);
  let now = $state(Date.now());

  const jobs = $derived(snapshot?.status?.jobs || []);
  const availableJobs = $derived(jobs.length ? jobs : Object.keys(ACTIVE_BY_JOB));
  const game = $derived(snapshot?.game || null);
  const myState = $derived(game?.playerStates?.[nickname] || null);
  const currentPlayer = $derived(game?.currentPlayer || '');
  const nextSyllable = $derived(formatSyllable(game));
  const canPlay = $derived(game?.phase === 'playing' && (!currentPlayer || currentPlayer === nickname));
  const myTeamIndex = $derived(game?.players?.indexOf(nickname) ?? -1);
  const currentTeamIndex = $derived(game?.players?.indexOf(currentPlayer) ?? -1);
  const canUseAbility = $derived(
    game?.phase === 'playing' &&
    myState &&
    (canPlay || (game?.teamMode > 1 && myTeamIndex >= 0 && currentTeamIndex >= 0 && myTeamIndex % 2 === currentTeamIndex % 2))
  );
  const log = $derived(snapshot?.log || []);
  const notices = $derived(log.filter((item) => item.type === 'system' && !isGuiOnlyNotice(item.text)).slice(-4).reverse());
  const abilityButtons = $derived(ACTIVE_BY_JOB[myState?.job] || []);
  const myAbilityStatuses = $derived(getPlayerAbilitiesStatus(myState?.job, myState));
  const cpuThinkLog = $derived(
    log.filter(item => item.type === 'system' && (
      item.text?.includes('생각 중이다') ||
      item.text?.includes('분석하며') ||
      item.text?.includes('계산 중')
    )).slice(-5)
  );

  // --- New features ---
  let activeEffects = $state([]);
  let showTargetSelector = $state(null); // { name, type }

  const STATUS_LABELS = {
    jojak_cooldown: '조작 쿨', jojak_uses: '조작 회수',
    bokje_uses: '복제 회수',
    chotohwa_cooldown: '초토화 쿨', chotohwa_uses: '초토화 회수',
    juga_jojak_cooldown: '주가조작 쿨', juga_jojak_uses: '주가조작 회수',
    hallucination_uses: '환각증 회수',
    make_cooldown: '제작 쿨', mine_cooldown: '채굴 쿨', mine_uses: '채굴 회수',
    detect_cooldown: '탐지 쿨', detect_uses: '탐지 회수',
    vault_cooldown: '허들 쿨', vault_uses: '허들 회수',
    lightning_cooldown: '직격뢰 쿨', lightning_uses: '직격뢰 회수',
    shift_uses: '시프트 회수', big_shift_uses: '빅시프트 회수',
    capture_cooldown: '포획 쿨', capture_uses: '포획 회수',
    sagua_uses: '사구아 회수',
    poetic_2_cooldown: '2음절 쿨', poetic_2_uses: '2음절 회수',
    poetic_allow_cooldown: '시적허용 쿨', poetic_allow_uses: '시적허용 회수',
    swallow_cooldown: '삼키기 쿨', swallow_uses: '삼키기 회수',
    breath_uses: '브레스 회수', tail_uses: '꼬리 회수',
    void_cooldown: '공허 쿨', void_uses: '공허 회수',
    explosion_uses: '폭발 회수',
    death_cooldown: '사형선고 쿨', death_uses: '사형선고 회수', soul_uses: '영혼 회수',
    math_study_uses_left: '학습 회수',
    dna_cooldown: 'DNA 쿨', dna_uses: 'DNA 회수',
    split_uses: '쪼개기 회수', rest_cooldown: '쉼표 쿨',
    burger_cooldown: '버거 쿨', fries_cooldown: '튀김 쿨', bonus_uses: '보너스 회수', robber_uses: '강도 회수',
    checkmate_cooldown: '체크메이트 쿨', checkmate_uses: '체크메이트 회수', exchange_uses: '교환 회수', cry_uses: '울음 회수',
    rescue_cooldown: '구조 쿨', rescue_uses: '구조 회수',
    barrier_cooldown: '결계 쿨', barrier_uses: '결계 회수', distort_cooldown: '왜곡 쿨', distort_uses: '왜곡 회수',
    report_cooldown: '보도 쿨', report_uses: '보도 회수',
    stab_cooldown: '찌르기 쿨', stab_uses: '찌르기 회수', slice_cooldown: '가르기 쿨', slice_uses: '가르기 회수',
    gandhi_cooldown: '억제 쿨', suppress_cooldown: '침묵 쿨',
    bulletproof_uses: '수리 회수', repair_uses: '수리 회수',
    gongcheo_uses: '공처 회수', gongcheo_cooldown: '공처 쿨',
    fission_uses: '분열 회수',
    speaki_clean_uses: '물걸레 회수', speaki_pumpkin_uses: '호박 회수',
    otter_clam_uses: '조개 회수', otter_smash_uses: '깨부수기 회수',
    programmer_shift_uses: 'Shift 회수', programmer_caps_uses: 'Caps 회수', programmer_backspace_uses: 'BS 회수', programmer_tab_uses: 'Tab 회수'
  };

  const ABILITY_CONFIG = {
    '조작': { uses: 'jojak_uses', max: 3, cd: 'jojak_cooldown' },
    '복제': { uses: 'bokje_uses', max: 1 },
    '초토화': { uses: 'chotohwa_uses', max: 1, cd: 'chotohwa_cooldown' },
    '주가 조작': { uses: 'juga_jojak_uses', max: 2, cd: 'juga_jojak_cooldown' },
    '환각증': { uses: 'hallucination_uses', max: 1 },
    '제작': { cd: 'make_cooldown' },
    '채굴': { uses: 'mine_uses', max: 1, cd: 'mine_cooldown' },
    '탐지': { uses: 'detect_uses', max: 1, cd: 'detect_cooldown' },
    '허들 넘기': { uses: 'hurdle_uses', max: 1 },
    '직격뢰': { uses: 'lightning_uses', max: 2, cd: 'lightning_cooldown' },
    '시프트': { uses: 'shift_uses', max: 3 },
    '빅 시프트': { uses: 'big_shift_uses', max: 1 },
    '포획': { uses: 'capture_uses', max: 2, cd: 'capture_cooldown' },
    '사구아': { uses: 'sagua_uses', max: 1 },
    '2음절': { uses: 'poetic_2_uses', max: 2, cd: 'poetic_2_cooldown' },
    '시적 허용': { uses: 'poetic_allow_uses', max: 1, cd: 'poetic_allow_cooldown' },
    '삼키기': { uses: 'swallow_uses', max: 1, cd: 'swallow_cooldown' },
    '브레스': { uses: 'breath_uses', max: 1 },
    '꼬리 날리기': { uses: 'tail_uses', max: 1 },
    '공허': { uses: 'void_uses', max: 2, cd: 'void_cooldown' },
    '폭발': { uses: 'explosion_uses', max: 1 },
    '사형 선고': { uses: 'death_uses', max: 1, cd: 'death_cooldown' },
    '영혼': { uses: 'soul_uses', max: 1 },
    'DNA파괴': { uses: 'dna_uses', max: 2, cd: 'dna_cooldown' },
    '쪼개기': { uses: 'split_uses', max: 1 },
    '쉼표': { cd: 'rest_cooldown' },
    '게살버거': { cd: 'burger_cooldown' },
    '감자튀김': { cd: 'fries_cooldown' },
    '보너스': { uses: 'bonus_uses', max: 1 },
    '강도 채용': { uses: 'robber_uses', max: 1 },
    '체크메이트': { uses: 'checkmate_uses', max: 1, cd: 'checkmate_cooldown' },
    '교환': { uses: 'exchange_uses', max: 1 },
    '울음': { uses: 'cry_uses', max: 1 },
    '긴급 구조': { uses: 'rescue_uses', max: 1, cd: 'rescue_cooldown' },
    '결계': { uses: 'barrier_uses', max: 1, cd: 'barrier_cooldown' },
    '왜곡': { uses: 'distort_uses', max: 1, cd: 'distort_cooldown' },
    '거짓 보도': { uses: 'report_uses', max: 1, cd: 'report_cooldown' },
    '거짓 뉴스': { uses: 'fake_news_uses', max: 1 },
    '찌르기': { uses: 'stab_uses', max: 2, cd: 'stab_cooldown' },
    '가르기': { uses: 'slice_uses', max: 1, cd: 'slice_cooldown' },
    '억제': { cd: 'gandhi_cooldown' },
    '수리': { cd: 'repair_cooldown', uses: 'repair_uses', max: 1 }, 
    '핵분열': { uses: 'fission_uses', max: 1 },
    '무량공처': { uses: 'gongcheo_uses', max: 1, cd: 'gongcheo_cooldown' },
    '물걸레질': { uses: 'speaki_clean_uses', max: 2, cd: 'speaki_clean_cooldown' },
    '호박': { uses: 'speaki_pumpkin_uses', max: 1, cd: 'speaki_pumpkin_cooldown' },
    '조개': { uses: 'otter_clam_uses', max: 1, cd: 'otter_clam_cooldown' },
    '깨부수기': { uses: 'otter_smash_uses', max: 1 },
    'Shift': { uses: 'programmer_shift_uses', max: 1 },
    'Caps Lock': { uses: 'programmer_caps_uses', max: 1, cd: 'programmer_caps_cooldown' },
    'Backspace': { uses: 'programmer_backspace_uses', max: 1 },
    'Tab': { uses: 'programmer_tab_uses', max: 1 }
  };

  function getPlayerAbilitiesStatus(playerJob, state) {
    if (!playerJob || !state) return [];
    const abs = ACTIVE_BY_JOB[playerJob];
    if (!abs) return [];
    
    return abs.map(name => {
      const conf = ABILITY_CONFIG[name];
      let text = '준비됨';
      let isReady = true;
      let isExhausted = false;

      if (conf) {
        let parts = [];
        let used = 0;
        if (conf.max) {
          used = state[conf.uses] || 0;
          const remain = Math.max(0, conf.max - used);
          parts.push(`${remain}/${conf.max}`);
          if (remain === 0) {
            isReady = false;
            isExhausted = true;
          }
        }
        
        if (conf.cd) {
          const cd = state[conf.cd] || 0;
          if (cd > 0) {
            parts.push(`쿨 ${cd}턴`);
            isReady = false;
          }
        }

        if (parts.length > 0) {
          text = parts.join(' · ');
        } else if (conf.max && used >= conf.max) {
           text = '소진됨';
        }
      }
      
      return { name, text, isReady, isExhausted };
    });
  }

  const ABILITY_TARGET_MAP = {
    '조작': 'syllable', '제작': 'syllable', '채굴': 'syllable',
    '복제': 'player', '탐지': 'player', '시프트': 'player', '빅 시프트': 'player', '포획': 'player',
    '찌르기': 'player', '가르기': 'player', 'DNA파괴': 'player', '교환': 'player', '강도 채용': 'player',
    '결계': 'chosung'
  };

  const myStatusList = $derived.by(() => {
    if (!myState) return [];
    return Object.entries(STATUS_LABELS)
      .filter(([key]) => myState[key] !== undefined && myState[key] !== 0 && myState[key] !== null)
      .map(([key, label]) => ({ label, value: myState[key] }));
  });

  $effect(() => {
    if (log.length > 0) {
      const last = log[log.length - 1];
      if (last.type === 'system') {
        const text = last.text?.replace('[시스템]: ', '').trim() || '';
        
        let effectTriggered = false;

        // 1. 패시브 감지
        const PASSIVE_BY_JOB = {
          '해커': [], '투자자': ['투자의 귀재'], '환자': ['강박증'], '수집가': ['수집'],
          '감시자': ['감시'], '뜀틀선수': ['뜀틀'], '전우치': ['잔상'], '시프터': [],
          '비밀요원': ['타깃 확보'], '사과': ['삭와'], '시인': [], '공룡': [],
          '마법사': ['부작용'], '사신': ['처형'], '수학자': ['논문 발표', '공부'],
          '과학자': ['실험'], '작곡가': ['작곡'], '스폰지밥': ['저금통'],
          '나이트': ['L자 도약'], '생존자': ['신호'], '악당': [], '기자': [],
          '검객': [], '마하트마간디': ['비폭력'], '은하계전사': ['별인 듯 달 아닌 별'],
          '혜성전사': ['핼리 혜성'], '수리사': ['방탄'], '고죠': [], '우라늄': [],
          '스핔이': [], '해달': [], '프로그래머': []
        };
        
        const currentPassives = PASSIVE_BY_JOB[myState?.job] || [];
        for (const ps of currentPassives) {
          if (text.includes(`${ps} 발동`) || text.includes(`${ps} 효과`) || text.includes(`${ps} 패시브`)) {
            triggerEffect(ps, 'passive');
            effectTriggered = true;
            break;
          }
        }

        // 2. 액티브 능력 감지
        if (!effectTriggered) {
          const currentAbilities = ACTIVE_BY_JOB[myState?.job] || [];
          for (const ab of currentAbilities) {
            if (text.startsWith(ab) || text.includes(`${ab} 발동`) || text.includes(`${ab} 완료`)) {
              triggerEffect(ab, 'active');
              effectTriggered = true;
              break;
            }
          }
        }

        // 3. 에러 메시지 감지 및 토스트 표시
        const isError = [
          '이미 사용된 단어', '사전적 단어', '시작하지 않습니다', '한방 단어', 
          '유도 단어', '루트 단어', '두음법칙', '글자', '불가능합니다', '사용할 수 없습니다',
          '쿨타임입니다', '모두 사용했습니다', '부족합니다', '지정해주세요'
        ].some(err => text.includes(err));
        
        if (isError && !effectTriggered) {
          error = text;
          setTimeout(() => { if (error === text) error = ''; }, 3500);
        }
      }
    }
  });

  function triggerEffect(name, type) {
    const id = Math.random();
    activeEffects = [...activeEffects, { id, name, type }];
    setTimeout(() => {
      activeEffects = activeEffects.filter(e => e.id !== id);
    }, 2000);
  }

  const jobRanking = $derived.by(() => {
    if (!ranking?.ranking) return {};
    const jobs = {};
    for (const player of ranking.ranking) {
      for (const [job, stats] of Object.entries(player.jobStats || {})) {
        if ((stats.picks || 0) < 2) continue;
        if (!jobs[job]) jobs[job] = [];
        jobs[job].push({
          name: player.name,
          rating: player.rating || 1000,
          wins: stats.wins || 0,
          losses: stats.losses || 0,
          picks: stats.picks || 0,
          winRate: stats.wins / stats.picks
        });
      }
    }
    for (const job of Object.keys(jobs)) {
      jobs[job].sort((a, b) => b.wins - a.wins || b.rating - a.rating);
      jobs[job] = jobs[job].slice(0, 5);
    }
    return jobs;
  });

  const jobRankingList = $derived(
    Object.entries(jobRanking)
      .sort((a, b) => (b[1][0]?.wins || 0) - (a[1][0]?.wins || 0))
  );
  const isBanPhase = $derived(game?.phase === 'job_selection' && game?.banPhase);
  const isBanPicker = $derived(isBanPhase && game?.firstPicker === nickname);
  const isBanWaiting = $derived(isBanPhase && game?.firstPicker && game?.firstPicker !== nickname);
  const bannedJobs = $derived(game?.bannedJobs || []);
  const selectableJobs = $derived(availableJobs.filter((job) => !bannedJobs.includes(job)));
  const maxBanCount = 6;

  $effect(() => {
    const phase = game?.phase ?? '';
    if (phase && phase !== 'waiting') hasMatched = true;
    if (!practice && prevPhase === 'waiting' && phase && phase !== 'waiting') {
      showMatchBanner = true;
      clearTimeout(matchBannerTimer);
      matchBannerTimer = setTimeout(() => (showMatchBanner = false), 3200);
    }
    if (prevPhase === 'playing' && phase && phase !== 'playing') {
      const recent = log.filter(item => item.type === 'system').slice(-20);
      const changes = [];
      for (const item of recent) {
        const m = item.text?.match(/^(.+?)\s*:\s*(\d+)에서\s*(\d+)\s*\(([+\-]\d+)\)\s*\/\s*(.+)$/);
        if (m) {
          changes.push({
            name: m[1].replace(/\(.+?\)$/, '').trim(),
            job: (m[1].match(/\((.+?)\)$/) || [])[1] || '',
            oldRating: Number(m[2]),
            newRating: Number(m[3]),
            delta: Number(m[4]),
            tierName: m[5].trim()
          });
        }
      }
      if (changes.length) {
        matchResult = { changes };
        clearTimeout(matchResultTimer);
        matchResultTimer = setTimeout(() => (matchResult = null), 10000);
      }
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

  $effect(() => {
    if (browser) {
      fetch('/api/job-info').then(r => r.json()).then(d => { jobInfoByJob = d; }).catch(() => {});
    }
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
    hasMatched = false;
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
    hasMatched = !!data.game && data.game.phase !== 'waiting';
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
    hasMatched = !!data.game && data.game.phase !== 'waiting';
    startLiveUpdates();
  }

  async function refresh(targetRoom = room) {
    if (!targetRoom) return;
    try {
      const res = await fetch(`/api/room?room=${encodeURIComponent(targetRoom)}`, { cache: 'no-store' });
      if (!res.ok || targetRoom !== room) return;
      snapshot = await res.json();
    } catch {}
  }

  function startPolling() {
    clearInterval(poller);
    refresh();
    poller = setInterval(refresh, 2500);
  }

  async function openExistingRoom(targetRoom) {
    if (!targetRoom) return;
    room = targetRoom;
    hasMatched = false;
    snapshot = null;
    await refresh(targetRoom);
    hasMatched = !!snapshot?.game && snapshot.game.phase !== 'waiting';
    startLiveUpdates();
  }

  let wsRetryDelay = 1000;
  let wsRetryTimer;
  function startLiveUpdates() {
    clearInterval(poller);
    clearTimeout(wsRetryTimer);
    if (socket) {
      try {
        socket.onclose = null;
        socket.close();
      } catch {}
    }
    startPolling();
    if (browser && room) {
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      try {
        socket = new WebSocket(`${protocol}://${location.host}/ws?room=${encodeURIComponent(room)}&nickname=${encodeURIComponent(nickname)}`);
        socket.onopen = () => { wsRetryDelay = 1000; };
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.room && data.room !== room) return;
            snapshot = data;
          } catch {}
        };
        socket.onerror = () => {};
        socket.onclose = () => {
          if (!room) return;
          wsRetryTimer = setTimeout(() => {
            wsRetryDelay = Math.min(wsRetryDelay * 2, 16000);
            startLiveUpdates();
          }, wsRetryDelay);
        };
      } catch {
        startPolling();
      }
      return;
    }
    startPolling();
  }

  async function fetchOngoingGames() {
    if (!nickname) return;
    try {
      const res = await fetch(`/api/my-games?nickname=${encodeURIComponent(nickname)}`);
      if (res.ok) ongoingGames = await res.json();
    } catch {}
  }

  function timeSince(date) {
    const seconds = Math.floor((now - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "년 전";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "달 전";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "일 전";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "시간 전";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "분 전";
    return Math.floor(seconds) + "초 전";
  }

  $effect(() => {
    if (browser && nickname) {
      fetchOngoingGames();
      const intv = setInterval(fetchOngoingGames, 10000);
      const nowIntv = setInterval(() => { now = Date.now(); }, 1000);
      return () => { clearInterval(intv); clearInterval(nowIntv); };
    }
  });

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
    if (!text || !canPlay || busy) return;
    word = '';
    cpuThinking = true;
    try {
      await send(`0${text}`);
    } finally {
      cpuThinking = false;
      await tick();
      wordInputEl?.focus();
    }
  }

  async function sendChat(event) {
    event?.preventDefault?.();
    const text = chatInput.trim();
    if (!text || !room || !socket) return;
    socket.send(JSON.stringify({ type: 'chat', text }));
    chatInput = '';
    await tick();
    if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
  }

  $effect(() => {
    if (showChat && chats.length && chatEl) {
      tick().then(() => { chatEl.scrollTop = chatEl.scrollHeight; });
    }
  });

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
    const targetType = ABILITY_TARGET_MAP[name];
    if (targetType) {
      showTargetSelector = { name, type: targetType };
      return;
    }
    await sendAbilityWithTarget(name);
  }

  async function sendAbilityWithTarget(name, target = '') {
    if (!canUseAbility || busy) return;
    const cmd = `2${name}${target ? ` ${target}` : ''}`;
    await send(cmd);
    ability = '';
    showTargetSelector = null;
  }

  async function searchWords() {
    const data = await request(`/api/search?q=${encodeURIComponent(searchText)}`);
    searchResults = data.results || [];
    searchTotal = data.total || 0;
  }

  async function searchInGame() {
    const tabObj = activeInGameTab;
    if (!tabObj || !tabObj.query.trim()) return;
    const data = await fetch(`/api/search?q=${encodeURIComponent(tabObj.query)}`).then(r => r.json()).catch(() => ({}));
    tabObj.results = data.results || [];
  }

  async function loadRanking() {
    ranking = await request('/api/ranking');
  }

  function submitSearch(event) {
    event.preventDefault();
    searchWords();
  }

  const filteredSearch = $derived(
    searchFilter === '전체' ? searchResults : searchResults.filter(r => r.kind === searchFilter)
  );

  async function startPractice() {
    showPracticeBar = false;
    room = '';
    snapshot = null;
    hasMatched = false;
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
    const config = {
      disabled_turns: { label: '능력불가', type: 'debuff' },
      absolutely_disabled: { label: '절대봉쇄', type: 'danger' },
      no_yudo_turns: { label: '유도불가', type: 'debuff' },
      no_root_turns: { label: '루트불가', type: 'debuff' },
      no_hanbang_turns: { label: '한방불가', type: 'debuff' },
      no_du_eum_turns: { label: '두음불가', type: 'debuff' },
      only_even_turns: { label: '짝수', type: 'rule' },
      only_odd_turns: { label: '홀수', type: 'rule' },
      only_length_2_turns: { label: '2글자', type: 'rule' },
      no_length_2_turns: { label: '2글자금지', type: 'debuff' },
      only_root_turns: { label: '루트만', type: 'rule' },
      last_route_only_turns: { label: '끝루트', type: 'rule' },
      limited_length: { label: '최대', type: 'length' },
      min_length: { label: '최소', type: 'length' }
    };
    return Object.entries(config)
      .filter(([key]) => state[key])
      .map(([key, cfg]) => ({ 
        label: cfg.label, 
        value: state[key], 
        type: cfg.type,
        full: `${cfg.label} ${state[key]}`
      }));
  }

  function jobInitial(name) {
    return name ? name[0] : '?';
  }

  function getJobStatuses(state) {
    if (!state) return [];
    const statuses = [];
    const { job } = state;

    if (job === '투자자' && state.investor_stock !== undefined) {
      statuses.push({ label: '주가', value: `${state.investor_stock}원`, type: 'investor' });
    }
    if (job === '수집가' && state.collected_syllables) {
      statuses.push({ label: '수집', value: state.collected_syllables.join(', ') || '없음', type: 'collector' });
    }
    if (job === '감시자' && state.watch_count !== undefined) {
      statuses.push({ label: '감시', value: `${state.watch_count}회`, type: 'watcher' });
    }
    if (job === '수학자' && state.math_result !== undefined) {
      statuses.push({ label: '결과', value: state.math_result, type: 'math' });
    }
    if (job === '스폰지밥' && state.money !== undefined) {
      statuses.push({ label: '잔액', value: `${state.money.toLocaleString()}원`, type: 'money' });
    }
    if (job === '사신' && state.execution_count !== undefined) {
      statuses.push({ label: '처형', value: `${state.execution_count}회`, type: 'death' });
    }
    if (job === '작곡가') {
      const units = state.compose_units || 0;
      const target = state.compose_target_units || 8;
      statuses.push({ label: '박자', value: `${units}/${target}`, type: 'composer' });
      if (state.compose_notes?.length) {
        statuses.push({ label: '음표', value: state.compose_notes.join(''), type: 'composer-notes' });
      }
    }
    if (job === '수리사' && state.bulletproof_uses !== undefined) {
      statuses.push({ label: '방탄', value: `${state.bulletproof_uses}개`, type: 'repair' });
    }
    if (job === '고죠' && state.gongcheo_uses !== undefined) {
      statuses.push({ label: '공처', value: `${state.gongcheo_uses}회`, type: 'gojo' });
    }
    if (job === '피아니스트' && state.pianist_notes) {
      statuses.push({ label: '악보', value: state.pianist_notes.join(' ') || '비었음', type: 'pianist' });
    }
    if (job === '뜀틀선수' && state.vault_uses !== undefined) {
      statuses.push({ label: '도약', value: `${state.vault_uses}/${state.vault_max || 3}`, type: 'vault' });
    }
    if (job === '과학자') {
      if (state.experiment_success_total) statuses.push({ label: '성공', value: `${state.experiment_success_total}회`, type: 'science' });
      if (state.dna_success_streak) statuses.push({ label: '연속', value: `${state.dna_success_streak}회`, type: 'science' });
    }
    if (job === '마하트마간디' && state.gandhi_stacks !== undefined) {
      statuses.push({ label: '스택', value: `${state.gandhi_stacks}`, type: 'gandhi' });
    }
    if (job === '은하계전사' && state.star_stacks !== undefined) {
      statuses.push({ label: '성광', value: `${state.star_stacks}`, type: 'star' });
    }
    if (job === '혜성전사') {
      if (state.comet_seong_count) statuses.push({ label: '성', value: state.comet_seong_count, type: 'comet' });
      if (state.comet_hye_count) statuses.push({ label: '혜', value: state.comet_hye_count, type: 'comet' });
    }
    if (job === '우라늄') {
      if (state.uranium_two_streak) statuses.push({ label: '임계', value: state.uranium_two_streak, type: 'uranium' });
      if (state.fission_turns) statuses.push({ label: '핵분열', value: `${state.fission_turns}턴`, type: 'uranium' });
    }
    if (job === '프로그래머') {
      if (state.programmer_delete_pending) statuses.push({ label: '삭제', value: state.programmer_delete_pending, type: 'dev' });
      if (state.programmer_alt_count || state.programmer_f4_count) {
        statuses.push({ label: 'A+F4', value: `${state.programmer_alt_count || 0}+${state.programmer_f4_count || 0}`, type: 'dev' });
      }
    }

    return statuses;
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
      <button class="nav-btn" class:nav-active={tab === 'settings'} onclick={() => (tab = 'settings')}>
        <Settings size={15} />설정
      </button>
    </nav>
    <div class="top-auth">
      {#if user}
        <button class="icon-btn" class:dm-unread={dmInbox.length > 0} onclick={() => (showDM = !showDM)} title="쪽지">
          <Mail size={16} />
          {#if dmInbox.length > 0}<span class="dm-badge">{dmInbox.length}</span>{/if}
        </button>
        <span class="auth-name">{user.nickname}</span>
        <button class="icon-btn" onclick={signout} title="로그아웃"><LogOut size={16} /></button>
      {:else}
        <select class="auth-select" bind:value={authMode}>
          <option value="login">로그인</option>
          <option value="signup">회원가입</option>
        </select>
        <input class="auth-input" bind:value={username} placeholder="아이디" autocomplete="username" />
        <input class="auth-input" bind:value={password} placeholder="비밀번호" type="password" autocomplete="current-password" />
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

              {#if ongoingGames.length > 0}
                <div class="ongoing-section">
                  <div class="ongoing-title">진행 중인 게임</div>
                  <div class="ongoing-list">
                    {#each ongoingGames as g}
                      <button class="ongoing-card" onclick={() => openExistingRoom(g.room)}>
                        <div class="og-room">{g.room}</div>
                        <div class="og-meta">
                          {g.phase === 'playing' ? `${g.turnCount}턴 · ${g.currentPlayer} 차례` : '준비 중'}
                        </div>
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
            {/if}
          </div>
        </div>
      </div>

    {:else if !practice && !hasMatched && (!game || game.phase === 'waiting')}
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

    {:else if !game}
      <div class="matching-screen compact-loading">
        <div class="radar-core"><Swords size={28} /></div>
        <h2 class="matching-label">게임 상태를 불러오고 있어요<span class="dots"></span></h2>
        <div class="room-code-pill">
          방 코드 <strong>{room}</strong>
        </div>
      </div>

    {:else if game.phase === 'waiting' || game.phase === 'job_selection'}
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
              {#if jobInfoByJob[job]}
                <div class="job-tooltip"><pre class="job-tooltip-text">{jobInfoByJob[job]}</pre></div>
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
          <button class="syl-search-btn" class:wsf-active={showWordSearch} onclick={() => (showWordSearch = !showWordSearch)} title="단어 검색">
            <Search size={15} />
          </button>
        </div>

        <!-- Side Drawer Search Tab -->
        <div class="search-tab-drawer" class:search-drawer-open={showWordSearch}>
          <div class="search-tab-handle" onclick={() => (showWordSearch = !showWordSearch)} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (showWordSearch = !showWordSearch)}>
            <div class="handle-inner">
              <Search size={16} />
              <span>검색</span>
            </div>
          </div>
          <div class="search-drawer-content">
            <div class="sdc-header">
              <h3>단어 검색</h3>
              <button class="sdc-close" onclick={() => (showWordSearch = false)}>✕</button>
            </div>
            
            <div class="sdc-tabs">
              {#each inGameTabs as t (t.id)}
                <div class="sdc-tab" class:tab-active={activeInGameTabId === t.id} onclick={() => activeInGameTabId = t.id} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (activeInGameTabId = t.id)}>
                  <span>{t.query || '새 검색'}</span>
                  {#if inGameTabs.length > 1}
                    <span class="sdc-tab-close" onclick={(e) => removeInGameTab(t.id, e)} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && removeInGameTab(t.id, e)}>✕</span>
                  {/if}
                </div>
              {/each}
              <button class="sdc-tab-add" onclick={addInGameTab}>+</button>
            </div>

            <form class="sdc-form" onsubmit={(e) => { e.preventDefault(); searchInGame(); }}>
              <div class="sdc-input-wrap">
                <input class="sdc-input" bind:value={activeInGameTab.query} placeholder="기* · *차 · K / I / R / A" autocomplete="off" />
                <button class="sdc-submit" type="submit"><Search size={14} /></button>
              </div>
            </form>
            <div class="sdc-results">
              {#each activeInGameTab.results.slice(0, 50) as r}
                <button class="sdc-item" onclick={() => { word = r.word; showWordSearch = false; tick().then(() => wordInputEl?.focus()); }}>
                  <div class="sdci-word">{r.word}</div>
                  <div class="sdci-kind sdci-k-{r.kind}">{r.kind}</div>
                </button>
              {/each}
              {#if !activeInGameTab.results.length && activeInGameTab.query}
                <div class="sdc-empty">결과가 없습니다</div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Three-column game layout -->
        <div class="game-columns">

          <!-- LEFT: Players -->
          <aside class="col-players">
            <div class="col-label">PLAYERS</div>
            {#each game.players || [] as player, index}
              {@const playerJob = game.playerStates?.[player]?.job || ''}
              <div class="player-card" class:player-active={player === currentPlayer}>
                <div class="player-avatar" class:avatar-active={player === currentPlayer}>
                  {#if playerJob}
                    <img src={jobImageSrc(playerJob)} alt="" loading="lazy" onerror={hideBrokenImage} />
                  {/if}
                  <span>{jobInitial(playerJob || player)}</span>
                </div>
                <div class="player-body">
                  <div class="player-name">
                    {player}
                    {#if snapshot?.presence?.[player]}
                      {#if snapshot.presence[player].online}
                        <span class="online-dot" title="온라인"></span>
                      {:else}
                        <span class="offline-label">오프라인: {timeSince(snapshot.presence[player].lastSeen)} 접속</span>
                      {/if}
                    {/if}
                  </div>
                  <div class="player-job">
                    {playerJob || '미선택'}
                  </div>
                  {#if getJobStatuses(game.playerStates?.[player]).length}
                    <div class="job-status-list">
                      {#each getJobStatuses(game.playerStates?.[player]) as st}
                        <div class="status-chip status-{st.type}">
                          <span class="status-label">{st.label}</span>
                          <span class="status-value">{st.value}</span>
                        </div>
                      {/each}
                    </div>
                  {/if}
                  {#if getPlayerAbilitiesStatus(playerJob, game.playerStates?.[player]).length}
                    <div class="player-ability-list">
                      {#each getPlayerAbilitiesStatus(playerJob, game.playerStates?.[player]) as ab}
                        <div class="pa-item" class:pa-ready={ab.isReady} class:pa-exhausted={ab.isExhausted}>
                          <span class="pa-name">{ab.name}</span>
                          <span class="pa-status">{ab.text}</span>
                        </div>
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
                  <span class="think-label">
                    {game?.isPractice && currentPlayer?.startsWith('채린컴퓨터') 
                      ? '컴퓨터가 생각 중입니다...' 
                      : '단어 처리 중...'}
                  </span>
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
                {#if myStatusList.length}
                  <div class="mj-status-list">
                    {#each myStatusList as st}
                      <div class="mj-status-item">
                        <span class="mjs-label">{st.label}</span>
                        <span class="mjs-value">{st.value}</span>
                      </div>
                    {/each}
                  </div>
                {/if}
                {#if getJobStatuses(myState).length}
                  <div class="mj-status-grid">
                    {#each getJobStatuses(myState) as st}
                      <div class="mj-status-item status-{st.type}">
                        <div class="mjs-label">{st.label}</div>
                        <div class="mjs-value">{st.value}</div>
                      </div>
                    {/each}
                  </div>
                {/if}
                {#if visibleEffects(myState).length}
                  <div class="mj-effects">
                    {#each visibleEffects(myState) as ef}
                      <span class="effect-tag effect-{ef.type}">{ef.full}</span>
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

            <div class="game-status-panel">
              <div class="col-label">STATUS</div>
              <div class="status-content">
                {#each game.players as p, pi}
                  {@const effects = visibleEffects(game.playerStates?.[p])}
                  <div class="status-player-row" class:spr-active={p === currentPlayer}>
                    <div class="spr-info">
                      <span class="spr-team team-{(pi % 2) + 1}"></span>
                      <span class="spr-name">{p}</span>
                      <span class="spr-job">{game.playerStates?.[p]?.job || ''}</span>
                    </div>
                    <div class="spr-effects">
                      {#if effects.length}
                        {#each effects as ef}
                          <span class="effect-tag effect-{ef.type}">{ef.full}</span>
                        {/each}
                      {:else}
                        <span class="spr-empty">효과 없음</span>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <div class="game-guide-panel">
              <div class="col-label">GAME RULES</div>
              <div class="guide-row">
                <span>시작</span>
                <strong>{(game.history || []).length ? '진행 중' : '아무나 첫 단어'}</strong>
              </div>
              <div class="guide-row">
                <span>첫 수 제한</span>
                <strong>한방 · 유도 불가</strong>
              </div>
              <div class="guide-row">
                <span>모드</span>
                <strong>{game.teamMode || 1}대{game.teamMode || 1} {game.isPractice ? '(연습)' : ''}</strong>
              </div>
            </div>
          </aside>
        </div>

        <div class="bottom-composer" class:composer-active={canPlay}>
          {#if abilityButtons.length}
            <div class="ability-bar">
              <div class="ability-grid">
                {#each abilityButtons as ab, ai}
                  {@const abStatus = myAbilityStatuses.find((item) => item.name === ab)}
                  <button
                    class="ab-btn"
                    class:ab-not-ready={abStatus && !abStatus.isReady}
                    style="--ai:{ai}"
                    onclick={() => useAbility(ab)}
                    disabled={!canUseAbility || busy || (abStatus && !abStatus.isReady)}
                    title={abStatus?.text || '준비됨'}
                  >
                    <Sparkles size={13} />
                    <span class="ab-name">{ab}</span>
                    {#if abStatus}
                      <span class="ab-status-val">{abStatus.text}</span>
                    {/if}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
          <form class="input-zone" class:input-active={canPlay} onsubmit={sendWord}>
            <input
              class="word-input"
              bind:this={wordInputEl}
              bind:value={word}
              placeholder={busy ? '처리 중...' : canPlay ? `${nextSyllable}(으)로 시작하는 단어` : '상대방 차례...'}
              disabled={!canPlay || busy}
              autocomplete="off"
            />
            <button class="send-btn" class:send-ready={canPlay && word.trim() && !busy} type="submit" disabled={!canPlay || !word.trim() || busy}>
              <Send size={17} />
            </button>
          </form>
        </div>

        <!-- Target Selector Overlay -->
        {#if showTargetSelector}
          <div class="target-selector-overlay" onclick={() => (showTargetSelector = null)}>
            <div class="target-card" onclick={e => e.stopPropagation()}>
              <div class="tc-header">
                <h3>{showTargetSelector.name} 대상 선택</h3>
                <button class="tc-close" onclick={() => (showTargetSelector = null)}>✕</button>
              </div>
              <div class="tc-body">
                {#if showTargetSelector.type === 'player'}
                  <div class="tc-players">
                    {#each game.players.filter(p => p !== nickname) as p}
                      <button class="tc-player-btn" onclick={() => sendAbilityWithTarget(showTargetSelector.name, p)}>
                        {p}
                      </button>
                    {/each}
                  </div>
                {:else if showTargetSelector.type === 'syllable'}
                  <div class="tc-input-row">
                    <input class="tc-input" bind:value={ability} placeholder="변환할 음절 입력" maxlength="1" />
                    <button class="tc-submit" onclick={() => sendAbilityWithTarget(showTargetSelector.name, ability)}>확인</button>
                  </div>
                {:else if showTargetSelector.type === 'chosung'}
                  <div class="tc-chosungs">
                    {#each ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'] as cs}
                      <button class="tc-chosung-btn" onclick={() => sendAbilityWithTarget(showTargetSelector.name, cs)}>{cs}</button>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <!-- Activation Effects Overlay -->
        <div class="effects-layer">
          {#each activeEffects as eff (eff.id)}
            <div class="activation-splash {eff.type}">
              <div class="splash-bg"></div>
              <div class="splash-text">
                <span class="splash-kicker">{eff.type === 'passive' ? 'PASSIVE' : 'ABILITY'}</span>
                <span class="splash-name">{eff.name}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Match result tier overlay -->
    {#if matchResult}
      <div class="tier-result-overlay" onclick={() => (matchResult = null)}
           onkeydown={(e) => e.key === 'Enter' && (matchResult = null)} role="button" tabindex="0">
        <div class="tier-result-card">
          <div class="tr-title">매치 결과</div>
          {#each matchResult.changes as c}
            {@const ti = getTierInfo(c.newRating)}
            <div class="tr-row" class:tr-win={c.delta > 0} class:tr-lose={c.delta <= 0}>
              <div class="tr-player">
                <span class="tr-name">{c.name}</span>
                {#if c.job}<span class="tr-job">{c.job}</span>{/if}
              </div>
              <div class="tr-tier-badge" style="--tc:{ti.color};--tc-glow:{ti.color}44">{c.tierName}</div>
              <div class="tr-rating">{c.newRating}</div>
              <div class="tr-delta" class:tr-pos={c.delta > 0} class:tr-neg={c.delta <= 0}>
                {c.delta > 0 ? '+' : ''}{c.delta}
              </div>
            </div>
          {/each}
          <div class="tr-dismiss">클릭하여 닫기</div>
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
            <button class="word-card wc-{r.kind}" onclick={() => { searchText = r.last + '*'; submitSearch(); }}>
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
                {#if r.kind === '유도'}
                  <div class="wc-win" class:wc-urgent={r.turnsToWin <= 3}>{r.turnsToWin}턴 뒤 승리</div>
                {:else if r.kind === '일반'}
                  <div class="wc-win wc-lose">패배</div>
                {/if}
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

  <!-- ══════════════════════ RANKING TAB ══════════════════════ -->
  {:else if tab === 'rank'}
    <div class="content-page rank-page">
      <div class="rank-header">
        <h2 class="rank-title">랭킹</h2>
        <div class="rank-mode-tabs">
          <button class="rmt" class:rmt-active={rankMode === 'overall'} onclick={() => (rankMode = 'overall', rankJob = '')}>전체 랭킹</button>
          <button class="rmt" class:rmt-active={rankMode === 'job'} onclick={() => { rankMode = 'job'; if (!rankJob && jobRankingList.length) rankJob = jobRankingList[0][0]; }}>직업별 랭킹</button>
        </div>
      </div>

      {#if rankMode === 'overall'}
        {#each ranking?.ranking || [] as row, index}
          {@const ti = getTierInfo(row.rating)}
          <div class="rank-row" style="--ri:{index};--tc:{ti.color};--tc-glow:{ti.color}33">
            <div class="rank-num" class:rank-top={index < 3}>
              {#if index === 0}🥇{:else if index === 1}🥈{:else if index === 2}🥉{:else}{index + 1}{/if}
            </div>
            <div class="rank-avatar" style="background:linear-gradient(135deg,{ti.color}cc,{ti.color}66);box-shadow:0 4px 14px {ti.color}55">{row.name[0]}</div>
            <div class="rank-info">
              <span class="rank-name">{row.name}</span>
              <span class="rank-record">{row.wins || 0}승 {row.losses || 0}패</span>
            </div>
            <div class="rank-tier-col">
              <span class="rank-tier-badge" style="--tc:{ti.color};--tc-glow:{ti.color}44">{ti.name}</span>
              <span class="rank-rating">{row.rating || 1000}</span>
            </div>
          </div>
        {/each}

      {:else}
        <!-- 직업별 랭킹 -->
        <div class="job-rank-selector">
          {#each jobRankingList.slice(0, 20) as [job]}
            <button class="jrs-btn" class:jrs-active={rankJob === job} onclick={() => (rankJob = job)}>{job}</button>
          {/each}
        </div>
        {#if rankJob && jobRanking[rankJob]}
          <div class="job-rank-section">
            <div class="jr-job-header">
              <span class="jr-job-name">{rankJob}</span>
              <span class="jr-job-sub">{jobRanking[rankJob].length}명 · 최소 2게임</span>
            </div>
            {#each jobRanking[rankJob] as row, index}
              {@const ti = getTierInfo(row.rating)}
              <div class="rank-row jr-row" style="--ri:{index};--tc:{ti.color};--tc-glow:{ti.color}33">
                <div class="rank-num" class:rank-top={index < 3}>
                  {#if index === 0}🥇{:else if index === 1}🥈{:else if index === 2}🥉{:else}{index + 1}{/if}
                </div>
                <div class="rank-avatar" style="background:linear-gradient(135deg,{ti.color}cc,{ti.color}66);box-shadow:0 4px 14px {ti.color}55">{row.name[0]}</div>
                <div class="rank-info">
                  <span class="rank-name">{row.name}</span>
                  <span class="rank-record">{row.wins}승 {row.losses}패 (총 {row.picks}게임)</span>
                </div>
                <div class="rank-tier-col">
                  <span class="rank-tier-badge" style="--tc:{ti.color};--tc-glow:{ti.color}44">{ti.name}</span>
                  <span class="rank-rating">{row.rating}</span>
                </div>
              </div>
            {/each}
          </div>
        {:else if rankMode === 'job'}
          <div class="rank-empty">직업을 선택하세요</div>
        {/if}
      {/if}
    </div>

  <!-- ══════════════════════ SETTINGS TAB ══════════════════════ -->
  {:else if tab === 'settings'}
    <div class="content-page settings-page">
      <h2 class="settings-title"><Settings size={18} />설정</h2>

      <!-- 테마 섹션 -->
      <div class="settings-section">
        <div class="settings-section-label">테마</div>
        <div class="theme-options">
          <button
            class="theme-option-btn"
            class:theme-opt-active={theme === 'light'}
            onclick={() => { theme = 'light'; if (browser) { localStorage.setItem('theme', 'light'); document.documentElement.setAttribute('data-theme', 'light'); } }}
          >
            <Sun size={20} />
            <span>라이트</span>
          </button>
          <button
            class="theme-option-btn"
            class:theme-opt-active={theme === 'dark'}
            onclick={() => { theme = 'dark'; if (browser) { localStorage.setItem('theme', 'dark'); document.documentElement.setAttribute('data-theme', 'dark'); } }}
          >
            <Moon size={20} />
            <span>다크</span>
          </button>
        </div>
      </div>

      <!-- 강조 색상 섹션 -->
      <div class="settings-section">
        <div class="settings-section-label">강조 색상</div>
        <p class="settings-section-desc">버튼·팀 마커·단어 버블 등 UI 강조색을 변경합니다.</p>
        <div class="settings-color-row">
          {#each ['#2563eb','#dc2626','#16a34a','#d97706','#9333ea','#db2777','#0891b2','#374151'] as c}
            <button
              class="color-chip"
              class:color-chip-sel={lineColor === c}
              style="background: {c}"
              onclick={() => (lineColor = c)}
              title={c}
            ></button>
          {/each}
          <input type="color" class="color-picker-input" bind:value={lineColor} title="직접 선택" />
        </div>
        <div class="settings-color-preview">
          <span class="scp-label">미리보기</span>
          <span class="scp-dot" style="background: {lineColor}; box-shadow: 0 0 8px {lineColor}88"></span>
          <span class="scp-btn" style="background: {lineColor}">버튼 예시</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- ══════════════════════ DM PANEL ══════════════════════ -->
  <!-- (DM panel is outside the tab if-chain, always rendered when showDM) -->
  {#if showDM && user}
    <div class="dm-overlay" onclick={() => (showDM = false)} onkeydown={(e) => e.key === 'Escape' && (showDM = false)} role="presentation"></div>
    <div class="dm-panel">
      <div class="dm-panel-header">
        <div class="dm-panel-title"><Mail size={15} />쪽지</div>
        <button class="dm-close" onclick={() => (showDM = false)}><X size={16} /></button>
      </div>
      <div class="dm-panel-body">
        <div class="dm-inbox">
          <div class="dm-section-label">대화 목록</div>
          {#each dmInbox as conv}
            <button class="dm-conv-item" class:dm-conv-active={dmTarget === conv.with} onclick={() => { dmTarget = conv.with; fetchDMConversation(); }}>
              <div class="dm-conv-avatar">{conv.with[0]}</div>
              <div class="dm-conv-info">
                <div class="dm-conv-name">{conv.with}</div>
                <div class="dm-conv-preview">{conv.last?.text || ''}</div>
              </div>
            </button>
          {/each}
          {#if !dmInbox.length}
            <div class="dm-empty-inbox">대화가 없습니다</div>
          {/if}
        </div>
        <div class="dm-conversation">
          <div class="dm-new-row">
            <input class="dm-target-input" bind:value={dmTarget} placeholder="받는 사람" autocomplete="off" />
            <button class="dm-go-btn" onclick={fetchDMConversation} disabled={!dmTarget.trim()}>열기</button>
          </div>
          {#if dmTarget.trim()}
            <div class="dm-messages" bind:this={dmEl}>
              {#each dmMessages as m (m.id)}
                <div class="dm-msg" class:dm-msg-mine={m.from === user.nickname}>
                  <span class="dm-msg-sender">{m.from}</span>
                  <div class="dm-msg-text">{m.text}</div>
                  <span class="dm-msg-at">{new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              {/each}
              {#if !dmMessages.length}
                <div class="dm-msg-empty">{dmTarget}님과의 대화를 시작하세요</div>
              {/if}
            </div>
            <form class="dm-send-form" onsubmit={sendDM}>
              <input class="dm-send-input" bind:value={dmInput} placeholder="메시지 입력..." autocomplete="off" />
              <button class="dm-send-btn" type="submit" disabled={!dmInput.trim()}><Send size={14} /></button>
            </form>
          {:else}
            <div class="dm-no-target">받는 사람을 입력하거나 대화를 선택하세요</div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- ══════════════════════ FLOATING CHAT ══════════════════════ -->
  {#if room}
    <div class="floating-chat-container">
      {#if showChat}
        <div class="chat-window">
          <div class="chat-header">
            <div class="chat-header-info">
              <MessageSquare size={14} />
              <span>채팅</span>
            </div>
            <button class="chat-close" onclick={() => (showChat = false)}><X size={16} /></button>
          </div>
          <div class="chat-messages" bind:this={chatEl}>
            {#each chats as c (c.id)}
              <div class="chat-msg" class:my-chat={c.sender === nickname}>
                <span class="chat-sender">{c.sender}</span>
                <div class="chat-text">{c.text}</div>
                <span class="chat-at">{new Date(c.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            {/each}
            {#if chats.length === 0}
              <div class="chat-empty">메시지가 없습니다.</div>
            {/if}
          </div>
          <form class="chat-form" onsubmit={sendChat}>
            <input class="chat-input" bind:value={chatInput} placeholder="메시지 입력..." autocomplete="off" />
            <button class="chat-send" type="submit" disabled={!chatInput.trim()}><Send size={14} /></button>
          </form>
        </div>
      {/if}
      <button class="chat-toggle-btn" class:chat-open={showChat} onclick={() => (showChat = !showChat)}>
        {#if showChat}
          <X size={24} />
        {:else}
          <MessageSquare size={24} />
        {/if}
      </button>
    </div>
  {/if}
</div>

<style>
  /* ═══════════════════════════════════════════
     TOKENS & RESET
  ═══════════════════════════════════════════ */
  :global(*) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(html) { scroll-behavior: smooth; }
  :global(body) {
    font-family: 'Pretendard', 'Noto Sans KR', Inter, ui-sans-serif, system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
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
    --radius:   12px;
    --radius-sm:10px;
    --topbar-bg: rgba(255,255,255,.92);
    --card-shadow: 0 2px 12px rgba(15,23,42,.06);
  }
  :global([data-theme="dark"]) {
    --bg:       #111318;
    --bg2:      #1a1d24;
    --bg3:      #22262f;
    --border:   #2a2f3a;
    --border2:  #333848;
    --accent:   #3b82f6;
    --accent2:  #2563eb;
    --red:      #f87171;
    --orange:   #fb923c;
    --blue:     #60a5fa;
    --green:    #4ade80;
    --gold:     #fbbf24;
    --text:     #e8eaf0;
    --text2:    #9aa3b5;
    --text3:    #5e6a7e;
    --radius:   12px;
    --radius-sm:10px;
    --topbar-bg: rgba(17,19,24,.92);
    --card-shadow: 0 2px 16px rgba(0,0,0,.3);
  }

  button, input, select { font: inherit; color: inherit; }
  button { cursor: pointer; border: none; background: none; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
  button:disabled { opacity: .4; cursor: default; }
  input, select {
    background: var(--bg3);
    border: 1.5px solid var(--border2);
    border-radius: var(--radius-sm);
    color: var(--text);
    outline: none;
    transition: border-color .18s, box-shadow .18s, background .18s;
  }
  input:focus, select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(59,130,246,.18);
    background: var(--bg2);
  }
  input, select { height: 42px; padding: 0 14px; font-size: 16px; }
  select option { background: var(--bg2); color: var(--text); }
  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* ═══════════════════════════════════════════
     TOPBAR
  ═══════════════════════════════════════════ */
  .topbar {
    height: 56px;
    background: var(--topbar-bg);
    backdrop-filter: blur(14px) saturate(1.4);
    -webkit-backdrop-filter: blur(14px) saturate(1.4);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 20px;
    padding-left: max(20px, env(safe-area-inset-left));
    padding-right: max(20px, env(safe-area-inset-right));
    gap: 12px;
    position: sticky;
    top: 0;
    z-index: 100;
    will-change: transform;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
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
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: 20px;
    padding: 40px 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    box-shadow: var(--card-shadow), 0 18px 50px rgba(15,23,42,.08);
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
    background: var(--bg2);
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

  .color-setting-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 0;
  }
  .color-setting-label {
    font-size: 13px;
    color: var(--text2);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .color-chips {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .color-chip {
    width: 22px; height: 22px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform .15s, border-color .15s;
    flex-shrink: 0;
  }
  .color-chip:hover { transform: scale(1.15); }
  .color-chip.color-chip-sel { border-color: var(--text); box-shadow: 0 0 0 2px var(--bg2); }
  .color-picker-input {
    width: 22px; height: 22px;
    border-radius: 50%;
    border: 2px solid var(--border2);
    padding: 0;
    cursor: pointer;
    background: none;
    flex-shrink: 0;
  }
  .color-picker-input::-webkit-color-swatch-wrapper { padding: 0; border-radius: 50%; }
  .color-picker-input::-webkit-color-swatch { border: none; border-radius: 50%; }

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
    background: var(--bg2);
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
    background: var(--bg3);
    color: var(--text3);
  }
  .job-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 10px;
  }
  .job-card {
    height: 92px;
    border-radius: var(--radius);
    background: var(--bg2);
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
    background: var(--bg3);
    border-color: var(--border);
    color: var(--text3);
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
    overflow: hidden;
    position: relative;
  }
  .player-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .player-avatar img:not([hidden]) + span { display: none; }
  .player-avatar span {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
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
  .player-ability-list { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; width: 100%; }
  .pa-item { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); border-radius: 4px; padding: 3px 6px; font-size: 11px; border-left: 2px solid #555; }
  .pa-item.pa-ready { border-left-color: var(--accent); }
  .pa-item.pa-exhausted { opacity: 0.5; border-left-color: var(--red); }
  .pa-name { font-weight: 600; color: #eee; }
  .pa-status { color: #aaa; font-size: 10px; }
  .pa-item.pa-ready .pa-status { color: var(--accent); }
  .pa-item.pa-exhausted .pa-status { color: var(--red); }
  .effect-list { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 6px; }
  .effect-tag {
    font-size: 10px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--bg3);
    border: 1px solid var(--border2);
    color: var(--text2);
    animation: popIn .18s ease both;
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .effect-tag.effect-debuff {
    background: rgba(239,68,68,.1);
    border-color: rgba(239,68,68,.3);
    color: #ef4444;
  }
  .effect-tag.effect-danger {
    background: #1a1a1a;
    border-color: #f59e0b;
    color: #f59e0b;
    box-shadow: 0 0 10px rgba(245,158,11,.4);
    font-weight: 900;
  }
  .effect-tag.effect-rule {
    background: rgba(59,130,246,.1);
    border-color: rgba(59,130,246,.3);
    color: #3b82f6;
  }
  .effect-tag.effect-length {
    background: rgba(168,85,247,.1);
    border-color: rgba(168,85,247,.3);
    color: #a855f7;
  }
  .team-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 4px;
  }
  .team-dot.team-1 { background: var(--my-color); box-shadow: 0 0 6px var(--my-color); }
  .team-dot.team-2 { background: var(--red); box-shadow: 0 0 6px var(--red); }
  .turn-indicator {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: var(--my-color);
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
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
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
    background: color-mix(in srgb, var(--my-color) 12%, transparent);
    border-color: color-mix(in srgb, var(--my-color) 25%, transparent);
    color: var(--my-color);
  }
  .bubble-text:hover { border-color: var(--accent); box-shadow: 0 4px 12px rgba(99,102,241,.15); }

  /* Input zone */
  .bottom-composer {
    border-top: 1px solid var(--border);
    background: var(--topbar-bg);
    backdrop-filter: blur(18px) saturate(1.4);
    -webkit-backdrop-filter: blur(18px) saturate(1.4);
    padding: 14px 18px 16px;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    z-index: 40;
    box-shadow: 0 -8px 24px rgba(15,23,42,.06);
    will-change: transform;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
  }
  .bottom-composer.composer-active {
    border-top-color: rgba(37,99,235,.25);
  }
  .input-zone {
    display: flex;
    gap: 10px;
    transition: opacity .2s;
    width: 100%;
    max-width: 980px;
    margin: 0 auto;
    padding: 6px;
    border: 1.5px solid rgba(59,130,246,.2);
    border-radius: calc(var(--radius) + 8px);
    background: var(--bg2);
    box-shadow: 0 4px 16px rgba(15,23,42,.06);
  }
  .word-input {
    flex: 1;
    height: 54px;
    font-size: 16px;
    font-weight: 700;
    border-radius: calc(var(--radius) + 2px);
    border: 1px solid transparent;
    background: transparent;
    transition: border-color .18s, box-shadow .18s;
  }
  .input-zone.input-active .word-input {
    border-color: rgba(37,99,235,.35);
    background: rgba(239,246,255,.72);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.6);
  }
  .send-btn {
    width: 54px; height: 54px;
    border-radius: calc(var(--radius) + 2px);
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
    grid-template-columns: minmax(190px, 260px) minmax(0, 1fr);
    align-items: start;
    gap: 10px;
    padding: 8px;
    border-radius: calc(var(--radius) + 8px);
    background: rgba(15,23,42,.035);
    border: 1px solid rgba(37,99,235,.10);
    animation: fadeUp .3s ease both;
  }
  .ability-target { height: 40px; font-size: 13px; border-radius: var(--radius-sm); background: rgba(255,255,255,.9); }
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
  .ab-btn.ab-not-ready {
    color: var(--text3);
    background: rgba(148,163,184,.1);
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
  .game-status-panel {
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    background: var(--bg3);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: fadeUp .22s ease both;
  }
  .status-content { display: flex; flex-direction: column; gap: 10px; }
  .status-player-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border-radius: var(--radius-sm);
    background: var(--bg2);
    border: 1px solid transparent;
    transition: border-color .2s;
  }
  .status-player-row.spr-active {
    border-color: var(--accent);
    box-shadow: 0 4px 12px rgba(99,102,241,.1);
  }
  .spr-info { display: flex; align-items: center; gap: 6px; }
  .spr-team { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .spr-team.team-1 { background: var(--my-color); }
  .spr-team.team-2 { background: var(--red); }
  .spr-name { font-size: 13px; font-weight: 800; color: var(--text); }
  .spr-job { font-size: 11px; color: var(--text3); }
  .spr-effects { display: flex; flex-wrap: wrap; gap: 4px; }
  .spr-empty { font-size: 11px; color: var(--text3); font-style: italic; }

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
  .wc-win.wc-lose { background: rgba(239,68,68,.15); border-color: rgba(239,68,68,.3); color: var(--red); }

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

  /* Ranking */
  .rank-page { max-width: 640px; }
  .rank-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 4px; }
  .rank-title { font-size: 24px; font-weight: 900; letter-spacing: -.5px; }
  .rank-mode-tabs { display: flex; gap: 4px; background: var(--bg3); padding: 3px; border-radius: 10px; }
  .rmt { padding: 5px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; color: var(--text2); transition: all .15s; }
  .rmt-active { background: var(--bg2); color: var(--accent); box-shadow: 0 1px 6px rgba(0,0,0,.1); }
  .rank-row {
    display: flex; align-items: center; gap: 14px;
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 14px 18px; background: var(--bg2);
    animation: fadeUp .2s ease both;
    animation-delay: calc(var(--ri) * 40ms);
    transition: border-color .18s, box-shadow .18s;
  }
  .rank-row:hover { border-color: var(--tc, var(--border2)); box-shadow: 0 0 0 1px var(--tc-glow, transparent); }
  .rank-num { width: 36px; text-align: center; font-size: 18px; font-weight: 900; color: var(--text3); }
  .rank-num.rank-top { font-size: 22px; }
  .rank-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: var(--accent); color: #000;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px; font-weight: 900;
    flex-shrink: 0;
  }
  .rank-info { flex: 1; min-width: 0; }
  .rank-name { font-size: 15px; font-weight: 800; display: block; overflow-wrap: anywhere; }
  .rank-record { font-size: 12px; color: var(--text3); }
  .rank-tier-col { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .rank-tier-badge {
    font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 20px;
    background: var(--tc-glow, #eee); color: var(--tc, #666);
    border: 1px solid var(--tc, #ddd); white-space: nowrap;
  }
  .rank-rating { font-size: 20px; font-weight: 900; color: var(--tc, var(--accent2)); letter-spacing: -.5px; }
  .job-rank-selector { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 14px; }
  .jrs-btn { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1px solid var(--border2); background: var(--bg2); color: var(--text2); transition: all .14s; }
  .jrs-btn.jrs-active { background: var(--accent); color: #fff; border-color: var(--accent); }
  .job-rank-section { display: flex; flex-direction: column; gap: 8px; }
  .jr-job-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 2px; }
  .jr-job-name { font-size: 20px; font-weight: 900; }
  .jr-job-sub { font-size: 12px; color: var(--text3); }
  .jr-row { border-left: 3px solid var(--tc, var(--border)); }
  .rank-empty { padding: 40px; text-align: center; color: var(--text3); font-size: 14px; }
  /* Tier result overlay */
  .tier-result-overlay {
    position: fixed; inset: 0; z-index: 400;
    background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center;
    animation: overlayIn .25s ease;
    cursor: pointer;
  }
  .tier-result-card {
    background: var(--bg2); border-radius: 18px; padding: 28px 32px;
    min-width: 300px; max-width: 420px; width: 90%;
    box-shadow: 0 24px 80px rgba(0,0,0,.4);
    animation: matchPop .3s cubic-bezier(.34,1.56,.64,1) both;
    cursor: default;
  }
  .tr-title { font-size: 13px; font-weight: 800; color: var(--text3); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 16px; text-align: center; }
  .tr-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 0; border-bottom: 1px solid var(--border);
  }
  .tr-row:last-of-type { border-bottom: none; }
  .tr-win { background: linear-gradient(90deg, #22c55e08 0%, transparent 100%); border-radius: 8px; padding: 10px 8px; }
  .tr-lose { background: linear-gradient(90deg, #dc262608 0%, transparent 100%); border-radius: 8px; padding: 10px 8px; }
  .tr-player { flex: 1; min-width: 0; }
  .tr-name { font-size: 15px; font-weight: 800; display: block; }
  .tr-job { font-size: 11px; color: var(--text3); }
  .tr-tier-badge {
    font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 20px;
    background: var(--tc-glow, #eee); color: var(--tc, #666);
    border: 1.5px solid var(--tc, #ddd); white-space: nowrap;
    box-shadow: 0 0 10px var(--tc-glow, transparent);
  }
  .tr-rating { font-size: 18px; font-weight: 900; color: var(--text); min-width: 42px; text-align: right; }
  .tr-delta { font-size: 14px; font-weight: 900; min-width: 40px; text-align: right; }
  .tr-pos { color: var(--green); }
  .tr-neg { color: var(--red); }
  .tr-dismiss { text-align: center; font-size: 11px; color: var(--text3); margin-top: 14px; }

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
    /* iPhone SE3 / mobile — prevent layout shift & shake */
    .topbar {
      height: auto;
      padding: 10px 14px;
      padding-left: max(14px, env(safe-area-inset-left));
      padding-right: max(14px, env(safe-area-inset-right));
      flex-wrap: wrap;
      gap: 8px;
      /* Prevent repaints causing jitter */
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    .top-nav { order: 3; width: 100%; }
    .nav-btn { flex: 1; justify-content: center; font-size: 12px; padding: 0 8px; }
    .top-auth { margin-left: 0; }
    .auth-input { width: 90px; font-size: 16px; height: 38px; }
    .auth-select { width: 80px; font-size: 14px; height: 38px; }
    .syl-hero { grid-template-columns: 1fr auto; gap: 12px; padding: 12px 16px; }
    .syl-meta { display: none; }
    .syl-main { font-size: 38px; }
    .job-grid { grid-template-columns: repeat(auto-fill, minmax(88px,1fr)); gap: 8px; }
    .ban-group { margin-left: 0; }
    .job-actions { flex-wrap: wrap; }
    .word-grid { grid-template-columns: 1fr 1fr; }
    .batch-grid { grid-template-columns: repeat(auto-fill, minmax(130px,1fr)); }
    .content-page { padding: 16px; }
    .match-title { font-size: 40px; }
    .match-swords { font-size: 64px; }
    .bottom-composer {
      padding: 10px;
      padding-bottom: max(10px, env(safe-area-inset-bottom));
    }
    .ability-bar { grid-template-columns: 1fr; }
    .ability-grid { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 2px; -webkit-overflow-scrolling: touch; }
    .ab-btn { flex: 0 0 auto; }
    .word-search-float { width: calc(100vw - 32px); right: 16px; left: 16px; }
    /* Inputs: force 16px to prevent iOS auto-zoom */
    input, select { font-size: 16px !important; }
  }

  /* ─── Job Tooltip ─── */
  .job-card { position: relative; }
  .job-tooltip {
    display: none;
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    width: 320px;
    max-height: 340px;
    overflow-y: auto;
    background: #1a1a2e;
    border: 1px solid #3a3a5c;
    border-radius: 10px;
    padding: 12px 14px;
    box-shadow: 0 8px 32px #0008;
    pointer-events: none;
  }
  .job-tooltip-text {
    font-family: inherit;
    font-size: 11.5px;
    line-height: 1.7;
    color: #ccd6f6;
    white-space: pre-wrap;
    margin: 0;
  }
  .job-card:hover .job-tooltip { display: block; }

  /* ─── Floating word search ─── */
  .syl-search-btn {
    background: none;
    border: 1px solid #3a3a5c;
    border-radius: 7px;
    color: #8892b0;
    padding: 5px 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: background 0.15s, color 0.15s;
  }
  .syl-search-btn:hover, .syl-search-btn.wsf-active {
    background: #2a2a4a;
    color: #ccd6f6;
    border-color: #6272a4;
  }
  /* ─── Search Tab Drawer ─── */
  .search-tab-drawer {
    position: fixed;
    right: 0;
    top: 56px;
    bottom: 0;
    width: 320px;
    background: var(--bg2);
    border-left: 1px solid var(--border);
    z-index: 150;
    transform: translateX(100%);
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s;
    display: flex;
    flex-direction: column;
    box-shadow: -10px 0 40px rgba(0,0,0,0);
  }
  .search-tab-drawer.search-drawer-open {
    transform: translateX(0);
    box-shadow: -10px 0 40px rgba(15,23,42,.12);
  }
  .search-tab-handle {
    position: absolute;
    left: -34px;
    top: 160px;
    width: 34px;
    height: 100px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-right: none;
    border-radius: 12px 0 0 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: -6px 0 16px rgba(0,0,0,0.04);
    transition: all 0.25s;
    color: var(--text2);
    user-select: none;
    z-index: -1;
  }
  .search-tab-handle:hover {
    color: var(--accent);
    background: var(--bg3);
    padding-right: 4px;
    left: -38px;
  }
  .search-drawer-open .search-tab-handle {
    background: var(--bg2);
    color: var(--accent);
    left: -32px;
    box-shadow: none;
  }
  .handle-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    writing-mode: vertical-lr;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 2px;
  }
  .search-drawer-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--bg2);
  }
  .sdc-header {
    padding: 18px 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg);
  }
  .sdc-header h3 { font-size: 15px; font-weight: 900; color: var(--text); letter-spacing: -.3px; }
  .sdc-close { 
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: var(--text3); transition: background .15s;
  }
  .sdc-close:hover { background: var(--border); color: var(--text); }
  .sdc-form { padding: 16px 20px; border-bottom: 1px solid var(--border); }
  .sdc-input-wrap { position: relative; }
  .sdc-input { 
    width: 100%; height: 44px; padding: 0 48px 0 14px; 
    font-size: 14px; background: var(--bg3); border: 1.5px solid var(--border2); border-radius: 10px; 
    transition: all .2s;
  }
  .sdc-input:focus { border-color: var(--accent); background: var(--bg2); box-shadow: 0 0 0 4px rgba(59,130,246,.12); }
  .sdc-submit { 
    position: absolute; right: 7px; top: 7px; width: 30px; height: 30px; 
    border-radius: 8px; background: var(--accent); color: #fff; 
    display: flex; align-items: center; justify-content: center;
    transition: transform .15s, background .15s;
  }
  .sdc-submit:hover { background: var(--accent2); transform: scale(1.05); }
  .sdc-results { flex: 1; overflow-y: auto; padding: 8px 0; }
  .sdc-item { 
    width: 100%; display: flex; align-items: center; justify-content: space-between; 
    padding: 11px 20px; gap: 12px; transition: all .15s; text-align: left; 
    border-bottom: 1px solid rgba(0,0,0,.02);
  }
  .sdc-item:hover { background: rgba(37,99,235,.05); padding-left: 24px; }
  .sdci-word { font-size: 14px; font-weight: 700; color: var(--text); flex: 1; }
  .sdci-kind { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px; flex-shrink: 0; }
  .sdci-k-한방 { background: #fee2e2; color: #ef4444; }
  .sdci-k-유도 { background: #fff7ed; color: #f97316; }
  .sdci-k-루트 { background: #f0fdf4; color: #22c55e; }
  .sdci-k-일반 { background: #f8fafc; color: #64748b; }
  .sdc-empty { padding: 48px 20px; text-align: center; color: var(--text3); font-size: 13px; }
  
  @media (max-width: 640px) {
    .search-tab-drawer {
      width: 100%; top: auto; height: 60vh;
      transform: translateY(100%); border-left: none;
      border-top: 1px solid var(--border); border-radius: 24px 24px 0 0;
    }
    .search-tab-drawer.search-drawer-open { transform: translateY(0); }
    .search-tab-handle {
      left: auto; right: 20px; top: -42px; width: 84px; height: 42px;
      border-radius: 14px 14px 0 0; border: 1px solid var(--border); border-bottom: none;
      writing-mode: horizontal-tb; z-index: 10;
    }
    .handle-inner { flex-direction: row; writing-mode: horizontal-tb; gap: 6px; }
  }

  /* --- Tab Styles --- */
  .sdc-tabs {
    display: flex;
    background: var(--bg3);
    padding: 0 12px;
    gap: 2px;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .sdc-tabs::-webkit-scrollbar { display: none; }
  .sdc-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: #e2e8f0;
    border: 1px solid var(--border);
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    cursor: pointer;
    white-space: nowrap;
    margin-top: 8px;
    transition: all 0.2s;
    position: relative;
  }
  .sdc-tab.tab-active {
    background: var(--bg2);
    color: var(--accent);
    border-color: var(--border);
    padding-bottom: 9px;
    margin-bottom: -1px;
    z-index: 2;
  }
  .sdc-tab-close {
    font-size: 12px;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
  }
  .sdc-tab-close:hover { background: rgba(0,0,0,0.1); color: #ef4444; }
  .sdc-tab-add {
    padding: 8px 12px;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    color: #94a3b8;
    transition: color 0.2s;
  }
  .sdc-tab-add:hover { color: var(--accent); }
  /* ═══════════════════════════════════════════
     JOB STATUS CHIPS
  ═══════════════════════════════════════════ */
  .job-status-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }
  .status-chip {
    display: inline-flex;
    align-items: center;
    height: 18px;
    padding: 0 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    gap: 4px;
    border: 1px solid rgba(0,0,0,.05);
    background: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,.02);
  }
  .status-label { opacity: .7; font-weight: 500; }
  .status-value { color: var(--text); }

  /* MJS Grid for Right Panel */
  .mj-status-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 12px;
    width: 100%;
  }
  .mj-status-item {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px;
    text-align: center;
  }
  .mjs-label { font-size: 10px; font-weight: 700; color: var(--text3); margin-bottom: 2px; }
  .mjs-value { font-size: 14px; font-weight: 800; color: var(--text); }

  /* Job Specific Styles */
  .status-investor { background: #fff7ed; border-color: #fed7aa; color: #c2410c; }
  .status-collector { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
  .status-watcher { background: #fdf2f8; border-color: #fbcfe8; color: #be185d; }
  .status-math { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
  .status-money { background: #fefce8; border-color: #fef08a; color: #a16207; }
  .status-death { background: #fafafa; border-color: #e5e5e5; color: #171717; }
  .status-composer, .status-composer-notes { background: #f5f3ff; border-color: #ddd6fe; color: #6d28d9; }
  .status-repair { background: #f0f9ff; border-color: #bae6fd; color: #0369a1; }
  .status-gojo { background: #f8fafc; border-color: #e2e8f0; color: #334155; }
  .status-pianist { background: #fff1f2; border-color: #fecdd3; color: #be123c; }
  .status-vault { background: #ecfdf5; border-color: #d1fae5; color: #047857; }
  .status-science { background: #fdf4ff; border-color: #f5d0fe; color: #a21caf; }
  .status-gandhi { background: #fff7ed; border-color: #ffedd5; color: #9a3412; }
  .status-star { background: #f0f9ff; border-color: #e0f2fe; color: #0369a1; }
  .status-comet { background: #f5f3ff; border-color: #ede9fe; color: #5b21b6; }
  .status-uranium { background: #f0fdf4; border-color: #dcfce7; color: #166534; }
  .status-dev { background: #f8fafc; border-color: #f1f5f9; color: #0f172a; }

  /* --- New feature styles --- */
  .mj-status-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px; }
  .mj-status-item { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; padding: 6px; text-align: center; }
  .mjs-label { display: block; font-size: 10px; color: #64748b; font-weight: 600; margin-bottom: 1px; }
  .mjs-value { display: block; font-size: 13px; font-weight: 800; color: #1e293b; }

  .ab-btn { position: relative; overflow: visible; }
  .ab-status-val { position: absolute; top: -7px; right: -7px; background: #ef4444; color: #fff; font-size: 10px; font-weight: 800; min-width: 18px; max-width: 72px; height: 18px; padding: 0 5px; border-radius: 9px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(239, 68, 68, 0.4); border: 2px solid #fff; z-index: 2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .target-selector-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
  .target-card { background: var(--bg2); border-radius: 20px; width: 90%; max-width: 400px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); overflow: hidden; animation: targetPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
  @keyframes targetPop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .tc-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: var(--bg3); }
  .tc-header h3 { font-size: 16px; font-weight: 700; color: var(--text); }
  .tc-close { background: none; border: none; font-size: 18px; color: var(--text3); cursor: pointer; }
  .tc-body { padding: 20px; }
  .tc-players, .tc-chosungs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .tc-chosungs { grid-template-columns: repeat(4, 1fr); }
  .tc-player-btn, .tc-chosung-btn { background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; padding: 12px; font-weight: 600; color: var(--text2); transition: all 0.2s; cursor: pointer; }
  .tc-player-btn:hover, .tc-chosung-btn:hover { background: var(--border); transform: translateY(-2px); }
  .tc-input-row { display: flex; gap: 8px; }
  .tc-input { flex: 1; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 16px; font-weight: 600; text-align: center; }
  .tc-submit { background: #3b82f6; color: #fff; padding: 0 20px; border-radius: 8px; font-weight: 700; cursor: pointer; border: none; }

  .effects-layer { position: fixed; inset: 0; pointer-events: none; z-index: 3000; overflow: hidden; }
  .activation-splash { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; animation: splashOut 1.5s forwards; }
  .splash-text { position: relative; z-index: 2; text-align: center; }
  .splash-kicker { display: block; font-size: 14px; font-weight: 900; letter-spacing: 0.2em; color: rgba(255,255,255,0.7); margin-bottom: 4px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
  .splash-name { display: block; font-size: 48px; font-weight: 900; color: #fff; text-shadow: 0 4px 20px rgba(0,0,0,0.5); }
  .splash-bg { position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, rgba(59,130,246,0.8) 0%, transparent 70%); border-radius: 50%; opacity: 0; animation: bgExpand 0.8s ease-out forwards; }
  .activation-splash.passive .splash-bg { background: radial-gradient(circle, rgba(16,185,129,0.8) 0%, transparent 70%); }
  
  @keyframes splashOut {
    0% { transform: scale(0.5); opacity: 0; }
    20% { transform: scale(1.1); opacity: 1; }
    30% { transform: scale(1); }
    80% { opacity: 1; filter: blur(0px); }
    100% { opacity: 0; transform: translateY(-50px) scale(1.2); filter: blur(10px); }
  }
  @keyframes bgExpand {
    0% { transform: scale(0.1); opacity: 0; }
    50% { opacity: 0.5; }
    100% { transform: scale(2); opacity: 0; }
  }

  .ongoing-section { margin-top: 20px; border-top: 1px solid var(--border); padding-top: 20px; }
  .ongoing-title { font-size: 13px; font-weight: 700; color: var(--text3); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  .ongoing-list { display: flex; flex-direction: column; gap: 8px; }
  .ongoing-card { display: flex; flex-direction: column; align-items: flex-start; padding: 12px 16px; background: var(--bg3); border: 1px solid var(--border2); border-radius: var(--radius-sm); transition: all 0.2s; text-align: left; }
  .ongoing-card:hover { background: var(--bg2); border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .og-room { font-size: 15px; font-weight: 800; color: var(--accent); }
  .og-meta { font-size: 12px; color: var(--text2); margin-top: 2px; }

  .online-dot { display: inline-block; width: 8px; height: 8px; background: #22c55e; border-radius: 50%; margin-left: 6px; box-shadow: 0 0 8px rgba(34,197,94,0.6); }
  .offline-label { font-size: 10px; color: var(--text3); font-weight: 500; margin-left: 6px; }

  /* ═══════════════════════════════════════════
     FLOATING CHAT
  ═══════════════════════════════════════════ */
  .floating-chat-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 16px;
  }
  .chat-toggle-btn {
    width: 56px;
    height: 56px;
    border-radius: 28px;
    background: var(--accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(37,99,235,0.4);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .chat-toggle-btn:hover {
    transform: scale(1.1) rotate(5deg);
    background: var(--accent2);
  }
  .chat-toggle-btn.chat-open {
    background: #475569;
    box-shadow: 0 8px 24px rgba(71,85,105,0.4);
  }
  .chat-window {
    width: 320px;
    height: 450px;
    background: var(--bg2);
    border-radius: 20px;
    box-shadow: 0 12px 48px rgba(0,0,0,0.18);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: chatPopUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: 1.5px solid var(--border);
  }
  @keyframes chatPopUp {
    from { opacity: 0; transform: translateY(20px) scale(0.9); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .chat-header {
    padding: 14px 18px;
    background: var(--bg3);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .chat-header-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 800;
    font-size: 14px;
    color: #1e293b;
  }
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--bg2);
    -webkit-overflow-scrolling: touch;
  }
  .chat-empty {
    text-align: center;
    color: var(--text3);
    font-size: 12px;
    margin-top: 40px;
  }
  .chat-msg {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: 85%;
  }
  .my-chat {
    align-self: flex-end;
    align-items: flex-end;
  }
  .chat-sender {
    font-size: 11px;
    font-weight: 700;
    color: var(--text3);
    margin-bottom: 4px;
    margin-left: 4px;
  }
  .my-chat .chat-sender {
    margin-left: 0;
    margin-right: 4px;
  }
  .chat-text {
    padding: 8px 12px;
    background: var(--bg3);
    border-radius: 14px 14px 14px 4px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text);
    word-break: break-word;
  }
  .my-chat .chat-text {
    background: var(--accent);
    color: #fff;
    border-radius: 14px 14px 4px 14px;
  }
  .chat-at {
    font-size: 9px;
    color: #94a3b8;
    margin-top: 4px;
  }
  .chat-form {
    padding: 12px;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 8px;
    background: var(--bg2);
  }
  .chat-input {
    flex: 1;
    height: 38px;
    padding: 0 14px;
    font-size: 13px;
    border-radius: 19px;
    border: 1px solid var(--border2);
  }
  .chat-input:focus {
    border-color: var(--accent);
    background: #fff;
  }
  .chat-send {
    width: 38px;
    height: 38px;
    border-radius: 19px;
    background: var(--accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .chat-send:hover:not(:disabled) {
    transform: scale(1.05);
    background: var(--accent2);
  }
  
  @media (max-width: 640px) {
    .floating-chat-container {
      bottom: max(80px, calc(70px + env(safe-area-inset-bottom)));
      right: 16px;
    }
    .chat-window {
      width: calc(100vw - 32px);
      height: 400px;
    }
  }

  /* ═══════════════════════════════════════════
     THEME BUTTON & DM BADGE
  ═══════════════════════════════════════════ */
  .theme-btn { position: relative; }
  .dm-badge {
    position: absolute;
    top: -4px; right: -4px;
    min-width: 16px; height: 16px;
    background: var(--red);
    color: #fff;
    font-size: 9px;
    font-weight: 800;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    padding: 0 3px;
    border: 2px solid var(--bg);
  }

  /* ═══════════════════════════════════════════
     DM PANEL
  ═══════════════════════════════════════════ */
  .dm-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.4);
    backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
    z-index: 900;
    animation: overlayIn .2s ease both;
  }
  .dm-panel {
    position: fixed;
    top: 0; right: 0; bottom: 0;
    width: min(480px, 100vw);
    background: var(--bg2);
    border-left: 1.5px solid var(--border);
    z-index: 950;
    display: flex; flex-direction: column;
    box-shadow: -10px 0 40px rgba(0,0,0,.15);
    animation: slideFromRight .3s cubic-bezier(0.16,1,0.3,1) both;
  }
  @keyframes slideFromRight {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);   opacity: 1; }
  }
  .dm-panel-header {
    height: 56px;
    padding: 0 20px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    background: var(--bg3);
    flex-shrink: 0;
  }
  .dm-panel-title {
    display: flex; align-items: center; gap: 8px;
    font-size: 15px; font-weight: 800; color: var(--text);
  }
  .dm-close {
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: var(--text3); transition: background .15s, color .15s;
  }
  .dm-close:hover { background: var(--border); color: var(--text); }
  .dm-panel-body {
    flex: 1; display: flex; min-height: 0;
  }
  .dm-inbox {
    width: 160px; flex-shrink: 0;
    border-right: 1px solid var(--border);
    overflow-y: auto;
    background: var(--bg3);
    -webkit-overflow-scrolling: touch;
  }
  .dm-section-label {
    padding: 12px 14px 6px;
    font-size: 10px; font-weight: 800; letter-spacing: .5px;
    color: var(--text3); text-transform: uppercase;
  }
  .dm-conv-item {
    width: 100%;
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px;
    text-align: left;
    transition: background .15s;
    border-bottom: 1px solid var(--border);
  }
  .dm-conv-item:hover, .dm-conv-item.dm-conv-active {
    background: var(--bg2);
  }
  .dm-conv-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--accent); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 800;
    flex-shrink: 0;
  }
  .dm-conv-info { flex: 1; min-width: 0; }
  .dm-conv-name { font-size: 12px; font-weight: 700; color: var(--text); }
  .dm-conv-preview { font-size: 11px; color: var(--text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
  .dm-empty-inbox { padding: 20px 14px; font-size: 12px; color: var(--text3); text-align: center; }
  .dm-conversation {
    flex: 1; display: flex; flex-direction: column; min-width: 0;
  }
  .dm-new-row {
    padding: 12px;
    border-bottom: 1px solid var(--border);
    display: flex; gap: 8px;
    background: var(--bg3);
    flex-shrink: 0;
  }
  .dm-target-input {
    flex: 1; height: 36px; padding: 0 12px;
    font-size: 14px;
    border-radius: 18px;
  }
  .dm-go-btn {
    height: 36px; padding: 0 14px;
    background: var(--accent); color: #fff;
    border-radius: 18px;
    font-size: 13px; font-weight: 700;
    transition: background .15s;
  }
  .dm-go-btn:hover:not(:disabled) { background: var(--accent2); }
  .dm-messages {
    flex: 1; overflow-y: auto;
    padding: 16px; display: flex; flex-direction: column; gap: 10px;
    -webkit-overflow-scrolling: touch;
  }
  .dm-msg {
    display: flex; flex-direction: column; align-items: flex-start;
    max-width: 80%;
  }
  .dm-msg-mine { align-self: flex-end; align-items: flex-end; }
  .dm-msg-sender { font-size: 10px; font-weight: 700; color: var(--text3); margin-bottom: 3px; }
  .dm-msg-text {
    padding: 8px 12px;
    background: var(--bg3);
    border-radius: 14px 14px 14px 4px;
    font-size: 13px; line-height: 1.5;
    color: var(--text); word-break: break-word;
  }
  .dm-msg-mine .dm-msg-text {
    background: var(--accent); color: #fff;
    border-radius: 14px 14px 4px 14px;
  }
  .dm-msg-at { font-size: 9px; color: var(--text3); margin-top: 3px; }
  .dm-msg-empty, .dm-no-target {
    flex: 1; display: flex; align-items: center; justify-content: center;
    font-size: 13px; color: var(--text3); padding: 24px; text-align: center;
  }
  .dm-send-form {
    padding: 12px;
    border-top: 1px solid var(--border);
    display: flex; gap: 8px;
    background: var(--bg2);
    flex-shrink: 0;
  }
  .dm-send-input {
    flex: 1; height: 38px; padding: 0 14px;
    font-size: 14px; border-radius: 19px;
  }
  .dm-send-btn {
    width: 38px; height: 38px; border-radius: 19px;
    background: var(--accent); color: #fff;
    display: flex; align-items: center; justify-content: center;
    transition: background .2s, transform .2s;
  }
  .dm-send-btn:hover:not(:disabled) { background: var(--accent2); transform: scale(1.05); }

  @media (max-width: 640px) {
    .dm-panel { width: 100vw; border-left: none; }
    .dm-inbox { width: 120px; }
  }

  /* ═══════════════════════════════════════════
     SETTINGS PAGE
  ═══════════════════════════════════════════ */
  .settings-page { max-width: 480px; }
  .settings-title {
    display: flex; align-items: center; gap: 10px;
    font-size: 22px; font-weight: 900; color: var(--text);
    margin-bottom: 28px;
  }
  .settings-section {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: 16px;
    padding: 22px 24px;
    margin-bottom: 16px;
  }
  .settings-section-label {
    font-size: 11px; font-weight: 800; letter-spacing: .6px;
    text-transform: uppercase; color: var(--text3);
    margin-bottom: 14px;
  }
  .settings-section-desc {
    font-size: 12px; color: var(--text2); margin-bottom: 14px; line-height: 1.5;
  }
  .theme-options { display: flex; gap: 10px; }
  .theme-option-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 16px 12px;
    border: 2px solid var(--border);
    border-radius: 12px;
    background: var(--bg3);
    color: var(--text2);
    font-size: 13px; font-weight: 700;
    transition: all .2s;
  }
  .theme-option-btn:hover { border-color: var(--accent); color: var(--text); background: var(--bg2); }
  .theme-option-btn.theme-opt-active {
    border-color: var(--accent);
    background: var(--bg2);
    color: var(--accent);
    box-shadow: 0 0 0 3px rgba(59,130,246,.15);
  }
  .settings-color-row {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    margin-bottom: 14px;
  }
  .settings-color-preview {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px;
    background: var(--bg3); border-radius: 10px;
  }
  .scp-label { font-size: 12px; color: var(--text3); font-weight: 600; }
  .scp-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
  .scp-btn {
    height: 28px; padding: 0 14px; border-radius: 14px;
    color: #fff; font-size: 12px; font-weight: 700;
  }

  /* ═══════════════════════════════════════════
     DARK MODE — job tooltip (hardcoded dark bg)
  ═══════════════════════════════════════════ */
  :global([data-theme="dark"]) .job-tooltip { background: #0d0f14; border-color: var(--border2); }
  :global([data-theme="dark"]) .job-tooltip-text { color: #b8c4e0; }
</style>
