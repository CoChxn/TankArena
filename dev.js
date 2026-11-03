'use strict';
/* ============ 개발자 모드 (F2) ============
 * game.js가 처음 F2나 \를 누를 때 이 파일을 불러옵니다(없어도 게임은 동작하고 캔버스 대체 패널을 씁니다).
 * game.js의 전역(game, CFG, MAP, NEST, DEV 등)을 그대로 씁니다. 키 처리는 game.js(devKey)가 하고, 여기서는 화면(HTML 패널)만 만듭니다.
 *   F2: 켜기 + 패널 열기 -> 다시 누르면 패널만 숨김/표시 | Shift+F2: 개발자 모드 끄기 | \: 레벨 +1(꺼져 있으면 켜 줌)
 * 탭은 TABS에 { id, title, build(body) -> { update() } } 로 등록합니다(INFO가 첫 탭).
 */
(() => {
  const TABS = [], POLL_MS = 250;
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 저장 불가는 무시 */ } } };

  const css = `
#devbadge{position:fixed;left:70px;bottom:5px;z-index:7;padding:2px 8px;border-radius:4px;background:rgba(255,80,60,.85);color:#fff;font:bold 11px Consolas,"Courier New",monospace;letter-spacing:.5px;pointer-events:none;text-shadow:none}
#devpanel{position:fixed;z-index:6;width:440px;max-width:calc(100vw - 16px);display:flex;flex-direction:column;background:rgba(0,0,0,.62);color:#fff;font:11px/1.25 Consolas,"Courier New",monospace;border-radius:4px;overflow:hidden;text-shadow:none}
#devpanel.right{right:8px;top:236px;bottom:176px}
#devpanel.left{left:8px;top:250px;bottom:270px}
#devpanel .dh{display:flex;align-items:center;gap:6px;padding:4px 8px;background:rgba(0,0,0,.45);border-bottom:1px solid rgba(255,255,255,.15)}
#devpanel .dh b{color:#ffe05a;margin-right:4px}
#devpanel .tabs{display:flex;gap:2px;flex:1}
#devpanel .tabs button,#devpanel .dh .btn{font:inherit;color:#fff;background:rgba(255,255,255,.12);border:0;border-radius:3px;padding:2px 8px;cursor:pointer}
#devpanel .tabs button.on{background:rgba(255,224,90,.9);color:#000}
#devpanel .tabs button:hover:not(.on),#devpanel .dh .btn:hover{background:rgba(255,255,255,.28)}
#devpanel .db{flex:1;overflow:auto;padding:6px 8px;user-select:text}
#devpanel .sec{margin-bottom:8px;white-space:pre}
#devpanel .ln{white-space:pre}
#devpanel .ln.h{color:#ffe05a;font-weight:bold}
#devpanel h4{margin:8px 0 3px;color:#ffe05a;font-size:11px}
#devpanel .row{display:flex;align-items:center;gap:6px;margin:3px 0;flex-wrap:wrap}
#devpanel .row>label{width:84px;color:#bbb}
#devpanel input,#devpanel select{font:inherit;color:#fff;background:#1d1d1d;border:1px solid #555;border-radius:3px;padding:1px 4px}
#devpanel input[type=number]{width:58px}
#devpanel input[type=range]{width:150px;padding:0}
#devpanel input[type=checkbox]{width:auto}
#devpanel .act{font:inherit;color:#fff;background:rgba(255,255,255,.16);border:0;border-radius:3px;padding:2px 8px;cursor:pointer}
#devpanel .act:hover{background:rgba(255,255,255,.32)}
#devpanel .act.on{background:rgba(255,224,90,.9);color:#000}
#devpanel .act.sm{padding:0 5px}
#devpanel table{border-collapse:collapse;width:100%}
#devpanel td,#devpanel th{padding:1px 4px;text-align:left;white-space:nowrap}
#devpanel th{color:#bbb;font-weight:normal;border-bottom:1px solid rgba(255,255,255,.2)}
#devpanel tr:hover td{background:rgba(255,255,255,.08)}
#devpanel .note{color:#9aa;margin:2px 0}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const badge = document.createElement('div'); badge.id = 'devbadge'; badge.textContent = 'DEV'; document.body.appendChild(badge);
  const panel = document.createElement('div'); panel.id = 'devpanel';
  const head = document.createElement('div'); head.className = 'dh';
  const title = document.createElement('b'); title.textContent = 'DEV';
  const tabBar = document.createElement('div'); tabBar.className = 'tabs';
  const dock = document.createElement('button'); dock.className = 'btn'; dock.title = '패널 위치(왼쪽/오른쪽)';
  const hide = document.createElement('button'); hide.className = 'btn'; hide.textContent = '×'; hide.title = '패널 숨기기 (F2)';
  head.append(title, tabBar, dock, hide);
  const body = document.createElement('div'); body.className = 'db';
  panel.append(head, body); document.body.appendChild(panel);
  panel.addEventListener('mousedown', e => e.stopPropagation()); /* 패널 클릭이 게임 사격으로 넘어가지 않게 */

  let side = store.get('tankDevSide', 'right') === 'left' ? 'left' : 'right';
  const setSide = v => { side = v; panel.classList.remove('left', 'right'); panel.classList.add(side); dock.textContent = side === 'right' ? '◀' : '▶'; store.set('tankDevSide', side); };
  dock.onclick = () => setSide(side === 'right' ? 'left' : 'right');
  hide.onclick = () => { game.devPanel = false; sync(); };
  setSide(side);

  let active = null, timer = null;
  function select(id) {
    const t = TABS.find(x => x.id === id) || TABS[0]; if (!t) return; active = t; store.set('tankDevTab', t.id);
    for (const b of tabBar.children) b.classList.toggle('on', b.dataset.id === t.id);
    body.textContent = ''; if (!t.inst) t.inst = null; t.inst = t.build(body) || { update() {} }; t.inst.update();
  }
  function addTab(t) {
    TABS.push(t); const b = document.createElement('button'); b.textContent = t.title; b.dataset.id = t.id; b.onclick = () => select(t.id); tabBar.appendChild(b);
    if (!active && (store.get('tankDevTab', '') === t.id || TABS.length === 1)) select(t.id);
  }
  function tick() { if (active && active.inst) active.inst.update(); }
  function sync() { /* game.dev / game.devPanel 상태를 화면에 반영 */
    const on = !!game.dev, vis = on && !!game.devPanel;
    const ve = document.getElementById('ver'); badge.style.left = ((ve ? ve.offsetWidth : 70) + 14) + 'px'; /* DEV 표시는 버전 표시 오른쪽에 */
    badge.style.display = on ? 'block' : 'none'; panel.style.display = vis ? 'flex' : 'none';
    if (vis && !timer) { tick(); timer = setInterval(tick, POLL_MS); }
    if (!vis && timer) { clearInterval(timer); timer = null; }
  }

  /* ---- 작은 UI 도구 ---- */
  const E = (tag, props, ...kids) => { const e = document.createElement(tag); if (props) for (const k in props) { if (k === 'class') e.className = props[k]; else if (k === 'text') e.textContent = props[k]; else if (k.startsWith('on')) e[k] = props[k]; else if (k === 'style') Object.assign(e.style, props[k]); else e.setAttribute(k, props[k]); } for (const c of kids) if (c) e.append(c); return e; };
  const act = (text, fn, o) => { const b = E('button', Object.assign({ class: 'act', text }, o || {})); b.tabIndex = -1; b.onmousedown = e => e.preventDefault(); /* 클릭해도 포커스를 가져가지 않게(스페이스·방향키가 게임으로 가도록) */ b.onclick = () => { try { fn(b); } catch (err) { console.warn('dev:', err); } }; return b; };
  const row = (label, ...c) => E('div', { class: 'row' }, label ? E('label', { text: label }) : null, ...c);
  const numIn = (id, v, min, max, step) => E('input', { id, type: 'number', value: v, min, max, step: step || 1 });
  const selIn = (id, opts, v) => { const sl = E('select', { id }); for (const [val, text] of opts) { const o = E('option', { value: val, text }); if (val === v) o.selected = true; sl.appendChild(o); } return sl; };
  const typing = el => document.activeElement === el; /* 입력 중인 칸은 자동 갱신으로 덮어쓰지 않음 */
  const num = (el, lo, hi, d) => { const v = parseFloat(el.value); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  addEventListener('mousedown', e => { if (e.target && e.target.tagName === 'CANVAS' && document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); }, true); /* 화면을 누르면 입력칸 포커스를 풀어 WASD가 다시 동작 */
  const classOpts = () => { const o = []; for (const k of Object.keys(CFG.classes)) o.push([k, CFG.classes[k].n + (k === 'tank' ? '' : ' (' + (tierOf(k) === 2 ? '15레벨' : '30레벨') + ')')]); return o; };
  const near = (dist, ang) => { const p = game.player, a = ang === undefined ? Math.random() * TAU : ang; return [clamp(p.x + Math.cos(a) * dist, MAP.lo + 100, MAP.hi - 100), clamp(p.y + Math.sin(a) * dist, MAP.lo + 100, MAP.hi - 100)]; };

  /* ---- INFO 탭: 이전 캔버스 패널의 BOTS / WORLD / CLUSTERS 내용 ---- */
  addTab({
    id: 'info', title: 'INFO', build(el) {
      const a = document.createElement('div'), b = document.createElement('div'); a.className = b.className = 'sec'; el.append(a, b);
      const fill = (box, lines) => { box.textContent = ''; for (const L of lines) { const d = document.createElement('div'); d.className = 'ln' + (L.h ? ' h' : ''); d.textContent = L.t; if (L.c) d.style.color = L.c; box.appendChild(d); } };
      return { update() { const { bl, wl } = game.ui.devLines(); fill(a, wl); fill(b, bl); } };
    },
  });

  /* ---- PLAYER 탭: 레벨·클래스·능력치·무적·속도·점수 ---- */
  addTab({
    id: 'player', title: 'PLAYER', build(el) {
      const p0 = () => game.player;
      const lv = E('input', { id: 'dev-p-lv', type: 'range', min: 1, max: CFG.maxLevel, step: 1, value: p0().level }), lvn = numIn('dev-p-lvn', p0().level, 1, CFG.maxLevel);
      const setLv = v => { v = Math.round(Math.min(CFG.maxLevel, Math.max(1, v))); p0().setLevel(v); lv.value = lvn.value = v; };
      lv.oninput = () => setLv(+lv.value); lvn.onchange = () => { setLv(num(lvn, 1, CFG.maxLevel, p0().level)); lvn.blur(); };
      const cls = selIn('dev-p-cls', classOpts(), p0().cls); cls.onchange = () => { p0().setClass(cls.value); cls.blur(); };
      const god = E('input', { id: 'dev-p-god', type: 'checkbox' }); god.onchange = () => { p0().god = god.checked; };
      const spd = numIn('dev-p-spd', 1, 0.2, 5, 0.1); spd.onchange = () => { p0().devSpeed = num(spd, 0.2, 5, 1); spd.blur(); };
      const stIn = {}, stGrid = E('div', { class: 'row' });
      for (const st of CFG.stats) { const i = numIn('dev-p-st-' + st.k, 0, 0, 99); i.style.width = '44px'; i.onchange = () => { const v = Math.round(num(i, 0, 99, 0)); p0().up[st.k] = v; p0().recalc(); i.blur(); }; stIn[st.k] = i; stGrid.append(E('span', { style: { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', color: '#bbb', width: '58px' } }, E('span', { text: ({ regen: 'Regen', maxHp: 'MaxHP', body: 'Body', bSpeed: 'BSpd', pen: 'BPen', bDmg: 'BDmg', reload: 'Reload', move: 'Move' })[st.k] || st.k, title: st.n }), i)); }
      const info = E('div', { class: 'note' });
      el.append(
        E('h4', { text: '레벨 / 클래스' }), row('레벨', lv, lvn), row('클래스', cls),
        E('div', { class: 'note', text: '클래스는 레벨 조건 없이 바로 바뀝니다(능력치 포인트는 유지).' }),
        E('h4', { text: '능력치 (개발자 모드는 한도 없음, 이름 위에 마우스를 올리면 전체 이름)' }), stGrid,
        row('', act('전부 0으로', () => { for (const st of CFG.stats) p0().up[st.k] = 0; p0().recalc(); }), act('전부 7로', () => { for (const st of CFG.stats) p0().up[st.k] = 7; p0().recalc(); })),
        E('h4', { text: '상태' }), row('무적', god, E('span', { class: 'note', text: '피해를 받지 않음(스폰 무적과 별개)' })), row('이동 배율', spd),
        row('체력', act('가득 채우기', () => { p0().hp = p0().maxHp; })),
        E('h4', { text: '점수' }), row('점수 지급', act('+100', () => p0().addXp(100)), act('+1,000', () => p0().addXp(1000)), act('+10,000', () => p0().addXp(10000))), info);
      return { update() {
        const p = p0(); info.textContent = `Lv ${p.level}  score ${fmt(p.score)}  hp ${Math.round(p.hp)}/${Math.round(p.maxHp)}  class ${p.def.n}  ${p.alive ? '' : '(사망 — 다시 시작하면 적용 대상이 새로 만들어짐)'}`;
        if (!typing(lv) && !typing(lvn)) lv.value = lvn.value = p.level; if (!typing(cls)) cls.value = p.cls; god.checked = !!p.god; if (!typing(spd)) spd.value = p.devSpeed || 1;
        for (const st of CFG.stats) if (!typing(stIn[st.k])) stIn[st.k].value = p.up[st.k];
      } };
    },
  });

  /* ---- BOTS 탭: 생성·제거·정지·표 ---- */
  addTab({
    id: 'bots', title: 'BOTS', build(el) {
      const types = [['random', '랜덤 유형'], ...CFG.botTypes.map(t => [t.n, t.n])], clsO = [['random', '랜덤 클래스'], ...classOpts()];
      const sc = selIn('dev-b-cls', clsO, 'random'), st = selIn('dev-b-type', types, 'random'), lv = numIn('dev-b-lv', 1, 1, CFG.maxLevel), cnt = numIn('dev-b-n', 1, 1, 20);
      const spawn = () => {
        const L = Math.round(num(lv, 1, CFG.maxLevel, 1)), n = Math.round(num(cnt, 1, 20, 1)); let made = 0;
        for (let i = 0; i < n; i++) {
          const [x, y] = near(450 + Math.random() * 250), keep = CFG.botTypes, ty = st.value === 'random' ? null : CFG.botTypes.find(t => t.n === st.value);
          if (ty) CFG.botTypes = [Object.assign({}, ty, { w: 1 })];
          let b; try { b = new Bot(x, y, L, game.pickName(), L); } finally { CFG.botTypes = keep; }
          if (sc.value !== 'random') { b.setClass(sc.value); for (const s of CFG.stats) b.up[s.k] = 0; b.pts = pointsFor(L); b.wt = botBuildWeights(b.pt, sc.value); b.spendPoints(); }
          b.hp = b.maxHp; b.invT = 0; b.idleT = 0; game.bots.push(b); made++;
        }
        msg.textContent = `${made}마리 생성`;
      };
      const msg = E('div', { class: 'note' });
      const frz = act('AI 정지', b => { game.devFreeze = !game.devFreeze; b.classList.toggle('on', game.devFreeze); b.textContent = game.devFreeze ? 'AI 재개' : 'AI 정지'; });
      frz.id = 'dev-b-freeze';
      const tb = E('tbody'), table = E('table', null, E('thead', null, E('tr', null, ...['이름', 'Lv', '클래스', 'hp', '상태', '거리', ''].map(t => E('th', { text: t })))), tb);
      const rows = new Map();
      const mkRow = b => {
        const c = { name: E('td'), lv: E('td'), cls: E('td'), hp: E('td'), st: E('td'), d: E('td') }, tr = E('tr');
        const go = act('→', () => { const p = game.player, [x, y] = [b.x - 160, b.y]; p.x = clamp(x, MAP.lo + 30, MAP.hi - 30); p.y = clamp(y, MAP.lo + 30, MAP.hi - 30); p.vx = p.vy = 0; }, { title: '플레이어를 이 봇 옆으로 이동', class: 'act sm' });
        const fz = act('■', fb => { b.frozen = !b.frozen; fb.classList.toggle('on', b.frozen); }, { title: '이 봇 정지/재개', class: 'act sm' });
        const kl = act('×', () => { b.hp = 0; }, { title: '처치(체력 0)', class: 'act sm' });
        const rm = act('⌫', () => { b.gone = true; }, { title: '제거(기록 없이)', class: 'act sm' });
        tr.append(c.name, c.lv, c.cls, c.hp, c.st, c.d, E('td', null, go, fz, kl, rm)); return { tr, c, fz };
      };
      el.append(E('h4', { text: '봇 생성 (플레이어 근처)' }), row('클래스', sc), row('유형', st), row('레벨 / 수', lv, cnt, act('생성', spawn)), msg,
        E('h4', { text: '전체' }), row('', frz, act('모두 처치', () => { for (const b of game.bots) b.hp = 0; }), act('모두 제거', () => { for (const b of game.bots) b.gone = true; })),
        E('h4', { text: '봇 목록 (→ 이동, ■ 정지, × 처치, ⌫ 제거)' }), table);
      let sig = '';
      return { update() {
        const list = [...game.bots].filter(b => !b.gone && b.hp > 0).sort((a, b) => b.level - a.level), p = game.player;
        for (const [b, r] of rows) if (!list.includes(b)) { r.tr.remove(); rows.delete(b); }
        for (const b of list) { if (!rows.has(b)) rows.set(b, mkRow(b)); const r = rows.get(b); r.c.name.textContent = b.name.slice(0, 10); r.c.lv.textContent = b.level; r.c.cls.textContent = b.def.n.slice(0, 9); r.c.hp.textContent = Math.round(b.hp / b.maxHp * 100) + '%'; r.c.st.textContent = b.frozen ? 'frozen' : b.stateTag(); r.c.d.textContent = Math.round(Math.hypot(b.x - p.x, b.y - p.y)); r.fz.classList.toggle('on', !!b.frozen); }
        const ns = list.map(b => b.name).join('|'); if (ns !== sig) { sig = ns; for (const b of list) tb.append(rows.get(b).tr); } /* 목록 순서는 구성이 바뀔 때만 다시 배치(클릭 도중 행이 움직이지 않게) */
        frz.classList.toggle('on', !!game.devFreeze); frz.textContent = game.devFreeze ? 'AI 재개' : 'AI 정지';
      } };
    },
  });

  /* ---- WORLD 탭: 도형·크래셔·군집 생성, 정리 ---- */
  addTab({
    id: 'world', title: 'WORLD', build(el) {
      const shapeT = [['square', '사각형'], ['triangle', '삼각형'], ['pentagon', '오각형'], ['hexagon', '육각형'], ['alpha', '알파 오각형']];
      const ts = selIn('dev-w-shape', shapeT, 'square'), tn = numIn('dev-w-sn', 5, 1, 200), tw = selIn('dev-w-where', [['near', '플레이어 근처'], ['random', '맵 임의(화면 밖)']], 'near');
      const msg = E('div', { class: 'note' });
      const spawnShapes = () => { const n = Math.round(num(tn, 1, 200, 1)); let made = 0; for (let i = 0; i < n; i++) { const t = ts.value, ok = t === 'alpha' ? game.spawnShape(true, true, 'alpha') : game.spawnShape(tw.value === 'random' ? false : true, false, t); if (ok === false) continue; made++; if (tw.value === 'near') { const s = game.shapes[game.shapes.length - 1], [x, y] = near(200 + Math.random() * 350); s.x = x; s.y = y; } } msg.textContent = `${made}개 생성(겹치면 자동으로 밀려남)`; };
      const cn = numIn('dev-w-cn', 3, 1, 50);
      const spawnCr = () => { const n = Math.round(num(cn, 1, 50, 1)); for (let i = 0; i < n; i++) { game.spawnCrasher(true); const c = game.crashers[game.crashers.length - 1]; if (c) { const [x, y] = near(250 + Math.random() * 300); c.x = x; c.y = y; } } msg.textContent = `크래셔 ${n}마리 생성`; };
      const clBox = E('div');
      el.append(E('h4', { text: '도형 생성' }), row('종류', ts), row('수 / 위치', tn, tw, act('생성', spawnShapes)),
        E('h4', { text: '크래셔 생성 (플레이어 근처)' }), row('수', cn, act('생성', spawnCr)), msg,
        E('h4', { text: '군집' }), row('', act('군집 생성', () => { msg.textContent = game.newCluster(null, false) ? '군집 생성' : '자리를 찾지 못함(화면 밖에 빈 자리 없음)'; })), clBox,
        E('h4', { text: '정리' }), row('', act('총알 전부', () => { game.bullets.length = 0; }), act('트랩만', () => { game.bullets = game.bullets.filter(b => !b.trap); })),
        row('', act('도형 전부(자동 보충됨)', () => { game.shapes.length = 0; }), act('크래셔 전부', () => { game.crashers.length = 0; })));
      let sig = '';
      return { update() {
        const cl = game.clusters, ns = cl.map(c => c.type + c.x).join('|'); if (ns !== sig) {
          sig = ns; clBox.textContent = '';
          cl.forEach((c, i) => clBox.append(E('div', { class: 'row' }, E('span', { text: `#${i + 1} ${c.type} r${Math.round(c.r)}`, style: { width: '150px' } }), act('종료', () => { if (CFG.clusters.mode !== 'legacy') game.endCluster(c); else { for (const s of game.shapes) if (s.cl === c) s.cl = null; game.newCluster(c); } }, { class: 'act sm' }))));
        }
      } };
    },
  });

  /* ---- 월드 위 표시(오버레이), 자유 카메라, 개체 선택(Shift+클릭) ---- */
  const VIEW_DEFS = [
    ['radius', '충돌 반경', '탱크·도형·크래셔·총알의 충돌 반지름 원'], ['vel', '속도 화살표', '탱크의 0.4초 뒤 위치까지 화살표'], ['target', '봇 목표선', '봇 → 현재 목표(빨강 사냥, 노랑 도주, 초록 파밍)와 상태'],
    ['sight', '교전 시야 반경', '봇이 탱크를 후보로 삼는 거리(점선)'], ['threat', '도주 위협 구역', '도주한 상대의 마지막 위치와 회피 구역(fleeMemory 동안)'], ['clusters', '군집 진행도', '군집별 n/목표, 생성 개수, 나이와 진행 고리'],
    ['owners', '총알·트랩 소유자 색', '소유자마다 다른 색의 고리(트랩은 굵게)'], ['grid', '도형 격자 칸', '총알 충돌용 256px 칸과 칸별 도형 수'], ['exclusion', '스폰 제외 구역', '봇이 소환되지 않는 평소 시야(+150px)와 저레벨 봇의 둥지 근처(+900px)'],
  ];
  let view = {}; try { view = JSON.parse(store.get('tankDevView', '{}')) || {}; } catch (e) { view = {}; }
  const saveView = () => store.set('tankDevView', JSON.stringify(view));
  const devCam = { on: false, x: 0, y: 0, follow: null }, SEL = { e: null };
  const anyView = () => VIEW_DEFS.some(d => view[d[0]]);
  const hueOf = o => { let h = 0; const t = (o && (o.name || o.kind)) || '?'; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 360; return h; };
  const tanksNow = () => { const a = []; if (game.player.alive) a.push(game.player); for (const b of game.bots) if (b.hp > 0 && !b.gone) a.push(b); return a; };

  function drawWorld(ctx, cam) {
    const z = cam.zoom, lw = 1.5 / z, hw = cam.w / 2 / z, hh = cam.h / 2 / z, vis = (x, y, r) => Math.abs(x - cam.x) < hw + r && Math.abs(y - cam.y) < hh + r;
    const circ = (x, y, r, col, w, dash) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.strokeStyle = col; ctx.lineWidth = w || lw; ctx.setLineDash(dash ? [dash / z, dash / z] : []); ctx.stroke(); ctx.setLineDash([]); };
    const line = (x0, y0, x1, y1, col, w) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = col; ctx.lineWidth = w || lw; ctx.stroke(); };
    const arrow = (x0, y0, x1, y1, col) => { line(x0, y0, x1, y1, col, 2 / z); const a = Math.atan2(y1 - y0, x1 - x0), h = 7 / z; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - Math.cos(a - 0.5) * h, y1 - Math.sin(a - 0.5) * h); ctx.moveTo(x1, y1); ctx.lineTo(x1 - Math.cos(a + 0.5) * h, y1 - Math.sin(a + 0.5) * h); ctx.stroke(); };
    const text = (t, x, y, col) => { ctx.font = `bold ${11 / z}px Consolas,monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3 / z; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(t, x, y); ctx.fillStyle = col || '#fff'; ctx.fillText(t, x, y); };
    const tanks = tanksNow();
    if (view.radius) {
      for (const t of tanks) if (vis(t.x, t.y, t.r)) circ(t.x, t.y, t.r, 'rgba(80,200,255,.9)');
      for (const e of game.shapes) if (e.hp > 0 && vis(e.x, e.y, e.r)) circ(e.x, e.y, e.r, 'rgba(255,220,70,.8)');
      for (const e of game.crashers) if (e.hp > 0 && vis(e.x, e.y, e.r)) circ(e.x, e.y, e.r, 'rgba(255,120,220,.9)');
      for (const b of game.bullets) if (vis(b.x, b.y, b.r)) circ(b.x, b.y, b.r, 'rgba(255,255,255,.9)', 1 / z);
    }
    if (view.vel) { for (const t of tanks) if (vis(t.x, t.y, 60)) { const sp = Math.hypot(t.vx, t.vy); if (sp > 5) arrow(t.x, t.y, t.x + t.vx * 0.4, t.y + t.vy * 0.4, '#7dff7d'); } }
    if (view.target || view.sight || view.threat) {
      for (const b of game.bots) {
        if (b.hp <= 0 || b.gone || !vis(b.x, b.y, 900)) continue;
        if (view.sight) circ(b.x, b.y, 750 * b.sightMul / b.def.fov, 'rgba(255,255,255,.35)', lw, 6);
        if (view.target && b.target && b.target.hp > 0 && !b.target.gone) { const col = b.mode === 'flee' ? '#ffd23c' : b.mode === 'hunt' ? '#ff5050' : '#5fe08a'; line(b.x, b.y, b.target.x, b.target.y, col, 2 / z); text(b.mode + ' ' + (b.kind || '') + (b.kind === 'tank' ? ' R' + b.matchup(b.target).toFixed(2) : ''), b.x, b.y - b.r - 34 / z, col); }
        if (view.threat) { const th = b.threatNow(); if (th) { const R = 750 * b.sightMul / b.def.fov * CFG.botFight.threatMul; circ(th.x, th.y, R, 'rgba(255,150,40,.9)', lw, 8); line(b.x, b.y, th.x, th.y, 'rgba(255,150,40,.6)', lw); text('threat ' + Math.max(0, th.until - b.age).toFixed(1) + 's', th.x, th.y, '#ffa028'); } }
      }
    }
    if (view.clusters) {
      for (const c of game.clusters) { if (!vis(c.x, c.y, c.r)) continue; const f = c.target ? c.spawned / c.target : 0, col = c.type === 'square' ? '#ffd23c' : c.type === 'triangle' ? '#ff6e6e' : '#8a9bff'; circ(c.x, c.y, c.r, col, 2 / z, 10);
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 14 / z, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(f, 0, 1)); ctx.strokeStyle = col; ctx.lineWidth = 5 / z; ctx.stroke();
        text(`${c.type}  n ${c.n}/${c.target}  sp ${c.spawned}/${c.target}  age ${Math.round(c.age)}/${Math.round(c.life)}s`, c.x, c.y, col); }
    }
    if (view.owners) { for (const b of game.bullets) { if (!vis(b.x, b.y, b.r)) continue; circ(b.x, b.y, b.r + 3 / z, `hsl(${hueOf(b.owner)},90%,55%)`, (b.trap ? 4 : 2) / z); } }
    if (view.grid) {
      const CS = 256, gx0 = Math.floor((cam.x - hw) / CS), gx1 = Math.floor((cam.x + hw) / CS), gy0 = Math.floor((cam.y - hh) / CS), gy1 = Math.floor((cam.y + hh) / CS), grid = game._sgrid;
      ctx.beginPath(); for (let gx = gx0; gx <= gx1 + 1; gx++) { ctx.moveTo(gx * CS, gy0 * CS); ctx.lineTo(gx * CS, (gy1 + 1) * CS); } for (let gy = gy0; gy <= gy1 + 1; gy++) { ctx.moveTo(gx0 * CS, gy * CS); ctx.lineTo((gx1 + 1) * CS, gy * CS); } ctx.strokeStyle = 'rgba(0,120,255,.45)'; ctx.lineWidth = lw; ctx.stroke();
      if (grid && (gx1 - gx0 + 1) * (gy1 - gy0 + 1) < 400) for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) { const a = grid.get((gx + 8) * 2048 + gy + 8); if (a && a.length) text(String(a.length), gx * CS + CS / 2, gy * CS + CS / 2, 'rgba(120,180,255,1)'); }
    }
    if (view.exclusion) {
      const bz = cam.baseZoom, ex = cam.w / 2 / bz + 150, ey = cam.h / 2 / bz + 150; ctx.setLineDash([10 / z, 8 / z]); ctx.strokeStyle = 'rgba(255,60,60,.9)'; ctx.lineWidth = 2 / z; ctx.strokeRect(cam.x - ex, cam.y - ey, ex * 2, ey * 2); ctx.setLineDash([]);
      circ(CFG.world / 2, CFG.world / 2, NEST.r + 900, 'rgba(255,60,60,.7)', 2 / z, 10); text('저레벨 봇 소환 제외(둥지+900)', CFG.world / 2, CFG.world / 2 - NEST.r - 900 - 14 / z, '#ff6a6a'); text('봇 소환 제외(평소 시야+150)', cam.x, cam.y - ey - 12 / z, '#ff6a6a');
    }
    const e = SEL.e; if (e && e.hp > 0 && !e.gone) { const r = (e.r || 10) + 8 / z + 2 * Math.sin(game.clock * 6) / z; circ(e.x, e.y, r, '#ffe05a', 3 / z); text(e.name || e.kind || (e.s && e.s.n) || 'selected', e.x, e.y - r - 10 / z, '#ffe05a'); }
  }
  game.devDraw = (ctx, cam) => { if (anyView() || (SEL.e && SEL.e.hp > 0 && !SEL.e.gone)) drawWorld(ctx, cam); };
  game.devCamHook = dt => { if (!devCam.on) return; const f = devCam.follow; if (f && f.hp > 0 && !f.gone) { const k = 1 - Math.exp(-6 * dt); devCam.x += (f.x - devCam.x) * k; devCam.y += (f.y - devCam.y) * k; } else devCam.follow = null; game.cam.x = devCam.x; game.cam.y = devCam.y; };
  const setFree = on => { devCam.on = on; if (on) { devCam.x = game.cam.x; devCam.y = game.cam.y; } else devCam.follow = null; };

  /* 마우스: Shift+클릭 = 개체 선택, 자유 카메라일 때 오른쪽/가운데 버튼 드래그 = 이동 */
  function pick(sx, sy) {
    const cam = game.cam, wx = cam.wx(sx), wy = cam.wy(sy), tol = 8 / cam.zoom; let best = null, bd = Infinity;
    const test = (e, kind, bias) => { if (e.hp <= 0 || e.gone) return; const d = Math.hypot(e.x - wx, e.y - wy) - e.r; if (d <= tol && d + bias < bd) { bd = d + bias; best = e; } };
    for (const t of tanksNow()) test(t, 'tank', -1000); for (const c of game.crashers) test(c, 'crasher', -500); for (const sh of game.shapes) test(sh, 'shape', 0);
    return best;
  }
  let pan = null;
  addEventListener('mousemove', e => { if (!pan) return; devCam.follow = null; devCam.x -= (e.clientX - pan.x) / game.cam.zoom; devCam.y -= (e.clientY - pan.y) / game.cam.zoom; pan = { x: e.clientX, y: e.clientY }; });
  addEventListener('mouseup', () => { pan = null; });
  const api_mouse = e => {
    if (e.shiftKey && e.button === 0) { const t = pick(e.clientX, e.clientY); SEL.e = t; if (t) { const tabBtn = tabBar.querySelector('[data-id="inspect"]'); if (tabBtn && game.devPanel) tabBtn.click(); } return true; }
    if (devCam.on && (e.button === 2 || e.button === 1)) { pan = { x: e.clientX, y: e.clientY }; e.preventDefault(); return true; }
    return false;
  };

  /* ---- VIEW 탭: 오버레이 토글 + 카메라 ---- */
  addTab({
    id: 'view', title: 'VIEW', build(el) {
      const boxes = {}, list = E('div');
      for (const [k, name, tip] of VIEW_DEFS) { const cb = E('input', { id: 'dev-v-' + k, type: 'checkbox' }); cb.checked = !!view[k]; cb.onchange = () => { view[k] = cb.checked; saveView(); }; boxes[k] = cb; list.append(E('div', { class: 'row' }, cb, E('label', { text: name, style: { width: '150px', color: '#fff' }, for: 'dev-v-' + k }), E('span', { class: 'note', text: tip }))); }
      const free = E('input', { id: 'dev-v-free', type: 'checkbox' }); free.onchange = () => setFree(free.checked);
      const info = E('div', { class: 'note' });
      el.append(E('h4', { text: '월드 위 표시 (켠 것만 그림, 꺼져 있으면 비용 0)' }), list,
        row('', act('전부 켜기', () => { for (const [k] of VIEW_DEFS) { view[k] = true; boxes[k].checked = true; } saveView(); }), act('전부 끄기', () => { for (const [k] of VIEW_DEFS) { view[k] = false; boxes[k].checked = false; } saveView(); })),
        E('h4', { text: '카메라' }), row('자유 카메라', free, E('span', { class: 'note', text: '오른쪽(또는 가운데) 버튼 드래그로 이동, 휠로 줌. 플레이어는 그대로 조작 가능' })),
        row('', act('플레이어로 복귀', () => { setFree(false); free.checked = false; }), act('선택한 개체 따라가기', () => { if (SEL.e && SEL.e.hp > 0) { if (!devCam.on) { setFree(true); free.checked = true; } devCam.follow = SEL.e; } })),
        E('div', { class: 'note', text: 'Shift+클릭: 개체 선택 → INSPECT 탭에서 자세히 보기' }), info);
      return { update() { free.checked = devCam.on; const c = game.cam; info.textContent = `카메라 (${Math.round(c.x)}, ${Math.round(c.y)}) 줌 x${c.zoom.toFixed(2)}${devCam.on ? (devCam.follow ? '  [따라가기: ' + (devCam.follow.name || devCam.follow.kind) + ']' : '  [자유]') : '  [플레이어]'}`; } };
    },
  });

  /* ---- INSPECT 탭: 선택한 개체 정보 ---- */
  const kv = (k, v) => [k, String(v)];
  const f1 = x => (Math.round(x * 10) / 10).toString();
  function describe(e) {
    const L = [];
    if (e === game.player || e.isBot) {
      L.push(kv('이름', e.name), kv('종류', e === game.player ? '플레이어' : '봇'), kv('레벨/점수', `Lv${e.level}  ${fmt(e.score)}`), kv('클래스', e.def.n), kv('체력', `${Math.round(e.hp)}/${Math.round(e.maxHp)}  (${Math.round(e.hp / e.maxHp * 100)}%)`),
        kv('위치', `${Math.round(e.x)}, ${Math.round(e.y)}`), kv('속도', `${f1(Math.hypot(e.vx, e.vy))}px/s`), kv('반지름', f1(e.r)), kv('스폰 무적', Math.max(0, e.invT).toFixed(1) + 's'), kv('개발자 무적', e.god ? '켜짐' : '꺼짐'));
      L.push(kv('능력치', CFG.stats.map(st => `${st.k} ${e.up[st.k]}`).join('  ')), kv('총알', `피해 ${f1(e.spec.dmg)}  체력 ${f1(e.spec.pen)}  속도 ${Math.round(e.spec.bSpeed)}  재장전 ${f1(e.reloadT / TICK)}틱`), kv('쿨다운', e.cool.toFixed(2) + 's'));
      if (e.isBot) {
        const T = e.target; L.push(kv('상태', e.frozen ? 'frozen' : e.stateTag()), kv('성격', `${e.pt.n}  (b${e.pt.b} g${e.pt.g} p${e.pt.p} r${e.pt.r})  숙련도 ${e.skill.toFixed(2)}`), kv('싸움 기준', e.fightThr.toFixed(2)),
          kv('목표', T && T.hp > 0 ? `${e.kind}  ${T.name || (T.s && T.s.n) || ''}  ${e.mode}${e.kind === 'tank' ? '  R' + e.matchup(T).toFixed(2) : ''}` : '(없음)'), kv('복수', e.grudge && e.grudgeLeft > 0 ? `${e.grudge.name || e.grudge.kind}  ${e.grudgeLeft.toFixed(1)}s` : '(없음)'), kv('위협 기억', e.threatNow() ? `(${Math.round(e.threatNow().x)}, ${Math.round(e.threatNow().y)})  ${Math.max(0, e.threatNow().until - e.age).toFixed(1)}s` : '(없음)'),
          kv('시야', `${Math.round(750 * e.sightMul / e.def.fov)}px  유지 ${e.holdLeft.toFixed(1)}s  판단 ${e.decLeft.toFixed(1)}s`), kv('나이', e.age.toFixed(1) + 's' + (e.level < e.targetLv ? `  가속 x${Math.round(e.catchMul())} (목표 Lv${e.targetLv})` : '')));
      }
    } else if (game.crashers.includes(e)) { L.push(kv('종류', '크래셔'), kv('체력', `${Math.round(e.hp)}/${e.maxHp}`), kv('위치', `${Math.round(e.x)}, ${Math.round(e.y)}`), kv('속도', f1(Math.hypot(e.vx, e.vy)) + 'px/s'), kv('목표', e.target ? (e.target.name || e.target.kind) : '(없음)')); }
    else { L.push(kv('종류', '도형 ' + e.kind), kv('체력', `${Math.round(e.hp)}/${Math.round(e.maxHp)}`), kv('반지름', f1(e.r)), kv('위치', `${Math.round(e.x)}, ${Math.round(e.y)}`), kv('소속', e.nest ? '둥지' : e.cl ? '군집 ' + (game.clusters.indexOf(e.cl) + 1) : '일반'), kv('점수', e.s.xp), kv('몸통 피해', e.dmg)); }
    return L;
  }
  addTab({
    id: 'inspect', title: 'INSPECT', build(el) {
      const hint = E('div', { class: 'note', text: '화면에서 Shift+클릭으로 탱크·봇·크래셔·도형을 선택하세요.' }), box = E('div', { class: 'sec' });
      const E1 = () => SEL.e && SEL.e.hp > 0 && !SEL.e.gone ? SEL.e : null;
      const bar = row('', act('따라가기', () => { const e = E1(); if (e) { setFree(true); devCam.follow = e; } }), act('해제', () => { SEL.e = null; }),
        act('체력 가득', () => { const e = E1(); if (e) e.hp = e.maxHp; }), act('처치', () => { const e = E1(); if (e) e.hp = 0; }), act('제거', () => { const e = E1(); if (e) { e.gone = true; e.hp = 0; } }));
      const bar2 = row('', act('무적 토글', () => { const e = E1(); if (e && (e === game.player || e.isBot)) e.god = !e.god; }), act('봇 정지/재개', () => { const e = E1(); if (e && e.isBot) e.frozen = !e.frozen; }), act('플레이어를 여기로', () => { const e = E1(), p = game.player; if (e) { p.x = e.x + 120; p.y = e.y; p.vx = p.vy = 0; } }));
      el.append(hint, bar, bar2, box);
      return { update() {
        box.textContent = ''; const e = E1();
        if (!SEL.e) { hint.style.display = 'block'; return; } hint.style.display = 'none';
        if (!e) { box.append(E('div', { class: 'ln', text: '(선택한 개체가 사라졌습니다)' })); return; }
        for (const [k, v] of describe(e)) box.append(E('div', { class: 'ln', text: k.padEnd(10) + ' ' + v }));
      } };
    },
  });

  DEV.api = { sync, addTab, select, tabs: TABS, setSide, mouse: api_mouse, view, devCam, SEL };
  sync();
})();
