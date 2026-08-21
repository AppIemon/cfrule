/**
 * 회원가입·로그인 실패가 화면에 어떻게 보이는가.
 *
 *   npm run dev          (다른 창에서)
 *   node scripts/test-auth-ui.js
 *
 * 서버가 실제로 내려주는 응답을 그대로 흉내내고, 사용자가 읽는 글자를 확인한다.
 * 예전에는 `{"error":"password_too_short"}` 가 4초 토스트로 스쳐 지나갔다.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const failures = [];
function check(label, ok, detail = '') {
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` · ${detail}` : ''}`);
}

const cases = [
  { label: '비밀번호 8자 미만', id: '홍길동', pw: 'short', server: null,
    expect: '비밀번호는 8자 이상' },
  { label: '아이디 2자 미만', id: 'a', pw: 'longenough1', server: null,
    expect: '아이디는 2자 이상' },
  { label: '이미 있는 아이디', id: '홍길동', pw: 'longenough1',
    server: { status: 400, json: { error: 'username_taken' } },
    expect: '이미 쓰이고 있는 아이디' },
  { label: '서버 오류', id: '홍길동', pw: 'longenough1',
    server: { status: 500, json: { error: 'server_error' } },
    expect: '서버에서 처리하지 못했습니다' },
  { label: '정상 가입', id: '홍길동', pw: 'longenough1',
    server: { status: 200, json: { user: { nickname: '홍길동', rating: 1000 } } },
    expect: null }
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

for (const c of cases) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' });
  await ctx.route('**/api/auth**', (r) => {
    if (r.request().method() === 'POST' && c.server) {
      return r.fulfill({ status: c.server.status, json: c.server.json });
    }
    if (r.request().method() === 'POST') return r.fulfill({ json: { user: null } });
    return r.fulfill({ json: {} });          // 비로그인 상태
  });
  await ctx.route('**/api/room**', (r) => r.fulfill({ json: [] }));
  await ctx.route('**/api/my-games**', (r) => r.fulfill({ json: [] }));
  await ctx.route('**/api/friends**', (r) => r.fulfill({ json: {} }));

  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.auth-gate-form', { timeout: 15000 });
  await page.waitForTimeout(300);

  await page.click('.auth-panel-tab:has-text("회원가입")');
  const inputs = page.locator('.auth-gate-form .auth-panel-input');
  await inputs.nth(0).fill(c.id);
  await inputs.nth(1).fill(c.pw);
  await page.waitForTimeout(120);

  // 규칙 안내가 회원가입 탭에 보이는가
  if (c === cases[0]) {
    const rule = await page.locator('.auth-rule').innerText().catch(() => '');
    check('회원가입 규칙 안내 표시', rule.includes('8자'), rule);
  }

  await page.click('.auth-panel-submit');
  await page.waitForTimeout(700);

  if (c.expect) {
    const msg = await page.locator('.auth-error').innerText().catch(() => '');
    check(c.label, msg.includes(c.expect), msg || '(메시지 없음)');
    // 원문이 새어 나오지 않는가
    check(`${c.label}: 원문 노출 없음`,
      !/\{|error"|E11000|MONGODB/i.test(msg), msg);
  } else {
    const gone = await page.locator('.auth-gate').count();
    const help = await page.locator('.help-page').count();
    check(c.label, gone === 0 && help === 1, `게이트=${gone} 도움말=${help}`);
  }
  await ctx.close();
}

// 입력을 고치면 메시지가 사라지는가
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' });
  await ctx.route('**/api/auth**', (r) => r.fulfill({ json: {} }));
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.auth-gate-form', { timeout: 15000 });
  await page.waitForTimeout(300);
  await page.click('.auth-panel-tab:has-text("회원가입")');
  const inputs = page.locator('.auth-gate-form .auth-panel-input');
  await inputs.nth(0).fill('홍길동');
  await inputs.nth(1).fill('short');
  await page.click('.auth-panel-submit');
  await page.waitForTimeout(400);
  const before = await page.locator('.auth-error').count();
  await inputs.nth(1).fill('longenough1');
  await page.waitForTimeout(250);
  const after = await page.locator('.auth-error').count();
  check('입력을 고치면 메시지가 사라짐', before === 1 && after === 0, `${before} → ${after}`);
  await ctx.close();
}

await browser.close();
if (failures.length) {
  console.error(`\n실패 ${failures.length}건:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('\n회원가입 흐름 정상');
