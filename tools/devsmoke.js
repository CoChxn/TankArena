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
  // ---- 단계 2: PLAYER / BOTS / WORLD 탭 ----
  await pg.keyboard.press('Shift+F2'); await pg.keyboard.press('F2'); await pg.waitForTimeout(400);
  const tab = async id => { await pg.evaluate(i => document.querySelector('#devpanel .tabs button[data-id="' + i + '"]').click(), id); await pg.waitForTimeout(150); };
  const setv = (id, v, ev) => pg.evaluate(([i, x, e]) => { const el = document.getElementById(i); if (el.type === 'checkbox') el.checked = x; else el.value = x; el.dispatchEvent(new Event(e || 'change')); }, [id, v, ev]);
  const click = text => pg.evaluate(t => { const b = [...document.querySelectorAll('#devpanel .act')].find(x => x.textContent === t); if (!b) throw new Error('버튼 없음: ' + t); b.click(); }, text);
  const gs = f => pg.evaluate(f);
  chk((await gs(() => [...document.querySelectorAll('#devpanel .tabs button')].map(b => b.textContent))).join() === 'INFO,PLAYER,BOTS,WORLD,VIEW,INSPECT', '탭: INFO, PLAYER, BOTS, WORLD, VIEW, INSPECT');
  await tab('player'); await setv('dev-p-cls', 'trapper'); chk(await gs(() => game.player.cls) === 'trapper', 'PLAYER: 클래스 직접 선택(Trapper, 레벨 조건 없음)');
  await setv('dev-p-lvn', 30); chk(await gs(() => game.player.level) === 30, 'PLAYER: 레벨 30으로 설정'); await setv('dev-p-lv', 12, 'input'); chk(await gs(() => game.player.level) === 12, 'PLAYER: 슬라이더로 레벨 12');
  await setv('dev-p-st-reload', 7); chk(await gs(() => game.player.up.reload) === 7, 'PLAYER: 능력치 입력(Reload 7)');
  await setv('dev-p-god', true); const hp0 = await gs(() => { const p = game.player; p.invT = 0; const h = p.hp; p.hurt(10, null); return [h, p.hp]; }); chk(hp0[0] === hp0[1], 'PLAYER: 무적이면 피해 0'); await setv('dev-p-god', false);
  const hp1 = await gs(() => { const p = game.player; p.invT = 0; const h = p.hp; p.hurt(10, null); return h - p.hp; }); chk(hp1 > 0, 'PLAYER: 무적을 끄면 피해를 받음');
  await setv('dev-p-spd', 2); chk(await gs(() => game.player.devSpeed) === 2, 'PLAYER: 이동 배율 2'); await click('+1,000'); chk(await gs(() => game.player.score) >= 1000, 'PLAYER: 점수 +1,000');
  await tab('bots'); const nb0 = await gs(() => game.bots.length); await setv('dev-b-cls', 'trapper'); await setv('dev-b-type', '돌격형'); await setv('dev-b-lv', 20); await setv('dev-b-n', 3); await click('생성');
  const spawned = await gs(() => game.bots.slice(-3).map(b => [b.def.n, b.level, b.pt.n]));
  chk(await gs(() => game.bots.length) === nb0 + 3 && spawned.every(x => x[0] === 'Trapper' && x[1] === 20 && x[2] === '돌격형'), 'BOTS: 클래스·유형·레벨 지정 생성(Trapper, 돌격형, Lv20 x3): ' + JSON.stringify(spawned[0]));
  await pg.waitForTimeout(400); chk((await gs(() => document.querySelectorAll('#devpanel tbody tr').length)) >= 3, 'BOTS: 표에 봇 행이 표시됨');
  await click('AI 정지'); const pos = await gs(() => game.bots.map(b => [b.x, b.y])); await pg.waitForTimeout(700); const pos2 = await gs(() => game.bots.map(b => [b.x, b.y]));
  chk(JSON.stringify(pos) === JSON.stringify(pos2), 'BOTS: AI 정지 중에는 봇이 움직이지 않음'); await click('AI 재개'); chk(!(await gs(() => game.devFreeze)), 'BOTS: AI 재개');
  await click('모두 제거'); await pg.waitForTimeout(100); chk(await gs(() => game.bots.filter(b => !b.gone && b.hp > 0).length) === 0, 'BOTS: 모두 제거');
  await tab('world'); const ns0 = await gs(() => game.shapes.length); await setv('dev-w-shape', 'pentagon'); await setv('dev-w-sn', 5); await click('생성'); chk(await gs(() => game.shapes.length) >= ns0 + 5, 'WORLD: 오각형 5개 생성');
  const nc0 = await gs(() => game.crashers.length); await setv('dev-w-cn', 3); const crBtns = await gs(() => [...document.querySelectorAll('#devpanel .act')].filter(b => b.textContent === '생성').length); await pg.evaluate(() => [...document.querySelectorAll('#devpanel .act')].filter(b => b.textContent === '생성')[1].click()); chk(await gs(() => game.crashers.length) === nc0 + 3, 'WORLD: 크래셔 3마리 생성 (생성 버튼 ' + crBtns + '개)');
  await click('군집 생성'); await pg.waitForTimeout(400); chk((await gs(() => document.querySelectorAll('#devpanel .row .act.sm').length)) >= 1, 'WORLD: 군집 목록에 종료 버튼');
  await pg.evaluate(() => { game.bullets.push({ trap: true, x: 0, y: 0, vx: 0, vy: 0, r: 5, pen: 1, life: 5, owner: {} }, { x: 0, y: 0, vx: 0, vy: 0, r: 5, pen: 1, life: 5, owner: {} }); }); await click('트랩만'); chk(await gs(() => game.bullets.filter(b => b.trap).length) === 0, 'WORLD: 트랩만 삭제'); await click('총알 전부'); chk(await gs(() => game.bullets.length) === 0, 'WORLD: 총알 전부 삭제');
  // ---- 단계 3: VIEW(오버레이·카메라) / INSPECT(개체 선택) ----
  await pg.evaluate(() => { game.player.god = true; }); /* 점검 중 플레이어가 죽어 화면이 가려지지 않게 */
  await tab('view');
  const arcs = () => pg.evaluate(() => { let n = 0; const o = CanvasRenderingContext2D.prototype.arc; CanvasRenderingContext2D.prototype.arc = function (...a) { n++; return o.apply(this, a); }; game.draw(); CanvasRenderingContext2D.prototype.arc = o; return n; });
  const base = await arcs(); await setv('dev-v-radius', true); const withRadius = await arcs(); chk(withRadius > base, 'VIEW: 충돌 반경을 켜면 그려지는 원이 늘어남 (' + base + ' → ' + withRadius + ')'); await setv('dev-v-radius', false);
  chk((await arcs()) === base, 'VIEW: 끄면 원래대로(비용 0)');
  await pg.evaluate(() => { const p = game.player, b = new Bot(p.x - 260, p.y, 12, 'TestBot', 12); b.idleT = 0; b.invT = 0; game.bots.push(b); window.__tb = b; });
  await click('전부 켜기'); await pg.waitForTimeout(900); chk((await gs(() => ['radius', 'vel', 'target', 'sight', 'threat', 'clusters', 'owners', 'grid', 'exclusion'].every(k => DEV.api.view[k]))), 'VIEW: 전부 켜기');
  chk(errs.length === 0, 'VIEW: 오버레이를 모두 켠 채 그려도 오류 없음'); await click('전부 끄기');
  const sp = await gs(() => { const c = game.cam, b = window.__tb; b.frozen = true; return [(b.x - c.x) * c.zoom + c.w / 2, (b.y - c.y) * c.zoom + c.h / 2]; });
  await pg.keyboard.down('Shift'); await pg.mouse.click(sp[0], sp[1]); await pg.keyboard.up('Shift'); await pg.waitForTimeout(500);
  chk(await gs(() => DEV.api.SEL.e === window.__tb), 'INSPECT: Shift+클릭으로 봇 선택'); chk(!(await gs(() => game.input.down)), 'INSPECT: Shift+클릭은 사격으로 이어지지 않음');
  const insTxt = await gs(() => document.getElementById('devpanel').innerText); chk(insTxt.includes('TestBot') && insTxt.includes('성격') && insTxt.includes('능력치'), 'INSPECT: 선택한 봇 정보 표시(이름, 성격, 능력치)');
  await click('따라가기'); await pg.evaluate(() => { window.__tb.x += 700; }); await pg.waitForTimeout(1800);
  chk(await gs(() => DEV.api.devCam.on && Math.abs(game.cam.x - window.__tb.x) < 40), 'INSPECT: 따라가기 중 카메라가 선택한 봇을 따라감');
  await tab('view'); await click('플레이어로 복귀'); await pg.waitForTimeout(300); chk(!(await gs(() => DEV.api.devCam.on)), 'VIEW: 플레이어로 복귀');
  await setv('dev-v-free', true); const cx0 = await gs(() => DEV.api.devCam.x); await pg.mouse.move(300, 300); await pg.mouse.down({ button: 'right' }); await pg.mouse.move(400, 300, { steps: 4 }); await pg.mouse.up({ button: 'right' });
  const cx1 = await gs(() => DEV.api.devCam.x); chk(cx1 < cx0 - 20, 'VIEW: 자유 카메라 오른쪽 드래그로 이동 (' + Math.round(cx0) + ' → ' + Math.round(cx1) + ')'); chk(!(await gs(() => game.input.down)), 'VIEW: 오른쪽 드래그는 사격으로 이어지지 않음'); await click('플레이어로 복귀');
  await tab('info');
  await pg.close(); pg = await open(true); await pg.keyboard.press('F2'); await pg.waitForTimeout(500); s = await st(pg); chk(s.dev && s.state === 'failed', 'dev.js를 못 불러와도(차단) 개발자 모드는 켜지고 대체 패널을 씀'); await pg.close();
  // ---- 버전 표시 ----
  { const vp = await open(false); const txt = await vp.evaluate(() => document.getElementById('ver').textContent); chk(/^ver [0-9a-f]{7} · \d+\/\d+ \d{2}:\d{2}$/.test(txt), '버전 표시(file://): ' + txt); await vp.close();
    const http = require('http'), fs = require('fs'), root = path.join(__dirname, '..'), real = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
    const serve = fakeId => new Promise(res => { const sv = http.createServer((q, r) => { const u = q.url.split('?')[0]; if (u === '/version.json') { r.setHeader('content-type', 'application/json'); r.end(JSON.stringify(fakeId ? { id: fakeId, at: real.at } : real)); return; } const f = path.join(root, u === '/' ? 'index.html' : u); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; r.end(); return; } r.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html'); r.end(fs.readFileSync(f)); }).listen(0, '127.0.0.1', () => res(sv)); });
    for (const [fake, want] of [[null, false], ['aaaaaaa', true]]) {
      const sv = await serve(fake), pgv = await b.newPage({ viewport: { width: 1100, height: 700 } }); pgv.on('pageerror', e => errs.push(String(e)));
      await pgv.goto('http://127.0.0.1:' + sv.address().port + '/index.html'); await pgv.waitForTimeout(2800);
      const r = await pgv.evaluate(() => { const e = document.getElementById('ver'); return [e.textContent, e.classList.contains('new')]; });
      chk(r[1] === want && (!want || r[0].includes('새 버전 aaaaaaa')), '버전 확인(http, version.json ' + (fake ? '다름' : '같음') + '): ' + r[0]); await pgv.close(); sv.close();
    } }
  chk(errs.length === 0, '페이지 오류 0건' + (errs.length ? ': ' + errs[0] : '')); await b.close(); process.exit(bad ? 1 : 0);
})();
