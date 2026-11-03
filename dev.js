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
    badge.style.display = on ? 'block' : 'none'; panel.style.display = vis ? 'flex' : 'none';
    if (vis && !timer) { tick(); timer = setInterval(tick, POLL_MS); }
    if (!vis && timer) { clearInterval(timer); timer = null; }
  }

  /* ---- INFO 탭: 이전 캔버스 패널의 BOTS / WORLD / CLUSTERS 내용 ---- */
  addTab({
    id: 'info', title: 'INFO', build(el) {
      const a = document.createElement('div'), b = document.createElement('div'); a.className = b.className = 'sec'; el.append(a, b);
      const fill = (box, lines) => { box.textContent = ''; for (const L of lines) { const d = document.createElement('div'); d.className = 'ln' + (L.h ? ' h' : ''); d.textContent = L.t; if (L.c) d.style.color = L.c; box.appendChild(d); } };
      return { update() { const { bl, wl } = game.ui.devLines(); fill(a, wl); fill(b, bl); } };
    },
  });

  DEV.api = { sync, addTab, select, tabs: TABS, setSide };
  sync();
})();
