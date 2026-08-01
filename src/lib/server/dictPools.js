function setToArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    if (typeof value[Symbol.iterator] === 'function') return Array.from(value);
  } catch {}
  return [];
}

const DICT_KEYS = {
  urimalsam: {
    byStart: 'URIMALSAM_WORDS_BY_START',
    wordSet: 'URIMALSAM_WORD_SET',
    wordList: 'URIMALSAM_WORD_LIST',
    killsyl: 'URIMALSAM_KILLSYL_SET',
    intendsyl: 'URIMALSAM_INTENDSYL_SET',
    routesyl: 'URIMALSAM_ROUTESYL_SET'
  },
  roble: {
    byStart: 'ROBLE_WORDS_BY_START',
    wordSet: 'ROBLE_WORD_SET',
    wordList: 'ROBLE_WORD_LIST',
    killsyl: 'ROBLE_KILLSYL_SET',
    intendsyl: 'ROBLE_INTENDSYL_SET',
    routesyl: 'ROBLE_ROUTESYL_SET'
  },
  jime: {
    byStart: 'JIME_WORDS_BY_START',
    wordSet: 'JIME_WORD_SET',
    wordList: 'JIME_WORD_LIST',
    killsyl: 'JIME_KILLSYL_SET',
    intendsyl: 'JIME_INTENDSYL_SET',
    routesyl: 'JIME_ROUTESYL_SET'
  },
  kkutu: {
    byStart: 'KKUTU_WORDS_BY_START',
    wordSet: 'KKUTU_WORD_SET',
    wordList: 'KKUTU_WORD_LIST',
    killsyl: 'KKUTU_KILLSYL_SET',
    intendsyl: 'KKUTU_INTENDSYL_SET',
    routesyl: 'KKUTU_ROUTESYL_SET'
  }
};

function scopeOf(context) {
  return context?.__Bot?.scope || context || {};
}

export function getWordPool(context, start = '', dict = 'default') {
  const scope = scopeOf(context);
  const dictKey = String(dict || 'default').toLowerCase();
  if (dictKey === 'default') {
    const byStart = scope.WORDS_BY_START;
    if (start && byStart) {
      if (typeof byStart.get === 'function') return setToArray(byStart.get(start));
      if (byStart[start]) return setToArray(byStart[start]);
    }
    return setToArray(scope.WORD_SET);
  }

  const keys = DICT_KEYS[dictKey];
  if (!keys) return [];
  const byStart = scope[keys.byStart];
  if (start && byStart) {
    if (typeof byStart.get === 'function') return setToArray(byStart.get(start));
    if (byStart[start]) return setToArray(byStart[start]);
  }
  return setToArray(scope[keys.wordList] || scope[keys.wordSet]);
}

export function getDictSearchScope(context, dict = 'default') {
  const scope = scopeOf(context);
  const dictKey = String(dict || 'default').toLowerCase();
  if (dictKey === 'default') return null;

  const keys = DICT_KEYS[dictKey];
  if (!keys) return null;
  const byStart = scope[keys.byStart];
  const wordsByStart = {};
  if (byStart) {
    if (typeof byStart.entries === 'function') {
      for (const [key, value] of byStart.entries()) wordsByStart[key] = setToArray(value);
    } else {
      for (const [key, value] of Object.entries(byStart)) wordsByStart[key] = setToArray(value);
    }
  } else {
    for (const word of getWordPool(context, '', dictKey)) {
      const first = String(word || '')[0];
      if (!first) continue;
      if (!wordsByStart[first]) wordsByStart[first] = [];
      wordsByStart[first].push(word);
    }
  }
  return {
    WORDS_BY_START: wordsByStart,
    KILLSYL_SET: scope[keys.killsyl] || new Set(),
    INTENDSYL_SET: scope[keys.intendsyl] || new Set(),
    ROUTESYL_SET: scope[keys.routesyl] || new Set()
  };
}
