// Commands the web UI may send to the bot engine. KakaoTalk lobby/meta commands are excluded.
const ALLOWED_PATTERNS = [
  /^1채린[23]?$/,
  /^1연습[23]?(?:\s+.+)?$/,
  /^0.{1,32}$/,
  /^2.{1,48}$/,
  /^1(?:밴|ㅂ)(?:\s+.+)?$/,
  /^1(?:ㅈㅅ|직업)\s+.+$/,
  /^1ㅈㅅㄹㄷ$/,
  /^1(?:무효|ㅁㅎ)$/,
  /^1무르기\s+.+$/,
  /^1(?:바꾸기|ㅂㄲㄱ)$/,
  /^1(?:동의|ㄷㅇ)$/,
  /^1(?:거절|ㄱㅈ)$/,
  /^1픽\s+\d+$/,
  /^1(?:킥|ㅋ)$/,
  /^(?:ㅈㅈ|항복|기권)$/,
  /^1(?:상태|ㅅㅌ)$/,
  /^1(?:직업정보|ㅈㅂ)(?:\s+.+)?$/,
  /^1(?:직업목록|ㅈㅇ)$/,
  /^1퀘스트/,
  /^1칭호/
];

export function isAllowedWebCommand(command) {
  const msg = String(command || '').trim();
  if (!msg) return false;
  return ALLOWED_PATTERNS.some((pattern) => pattern.test(msg));
}
