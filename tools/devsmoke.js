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
  chk((await gs(() => [...document.querySelectorAll('#devpanel .tabs button')].map(b => b.textContent))).join() === 'INFO,PLAYER,BOTS,WORLD,VIEW,INSPECT,CONFIG,LOG', '탭: INFO, PLAYER, BOTS, WORLD, VIEW, INSPECT, CONFIG, LOG');
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
  // ---- 단계 4: CONFIG ----
  await tab('config'); const nrows = await gs(() => document.querySelectorAll('#devpanel .body, #devpanel .db .row').length); chk(nrows > 100, 'CONFIG: CFG 값 행이 많이 표시됨 (' + nrows + ')');
  chk(await gs(() => DEV.api.cfg.changes().length) === 0, 'CONFIG: 처음에는 변경 0개');
  await setv('dev-c-m-bulletRange.mode', 'legacy'); chk(await gs(() => CFG.bulletRange.mode) === 'legacy', 'CONFIG: 모드 스위치(bulletRange.mode → legacy)가 CFG에 반영');
  chk(await gs(() => JSON.stringify(DEV.api.cfg.exportMap())) === '{"bulletRange.mode":"legacy"}', 'CONFIG: 변경 JSON 내보내기'); chk(await gs(() => DEV.api.cfg.exportSet()) === `--set 'bulletRange.mode="legacy"'`, 'CONFIG: --set 인자 내보내기: ' + await gs(() => DEV.api.cfg.exportSet()));
  const b0 = await gs(() => game.player.spec.bSpeed); await setv('dev-c-bulletSpeedMul', 1.4); const b1 = await gs(() => game.player.spec.bSpeed); chk(Math.abs(b1 / b0 - 2) < 0.01, 'CONFIG: bulletSpeedMul 0.7→1.4 바꾸면 탱크 총알 속도가 자동 재계산되어 2배 (' + Math.round(b0) + ' → ' + Math.round(b1) + ')');
  const f0 = await gs(() => { const p = game.player, bt = new Bot(p.x + 800, p.y, 5, 'Old', 5); game.bots.push(bt); window.__old = bt; return bt.fleeHp; }); await setv('dev-c-botFx.fleeHp-0', 0.9); const f1 = await gs(() => { const p = game.player, bt = new Bot(p.x + 900, p.y, 5, 'New', 5); game.bots.push(bt); return [window.__old.fleeHp, bt.fleeHp]; });
  chk(f1[0] === f0 && Math.abs(f1[1] - f0) > 0.05, 'CONFIG: botFx.fleeHp는 새 봇부터 반영(기존 봇 ' + f0.toFixed(3) + ' 그대로, 새 봇 ' + f1[1].toFixed(3) + ')');
  await setv('dev-c-bulletSpeedMul', ''); chk(await gs(() => CFG.bulletSpeedMul) === 1.4, 'CONFIG: 빈 값은 거부(이전 값 유지)'); await setv('dev-c-bulletSpeedMul', 'abc');
  await pg.evaluate(() => { const r = document.getElementById('dev-c-bulletSpeedMul'); r.value = 'abc'; r.dispatchEvent(new Event('change')); }); chk(await gs(() => CFG.bulletSpeedMul) === 1.4 && await gs(() => document.getElementById('dev-c-bulletSpeedMul').value) === '1.4', 'CONFIG: 잘못된 값은 거부(이전 값 유지)');
  await pg.evaluate(() => { const b = document.querySelector('#dev-c-bulletSpeedMul'); b.closest('.row').querySelector('.act').click(); }); chk(await gs(() => CFG.bulletSpeedMul) === 0.7 && Math.abs((await gs(() => game.player.spec.bSpeed)) - b0) < 0.01, 'CONFIG: ↺로 기본값 복원(총알 속도도 원래대로)');
  await setv('dev-c-botTypes-0-b'.replace(/-/g, '.').replace('dev.c.', 'dev-c-'), 0.1); /* botTypes.0.b 행의 id는 dev-c-botTypes.0.b */
  chk(await gs(() => DEV.api.cfg.exportSet().startsWith(`--set 'botTypes=[`)), 'CONFIG: 배열 칸(botTypes.0.b) 변경은 배열 전체로 --set 내보내기'); 
  await setv('dev-c-q', 'tMaxA', 'input'); const vis = await gs(() => [...document.querySelectorAll('#devpanel .db .row')].filter(r => r.style.display !== 'none' && r.querySelector('label[title]')).map(r => r.querySelector('label[title]').title)); chk(vis.length >= 1 && vis.length <= 3 && vis.every(x => x.includes('tMaxA')), 'CONFIG: 검색 tMaxA → ' + vis.join(', ')); await setv('dev-c-q', '', 'input');
  await pg.evaluate(() => { const io = document.getElementById('dev-c-io'); io.style.display = 'block'; io.value = '{"bulletRange.tMin": 3, "없는.경로": 1}'; }); await click('붙여넣은 JSON 적용'); chk(await gs(() => CFG.bulletRange.tMin) === 3, 'CONFIG: 붙여넣은 JSON 적용(tMin 3), 잘못된 경로는 실패 처리');
  await click('전부 기본값으로'); chk(await gs(() => DEV.api.cfg.changes().length) === 0 && await gs(() => CFG.bulletRange.mode) === 'range' && await gs(() => CFG.botTypes[0].b) !== 0.1, 'CONFIG: 전부 기본값으로 되돌리면 변경 0개');
  // ---- 단계 5: 시간 제어 / LOG ----
  { await pg.evaluate(() => { game.player.god = true; });
    const clk = () => gs(() => game.clock);
    await pg.evaluate(() => DEV.api.setPaused(true)); const c0 = await clk(); await pg.waitForTimeout(400); chk(Math.abs((await clk()) - c0) < 1e-9, '시간: 일시정지 중 게임 시계가 멈춤');
    chk((await gs(() => document.getElementById('devbadge').textContent)).includes('⏸'), '시간: DEV 표시에 정지 아이콘');
    await click('⏭'); await pg.waitForTimeout(300); const c1 = await clk(); chk(Math.abs(c1 - c0 - 1 / 60) < 1e-6, '시간: 한 프레임 진행 = 1/60초 (' + (c1 - c0).toFixed(5) + ')');
    await pg.waitForTimeout(200); chk(Math.abs((await clk()) - c1) < 1e-9, '시간: 한 프레임 뒤 다시 정지');
    await click('▶'); await pg.waitForTimeout(100);
    await setv('devspeed', '4'); const d0 = await clk(), w0 = Date.now(); await pg.waitForTimeout(1000); const r4 = ((await clk()) - d0) / ((Date.now() - w0) / 1000);
    await setv('devspeed', '1'); const d1 = await clk(), w1 = Date.now(); await pg.waitForTimeout(1000); const r1 = ((await clk()) - d1) / ((Date.now() - w1) / 1000);
    chk(r4 > r1 * 2.5, '시간: 4배속이 1배속보다 빠름 (' + r4.toFixed(2) + ' vs ' + r1.toFixed(2) + ' 게임초/초)');
    await setv('devspeed', '0.25'); const d2 = await clk(), w2 = Date.now(); await pg.waitForTimeout(1000); const rq = ((await clk()) - d2) / ((Date.now() - w2) / 1000); chk(rq < r1 * 0.5, '시간: 0.25배속이 느림 (' + rq.toFixed(2) + ')'); await setv('devspeed', '1');
    await tab('log');
    await pg.evaluate(() => { game.devEvents = []; const p = game.player; p.setClass('tank'); p.setLevel(14); game.state = 'play'; p.alive = true; });
    await pg.evaluate(() => { const b = new Bot(1); window.__lb = b; game.bots.push(b); b.x = game.player.x + 300; b.y = game.player.y; b.hp = 1; b.lastHit = game.player; });
    await pg.waitForTimeout(300); await pg.evaluate(() => { const b = window.__lb; b.hp = 0; }); await pg.waitForTimeout(500);
    chk(await gs(() => (game.devEvents || []).some(e => e.type === 'kill')), 'LOG: 봇 처치가 이벤트로 기록됨');
    await pg.evaluate(() => { game.player.setLevel(45); game.chooseClass(classChoices(game.player.cls, game.player.level)[0]); }); await pg.waitForTimeout(100);
    chk(await gs(() => game.devEvents.some(e => e.type === 'class' && e.text.startsWith('You'))), 'LOG: 클래스 선택 기록 ');
    await pg.evaluate(() => { const c = game.clusters[0]; if (c) game.endCluster(c); else game.devEvent('cluster', 'x'); }); chk(await gs(() => game.devEvents.some(e => e.type === 'cluster')), 'LOG: 군집 종료 기록');
    await pg.evaluate(() => { game.bullets.push({ trap: true, x: game.player.x + 2000, y: game.player.y, vx: 0, vy: 0, r: 20, pen: 0, hp: 0, life: 10, owner: game.player, dmg: 1 }); }); await pg.waitForTimeout(100);
    await pg.waitForTimeout(600); const list = await gs(() => document.querySelector('#devpanel .db .sec').innerText);
    chk(list.includes('[kill]') && list.includes('[class]'), 'LOG: 패널 목록에 이벤트 표시');
    const json = await gs(() => { const p = DEV.api.samples; return JSON.stringify({ n: p.length }); }); await pg.waitForTimeout(1200);
    chk((await gs(() => DEV.api.samples.length)) >= 2, 'LOG: 추이 표본 수집 (' + json + ')');
    await pg.evaluate(() => { document.querySelectorAll('#devpanel .db label input').forEach(c => { if (c.parentElement.textContent.includes('처치')) { c.checked = false; c.dispatchEvent(new Event('change')); } }); });
    const list2 = await gs(() => document.querySelector('#devpanel .db .sec').innerText); chk(!list2.includes('[kill]') && list2.includes('[class]'), 'LOG: 필터로 종류 숨기기');
    await click('JSON 복사'); const ta = await gs(() => document.querySelector('#devpanel .db textarea').value); let ok = false; try { const o = JSON.parse(ta); ok = Array.isArray(o.events) && Array.isArray(o.samples) && o.events.length >= 2; } catch (e) { /* 아래 chk에서 실패 처리 */ } chk(ok, 'LOG: JSON 내보내기가 올바른 형식');
    await click('로그 지우기'); chk(await gs(() => game.devEvents.length) === 0, 'LOG: 로그 지우기');
  }
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
