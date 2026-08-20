<script>
  import { browser } from '$app/environment';
  import { onDestroy, tick } from 'svelte';
  import {
    Ban, BarChart3, BookOpen, Bot, BriefcaseBusiness, Clock, Flag, Info, LogIn, LogOut, Mail, MessageSquare, Moon, Plus,
    Search, Send, Settings, Shuffle, Sparkles, Sun, Swords, UserRoundPlus, Users, Vote, X
  } from 'lucide-svelte';
  import { apiUrl, wsUrl } from '$lib/api-base';
  import { jobImageSrc } from '$lib/jobImages';
  import TierMaker from '$lib/components/TierMaker.svelte';

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
    투자자: ['조작', '도박'],
    환자: ['환각증'],
    수집가: ['제작', '채굴'],
    감시자: ['탐지'],
    뜀틀선수: ['뜀틀', '허들 넘기'],
    전우치: ['직격뢰'],
    기관사: ['폭주기관차'],
    시프터: ['시프트', '빅 시프트'],
    비밀요원: ['포획'],
    사과: ['사구아'],
    시인: ['2음절', '유도음절', '시적 허용'],
    공룡: ['삼키기', '브레스', '꼬리 날리기'],
    마법사: ['공허', '폭발'],
    사신: ['사형 선고', '영혼'],
    '?': ['?', '물음표', '쉼표', '마침표'],
    수학자: ['계산', '덧셈', '뺄셈', '곱셈', '교정', '미적분'],
    과학자: ['DNA파괴'],
    작곡가: ['쪼개기', '쉼표'],
    스폰지밥: ['게살버거', '감자튀김', '보너스', '강도 채용'],
    나이트: ['체크메이트', '교환', '울음'],
    생존자: ['아이쿠', '긴급 구조'],
    악당: ['결계', '왜곡'],
    기자: ['거짓 보도', '거짓 뉴스'],
    검객: ['찌르기', '가르기'],
    마하트마간디: ['억제'],
    수리사: ['수리'],
    우라늄: ['핵분열'],
    피보나치: ['뤼카 수열'],
    고죠: ['무량공처'],
    스핔이: ['물걸레질', '호박'],
    해달: ['조개', '깨부수기'],
    프로그래머: ['Shift', 'Caps Lock', 'Backspace', 'Tab', '담임의 가호', '교장의 가호'],
    홍명보: ['손흥민의 눈물', '옌스의 눈물', 'LA 도주', '제 안에 있는 무언가가 나오기 시작했습니다'],
    페인터: ['페인트', '카피'],
    반장: ['담임의 가호', '교장의 가호']
  };

  const TUTORIAL_CHAPTERS = [
    {
      title: '채린룰이란?',
      lead: '기본 끝말잇기 룰을 바탕으로, 단어 분류와 직업 능력으로 수 싸움을 만드는 채린룰식 끝말잇기입니다.',
      points: [
        '단어는 사전에 실린 표준어를 기준으로 사용하며, 사이트는 표준국어대사전 구버전 기반 단어 목록을 사용합니다.',
        '표준 두음법칙을 적용합니다. 예를 들어 라/나, 래/내, 로/노, 루/누, 리/이처럼 이어질 수 있습니다.',
        '채린룰은 검색 허용 게임입니다. 검색 탭과 게임 중 검색 서랍을 써서 가능한 단어, 공격 음절, 방어 수를 확인하세요.',
        '첫 수에는 한방단어와 유도단어를 사용할 수 없으므로, 초반에는 안전한 일반단어로 판을 열고 이후 압박을 설계합니다.'
      ]
    },
    {
      title: '한방단어 이해하기',
      lead: '핵심은 “상대가 받은 끝음절에서 이어갈 수 있는가”입니다. 음절의 위험도를 보면 단어의 역할이 보입니다.',
      terms: [
        ['한방음절', '그 음절로 시작하는 합법 단어가 사실상 없어 받으면 지기 쉬운 음절입니다. 예: 특정 희귀 끝음절로 끝내 상대의 다음 수를 막는 상황.'],
        ['유도음절', '바로 끝내지는 않지만 상대가 대응하면 다시 한방음절로 몰리기 쉬운 음절입니다. 예: 상대가 몇 수 안에 위험 음절을 받을 가능성이 커지는 길목.'],
        ['루트음절', '한방이나 유도로 이어지는 공격 루트의 출발점입니다. 즉시 치명타는 아니지만 공격 전개가 시작되는 음절입니다.'],
        ['한방단어', '끝음절이 한방음절인 단어입니다. 상대에게 바로 패배 압박을 줍니다.'],
        ['유도단어', '끝음절이 유도음절인 단어입니다. 상대의 선택지를 줄이고 다음 공격을 유도합니다.'],
        ['루트단어', '끝음절이 루트음절인 단어입니다. 초중반 빌드업이나 능력 조건을 맞출 때 중요합니다.'],
        ['돌림단어', '시작음절과 끝음절이 같거나 다시 자기에게 유리한 흐름으로 돌아오게 만드는 단어입니다. 막혔을 때 템포를 벌기 좋습니다.']
      ],
      points: [
        '검색 결과의 K는 한방, I는 유도, R은 루트로 보면 됩니다. A는 주요 공격 음절 묶음으로, 한방 K와 완전히 같은 뜻은 아닙니다.',
        '좋은 공격은 한방단어 하나를 외우는 것보다 루트단어에서 유도단어, 한방단어로 이어지는 길을 아는 것입니다.',
        '상대가 직업 능력으로 한방/유도를 막을 수 있다면, 바로 치기보다 루트단어로 능력을 빼는 선택도 강합니다.'
      ]
    },
    {
      title: '직업 시스템',
      lead: '직업은 단어 실력 위에 얹히는 전술 카드입니다. 내 직업의 승리 조건과 상대 직업의 방해 수단을 함께 봐야 합니다.',
      points: [
        '직업 선택 전에는 직업 탭에서 패시브, 액티브, 쿨타임, 사용 횟수, 조건을 먼저 읽습니다.',
        '밴 단계에서는 내가 싫어하는 직업보다 내 직업의 핵심 플랜을 끊는 직업을 우선으로 막는 편이 좋습니다.',
        '능력은 “막혔을 때 탈출”뿐 아니라 “상대의 방어 능력을 먼저 빼기”, “한방 금지 턴 만들기”, “유도 루트 보존하기”에도 씁니다.',
        '상태 패널의 한방불가, 유도금지, 두음금지, 능력불가 같은 디버프를 매턴 확인하면 실수를 크게 줄일 수 있습니다.'
      ]
    },
    {
      title: '실전 운영 팁',
      lead: '단어 검색을 많이 하는 게임일수록, 검색 결과를 “지금 둘 단어”가 아니라 “다음 세 턴의 모양”으로 읽는 습관이 중요합니다.',
      points: [
        '내가 낼 단어의 끝음절만 보지 말고, 상대가 그 음절에서 낼 수 있는 대표 대응 단어의 끝음절까지 확인합니다.',
        '한방단어를 바로 낼 수 있어도 상대가 한방불가 능력을 가졌다면, 유도단어로 돌아가거나 직업 능력 사용을 기다립니다.',
        '불리할 때는 긴 단어보다 안전한 돌림단어, 루트 회피 단어, 두음법칙으로 빠지는 단어가 더 가치 있을 수 있습니다.',
        '팀전에서는 내가 공격을 못 해도 다음 팀원이 공격하기 좋은 음절을 넘기는 것이 강한 수가 됩니다.'
      ]
    }
  ];

  const SITE_HELP_STEPS = [
    {
      title: '시작하기',
      body: '로그인 후 방 목록에서 참가하거나 새 방을 만듭니다. 인원·모드·사전 등을 설정할 수 있고, 대기실에서 봇을 추가할 수도 있습니다.'
    },
    {
      title: '직업 선택',
      body: '직업 선택 화면에서 직업을 고르면 게임에 참가합니다. 밴 단계가 뜨면 상대가 쓰기 까다로운 직업을 최대 개수만큼 막고 확정합니다.'
    },
    {
      title: '단어 입력',
      body: '내 차례에는 하단 입력창에 이을 음절로 시작하는 단어를 넣습니다. 첫 단어는 자유지만 첫 수에는 한방과 유도 단어가 제한됩니다.'
    },
    {
      title: '능력 사용',
      body: '내 직업의 액티브 능력은 입력창 위 버튼으로 사용합니다. 대상이 필요한 능력은 플레이어, 음절, 초성을 고르는 창이 먼저 열립니다.'
    },
    {
      title: '단어 검색',
      body: '검색 탭이나 게임 중 검색 서랍에서 기*, *차, 기? 같은 식으로 찾습니다. K는 한방, I는 유도, R은 루트, A는 주요 공격 음절 묶음으로 검색할 수 있습니다.'
    },
    {
      title: '투표와 종료',
      body: '잘못 입력했을 때는 무효 신청을 보내고, 상대가 요청한 투표에는 동의 또는 거절합니다. 더 진행하기 어렵다면 항복 버튼으로 게임을 끝낼 수 있습니다.'
    },
    {
      title: '티어와 직업 정보',
      body: '전체 랭킹은 랭킹 탭에서 보고, 직업 설명·직업별 랭킹·레이팅 티어표·직업 티어 메이커는 직업 탭에서 확인합니다.'
    }
  ];

  let nickname = $state('');
  let username = $state('');
  let password = $state('');
  let authMode = $state('login');
  let showAuthPanel = $state(false);
  let authReady = $state(false);
  let showCreateWizard = $state(false);
  let wizardStep = $state(0);
  let chainMode = $state('end');
  let ruleMode = $state('guerule');
  let duEum = $state(true);
  let rated = $state(true);
  let pyohanLives = $state(3);
  let geonmatRounds = $state(5);
  let roomName = $state('');
  let roomPassword = $state('');
  let showJoinPassword = $state(false);
  let pendingJoinRoom = $state('');
  let joinPasswordInput = $state('');
  let joinPasswordEl = $state();
  let showBotSetup = $state(false);
  let showInviteModal = $state(false);
  let waitSettingsOpen = $state(false);
  let friends = $state([]);
  let friendIncoming = $state([]);
  let friendOutgoing = $state([]);
  let roomInvites = $state([]);
  let friendAddInput = $state('');
  let friendsBusy = $state(false);
  let botCpuLevel = $state('보통');
  let botCpuThink = $state(false);
  let botCpuJobMode = $state('random');
  let botCpuJob = $state('');
  let user = $state(null);
  let room = $state('');
  let mode = $state(1);
  let playerCount = $state(2);
  let practice = $state(false);
  // 조합: draft abilities from an open pool instead of picking a job.
  let combat = $state(false);
  let cpuJob = $state('');
  let timerEnabled = $state(true);
  let timerMinutes = $state(10);
  let timerIncrement = $state(3);
  let disabledJobs = $state([]);
  let dictSource = $state('default');
  let gameMode = $state('guerule');
  let searchAllowed = $state(false);
  let cpuLevel = $state('');
  let cpuThink = $state(false);
  let word = $state('');
  let premoveWord = $state('');
  let premoveStatus = $state('');
  let premoveSending = $state(false);
  let premoveAttemptKey = $state('');
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
  let analysisJobA = $state('해커');
  let analysisJobB = $state('사과');
  let analysisSyllable = $state('');
  let analysisSituation = $state('');
  let analysis = $state(null);
  let analysisMode = $state('syllable');
  let batchAnalysis = $state(null);
  let analysisBusy = $state(false);
  let tab = $state('game');
  let jobTabJob = $state('해커');
  let jobFilter = $state('');
  let busy = $state(false);
  let cpuThinking = $state(false);
  let error = $state('');
  let errorTimer;
  let hasMatched = $state(false);
  let poller;
  let socket;
  let historyEl = $state();
  let wordInputEl = $state();
  let jobInfoByJob = $state({});
  let showWordSearch = $state(false);
  const initialInGameTabId = Date.now();
  let inGameTabs = $state([{ id: initialInGameTabId, query: '', results: [] }]);
  let activeInGameTabId = $state(initialInGameTabId);
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
      const res = await fetch(apiUrl(`/api/dm?with=${encodeURIComponent(dmTarget.trim())}`), { credentials: 'include' });
      if (res.ok) { const d = await res.json(); dmMessages = d.messages || []; }
    } catch {}
  }

  async function fetchDMInbox() {
    if (!user) return;
    try {
      const res = await fetch(apiUrl('/api/dm'), { credentials: 'include' });
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
      await fetch(apiUrl('/api/dm'), {
        method: 'POST',
        credentials: 'include',
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
    if (showDM && user && !user.isGuest) {
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
  let roomList = $state([]);
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
  // 능력 발동 연출. 봇이 문장 앞에 ⟦FX:종류:능력:직업⟧ 표시를 붙여 보낸다.
  // 표시는 화면에 그대로 두지 않고 여기서 떼어내 카드로 만든다.
  const FX_RE = /⟦FX:([ap]):([^:⟧]*):([^⟧]*)⟧\s*/;
  function parseFx(text) {
    const raw = String(text || '');
    const m = raw.match(FX_RE);
    if (!m) return null;
    return {
      passive: m[1] === 'p',
      ability: m[2],
      job: m[3],
      body: raw.replace(FX_RE, '').replace(/^\[시스템\]:\s*/, '').trim()
    };
  }
  function stripFx(text) {
    return String(text || '').replace(FX_RE, '');
  }
  // 능력마다 색과 연출이 고정되도록 이름에서 뽑는다.
  function fxHash(name, salt = 0) {
    let h = salt;
    for (let i = 0; i < String(name).length; i++) h = (h * 31 + String(name).charCodeAt(i)) & 0x7fffffff;
    return h;
  }
  function fxHue(name) { return fxHash(name) % 360; }
  // 두 번째 색을 멀찍이 띄워 카드마다 그라데이션이 다르게 보이게 한다.
  function fxHue2(name) { return (fxHue(name) + 70 + (fxHash(name, 7) % 120)) % 360; }
  const FX_MOTIFS = ['slash', 'burst', 'pulse', 'glitch'];
  function fxMotif(name) { return FX_MOTIFS[fxHash(name, 13) % FX_MOTIFS.length]; }

  // 기록이 로그에 남아 있는 한 카드가 계속 붙어 있으면 안 되므로 수명을 준다.
  const FX_CARD_MS = 14000;
  const abilityFxAll = $derived(
    log
      .filter((item) => item.type === 'system' && FX_RE.test(item.text || ''))
      .slice(-3)
      .map((item) => ({ id: item.id, at: Number(item.at) || 0, ...parseFx(item.text) }))
      .reverse()
  );
  // 새 메시지가 안 와도 시간이 지나면 사라져야 해서 따로 시계를 돌린다.
  let fxNow = $state(Date.now());
  $effect(() => {
    if (!abilityFxAll.length) return;
    const timer = setInterval(() => { fxNow = Date.now(); }, 1000);
    return () => clearInterval(timer);
  });
  const abilityFx = $derived(abilityFxAll.filter((item) => item.at && fxNow - item.at < FX_CARD_MS));

  // 발동 순간 화면 전체를 덮는 연출. 같은 능력이 또 떠도 다시 재생되도록
  // seq 를 키로 써서 애니메이션을 처음부터 돌린다.
  let castFx = $state(null);
  let castSeq = $state(0);
  let castSeenId = null;
  let castPrimed = false;
  let castTimer = null;
  $effect(() => {
    // 컷인은 카드 수명과 무관하게 "새 발동"에만 반응해야 한다.
    const latest = abilityFxAll[0];
    if (!latest) return;
    if (!castPrimed) {
      // 새로고침·재접속 때 이미 쌓여 있던 기록으로 컷신이 터지지 않게 한 번 건너뛴다.
      castPrimed = true;
      castSeenId = latest.id;
      return;
    }
    if (latest.id === castSeenId) return;
    castSeenId = latest.id;
    castFx = latest;
    castSeq += 1;
    clearTimeout(castTimer);
    castTimer = setTimeout(() => { castFx = null; }, 1700);
  });
  onDestroy(() => clearTimeout(castTimer));

  const notices = $derived(log.filter((item) => item.type === 'system' && !isGuiOnlyNotice(item.text)).slice(-4).reverse());
  const abilityButtons = $derived(ACTIVE_BY_JOB[myState?.job] || []);
  const visibleHistory = $derived.by(() => {
    const all = game?.history || [];
    const offset = Math.max(0, all.length - 14);
    return all.slice(offset).map((word, i) => ({ word, index: offset + i, key: `${offset + i}:${word}` }));
  });
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
    train_rush_uses: '폭주 회수',
    shift_uses: '시프트 회수', big_shift_uses: '빅시프트 회수',
    capture_cooldown: '포획 쿨', capture_uses: '포획 회수',
    sagua_uses: '사구아 회수',
    poetic_2_cooldown: '2음절 쿨', poetic_2_uses: '2음절 회수',
    poetic_yudo_cooldown: '유도음절 쿨', poetic_yudo_uses: '유도음절 회수',
    poetic_allow_cooldown: '시적허용 쿨', poetic_allow_uses: '시적허용 회수',
    swallow_cooldown: '삼키기 쿨', swallow_uses: '삼키기 회수',
    breath_uses: '브레스 회수', tail_uses: '꼬리 회수',
    void_cooldown: '공허 쿨', void_uses: '공허 회수',
    explosion_uses: '폭발 회수',
    death_cooldown: '사형선고 쿨', death_uses: '사형선고 회수', soul_uses: '영혼 회수',
    math_calc_uses: '계산 회수', math_add_uses: '덧셈 회수', math_sub_uses: '뺄셈 회수', math_mul_uses: '곱셈 회수', math_fix_uses: '교정 회수', math_calculus_uses: '미적분 회수',
    math_study_uses_left: '공부 회수',
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
    programmer_shift_uses: 'Shift 회수', programmer_caps_uses: 'Caps 회수', programmer_backspace_uses: 'BS 회수', programmer_tab_uses: 'Tab 회수',
    bowling_strike_cooldown: '스트라이크 쿨', bowling_strike_uses: '스트라이크 회수',
    bowling_spare_cooldown: '스페어 쿨', bowling_spare_uses: '스페어 회수',
    class_president_homeroom_cooldown: '가호 쿨', class_president_homeroom_uses: '가호 회수', class_president_principal_uses: '교장 회수'
  };

  const ABILITY_CONFIG = {
    '조작': { uses: 'jojak_uses', max: 3, cd: 'jojak_cooldown' },
    '복제': { uses: 'bokje_uses', max: 1 },
    '초토화': { uses: 'chotohwa_uses', max: 1, cd: 'chotohwa_cooldown' },
    '주가 도박': { uses: 'debtor_gamble_uses', max: 2, cd: 'debtor_gamble_cooldown' },
    '환각증': { uses: 'hallucination_uses', max: 1 },
    '제작': { cd: 'make_cooldown' },
    '채굴': { uses: 'mine_uses', max: 1, cd: 'mine_cooldown' },
    '탐지': { uses: 'detect_uses', max: 1, cd: 'detect_cooldown' },
    '뜀틀': { uses: 'vault_uses', max: 3, cd: 'vault_cooldown' },
    '허들 넘기': { uses: 'hurdle_uses', max: 1 },
    '직격뢰': { uses: 'lightning_uses', max: 2, cd: 'lightning_cooldown' },
    '폭주기관차': { uses: 'train_rush_uses', max: 2 },
    '시프트': { uses: 'shift_uses', max: 3 },
    '빅 시프트': { uses: 'big_shift_uses', max: 1 },
    '포획': { uses: 'capture_uses', max: 2, cd: 'capture_cooldown' },
    '사구아': { uses: 'sagua_uses', max: 1 },
    '2음절': { uses: 'poetic_2_uses', max: 2, cd: 'poetic_2_cooldown' },
    '유도음절': { uses: 'poetic_yudo_uses', max: 2, cd: 'poetic_yudo_cooldown' },
    '시적 허용': { uses: 'poetic_allow_uses', max: 1, cd: 'poetic_allow_cooldown' },
    '삼키기': { uses: 'swallow_uses', max: 1, cd: 'swallow_cooldown' },
    '브레스': { uses: 'breath_uses', max: 1 },
    '꼬리 날리기': { uses: 'tail_uses', max: 1 },
    '공허': { uses: 'void_uses', max: 2, cd: 'void_cooldown' },
    '폭발': { uses: 'explosion_uses', max: 1 },
    '사형 선고': { uses: 'death_uses', max: 1, cd: 'death_cooldown' },
    '영혼': { uses: 'soul_uses', max: 1 },
    '계산': { uses: 'math_calc_uses', max: 10 },
    '덧셈': { uses: 'math_add_uses', max: 10 },
    '뺄셈': { uses: 'math_sub_uses', max: 10 },
    '곱셈': { uses: 'math_mul_uses', max: 10 },
    '교정': { uses: 'math_fix_uses', max: 10 },
    '미적분': { uses: 'math_calculus_uses', max: 10 },
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
    'Tab': { uses: 'programmer_tab_uses', max: 1 },
    '스트라이크': { uses: 'bowling_strike_uses', max: 3, cd: 'bowling_strike_cooldown' },
    '스페어': { uses: 'bowling_spare_uses', max: 2, cd: 'bowling_spare_cooldown' },
    '담임의 가호': { uses: 'class_president_homeroom_uses', max: 2, cd: 'class_president_homeroom_cooldown' },
    '교장의 가호': { uses: 'class_president_principal_uses', max: 1 }
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
    '결계': 'chosung', '유도음절': 'syllable'
  };

  const myStatusList = $derived.by(() => {
    if (!myState) return [];
    return Object.entries(STATUS_LABELS)
      .filter(([key]) => myState[key] !== undefined && myState[key] !== 0 && myState[key] !== null)
      .map(([key, label]) => ({ label, value: myState[key] }));
  });

  const PASSIVE_BY_JOB = {
    '해커': [], '투자자': ['투자의 귀재'], '환자': ['강박증'], '수집가': ['수집'],
    '감시자': ['감시'], '뜀틀선수': ['뜀틀'], '전우치': ['잔상'], '시프터': [],
    '비밀요원': ['타깃 확보'], '사과': ['삭와'], '시인': [], '공룡': [],
    '마법사': ['부작용'], '사신': ['처형'], '수학자': ['논문 발표', '공부'],
    '과학자': ['실험'], '작곡가': ['작곡'], '스폰지밥': ['저금통'],
    '나이트': ['L자 도약'], '생존자': ['신호'], '악당': [], '기자': [],
    '검객': [], '마하트마간디': ['비폭력'], '은하계전사': ['별인 듯 달 아닌 별'],
    '혜성전사': ['핼리 혜성'], '수리사': ['방탄'], '고죠': [], '우라늄': ['방사선', '감마 수열'],
    '스핔이': ['백수가 쪼아요'], '해달': [], '프로그래머': [], '홍명보': ['홍명보', 'ㅎㅁㅂ', '명보'], '페인터': ['페인터', 'ㅍㅇㅌ'], '반장': ['반장']
  };

  function findAbilityMatch(text, dict) {
    const players = Object.entries(game?.playerStates || {})
      .map(([player, state]) => ({ player, job: state?.job }))
      .filter(p => p.job);
    for (const { job } of players) {
      const list = dict[job] || [];
      for (const item of list) {
        if (text.startsWith(item) || text.includes(`${item} 발동`) || text.includes(`${item} 완료`) || text.includes(`${item} 효과`) || text.includes(`${item} 패시브`)) {
          return { name: item, job };
        }
      }
    }
    return null;
  }

  let lastProcessedLogId = $state(null);
  $effect(() => {
    room; // reset on room change
    lastProcessedLogId = null;
  });
  $effect(() => {
    if (log.length > 0) {
      const last = log[log.length - 1];
      if (last.id === lastProcessedLogId) return;
      const isFirstSeen = lastProcessedLogId === null;
      lastProcessedLogId = last.id;
      if (isFirstSeen) return;
      if (last.type === 'system') {
        // 능력 발동 메시지인지부터 가른다. 발동 알림은 오류가 아니고,
        // 내부 표시가 그대로 화면에 나가서도 안 된다.
        const isAbilityCast = FX_RE.test(last.text || '');
        const text = stripFx(last.text).replace('[시스템]: ', '').replace(/^\[!\]\s*/, '').trim() || '';
        let effectTriggered = isAbilityCast;

        if (text.includes('ㅈㅈ를 쳤다') || text.includes('항복') || text.includes('기권')) {
          triggerEffect('항복', 'surrender');
          effectTriggered = true;
        }

        // 1. 패시브 감지 (모든 플레이어 직업 검사)
        if (!effectTriggered) {
          const passive = findAbilityMatch(text, PASSIVE_BY_JOB);
          if (passive) {
            triggerEffect(passive.name, 'passive', passive.job);
            effectTriggered = true;
          }
        }

        // 2. 액티브 능력 감지 (모든 플레이어 직업 검사)
        if (!effectTriggered) {
          const active = findAbilityMatch(text, ACTIVE_BY_JOB);
          if (active) {
            triggerEffect(active.name, 'active', active.job);
            effectTriggered = true;
          }
        }

        // 3. 에러 메시지 감지 및 토스트 표시
        // '글자'·'사용할 수 없습니다' 같은 조각은 능력 설명에도 흔해서 그대로 쓰면
        // 멀쩡한 안내가 오류로 뜬다. 실제로 입력이 거절됐을 때 쓰는 문장만 본다.
        const isError = !isAbilityCast && [
          '이미 사용된 단어', '사전에 없는', '사전적 단어', '시작하지 않습니다',
          '시작해야 합니다', '차례가 아닙니다', '쿨타임입니다', '모두 사용했습니다',
          '부족합니다', '지정해주세요', '사용할 수 없는 단어', '위반'
        ].some(err => text.includes(err));

        if (isError && !effectTriggered) showError(text);
      }
    }
  });

  function triggerEffect(name, type, jobName = '') {
    const id = Math.random();
    const job = jobName || '';
    const jobImage = job ? jobImageSrc(job) : '';
    activeEffects = [...activeEffects, { id, name, type, job, jobImage }];
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
  const jobCatalog = $derived(
    availableJobs.filter((job) => !jobFilter.trim() || job.includes(jobFilter.trim()))
  );
  const jobTabInfo = $derived(jobInfoByJob[jobTabJob] || '직업 정보를 불러오는 중입니다.');
  const jobTabInfoCards = $derived(jobInfoCards(jobTabInfo));
  const jobTabAbilities = $derived(ACTIVE_BY_JOB[jobTabJob] || []);
  const jobTabRanking = $derived(jobRanking[jobTabJob] || []);
  const isBanPhase = $derived(game?.phase === 'job_selection' && game?.banPhase);
  const isBanPicker = $derived(isBanPhase && game?.firstPicker === nickname);
  const isBanWaiting = $derived(isBanPhase && game?.firstPicker && game?.firstPicker !== nickname);
  const bannedJobs = $derived(game?.bannedJobs || []);
  // 조합(ability draft) mode replaces job selection with a snake draft over an open pool.
  const combatDraft = $derived(game?.combatDraft || null);
  const isDrafting = $derived(game?.phase === 'combat_draft' && !!combatDraft);
  const isMyPick = $derived(isDrafting && combatDraft.currentPlayer === nickname);
  const myKit = $derived(game?.kits?.[nickname] || []);
  const roomDisabledJobs = $derived(snapshot?.meta?.disabledJobs || []);
  const unavailableJobs = $derived(Array.from(new Set([...(bannedJobs || []), ...(roomDisabledJobs || [])])));
  const selectableJobs = $derived(availableJobs.filter((job) => !unavailableJobs.includes(job)));
  const timerState = $derived(snapshot?.meta?.timer || null);
  const activeDictSource = $derived(
    game?.gueruleSettings?.dictSource || snapshot?.meta?.dictSource || dictSource || 'default'
  );
  const isGeonmatMode = $derived(String(ruleMode).startsWith('geonmat:'));
  const supportsChainPick = $derived(!isGeonmatMode && ['guerule', 'combat', 'card', 'pyohan', 'kkutu'].includes(ruleMode));
  const supportsDuEum = $derived(supportsChainPick && chainMode === 'end' && ['guerule', 'combat', 'card', 'pyohan'].includes(ruleMode));
  const wizardSteps = $derived.by(() => {
    const steps = ['room', 'mode'];
    if (supportsChainPick) steps.push('chain');
    steps.push('dict');
    if (supportsDuEum) steps.push('dueum');
    steps.push('options');
    if (ruleMode === 'guerule') steps.push('jobs');
    return steps;
  });
  const isGuest = $derived(!!user?.isGuest);
  const isGueruleRoom = $derived(['guerule', 'combat'].includes(snapshot?.meta?.gameMode || 'guerule'));
  const isRoomHost = $derived(snapshot?.meta?.owner === nickname);
  const roomReadyMap = $derived(snapshot?.meta?.ready || {});
  const requiredPlayers = $derived(
    Number(snapshot?.meta?.geonmatPlayerCap) >= 1
      ? Number(snapshot.meta.geonmatPlayerCap)
      : Number(snapshot?.meta?.mode || game?.teamMode || mode || 1) * 2
  );
  const isWaitPhase = $derived(!practice && !hasMatched && (!game || game.phase === 'waiting'));
  let roomCodeCopied = $state(false);
  let roomCodeTimer;
  async function copyRoomCode() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room);
      roomCodeCopied = true;
      clearTimeout(roomCodeTimer);
      roomCodeTimer = setTimeout(() => { roomCodeCopied = false; }, 1600);
    } catch {
      showError('방 코드를 복사하지 못했습니다.');
    }
  }

  function isCpuPlayerName(name) {
    return /^채린컴퓨터\d*$/.test(String(name || ''));
  }
  const allHumansReady = $derived.by(() => {
    const players = game?.players || [];
    const owner = snapshot?.meta?.owner;
    for (const player of players) {
      if (player === owner || isCpuPlayerName(player)) continue;
      if (!roomReadyMap[player]) return false;
    }
    return true;
  });
  const canStartGame = $derived(
    isRoomHost
      && (game?.players || []).length >= requiredPlayers
      && allHumansReady
  );
  const myReady = $derived(!!roomReadyMap[nickname]);
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
    if (showCreateWizard && wizardStep >= wizardSteps.length) {
      wizardStep = Math.max(0, wizardSteps.length - 1);
    }
  });

  $effect(() => {
    if (browser) {
      fetch(apiUrl('/api/job-info')).then(r => r.json()).then(d => { jobInfoByJob = d; }).catch(() => {});
    }
  });

  // 서버가 실패를 JSON 이나 HTML 오류 문서로 돌려줄 때가 있다. 그대로 띄우면
  // 화면을 뒤덮는 긴 빨간 창이 되므로 읽을 수 있는 한 줄만 남긴다.
  function cleanErrorText(raw) {
    let text = String(raw ?? '').trim();
    if (!text) return '알 수 없는 오류가 발생했습니다.';
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && parsed.message) text = String(parsed.message);
    } catch { /* JSON 이 아니면 그대로 둔다 */ }
    if (/^</.test(text) || /<\/?[a-z][\s\S]*>/i.test(text)) return '서버 오류가 발생했습니다.';
    text = text.replace(/\s+/g, ' ').trim();
    return text.length > 110 ? `${text.slice(0, 110)}…` : text;
  }

  function showError(raw) {
    const text = cleanErrorText(raw);
    if (!text) return;
    if (errorTimer) clearTimeout(errorTimer);
    error = text;
    errorTimer = setTimeout(() => { error = ''; }, 4000);
  }

  async function request(path, options = {}) {
    busy = true;
    error = '';
    try {
      const res = await fetch(apiUrl(path), { credentials: 'include', ...options });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (err) {
      showError(err?.message);
      throw err;
    } finally {
      busy = false;
    }
  }

  async function loadMe() {
    authReady = false;
    try {
      const res = await fetch(apiUrl('/api/auth'), { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      const me = data.user;
      if (me?.isGuest) {
        await fetch(apiUrl('/api/auth'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'logout' })
        });
        user = null;
      } else {
        user = me;
        if (user?.nickname) nickname = user.nickname;
      }
    } catch {
      user = null;
    } finally {
      authReady = true;
    }
  }

  const wizardStepKey = $derived(wizardSteps[wizardStep] || 'chain');

  function requireLogin() {
    if (user?.nickname && !user.isGuest) return user;
    showError('로그인이 필요합니다.');
    throw new Error('login_required');
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
    showAuthPanel = false;
  }

  function openCreateWizard() {
    if (!user?.nickname) return;
    wizardStep = 0;
    showCreateWizard = true;
  }

  function closeCreateWizard() {
    showCreateWizard = false;
    wizardStep = 0;
  }

  function wizardNext() {
    if (wizardStep < wizardSteps.length - 1) wizardStep += 1;
    else finishCreateWizard();
  }

  function wizardBack() {
    if (wizardStep > 0) wizardStep -= 1;
  }

  function selectRuleMode(value) {
    ruleMode = value;
    if (String(value).startsWith('geonmat:')) chainMode = 'end';
    if (value === 'kkutu') dictSource = 'kkutu';
    if (value === 'pyohan') dictSource = 'default';
  }

  function selectChainMode(value) {
    chainMode = value;
    if (value === 'start' && isGeonmatMode) ruleMode = 'guerule';
  }

  function wizardStepTitle(key) {
    const map = {
      room: '방 설정',
      mode: '게임 모드',
      chain: '잇기 방향',
      dict: '사전',
      dueum: '두음법칙',
      options: '게임 옵션',
      jobs: '직업 제한'
    };
    return map[key] || '';
  }

  function dictLabel(value) {
    const map = { default: '구엜룰', urimalsam: '우리말샘', roble: '로블', jime: '지메', kkutu: '끄투' };
    return map[value] || value;
  }

  function ruleModeLabel(value) {
    const map = {
      guerule: '채린룰',
      combat: '조합',
      card: '카드',
      pyohan: '표한룰',
      kkutu: '끄투',
      'geonmat:geonmat': '미니 · 검맞',
      'geonmat:rare': '미니 · 희귀맞',
      'geonmat:bingo': '미니 · 빙고맞',
      'geonmat:relay': '미니 · 이어달리기'
    };
    return map[value] || value;
  }

  function resolveCreatePlayerSettings() {
    const count = Math.floor(Number(playerCount) || 2);
    if (isGeonmatMode) {
      const cap = Math.min(20, Math.max(1, count));
      return { mode: 1, playerCount: cap, geonmatPlayerCap: cap };
    }
    const even = Math.min(6, Math.max(2, count % 2 === 0 ? count : count - 1));
    return { mode: even / 2, playerCount: even, geonmatPlayerCap: 0 };
  }

  async function finishCreateWizard() {
    const players = resolveCreatePlayerSettings();
    mode = players.mode;
    playerCount = players.playerCount;
    combat = ruleMode === 'combat';
    gameMode = ruleMode === 'combat' ? 'guerule' : ruleMode;
    await create();
    closeCreateWizard();
  }

  async function setReadyState(ready) {
    if (!room || !nickname || isRoomHost) return;
    snapshot = await request('/api/room', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'ready', room, ready })
    });
    hasMatched = !!snapshot?.game && snapshot.game.phase !== 'waiting';
  }

  async function toggleReady() {
    await setReadyState(!myReady);
  }

  function syncWaitSettingsFromSnapshot() {
    const meta = snapshot?.meta;
    if (!meta) return;
    roomName = meta.name || '';
    chainMode = meta.chainMode === 'start' ? 'start' : 'end';
    dictSource = meta.dictSource || 'default';
    duEum = meta.duEum !== false;
    searchAllowed = !!meta.searchAllowed;
    rated = meta.rated !== false;
    pyohanLives = Number(meta.pyohanLives) || 3;
    geonmatRounds = Number(meta.geonmatRounds) || 5;
    disabledJobs = Array.isArray(meta.disabledJobs) ? [...meta.disabledJobs] : [];
    playerCount = requiredPlayers;
    const timer = meta.timer;
    if (timer?.enabled) {
      timerEnabled = true;
      timerMinutes = Math.max(1, Math.floor((timer.initialSeconds || 600) / 60));
      timerIncrement = timer.incrementSeconds || 0;
    } else {
      timerEnabled = false;
    }
  }

  async function saveWaitSettings() {
    if (!room || !isRoomHost) return;
    busy = true;
    try {
      const patch = {
        roomName,
        chainMode,
        dictSource,
        duEum,
        searchAllowed,
        rated: isGuest ? false : rated,
        playerCount,
        disabledJobs,
        timer: { enabled: timerEnabled, minutes: Number(timerMinutes), increment: Number(timerIncrement) }
      };
      if (roomPassword.trim()) patch.roomPassword = roomPassword;
      if (String(snapshot?.meta?.gameMode || '').startsWith('geonmat:')) {
        patch.geonmatRounds = Number(geonmatRounds);
      }
      if (snapshot?.meta?.gameMode === 'pyohan') {
        patch.pyohanLives = Number(pyohanLives);
      }
      snapshot = await request('/api/room', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'updateSettings', room, patch })
      });
      roomPassword = '';
      waitSettingsOpen = false;
      hasMatched = !!snapshot?.game && snapshot.game.phase !== 'waiting';
    } finally {
      busy = false;
    }
  }

  $effect(() => {
    if (isWaitPhase && snapshot?.meta) syncWaitSettingsFromSnapshot();
  });

  async function startGameRoom() {
    if (!room || !isRoomHost) return;
    busy = true;
    try {
      snapshot = await request('/api/room', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'start', room })
      });
      hasMatched = !!snapshot?.game && snapshot.game.phase !== 'waiting';
    } finally {
      busy = false;
    }
  }

  async function leaveCurrentRoom() {
    if (!room) return;
    const leavingRoom = room;
    busy = true;
    try {
      await fetch(apiUrl('/api/room'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'leave', room: leavingRoom })
      });
    } catch {}
    room = '';
    snapshot = null;
    hasMatched = false;
    waitSettingsOpen = false;
    tab = 'game';
    if (socket) {
      try { socket.onclose = null; socket.close(); } catch {}
      socket = null;
    }
    clearInterval(poller);
    poller = null;
    busy = false;
    fetchRoomList();
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
    requireLogin();
    nickname = user.nickname;
    const players = resolveCreatePlayerSettings();
    mode = players.mode;
    const data = await request('/api/room', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mode: players.mode,
        playerCount: players.playerCount,
        geonmatPlayerCap: players.geonmatPlayerCap,
        practice,
        cpuJob,
        timer: { enabled: timerEnabled, minutes: Number(timerMinutes), increment: Number(timerIncrement) },
        disabledJobs,
        combat: ruleMode === 'combat',
        dictSource,
        gameMode: ruleMode === 'combat' ? 'guerule' : ruleMode,
        searchAllowed,
        cpuLevel,
        cpuThink,
        chainMode,
        duEum,
        rated: isGuest ? false : rated,
        roomName,
        roomPassword,
        pyohanLives: Number(pyohanLives),
        geonmatRounds: Number(geonmatRounds)
      })
    });
    room = data.room;
    snapshot = data;
    hasMatched = !!data.game && data.game.phase !== 'waiting';
    startLiveUpdates();
    fetchRoomList();
  }

  async function join(password = '', roomCode = '') {
    requireLogin();
    nickname = user.nickname;
    const target = String(roomCode || pendingJoinRoom || '').trim().toUpperCase();
    if (!target) return;
    const data = await request('/api/room', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'join', room: target, password: password || joinPasswordInput })
    });
    room = data.room;
    snapshot = data;
    hasMatched = !!data.game && data.game.phase !== 'waiting';
    showJoinPassword = false;
    pendingJoinRoom = '';
    joinPasswordInput = '';
    startLiveUpdates();
    fetchRoomList();
  }

  async function openListedRoom(entry) {
    const target = typeof entry === 'string' ? entry : entry?.room;
    if (!target) return;
    const locked = typeof entry === 'object' && entry?.hasPassword;
    pendingJoinRoom = target;
    if (locked) {
      joinPasswordInput = '';
      showJoinPassword = true;
      return;
    }
    await join();
  }

  async function confirmJoinPassword() {
    if (!pendingJoinRoom) return;
    await join(joinPasswordInput);
  }

  async function fetchFriends() {
    if (!user || isGuest) return;
    try {
      const res = await fetch(apiUrl('/api/friends'), { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      friends = data.friends || [];
      friendIncoming = data.incoming || [];
      friendOutgoing = data.outgoing || [];
      roomInvites = data.invites || [];
    } catch {}
  }

  async function addFriend() {
    const nickname = friendAddInput.trim();
    if (!nickname || friendsBusy) return;
    friendsBusy = true;
    try {
      const res = await fetch(apiUrl('/api/friends'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'add', nickname })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(friendErrorLabel(data.error));
        return;
      }
      friendAddInput = '';
      await fetchFriends();
    } finally {
      friendsBusy = false;
    }
  }

  async function acceptFriendRequest(fromNickname) {
    if (friendsBusy) return;
    friendsBusy = true;
    try {
      await fetch(apiUrl('/api/friends'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'accept', nickname: fromNickname })
      });
      await fetchFriends();
    } finally {
      friendsBusy = false;
    }
  }

  async function rejectFriendRequest(fromNickname) {
    if (friendsBusy) return;
    friendsBusy = true;
    try {
      await fetch(apiUrl('/api/friends'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'reject', nickname: fromNickname })
      });
      await fetchFriends();
    } finally {
      friendsBusy = false;
    }
  }

  async function removeFriend(fromNickname) {
    if (friendsBusy) return;
    friendsBusy = true;
    try {
      await fetch(apiUrl('/api/friends'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'remove', nickname: fromNickname })
      });
      await fetchFriends();
    } finally {
      friendsBusy = false;
    }
  }

  async function inviteFriendToRoom(friendNickname) {
    if (!room || friendsBusy) return;
    friendsBusy = true;
    try {
      const res = await fetch(apiUrl('/api/friends'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'invite',
          nickname: friendNickname,
          room,
          roomName: snapshot?.meta?.name || ''
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(friendErrorLabel(data.error));
        return;
      }
      showInviteModal = false;
    } finally {
      friendsBusy = false;
    }
  }

  async function dismissRoomInvite(invite) {
    if (!invite?.room) return;
    await fetch(apiUrl('/api/friends'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'dismissInvite', room: invite.room })
    });
    await fetchFriends();
  }

  async function joinFromInvite(invite) {
    if (!invite?.room || busy) return;
    pendingJoinRoom = invite.room;
    await dismissRoomInvite(invite);
    const entry = roomList.find((r) => r.room === invite.room);
    if (entry?.hasPassword) {
      joinPasswordInput = '';
      showJoinPassword = true;
      return;
    }
    await join();
  }

  function friendErrorLabel(code) {
    const map = {
      user_not_found: '해당 닉네임의 사용자를 찾을 수 없습니다.',
      cannot_friend_self: '자기 자신은 친구로 추가할 수 없습니다.',
      already_friends: '이미 친구입니다.',
      request_pending: '이미 요청을 보냈거나 받은 상태입니다.',
      not_friend: '친구만 초대할 수 있습니다.'
    };
    return map[code] || '친구 요청에 실패했습니다.';
  }

  function openInviteModal() {
    if (!isRoomHost) return;
    friendAddInput = '';
    fetchFriends();
    showInviteModal = true;
  }

  function openBotSetup() {
    if (!isRoomHost) return;
    botCpuLevel = '보통';
    botCpuThink = false;
    botCpuJobMode = 'random';
    botCpuJob = '';
    showBotSetup = true;
  }

  async function confirmBotSetup() {
    if (!room || !isRoomHost) return;
    busy = true;
    try {
      snapshot = await request('/api/room', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'addBot',
          room,
          cpuLevel: botCpuLevel,
          cpuThink: botCpuThink,
          cpuJob: isGueruleRoom && botCpuJobMode === 'pick' ? botCpuJob : ''
        })
      });
      showBotSetup = false;
    } finally {
      busy = false;
    }
  }

  async function refresh(targetRoom = room) {
    if (!targetRoom) return;
    try {
      const res = await fetch(apiUrl(`/api/room?room=${encodeURIComponent(targetRoom)}`), { cache: 'no-store', credentials: 'include' });
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
      const url = wsUrl(`/ws?room=${encodeURIComponent(room)}`);
      if (!url) return;
      try {
        socket = new WebSocket(url);
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
      const res = await fetch(apiUrl('/api/my-games'), { credentials: 'include' });
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

  $effect(() => {
    if (browser && user && !user.isGuest) {
      fetchFriends();
      const intv = setInterval(fetchFriends, 8000);
      return () => clearInterval(intv);
    }
  });

  $effect(() => {
    if (browser && user) {
      fetchRoomList();
      const intv = setInterval(fetchRoomList, 3000);
      return () => clearInterval(intv);
    }
  });

  async function send(commandText) {
    if (!room || !commandText.trim() || !user?.nickname) return;
    snapshot = await request('/api/action', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ room, command: commandText.trim() })
    });
  }

  // 왜 지금 둘 수 없는지 한 줄로 설명한다. 이유를 안 알려주면 입력이
  // 고장 난 것처럼 보인다.
  const blockedReason = $derived(
    game?.phase !== 'playing'
      ? '아직 게임이 진행 중이 아닙니다.'
      : busy
        ? '이전 요청을 처리하는 중입니다.'
        : currentPlayer && currentPlayer !== nickname
          ? `${currentPlayer}님 차례입니다.`
          : ''
  );

  async function sendWord(event) {
    event?.preventDefault?.();
    const text = word.trim();
    if (!text) return;
    if (busy) {
      showError('이전 요청을 처리하는 중입니다. 잠시 후 다시 시도하세요.');
      return;
    }
    if (!canPlay) {
      premoveWord = text;
      premoveStatus = blockedReason
        ? `${blockedReason} 차례가 오면 자동으로 둡니다.`
        : '차례가 오면 자동으로 둡니다.';
      premoveAttemptKey = '';
      word = '';
      return;
    }
    cpuThinking = true;
    try {
      await send(`0${text}`);
      word = '';        /* 성공했을 때만 비운다. 실패하면 다시 치지 않아도 되게 남긴다. */
    } catch {
      /* 사유는 request 가 토스트로 띄운다. 입력한 단어는 그대로 둔다. */
    } finally {
      cpuThinking = false;
      await tick();
      wordInputEl?.focus();
    }
  }

  function cancelPremove() {
    premoveWord = '';
    premoveStatus = '';
    premoveSending = false;
    premoveAttemptKey = '';
  }

  function candidateStartsFromDisplay(display) {
    const value = String(display || '').trim();
    if (!value || value === '자유') return [];
    const parts = [];
    const primary = value.match(/^([가-힣])/u)?.[1];
    if (primary) parts.push(primary);
    const alt = value.match(/\(([가-힣])\)/u)?.[1];
    if (alt) parts.push(alt);
    return Array.from(new Set(parts));
  }

  async function isLegalPremove(text) {
    const clean = String(text || '').trim();
    if (!clean || !game || game.phase !== 'playing') return false;
    if ((game.history || []).includes(clean)) return false;
    const starts = candidateStartsFromDisplay(nextSyllable);
    if (starts.length && !starts.includes(clean[0])) return false;

    const queryStarts = starts.length ? starts : [clean[0] || ''];
    const used = encodeURIComponent((game.history || []).join(','));
    for (const start of queryStarts) {
      const data = await fetch(apiUrl(`/api/word-search?start=${encodeURIComponent(start)}&q=${encodeURIComponent(clean)}&limit=20&used=${used}&dict=${encodeURIComponent(activeDictSource)}`), {
        credentials: 'include',
        cache: 'no-store'
      }).then(r => r.ok ? r.json() : null).catch(() => null);
      const found = data?.results?.find((row) => row.word === clean);
      if (!found) continue;
      if (!(game.history || []).length && /한방|유도/.test(found.kind || '')) return false;
      return true;
    }
    return false;
  }

  async function tryPlayPremove() {
    if (!premoveWord || !canPlay || busy || premoveSending) return;
    const queued = premoveWord;
    const attemptKey = `${room}:${game?.turnCount || 0}:${currentPlayer}:${queued}:${(game?.history || []).length}`;
    if (attemptKey === premoveAttemptKey) return;
    premoveAttemptKey = attemptKey;
    premoveSending = true;
    premoveStatus = '예약 단어 확인 중...';
    try {
      if (await isLegalPremove(queued)) {
        premoveWord = '';
        premoveStatus = '';
        cpuThinking = true;
        await send(`0${queued}`);
        await tick();
        wordInputEl?.focus();
      } else {
        premoveStatus = '현재 음절에 맞지 않거나 사용할 수 없는 단어입니다.';
      }
    } finally {
      cpuThinking = false;
      premoveSending = false;
    }
  }

  $effect(() => {
    if (premoveWord && canPlay) {
      tryPlayPremove();
    }
  });

  async function sendChat(event) {
    event?.preventDefault?.();
    if (isGuest) return;
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
    if (!isBanPicker || unavailableJobs.includes(job) || myState?.job === job) return;
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
    const data = await request(`/api/search?q=${encodeURIComponent(searchText)}&dict=${encodeURIComponent(activeDictSource)}`);
    searchResults = data.results || [];
    searchTotal = data.total || 0;
  }

  async function searchInGame() {
    const tabObj = activeInGameTab;
    if (!tabObj || !tabObj.query.trim()) return;
    const data = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(tabObj.query)}&dict=${encodeURIComponent(activeDictSource)}`), { credentials: 'include' }).then(r => r.json()).catch(() => ({}));
    tabObj.results = data.results || [];
  }

  async function loadRanking() {
    if (isGuest) {
      tab = 'game';
      return;
    }
    ranking = await request('/api/ranking');
  }

  async function fetchRoomList() {
    try {
      const res = await fetch(apiUrl('/api/room?action=list'), { cache: 'no-store' });
      if (res.ok) roomList = await res.json();
    } catch {}
  }

  function toggleDisabledJob(job) {
    if (disabledJobs.includes(job)) {
      disabledJobs = disabledJobs.filter((item) => item !== job);
      return;
    }
    disabledJobs = [...disabledJobs, job];
    if (cpuJob === job) cpuJob = '';
  }

  function roomPhaseLabel(phase) {
    if (phase === 'playing') return '진행 중';
    if (phase === 'job_selection') return '직업 선택';
    if (phase === 'combat_draft') return '능력 드래프트';
    return '입장 가능';
  }

  function formatClock(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const min = Math.floor(safe / 60);
    const sec = String(safe % 60).padStart(2, '0');
    return `${min}:${sec}`;
  }

  function openJobsTab(job = jobTabJob) {
    tab = 'jobs';
    if (job) jobTabJob = job;
    if (!ranking) loadRanking();
  }

  function submitSearch(event) {
    event?.preventDefault?.();
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
          attackerJob: analysisJobA,
          defenderJob: analysisJobB,
          syllable: analysisSyllable,
          situation: analysisSituation
        })
      });
    } finally {
      analysisBusy = false;
    }
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
    } finally {
      analysisBusy = false;
    }
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
    if (job === '기관사' && state.train_stations !== undefined) {
      statuses.push({ label: '남은 역', value: `${state.train_stations}개`, type: 'engineer' });
    }
    if (job === '피보나치' && state.lucas_value !== undefined) {
      statuses.push({ label: '수열값', value: state.lucas_value, type: 'math' });
    }
    if (job === '?' && (state.question_uses !== undefined || state.comma_uses !== undefined)) {
      statuses.push({ label: '사용', value: `${state.question_uses || 0}/${state.comma_uses || 0}`, type: 'question' });
    }
    if (job === '홍명보' && (state.hmb_wc_active || state.hmb_wc_pending_turn)) {
      statuses.push({ label: '월드컵', value: state.hmb_wc_active ? '진행' : '예정', type: 'worldcup' });
    }
    if (job === '페인터' && state.ptr_gauge !== undefined) {
      statuses.push({ label: '게이지', value: `${state.ptr_gauge}/4`, type: 'paint' });
    }
    if (job === '반장') {
      if (state.class_president_homeroom_uses !== undefined) statuses.push({ label: '가호', value: `${state.class_president_homeroom_uses}회`, type: 'president' });
      if (state.class_president_principal_uses !== undefined) statuses.push({ label: '교장', value: `${state.class_president_principal_uses}회`, type: 'president' });
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

  function jobInfoCards(text) {
    const raw = String(text || '').trim();
    if (!raw) return [];
    const withoutTitle = raw.replace(/^\[\s*채린룰\s+.+?(?:직업\s*)?정보\s*\]\s*/u, '').trim();
    const cards = [];
    const re = /<\s*([^>]+?)\s*>\s*(?:-\s*([^\n]+))?\n*([\s\S]*?)(?=\n\s*<|$)/g;
    let match;
    let firstIndex = -1;
    while ((match = re.exec(withoutTitle))) {
      if (firstIndex < 0) firstIndex = match.index;
      const meta = String(match[2] || '').trim();
      const body = String(match[3] || '').trim();
      cards.push({
        name: match[1].trim(),
        meta: meta ? meta.split('|').map((part) => part.trim()).filter(Boolean) : [],
        lines: body.split(/\n+/).map((line) => line.trim()).filter(Boolean)
      });
    }
    const intro = firstIndex > 0 ? withoutTitle.slice(0, firstIndex).trim() : '';
    if (intro) cards.unshift({ name: '개요', meta: [], lines: intro.split(/\n+/).map((line) => line.trim()).filter(Boolean) });
    return cards.length ? cards : [{ name: '직업 설명', meta: [], lines: withoutTitle.split(/\n+/).map((line) => line.trim()).filter(Boolean) }];
  }

  $effect(() => {
    if (showJoinPassword && joinPasswordEl) tick().then(() => joinPasswordEl?.focus());
  });

  // Escape closes the top-most overlay, in the order they stack.
  function handleGlobalKeydown(event) {
    if (event.key !== 'Escape') return;
    if (showTargetSelector) { showTargetSelector = null; return; }
    if (matchResult) { matchResult = null; return; }
    if (showBotSetup) { showBotSetup = false; return; }
    if (showInviteModal) { showInviteModal = false; return; }
    if (showJoinPassword) { showJoinPassword = false; pendingJoinRoom = ''; return; }
    if (showCreateWizard) { closeCreateWizard(); return; }
    if (showDM) { showDM = false; return; }
    if (showChat) { showChat = false; }
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

<svelte:window onkeydown={handleGlobalKeydown} />

<svelte:head>
  <title>채린룰</title>
  <meta name="description" content="채린룰 끝말잇기를 웹과 앱에서. 직업 능력, 단어 검색, 레이팅 랭킹까지 한 곳에서 즐기세요." />
</svelte:head>

<div class="app">
  {#if error}
    <div class="toast-error" role="alert">
      <span class="toast-dot"></span>{error}
    </div>
  {/if}

  {#if !authReady}
    <div class="auth-gate">
      <div class="auth-gate-card auth-gate-loading">
        <span class="brand-gem">◆</span>
        <p>불러오는 중...</p>
      </div>
    </div>
  {:else if !user}
    <div class="auth-gate">
      <div class="auth-gate-card">
        <div class="auth-gate-brand">
          <span class="brand-gem">◆</span>
          <h1>채린룰</h1>
          <p>로그인 후 이용할 수 있습니다</p>
        </div>
        <div class="auth-panel-tabs auth-gate-tabs">
          <button class="auth-panel-tab" class:auth-panel-tab-active={authMode === 'login'} onclick={() => (authMode = 'login')}>로그인</button>
          <button class="auth-panel-tab" class:auth-panel-tab-active={authMode === 'signup'} onclick={() => (authMode = 'signup')}>회원가입</button>
        </div>
        <form class="auth-panel-form auth-gate-form" onsubmit={(e) => { e.preventDefault(); auth(); }}>
          <input class="auth-panel-input" bind:value={username} placeholder="아이디" autocomplete="username" />
          <input class="auth-panel-input" bind:value={password} placeholder="비밀번호" type="password" autocomplete={authMode === 'signup' ? 'new-password' : 'current-password'} />
          <button class="auth-panel-submit" type="submit" disabled={!username.trim() || !password.trim() || busy}>
            {authMode === 'signup' ? '회원가입' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  {:else}
  <!-- ══════════════════════ TOPBAR ══════════════════════ -->
  <header class="topbar">
    <button class="brand" onclick={() => (tab = 'game')} type="button">
      <span class="brand-gem">◆</span>채린룰
    </button>
    <nav class="top-nav" aria-label="주요 메뉴">
      <button type="button" class="nav-btn" class:nav-active={tab === 'game'} aria-current={tab === 'game' ? 'page' : undefined} onclick={() => (tab = 'game')}>
        <Swords size={15} /><span>게임</span>
      </button>
      <button type="button" class="nav-btn" class:nav-active={tab === 'search'} aria-current={tab === 'search' ? 'page' : undefined} onclick={() => (tab = 'search')}>
        <Search size={15} /><span>검색</span>
      </button>
      <button type="button" class="nav-btn" class:nav-active={tab === 'analysis'} aria-current={tab === 'analysis' ? 'page' : undefined} onclick={() => (tab = 'analysis')}>
        <Swords size={15} /><span>분석</span>
      </button>
      <button type="button" class="nav-btn" class:nav-active={tab === 'jobs'} aria-current={tab === 'jobs' ? 'page' : undefined} onclick={() => openJobsTab()}>
        <BriefcaseBusiness size={15} /><span>직업</span>
      </button>
      {#if !isGuest}
        <button type="button" class="nav-btn" class:nav-active={tab === 'rank'} aria-current={tab === 'rank' ? 'page' : undefined} onclick={() => { tab = 'rank'; loadRanking(); }}>
          <BarChart3 size={15} /><span>랭킹</span>
        </button>
      {/if}
      <span class="nav-sep" aria-hidden="true"></span>
      <button type="button" class="nav-btn nav-btn-ghost" class:nav-active={tab === 'help'} aria-current={tab === 'help' ? 'page' : undefined} onclick={() => (tab = 'help')}>
        <BookOpen size={15} /><span>도움말</span>
      </button>
      <button type="button" class="nav-btn nav-btn-ghost" class:nav-active={tab === 'settings'} aria-current={tab === 'settings' ? 'page' : undefined} onclick={() => { tab = 'settings'; fetchFriends(); }}>
        <Settings size={15} /><span>설정</span>
      </button>
    </nav>
    <div class="top-auth">
      {#if room && !isGuest}
        <button type="button" class="icon-btn" class:icon-btn-on={showChat} onclick={() => (showChat = !showChat)} title="방 채팅" aria-label="방 채팅" aria-pressed={showChat}>
          <MessageSquare size={16} />
        </button>
      {/if}
      {#if !isGuest}
        <button type="button" class="icon-btn" class:dm-unread={dmInbox.length > 0} onclick={() => (showDM = !showDM)} title="쪽지" aria-label={dmInbox.length ? `쪽지 ${dmInbox.length}건` : '쪽지'}>
          <Mail size={16} />
          {#if dmInbox.length > 0}<span class="dm-badge">{dmInbox.length}</span>{/if}
        </button>
      {/if}
      <span class="auth-chip" title={user.nickname}>
        <span class="auth-avatar" aria-hidden="true">{user.nickname?.[0] ?? '?'}</span>
        <span class="auth-name">{user.nickname}</span>
      </span>
      <button type="button" class="icon-btn" onclick={signout} title="로그아웃" aria-label="로그아웃"><LogOut size={16} /></button>
    </div>
  </header>

  <!-- ══════════════════════ GAME TAB ══════════════════════ -->
  {#if tab === 'game'}

    {#if !room}
      <!-- ─── LOBBY ─── -->
      <div class="lobby-hub">
        <div class="lobby-inner">
          <div class="lobby-bar">
            <div class="lobby-heading">
              <h1>게임 방</h1>
              <p>{roomList.length ? `${roomList.length}개의 방이 열려 있습니다` : '아직 열린 방이 없습니다'}</p>
            </div>
            <button type="button" class="lobby-create-btn" onclick={openCreateWizard} disabled={busy}>
              <Plus size={16} />방 만들기
            </button>
          </div>

          {#if roomInvites.length > 0}
            <section class="lobby-section">
              <h2 class="lobby-section-label">받은 초대</h2>
              <div class="lobby-chips">
                {#each roomInvites as inv}
                  <div class="lobby-chip lobby-chip-invite">
                    <span class="lobby-chip-text">{inv.from} · {inv.roomName || '방'}</span>
                    <button type="button" class="chip-btn" onclick={() => joinFromInvite(inv)} disabled={busy}>참가</button>
                    <button type="button" class="chip-btn chip-btn-ghost" onclick={() => dismissRoomInvite(inv)} disabled={busy} aria-label="초대 지우기">×</button>
                  </div>
                {/each}
              </div>
            </section>
          {/if}

          {#if ongoingGames.length > 0}
            <section class="lobby-section">
              <h2 class="lobby-section-label">참여 중인 게임</h2>
              <div class="lobby-chips">
                {#each ongoingGames as g}
                  <button type="button" class="lobby-chip lobby-chip-action" onclick={() => openExistingRoom(g.room)}>
                    <span class="lobby-chip-text">{g.room}</span>
                    <span class="lobby-chip-tag" class:is-live={g.phase === 'playing'}>{g.phase === 'playing' ? '게임 중' : '대기'}</span>
                  </button>
                {/each}
              </div>
            </section>
          {/if}

          <section class="lobby-section lobby-section-grow">
            <h2 class="lobby-section-label">방 목록</h2>
            <div class="room-grid">
              {#if roomList.length}
                {#each roomList as r}
                  {@const mode = r.meta?.gameMode || 'guerule'}
                  {@const count = (r.players || []).length}
                  {@const cap = r.requiredPlayers || 2}
                  <button type="button" class="room-tile" onclick={() => openListedRoom(r)} disabled={busy}>
                    <span class="room-tile-head">
                      <span class="room-tile-name">{r.name || ruleModeLabel(mode)}</span>
                      {#if r.hasPassword}<span class="room-tile-lock" title="비밀번호 필요" aria-label="비밀번호 필요">🔒</span>{/if}
                    </span>
                    <span class="room-tile-meta">
                      <span class="room-tile-mode">{ruleModeLabel(mode)}</span>
                      <span class="room-tile-phase" class:is-live={r.phase === 'playing'}>{roomPhaseLabel(r.phase)}</span>
                    </span>
                    <span class="room-tile-foot">
                      <span class="room-tile-bar" aria-hidden="true">
                        <span class="room-tile-bar-fill" style={`width:${Math.min(100, Math.round((count / cap) * 100))}%`}></span>
                      </span>
                      <span class="room-tile-count">{count}<span>/{cap}</span></span>
                    </span>
                  </button>
                {/each}
              {:else}
                <div class="room-empty-state">
                  <span class="room-empty-gem">◆</span>
                  <p>열려 있는 방이 없습니다.</p>
                  <small>새 방을 만들어 친구를 초대해 보세요.</small>
                  <button type="button" class="accent-btn" onclick={openCreateWizard}>방 만들기</button>
                </div>
              {/if}
            </div>
          </section>
        </div>
      </div>

      {#if showJoinPassword}
        <div class="wizard-overlay" role="dialog" aria-modal="true" aria-label="비밀번호 입력">
          <div class="wizard-card wizard-card-sm">
            <div class="wizard-head">
              <div class="wizard-head-main">
                <span class="panel-kicker">비밀번호 방</span>
                <h2>입장 비밀번호</h2>
                <p class="wizard-join-hint">선택한 방에 입장하려면 비밀번호를 입력하세요.</p>
              </div>
              <button type="button" class="wizard-close" onclick={() => { showJoinPassword = false; pendingJoinRoom = ''; }} aria-label="닫기"><X size={18} /></button>
            </div>
            <form class="wizard-body wizard-join-form" onsubmit={(e) => { e.preventDefault(); confirmJoinPassword(); }}>
              <input class="auth-panel-input" type="password" bind:this={joinPasswordEl} bind:value={joinPasswordInput} placeholder="비밀번호" />
              <button class="accent-btn" type="submit" disabled={busy || !joinPasswordInput.trim()}>입장</button>
            </form>
          </div>
        </div>
      {/if}

      {#if showCreateWizard}
        <div class="wizard-overlay" role="dialog" aria-modal="true" aria-label="방 만들기">
          <div class="wizard-card">
            <div class="wizard-head">
              <div class="wizard-head-main">
                <span class="panel-kicker">STEP {wizardStep + 1} / {wizardSteps.length}</span>
                <h2>{wizardStepTitle(wizardStepKey)}</h2>
                <div class="wizard-progress" aria-hidden="true">
                  {#each wizardSteps as step, i}
                    <span class="wizard-progress-dot" class:wizard-progress-done={i < wizardStep} class:wizard-progress-current={i === wizardStep}></span>
                  {/each}
                </div>
              </div>
              <button type="button" class="wizard-close" onclick={closeCreateWizard} aria-label="닫기"><X size={18} /></button>
            </div>

            <div class="wizard-body">
              {#if wizardStepKey === 'room'}
                <div class="wizard-extras">
                  <label class="wizard-field">
                    <span>방 이름</span>
                    <input class="lobby-input" bind:value={roomName} placeholder="예: 친선전, 연습방" maxlength="32" />
                  </label>
                  <label class="wizard-field">
                    <span>비밀번호 (선택)</span>
                    <input class="lobby-input" type="password" bind:value={roomPassword} placeholder="친선전용 비밀번호" maxlength="32" />
                  </label>
                  <div class="wizard-field">
                    <span>인원</span>
                    <div class="player-slider-block">
                      <div class="player-slider-value">
                        <strong>{playerCount}</strong>
                        <span>명</span>
                      </div>
                      <input class="player-slider" type="range" min="1" max="20" step="1" bind:value={playerCount} style={`--value: ${playerCount}`} />
                      <div class="player-slider-quick">
                        {#each [2, 4, 6, 10, 20] as preset}
                          <button type="button" class="player-slider-preset" class:player-slider-preset-active={playerCount === preset} onclick={() => (playerCount = preset)}>
                            {preset}
                          </button>
                        {/each}
                      </div>
                    </div>
                    <span class="wizard-field-hint">일반 모드는 짝수(2·4·6)로 맞춰지고, 미니게임은 홀수도 가능합니다.</span>
                  </div>
                </div>
              {:else if wizardStepKey === 'mode'}
                <p class="wizard-hint">미니게임은 끝말잇기만 지원합니다.</p>
                <div class="wizard-choice-grid wizard-choice-grid-3">
                  {#each [
                    ['guerule', '채린룰', '직업·능력'],
                    ['combat', '조합', '능력 드래프트'],
                    ['card', '카드', '세트 드래프트'],
                    ['pyohan', '표한룰', '목숨제'],
                    ['kkutu', '끄투', '끄투 사전'],
                    ['geonmat:geonmat', '검맞', '개수 맞추기'],
                    ['geonmat:rare', '희귀맞', '희귀 단어'],
                    ['geonmat:bingo', '빙고맞', '3×3 빙고'],
                    ['geonmat:relay', '이어달리기', '다단 경로']
                  ] as [value, title, desc]}
                    <button class="wizard-choice" class:wizard-choice-active={ruleMode === value} onclick={() => selectRuleMode(value)}>
                      <strong>{title}</strong>
                      <span>{desc}</span>
                    </button>
                  {/each}
                </div>
              {:else if wizardStepKey === 'chain'}
                <div class="wizard-choice-grid">
                  <button class="wizard-choice" class:wizard-choice-active={chainMode === 'end'} onclick={() => selectChainMode('end')}>
                    <strong>끝말잇기</strong>
                    <span>마지막 글자로 이어 말합니다</span>
                  </button>
                  <button class="wizard-choice" class:wizard-choice-active={chainMode === 'start'} onclick={() => selectChainMode('start')}>
                    <strong>앞말잇기</strong>
                    <span>첫 글자로 끝나는 단어를 냅니다</span>
                  </button>
                </div>
              {:else if wizardStepKey === 'dict'}
                <div class="wizard-choice-grid wizard-choice-grid-3">
                  {#each [
                    ['default', '구엜룰'],
                    ['urimalsam', '우리말샘'],
                    ['roble', '로블'],
                    ['jime', '지메'],
                    ['kkutu', '끄투']
                  ] as [value, title]}
                    {@const locked = ruleMode === 'kkutu' && value !== 'kkutu'}
                    <button
                      class="wizard-choice"
                      class:wizard-choice-active={dictSource === value}
                      class:wizard-choice-disabled={locked}
                      onclick={() => { if (!locked) dictSource = value; }}
                      disabled={locked}
                    >
                      <strong>{title}</strong>
                      {#if locked}<span>끄투 모드 전용</span>{/if}
                    </button>
                  {/each}
                </div>
              {:else if wizardStepKey === 'dueum'}
                <div class="wizard-choice-grid">
                  <button class="wizard-choice" class:wizard-choice-active={duEum} onclick={() => (duEum = true)}>
                    <strong>두음법칙 켬</strong>
                    <span>라→나, 로→노 등 허용</span>
                  </button>
                  <button class="wizard-choice" class:wizard-choice-active={!duEum} onclick={() => (duEum = false)}>
                    <strong>두음법칙 끔</strong>
                    <span>표기 그대로만 이어갑니다</span>
                  </button>
                </div>
              {:else if wizardStepKey === 'options'}
                <div class="wizard-extras">
                  <label class="practice-toggle">
                    <input type="checkbox" bind:checked={searchAllowed} />
                    <span class="toggle-track"><span class="toggle-thumb"></span></span>
                    게임 중 검색 허용
                  </label>
                  {#if !isGuest}
                    <label class="practice-toggle">
                      <input type="checkbox" bind:checked={rated} />
                      <span class="toggle-track"><span class="toggle-thumb"></span></span>
                      레이팅 반영
                    </label>
                  {/if}
                  <label class="practice-toggle">
                    <input type="checkbox" bind:checked={timerEnabled} />
                    <span class="toggle-track"><span class="toggle-thumb"></span></span>
                    체스식 타이머
                  </label>
                  {#if timerEnabled}
                    <div class="timer-row">
                      <label><span>기본</span><input class="mini-num" type="number" min="1" max="60" bind:value={timerMinutes} />분</label>
                      <label><span>증가</span><input class="mini-num" type="number" min="0" max="60" bind:value={timerIncrement} />초</label>
                    </div>
                  {/if}
                  {#if ruleMode === 'pyohan'}
                    <label class="setting-inline"><span>표한 목숨</span><input class="mini-num" type="number" min="1" max="9" bind:value={pyohanLives} /></label>
                  {/if}
                  {#if isGeonmatMode}
                    <label class="setting-inline"><span>라운드 수</span><input class="mini-num" type="number" min="1" max="20" bind:value={geonmatRounds} /></label>
                  {/if}
                </div>
              {:else}
                <div class="disabled-job-box">
                  <div class="disabled-job-head">
                    <span><Ban size={14} />선택 불가 직업</span>
                    {#if disabledJobs.length}<button class="tiny-btn" onclick={() => (disabledJobs = [])}>초기화</button>{/if}
                  </div>
                  <div class="disabled-job-grid">
                    {#each availableJobs as job}
                      <button class="disable-job-chip" class:djc-active={disabledJobs.includes(job)} onclick={() => toggleDisabledJob(job)}>
                        {job}
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>

            <div class="wizard-foot">
              <button class="ghost-btn" onclick={wizardBack} disabled={wizardStep === 0}>이전</button>
              <button class="accent-btn" onclick={wizardNext}>
                {wizardStep >= wizardSteps.length - 1 ? '방 만들기' : '다음'}
              </button>
            </div>
          </div>
        </div>
      {/if}

    {:else if !practice && !hasMatched && (!game || game.phase === 'waiting')}
      <!-- ─── WAITING ROOM ─── -->
      <div class="wait-room">
        <aside class="wait-room-side">
          <div class="wait-room-card">
            <span class="wait-room-kicker">대기실</span>
            <h2 class="wait-room-title">{snapshot?.meta?.name || '게임 방'}</h2>
            <span class="wait-room-mode">{ruleModeLabel(snapshot?.meta?.gameMode || 'guerule')}</span>
            <button type="button" class="wait-room-code" onclick={copyRoomCode} title="방 코드 복사">
              <span>방 코드</span>
              <strong>{room}</strong>
              <span class="wait-room-copy">{roomCodeCopied ? '복사됨' : '복사'}</span>
            </button>
          </div>
          <div class="wait-room-rules">
            <div class="wait-rules-head">
              <h3>방 설정</h3>
              {#if isRoomHost}
                <button class="wait-settings-toggle" onclick={() => (waitSettingsOpen = !waitSettingsOpen)}>
                  {waitSettingsOpen ? '닫기' : '변경'}
                </button>
              {/if}
            </div>

            {#if isRoomHost && waitSettingsOpen}
              <div class="wait-settings-form">
                <label class="wizard-field">
                  <span>방 이름</span>
                  <input class="lobby-input" bind:value={roomName} maxlength="32" />
                </label>
                <label class="wizard-field">
                  <span>비밀번호 변경</span>
                  <input class="lobby-input" type="password" bind:value={roomPassword} placeholder="비우면 유지" maxlength="32" />
                </label>
                <div class="wizard-field">
                  <span>인원 ({playerCount}명)</span>
                  <input class="player-slider" type="range" min="1" max="20" step="1" bind:value={playerCount} style={`--value: ${playerCount}`} />
                </div>
                {#if !String(snapshot?.meta?.gameMode || '').startsWith('geonmat:')}
                  <div class="wait-settings-row">
                    <button class="mode-btn" class:mode-active={chainMode === 'end'} onclick={() => (chainMode = 'end')}>끝말잇기</button>
                    <button class="mode-btn" class:mode-active={chainMode === 'start'} onclick={() => (chainMode = 'start')}>앞말잇기</button>
                  </div>
                  <label class="wizard-field">
                    <span>사전</span>
                    <select class="lobby-input" bind:value={dictSource}>
                      <option value="default">구엜룰</option>
                      <option value="urimalsam">우리말샘</option>
                      <option value="roble">로블</option>
                      <option value="jime">지메</option>
                      <option value="kkutu">끄투</option>
                    </select>
                  </label>
                  <label class="practice-toggle">
                    <input type="checkbox" bind:checked={duEum} />
                    <span class="toggle-track"><span class="toggle-thumb"></span></span>
                    두음법칙
                  </label>
                {/if}
                <label class="practice-toggle">
                  <input type="checkbox" bind:checked={searchAllowed} />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  검색 허용
                </label>
                {#if !isGuest}
                  <label class="practice-toggle">
                    <input type="checkbox" bind:checked={rated} />
                    <span class="toggle-track"><span class="toggle-thumb"></span></span>
                    레이팅 반영
                  </label>
                {/if}
                <label class="practice-toggle">
                  <input type="checkbox" bind:checked={timerEnabled} />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  체스식 타이머
                </label>
                {#if timerEnabled}
                  <div class="timer-row">
                    <label><span>기본</span><input class="mini-num" type="number" min="1" max="60" bind:value={timerMinutes} />분</label>
                    <label><span>증가</span><input class="mini-num" type="number" min="0" max="60" bind:value={timerIncrement} />초</label>
                  </div>
                {/if}
                {#if snapshot?.meta?.gameMode === 'pyohan'}
                  <label class="setting-inline"><span>표한 목숨</span><input class="mini-num" type="number" min="1" max="9" bind:value={pyohanLives} /></label>
                {/if}
                {#if String(snapshot?.meta?.gameMode || '').startsWith('geonmat:')}
                  <label class="setting-inline"><span>라운드 수</span><input class="mini-num" type="number" min="1" max="20" bind:value={geonmatRounds} /></label>
                {/if}
                {#if isGueruleRoom}
                  <div class="disabled-job-box">
                    <div class="disabled-job-head">
                      <span><Ban size={14} />선택 불가 직업</span>
                      {#if disabledJobs.length}<button class="tiny-btn" onclick={() => (disabledJobs = [])}>초기화</button>{/if}
                    </div>
                    <div class="disabled-job-grid">
                      {#each availableJobs as job}
                        <button class="disable-job-chip" class:djc-active={disabledJobs.includes(job)} onclick={() => toggleDisabledJob(job)}>
                          {job}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
                <button class="accent-btn" onclick={saveWaitSettings} disabled={busy}>설정 저장</button>
              </div>
            {:else}
              <ul>
                <li><span>잇기</span><strong>{snapshot?.meta?.chainMode === 'start' ? '앞말잇기' : '끝말잇기'}</strong></li>
                <li><span>사전</span><strong>{dictLabel(snapshot?.meta?.dictSource || 'default')}</strong></li>
                <li><span>두음</span><strong>{snapshot?.meta?.duEum === false ? '끔' : '켬'}</strong></li>
                <li><span>인원</span><strong>{requiredPlayers}명</strong></li>
                <li><span>검색</span><strong>{snapshot?.meta?.searchAllowed ? '허용' : '불가'}</strong></li>
                <li><span>레이팅</span><strong>{snapshot?.meta?.rated === false ? '미반영' : '반영'}</strong></li>
                <li><span>타이머</span><strong>{timerState?.enabled ? `${formatClock(timerState.initialSeconds)} + ${timerState.incrementSeconds}초` : '없음'}</strong></li>
              </ul>
            {/if}
          </div>
          {#if isRoomHost}
            <button class="accent-btn wait-invite-side" onclick={openInviteModal} disabled={busy}>
              <UserRoundPlus size={16} />친구 초대
            </button>
          {/if}
          <button class="ghost-btn wait-leave" onclick={leaveCurrentRoom}>방 나가기</button>
        </aside>

        <main class="wait-room-main">
          <div class="wait-room-head">
            <h2>플레이어</h2>
            <p>{(game?.players || []).length}/{requiredPlayers}명 · 모두 모이면 방장이 시작할 수 있습니다</p>
          </div>

          <div class="wait-player-grid">
            {#each Array(requiredPlayers) as _, slotIndex}
              {@const player = (game?.players || [])[slotIndex]}
              <div class="wait-player-slot" class:wait-slot-filled={!!player} class:wait-slot-me={player === nickname}>
                {#if player}
                  <div class="wait-player-top">
                    <span class="wait-player-avatar">{player[0]}</span>
                    <div class="wait-player-meta">
                      <span class="wait-player-name">{player}</span>
                      {#if snapshot?.meta?.owner === player}<span class="wait-badge host">방장</span>{/if}
                    </div>
                  </div>
                  <div class="wait-player-status" class:ready={roomReadyMap[player] || snapshot?.meta?.owner === player} class:cpu={isCpuPlayerName(player)}>
                    {#if isCpuPlayerName(player)}
                      봇 참가 완료
                    {:else if snapshot?.meta?.owner === player}
                      시작 대기 중
                    {:else if roomReadyMap[player]}
                      준비 완료
                    {:else}
                      준비 중
                    {/if}
                  </div>
                {:else if isRoomHost}
                  <div class="wait-slot-actions">
                    <button type="button" class="wait-slot-primary" onclick={openInviteModal} disabled={busy}>
                      <UserRoundPlus size={20} />
                      <span>플레이어 초대</span>
                    </button>
                    <button type="button" class="wait-slot-secondary" onclick={openBotSetup} disabled={busy}>
                      <Bot size={16} />
                      <span>봇 추가</span>
                    </button>
                  </div>
                {:else}
                  <div class="wait-slot-waiting">
                    <span>빈 자리</span>
                    <small>방장이 초대 중</small>
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          <div class="wait-room-actions">
            {#if isRoomHost}
              <button type="button" class="accent-btn wait-start" onclick={startGameRoom} disabled={busy || !canStartGame}>
                시작
              </button>
              {#if !canStartGame}
                <span class="wait-start-hint">모든 인원이 모이고 준비해야 시작할 수 있습니다</span>
              {/if}
            {:else if (game?.players || []).includes(nickname)}
              <div class="wait-ready-group" role="group" aria-label="준비 상태">
                <button type="button" class="wait-ready-btn" class:wait-ready-active={myReady} onclick={() => setReadyState(true)} disabled={busy || myReady}>
                  준비
                </button>
                <button type="button" class="wait-ready-btn" class:wait-ready-active={!myReady} onclick={() => setReadyState(false)} disabled={busy || !myReady}>
                  대기
                </button>
              </div>
            {/if}
          </div>
        </main>
      </div>

      {#if showInviteModal}
        <div class="wizard-overlay" role="dialog" aria-modal="true" aria-label="플레이어 초대">
          <div class="wizard-card wizard-card-sm invite-modal">
            <div class="wizard-head">
              <div class="wizard-head-main">
                <span class="panel-kicker">초대</span>
                <h2>플레이어 초대</h2>
                <p class="wizard-join-hint">친구에게 초대를 보내거나 새 친구를 추가하세요.</p>
              </div>
              <button type="button" class="wizard-close" onclick={() => (showInviteModal = false)} aria-label="닫기"><X size={18} /></button>
            </div>
            <div class="wizard-body invite-modal-body">
              <form class="friend-add-row" onsubmit={(e) => { e.preventDefault(); addFriend(); }}>
                <input class="lobby-input" bind:value={friendAddInput} placeholder="닉네임으로 친구 추가" maxlength="24" />
                <button class="accent-btn" type="submit" disabled={friendsBusy || !friendAddInput.trim()}>추가</button>
              </form>

              {#if friendIncoming.length}
                <div class="friend-section">
                  <span class="friend-section-label">받은 요청</span>
                  {#each friendIncoming as req}
                    <div class="friend-row">
                      <span>{req.nickname}</span>
                      <div class="friend-row-actions">
                        <button class="accent-btn tiny-action" onclick={() => acceptFriendRequest(req.nickname)} disabled={friendsBusy}>수락</button>
                        <button class="ghost-btn tiny-action" onclick={() => rejectFriendRequest(req.nickname)} disabled={friendsBusy}>거절</button>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}

              <div class="friend-section">
                <span class="friend-section-label">친구 목록</span>
                {#if friends.length}
                  {#each friends as friend}
                    <div class="friend-row">
                      <div class="friend-row-user">
                        <span class="friend-avatar">{friend.nickname[0]}</span>
                        <span>{friend.nickname}</span>
                      </div>
                      <button class="accent-btn tiny-action" onclick={() => inviteFriendToRoom(friend.nickname)} disabled={friendsBusy}>
                        초대
                      </button>
                    </div>
                  {/each}
                {:else}
                  <p class="friend-empty">친구가 없습니다. 닉네임으로 친구를 추가해 보세요.</p>
                {/if}
              </div>
            </div>
            <div class="wizard-foot">
              <button class="ghost-btn" onclick={() => (showInviteModal = false)}>닫기</button>
            </div>
          </div>
        </div>
      {/if}

      {#if showBotSetup}
        <div class="wizard-overlay" role="dialog" aria-modal="true" aria-label="봇 설정">
          <div class="wizard-card wizard-card-sm">
            <div class="wizard-head">
              <div>
                <h2>봇 추가</h2>
                <p>채린컴퓨터를 빈 자리에 넣습니다</p>
              </div>
              <button type="button" class="wizard-close" onclick={() => (showBotSetup = false)} aria-label="닫기"><X size={18} /></button>
            </div>
            <div class="wizard-body bot-setup-body">
              <div class="bot-setup-field">
                <span class="bot-setup-label">난이도</span>
                <div class="mode-row">
                  {#each ['쉬움', '보통', '어려움', '지옥'] as level}
                    <button class="mode-btn" class:mode-active={botCpuLevel === level} onclick={() => (botCpuLevel = level)}>{level}</button>
                  {/each}
                </div>
              </div>
              <label class="practice-toggle">
                <input type="checkbox" bind:checked={botCpuThink} />
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
                생각 과정 보이기
              </label>
              {#if isGueruleRoom}
                <div class="bot-setup-field">
                  <span class="bot-setup-label">직업</span>
                  <div class="mode-row">
                    <button class="mode-btn" class:mode-active={botCpuJobMode === 'random'} onclick={() => (botCpuJobMode = 'random')}>랜덤</button>
                    <button class="mode-btn" class:mode-active={botCpuJobMode === 'pick'} onclick={() => (botCpuJobMode = 'pick')}>지정</button>
                  </div>
                  {#if botCpuJobMode === 'pick'}
                    <select class="lobby-input" bind:value={botCpuJob}>
                      <option value="">직업 선택</option>
                      {#each availableJobs as j}
                        <option value={j}>{j}</option>
                      {/each}
                    </select>
                  {/if}
                </div>
              {/if}
            </div>
            <div class="wizard-foot">
              <button class="ghost-btn" onclick={() => (showBotSetup = false)}>취소</button>
              <button
                class="accent-btn"
                onclick={confirmBotSetup}
                disabled={busy || (isGueruleRoom && botCpuJobMode === 'pick' && !botCpuJob)}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      {/if}

    {:else if !game}
      <div class="matching-screen compact-loading">
        <div class="radar-core"><Swords size={28} /></div>
        <h2 class="matching-label">게임 상태를 불러오고 있어요<span class="dots"></span></h2>
        <div class="room-code-pill">
          방 코드 <strong>{room}</strong>
        </div>
      </div>

    {:else if isDrafting}
      <!-- ─── ABILITY DRAFT (조합) ─── -->
      <div class="job-screen">
        <div class="job-screen-header">
          <div>
            <h2>{isMyPick ? '능력을 고르세요' : `${combatDraft.currentPlayer || '상대'}님이 고르는 중`}</h2>
            <p>
              {combatDraft.cycle > 0 ? `재드래프트 ${combatDraft.cycle}회차` : '드래프트'}
              · 남은 공개 풀 {combatDraft.pool.length}장
            </p>
          </div>
          {#if myKit.length}
            <div class="selected-pill"><span class="sel-gem">◆</span>내 능력 {myKit.length}개</div>
          {/if}
        </div>

        {#if myKit.length}
          <div class="ban-panel compact">
            <span class="panel-kicker">MY KIT</span>
            <div class="selected-ban-row">
              {#each myKit as card}
                <span class="ban-chip locked">{card.ability}{card.kind === 'passive' ? ' (패)' : ''}</span>
              {/each}
            </div>
          </div>
        {/if}

        <div class="job-grid">
          {#each combatDraft.pool as card, i}
            <button
              class="job-card"
              style="--i:{i}"
              onclick={() => send(`1픽 ${card.no}`)}
              disabled={busy || !isMyPick}
            >
              <span class="jc-portrait">
                <img src={jobImageSrc(card.homeJob)} alt="" loading="lazy" onerror={hideBrokenImage} />
                <span class="jc-initial">{jobInitial(card.homeJob)}</span>
              </span>
              <span class="jc-name">{card.ability}</span>
              <span class="jc-sub">{card.homeJob} · {card.kind === 'passive' ? '패시브' : '액티브'}</span>
            </button>
          {/each}
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
              class:job-unavailable={roomDisabledJobs.includes(job)}
              style="--i:{i}"
              onclick={() => isBanPicker ? toggleBan(job) : (selectedJob = job, send(`1ㅈㅅ ${job}`))}
              disabled={busy || isBanWaiting || (!isBanPicker && unavailableJobs.includes(job)) || (isBanPicker && (myState?.job === job || unavailableJobs.includes(job)))}
            >
              <span class="jc-portrait">
                <img src={jobImageSrc(job)} alt="" loading="lazy" onerror={hideBrokenImage} />
                <span class="jc-initial">{jobInitial(job)}</span>
              </span>
              <span class="jc-name">{job}</span>
              {#if roomDisabledJobs.includes(job)}
                <span class="jc-check">선택 불가</span>
              {:else if isBanPicker && selectedBans.includes(job)}
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
            <button class="action-btn" onclick={() => openJobsTab(selectedJob || selectableJobs[0])}>
              <BriefcaseBusiness size={16} />직업 정보
            </button>
          </div>
        {/if}
        {#if notices.length}
          <div class="notice-list">
            {#each notices as item (item.id)}
              <div class="notice-item">
                <Info size={13} /><span>{stripFx(item.text)}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if game.phase === 'playing'}
      <!-- ─── ABILITY CUT-IN ─── -->
      {#if castFx}
        {#key castSeq}
          <div
            class="cast"
            data-motif={fxMotif(castFx.ability)}
            class:cast-passive={castFx.passive}
            style="--c1:{fxHue(castFx.ability)};--c2:{fxHue2(castFx.ability)}"
          >
            <span class="cast-wash"></span>
            <span class="cast-ring"></span>
            <span class="cast-ring cast-ring2"></span>
            <span class="cast-bars"></span>
            <span class="cast-streak"></span>
            <div class="cast-core">
              <div class="cast-kind">{castFx.passive ? 'PASSIVE' : 'ACTIVE'}</div>
              <div class="cast-name" data-text={castFx.ability}>{castFx.ability}</div>
              {#if castFx.job}<div class="cast-job">{castFx.job}</div>{/if}
            </div>
          </div>
        {/key}
      {/if}

      <!-- ─── IN-GAME (심플) ─── -->
      <div class="ingame ingame-simple" class:board-hit={!!castFx}>

        <div class="simple-stage">
          <div class="simple-hero" class:my-turn={canPlay}>
            <div class="simple-syl">{nextSyllable}</div>
            <div class="simple-turn">
              {#if canPlay}
                <strong>내 차례</strong>
              {:else}
                <span>{currentPlayer || '—'} 차례</span>
              {/if}
              {#if timerState?.enabled}
                <span class="simple-clock">{formatClock(timerState.remaining?.[currentPlayer] ?? timerState.initialSeconds)}</span>
              {/if}
            </div>
            {#if myState?.job}
              <div class="simple-job">내 직업 · {myState.job}</div>
            {/if}
          </div>

          {#if game.isWaitingVote}
            <div class="simple-vote" role="status">
              <span class="simple-vote-text">{game.requester} · {game.voteType}</span>
              <button type="button" class="vote-yes" onclick={() => send('1동의')}>동의</button>
              <button type="button" class="vote-no" onclick={() => send('1거절')}>거절</button>
            </div>
          {/if}

          <div class="simple-bar">
            <div class="simple-players">
              {#each game.players || [] as player}
                <span class="simple-player" class:active={player === currentPlayer} class:me={player === nickname}>
                  <span class="simple-player-name">{player}</span>
                  {#if game.playerStates?.[player]?.job}<span class="simple-player-job">{game.playerStates[player].job}</span>{/if}
                </span>
              {/each}
            </div>
            <div class="simple-actions">
              <button type="button" class="ctrl-btn" onclick={() => send('1무효')} disabled={busy}>무효</button>
              <button type="button" class="ctrl-btn danger" onclick={() => send('ㅈㅈ')} disabled={busy}>항복</button>
            </div>
          </div>

          <div class="simple-history" bind:this={historyEl}>
            {#if !(game.history || []).length}
              <div class="history-empty">첫 단어를 입력하세요</div>
            {/if}
            {#each visibleHistory as item (item.key)}
              <div class="simple-word" class:simple-word-alt={item.index % 2 === 1}>{item.word}</div>
            {/each}
            {#if cpuThinking}
              <div class="cpu-thinking-row">
                <span class="think-dot"></span><span class="think-dot"></span><span class="think-dot"></span>
                <span class="think-label">생각 중...</span>
              </div>
            {/if}
          </div>
        </div>

        <div class="bottom-composer" class:composer-active={canPlay}>
          {#if !canPlay && blockedReason}
            <div class="turn-hint">
              <Info size={12} /><span>{blockedReason} 지금 입력하면 미리두기로 예약됩니다.</span>
            </div>
          {/if}
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
          <form class="input-zone" class:input-active={canPlay} class:premove-input={!canPlay} onsubmit={sendWord}>
            <input
              class="word-input"
              bind:this={wordInputEl}
              bind:value={word}
              placeholder={busy ? '처리 중...' : canPlay ? `${nextSyllable}(으)로 시작하는 단어` : '상대 차례에 미리 둘 단어 입력'}
              disabled={busy}
              autocomplete="off"
            />
            <button
              class="send-btn"
              class:send-ready={word.trim() && !busy}
              class:premove-ready={!canPlay && word.trim() && !busy}
              type="submit"
              disabled={!word.trim() || busy}
              title={canPlay ? '입력' : '미리두기 예약'}
            >
              <Send size={17} />
            </button>
          </form>
          {#if premoveWord}
            <div class="premove-panel">
              <div>
                <span class="premove-kicker">미리두기</span>
                <strong>{premoveWord}</strong>
                {#if premoveStatus}<p>{premoveStatus}</p>{/if}
              </div>
              <button class="premove-cancel" onclick={cancelPremove} disabled={premoveSending}>
                <X size={14} />취소
              </button>
            </div>
          {/if}
        </div>

        <!-- Target Selector Overlay -->
        {#if showTargetSelector}
          <div
            class="target-selector-overlay"
            role="button"
            tabindex="0"
            onclick={() => (showTargetSelector = null)}
            onkeydown={(e) => e.key === 'Escape' && (showTargetSelector = null)}
          >
            <div
              class="target-card"
              role="dialog"
              tabindex="-1"
              onclick={e => e.stopPropagation()}
              onkeydown={e => e.stopPropagation()}
            >
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
                <span class="splash-kicker">{eff.type === 'passive' ? 'PASSIVE' : eff.type === 'surrender' ? 'SURRENDER' : 'ABILITY'}</span>
                {#if eff.job && eff.type !== 'surrender'}
                  <div class="splash-job">
                    <span class="splash-job-portrait">
                      <span class="splash-job-initial">{jobInitial(eff.job)}</span>
                      {#if eff.jobImage}
                        <img class="splash-job-img" src={eff.jobImage} alt="" onerror={hideBrokenImage} />
                      {/if}
                    </span>
                    <span class="splash-job-name">{eff.job}</span>
                  </div>
                {/if}
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

  <!-- ══════════════════════ JOBS TAB ══════════════════════ -->
  {:else if tab === 'jobs'}
    <div class="content-page jobs-page">
      <div class="jobs-layout">
        <aside class="jobs-list-panel">
          <div class="jobs-panel-head">
            <h2>직업</h2>
            <input class="job-filter-input" bind:value={jobFilter} placeholder="직업 검색" />
          </div>
          <div class="jobs-list">
            {#each jobCatalog as job}
              <button class="job-list-btn" class:jlb-active={jobTabJob === job} onclick={() => (jobTabJob = job)}>
                <span class="jlb-icon">
                  <img src={jobImageSrc(job)} alt="" loading="lazy" onerror={hideBrokenImage} />
                  <span>{jobInitial(job)}</span>
                </span>
                <span>{job}</span>
              </button>
            {/each}
          </div>
        </aside>

        <section class="job-detail-panel">
          <div class="job-detail-head">
            <div class="job-title-wrap">
              <div class="job-detail-icon">
                <img src={jobImageSrc(jobTabJob)} alt="" loading="lazy" onerror={hideBrokenImage} />
                <span>{jobInitial(jobTabJob)}</span>
              </div>
              <div>
                <span class="panel-kicker">JOB INFO</span>
                <h2>{jobTabJob}</h2>
              </div>
            </div>
            {#if jobTabAbilities.length}
              <div class="job-ability-strip">
                {#each jobTabAbilities as ab}<span>{ab}</span>{/each}
              </div>
            {/if}
          </div>

          <div class="job-info-gui">
            {#each jobTabInfoCards as card}
              <section class="job-info-card">
                <div class="jic-head">
                  <span class="jic-name">{card.name}</span>
                  {#if card.meta.length}
                    <div class="jic-meta">
                      {#each card.meta as tag}
                        <span>{tag}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
                <div class="jic-body">
                  {#each card.lines as line}
                    <p class:jic-bullet={line.startsWith('-')}>{line.replace(/^-+\s*/, '')}</p>
                  {/each}
                </div>
              </section>
            {/each}
          </div>

          <div class="job-side-grid">
            <section class="job-stat-card">
              <div class="job-section-title">직업별 랭킹</div>
              {#if jobTabRanking.length}
                {#each jobTabRanking as row, index}
                  {@const ti = getTierInfo(row.rating)}
                  <div class="mini-rank-row" style="--tc:{ti.color};--tc-glow:{ti.color}33">
                    <span class="mini-rank-num">{index + 1}</span>
                    <span class="mini-rank-name">{row.name}</span>
                    <span class="mini-rank-record">{row.wins}승 {row.losses}패</span>
                    <span class="mini-rank-rating">{row.rating}</span>
                  </div>
                {/each}
              {:else}
                <div class="rank-empty small">이 직업은 아직 표시할 전적이 없습니다.</div>
              {/if}
            </section>

            <section class="job-stat-card">
              <div class="job-section-title">레이팅 티어표</div>
              <div class="tier-table">
                {#each TIER_INFO as tier}
                  <div class="tier-row" style="--tc:{tier.color};--tc-glow:{tier.color}26">
                    <span class="tier-dot"></span>
                    <span class="tier-name">{tier.name}</span>
                    <span class="tier-range">{tier.min} - {tier.max === Infinity ? '∞' : tier.max}</span>
                  </div>
                {/each}
              </div>
            </section>
          </div>
        </section>
      </div>

      <TierMaker />
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

  <!-- ══════════════════════ HELP TAB ══════════════════════ -->
  {:else if tab === 'help'}
    <div class="content-page help-page">
      <div class="help-header">
        <span class="panel-kicker">TUTORIAL</span>
        <h2>채린룰 입문 강의</h2>
        <p>끝말잇기의 기본 룰은 아는 사람을 기준으로, 채린룰의 단어 분류와 직업 운영을 정리했습니다.</p>
      </div>
      <div class="lecture-stack">
        {#each TUTORIAL_CHAPTERS as chapter, index}
          <section class="lecture-card">
            <div class="lecture-heading">
              <span class="tutorial-num">{index + 1}</span>
              <div>
                <h3>{chapter.title}</h3>
                <p>{chapter.lead}</p>
              </div>
            </div>
            {#if chapter.terms}
              <div class="term-grid">
                {#each chapter.terms as [term, desc]}
                  <div class="term-row">
                    <strong>{term}</strong>
                    <span>{desc}</span>
                  </div>
                {/each}
              </div>
            {/if}
            <ul class="lecture-points">
              {#each chapter.points as point}
                <li>{point}</li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
      <div class="help-header help-subheader">
        <span class="panel-kicker">SITE GUIDE</span>
        <h2>사이트 조작 도움말</h2>
        <p>버튼과 입력창만으로 게임을 진행할 수 있습니다. 채팅창은 대화용이며 게임 명령은 사이트 UI로만 실행됩니다.</p>
      </div>
      <div class="tutorial-grid">
        {#each SITE_HELP_STEPS as step, index}
          <section class="tutorial-card">
            <span class="tutorial-num">{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </section>
        {/each}
      </div>
    </div>

  <!-- ══════════════════════ RANKING TAB ══════════════════════ -->
  {:else if tab === 'rank'}
    <div class="content-page rank-page">
      <div class="rank-header">
        <h2 class="rank-title">전체 랭킹</h2>
        <button class="action-btn" onclick={() => openJobsTab(rankJob || jobRankingList[0]?.[0] || '해커')}>
          <BriefcaseBusiness size={16} />직업별 보기
        </button>
      </div>

      {#if ranking?.ranking?.length}
        <ol class="rank-list">
          {#each ranking.ranking || [] as row, index}
            {@const ti = getTierInfo(row.rating)}
            <li class="rank-row" class:rank-podium={index < 3} style="--ri:{Math.min(index, 12)};--tc:{ti.color};--tc-glow:{ti.color}33">
              <div class="rank-num" class:rank-top={index < 3}>{index + 1}</div>
              <div class="rank-avatar" style="background:linear-gradient(135deg,{ti.color}cc,{ti.color}66)">{row.name[0]}</div>
              <div class="rank-info">
                <span class="rank-name">{row.name}</span>
                <span class="rank-record">{row.wins || 0}승 {row.losses || 0}패</span>
              </div>
              <div class="rank-tier-col">
                <span class="rank-tier-badge" style="--tc:{ti.color};--tc-glow:{ti.color}44">{ti.name}</span>
                <span class="rank-rating">{row.rating || 1000}</span>
              </div>
            </li>
          {/each}
        </ol>
      {:else}
        <div class="rank-empty">랭킹 데이터를 불러오고 있습니다.</div>
      {/if}
    </div>

  <!-- ══════════════════════ SETTINGS TAB ══════════════════════ -->
  {:else if tab === 'settings'}
    <div class="content-page settings-page">
      <h2 class="settings-title"><Settings size={20} />설정</h2>

      <!-- 계정 섹션 -->
      <div class="settings-section">
        <div class="settings-section-label">계정</div>
        <div class="account-row">
          <span class="account-avatar" aria-hidden="true">{user.nickname?.[0] ?? '?'}</span>
          <div class="account-meta">
            <strong>{user.nickname}</strong>
            <span>{isGuest ? '게스트로 이용 중입니다' : '로그인됨'}</span>
          </div>
          <button type="button" class="ghost-btn" onclick={signout}><LogOut size={15} />로그아웃</button>
        </div>
      </div>

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

      {#if !isGuest}
        <div class="settings-section">
          <div class="settings-section-label"><Users size={15} />친구</div>
          <p class="settings-section-desc">닉네임으로 친구를 추가하고 대기실에서 초대할 수 있습니다.</p>
          <form class="friend-add-row" onsubmit={(e) => { e.preventDefault(); addFriend(); }}>
            <input class="lobby-input" bind:value={friendAddInput} placeholder="닉네임" maxlength="24" />
            <button class="accent-btn" type="submit" disabled={friendsBusy || !friendAddInput.trim()}>친구 추가</button>
          </form>

          {#if friendIncoming.length}
            <div class="settings-friend-block">
              <span class="friend-section-label">받은 요청</span>
              {#each friendIncoming as req}
                <div class="friend-row">
                  <span>{req.nickname}</span>
                  <div class="friend-row-actions">
                    <button class="accent-btn tiny-action" onclick={() => acceptFriendRequest(req.nickname)} disabled={friendsBusy}>수락</button>
                    <button class="ghost-btn tiny-action" onclick={() => rejectFriendRequest(req.nickname)} disabled={friendsBusy}>거절</button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          <div class="settings-friend-block">
            <span class="friend-section-label">내 친구 ({friends.length})</span>
            {#if friends.length}
              {#each friends as friend}
                <div class="friend-row">
                  <div class="friend-row-user">
                    <span class="friend-avatar">{friend.nickname[0]}</span>
                    <span>{friend.nickname}</span>
                  </div>
                  <button class="ghost-btn tiny-action" onclick={() => removeFriend(friend.nickname)} disabled={friendsBusy}>삭제</button>
                </div>
              {/each}
            {:else}
              <p class="friend-empty">아직 친구가 없습니다.</p>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- ══════════════════════ DM PANEL ══════════════════════ -->
  <!-- (DM panel is outside the tab if-chain, always rendered when showDM) -->
  {#if showDM && user && !isGuest}
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
  {#if room && showChat && !isGuest}
    <div class="floating-chat-container">
        <div class="chat-window" role="dialog" aria-label="방 채팅">
          <div class="chat-header">
            <div class="chat-header-info">
              <MessageSquare size={14} />
              <span>채팅</span>
            </div>
            <button type="button" class="chat-close" onclick={() => (showChat = false)} aria-label="채팅 닫기"><X size={16} /></button>
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
            <button class="chat-send" type="submit" disabled={!chatInput.trim()} aria-label="보내기"><Send size={14} /></button>
          </form>
        </div>
    </div>
  {/if}
  {/if}
</div>

<style>
  /* ═══════════════════════════════════════════
     TOKENS & RESET
  ═══════════════════════════════════════════ */
  :global(*) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(html) {
    height: 100%;
    overflow: hidden;
    scroll-behavior: smooth;
    overscroll-behavior: none;
  }
  :global(body) {
    font-family: 'Pretendard', 'Noto Sans KR', Inter, ui-sans-serif, system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    width: 100%;
    height: 100%;
    min-height: 100dvh;
    overflow: hidden;
    overscroll-behavior: none;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  :global(:root) {
    color-scheme: light;
    /* surfaces */
    --bg:       #f5f7fb;
    --bg2:      #ffffff;
    --bg3:      #eef1f7;
    --card:     #ffffff;
    --border:   #e4e8ef;
    --border2:  #d4dae5;
    /* brand + status */
    --accent:   #2563eb;
    --accent2:  #1d4ed8;
    --on-accent:#ffffff;
    --accent-fill: #2563eb;
    --accent-soft: rgba(37,99,235,.10);
    --accent-line: rgba(37,99,235,.28);
    --focus-ring:  rgba(37,99,235,.38);
    --red:      #dc2626;
    --orange:   #ea580c;
    --blue:     #3b82f6;
    --green:    #16a34a;
    --gold:     #d97706;
    /* tinted status surfaces (theme-aware) */
    --danger-bg:  rgba(220,38,38,.09);
    --danger-line:rgba(220,38,38,.24);
    --danger-fg:  #b91c1c;
    --warn-bg:    rgba(217,119,6,.11);
    --warn-line:  rgba(217,119,6,.26);
    --warn-fg:    #b45309;
    --ok-bg:      rgba(22,163,74,.10);
    --ok-line:    rgba(22,163,74,.26);
    --ok-fg:      #15803d;
    /* text */
    --text:     #141821;
    --text2:    #566072;
    --text3:    #8a93a3;
    --muted:    #8a93a3;
    /* shape */
    --radius:   12px;
    --radius-sm:10px;
    --radius-lg:18px;
    /* elevation */
    --topbar-bg: rgba(255,255,255,.88);
    --overlay:   rgba(15,23,42,.42);
    --shadow:      0 1px 2px rgba(15,23,42,.05), 0 4px 12px rgba(15,23,42,.05);
    --shadow-md:   0 2px 4px rgba(15,23,42,.05), 0 10px 24px rgba(15,23,42,.07);
    --shadow-lg:   0 8px 20px rgba(15,23,42,.08), 0 24px 60px rgba(15,23,42,.12);
    --card-shadow: 0 1px 2px rgba(15,23,42,.04), 0 4px 14px rgba(15,23,42,.05);
  }
  :global([data-theme="dark"]) {
    color-scheme: dark;
    --bg:       #0f1116;
    --bg2:      #171a21;
    --bg3:      #21252e;
    --card:     #171a21;
    --border:   #272c37;
    --border2:  #333a48;
    --accent:   #4b8bf5;
    --accent2:  #6ba1f8;
    --on-accent:#ffffff;
    --accent-fill: #2f6fe0;
    --accent-soft: rgba(75,139,245,.16);
    --accent-line: rgba(75,139,245,.34);
    --focus-ring:  rgba(107,161,248,.48);
    --red:      #f87171;
    --orange:   #fb923c;
    --blue:     #60a5fa;
    --green:    #4ade80;
    --gold:     #fbbf24;
    --danger-bg:  rgba(248,113,113,.14);
    --danger-line:rgba(248,113,113,.30);
    --danger-fg:  #fca5a5;
    --warn-bg:    rgba(251,191,36,.14);
    --warn-line:  rgba(251,191,36,.30);
    --warn-fg:    #fcd34d;
    --ok-bg:      rgba(74,222,128,.13);
    --ok-line:    rgba(74,222,128,.28);
    --ok-fg:      #86efac;
    --text:     #e7eaf1;
    --text2:    #99a2b4;
    --text3:    #6a7488;
    --muted:    #6a7488;
    --topbar-bg: rgba(15,17,22,.86);
    --overlay:   rgba(3,6,14,.62);
    --shadow:      0 1px 2px rgba(0,0,0,.4), 0 4px 12px rgba(0,0,0,.32);
    --shadow-md:   0 2px 6px rgba(0,0,0,.42), 0 12px 28px rgba(0,0,0,.38);
    --shadow-lg:   0 10px 24px rgba(0,0,0,.45), 0 28px 64px rgba(0,0,0,.5);
    --card-shadow: 0 1px 2px rgba(0,0,0,.34), 0 4px 14px rgba(0,0,0,.28);
  }

  button, input, select, textarea { font: inherit; color: inherit; }
  button { cursor: pointer; border: none; background: none; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
  button:disabled { opacity: .45; cursor: not-allowed; }
  input, select, textarea {
    background: var(--bg3);
    border: 1.5px solid var(--border2);
    border-radius: var(--radius-sm);
    color: var(--text);
    outline: none;
    transition: border-color .18s, box-shadow .18s, background .18s;
  }
  input::placeholder, textarea::placeholder { color: var(--text3); }
  input:focus, select:focus, textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--focus-ring);
    background: var(--bg2);
  }
  input, select { height: 42px; padding: 0 14px; font-size: 16px; }
  select {
    appearance: none;
    -webkit-appearance: none;
    padding-right: 34px;
    background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
    background-position: calc(100% - 18px) calc(50% + 1px), calc(100% - 13px) calc(50% + 1px);
    background-size: 5px 5px, 5px 5px;
    background-repeat: no-repeat;
  }
  select option { background: var(--bg2); color: var(--text); }
  :global(:where(button, a, input, select, textarea, [tabindex])):focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 6px;
  }
  :global(::-webkit-scrollbar) { width: 10px; height: 10px; }
  :global(::-webkit-scrollbar-track) { background: transparent; }
  :global(::-webkit-scrollbar-thumb) {
    background: color-mix(in srgb, var(--text3) 40%, transparent);
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: padding-box;
  }
  :global(::-webkit-scrollbar-thumb:hover) { background: color-mix(in srgb, var(--text3) 65%, transparent); background-clip: padding-box; }
  .app {
    width: 100%;
    height: 100dvh;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg);
  }

  /* ═══════════════════════════════════════════
     TOPBAR
  ═══════════════════════════════════════════ */
  .topbar {
    min-height: 58px;
    background: var(--topbar-bg);
    backdrop-filter: blur(16px) saturate(1.5);
    -webkit-backdrop-filter: blur(16px) saturate(1.5);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 18px;
    padding-left: max(18px, env(safe-area-inset-left));
    padding-right: max(18px, env(safe-area-inset-right));
    gap: 14px;
    position: relative;
    flex: 0 0 auto;
    z-index: 100;
  }
  .brand {
    font-size: 19px;
    font-weight: 900;
    letter-spacing: -.4px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text);
    white-space: nowrap;
    flex: 0 0 auto;
    padding: 0;
  }
  .brand:hover { color: var(--accent); }
  .nav-sep {
    width: 1px;
    height: 20px;
    margin: 0 6px;
    background: var(--border2);
    flex: 0 0 auto;
  }
  .nav-btn-ghost { color: var(--text3); }
  .auth-panel-tabs { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
  .auth-panel-tab {
    height: 34px;
    padding: 0 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    color: var(--text2);
    background: var(--bg3);
  }
  .auth-panel-tab-active { background: var(--accent-fill); color: var(--on-accent); }
  .auth-panel-form { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .auth-panel-input {
    height: 44px;
    border: 1.5px solid var(--border2);
    border-radius: var(--radius-sm);
    padding: 0 14px;
    background: var(--bg3);
  }
  .auth-panel-submit {
    height: 46px;
    padding: 0 18px;
    border-radius: var(--radius-sm);
    background: var(--accent-fill);
    color: var(--on-accent);
    font-weight: 800;
    font-size: 15px;
    transition: background .16s;
  }
  .auth-panel-submit:hover:not(:disabled) { background: var(--accent2); }
  .brand-gem { color: var(--accent); font-size: 13px; }
  .top-nav {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1 1 auto;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .top-nav::-webkit-scrollbar { display: none; }
  .nav-btn {
    height: 36px;
    padding: 0 13px;
    border-radius: var(--radius-sm);
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text2);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    flex: 0 0 auto;
    transition: background .16s, color .16s;
  }
  .nav-btn:hover { background: var(--bg3); color: var(--text); }
  .nav-btn.nav-active {
    background: var(--accent-fill);
    color: var(--on-accent);
  }
  .top-auth { display: flex; align-items: center; gap: 8px; margin-left: auto; flex: 0 0 auto; }
  .auth-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 12px 0 5px;
    border-radius: 999px;
    background: var(--bg3);
    border: 1px solid var(--border);
    min-width: 0;
  }
  .auth-avatar {
    width: 26px; height: 26px;
    border-radius: 50%;
    display: grid; place-items: center;
    background: var(--accent-fill);
    color: var(--on-accent);
    font-size: 13px; font-weight: 900;
    flex: 0 0 auto;
  }
  .auth-name {
    font-size: 13px; font-weight: 700; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 120px;
  }
  .icon-btn {
    width: 36px; height: 36px;
    border-radius: var(--radius-sm);
    background: var(--bg3);
    border: 1px solid var(--border2);
    display: inline-flex; align-items: center; justify-content: center;
    color: var(--text2);
    transition: background .18s, color .18s, border-color .18s;
  }
  .icon-btn:hover:not(:disabled) { background: var(--bg2); color: var(--text); border-color: var(--accent); }
  .icon-btn.icon-btn-on { background: var(--accent-fill); border-color: var(--accent-fill); color: var(--on-accent); }
  .icon-btn.icon-btn-on:hover:not(:disabled) { background: var(--accent2); border-color: var(--accent2); color: var(--on-accent); }
  .icon-btn { position: relative; }

  /* ═══════════════════════════════════════════
     ERROR TOAST
  ═══════════════════════════════════════════ */
  .toast-error {
    position: fixed;
    top: 72px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    background: var(--card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--danger-line);
    box-shadow: var(--shadow-lg);
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    color: var(--danger-fg);
    animation: toastSlideIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) both;
    pointer-events: none;
  }
  .toast-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--red); flex-shrink: 0; animation: pulse 1.4s ease-in-out infinite; }

  @keyframes toastSlideIn {
    from { opacity: 0; transform: translate(-50%, -20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }

  /* ═══════════════════════════════════════════
     LOBBY
  ═══════════════════════════════════════════ */

  .login-required :global(svg) { color: var(--accent); }
  .lobby-input { height: 48px; font-size: 15px; border-radius: var(--radius); }
  .mode-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .mode-btn {
    height: 42px;
    padding: 0 16px;
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
    background: var(--accent-fill);
    border-color: var(--accent-fill);
    color: var(--on-accent);
    box-shadow: none;
  }
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
  .practice-toggle input:checked + .toggle-track .toggle-thumb { transform: translateX(16px); background: var(--on-accent); }
  .timer-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .timer-row label {
    min-height: 38px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg2);
    font-size: 12px;
    font-weight: 800;
    color: var(--text2);
  }
  .mini-num { width: 54px; height: 28px; padding: 0 6px; text-align: center; font-weight: 900; }
  .disabled-job-box { display: grid; gap: 8px; }
  .disabled-job-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 12px;
    font-weight: 900;
    color: var(--text2);
  }
  .disabled-job-head span { display: inline-flex; align-items: center; gap: 6px; }
  .tiny-btn {
    height: 26px;
    padding: 0 9px;
    border-radius: var(--radius-sm);
    background: var(--bg2);
    border: 1px solid var(--border2);
    font-size: 11px;
    font-weight: 800;
    color: var(--text2);
  }
  .disabled-job-grid { display: flex; flex-wrap: wrap; gap: 6px; max-height: 96px; overflow: auto; }
  .disable-job-chip {
    min-height: 28px;
    padding: 0 9px;
    border-radius: var(--radius-sm);
    background: var(--bg2);
    border: 1px solid var(--border2);
    color: var(--text2);
    font-size: 12px;
    font-weight: 800;
  }
  .disable-job-chip.djc-active { background: var(--danger-bg); border-color: var(--danger-line); color: var(--danger-fg); }
  .color-chip {
    width: 26px; height: 26px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform .15s, border-color .15s;
    flex-shrink: 0;
  }
  .color-chip:hover { transform: scale(1.15); }
  .color-chip.color-chip-sel { border-color: var(--text); box-shadow: 0 0 0 2px var(--bg2); }
  .color-picker-input {
    width: 26px; height: 26px;
    border-radius: 50%;
    border: 2px dashed var(--border2);
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
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    padding: 60px 20px;
    position: relative;
    overflow: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
  .radar-core {
    width: 60px; height: 60px;
    border-radius: 50%;
    background: var(--accent-fill);
    display: flex; align-items: center; justify-content: center;
    color: var(--on-accent);
    z-index: 1;
    box-shadow: 0 8px 32px var(--accent-soft);
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
  .ghost-btn {
    height: 40px;
    padding: 0 18px;
    border-radius: 999px;
    border: 1px solid var(--border2);
    background: var(--bg3);
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
    background: var(--accent-fill);
    color: var(--on-accent);
    font-size: 14px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    transition: background .18s, box-shadow .18s;
    box-shadow: 0 4px 16px var(--accent-soft);
  }
  .accent-btn:hover:not(:disabled) { background: var(--accent2); }

  /* ═══════════════════════════════════════════
     JOB SELECTION
  ═══════════════════════════════════════════ */
  .job-screen {
    flex: 1;
    min-height: 0;
    padding: 28px 24px;
    max-width: 980px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
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
    background: var(--accent-soft);
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
    box-shadow: var(--shadow-md);
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
    background: var(--danger-bg);
    border-color: var(--danger-line);
    color: var(--danger-fg);
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
    min-height: 92px;
    padding: 10px 8px;
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
    background: var(--accent-soft);
    opacity: 0;
    transition: opacity .18s;
  }
  .job-card:hover:not(:disabled):not(.job-selected) {
    border-color: var(--accent);
    transform: translateY(-3px) scale(1.03);
    box-shadow: var(--shadow-md);
  }
  .job-card:hover:not(:disabled)::before { opacity: 1; }
  .job-card.job-selected {
    background: var(--accent-fill);
    border-color: var(--accent-fill);
    box-shadow: 0 12px 28px var(--accent-soft);
    transform: scale(1.06);
    animation: jobIn .5s cubic-bezier(.22,1,.36,1) both, selectedGlow 2s ease-in-out infinite;
  }
  .jc-portrait {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(140deg, var(--accent-soft), var(--bg3));
    border: 2px solid var(--accent-line);
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
  .job-card.job-selected .jc-name { color: var(--on-accent); }
  .job-card.job-ban-pick {
    background: var(--danger-bg);
    border-color: var(--red);
    box-shadow: 0 12px 28px var(--danger-bg);
  }
  .job-card.job-ban-pick .jc-initial,
  .job-card.job-ban-pick .jc-name,
  .job-card.job-ban-pick .jc-check {
    background: var(--red);
    color: #fff;
  }
  .job-card.job-ban-pick .jc-portrait {
    border-color: var(--red);
    background: var(--danger-bg);
  }
  .job-card.job-banned {
    background: var(--bg3);
    border-color: var(--border);
    color: var(--text3);
  }
  .job-card.job-banned .jc-initial,
  .job-card.job-banned .jc-name { color: var(--text3); }
  .job-card.job-banned .jc-check { background: var(--text3); color: var(--bg2); }
  .job-card.job-banned .jc-portrait {
    filter: grayscale(.8);
    opacity: .55;
  }
  .job-card.job-unavailable {
    background: var(--danger-bg);
    border-color: var(--danger-line);
    cursor: not-allowed;
  }
  .job-card.job-unavailable .jc-initial,
  .job-card.job-unavailable .jc-name { color: var(--danger-fg); }
  .job-card.job-unavailable .jc-check { background: var(--red); color: #fff; }
  .job-card.job-unavailable .jc-portrait {
    filter: grayscale(.85);
    opacity: .5;
  }
  .jc-check {
    position: absolute;
    top: 6px; right: 6px;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 800;
    line-height: 1.4;
    color: var(--on-accent);
    background: color-mix(in srgb, var(--text) 72%, transparent);
    animation: popIn .2s ease both;
    z-index: 2;
  }
  .job-card.job-selected .jc-check { background: rgba(255,255,255,.24); }
  .jc-sub {
    max-width: 100%;
    font-size: 10.5px;
    font-weight: 700;
    color: var(--text3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    position: relative;
    z-index: 1;
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
    background: var(--danger-bg);
    border: 1px solid var(--danger-line);
    color: var(--danger-fg);
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
    color: var(--on-accent);
  }
  .ban-btn:hover:not(:disabled) { background: var(--danger-bg); }
  .ban-btn.primary:hover:not(:disabled) { filter: brightness(.92); }
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
    min-height: 0;
    overflow: hidden;
    animation: fadeUp .25s ease both;
  }

  /* Syllable Hero */

  /* Game columns */

  /* Players column */

  /* Board column */

  .history-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--text3);
    font-style: italic;
  }
  /* 지금 왜 못 두는지 알려 주는 줄 */
  .turn-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    margin-bottom: 6px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg3);
    color: var(--text2);
    font-size: .74rem;
  }
  .turn-hint :global(svg) { flex-shrink: 0; color: var(--accent2); }

  /* ── 능력 발동 컷인 ────────────────────────────────
     --c1 / --c2 는 능력 이름에서 뽑은 두 색이라 능력마다 다른 그라데이션이 된다.
     data-motif 로 능력마다 등장 방식까지 갈린다. */
  .cast {
    position: fixed;
    inset: 0;
    z-index: 900;
    display: grid;
    place-items: center;
    pointer-events: none;
    overflow: hidden;
  }
  /* 뒤 화면이 비쳐 글자를 갉아먹지 않게 한 겹 눌러 준다.
     .cast 자체에 opacity 를 주면 글자까지 같이 흐려지므로 별도 층으로 깐다. */
  .cast::before {
    content: '';
    position: absolute;
    inset: 0;
    background: #000;
    animation: castScrim 1.6s ease both;
  }
  @keyframes castScrim {
    0%   { opacity: 0; }
    10%  { opacity: .72; }
    62%  { opacity: .62; }
    100% { opacity: 0; }
  }
  /* 화면 전체를 한 번 물들이는 섬광 */
  .cast-wash {
    position: absolute;
    inset: -20%;
    background:
      radial-gradient(circle at 50% 50%, hsl(var(--c1) 95% 60% / .55), transparent 62%),
      linear-gradient(120deg, hsl(var(--c2) 95% 55% / .40), transparent 55%);
    animation: castWash 1.6s cubic-bezier(.2,.9,.2,1) both;
  }
  /* 퍼져 나가는 충격파 */
  .cast-ring {
    position: absolute;
    width: 42vmin; height: 42vmin;
    border-radius: 50%;
    border: 3px solid hsl(var(--c1) 95% 68% / .9);
    animation: castRing 1.15s cubic-bezier(.15,.85,.25,1) both;
  }
  .cast-ring2 {
    border-color: hsl(var(--c2) 95% 70% / .75);
    border-width: 2px;
    animation-delay: .12s;
  }
  /* 대각선으로 훑고 지나가는 띠 */
  .cast-bars {
    position: absolute;
    inset: -40%;
    background: repeating-linear-gradient(
      -18deg,
      hsl(var(--c1) 90% 62% / .30) 0 10px,
      transparent 10px 34px
    );
    transform: translateX(-120%);
    animation: castBars 1.25s cubic-bezier(.25,.9,.25,1) both;
  }
  .cast-streak {
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 34%, hsl(var(--c2) 100% 82% / .75) 50%, transparent 66%);
    transform: translateX(-140%) skewX(-12deg);
    animation: castStreak .85s cubic-bezier(.3,.85,.25,1) .08s both;
  }
  .cast-core { position: relative; text-align: center; padding: 0 16px; }
  .cast-kind {
    font-size: .66rem;
    font-weight: 800;
    letter-spacing: .42em;
    color: hsl(var(--c2) 95% 80%);
    text-shadow: 0 0 12px hsl(var(--c2) 100% 60% / .8);
    animation: castKind 1.5s ease both;
  }
  .cast-name {
    font-size: clamp(2.6rem, 12vw, 6rem);
    font-weight: 900;
    letter-spacing: .06em;
    line-height: 1.05;
    background: linear-gradient(100deg, hsl(var(--c1) 100% 72%), hsl(var(--c2) 100% 78%) 55%, hsl(var(--c1) 100% 70%));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 0 26px hsl(var(--c1) 100% 55% / .85));
    animation: castName 1.6s cubic-bezier(.14,1,.3,1) both;
  }
  .cast-job {
    margin-top: 6px;
    font-size: .8rem;
    font-weight: 700;
    letter-spacing: .3em;
    color: #fff;
    text-shadow: 0 0 14px hsl(var(--c1) 100% 55% / .9);
    animation: castKind 1.5s ease .06s both;
  }
  .cast-passive .cast-name { letter-spacing: .12em; }

  /* 능력마다 등장 방식이 다르게 */
  .cast[data-motif='burst'] .cast-name { animation-name: castNameBurst; }
  .cast[data-motif='pulse'] .cast-name { animation-name: castNamePulse; }
  .cast[data-motif='glitch'] .cast-name { animation-name: castNameGlitch; }
  .cast[data-motif='pulse'] .cast-bars { animation-name: castBarsPulse; }
  .cast[data-motif='glitch'] .cast-streak { animation-duration: .5s; animation-iteration-count: 2; }

  @keyframes castWash {
    0%   { opacity: 0; }
    12%  { opacity: 1; }
    55%  { opacity: .55; }
    100% { opacity: 0; }
  }
  @keyframes castRing {
    0%   { opacity: 0; transform: scale(.15); }
    18%  { opacity: 1; }
    100% { opacity: 0; transform: scale(3.4); }
  }
  @keyframes castBars {
    0%   { opacity: 0; transform: translateX(-120%); }
    20%  { opacity: 1; }
    100% { opacity: 0; transform: translateX(120%); }
  }
  @keyframes castBarsPulse {
    0%   { opacity: 0; transform: scale(.6); }
    25%  { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.6); }
  }
  @keyframes castStreak {
    0%   { transform: translateX(-140%) skewX(-12deg); }
    100% { transform: translateX(140%) skewX(-12deg); }
  }
  @keyframes castKind {
    0%   { opacity: 0; transform: translateY(10px); letter-spacing: .9em; }
    22%  { opacity: 1; transform: none; letter-spacing: .42em; }
    76%  { opacity: 1; }
    100% { opacity: 0; }
  }
  /* 기본: 크게 흐릿하게 들어와 꽂히고, 마지막에 살짝 커지며 사라진다 */
  @keyframes castName {
    0%   { opacity: 0; transform: scale(2.6) rotate(-4deg); filter: blur(18px) drop-shadow(0 0 26px hsl(var(--c1) 100% 55% / .85)); }
    26%  { opacity: 1; transform: scale(1); filter: blur(0) drop-shadow(0 0 26px hsl(var(--c1) 100% 55% / .85)); }
    72%  { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.16); }
  }
  @keyframes castNameBurst {
    0%   { opacity: 0; transform: scale(.2); }
    20%  { opacity: 1; transform: scale(1.22); }
    34%  { transform: scale(.96); }
    46%  { transform: scale(1.04); }
    72%  { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.3); }
  }
  @keyframes castNamePulse {
    0%   { opacity: 0; transform: scale(1.7); filter: blur(14px); }
    24%  { opacity: 1; transform: scale(1); filter: blur(0); }
    40%  { transform: scale(1.07); }
    56%  { transform: scale(1); }
    72%  { transform: scale(1.05); }
    100% { opacity: 0; transform: scale(1.14); }
  }
  @keyframes castNameGlitch {
    0%   { opacity: 0; transform: translateX(-26px) scale(1.5) skewX(14deg); filter: blur(10px); }
    14%  { opacity: 1; transform: translateX(12px) scale(1) skewX(-8deg); filter: blur(0); }
    22%  { transform: translateX(-9px) skewX(6deg); }
    30%  { transform: translateX(5px) skewX(-3deg); }
    38%  { transform: none; }
    74%  { opacity: 1; }
    100% { opacity: 0; transform: scale(1.12); }
  }
  /* 발동 순간 판이 한 번 흔들린다 */
  .board-hit { animation: boardHit .5s cubic-bezier(.36,.07,.19,.97) both; }
  @keyframes boardHit {
    0%, 100% { transform: none; }
    12% { transform: translate(-6px, 3px); }
    28% { transform: translate(5px, -4px); }
    44% { transform: translate(-4px, -2px); }
    62% { transform: translate(3px, 2px); }
    80% { transform: translate(-2px, 0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .cast-wash, .cast-ring, .cast-bars, .cast-streak { display: none; }
    .cast-name, .cast-kind, .cast-job { animation: castStill 1.4s ease both; }
    .board-hit { animation: none; }
    @keyframes castStill { 0%, 100% { opacity: 0; } 15%, 75% { opacity: 1; } }
  }

  /* ── 능력 기록 카드 ────────────────────────────────
     --fx-hue 는 능력 이름에서 뽑아 능력마다 색이 고정된다. */

  /* 기본값은 밝은 테마 기준이다. 어두운 테마는 아래에서 따로 덮는다. */

  /* 왼쪽 색 띠로 능력마다 첫인상이 다르게 */

  /* 카드를 한 번 훑고 지나가는 빛. */

  :global([data-theme="dark"]) .fx-card {
    border-color: hsl(var(--fx-hue) 70% 55% / .55);
    background: linear-gradient(135deg, hsl(var(--fx-hue) 70% 50% / .22), hsl(var(--fx-hue) 70% 50% / .05));
    box-shadow: 0 0 0 1px hsl(var(--fx-hue) 70% 50% / .12), 0 6px 20px hsl(var(--fx-hue) 70% 30% / .35);
  }
  :global([data-theme="dark"]) .fx-name {
    background: linear-gradient(100deg, hsl(var(--fx-hue) 90% 76%), hsl(var(--fx-hue2) 90% 80%));
    -webkit-background-clip: text;
    background-clip: text;
    filter: drop-shadow(0 0 12px hsl(var(--fx-hue) 90% 60% / .5));
  }
  :global([data-theme="dark"]) .fx-kind {
    border-color: hsl(var(--fx-hue) 70% 60% / .5);
    color: hsl(var(--fx-hue) 70% 72%);
  }
  :global([data-theme="dark"]) .fx-flare {
    background: linear-gradient(105deg, transparent 30%, hsl(var(--fx-hue) 90% 75% / .40) 50%, transparent 70%);
  }

  @keyframes fxIn {
    from { opacity: 0; transform: translateY(10px) scale(.96); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes fxSweep {
    to { transform: translateX(120%); }
  }
  /* 애니메이션을 줄여 달라고 한 사용자에게는 정적으로 보여 준다. */
  @media (prefers-reduced-motion: reduce) {
    .fx-card { animation: none; }
    .fx-flare { display: none; }
  }

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
    box-shadow: 0 -8px 24px rgba(0,0,0,.05);
    will-change: transform;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
  }
  .bottom-composer.composer-active {
    border-top-color: var(--accent-line);
  }
  .input-zone {
    display: flex;
    gap: 10px;
    transition: opacity .2s;
    width: 100%;
    max-width: 980px;
    margin: 0 auto;
    padding: 6px;
    border: 1.5px solid var(--accent-line);
    border-radius: calc(var(--radius) + 8px);
    background: var(--bg2);
    box-shadow: var(--shadow);
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
    border-color: var(--accent-line);
    background: var(--accent-soft);
  }
  .input-zone.premove-input {
    border-color: rgba(245,158,11,.25);
    background: color-mix(in srgb, var(--gold) 7%, var(--bg2));
  }
  .input-zone.premove-input .word-input {
    color: var(--text);
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
    background: var(--accent-fill);
    border-color: var(--accent-fill);
    color: var(--on-accent);
    box-shadow: 0 6px 20px var(--accent-soft);
    animation: sendPulse 1.8s ease-in-out infinite;
  }
  .send-btn.premove-ready {
    background: var(--gold);
    border-color: var(--gold);
    color: #111827;
    box-shadow: 0 4px 18px rgba(245,158,11,.28);
  }
  .premove-panel {
    width: 100%;
    max-width: 980px;
    margin: 0 auto;
    min-height: 48px;
    padding: 9px 10px 9px 13px;
    border: 1px solid rgba(245,158,11,.28);
    border-radius: calc(var(--radius) + 4px);
    background: color-mix(in srgb, var(--gold) 10%, var(--bg2));
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    box-shadow: var(--shadow);
  }
  .premove-kicker {
    display: block;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 1px;
    color: #b45309;
  }
  .premove-panel strong {
    display: block;
    margin-top: 1px;
    font-size: 15px;
    color: var(--text);
  }
  .premove-panel p {
    margin-top: 2px;
    font-size: 12px;
    color: var(--text2);
  }
  .premove-cancel {
    min-width: 74px;
    height: 34px;
    padding: 0 10px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(180,83,9,.28);
    background: var(--bg2);
    color: #92400e;
    font-size: 12px;
    font-weight: 900;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }

  /* Ability bar */
  .ability-bar {
    width: 100%;
    max-width: 980px;
    margin: 0 auto;
    display: block;
    padding: 8px;
    border-radius: calc(var(--radius) + 8px);
    background: var(--bg3);
    border: 1px solid var(--border);
    animation: fadeUp .3s ease both;
  }
  .ability-grid { display: flex; flex-wrap: wrap; gap: 7px; }
  .ab-btn {
    height: 38px;
    padding: 0 15px;
    margin-top: 7px;
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
    background: var(--accent-soft);
    box-shadow: 0 4px 14px var(--accent-soft);
  }
  .ab-btn.ab-not-ready {
    color: var(--text3);
    background: rgba(148,163,184,.1);
  }

  /* Control column */

  .ctrl-btn {
    height: 38px;
    min-width: 76px;
    padding: 0 16px;
    flex: 0 0 auto;
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
  .ctrl-btn.danger { color: var(--danger-fg); }
  .ctrl-btn.danger:hover:not(:disabled) { border-color: var(--red); color: var(--danger-fg); background: var(--danger-bg); }
  .vote-yes {
    flex: 1; height: 38px;
    border-radius: var(--radius-sm);
    background: var(--accent-fill); color: var(--on-accent);
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
    min-height: 0;
    padding: 24px;
    max-width: 1120px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
    overflow: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    animation: fadeUp .28s ease both;
  }

  /* Jobs */
  .jobs-page { max-width: 1180px; }
  .jobs-layout {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 16px;
    align-items: start;
    flex: 0 0 auto;
  }
  .jobs-page :global(.tier-maker) { flex: 0 0 auto; }
  .jobs-list-panel,
  .job-detail-panel,
  .job-stat-card,
  .command-card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg2);
  }
  .jobs-list-panel {
    padding: 14px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: sticky;
    top: 0;
    max-height: calc(100dvh - 130px);
  }
  .jobs-panel-head { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
  .jobs-panel-head h2,
  .job-detail-head h2,
  .help-header h2 { font-size: 24px; font-weight: 900; letter-spacing: 0; }
  .job-filter-input { width: 100%; height: 38px; font-size: 13px; }
  .jobs-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 4px;
    overflow-y: auto;
    min-height: 0;
    padding-right: 2px;
  }
  .job-list-btn {
    min-height: 44px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text2);
    font-size: 13px;
    font-weight: 800;
    text-align: left;
  }
  .job-list-btn:hover,
  .job-list-btn.jlb-active { background: var(--accent-soft); color: var(--accent2); }
  .jlb-icon,
  .job-detail-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 14px;
    font-weight: 900;
    position: relative;
  }
  .jlb-icon img,
  .job-detail-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .jlb-icon img:not([hidden]) + span,
  .job-detail-icon img:not([hidden]) + span { display: none; }
  .job-detail-panel {
    padding: 18px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .job-detail-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .job-title-wrap { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .job-detail-icon { width: 54px; height: 54px; font-size: 22px; }
  .job-ability-strip { display: flex; flex-wrap: wrap; gap: 6px; max-width: 420px; justify-content: flex-end; }
  .job-ability-strip span {
    border: 1px solid var(--accent-line);
    background: var(--accent-soft);
    color: var(--accent2);
    border-radius: 999px;
    padding: 4px 9px;
    font-size: 11px;
    font-weight: 800;
  }
  .job-info-gui {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    align-items: start;
    gap: 10px;
    max-height: 440px;
    overflow: auto;
    padding-right: 2px;
  }
  .job-info-card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg2);
    overflow: hidden;
    box-shadow: var(--shadow);
  }
  .jic-head {
    padding: 11px 12px;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 9%, var(--bg2)), var(--bg2));
    display: grid;
    gap: 7px;
  }
  .jic-name {
    font-size: 15px;
    font-weight: 950;
    color: var(--text);
  }
  .jic-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .jic-meta span {
    min-height: 22px;
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid var(--accent-line);
    background: var(--accent-soft);
    color: var(--accent2);
    font-size: 11px;
    font-weight: 900;
  }
  .jic-body {
    display: grid;
    gap: 8px;
    padding: 12px;
  }
  .jic-body p {
    font-size: 13px;
    line-height: 1.58;
    color: var(--text2);
    word-break: keep-all;
    overflow-wrap: anywhere;
  }
  .jic-body p.jic-bullet {
    position: relative;
    padding-left: 14px;
  }
  .jic-body p.jic-bullet::before {
    content: '';
    position: absolute;
    left: 1px;
    top: .72em;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
  }
  .job-side-grid { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 12px; align-items: start; }
  .job-stat-card { padding: 14px; min-width: 0; }
  .job-section-title { font-size: 13px; font-weight: 900; color: var(--text); margin-bottom: 10px; }
  .mini-rank-row,
  .tier-row {
    min-height: 34px;
    display: grid;
    align-items: center;
    gap: 8px;
    border-top: 1px solid var(--border);
    font-size: 12px;
  }
  .mini-rank-row { grid-template-columns: 26px minmax(0,1fr) auto auto; }
  .mini-rank-num { font-weight: 900; color: var(--tc, var(--accent)); }
  .mini-rank-name { font-weight: 800; overflow-wrap: anywhere; }
  .mini-rank-record { color: var(--text3); }
  .mini-rank-rating { color: var(--tc, var(--accent)); font-weight: 900; }
  .tier-table { max-height: 340px; overflow: auto; }
  .tier-row { grid-template-columns: 10px minmax(0, 1fr) auto; }
  .tier-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--tc); box-shadow: 0 0 10px var(--tc-glow); }
  .tier-name { font-weight: 800; }
  .tier-range { color: var(--text3); font-weight: 700; }

  /* Help */
  .help-page { max-width: 980px; }
  .help-header { display: flex; flex-direction: column; gap: 4px; }
  .help-header p { color: var(--text2); font-size: 14px; }
  .help-subheader { margin-top: 10px; }
  .lecture-stack { display: grid; gap: 12px; }
  .lecture-card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg2);
    padding: 16px;
    display: grid;
    gap: 13px;
  }
  .lecture-heading {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
  }
  .lecture-heading h3 { font-size: 17px; font-weight: 900; }
  .lecture-heading p { margin-top: 3px; color: var(--text2); font-size: 13px; line-height: 1.55; }
  .term-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 8px;
  }
  .term-row {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg2);
    padding: 10px;
    display: grid;
    gap: 5px;
  }
  .term-row strong { font-size: 13px; font-weight: 900; color: var(--accent); }
  .term-row span { font-size: 12px; line-height: 1.55; color: var(--text2); }
  .lecture-points {
    display: grid;
    gap: 7px;
    padding-left: 18px;
    color: var(--text2);
    font-size: 13px;
    line-height: 1.55;
  }
  .lecture-points li::marker { color: var(--accent); }
  .tutorial-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
  .tutorial-card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg2);
    padding: 14px;
    display: grid;
    gap: 7px;
  }
  .tutorial-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-fill);
    color: var(--on-accent);
    font-size: 12px;
    font-weight: 900;
  }
  .tutorial-card h3 { font-size: 15px; font-weight: 900; }
  .tutorial-card p { font-size: 13px; line-height: 1.55; color: var(--text2); }

  /* Search */
  .search-bar { display: flex; gap: 10px; }
  .search-input { flex: 1; height: 48px; font-size: 16px; border-radius: var(--radius); }
  .search-submit {
    height: 48px; padding: 0 24px;
    border-radius: var(--radius);
    background: var(--accent-fill);
    color: var(--on-accent);
    font-size: 14px;
    font-weight: 700;
    display: inline-flex; align-items: center; gap: 8px;
    transition: background .18s, box-shadow .18s;
    box-shadow: 0 4px 16px var(--accent-soft);
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
  .kind-pill.kind-active { background: var(--accent-fill); border-color: var(--accent-fill); color: var(--on-accent); }
  .word-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(212px,1fr));
    grid-auto-rows: 1fr;
    gap: 10px;
    align-content: start;
  }
  .word-card {
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 13px 15px;
    background: var(--bg2);
    text-align: left;
    display: flex; flex-direction: column; gap: 8px;
    animation: popIn .22s cubic-bezier(.34,1.56,.64,1) both;
    transition: border-color .15s, box-shadow .15s, transform .15s;
  }
  .word-card .wc-win { margin-top: auto; }
  .word-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
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
  .wc-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; color: var(--text2); }
  .wc-win {
    align-self: flex-start;
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

  /* Ranking */
  .rank-page { max-width: 760px; }
  .rank-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
  .rank-title { font-size: 26px; font-weight: 900; letter-spacing: -.6px; }
  .rank-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .rank-row {
    display: flex; align-items: center; gap: 14px;
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 10px 16px; background: var(--bg2);
    animation: fadeUp .2s ease both;
    animation-delay: calc(var(--ri) * 30ms);
    transition: border-color .18s, box-shadow .18s, transform .18s;
  }
  .rank-row:hover {
    border-color: var(--tc, var(--border2));
    box-shadow: 0 0 0 1px var(--tc-glow, transparent);
    transform: translateX(2px);
  }
  .rank-row.rank-podium { border-color: var(--tc-glow, var(--border)); background: var(--card); }
  .rank-num {
    width: 30px; text-align: center; font-size: 15px; font-weight: 900;
    color: var(--text3); font-variant-numeric: tabular-nums; flex: 0 0 auto;
  }
  .rank-num.rank-top { color: var(--tc, var(--accent)); font-size: 17px; }
  .rank-avatar {
    width: 34px; height: 34px; border-radius: 50%;
    background: var(--accent-fill); color: var(--on-accent);
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; font-weight: 900;
    flex-shrink: 0;
  }
  .rank-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .rank-name { font-size: 14.5px; font-weight: 800; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rank-record { font-size: 12px; color: var(--text3); }
  .rank-tier-col { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex: 0 0 auto; }
  .rank-tier-badge {
    font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 20px;
    background: var(--tc-glow, #eee); color: var(--tc, #666);
    border: 1px solid var(--tc, #ddd); white-space: nowrap;
  }
  .rank-rating { min-width: 46px; text-align: right; font-size: 16px; font-weight: 900; color: var(--text); letter-spacing: -.4px; font-variant-numeric: tabular-nums; }
  .rank-empty { padding: 40px; text-align: center; color: var(--text3); font-size: 14px; }
  .rank-empty.small { padding: 20px 12px; font-size: 13px; }
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
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; }
  }


  .ab-btn { position: relative; overflow: visible; }
  .ab-status-val {
    position: absolute; top: -7px; right: -6px;
    background: var(--accent-fill); color: var(--on-accent);
    font-size: 10px; font-weight: 800;
    min-width: 18px; max-width: 78px; height: 18px; padding: 0 6px;
    border-radius: 9px; display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--bg); z-index: 2;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ab-btn.ab-not-ready .ab-status-val { background: var(--text3); }

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
  .tc-submit { background: var(--accent-fill); color: var(--on-accent); padding: 0 20px; border-radius: 8px; font-weight: 700; cursor: pointer; border: none; }

  .effects-layer { position: fixed; inset: 0; pointer-events: none; z-index: 3000; overflow: hidden; }
  .activation-splash { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; animation: splashOut 1.5s forwards; }
  .splash-text { position: relative; z-index: 2; text-align: center; }
  .splash-kicker { display: block; font-size: 14px; font-weight: 900; letter-spacing: 0.2em; color: rgba(255,255,255,0.7); margin-bottom: 4px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
  .splash-name { display: block; font-size: 48px; font-weight: 900; color: #fff; text-shadow: 0 4px 20px rgba(0,0,0,0.5); }
  .splash-bg { position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, rgba(59,130,246,0.8) 0%, transparent 70%); border-radius: 50%; opacity: 0; animation: bgExpand 0.8s ease-out forwards; }
  .activation-splash.passive .splash-bg { background: radial-gradient(circle, rgba(16,185,129,0.8) 0%, transparent 70%); }
  .activation-splash.surrender .splash-bg { background: radial-gradient(circle, rgba(239,68,68,0.82) 0%, rgba(15,23,42,0.2) 44%, transparent 72%); }
  .activation-splash.surrender .splash-name { color: #fee2e2; }
  .splash-job { display: inline-flex; align-items: center; gap: 10px; margin: 8px 0 6px; padding: 6px 14px 6px 6px; background: rgba(0,0,0,0.32); border: 1px solid rgba(255,255,255,0.18); border-radius: 999px; backdrop-filter: blur(8px); }
  .splash-job-portrait { position: relative; width: 44px; height: 44px; border-radius: 50%; overflow: hidden; border: 2px solid rgba(255,255,255,0.35); box-shadow: 0 2px 12px rgba(0,0,0,0.35); background: linear-gradient(135deg, #6366f1, #8b5cf6); }
  .splash-job-portrait .splash-job-initial { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 20px; }
  .splash-job-portrait .splash-job-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .splash-job-name { font-size: 20px; font-weight: 800; color: #fff; text-shadow: 0 2px 6px rgba(0,0,0,0.5); letter-spacing: 0.02em; }
  
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

  /* ═══════════════════════════════════════════
     FLOATING CHAT
  ═══════════════════════════════════════════ */
  .floating-chat-container {
    position: fixed;
    top: 66px;
    right: 18px;
    z-index: 940;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .chat-window {
    width: 340px;
    height: min(460px, calc(100dvh - 96px));
    background: var(--bg2);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: chatPopUp .22s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: 1px solid var(--border);
  }
  @keyframes chatPopUp {
    from { opacity: 0; transform: translateY(-10px) scale(.96); }
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
    color: var(--text);
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
    background: var(--accent-fill);
    color: var(--on-accent);
    border-radius: 14px 14px 4px 14px;
  }
  .chat-at {
    font-size: 9px;
    color: var(--text3);
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
    background: var(--bg2);
  }
  .chat-send {
    width: 38px;
    height: 38px;
    border-radius: 19px;
    background: var(--accent-fill);
    color: var(--on-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .chat-send:hover:not(:disabled) {
    transform: scale(1.05);
    background: var(--accent2);
  }
  

  /* ═══════════════════════════════════════════
     THEME BUTTON & DM BADGE
  ═══════════════════════════════════════════ */

  .icon-btn.dm-unread { border-color: var(--accent); color: var(--accent); }
  .dm-badge {
    position: absolute;
    top: -4px; right: -4px;
    min-width: 16px; height: 16px;
    background: var(--red);
    color: var(--on-accent);
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
    position: fixed; inset: 0; background: var(--overlay);
    backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
    z-index: 900;
    animation: overlayIn .2s ease both;
  }
  .dm-panel {
    position: fixed;
    top: 0; right: 0; bottom: 0;
    width: min(480px, 100vw);
    background: var(--bg2);
    border-left: 1px solid var(--border);
    z-index: 950;
    display: flex; flex-direction: column;
    box-shadow: var(--shadow-lg);
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
    background: var(--accent-fill); color: var(--on-accent);
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
    background: var(--accent-fill); color: var(--on-accent);
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
    background: var(--accent-fill); color: var(--on-accent);
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
    background: var(--accent-fill); color: var(--on-accent);
    display: flex; align-items: center; justify-content: center;
    transition: background .2s, transform .2s;
  }
  .dm-send-btn:hover:not(:disabled) { background: var(--accent2); transform: scale(1.05); }


  /* ═══════════════════════════════════════════
     SETTINGS PAGE
  ═══════════════════════════════════════════ */
  .settings-page { max-width: 760px; }
  .settings-title {
    display: flex; align-items: center; gap: 10px;
    font-size: 26px; font-weight: 900; letter-spacing: -.6px; color: var(--text);
  }
  .settings-section {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 22px 24px;
    box-shadow: var(--card-shadow);
  }
  .settings-section-label {
    display: flex; align-items: center; gap: 7px;
    font-size: 11px; font-weight: 800; letter-spacing: .08em;
    text-transform: uppercase; color: var(--text3);
    margin-bottom: 14px;
  }
  .settings-section-desc {
    font-size: 13px; color: var(--text2); margin: -6px 0 16px; line-height: 1.55;
  }
  .account-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .account-avatar {
    width: 42px; height: 42px; border-radius: 50%;
    display: grid; place-items: center;
    background: var(--accent-fill); color: var(--on-accent);
    font-size: 18px; font-weight: 900; flex: 0 0 auto;
  }
  .account-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .account-meta strong { font-size: 16px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .account-meta span { font-size: 12.5px; color: var(--text3); }
  .theme-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; max-width: 340px; }
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
    box-shadow: 0 0 0 3px var(--focus-ring);
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
    color: #fff; font-size: 12px; font-weight: 800;
    text-shadow: 0 1px 2px rgba(0,0,0,.28);
  }

  /* Lobby / wizard / kkutu wait */

  .wizard-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: var(--overlay);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: fadeIn .16s ease both;
  }
  .wizard-card {
    width: min(720px, 100%);
    max-height: min(86dvh, 900px);
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    display: flex; flex-direction: column;
    color: var(--text);
    animation: popIn .2s cubic-bezier(.22,1,.36,1) both;
  }
  .wizard-head, .wizard-foot { padding: 16px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
  .wizard-head-main { display: grid; gap: 6px; min-width: 0; }
  .wizard-progress { display: flex; gap: 6px; margin-top: 4px; }
  .wizard-progress-dot {
    width: 28px; height: 4px; border-radius: 999px;
    background: var(--border2); transition: background .2s, transform .2s;
  }
  .wizard-progress-done { background: color-mix(in srgb, var(--accent) 55%, var(--border2)); }
  .wizard-progress-current { background: var(--accent); transform: scaleY(1.35); }
  .wizard-head h2 { font-size: 20px; font-weight: 800; color: var(--text); margin-top: 4px; }
  .wizard-foot { border-bottom: 0; border-top: 1px solid var(--border); justify-content: flex-end; }
  .wizard-body { padding: 18px; overflow: auto; flex: 1; }
  .wizard-close { color: var(--text3); }
  .wizard-choice-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .wizard-choice-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .wizard-choice {
    text-align: left;
    padding: 16px;
    border: 2px solid var(--border2);
    border-radius: 12px;
    background: var(--bg3);
    color: var(--text);
    display: grid;
    gap: 6px;
    transition: border-color .15s, background .15s, box-shadow .15s;
  }
  .wizard-choice:hover:not(:disabled) {
    border-color: var(--accent);
    background: var(--bg2);
  }
  .wizard-choice strong { font-size: 15px; font-weight: 800; color: var(--text); }
  .wizard-choice span { font-size: 12px; line-height: 1.45; color: var(--text2); }
  .wizard-choice-active {
    border-color: var(--accent);
    background: var(--bg2);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 24%, transparent);
  }
  .wizard-choice-active strong { color: var(--accent); }
  .wizard-choice-active span { color: var(--text2); }
  .wizard-choice-disabled { opacity: .45; cursor: not-allowed; }
  .wizard-hint { font-size: 13px; color: var(--text2); margin-bottom: 12px; }
  .wizard-extras { display: grid; gap: 12px; }
  .setting-inline { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

  .wait-room {
    flex: 1; min-height: 0; display: grid;
    align-items: start;
    grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
    gap: 16px; padding: 20px;
    padding-left: max(20px, env(safe-area-inset-left));
    padding-right: max(20px, env(safe-area-inset-right));
    width: 100%; max-width: 1320px; margin: 0 auto;
    background: var(--bg);
    overflow: hidden;
  }
  .wait-room-side {
    display: flex; flex-direction: column; gap: 12px;
    padding: 16px; border-radius: var(--radius-lg);
    background: var(--card); border: 1px solid var(--border);
    box-shadow: var(--card-shadow);
    overflow: auto;
    min-height: 0; max-height: 100%;
  }
  .wait-room-card { display: grid; gap: 8px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
  .wait-room-code {
    display: flex; align-items: center; gap: 8px;
    margin-top: 4px; padding: 8px 12px; border-radius: var(--radius-sm);
    background: var(--bg3); border: 1px dashed var(--border2);
    font-size: 12px; font-weight: 700; color: var(--text3);
    text-align: left;
  }
  .wait-room-code strong {
    flex: 1; min-width: 0; font-size: 14px; font-weight: 900; color: var(--text);
    letter-spacing: .08em; overflow: hidden; text-overflow: ellipsis;
  }
  .wait-room-copy { color: var(--accent); font-weight: 800; }
  .wait-room-code:hover { border-color: var(--accent); }
  .wait-room-kicker { font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--accent); }
  .wait-room-title { font-size: 22px; font-weight: 900; line-height: 1.25; }
  .wait-room-mode {
    display: inline-flex; justify-self: start; align-items: center;
    font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 999px;
    background: var(--accent-soft); color: var(--accent);
  }
  .wait-room-rules h3 { font-size: 13px; font-weight: 800; color: var(--text2); margin-bottom: 10px; }
  .wait-rules-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
  .wait-rules-head h3 { margin-bottom: 0; }
  .wait-settings-toggle {
    height: 28px; padding: 0 10px; border-radius: 8px;
    background: var(--bg3); border: 1px solid var(--border2);
    font-size: 12px; font-weight: 800; color: var(--accent);
  }
  .wait-settings-form { display: grid; gap: 10px; }
  .wait-settings-row { display: flex; gap: 8px; }
  .wait-settings-row .mode-btn { flex: 1; min-width: 0; }
  .wait-ready-group {
    display: inline-flex; padding: 4px; gap: 4px;
    border-radius: 12px; background: var(--bg3); border: 1px solid var(--border2);
  }
  .wait-ready-btn {
    min-width: 64px; height: 36px; padding: 0 14px; border-radius: 9px;
    font-size: 13px; font-weight: 800; color: var(--text2);
    background: transparent;
  }
  .wait-ready-btn.wait-ready-active {
    background: var(--card); color: var(--accent);
    box-shadow: 0 1px 4px rgba(15, 23, 42, .08);
  }
  .wait-ready-btn:disabled { opacity: .55; }
  .wait-player-status.cpu { color: var(--text3); }
  .wait-room-rules ul { list-style: none; display: grid; gap: 8px; }
  .wait-room-rules li { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
  .wait-room-rules span { color: var(--text3); }
  .wait-room-rules strong { font-weight: 800; }
  .wait-invite-side { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .wait-leave { margin-top: auto; }
  .wait-room-main {
    padding: 20px; border-radius: var(--radius-lg);
    background: var(--card); border: 1px solid var(--border);
    box-shadow: var(--card-shadow);
    overflow: auto; display: flex; flex-direction: column; gap: 18px;
    min-height: 0; max-height: 100%;
  }
  .wait-room-head h2 { font-size: 22px; font-weight: 900; margin-bottom: 4px; }
  .wait-room-head p { color: var(--text2); font-size: 14px; }
  .wait-player-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; align-content: start; }
  .wait-player-slot {
    min-height: 104px; border-radius: var(--radius);
    border: 1px solid var(--border2);
    background: var(--bg2);
    padding: 14px; display: flex; flex-direction: column; justify-content: center; gap: 8px;
    min-width: 0;
  }
  .wait-slot-filled { border-color: color-mix(in srgb, var(--accent) 35%, var(--border)); background: var(--card); }
  .wait-slot-me { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent); }
  .wait-player-top { display: flex; align-items: center; gap: 10px; }
  .wait-player-avatar {
    width: 40px; height: 40px; border-radius: 12px;
    display: grid; place-items: center;
    background: color-mix(in srgb, var(--accent) 14%, var(--bg3));
    color: var(--accent); font-weight: 900; font-size: 16px;
  }
  .wait-player-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
  .wait-player-name { font-size: 16px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .wait-badge.host {
    font-size: 11px; padding: 2px 8px; border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 14%, var(--bg3));
    color: var(--accent); font-weight: 800;
  }
  .wait-player-status { font-size: 12.5px; font-weight: 700; color: var(--text3); }
  .wait-player-status.ready { color: var(--ok-fg); }
  .wait-slot-actions { display: grid; gap: 8px; }
  .wait-slot-primary, .wait-slot-secondary {
    width: 100%; min-height: 44px; border-radius: 12px;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    font-weight: 800; font-size: 13px;
  }
  .wait-slot-primary {
    background: color-mix(in srgb, var(--accent) 12%, var(--card));
    border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border));
    color: var(--accent);
  }
  .wait-slot-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--accent) 18%, var(--card)); }
  .wait-slot-secondary {
    background: transparent; border: 1px dashed var(--border2); color: var(--text2);
  }
  .wait-slot-secondary:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
  .wait-slot-waiting { text-align: center; color: var(--text3); display: grid; gap: 4px; }
  .wait-slot-waiting span { font-weight: 800; }
  .wait-slot-waiting small { font-size: 12px; }
  .wait-room-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .wait-start { min-width: 150px; justify-content: center; }
  .wait-start-hint { font-size: 12.5px; color: var(--text3); }

  .invite-modal { width: min(420px, 100%); }
  .invite-modal-body { display: grid; gap: 14px; }
  .friend-add-row { display: flex; gap: 8px; }
  .friend-add-row .lobby-input { flex: 1; }
  .friend-section { display: grid; gap: 8px; }
  .friend-section-label, .settings-friend-block .friend-section-label {
    font-size: 12px; font-weight: 800; color: var(--text3); text-transform: uppercase; letter-spacing: .06em;
  }
  .settings-friend-block { display: grid; gap: 8px; margin-top: 12px; }
  .friend-row {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 10px 12px; border-radius: 12px;
    background: var(--bg2); border: 1px solid var(--border);
  }
  .friend-row-user { display: flex; align-items: center; gap: 8px; font-weight: 700; }
  .friend-avatar {
    width: 30px; height: 30px; border-radius: 10px;
    display: grid; place-items: center;
    background: color-mix(in srgb, var(--accent) 14%, var(--bg3));
    color: var(--accent); font-weight: 900; font-size: 13px;
  }
  .friend-row-actions { display: flex; gap: 6px; }
  .tiny-action { height: 32px; padding: 0 10px; font-size: 12px; }
  .friend-empty { font-size: 13px; color: var(--text3); padding: 8px 2px; }
  .bot-setup-body { display: grid; gap: 14px; }
  .bot-setup-field { display: grid; gap: 8px; }
  .bot-setup-label { font-size: 12px; font-weight: 800; color: var(--text3); }
  /* Lobby */
  .lobby-hub {
    flex: 1; min-height: 0; display: flex; flex-direction: column;
    background: var(--bg);
    overflow: hidden;
  }
  .lobby-inner {
    flex: 1; min-height: 0;
    width: 100%; max-width: 1180px; margin: 0 auto;
    padding: 24px 24px 28px;
    padding-left: max(24px, env(safe-area-inset-left));
    padding-right: max(24px, env(safe-area-inset-right));
    display: flex; flex-direction: column; gap: 22px;
    animation: fadeUp .28s ease both;
  }
  .lobby-bar {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
  }
  .lobby-heading h1 { font-size: 26px; font-weight: 900; letter-spacing: -.6px; }
  .lobby-heading p { margin-top: 4px; font-size: 14px; color: var(--text2); }
  .lobby-create-btn {
    display: inline-flex; align-items: center; gap: 7px;
    height: 44px; padding: 0 20px; border-radius: var(--radius);
    background: var(--accent-fill); color: var(--on-accent);
    font-weight: 800; font-size: 14.5px;
    box-shadow: var(--shadow);
    transition: background .16s, transform .16s, box-shadow .16s;
  }
  .lobby-create-btn:hover:not(:disabled) { background: var(--accent2); transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .lobby-create-btn:active:not(:disabled) { transform: translateY(0); }
  .lobby-section { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
  .lobby-section-grow { flex: 1; min-height: 0; }
  .lobby-section-label {
    font-size: 11.5px; font-weight: 800; letter-spacing: .08em;
    text-transform: uppercase; color: var(--text3);
  }
  .lobby-chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .lobby-chip {
    display: inline-flex; align-items: center; gap: 8px;
    min-height: 38px; padding: 0 8px 0 14px; border-radius: 999px;
    max-width: 100%;
    background: var(--card); border: 1px solid var(--border);
    font-size: 13px; font-weight: 700; color: var(--text);
    box-shadow: var(--card-shadow);
  }
  .lobby-chip-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lobby-chip-action { padding-right: 8px; transition: border-color .16s; }
  .lobby-chip-action:hover { border-color: var(--accent); }
  .lobby-chip-tag {
    font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 999px;
    background: var(--bg3); color: var(--text2);
  }
  .lobby-chip-tag.is-live { background: var(--ok-bg); color: var(--ok-fg); }
  .lobby-chip-invite { border-color: var(--accent-line); background: var(--accent-soft); }
  .chip-btn {
    height: 28px; padding: 0 11px; border-radius: 999px;
    background: var(--accent-fill); color: var(--on-accent); font-size: 12px; font-weight: 800;
    flex: 0 0 auto;
  }
  .chip-btn-ghost { background: transparent; color: var(--text3); font-size: 16px; padding: 0 8px; }
  .chip-btn-ghost:hover { color: var(--text); }
  .room-grid {
    flex: 1; min-height: 0; overflow: auto;
    display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr));
    gap: 12px; align-content: start;
    padding-bottom: 4px;
  }
  .room-tile {
    text-align: left; padding: 14px 16px; min-width: 0;
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius); display: grid; gap: 10px;
    box-shadow: var(--card-shadow);
    transition: border-color .16s, transform .16s, box-shadow .16s;
  }
  .room-tile:hover:not(:disabled) {
    border-color: var(--accent);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  .room-tile-head { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .room-tile-name {
    flex: 1; min-width: 0; font-size: 15px; font-weight: 800;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .room-tile-lock { flex: 0 0 auto; font-size: 12px; line-height: 1; }
  .room-tile-meta { display: flex; align-items: center; gap: 6px; min-width: 0; flex-wrap: wrap; }
  .room-tile-mode {
    font-size: 11.5px; font-weight: 800; padding: 3px 9px; border-radius: 999px;
    background: var(--accent-soft); color: var(--accent);
    white-space: nowrap;
  }
  .room-tile-phase {
    font-size: 11.5px; font-weight: 800; padding: 3px 9px; border-radius: 999px;
    background: var(--bg3); color: var(--text2);
    white-space: nowrap;
  }
  .room-tile-phase.is-live { background: var(--ok-bg); color: var(--ok-fg); }
  .room-tile-foot { display: flex; align-items: center; gap: 10px; }
  .room-tile-bar {
    flex: 1; height: 5px; border-radius: 999px;
    background: var(--bg3); overflow: hidden;
  }
  .room-tile-bar-fill { display: block; height: 100%; border-radius: 999px; background: var(--accent); }
  .room-tile-count {
    font-size: 13px; font-weight: 900; color: var(--text);
    font-variant-numeric: tabular-nums; flex: 0 0 auto;
  }
  .room-tile-count span { color: var(--text3); font-weight: 700; }
  .room-empty-state {
    grid-column: 1 / -1; text-align: center; padding: 56px 16px;
    display: grid; gap: 8px; justify-items: center; color: var(--text2);
    border: 1px dashed var(--border2); border-radius: var(--radius-lg);
  }
  .room-empty-gem { font-size: 22px; color: var(--accent); opacity: .6; }
  .room-empty-state p { font-size: 15px; font-weight: 800; color: var(--text); }
  .room-empty-state small { font-size: 13px; color: var(--text3); }
  .room-empty-state .accent-btn { margin-top: 8px; }

  .player-slider-block {
    padding: 16px; border-radius: 14px;
    background: var(--bg3); border: 1px solid var(--border2);
    display: grid; gap: 14px;
  }
  .player-slider-value {
    display: flex; align-items: baseline; justify-content: center; gap: 4px;
  }
  .player-slider-value strong {
    font-size: 42px; font-weight: 900; line-height: 1; color: var(--accent);
    font-variant-numeric: tabular-nums;
  }
  .player-slider-value span { font-size: 16px; font-weight: 800; color: var(--text2); }
  .player-slider {
    width: 100%; height: 8px; appearance: none; border-radius: 999px;
    background: linear-gradient(90deg, var(--accent) 0%, var(--accent) calc((var(--value, 2) - 1) / 19 * 100%), var(--border2) calc((var(--value, 2) - 1) / 19 * 100%));
    accent-color: var(--accent);
  }
  .player-slider::-webkit-slider-thumb {
    appearance: none; width: 22px; height: 22px; border-radius: 50%;
    background: var(--bg2); border: 3px solid var(--accent);
    box-shadow: 0 4px 12px rgba(15, 23, 42, .18);
    cursor: pointer;
  }
  .player-slider::-moz-range-thumb {
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--bg2); border: 3px solid var(--accent);
    box-shadow: 0 4px 12px rgba(15, 23, 42, .18);
    cursor: pointer;
  }
  .player-slider-quick { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
  .player-slider-preset {
    min-width: 40px; height: 34px; padding: 0 10px; border-radius: 10px;
    background: var(--bg2); border: 1px solid var(--border2);
    font-size: 13px; font-weight: 800; color: var(--text2);
    transition: border-color .15s, color .15s, background .15s;
  }
  .player-slider-preset:hover { border-color: var(--accent); color: var(--accent); }
  .player-slider-preset-active {
    background: color-mix(in srgb, var(--accent) 12%, var(--bg2));
    border-color: var(--accent); color: var(--accent);
  }

  .auth-gate {
    flex: 1; min-height: 100dvh;
    display: flex; align-items: center; justify-content: center;
    padding: 24px 16px;
    background:
      radial-gradient(ellipse 60% 40% at 50% 0%, var(--accent-soft), transparent 70%),
      linear-gradient(180deg, var(--bg3) 0%, var(--bg) 60%);
  }
  .auth-gate-card {
    width: min(400px, 100%);
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 32px 28px 28px;
    box-shadow: var(--shadow-lg);
    display: grid; gap: 20px;
    animation: fadeUp .3s cubic-bezier(.22,1,.36,1) both;
  }
  .auth-gate-loading { text-align: center; color: var(--text2); display: grid; gap: 10px; justify-items: center; }
  .auth-gate-brand { text-align: center; display: grid; gap: 6px; justify-items: center; }
  .auth-gate-brand .brand-gem { font-size: 22px; }
  .auth-gate-brand h1 { font-size: 30px; font-weight: 900; letter-spacing: -.8px; }
  .auth-gate-brand p { font-size: 14px; color: var(--text2); }
  .auth-gate-tabs {
    display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
    padding: 4px; border-radius: 999px;
    background: var(--bg3); border: 1px solid var(--border);
    margin-bottom: 0;
  }
  .auth-gate-tabs .auth-panel-tab { height: 38px; background: transparent; }
  .auth-gate-tabs .auth-panel-tab-active { background: var(--accent-fill); color: var(--on-accent); }
  .auth-gate-form { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .wizard-card-sm { width: min(360px, 100%); }
  .wizard-join-hint { font-size: 13px; color: var(--text2); line-height: 1.45; }
  .wizard-join-form { display: grid; gap: 12px; }
  .wizard-field { display: grid; gap: 6px; }
  .wizard-field span { font-size: 12px; font-weight: 700; color: var(--text3); }
  .wizard-field-hint { font-size: 12px; color: var(--text2); line-height: 1.4; }

  /* Simple in-game */
  .ingame-simple {
    flex: 1; min-height: 0; display: flex; flex-direction: column;
    overflow: hidden;
  }
  .simple-stage {
    flex: 1; min-height: 0;
    width: 100%; max-width: 1000px; margin: 0 auto;
    padding: 16px 20px 12px;
    padding-left: max(20px, env(safe-area-inset-left));
    padding-right: max(20px, env(safe-area-inset-right));
    display: flex; flex-direction: column; gap: 12px;
  }
  .simple-hero {
    text-align: center; padding: 18px 16px;
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--card-shadow);
    transition: border-color .2s, box-shadow .2s;
  }
  .simple-hero.my-turn { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
  .simple-syl {
    font-size: clamp(40px, 7vw, 60px); font-weight: 900; line-height: 1.05;
    letter-spacing: -.02em;
  }
  .simple-turn { margin-top: 8px; font-size: 14px; color: var(--text2); display: flex; gap: 10px; justify-content: center; align-items: center; }
  .simple-turn strong { color: var(--accent); }
  .simple-clock {
    font-variant-numeric: tabular-nums; font-weight: 800;
    padding: 2px 9px; border-radius: 999px;
    background: var(--bg3); color: var(--text);
  }
  .simple-job { margin-top: 8px; font-size: 12.5px; font-weight: 700; color: var(--text3); }
  .simple-vote {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 10px 14px; border-radius: var(--radius);
    background: var(--warn-bg); border: 1px solid var(--warn-line); font-size: 13px;
  }
  .simple-vote-text { flex: 1; min-width: 0; font-weight: 700; color: var(--warn-fg); }
  .simple-bar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-wrap: wrap;
  }
  .simple-players { display: flex; gap: 6px; flex-wrap: wrap; min-width: 0; }
  .simple-player {
    display: inline-flex; align-items: baseline; gap: 6px;
    font-size: 13px; font-weight: 700; padding: 6px 12px;
    border-radius: 999px; background: var(--bg2); color: var(--text2);
    border: 1px solid var(--border);
    max-width: 220px;
  }
  .simple-player-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .simple-player-job { font-size: 11.5px; font-weight: 700; opacity: .7; white-space: nowrap; }
  .simple-player.active { background: var(--accent-fill); border-color: var(--accent-fill); color: var(--on-accent); }
  .simple-player.me { box-shadow: 0 0 0 2px var(--accent-soft); }
  .simple-history {
    flex: 1; min-height: 120px; overflow: auto;
    display: flex; flex-direction: column; gap: 8px;
    padding: 16px; background: var(--card);
    border: 1px solid var(--border); border-radius: var(--radius-lg);
    box-shadow: var(--card-shadow);
  }
  .simple-word {
    align-self: flex-start; max-width: min(70%, 460px);
    font-size: 17px; font-weight: 800; padding: 9px 16px;
    background: var(--bg3); color: var(--text);
    border-radius: 14px 14px 14px 4px;
    word-break: break-all;
    animation: fadeUp .2s ease both;
  }
  .simple-word-alt {
    align-self: flex-end;
    background: var(--accent-soft); color: var(--accent);
    border-radius: 14px 14px 4px 14px;
  }
  .simple-actions { display: flex; gap: 8px; flex: 0 0 auto; }
  /* ═══════════════════════════════════════════
     ANALYSIS PAGE
  ═══════════════════════════════════════════ */
  .job-pair-row {
    display: flex; align-items: flex-end; gap: 14px;
    padding: 16px; border-radius: var(--radius-lg);
    background: var(--card); border: 1px solid var(--border);
    box-shadow: var(--card-shadow);
  }
  .jp-side { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
  .jp-label { font-size: 12px; font-weight: 800; color: var(--text3); }
  .jp-side.atk .jp-label { color: var(--red); }
  .jp-side.def .jp-label { color: var(--blue); }
  .jp-select { width: 100%; height: 44px; }
  .jp-vs { font-size: 13px; font-weight: 900; color: var(--text3); padding-bottom: 12px; }

  .mode-tabs {
    display: flex; gap: 6px; flex-wrap: wrap;
    padding: 5px; border-radius: 999px;
    background: var(--bg3); border: 1px solid var(--border);
    align-self: flex-start; max-width: 100%;
  }
  .mode-tab {
    height: 34px; padding: 0 15px; border-radius: 999px;
    font-size: 13px; font-weight: 800; color: var(--text2);
    white-space: nowrap;
    transition: background .16s, color .16s;
  }
  .mode-tab:hover { color: var(--text); }
  .mode-tab.mt-active { background: var(--accent-fill); color: var(--on-accent); }

  .syl-form-row { display: flex; gap: 10px; align-items: center; }
  .syl-inp { width: 92px; height: 48px; text-align: center; font-size: 22px; font-weight: 900; }
  .situ-text {
    width: 100%; min-height: 108px; padding: 12px 14px;
    font-size: 14px; line-height: 1.6; resize: vertical;
  }
  .batch-run { align-self: flex-start; }

  .analysis-spinner {
    display: flex; align-items: center; gap: 10px; justify-content: center;
    padding: 28px; font-size: 14px; font-weight: 700; color: var(--text2);
  }
  .spin-ring {
    width: 20px; height: 20px; border-radius: 50%;
    border: 2.5px solid var(--border2); border-top-color: var(--accent);
    animation: spin .8s linear infinite;
  }

  .force-bar, .ability-info-row {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 12px 14px; border-radius: var(--radius);
    background: var(--bg2); border: 1px solid var(--border);
  }
  .force-lbl, .ai-label { font-size: 12px; font-weight: 800; color: var(--text3); white-space: nowrap; }
  .force-chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 999px;
    background: var(--bg3); border: 1px solid var(--border2);
    font-size: 12px; font-weight: 700; color: var(--text2);
  }
  .fc-via { color: var(--text3); }
  .fc-syl { font-size: 14px; font-weight: 900; color: var(--text); }
  .fc-cnt { font-variant-numeric: tabular-nums; }
  .fc-k { color: var(--red); font-weight: 900; }
  .fc-i { color: var(--orange); font-weight: 900; }

  .ability-info-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 12px; }
  .ai-side { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .ai-atk .ai-label { color: var(--red); }
  .ai-def .ai-label { color: var(--blue); }
  .ai-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .ai-chip {
    padding: 4px 10px; border-radius: 999px;
    background: var(--danger-bg); border: 1px solid var(--danger-line); color: var(--danger-fg);
    font-size: 12px; font-weight: 800;
  }
  .ai-chip.def { background: var(--accent-soft); border-color: var(--accent-line); color: var(--accent); }

  .summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 10px; }
  .sum-card {
    display: grid; gap: 4px; justify-items: center; text-align: center;
    padding: 14px 10px; border-radius: var(--radius);
    background: var(--bg2); border: 1px solid var(--border);
    box-shadow: var(--card-shadow);
  }
  .sum-card.sc-win { border-color: var(--ok-line); background: var(--ok-bg); }
  .sum-card.sc-danger { border-color: var(--danger-line); background: var(--danger-bg); }
  .sc-syl { font-size: 26px; font-weight: 900; line-height: 1.1; }
  .sc-verdict { font-size: 12.5px; font-weight: 800; color: var(--text2); }
  .sc-win-badge {
    font-size: 11px; font-weight: 800; padding: 2px 9px; border-radius: 999px;
    background: var(--ok-bg); color: var(--ok-fg);
  }
  .sc-score { font-size: 12px; color: var(--text3); font-variant-numeric: tabular-nums; }

  .detail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; align-items: start; }
  .detail-card {
    display: flex; flex-direction: column; gap: 10px; min-width: 0;
    padding: 14px; border-radius: var(--radius);
    background: var(--card); border: 1px solid var(--border);
    box-shadow: var(--card-shadow);
  }
  .dc-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .dc-syl { font-size: 20px; font-weight: 900; }
  .dc-dueum, .dc-verdict, .dc-win {
    font-size: 11px; font-weight: 800; padding: 2px 9px; border-radius: 999px;
    background: var(--bg3); color: var(--text2);
  }
  .dc-win { background: var(--ok-bg); color: var(--ok-fg); }
  .dc-counts { display: flex; flex-wrap: wrap; gap: 5px; }
  .cnt-chip {
    font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px;
    background: var(--bg3); color: var(--text2);
  }
  .cnt-한방 { background: var(--danger-bg); color: var(--danger-fg); }
  .cnt-유도 { background: var(--warn-bg); color: var(--warn-fg); }
  .cnt-루트 { background: var(--accent-soft); color: var(--accent); }

  .move-list { display: flex; flex-direction: column; gap: 8px; }
  .move-block {
    display: flex; flex-direction: column; gap: 6px;
    padding: 10px 12px; border-radius: var(--radius-sm);
    background: var(--bg2); border: 1px solid var(--border);
  }
  .move-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .mv-word { font-size: 15px; font-weight: 800; }
  .mv-kind, .mv-res, .mv-reply, .mv-win {
    font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 999px;
    background: var(--bg3); color: var(--text2); white-space: nowrap;
  }
  .mv-kind.mk-한방 { background: var(--danger-bg); color: var(--danger-fg); }
  .mv-kind.mk-유도 { background: var(--warn-bg); color: var(--warn-fg); }
  .mv-kind.mk-루트 { background: var(--accent-soft); color: var(--accent); }
  .mv-res.mr-이김 { background: var(--ok-bg); color: var(--ok-fg); }
  .mv-res.mr-짐 { background: var(--danger-bg); color: var(--danger-fg); }
  .mv-win { background: var(--ok-bg); color: var(--ok-fg); }
  .mv-reply { margin-left: auto; }
  .result-explain {
    font-size: 12px; line-height: 1.5; color: var(--text2);
    padding: 7px 10px; border-radius: var(--radius-sm);
    background: var(--bg3);
  }
  .sub-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 11.5px; }
  .sub-lbl { font-weight: 800; color: var(--text3); white-space: nowrap; }
  .sub-lbl.esc-lbl { color: var(--blue); }
  .sub-lbl.atk-lbl { color: var(--red); }
  .rs-chip, .esc-chip, .atk-chip {
    padding: 2px 8px; border-radius: 999px;
    background: var(--bg3); border: 1px solid var(--border2);
    color: var(--text2); font-weight: 700;
  }
  .esc-chip { background: var(--accent-soft); border-color: var(--accent-line); color: var(--accent); }
  .esc-chip.esc-zero { background: var(--bg3); border-color: var(--border2); color: var(--text3); }
  .atk-chip { background: var(--danger-bg); border-color: var(--danger-line); color: var(--danger-fg); }

  .batch-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; color: var(--text2); }
  .bh-type {
    font-size: 12px; font-weight: 900; padding: 3px 11px; border-radius: 999px;
    background: var(--accent-soft); color: var(--accent);
  }
  .bh-count { font-weight: 800; color: var(--text); }
  .bh-vs { margin-left: auto; color: var(--text3); }
  .batch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(178px, 1fr)); gap: 10px; align-items: start; }
  .batch-card {
    display: flex; flex-direction: column; gap: 6px;
    padding: 12px; border-radius: var(--radius);
    background: var(--bg2); border: 1px solid var(--border);
  }
  .bc-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .bc-syl { font-size: 22px; font-weight: 900; line-height: 1.1; }
  .bc-win {
    font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 999px;
    background: var(--ok-bg); color: var(--ok-fg);
  }
  .bc-verdict { font-size: 12.5px; font-weight: 800; color: var(--text2); }
  .bc-score { font-size: 11.5px; color: var(--text3); }
  .bc-moves { display: flex; flex-direction: column; gap: 4px; margin-top: 2px; }
  .bc-move { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12px; }
  .bc-move .mv-word { font-size: 13px; }

  /* ═══════════════════════════════════════════
     RESPONSIVE
     Kept last so these overrides always win.
  ═══════════════════════════════════════════ */
  @media (max-width: 1180px) {
    .jobs-layout { grid-template-columns: 224px minmax(0, 1fr); }
    .job-side-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 980px) {
    .wait-room {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr);
      overflow: auto;
    }
    .wait-room-side { order: 2; max-height: none; overflow: visible; }
    .wait-room-main { order: 1; overflow: visible; }
    .jobs-layout { grid-template-columns: minmax(0, 1fr); }
    .jobs-list-panel { position: static; max-height: 240px; }
    .jobs-list { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    .job-pair-row { flex-direction: column; align-items: stretch; }
    .jp-vs { display: none; }
    .ability-info-row { grid-template-columns: minmax(0, 1fr); }
    .detail-grid { grid-template-columns: minmax(0, 1fr); }
    .job-info-gui { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 820px) {
    .topbar { flex-wrap: wrap; padding-top: 10px; padding-bottom: 10px; gap: 10px; }
    .top-auth { margin-left: auto; }
    .top-nav {
      order: 3;
      flex: 1 0 100%;
      margin: 0 -18px;
      padding: 0 18px 2px;
      -webkit-overflow-scrolling: touch;
    }
    .nav-sep { display: none; }
    .dm-panel { width: min(440px, 100%); }
  }
  @media (max-width: 720px) {
    .lobby-inner { padding: 18px 16px 22px; gap: 18px; }
    .lobby-heading h1 { font-size: 22px; }
    .lobby-create-btn { height: 42px; padding: 0 16px; }
    .room-grid { grid-template-columns: minmax(0, 1fr); }
    .wait-room { padding: 14px; gap: 12px; }
    .wait-player-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    .wizard-choice-grid, .wizard-choice-grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .content-page { padding: 16px 14px 20px; gap: 14px; }
    .simple-stage { padding: 12px 14px 10px; gap: 10px; }
    .job-screen { padding: 14px; gap: 14px; }
    .job-screen-header h2 { font-size: 20px; }
    .job-grid { grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; }
    .job-card { min-height: 88px; }
    .jc-portrait { width: 40px; height: 40px; }
    .jc-name { font-size: 11px; }
    .word-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
    .batch-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    .settings-section { padding: 18px; }
    .theme-options { max-width: none; }
    .dm-panel { width: 100vw; border-left: none; }
    .dm-panel-body { flex-direction: column; }
    .dm-inbox {
      width: auto; max-height: 148px; flex-shrink: 0;
      border-right: none; border-bottom: 1px solid var(--border);
    }
  }
  @media (max-width: 560px) {
    .topbar { padding-left: max(12px, env(safe-area-inset-left)); padding-right: max(12px, env(safe-area-inset-right)); }
    .top-nav { margin: 0 -12px; padding: 0 12px 2px; }
    .brand { font-size: 17px; }
    .nav-btn { height: 34px; padding: 0 11px; font-size: 13px; }
    .auth-chip { padding: 0 4px; }
    .auth-chip .auth-name { display: none; }
    .icon-btn { width: 34px; height: 34px; }
    .lobby-bar { align-items: stretch; }
    .lobby-create-btn { width: 100%; justify-content: center; }
    .simple-syl { font-size: clamp(36px, 13vw, 52px); }
    .simple-hero { padding: 14px 12px; }
    .simple-bar { gap: 8px; }
    .simple-actions { width: 100%; }
    .simple-actions .ctrl-btn { flex: 1; }
    .simple-word { max-width: 82%; font-size: 16px; }
    .wizard-choice-grid, .wizard-choice-grid-3 { grid-template-columns: minmax(0, 1fr); }
    .wizard-card { max-height: calc(100dvh - 32px); }
    .word-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    .tutorial-grid, .term-grid { grid-template-columns: minmax(0, 1fr); }
    .bottom-composer { padding: 10px 12px; padding-bottom: max(10px, env(safe-area-inset-bottom)); gap: 8px; }
    .bottom-composer { max-height: 42dvh; overflow-y: auto; overscroll-behavior: contain; }
    .input-zone { padding: 5px; gap: 8px; }
    .word-input { height: 46px; }
    .send-btn { width: 46px; height: 46px; }
    .ability-grid { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
    .ab-btn { flex: 0 0 auto; }
    .rank-row { padding: 9px 12px; gap: 10px; }
    .rank-tier-badge { white-space: nowrap; }
    .settings-title { font-size: 22px; }
    input, select, textarea { font-size: 16px; }
  }

  :global([data-theme="dark"]) .wait-room-side,
  :global([data-theme="dark"]) .wait-room-main { box-shadow: none; }
  :global([data-theme="dark"]) .wait-player-slot { background: var(--bg3); }
  :global([data-theme="dark"]) .auth-panel-input { background: var(--bg2); }
  :global([data-theme="dark"]) .job-tooltip { background: #0d0f14; border-color: var(--border2); }
  :global([data-theme="dark"]) .job-tooltip-text { color: #b8c4e0; }
</style>
