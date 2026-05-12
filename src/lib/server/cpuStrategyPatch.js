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
    var HARD = { candidateCap: 260, deepCap: 34, opponentBeam: 12, replyBeam: 8 };

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
      try { if (isHanbang(word)) score += 12000000; } catch (e) {}
      try { if (isYudo(word)) score += 2500000; } catch (e2) {}
      try { if (isRoot(word)) score += 1200000; } catch (e3) {}
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
        info.score -= deadly * 18000000;
        info.score -= attackReplies * 1200000;
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
  }
})();`;

  try {
    vm.runInContext(script, context, { filename: 'cpuStrategyPatch.js' });
  } catch {}
}
