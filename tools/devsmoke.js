'use strict';
// 개발자 모드(F2)의 실제 브라우저 동작 점검: Playwright가 설치된 환경에서 `node tools/devsmoke.js`(npm 의존성에는 넣지 않음)
const path = require('path'); const { pathToFileURL } = require('url');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('playwright를 찾을 수 없음(전역 설치 필요, NODE_PATH 확인)'); process.exit(2); }
(async () => {
  const url = pathToFileURL(path.join(__dirname, '..', 'index.html')).href, b = await chromium.launch(), errs = []; let bad = 0;
  const chk = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) bad++; };
  const open = async (block) => { const pg = await b.newPage({ viewport: { width: 1100, height: 700 } }); pg.on('pageerror', e => errs.push(String(e))); if (block) await pg.route('**/dev.js', r => r.abort()); await pg.goto(url); await pg.click('#play'); await pg.waitForTimeout(400); return pg; };
  const st = pg => pg.evaluate(() => { const q = id => { const e = document.getElementById(id); return e ? getComputedStyle(e).display : 'none'; }; return { dev: game.dev, flag: game.devPanel, state: DEV.state, panel: q('devpanel'), badge: q('devbadge'), lv: game.player.level, hasWorld: (document.getElementById('devpanel') || { innerText: '' }).innerText.includes('WORLD') }; });
  let pg = await open(false), s = await st(pg); chk(!s.dev && s.panel === 'none', '시작: 개발자 모드 꺼짐');
  await pg.keyboard.press('F2'); await pg.waitForTimeout(600); s = await st(pg); chk(s.dev && s.state === 'ready' && s.panel === 'flex' && s.badge === 'block' && s.hasWorld, 'F2: 켜짐, dev.js 로드, 패널·DEV 표시, INFO 내용');
  await pg.keyboard.press('F2'); await pg.waitForTimeout(200); s = await st(pg); chk(s.dev && s.panel === 'none' && s.badge === 'block', 'F2 다시: 패널만 숨김');
  await pg.keyboard.press('F2'); await pg.waitForTimeout(200); s = await st(pg); chk(s.dev && s.panel === 'flex', 'F2 세 번째: 패널 다시 표시');
  await pg.keyboard.press('Shift+F2'); await pg.waitForTimeout(200); s = await st(pg); chk(!s.dev && s.panel === 'none' && s.badge === 'none', 'Shift+F2: 완전히 꺼짐');
  const lv0 = s.lv; await pg.keyboard.press('Backslash'); await pg.waitForTimeout(300); s = await st(pg); chk(s.dev && s.panel === 'flex' && s.lv === lv0 + 1, '\\: 꺼져 있으면 켜고 레벨 +1');
  await pg.close(); pg = await open(true); await pg.keyboard.press('F2'); await pg.waitForTimeout(500); s = await st(pg); chk(s.dev && s.state === 'failed', 'dev.js를 못 불러와도(차단) 개발자 모드는 켜지고 대체 패널을 씀'); await pg.close();
  chk(errs.length === 0, '페이지 오류 0건' + (errs.length ? ': ' + errs[0] : '')); await b.close(); process.exit(bad ? 1 : 0);
})();
