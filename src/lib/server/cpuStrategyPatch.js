import vm from 'node:vm';

export function installCpuStrategyPatch(context) {
  if (!context || context.__cpuStrategyPatchInstalled) return;
  context.__cpuStrategyPatchInstalled = true;

  const script = `
(function () {
  if (typeof cpuPickWord !== 'function' || cpuPickWord.__strongStrategy) return;
  var __origCpuPickWord = cpuPickWord;

  function __arrFromBucket(bucket) {
    if (!bucket) return [];
    if (Array.isArray(bucket)) return bucket;
    if (typeof bucket.forEach === 'function') {
      var out = [];
      bucket.forEach(function (v) { out.push(v); });
      return out;
    }
    return [];
  }

  function __bucketFor(start) {
    if (!start) return [];
    try {
      if (typeof WORDS_BY_START !== 'undefined') {
        if (WORDS_BY_START && typeof WORDS_BY_START.get === 'function') return __arrFromBucket(WORDS_BY_START.get(start));
        if (WORDS_BY_START && WORDS_BY_START[start]) return __arrFromBucket(WORDS_BY_START[start]);
      }
    } catch (e) {}
    try {
      if (typeof WORD_SET !== 'undefined') {
        var out = [];
        WORD_SET.forEach(function (w) { if (String(w || '')[0] === start) out.push(w); });
        return out;
      }
    } catch (e2) {}
    return [];
  }

  function __usedHas(game, word) {
    try {
      if (game && game.used && typeof game.used.has === 'function') return game.used.has(word);
      if (game && Array.isArray(game.used)) return game.used.indexOf(word) !== -1;
    } catch (e) {}
    return false;
  }

  function __lastChar(word) {
    word = String(word || '');
    return word ? word[word.length - 1] : '';
  }

  function __startSyllable(game) {
    try {
      if (game && game.lastLetter) return game.lastLetter.s2 || game.lastLetter.s1 || '';
      if (game && game.history && game.history.length) return __lastChar(game.history[game.history.length - 1]);
    } catch (e) {}
    return '';
  }

  function __replyCount(game, word) {
    var next = __lastChar(word);
    try {
      if (typeof cpuCountAvailFast === 'function') return Number(cpuCountAvailFast(next, game) || 0);
    } catch (e) {}
    try { return __bucketFor(next).length; } catch (e2) {}
    return 9999;
  }

  function __boolFn(name, word) {
    try {
      var fn = globalThis[name];
      return typeof fn === 'function' && !!fn(word);
    } catch (e) { return false; }
  }

  function __looksLegal(game, word, start) {
    if (!word || typeof word !== 'string') return false;
    if (start && word[0] !== start) return false;
    if (__usedHas(game, word)) return false;
    try {
      if (typeof isValidWordForGame === 'function') return !!isValidWordForGame(game, word);
    } catch (e) {}
    try {
      if (typeof isValidWord === 'function') return !!isValidWord(word);
    } catch (e2) {}
    return true;
  }

  function __score(game, word, fallback) {
    var score = 0;
    var rc = __replyCount(game, word);
    var len = String(word || '').length;
    if (__boolFn('isRoot', word)) score += 1400;
    if (__boolFn('isHanbang', word)) score += 900;
    if (__boolFn('isYudo', word)) score += 260;
    if (rc <= 0) score += 1800;
    else if (rc <= 2) score += 900;
    else if (rc <= 5) score += 520;
    else if (rc <= 10) score += 250;
    score -= Math.min(rc, 80) * 8;
    score += Math.min(len, 6) * 8;
    if (word === fallback) score += 40;
    return score;
  }

  function __pickBetter(game, fallback) {
    var start = __startSyllable(game);
    var candidates = __bucketFor(start);
    if (!candidates.length) return fallback;
    var best = fallback;
    var bestScore = fallback && __looksLegal(game, fallback, start) ? __score(game, fallback, fallback) : -999999;
    var checked = 0;
    for (var i = 0; i < candidates.length; i++) {
      var word = String(candidates[i] || '');
      if (!__looksLegal(game, word, start)) continue;
      checked++;
      var s = __score(game, word, fallback);
      if (s > bestScore) {
        best = word;
        bestScore = s;
      }
      if (checked > 1400) break;
    }
    return best || fallback;
  }

  cpuPickWord = function cpuPickWord() {
    var fallback = __origCpuPickWord.apply(this, arguments);
    try {
      var game = null;
      for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] && typeof arguments[i] === 'object' && (arguments[i].lastLetter || arguments[i].history || arguments[i].used)) {
          game = arguments[i];
          break;
        }
      }
      if (!game && typeof games === 'object') {
        for (var room in games) {
          if (games[room] && games[room].isPractice) { game = games[room]; break; }
        }
      }
      var fallbackWord = typeof fallback === 'string' ? fallback : (fallback && (fallback.word || fallback.text || fallback.name));
      var better = __pickBetter(game, fallbackWord);
      if (!better || better === fallbackWord) return fallback;
      if (typeof fallback === 'string') return better;
      if (fallback && typeof fallback === 'object') {
        if ('word' in fallback) fallback.word = better;
        else if ('text' in fallback) fallback.text = better;
        else if ('name' in fallback) fallback.name = better;
        return fallback;
      }
      return better;
    } catch (e) {
      return fallback;
    }
  };
  cpuPickWord.__strongStrategy = true;
})();`;

  try {
    vm.runInContext(script, context, { filename: 'cpuStrategyPatch.js' });
  } catch {}
}
