import { getBotEngine } from '../src/lib/server/botEngine.js';

const bot = await getBotEngine();
const scope = bot.context.__Bot?.scope || {};
console.log('boot ok', {
  urimalsam: scope.URIMALSAM_WORD_SET?.size || 0,
  roble: scope.ROBLE_WORD_SET?.size || 0,
  jime: scope.JIME_WORD_SET?.size || 0,
  kkutu: scope.KKUTU_WORD_SET?.size || 0
});
