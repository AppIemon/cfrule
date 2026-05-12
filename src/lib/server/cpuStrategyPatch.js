import vm from 'node:vm';

export function installCpuStrategyPatch(context) {
  if (!context || context.__cpuStrategyPatchInstalled) return;
  context.__cpuStrategyPatchInstalled = true;

  const script = `
(function () {
  if (typeof Bot === 'undefined' || !Bot.scope) return;
  with (Bot.scope) {
    if (typeof cpuPickWord !== 'function' || cpuPickWord.__practiceHardMode) return;

    var __origCpuPickWord = cpuPickWord;
    var __origCpuTryAbility = typeof cpuTryAbility === 'function' ? cpuTryAbility : null;
    var HARD = { candidateCap: 900, deepCap: 72, opponentBeam: 14, replyBeam: 10 };

    function arr(value) {
      try { return Array.prototype.slice.call(value || []); } catch (e) { return []; }
    }

    function hasUsed(game, word, state) {
      try {
        return !!(game && game.used && game.used.has && game.used.has(word) && !(typeof cpuCanReuseUsedWord === 'function' && cpuCanReuseUsedWord(state, word)));
      } catch (e) { return false; }
    }

    function playerTeam(game, name) {
      try { return typeof getPlayerTeamIndex === 'function' ? getPlayerTeamIndex(game, name) : -1; } catch (e) { return -1; }
    }

    function opponentName(game, cpuName) {
      try {
        var myTeam = playerTeam(game, cpuName);
        for (var i = 0; i < game.players.length; i++) {
          var p = game.players[i];
          if (p === cpuName) continue;
          if (myTeam >= 0 && playerTeam(game, p) === myTeam) continue;
          return p;
        }
      } catch (e) {}
      return null;
    }

    function startSyllables(game, state) {
      try {
        var syls = typeof cpuStartSyls === 'function' ? cpuStartSyls(game, state) : null;
        if (syls && typeof syls !== 'string') return arr(syls);
      } catch (e) {}
      var out = [];
      try {
        if (game && game.lastLetter) {
          if (game.lastLetter.s2) out.push(game.lastLetter.s2);
          if (game.lastLetter.s1 && game.lastLetter.s1 !== game.lastLetter.s2) out.push(game.lastLetter.s1);
        }
      } catch (e2) {}
      return out;
    }

    function passWord(game, word, state, oppState) {
      try {
        if (!word || typeof word !== 'string') return false;
        if (hasUsed(game, word, state)) return false;
        if (game && game.bannedWords && game.bannedWords.has && game.bannedWords.has(word)) return false;
        if (typeof cpuPassesDebuffs === 'function' && !cpuPassesDebuffs(word, state, game, oppState)) return false;
        return true;
      } catch (e) { return false; }
    }

    function addCandidate(out, seen, game, state, oppState, word) {
      if (!word || seen[word] || out.length >= HARD.candidateCap) return;
      seen[word] = true;
      if (passWord(game, word, state, oppState)) out.push(word);
    }

    function classRank(word) {
      try {
        if (isHanbang(word)) return 0;
        if (isYudo(word)) return 1;
        if (isRoot(word)) return 2;
      } catch (e) {}
      return 3;
    }

    function replySyllables(word, state) {
      var out = [], seen = {};
      try {
        var last = word ? word[word.length - 1] : '';
        if (last) { seen[last] = true; out.push(last); }
        if (!state || !(state.no_du_eum_turns > 0)) {
          var due = typeof applyDuEum === 'function' ? applyDuEum(last) : last;
          if (due && !seen[due]) out.push(due);
        }
      } catch (e) {}
      return out;
    }

    function replyCount(word, game, state) {
      var syls = replySyllables(word, state);
      var total = 0;
      for (var i = 0; i < syls.length; i++) {
        try { total += Math.max(0, Number(cpuCountAvailFast(syls[i], game)) || 0); } catch (e) {}
      }
      return total;
    }

    function collect(game, name, cap) {
      var state = game && game.playerStates ? game.playerStates[name] : null;
      var opp = opponentName(game, name);
      var oppState = opp && game.playerStates ? game.playerStates[opp] : null;
      var out = [], seen = {};

      var syls = startSyllables(game, state);
      for (var pass = 0; pass < 4 && out.length < cap; pass++) {
        for (var si = 0; si < syls.length && out.length < cap; si++) {
          var bucket = [];
          try { bucket = WORDS_BY_START && WORDS_BY_START[syls[si]] ? WORDS_BY_START[syls[si]] : []; } catch (e2) {}
          for (var j = 0; bucket && j < bucket.length && out.length < cap; j++) {
            var w = bucket[j];
            var cr = classRank(w);
            if (pass === 0 && cr !== 0) continue;
            if (pass === 1 && cr !== 1) continue;
            if (pass === 2 && cr !== 2) continue;
            if (pass === 3 && cr !== 3) continue;
            addCandidate(out, seen, game, state, oppState, w);
          }
        }
      }

      try {
        var base = typeof cpuGetCandidates === 'function' ? cpuGetCandidates(game, name) : [];
        base = arr(base);
        base.sort(function (a, b) {
          var ca = classRank(a), cb = classRank(b);
          if (ca !== cb) return ca - cb;
          return replyCount(a, game, oppState) - replyCount(b, game, oppState);
        });
        for (var i = 0; i < base.length && out.length < cap; i++) addCandidate(out, seen, game, state, oppState, base[i]);
      } catch (e) {}

      return { words: out.slice(0, cap || HARD.candidateCap), state: state, opp: opp, oppState: oppState };
    }

    function sim(game, word) {
      try {
        if (typeof cpuMakeSimGame === 'function') return cpuMakeSimGame(game, word);
      } catch (e) {}
      try {
        var last = word ? word[word.length - 1] : '';
        var copy = {
          players: game.players,
          playerStates: game.playerStates,
          used: new Set(game.used || []),
          bannedWords: game.bannedWords,
          customWords: game.customWords,
          history: game.history ? game.history.slice() : [],
          lastLetter: { s1: typeof applyDuEum === 'function' ? applyDuEum(last) : last, s2: last },
          turnCount: game.turnCount || 1,
          currentTurnIndex: game.currentTurnIndex,
          phase: game.phase,
          isPractice: game.isPractice
        };
        if (word) { copy.used.add(word); copy.history.push(word); }
        return copy;
      } catch (e2) { return game; }
    }

    function tacticalScore(word, game, name, state, opp, oppState, hintWord) {
      var rc = replyCount(word, game, oppState);
      var score = 0;
      if (rc === 0) score += 2000000000;
      score += (260 - Math.min(rc, 260)) * 16000;
      try { if (isHanbang(word)) score += 180000000; } catch (e) {}
      try { if (isYudo(word)) score += 90000000; } catch (e2) {}
      try { if (isRoot(word)) score += 45000000; } catch (e3) {}
      try { if (typeof cpuRuntimeContextScoreWord === 'function') score += cpuRuntimeContextScoreWord(word, game, state, oppState || {}); } catch (e4) {}
      try { if (typeof cpuJobBonus === 'function') score += cpuJobBonus(word, game, state, oppState || {}); } catch (e5) {}
      try { if (typeof cpuSituationWordUrgency === 'function') score += cpuSituationWordUrgency(word); } catch (e6) {}
      if (word === hintWord) score += 250000;
      score += Math.min(String(word).length, 8) * 1200;
      return { word: word, score: score, replyCount: rc, immediateWin: rc === 0, forcedLoss: false, minMyReplies: 999999, bestOppReply: '' };
    }

    function analyze(base, game, name, state, opp, oppState) {
      var info = base;
      try {
        var afterMine = sim(game, base.word);
        var oppPack = collect(afterMine, opp, HARD.opponentBeam);
        var oppWords = oppPack.words || [];
        if (!oppWords.length) {
          info.immediateWin = true;
          info.score += 2000000000;
          info.minMyReplies = 999999;
          return info;
        }
        oppWords.sort(function (a, b) {
          var ar = replyCount(a, afterMine, state), br = replyCount(b, afterMine, state);
          var ac = classRank(a), bc = classRank(b);
          if (ac !== bc) return ac - bc;
          return ar - br;
        });
        var deadly = 0, attackReplies = 0;
        for (var i = 0; i < oppWords.length && i < HARD.opponentBeam; i++) {
          var ow = oppWords[i];
          try { if (isHanbang(ow) || isYudo(ow) || isRoot(ow)) attackReplies++; } catch (e) {}
          var afterOpp = sim(afterMine, ow);
          var mineAgain = collect(afterOpp, name, HARD.replyBeam).words || [];
          if (mineAgain.length < info.minMyReplies) {
            info.minMyReplies = mineAgain.length;
            info.bestOppReply = ow;
          }
          if (!mineAgain.length) deadly++;
        }
        info.forcedLoss = deadly > 0 || info.minMyReplies === 0;
        info.score -= deadly * 26000000;
        info.score -= attackReplies * 1800000;
        info.score += Math.min(info.minMyReplies, 80) * 42000;
        if (!info.forcedLoss) info.score += 5000000;
      } catch (e2) {
        info.score -= 10000000;
        info.error = String(e2 && e2.message ? e2.message : e2);
      }
      return info;
    }

    function compare(a, b) {
      if ((b.immediateWin ? 1 : 0) !== (a.immediateWin ? 1 : 0)) return (b.immediateWin ? 1 : 0) - (a.immediateWin ? 1 : 0);
      if ((a.forcedLoss ? 1 : 0) !== (b.forcedLoss ? 1 : 0)) return (a.forcedLoss ? 1 : 0) - (b.forcedLoss ? 1 : 0);
      if (b.score !== a.score) return b.score - a.score;
      if (a.replyCount !== b.replyCount) return a.replyCount - b.replyCount;
      if (b.minMyReplies !== a.minMyReplies) return b.minMyReplies - a.minMyReplies;
      return a.word < b.word ? -1 : (a.word > b.word ? 1 : 0);
    }

    cpuPickWord = function cpuPickWord(game, cpuName) {
      try {
        if (!game || !game.playerStates || !cpuName) return __origCpuPickWord ? __origCpuPickWord(game, cpuName) : null;
        var pack = collect(game, cpuName, HARD.candidateCap);
        if (!pack.words.length) return __origCpuPickWord ? __origCpuPickWord(game, cpuName) : null;

        var hint = null;
        try { hint = __origCpuPickWord ? __origCpuPickWord(game, cpuName) : null; } catch (e) { hint = null; }
        var hintWord = hint && hint.word ? hint.word : (typeof hint === 'string' ? hint : '');

        var coarse = [];
        for (var i = 0; i < pack.words.length; i++) coarse.push(tacticalScore(pack.words[i], game, cpuName, pack.state, pack.opp, pack.oppState, hintWord));
        coarse.sort(compare);

        var selected = coarse.slice(0, Math.min(HARD.deepCap, coarse.length));
        var selectedMap = {};
        for (var sm = 0; sm < selected.length; sm++) selectedMap[selected[sm].word] = true;
        for (var hi = 0; hi < coarse.length; hi++) {
          if (coarse[hi].word === hintWord && !selectedMap[hintWord]) {
            selected.push(coarse[hi]);
            selectedMap[hintWord] = true;
            break;
          }
        }

        var analyzed = [];
        for (var ai = 0; ai < selected.length; ai++) analyzed.push(analyze(selected[ai], game, cpuName, pack.state, pack.opp, pack.oppState));
        analyzed.sort(compare);
        var best = analyzed[0] || coarse[0];
        if (!best) return hint || null;

        try {
          game.lastCpuDecision = {
            mode: 'practice-hard-v4',
            cpu: cpuName,
            job: pack.state ? pack.state.job : '',
            opponent: pack.opp || '',
            candidate_count: pack.words.length,
            analyzed_count: analyzed.length,
            selected_word: best.word,
            selected_score: best.score,
            selected_immediate_win: !!best.immediateWin,
            selected_safe: !best.forcedLoss,
            selected_reply_count: best.replyCount,
            selected_min_my_replies: best.minMyReplies === 999999 ? null : best.minMyReplies,
            selected_best_opp_reply: best.bestOppReply || '',
            candidates: analyzed.slice(0, 10).map(function (x) {
              return { w: x.word, s: x.score, win: !!x.immediateWin, safe: !x.forcedLoss, rc: x.replyCount, mr: x.minMyReplies, bo: x.bestOppReply };
            })
          };
        } catch (e2) {}

        return { word: best.word, score: best.score, tactical: true };
      } catch (e3) {
        try { return __origCpuPickWord ? __origCpuPickWord(game, cpuName) : null; } catch (e4) { return null; }
      }
    };
    cpuPickWord.__practiceHardMode = true;

    function ready(state, field) {
      return !state || !state[field] || state[field] <= 0;
    }

    function left(state, field, max) {
      return state && (state[field] || 0) < max;
    }

    function canUse(state, name) {
      try {
        if (!state || state.lost_abilities || state.disabled_turns > 0 || state.absolutely_disabled > 0) return false;
        var destroyed = state.destroyed_active_abilities || [];
        return destroyed.indexOf(name) === -1;
      } catch (e) { return false; }
    }

    function currentWord(game) {
      try { return game && game.history && game.history.length ? game.history[game.history.length - 1] : ''; } catch (e) { return ''; }
    }

    function currentDanger(game, state) {
      try {
        var syls = startSyllables(game, state);
        if (!syls || !syls.length) return 0;
        var n = 0;
        for (var i = 0; i < syls.length; i++) n += Math.max(0, Number(cpuCountAvailFast(syls[i], game)) || 0);
        return n;
      } catch (e) { return 999; }
    }

    function findAggressiveWord(game, state, oppState, mode) {
      var syls = startSyllables(game, state);
      var best = '';
      var bestScore = -Infinity;
      function consider(w) {
        if (!passWord(game, w, state, oppState)) return;
        if (mode === 'hanbang' && !isHanbang(w)) return;
        if (mode === 'special' && !(isHanbang(w) || isYudo(w) || isRoot(w))) return;
        var score = tacticalScore(w, game, '', state, '', oppState, '').score;
        if (score > bestScore) { bestScore = score; best = w; }
      }
      for (var i = 0; i < syls.length; i++) {
        var bucket = WORDS_BY_START && WORDS_BY_START[syls[i]] ? WORDS_BY_START[syls[i]] : [];
        for (var j = 0; bucket && j < bucket.length; j++) consider(bucket[j]);
      }
      return best;
    }

    function aggressiveAbility(game, cpuName) {
      try {
        if (!game || !cpuName || !game.playerStates) return null;
        if (typeof isMapAbilityBlocked === 'function' && isMapAbilityBlocked(game)) return null;
        var state = game.playerStates[cpuName];
        if (!state || !canUse(state, '')) return null;
        var opp = opponentName(game, cpuName);
        var oppState = opp && game.playerStates ? game.playerStates[opp] : null;
        var turn = game.turnCount || 1;
        var last = currentWord(game);
        var danger = currentDanger(game, state);
        var underAttack = !!(last && (isHanbang(last) || isYudo(last) || isRoot(last)));
        var critical = danger <= 2 || underAttack;
        var attackWord = findAggressiveWord(game, state, oppState, 'special');
        var killWord = findAggressiveWord(game, state, oppState, 'hanbang');

        if (state.job === '해커') {
          if (canUse(state, '조작') && left(state, 'jojak_uses', 3) && ready(state, 'jojak_cooldown') && critical) return '조작';
          if (canUse(state, '초토화') && left(state, 'chotohwa_uses', 2) && ready(state, 'chotohwa_cooldown') && (critical || attackWord || turn >= 5)) return '초토화';
          if (canUse(state, '복제') && left(state, 'bokje_uses', 1) && (critical || turn >= 5)) return '복제';
        }
        if (state.job === '전우치' && canUse(state, '직격뢰') && left(state, 'lightning_uses', 3) && killWord) return '직격뢰 ' + killWord;
        if (state.job === '감시자' && canUse(state, '탐지') && left(state, 'detect_uses', 2) && ready(state, 'detect_cooldown') && (critical || attackWord)) return '탐지';
        if (state.job === '기자' && canUse(state, '거짓 보도') && left(state, 'report_uses', 4) && ready(state, 'report_cooldown') && (critical || turn >= 5)) return '거짓 보도';
        if (state.job === '고죠' && canUse(state, '무량공처') && (state.gongcheo_uses || 0) > 0 && ready(state, 'gongcheo_cooldown') && (critical || turn >= 5)) return '무량공처';
        if (state.job === '사신' && canUse(state, '사형 선고') && ready(state, 'death_cooldown') && (critical || (state.execution_count || 50) <= 18 || turn >= 4)) return '사형 선고';
        if (state.job === '악당' && canUse(state, '결계') && left(state, 'barrier_uses', 4) && ready(state, 'barrier_cooldown') && (critical || turn >= 4)) return '결계';
        if (state.job === '나이트') {
          if (canUse(state, '교환') && left(state, 'exchange_uses', 2) && !state.exchange_pending && !state.exchange_active && (critical || underAttack)) return '교환';
          if (canUse(state, '체크메이트') && left(state, 'checkmate_uses', 5) && ready(state, 'checkmate_cooldown') && turn >= 4) return '체크메이트';
        }
        if (state.job === '수리사' && canUse(state, '수리') && left(state, 'repair_uses', 3) && ready(state, 'repair_cooldown') && critical) return '수리';
        if (state.job === '검객') {
          if (canUse(state, '가르기') && left(state, 'slice_uses', 3) && ready(state, 'slice_cooldown') && last && typeof getSwordsmanSliceEdges === 'function' && getSwordsmanSliceEdges(last)) return '가르기';
          if (canUse(state, '찌르기') && left(state, 'stab_uses', 2) && ready(state, 'stab_cooldown') && (critical || turn >= 8)) return '찌르기';
        }
        if (state.job === '마법사' && canUse(state, '공허') && left(state, 'void_uses', 5) && ready(state, 'void_cooldown') && critical) return '공허';
        if (state.job === '스핔이') {
          if (canUse(state, '호박') && left(state, 'speaki_pumpkin_uses', 2) && ready(state, 'speaki_pumpkin_cooldown') && critical) return '호박';
          if (canUse(state, '물걸레질') && left(state, 'speaki_clean_uses', 3) && ready(state, 'speaki_clean_cooldown') && critical) return '물걸레질';
        }
        if (state.job === '해달') {
          if (canUse(state, '깨부수기') && left(state, 'otter_smash_uses', 1) && last && last.length % 2 === 1 && typeof getSwordsmanSliceEdges === 'function' && getSwordsmanSliceEdges(last)) return '깨부수기';
          if (canUse(state, '조개') && left(state, 'otter_clam_uses', 3) && ready(state, 'otter_clam_cooldown') && (critical || turn >= 4)) return '조개';
        }
        if (state.job === '시프터') {
          if (canUse(state, '빅 시프트') && left(state, 'big_shift_uses', 1) && critical) return '빅 시프트';
          if (canUse(state, '시프트') && left(state, 'shift_uses', 4) && critical) return '시프트';
        }
        if (state.job === '공룡' && canUse(state, '삼키기') && left(state, 'swallow_uses', 3) && ready(state, 'swallow_cooldown') && critical && game.history && game.history.length >= 2) return '삼키기';
        if (state.job === '사과' && canUse(state, '사구아') && left(state, 'sagua_uses', 1) && (critical || turn >= 7)) return '사구아';
        if (state.job === '마하트마간디' && canUse(state, '억제') && (state.gandhi_stacks || 0) >= 1 && ready(state, 'suppress_cooldown')) return '억제';
      } catch (e) {}
      return null;
    }

    if (__origCpuTryAbility) {
      cpuTryAbility = function cpuTryAbility(game, cpuName) {
        var picked = null;
        try { picked = __origCpuTryAbility(game, cpuName); } catch (e) { picked = null; }
        if (picked) return picked;
        picked = aggressiveAbility(game, cpuName);
        try {
          if (picked && game) game.lastCpuAbilityDecision = { mode: 'practice-hard-v4', cpu: cpuName, ability: picked };
        } catch (e2) {}
        return picked;
      };
      cpuTryAbility.__practiceHardMode = true;
    }
  }
})();`;

  try {
    vm.runInContext(script, context, { filename: 'cpuStrategyPatch.js' });
  } catch {}
}
