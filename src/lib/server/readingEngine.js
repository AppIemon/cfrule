import path from 'node:path';
import { bundledDataDir, readJsonFile } from './runtime.js';

let dataCache;

// 1ㄱㅅ 검색 명령어의 A 클래스 음절 (한방음절 K와 다름)
const SEARCH_A_CLASS_SET = new Set('갓갸걱것겔굿궈귿긔께꼰꼽꾀꿰끌낚낟낫냅냐냠냥넥넬녁녈녑놋뇽뉘뉵늪닌님닙닝댱덜덴뎍뎐뎨돛됨됴듀듁딕딥딱땀뚜뚱뜨뜽랄랏랒랓램랫렉렙렷롄롯룬룰뤼를릊릎릭릿맴멘멜멧몫몬뮤믈뱀벅뵈빨뻘뽀섹셀셉션셩셰솝솥숯슐싁쌈썩쎄쏠쐬쑹쒜씰앗얌얘엠엥옌옴옻왁왓웰윷잭잼쟘쟝젤젹젼죡쥔즘짚쩡쭈찐찔찜쵸춤칡캡컨컷켐콕콘쿤퀴퀸킬킷킹탱텁톰툴튜팀팜팡팩팬펄펙펠폰햄헨헬혀혹홈홉홰훠훤');

const JOB_TOOLS = {
  해커: { attack: ['조작', '초토화'], defense: ['복제'], force: ['초토화'] },
  투자자: { attack: ['주가 조작'], defense: [], force: [] },
  환자: { attack: ['환각증'], defense: ['환각증'], force: ['환각증'] },
  수집가: { attack: ['제작'], defense: ['제작'], force: ['제작'] },
  감시자: { attack: ['탐지'], defense: ['탐지'], force: [] },
  뜀틀선수: { attack: ['뜀틀'], defense: ['뜀틀'], force: ['뜀틀'] },
  전우치: { attack: ['직격뢰'], defense: ['잔상'], force: ['직격뢰'] },
  기관사: { attack: ['폭주기관차'], defense: [], force: ['운행'] },
  늑대인간: { attack: ['포효'], defense: [], force: ['포효'] },
  시프터: { attack: ['시프트', '빅 시프트'], defense: ['시프트', '빅 시프트'], force: ['시프트', '빅 시프트'] },
  비밀요원: { attack: ['포획'], defense: ['포획'], force: ['포획'] },
  '67': { attack: ['67'], defense: [], force: ['67'] },
  사과: { attack: ['삭와', '사구아'], defense: [], force: ['사과 디버프'] },
  시인: { attack: ['2음절', '시적 허용'], defense: ['시적 허용'], force: ['2음절'] },
  공룡: { attack: ['삼키기', '브레스'], defense: ['삼키기'], force: ['브레스'] },
  마법사: { attack: ['공허'], defense: ['공허'], force: ['공허'] },
  사신: { attack: ['사형 선고'], defense: ['영혼'], force: ['사형 선고'] },
  피보나치: { attack: ['피보나치 수열', '뤼카 수열'], defense: [], force: ['피보나치 수열'] },
  '?': { attack: ['물음표', '쉼표', '마침표'], defense: ['물음표', '쉼표'], force: ['쉼표'] },
  수학자: { attack: ['A', 'B', 'C'], defense: ['A', 'B', 'C'], force: ['논문 발표'] },
  과학자: { attack: ['실험', 'DNA파괴'], defense: [], force: ['실험'] },
  갈릴레오: { attack: ['관측', '관성의 법칙'], defense: [], force: ['관측'] },
  작곡가: { attack: ['작곡', '쪼개기', '쉼표'], defense: ['쉼표'], force: ['작곡'] },
  스폰지밥: { attack: ['게살버거', '감자튀김', '강도 채용'], defense: ['게살버거', '감자튀김'], force: ['게살버거', '감자튀김'] },
  나이트: { attack: ['체크메이트', '교환'], defense: ['교환'], force: ['체크메이트'] },
  생존자: { attack: ['신호', '긴급 구조'], defense: ['긴급 구조'], force: ['신호'] },
  악당: { attack: ['결계', '왜곡'], defense: ['결계'], force: ['결계'] },
  기자: { attack: ['거짓 보도'], defense: ['거짓 보도'], force: ['거짓 보도'] },
  검객: { attack: ['찌르기', '가르기'], defense: ['가르기'], force: ['찌르기', '가르기'] },
  마하트마간디: { attack: ['비폭력', '억제'], defense: ['억제'], force: ['비폭력'] },
  은하계전사: { attack: ['별인 듯 달 아닌 별'], defense: [], force: ['끝루트'] },
  혜성전사: { attack: ['핼리 혜성'], defense: [], force: ['결계'] },
  수리사: { attack: ['방탄', '수리'], defense: ['수리'], force: ['방탄'] },
  우라늄: { attack: ['방사선', '핵분열'], defense: ['핵분열'], force: ['방사선'] },
  고죠: { attack: ['무하한', '무량공처'], defense: ['무량공처'], force: ['무량공처'] },
  스핔이: { attack: ['물걸레질', '호박'], defense: ['물걸레질', '호박'], force: ['호박'] },
  해달: { attack: ['조개', '깨부수기'], defense: ['조개', '깨부수기'], force: ['조개'] },
  프로그래머: { attack: ['Shift', 'Caps Lock', 'Backspace', 'Tab'], defense: ['Shift', 'Caps Lock', 'Backspace', 'Tab'], force: ['Shift', 'Caps Lock'] }
};

function uniq(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function buildData() {
  const words = readJsonFile(path.join(bundledDataDir, 'wordlist.json'), []);
  const diesyl = readJsonFile(path.join(bundledDataDir, 'diesyl.json'), {});
  const wordList = Array.isArray(words) ? Array.from(new Set(words.map(String).filter(Boolean))) : [];
  const wordsByStart = {};
  for (const word of wordList) {
    const first = word[0];
    if (!wordsByStart[first]) wordsByStart[first] = [];
    wordsByStart[first].push(word);
  }
  for (const list of Object.values(wordsByStart)) {
    list.sort((a, b) => b.length - a.length || a.localeCompare(b, 'ko'));
  }
  return {
    WORDS_BY_START: wordsByStart,
    ROUTESYL_SET: new Set(diesyl.Routesyl || []),
    INTENDSYL_SET: new Set(diesyl.Intendsyl || []),
    KILLSYL_SET: new Set(diesyl.Killsyl || [])
  };
}

function getReadingData() {
  if (!dataCache) dataCache = buildData();
  return dataCache;
}

const WIN_IN_STRINGS = {
  1:  "가간갈강개갤거건게겨고곡곤골곰곳과관괴구귀그근귿글긔기길까꺼꼬꼼꽃끄끌나날남낱내네넬녀녈노논뇨누눈뉴니닉닌닐님닙닛다닥단달닭당대댱더던덜덩데덴도독돈돌동되두둘뒤듀듁드든들디딥땅때땡떼뜰라란랄람래램랴략러레려렬롄로론롤료루룬룰류리린릴립링마막말매머멀메멘멧모목몰몸무묵문물미민바반발밭배버베벨벼보볼부북불뷰브블비뼈뿌사산살삼삿새색샛생샤서설섬섯성세셀셰소속손솔쇠수술숨슈스슬시실심쌍쒜쓰씨아악안알암앞애앵야약어언얼엉에엘엠여열옌오옥온옷옹완왓외요우울웃원위윈윗유이인일입자잠장재잭저적정젖제젹젼조존좀주중쥬즈즘지진집짓쪽쭈찌차찰참채책천첼초추취층치친카칼캐커컨컷케코콕콜콤콩퀴크큰클키타탈태터털테텔토톰투툴튜트티팀파팔팜패팬퍼페펜포폴표푸풀풋풍프플피필하한할함해핵허헌헝헤헨헬혈호혼홀홉화황후흐히",
  3:  "각감갓객갸걱걸검격겹경곁계광교국군굴굼굿금급김깔깜깨께꼴꼽꽁꾀꾸꿀꿰끈끝끼낙낚난납낫냅냉너넉넝녁년념녑녕놀놋농느늘능늪늬담답덤덧뎍돛됴둥등딜따딱딴딸땜떡똥뚝뜨뜸락랍랏랩랭량렉력련렴렵령례록롯롱률르를릉릎릭림릿만맏망맥맨먹멍멜몽뭇믈믿밀밋박밥밧방백뱃벅번벌범법벤별볏병복본봉뵈분빈빌빗빛빨삯삽상샘석선섹셉셋셩솜솝순숫숯쉐쉬승신싱싸쌈쌔쏠앙액얌양얘억엄엥역연염엽영예올옻왁왈왕왜운워월율윷은음응의익임잇작잔잡쟁전절점접젠젤졸종줄쥐질짐징쪼쯔찔찬창처철청체촌총쵸출춤충칠칸캡쿠쿤퀸큐킬킹탁탄탐탑탕턱텁톨통퇴튀판팡팥팽펄펙펠펭편평폐폭폰푼품합항행향혀협형활홰회횡훈훼흙흥힘",
  5:  "갑갱것겉겔곱공궈극긍긴껍낟냐냥넌넥녹뇽눌뉵댕덕뎨딕뚜뜻띠랜렌렙룡뤼륙면명몬밤밴벋봄붓빙빚뻘센셈솥쇼숙싹쌀압엇와용웜웨웰육잣쟝젓죡쥔증짚짜착첨최측칡침켄콘콧킷특팩펀햄헐혜홈환훠휘휴흑흠힐",
  7:  "곧낮닝닻뎐랑랒뱀빵뻬썩쎄씰앗움으잉족죄짝짬쩡찐찜칙탱텅틀픽",
  9:  "널늦돗릊먼벵뿔션쇄숭쑹옴퉁학혹",
  11: "뜽뮤쐬펑핀",
  13: "셔슐켐"
};

const WIN_TURN_MAP = (() => {
  const map = {};
  for (const [turn, str] of Object.entries(WIN_IN_STRINGS)) {
    for (const ch of str) map[ch] = Number(turn);
  }
  return map;
})();

const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNGSEONG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONGSEONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

function decompose(char) {
  const code = String(char || '').charCodeAt(0) - 0xac00;
  if (Number.isNaN(code) || code < 0 || code > 11172) return null;
  const ci = Math.floor(code / 588);
  const ji = Math.floor((code % 588) / 28);
  const gi = code % 28;
  return { ci, ji, gi, chosung: CHOSEONG[ci], jungsung: JUNGSEONG[ji], jongsung: JONGSEONG[gi] };
}

function compose(ci, ji, gi) {
  return String.fromCharCode(0xac00 + ci * 588 + ji * 28 + gi);
}

function kindOf(scope, word) {
  const last = word?.[word.length - 1] || '';
  if (scope.KILLSYL_SET?.has(last)) return '한방';
  if (scope.INTENDSYL_SET?.has(last)) return '유도';
  if (scope.ROUTESYL_SET?.has(last)) return '루트';
  return '일반';
}

function hasBatchim(scope, word) {
  const d = decompose(word?.[word.length - 1] || '');
  return !!(d && d.gi > 0);
}

function dueum(scope, syl) {
  const map = {
    라: '나', 래: '내', 로: '노', 루: '누', 르: '느', 뢰: '뇌',
    랴: '야', 럐: '얘', 료: '요', 류: '유', 리: '이', 례: '예',
    녀: '여', 뇨: '요', 뉴: '유', 니: '이'
  };
  return map[syl] || syl;
}

function shifted(scope, syl, amount) {
  const d = decompose(syl);
  if (!d) return '';
  const next = d.ji + amount;
  if (next < 0 || next >= JUNGSEONG.length) return '';
  return compose(d.ci, next, d.gi);
}

function removeJong(scope, syl) {
  const d = decompose(syl);
  if (!d) return '';
  return compose(d.ci, d.ji, 0);
}

function replySyllables(scope, word, defenderJob) {
  const last = word?.[word.length - 1] || '';
  const base = [last];
  if (defenderJob !== '기자') base.push(dueum(scope, last));
  return uniq(base);
}

function transformedSyllables(scope, syl, job) {
  const out = [];
  const tools = JOB_TOOLS[job]?.force || [];
  if (tools.includes('시프트') || tools.includes('Shift')) out.push({ syllable: shifted(scope, syl, 1), via: tools.includes('Shift') ? 'Shift' : '시프트' });
  if (tools.includes('빅 시프트') || tools.includes('Caps Lock') || tools.includes('쉼표')) {
    const via = tools.includes('Caps Lock') ? 'Caps Lock' : tools.includes('쉼표') ? '쉼표' : '빅 시프트';
    out.push({ syllable: shifted(scope, syl, 2), via });
  }
  if (tools.includes('공허') || tools.includes('수리')) out.push({ syllable: removeJong(scope, syl), via: tools.includes('공허') ? '공허' : '수리' });
  return out.filter((item) => item.syllable && item.syllable !== syl);
}

function listFor(scope, syl, used) {
  return (scope.WORDS_BY_START?.[syl] || []).filter((word) => !used.has(word));
}

// 두음법칙 포함: 공격자가 이 음절을 받으면 두음법칙 변환 음절 단어도 사용 가능
function listForDueum(scope, syl, used, job) {
  const base = listFor(scope, syl, used);
  if (job === '기자') return base;
  const d = dueum(scope, syl);
  if (d === syl) return base;
  return uniq([...base, ...listFor(scope, d, used)]);
}

function syllableProfile(scope, syl, used) {
  const list = listFor(scope, syl, used);
  const profile = {
    syllable: syl,
    total: list.length,
    kill: 0, yudo: 0, root: 0, normal: 0,
    short: 0, noBatchim: 0, examples: []
  };
  for (const word of list) {
    const kind = kindOf(scope, word);
    if (kind === '한방') profile.kill++;
    else if (kind === '유도') profile.yudo++;
    else if (kind === '루트') profile.root++;
    else profile.normal++;
    if (word.length <= 2) profile.short++;
    if (!hasBatchim(scope, word)) profile.noBatchim++;
    if (profile.examples.length < 10) profile.examples.push(word);
  }
  return profile;
}

// 두음법칙 포함 프로필: 공격자 관점에서 받은 음절에 대한 전체 단어 수
function syllableProfileDueum(scope, syl, used, job) {
  const list = listForDueum(scope, syl, used, job);
  const d = (job !== '기자') ? dueum(scope, syl) : syl;
  const dueumExtra = (d !== syl) ? listFor(scope, d, used).length : 0;
  const profile = {
    syllable: syl,
    dueumSyllable: d !== syl ? d : null,
    dueumExtra,
    total: list.length,
    kill: 0, yudo: 0, root: 0, normal: 0,
    short: 0, noBatchim: 0, examples: []
  };
  for (const word of list) {
    const kind = kindOf(scope, word);
    if (kind === '한방') profile.kill++;
    else if (kind === '유도') profile.yudo++;
    else if (kind === '루트') profile.root++;
    else profile.normal++;
    if (word.length <= 2) profile.short++;
    if (!hasBatchim(scope, word)) profile.noBatchim++;
    if (profile.examples.length < 10) profile.examples.push(word);
  }
  return profile;
}

function bestReplyPressure(scope, syllables, used, replyJob, originalAttackerJob) {
  const replies = [];
  for (const syl of syllables) {
    for (const word of listFor(scope, syl, used).slice(0, 180)) {
      const back = replySyllables(scope, word, originalAttackerJob);
      const backCount = back.reduce((sum, item) => sum + listFor(scope, item, new Set([...used, word])).length, 0);
      const kind = kindOf(scope, word);
      let pressure = 0;
      if (kind === '한방') pressure += 500;
      if (kind === '유도') pressure += 180;
      if (kind === '루트') pressure += 110;
      if (backCount === 0) pressure += 900;
      else if (backCount <= 2) pressure += 300;
      pressure -= Math.min(backCount, 80) * 2;
      replies.push({ word, kind, backSyllables: back, backCount, pressure, job: replyJob });
    }
  }
  replies.sort((a, b) => b.pressure - a.pressure || a.backCount - b.backCount || b.word.length - a.word.length);
  return replies.slice(0, 10);
}

function defenseCapacity(job, profile, enemyPressure) {
  const tools = JOB_TOOLS[job]?.defense || [];
  let capacity = 0;
  const notes = [];
  if (!tools.length) return { capacity, notes };
  capacity += tools.length * 80;
  notes.push(`${job} 방어: ${tools.slice(0, 4).join(', ')}`);
  if (profile.total <= 3) capacity += 120;
  if (enemyPressure.some((item) => item.kind === '한방')) capacity -= 80;
  if (tools.some((item) => /시프트|공허|수리|가르기|교환|긴급|물음표|Shift|Caps|Backspace/.test(item))) capacity += 160;
  return { capacity, notes };
}

function attackCapacity(job, word, kind, replyProfiles) {
  const tools = JOB_TOOLS[job]?.attack || [];
  const notes = [];
  let power = 0;
  if (tools.length) {
    power += tools.length * 55;
    notes.push(`${job} 가압: ${tools.slice(0, 4).join(', ')}`);
  }
  if (kind === '한방') power += 420;
  if (kind === '유도') power += 210;
  if (kind === '루트') power += 140;
  if (replyProfiles.some((p) => p.total === 0)) power += 1000;
  if (replyProfiles.some((p) => p.total <= 2)) power += 300;
  if (word.length >= 5) power += 40;
  return { power, notes };
}

// Estimate how many attacker turns until forced win (1 = this word wins, 2 = win next attacker turn, etc.)
function estimateWinIn(scope, word, attackerJob, defenderJob, replySyls, naturalReplyCount, usedAfter) {
  if (naturalReplyCount === 0) return 1;
  if (naturalReplyCount > 6) return null;

  // Check 2-turn win: for each possible defender reply, does attacker have a winning reply?
  const defWords = replySyls.flatMap(s => listFor(scope, s, usedAfter)).slice(0, 8);
  if (defWords.length === 0) return 1;

  let allBranchesWin = true;
  for (const defWord of defWords) {
    const ourSyls = replySyllables(scope, defWord, attackerJob);
    let foundWin = false;
    for (const ourSyl of ourSyls) {
      const usedD = new Set([...usedAfter, defWord]);
      for (const ourWord of listFor(scope, ourSyl, usedD).slice(0, 20)) {
        const theirSyls = replySyllables(scope, ourWord, defenderJob);
        const theirCount = theirSyls.reduce((s, sy) => s + listFor(scope, sy, new Set([...usedD, ourWord])).length, 0);
        if (theirCount === 0) { foundWin = true; break; }
      }
      if (foundWin) break;
    }
    if (!foundWin) { allBranchesWin = false; break; }
  }

  if (allBranchesWin) return 2;

  // Rough 3-turn estimate for 유도 chains
  const last = word[word.length - 1];
  if (scope.INTENDSYL_SET?.has(last) && naturalReplyCount <= 4) return 3;

  return null;
}

function classifyMove(scope, word, attackerJob, defenderJob, used) {
  const usedAfter = new Set([...used, word]);
  const kind = kindOf(scope, word);
  const replySyls = replySyllables(scope, word, defenderJob);
  const replyProfiles = replySyls.map((syl) => syllableProfile(scope, syl, usedAfter));
  const naturalReplyCount = replyProfiles.reduce((sum, item) => sum + item.total, 0);
  const transformed = replySyls.flatMap((syl) => transformedSyllables(scope, syl, defenderJob));
  const transformedProfiles = transformed.map((item) => ({ ...item, profile: syllableProfile(scope, item.syllable, usedAfter) }));
  const counterplay = bestReplyPressure(scope, replySyls, usedAfter, defenderJob, attackerJob);
  const defense = defenseCapacity(defenderJob, { total: naturalReplyCount }, counterplay);
  const attack = attackCapacity(attackerJob, word, kind, replyProfiles);

  const immediateWin = naturalReplyCount === 0;
  const scarce = naturalReplyCount > 0 && naturalReplyCount <= 3;
  const enemyHasKiller = counterplay.some((item) => item.kind === '한방' || item.backCount <= 1);
  const canEscapeByAbility = transformedProfiles.some((item) => item.profile.total > naturalReplyCount || item.profile.kill > 0 || item.profile.yudo > 0);

  let score = attack.power - defense.capacity - Math.min(naturalReplyCount, 120) * 4;
  if (enemyHasKiller) score -= 380;
  if (canEscapeByAbility) score -= 120;
  if (scarce && defense.capacity > 0) score += 170;

  let result = '모름';
  if (immediateWin && defense.capacity < 120) result = '이김';
  else if (immediateWin) result = '능력 소모 유도';
  else if (scarce && !enemyHasKiller) result = defense.capacity ? '능력 소모 유도' : '이김';
  else if (enemyHasKiller && !defense.capacity) result = '짐';
  else if (enemyHasKiller) result = '능력이 소모됨';
  else if (score >= 260) result = '능력 소모 유도';

  // 결과 원인 설명: 어떤 능력/조건 때문에 이 결과인지
  const atkTools = JOB_TOOLS[attackerJob]?.attack || [];
  const defTools = JOB_TOOLS[defenderJob]?.defense || [];
  const top = counterplay[0];
  let resultExplain = '';
  if (result === '이김') {
    if (immediateWin) resultExplain = '응수 없음 → 즉시 승리';
    else resultExplain = `응수 희소(${naturalReplyCount}개), ${defenderJob} 방어능력 없음`;
  } else if (result === '능력 소모 유도') {
    if (immediateWin) {
      resultExplain = `응수 없음 → ${defenderJob} 방어능력(${defTools.slice(0, 3).join('/')}) 소모 강제`;
    } else if (scarce) {
      resultExplain = `응수 희소(${naturalReplyCount}개) + ${defenderJob} 방어능력(${defTools.slice(0, 2).join('/')}) 소모`;
    } else {
      resultExplain = atkTools.length
        ? `${attackerJob} 공격능력(${atkTools.slice(0, 2).join('/')}) 가압으로 고점수`
        : '고점수';
    }
  } else if (result === '짐') {
    resultExplain = top
      ? `상대 킬러 응수: ${top.word}(${top.kind}, 역응수 ${top.backCount}개)`
      : '상대 킬러 응수 보유, 방어능력 없음';
  } else if (result === '능력이 소모됨') {
    resultExplain = top
      ? `${top.word}(${top.kind}) 가능하나 ${defenderJob} 방어능력(${defTools.slice(0, 2).join('/')}) 소모 필요`
      : `상대 킬러 응수 가능, ${defenderJob} 방어능력(${defTools.slice(0, 2).join('/')}) 소모`;
  }

  const reasons = [
    `응수 ${naturalReplyCount}개`,
    `${kind} 단어`,
    ...attack.notes,
    ...defense.notes
  ];
  if (immediateWin) reasons.push('자연 응수 없음');
  if (scarce) reasons.push(`자연 응수 희소(${naturalReplyCount}개)`);
  if (enemyHasKiller) reasons.push(`상대 최강 응수: ${top?.word || ''}(${top?.kind || ''}, 역응수 ${top?.backCount ?? 0}개)`);
  if (canEscapeByAbility) reasons.push(`수비 능력 탈출: ${transformedProfiles.map((item) => `${item.via}→${item.syllable}(${item.profile.total}개)`).join(', ')}`);

  const winIn = estimateWinIn(scope, word, attackerJob, defenderJob, replySyls, naturalReplyCount, usedAfter);

  // 직업별 능력 상세
  const defenderEscapes = transformedProfiles.map(({ syllable, via, profile }) => ({
    via, syllable, wordCount: profile.total,
    kill: profile.kill, yudo: profile.yudo, root: profile.root
  }));

  return {
    word, kind, result, resultExplain, score: Math.round(score), winIn,
    replySyllables: replySyls,
    replyProfiles,
    transformed,
    defenderEscapes,
    counterplay,
    replyCount: naturalReplyCount,
    reasons,
    attackerAbilities: JOB_TOOLS[attackerJob]?.attack || [],
    defenderAbilities: JOB_TOOLS[defenderJob]?.defense || [],
  };
}

function aggregate(moves) {
  const counts = { 이김: 0, '능력 소모 유도': 0, 모름: 0, '능력이 소모됨': 0, 짐: 0 };
  for (const item of moves) counts[item.result] = (counts[item.result] || 0) + 1;
  const best = moves.slice().sort((a, b) => b.score - a.score || a.replyCount - b.replyCount || b.word.length - a.word.length).slice(0, 16);
  const score = best.reduce((sum, item) => sum + item.score, 0) / Math.max(best.length, 1);

  const winIns = best.map(m => m.winIn).filter(v => v !== null);
  const bestWinIn = winIns.length > 0 ? Math.min(...winIns) : null;

  let verdict = '모름';
  if (counts['이김'] >= 2 || score >= 520) verdict = '이 음절은 강제승 후보';
  else if (counts['이김'] || counts['능력 소모 유도'] >= Math.max(2, moves.length * 0.18)) verdict = '능력 소모를 강제하기 좋음';
  else if (counts['짐'] + counts['능력이 소모됨'] > counts['이김'] + counts['능력 소모 유도']) verdict = '받으면 위험';
  return { counts, best, score: Math.round(score), verdict, winIn: bestWinIn };
}

function parseSituation(input) {
  const text = String(input || '').trim();
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const [rawKey, ...rest] = line.split(/[:=]/);
    if (!rest.length) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (/공격|내|attacker/.test(key)) out.attackerJob = value;
    else if (/수비|상대|defender/.test(key)) out.defenderJob = value;
    else if (/음절|syl/.test(key)) out.syllable = value[0] || '';
    else if (/기보|history|used/.test(key)) out.history = value.split(/\s+/).filter(Boolean);
  }
  return out;
}

export function analyzeReading({ attackerJob, defenderJob, syllable, situation, history = [], limit = 320 }) {
  const parsed = parseSituation(situation);
  attackerJob = attackerJob || parsed.attackerJob || '해커';
  defenderJob = defenderJob || parsed.defenderJob || '사과';
  syllable = (syllable || parsed.syllable || '').trim()[0] || '';
  history = history?.length ? history : parsed.history || [];

  const scope = getReadingData();
  const used = new Set(history);

  // 공격자가 이 음절을 받았을 때 능력으로 바꿀 수 있는 음절들 (두음법칙 포함)
  const attackerForceSyllables = syllable
    ? transformedSyllables(scope, syllable, attackerJob).map(({ syllable: s, via }) => ({
        via, syllable: s,
        wordCount: listForDueum(scope, s, used, attackerJob).length,
        profile: syllableProfileDueum(scope, s, used, attackerJob)
      }))
    : [];

  const sourceSyllables = syllable ? [syllable] : Object.keys(scope.WORDS_BY_START || {}).slice(0, 220);
  const syllables = sourceSyllables.map((syl) => {
    // 두음법칙 포함 프로필 및 단어 목록
    const profile = syllableProfileDueum(scope, syl, used, attackerJob);
    const moveSource = listForDueum(scope, syl, used, attackerJob)
      .sort((a, b) => {
        const ak = kindOf(scope, a);
        const bk = kindOf(scope, b);
        const av = ak === '한방' ? 3 : ak === '유도' ? 2 : ak === '루트' ? 1 : 0;
        const bv = bk === '한방' ? 3 : bk === '유도' ? 2 : bk === '루트' ? 1 : 0;
        return bv - av || b.length - a.length || a.localeCompare(b, 'ko');
      })
      .slice(0, limit);
    const moves = moveSource.map((word) => classifyMove(scope, word, attackerJob, defenderJob, used));
    return { syllable: syl, candidateCount: profile.total, profile, ...aggregate(moves) };
  });

  const ranked = syllables.slice().sort((a, b) => b.score - a.score || b.counts['이김'] - a.counts['이김']);
  return {
    attackerJob,
    defenderJob,
    requestedSyllable: syllable || null,
    history,
    attackerForceSyllables,
    attackerAbilities: JOB_TOOLS[attackerJob] || {},
    defenderAbilities: JOB_TOOLS[defenderJob] || {},
    summary: ranked.slice(0, 16).map(({ syllable: syl, verdict, score, counts, profile, winIn }) => ({ syllable: syl, verdict, score, counts, profile, winIn })),
    syllables: ranked
  };
}

// Batch analysis of all syllables in a category: I=유도, R=루트, A=한방
export function analyzeByType({ attackerJob, defenderJob, type, limit = 40 }) {
  attackerJob = attackerJob || '해커';
  defenderJob = defenderJob || '사과';
  const scope = getReadingData();
  const used = new Set();

  let sourceSet;
  if (type === 'I') sourceSet = scope.INTENDSYL_SET;
  else if (type === 'R') sourceSet = scope.ROUTESYL_SET;
  else if (type === 'A') sourceSet = SEARCH_A_CLASS_SET;  // A = 1ㄱㅅ 검색의 A급, 한방(K)과 다름
  else if (type === 'K') sourceSet = scope.KILLSYL_SET;  // K = 한방음절
  else return { error: 'invalid type', syllables: [] };

  // Filter to valid single Korean syllables that have words
  const syls = Array.from(sourceSet).filter(s => /^[가-힣]$/.test(s) && (scope.WORDS_BY_START?.[s] || []).length > 0);

  const syllables = syls.map(syl => {
    // 두음법칙 포함
    const profile = syllableProfileDueum(scope, syl, used, attackerJob);
    if (profile.total === 0) return null;
    const words = listForDueum(scope, syl, used, attackerJob)
      .sort((a, b) => {
        const ak = kindOf(scope, a);
        const bk = kindOf(scope, b);
        const av = ak === '한방' ? 3 : ak === '유도' ? 2 : ak === '루트' ? 1 : 0;
        const bv = bk === '한방' ? 3 : bk === '유도' ? 2 : bk === '루트' ? 1 : 0;
        return bv - av || b.length - a.length;
      })
      .slice(0, limit);
    const moves = words.map(word => classifyMove(scope, word, attackerJob, defenderJob, used));
    const agg = aggregate(moves);
    return { syllable: syl, profile, ...agg };
  }).filter(Boolean);

  syllables.sort((a, b) => {
    // For I type: prioritize by winIn, then score
    if (type === 'I') {
      const wa = a.winIn ?? 99;
      const wb = b.winIn ?? 99;
      if (wa !== wb) return wa - wb;
    }
    return b.score - a.score || b.counts['이김'] - a.counts['이김'];
  });

  return { type, attackerJob, defenderJob, total: syllables.length, syllables };
}

const NORMAL_SYL = "가간갈강개갤거건게겨고곡곤골곰곳과관괴구귀그근귿글긔기길까꺼꼬꼼꽃끄끌나날남낱내네넬녀녈노논뇨누눈뉴니닉닌닐님닙닛다닥단달닭당대댱더던덜덩데덴도독돈돌동되두둘뒤듀듁드든들디딥땅때땡떼뜰라란랄람래램랴략러레려렬롄로론롤료루룬룰류리린릴립링마막말매머멀메멘멧모목몰몸무묵문물미민바반발밭배버베벨벼보볼부북불뷰브블비뼈뿌사산살삼삿새색샛생샤서설섬섯성세셀셰소속손솔쇠수술숨슈스슬시실심쌍쒜쓰씨아악안알암앞애앵야약어언얼엉에엘엠여열옌오옥온옷옹완왓외요우울웃원위윈윗유이인일입자잠장재잭저적정젖제젹젼조존좀주중쥬즈즘지진집짓쪽쭈찌차찰참채책천첼초추취층치친카칼캐커컨컷케코콕콜콤콩퀴크큰클키타탈태터털테텔토톰투툴튜트티팀파팔팜패팬퍼페펜포폴표푸풀풋풍프플피필하한할함해핵허헌헝헤헨헬혈호혼홀홉화황후흐히각감갓객갸걱걸검격겹경곁계광교국군굴굼굿금급김깔깜깨께꼴꼽꽁꾀꾸꿀꿰끈끝끼낙낚난납낫냅냉너넉넝녁년념녑녕놀놋농느늘능늪늬담답덤덧뎍돛됴둥등딜따딱딴딸땜떡똥뚝뜨뜸락랍랏랩랭량렉력련렴렵령례록롯롱률르를릉릎릭림릿만맏망맥맨먹멍멜몽뭇믈믿밀밋박밥밧방백뱃벅번벌범법벤별볏병복본봉뵈분빈빌빗빛빨삯삽상샘석선섹셉셋셩솜솝순숫숯쉐쉬승신싱싸쌈쌔쏠앙액얌양얘억엄엥역연염엽영예올옻왁왈왕왜운워월율윷은음응의익임잇작잔잡쟁전절점접젠젤졸종줄쥐질짐징쪼쯔찔찬창처철청체촌총쵸출춤충칠칸캡쿠쿤퀸큐킬킹탁탄탐탑탕턱텁톨통퇴튀판팡팥팽펄펙펠펭편평폐폭폰푼품합항행향혀협형활홰회횡훈훼흙흥힘갑갱것겉겔곱공궈극긍긴껍낟냐냥넌넥녹뇽눌뉵댕덕뎨딕뚜뜻띠랜렌렙룡뤼륙면명몬밤밴벋봄붓빙빚뻘센셈솥쇼숙싹쌀압엇와용웜웨웰육잣쟝젓죡쥔증짚짜착첨최측칡침켄콘콧킷특팩펀햄헐혜홈환훠휘휴흑흠힐곧낮닝닻뎐랑랒뱀빵뻬썩쎄씰앗움으잉족죄짝짬쩡찐찜칙탱텅틀픽널늦돗릊먼벵뿔션쇄숭쑹옴퉁학혹뜽뮤쐬펑핀셔슐켐젼조족존졸좀종죄죡주줄중쥐쥔쥬즈즘증지진질짐집짓징짚짜짝짬쩡쪼쪽쭈쯔찌찐찔찜차착찬찰참창채책처천철첨청체첼초촌총최쵸추출춤충취측층치칙친칠칡침카칸칼캐캡커컨컷케코콕콘콜콤콧콩쿠쿤퀴퀸큐크큰클키킬킷킹타탁탄탈탐탑탕태탱터턱털텁텅테텔토톨톰통퇴투툴퉁튀튜트특틀틈티팀파판팔팜팡팥패팩팬팽퍼펀펄펑페펙펜펠펭편평폐포폭폰폴표푸푼풀품풋풍프플피픽핀필하학한할함합항해핵햄행향허헌헐헝헤헨헬혀혈협형혜호혹혼홀홈홉화환활황홰회횡후훈훠훤훼휘휴흐흑흙흠흥히힐힘";

// Integrated word search using the engine's cached data
export function searchInEngine(query, limit = 200) {
  const scope = getReadingData();
  const q = String(query || '').trim();
  if (!q) return { total: 0, results: [] };

  const allWords = Object.values(scope.WORDS_BY_START || {}).flat();

  let filtered;
  const isSpecial = q.includes('*') || q.includes('?') || /[KIRNA]/.test(q);
  
  if (isSpecial) {
    let reStr = q.toUpperCase();
    const KILLSYL_STR = Array.from(scope.KILLSYL_SET).join('');
    const INTENDSYL_STR = Array.from(scope.INTENDSYL_SET).join('');
    const ROUTESYL_STR = Array.from(scope.ROUTESYL_SET).join('');
    const SEARCH_A_CLASS = Array.from(SEARCH_A_CLASS_SET).join('');
    
    reStr = reStr.replace(/\*/g, '.*')
                 .replace(/\?/g, '.')
                 .replace(/K/g, `[${KILLSYL_STR}]`)
                 .replace(/I/g, `[${INTENDSYL_STR}]`)
                 .replace(/R/g, `[${ROUTESYL_STR}]`)
                 .replace(/N/g, `[${NORMAL_SYL}]`)
                 .replace(/A/g, `[${SEARCH_A_CLASS}]`);
                 
    try {
      const re = new RegExp(`^${reStr}$`);
      filtered = allWords.filter(w => re.test(w));
    } catch {
      filtered = [];
    }
  } else {
    filtered = allWords.filter(w => w.includes(q));
  }

  const kindRank = { '한방': 3, '유도': 2, '루트': 1, '일반': 0 };
  const annotated = filtered.map(word => {
    const last = word[word.length - 1];
    const kind = kindOf(scope, word);
    const replies = (scope.WORDS_BY_START?.[last] || []).length;
    const turnsToWin = WIN_TURN_MAP[last] ?? null;
    return {
      word,
      kind,
      len: word.length,
      first: word[0],
      last,
      replies,
      turnsToWin
    };
  });
  annotated.sort((a, b) => {
    const kr = (kindRank[b.kind] || 0) - (kindRank[a.kind] || 0);
    if (kr !== 0) return kr;
    const at = a.turnsToWin ?? 999;
    const bt = b.turnsToWin ?? 999;
    if (at !== bt) return at - bt;
    return b.len - a.len;
  });

  return { query: q, total: filtered.length, results: annotated.slice(0, limit) };
}
