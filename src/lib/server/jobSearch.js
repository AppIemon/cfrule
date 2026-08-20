import vm from 'node:vm';

/**
 * 직업 모드(채린룰·조합·카드·표한·검맞) 전용 수읽기.
 *
 * 왜 필요한가
 * ----------
 * 정본의 난이도 인지 탐색(`crossCpuPickWord`)은 `crossSolveApplicable()` 이
 * true 인 모드에서만 돈다. 그 함수는 카드·채린룰·표한·검맞에서 false 를 돌려주므로
 * 이 모드들은 수읽기를 아예 못 받고 무거운 채린룰 브레인으로 떨어진다.
 * 그래서 "카드·채린은 봇이 약하다"가 된다.
 *
 * 무엇을 하는가
 * ------------
 * charynn-arena 의 탐색 구조를 그대로 가져오되, **규칙은 정본 엔진 것을 쓴다**.
 * arena 는 규칙을 다시 포팅한 별도 엔진이라(직업 36종만 구현, 피보나치 밸런스가
 * 의도적으로 다름) 그 엔진째로 얹으면 봇이 실제 게임과 다른 규칙으로 읽게 된다.
 * 여기서는 알고리즘만 가져오고 합법성 판정은 엔진의 정본 함수를 호출한다.
 *
 *   · 후보 생성   cpuStartSyls(game, state) 로 이을 음절을 받고,
 *                 각 후보를 cpuPassesDebuffs(word, state, game, oppState) 로 거른다.
 *                 = 디버프·패시브·능력 제약이 전부 반영된다.
 *   · 수 정렬     상대 응수가 적은 순. 한방(0개)이 자동으로 맨 앞에 온다.
 *   · 탐색        반복 심화 + 노드 예산. 강제승 수순을 찾으면 즉시 채택.
 *   · 난이도      CROSS_CPU_LEVELS 의 maxLen/endDiff/atkDiff/atkMaxLen/routeDiff 를
 *                 그대로 존중한다. 약한 봇은 계산을 못 하는 게 아니라 모르는 것이다.
 *
 * 알려진 근사
 * ----------
 * 탐색 중에는 game.lastLetter 만 되돌려 가며 두어 본다. 디버프 잔여 턴은 깎지
 * 않으므로 탐색 지평선 안에서 지속 효과를 정적으로 본다. 수 정렬과 강제승 탐지에는
 * 충분하고, 직업 상태를 아예 안 보던 이전 구현보다는 엄격하게 정확하다.
 */
export function installJobSearch(context) {
  if (!context || context.__jobSearchInstalled) return;
  context.__jobSearchInstalled = true;

  const script = `
(function () {
  /* 정본은 전체가 with (Bot.scope) 안에서 돈다. 그래서 바깥에서 가로채려면
     전역이 아니라 Bot.scope 의 프로퍼티를 갈아끼워야 한다. 전역에 대입하면
     조용히 아무 일도 일어나지 않는다 — 이전 cpuStrategyPatch 가 그랬다. */
  var S = Bot.scope;
  if (typeof S.cpuPickWord !== 'function' || S.cpuPickWord.__jobSearch) return;
  var __origPick = S.cpuPickWord;

  /* ===== 유틸 ===== */

  function lvlOf(game) {
    try { return S.crossCpuLevel ? S.crossCpuLevel(game) : null; } catch (e) { return null; }
  }

  /* 이 게임이 "직업 모드"인가 = 정본 수읽기가 커버하지 않는 모드인가. */
  function isJobMode(game) {
    if (!game) return false;
    try { if (S.crossSolveApplicable && S.crossSolveApplicable(game)) return false; } catch (e) { return false; }
    return true;
  }

  function stateOf(game, player) {
    return (game && game.playerStates && game.playerStates[player]) || null;
  }

  function currentPlayer(game) {
    if (!game || !game.players || game.currentTurnIndex == null) return '';
    return game.players[game.currentTurnIndex] || '';
  }

  /* 2인 기준 상대. 팀전은 "다음 차례"를 상대로 본다. */
  function opponentOf(game, player) {
    var ps = (game && game.players) || [];
    for (var i = 0; i < ps.length; i++) if (ps[i] !== player) return ps[i];
    return '';
  }

  function wordsByStart(game) {
    try { return S.getCrossWordsByStart ? S.getCrossWordsByStart(game) : (S.WORDS_BY_START || {}); }
    catch (e) { return {}; }
  }

  function isUsed(game, word) {
    try {
      if (game.used && typeof game.used.has === 'function' && game.used.has(word)) return true;
      if (game.bannedWords && typeof game.bannedWords.has === 'function' && game.bannedWords.has(word)) return true;
    } catch (e) {}
    return false;
  }

  function boolFn(name, word) {
    try { var f = S[name]; return typeof f === 'function' && !!f(word); } catch (e) { return false; }
  }

  /* 값싼 정렬 키. 엔진이 음절별 잔여 단어 수를 캐시로 들고 있으므로 공짜로 읽힌다.
     직업 디버프는 안 보지만 정렬용으로는 충분하고, 정확한 개수는 상위 후보에만 낸다. */
  function cheapReplies(game, word) {
    var last = word.charAt(word.length - 1);
    try {
      var n = Number(S.cpuCountAvailFast(last, game) || 0);
      var du = S.applyDuEum ? S.applyDuEum(last) : last;
      if (du && du !== last) n += Number(S.cpuCountAvailFast(du, game) || 0);
      return n;
    } catch (e) { return 9999; }
  }

  /* arena 의 후보 축소: 이 게임에서 중요한 것은 "어떤 음절을 넘기는가"다.
     끝음절마다 대표 몇 개만 남기면 전 음절을 덮으면서 후보가 수백 개로 준다. */
  function reduceBySyllable(moves, per) {
    var byEnd = {}, out = [], i;
    for (i = 0; i < moves.length; i++) {
      var w = moves[i], e = w.charAt(w.length - 1);
      if (!byEnd[e]) byEnd[e] = 0;
      if (byEnd[e] >= per) continue;
      byEnd[e]++;
      out.push(w);
    }
    return out;
  }

  /* ===== 후보 생성 =====
     cpuStartSyls 는 감시자(제약 없음)면 null, 환각증/나이트 교환이면 문자열
     센티널을 준다. 센티널 국면은 규칙이 통째로 달라지므로 탐색을 포기하고
     엔진의 원래 선택에 맡긴다. */

  function startSyllables(game, state) {
    var syls;
    try { syls = S.cpuStartSyls(game, state); } catch (e) { return null; }
    if (syls === null) return null;              /* 아무 음절이나 = 후보 폭발, 탐색 포기 */
    if (typeof syls === 'string') return null;   /* HALLUCINATION / KNIGHT_EXCHANGE */
    if (!syls || !syls.length) return null;
    return syls;
  }

  function legalMoves(game, player, excl, cap) {
    var state = stateOf(game, player);
    if (!state) return null;
    var oppState = stateOf(game, opponentOf(game, player));
    var syls = startSyllables(game, state);
    if (!syls) return null;

    var index = wordsByStart(game);
    var out = [], seen = {}, i, k;
    for (k = 0; k < syls.length; k++) {
      var arr = index[syls[k]] || [];
      for (i = 0; i < arr.length; i++) {
        var w = arr[i];
        if (!w || seen[w]) continue;
        seen[w] = true;
        if (isUsed(game, w)) continue;
        if (excl && excl[w]) continue;
        try { if (!S.cpuPassesDebuffs(w, state, game, oppState, null)) continue; } catch (e) { continue; }
        out.push(w);
        if (out.length >= cap) return out;
      }
    }
    return out;
  }

  /* ===== make / unmake =====
     lastLetter 와 history 만 되돌린다. 지속 턴은 건드리지 않는다(위 주석의 근사). */

  function makeLetter(game, word) {
    var last = word.charAt(word.length - 1);
    var s1 = last, s2 = last;
    try {
      if (typeof S.applyDuEum === 'function') {
        var du = S.applyDuEum(last);
        if (du && du !== last) s2 = du;
      }
    } catch (e) {}
    return { s1: s1, s2: s2, split: false };
  }

  function push(game, word) {
    var undo = { letter: game.lastLetter, len: game.history ? game.history.length : 0 };
    game.lastLetter = makeLetter(game, word);
    if (game.history) game.history.push(word);
    return undo;
  }

  function pop(game, undo) {
    game.lastLetter = undo.letter;
    if (game.history) game.history.length = undo.len;
  }

  /* ===== 탐색 ===== */

  function newCtx(game, lvl) {
    var width = (lvl && lvl.width) || 7;
    return {
      game: game,
      nodes: 0,
      budget: (lvl && lvl.budget) || 900,
      width: width,
      cap: 220,                                  /* 응수 열거 상한 */
      exact: Math.max(8, width * 2),             /* 정확히 셀 상위 후보 수 */
      perSyllable: 2,
      aborted: false,
      deadline: Date.now() + ((lvl && lvl.timeMs) || 700)
    };
  }

  /* 상대에게 남는 응수 개수. 정렬 키이자 한방 판정. */
  function replyCount(ctx, word, player, excl) {
    var game = ctx.game, undo = push(game, word);
    var opp = opponentOf(game, player);
    var moves;
    try { moves = legalMoves(game, opp, excl, ctx.cap); } finally { pop(game, undo); }
    return moves === null ? -1 : moves.length;   /* -1 = 셀 수 없음(센티널 국면) */
  }

  /* 정렬은 두 단계다.
       1) 값싼 키로 전 후보를 줄 세운다 (엔진 캐시, 사실상 공짜)
       2) 상위 exact 개만 직업 인지 정확 카운트로 다시 잰다
     전수를 정확히 재면 후보 수천 개 × 사전 열거라 한 수에 수 초가 걸린다. */
  function order(ctx, moves, player, excl, exact) {
    var game = ctx.game, scored = [], i;
    for (i = 0; i < moves.length; i++) {
      scored.push({ w: moves[i], r: cheapReplies(game, moves[i]), approx: true });
    }
    scored.sort(function (a, b) {
      if (a.r !== b.r) return a.r - b.r;
      return b.w.length - a.w.length;
    });

    var n = Math.min(exact == null ? ctx.exact : exact, scored.length);
    for (i = 0; i < n; i++) {
      var w = scored[i].w;
      excl[w] = true;
      var r = replyCount(ctx, w, player, excl);
      excl[w] = false;
      if (r >= 0) { scored[i].r = r; scored[i].approx = false; }
    }
    scored.slice(0, n).sort(function (a, b) {
      if (a.r !== b.r) return a.r - b.r;
      return b.w.length - a.w.length;
    });
    return scored;
  }

  /* "지금 둘 차례인 player 가 이길 수 있는가" — win / lose / unknown */
  function solve(ctx, player, excl, depth) {
    if (ctx.nodes++ > ctx.budget || Date.now() > ctx.deadline) { ctx.aborted = true; return 'unknown'; }
    var moves = legalMoves(ctx.game, player, excl, ctx.cap);
    if (moves === null) return 'unknown';
    if (!moves.length) return 'lose';
    if (depth <= 0) return 'unknown';

    var scored = order(ctx, reduceBySyllable(moves, ctx.perSyllable), player, excl, ctx.width), i, unknown = false;
    var opp = opponentOf(ctx.game, player);
    for (i = 0; i < scored.length && i < ctx.width; i++) {
      var w = scored[i].w;
      excl[w] = true;
      var undo = push(ctx.game, w);
      var sub;
      try { sub = solve(ctx, opp, excl, depth - 1); } finally { pop(ctx.game, undo); }
      excl[w] = false;
      if (sub === 'lose') return 'win';
      if (sub === 'unknown') unknown = true;
      if (ctx.aborted) break;
    }
    return unknown ? 'unknown' : 'lose';
  }

  /* ===== 난이도 필터 =====
     약한 봇이 실제로 약하려면 "모르는 단어/음절"을 후보에서 빼야 한다.
     정본 crossCpuPickWord 와 같은 기준을 쓴다. */

  function knowledgeFilter(game, lvl, moves) {
    if (!lvl) return moves;
    var tbl = null;
    if (lvl.syl) { try { tbl = S.crossSylTable ? S.crossSylTable(game) : null; } catch (e) { tbl = null; } }
    var out = [], i;
    for (i = 0; i < moves.length; i++) {
      var w = moves[i];
      if (w.length > lvl.maxLen) continue;                    /* 모르는 긴 단어 */
      if (tbl && S.crossSylDiff && S.crossEndSyl) {
        var es, df;
        try { es = S.crossEndSyl(game, w); df = S.crossSylDiff(tbl, es); } catch (e) { df = 0; }
        if (df > lvl.endDiff) continue;                       /* 다룰 줄 모르는 음절 */
        var attacking = boolFn('isHanbang', w) || boolFn('isYudo', w);
        if (attacking) {
          if (lvl.atkDiff < 0) continue;                      /* 공격 개념이 없다 */
          if (df > lvl.atkDiff) continue;
          if (w.length > lvl.atkMaxLen) continue;
        }
      }
      out.push(w);
    }
    return out.length ? out : moves;   /* 전부 걸러졌으면 필터를 포기한다 */
  }

  /* ===== 진입점 ===== */

  function search(game) {
    var me = currentPlayer(game);
    if (!me) return null;
    var lvl = lvlOf(game);
    var ctx = newCtx(game, lvl);

    /* 루트에서는 후보를 넓게 본다. arena 가 지적한 대로 사전 id 순으로 잘라 내면
       즉시 승리 수를 통째로 놓친다 — 대신 끝음절 대표로 줄인다. */
    var all = legalMoves(game, me, null, 4000);
    if (all === null || !all.length) return null;

    var moves = reduceBySyllable(knowledgeFilter(game, lvl, all), 3);
    var excl = {};
    var scored = order(ctx, moves, me, excl);
    if (!scored.length) return null;

    /* 1) 즉시 승리 — 상대 응수 0. */
    if (scored[0].r === 0) {
      return { word: scored[0].w, plan: '한방', immediate: true, nodes: ctx.nodes };
    }

    /* 2) 강제 수순. 깊이는 난이도가 정한다. depth<2 면 탐색을 아예 안 한다. */
    var maxDepth = (lvl && lvl.depth) || 1;
    if (maxDepth >= 2) {
      var opp = opponentOf(game, me);
      for (var d = 2; d <= maxDepth; d += 2) {
        for (var i = 0; i < scored.length && i < ctx.width * 2; i++) {
          var w = scored[i].w;
          excl[w] = true;
          var undo = push(game, w);
          var sub;
          try { sub = solve(ctx, opp, excl, d - 1); } finally { pop(game, undo); }
          excl[w] = false;
          if (sub === 'lose') {
            return { word: w, plan: '강제승', depth: d, nodes: ctx.nodes };
          }
          if (ctx.aborted) break;
        }
        if (ctx.aborted) break;
      }
    }

    /* 3) 강제승이 없으면 상대를 가장 좁히는 수. 동점이면 살짝 흔들어
          같은 판이 반복되지 않게 한다. */
    var best = scored[0], tie = [];
    for (var j = 0; j < scored.length && scored[j].r === best.r; j++) tie.push(scored[j].w);
    var pick = tie.length > 1 ? tie[Math.floor(Math.random() * tie.length)] : best.w;
    return { word: pick, plan: '압박', replies: best.r, nodes: ctx.nodes };
  }

  S.cpuPickWord = function cpuPickWord(game) {
    /* 원본은 직업 모드에서 무거운 채린룰 브레인을 돌린다(정본 주석이 말하는 "턴이 안
       넘어감" 자리). 우리가 수를 찾으면 그건 쓸 일이 없으므로 **필요할 때만** 부른다.
       먼저 부르면 탐색이 아무리 빨라도 매 수마다 그 비용을 그대로 낸다. */
    var self = this, args = arguments, fallbackDone = false, fallbackValue = null;
    function fallback() {
      if (!fallbackDone) { fallbackDone = true; fallbackValue = __origPick.apply(self, args); }
      return fallbackValue;
    }
    try {
      var g = game;
      if (!g || !g.playerStates) {
        for (var i = 0; i < arguments.length; i++) {
          var a = arguments[i];
          if (a && typeof a === 'object' && a.playerStates && a.players) { g = a; break; }
        }
      }
      if (!g || !isJobMode(g)) return fallback();

      var found = search(g);
      if (!found || !found.word) return fallback();

      g.__cpuThink = '[' + found.plan + '] ' + found.word +
        (found.depth ? ' · ' + found.depth + '수 앞' : '') +
        (found.replies != null ? ' · 상대 응수 ' + found.replies + '개' : '') +
        ' · 노드 ' + found.nodes;

      return {
        word: found.word,
        score: found.immediate ? 1000000000 : 900000000,
        job_search: true,
        plan: found.plan,
        forced_win: found.plan === '강제승' || !!found.immediate,
        immediate_win: !!found.immediate,
        solve_depth: found.depth || 1
      };
    } catch (e) {
      return fallback();
    }
  };
  S.cpuPickWord.__jobSearch = true;
})();`;

  try {
    vm.runInContext(script, context, { filename: 'jobSearch.js' });
  } catch {}
}
