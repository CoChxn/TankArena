// 설정형 가짜 MOD 테스트 (가짜 DOM으로 game.js를 화면 없이 돌림). 게임 폴더에서 실행:
//   node tests/run.js <시나리오[,시나리오]> [옵션]      예) node tests/run.js quick
// 시나리오: quick(config,shapes,botspawn,autofire,nest) | all(quick+pop,fp,spawn,late) | config shapes botspawn autofire nest pop fp spawn late perf
// 옵션: --runs N --min M --trials N --level L --seed S --set 경로=값(반복 가능, 예: --set bots.base=12) --brief
//       --prof(perf에서 함수별 시간) --nosep(도형 겹침 방지 끄기: 성능 비교용)  --targets 5,8,11,14 --n 5 --limit 90 (catchup 시나리오)  --save 이름 / --compare 이름 (tests/results/이름.json에 저장·비교)  --max-sec 150 --force --game 경로 --list
// 참고: 실제 브라우저·사람 플레이가 아니라 봇 AI와 규칙만 확인하는 근사입니다. 게임 시간은 화면 렌더 없이 빠르게 진행됩니다.
const fs = require('fs'), path = require('path'), crypto = require('crypto');

/* ---------- 옵션 ---------- */
const BOOL = new Set(['brief', 'force', 'list', 'help', 'prof', 'nosep']);
const argv = process.argv.slice(2), opt = { sets: [], names: [] };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--set') opt.sets.push(argv[++i]);
  else if (a.startsWith('--')) { const k = a.slice(2); if (BOOL.has(k)) opt[k] = true; else opt[k] = argv[++i]; }
  else opt.names.push(...a.split(',').filter(Boolean));
}
const num = (v, d) => (v === undefined || isNaN(+v)) ? d : +v;
const GROUPS = { quick: ['config', 'shapes', 'botspawn', 'autofire', 'nest'], all: ['config', 'shapes', 'botspawn', 'autofire', 'nest', 'pop', 'fp', 'spawn', 'late'] };
const DEF = { pop: { runs: 2, min: 15 }, fp: { runs: 2, min: 15 }, late: { runs: 1, min: 10 }, perf: { runs: 1, min: 3 }, sanity: { runs: 1, min: 6 }, aicheck: { runs: 3, min: 10 } };
const O = n => ({ runs: num(opt.runs, (DEF[n] || {}).runs || 1), min: num(opt.min, (DEF[n] || {}).min || 5), trials: num(opt.trials, 14), level: num(opt.level, 1) });
// 예상 실행 시간(초): 게임 1분당 약 3초 기준의 거친 추정
const SC = {
  config: ['설정에서 계산되는 값 확인(시뮬레이션 없음)', () => 1],
  shapes: ['총알 vs 도형 발수/관통, 몸통 충돌 피해, 재생 (순간 계산)', () => 2],
  dmgrange: ['총알 한 발이 탱크 한 대에 줄 수 있는 총 피해의 최소/평균/최대(정면 직격, 정지한 대상): 클래스 x 능력치 x 대상 방어', () => 8],
  bodycheck: ['몸통 충돌 물리 측정: 플레이어가 도형·탱크를 향해 계속 전진할 때 전진 속도, 대상이 밀린 거리, 멈춤 여부', () => 6],
  botspawn: ['봇 스폰 위치 분포(맵 전체 무작위인지)', () => 3],
  autofire: ['사망 시 오토파이어 해제, E 키 동작', () => 1],
  nest: ['둥지 구성(오각형/육각형/알파), 육각형 재등장 타이머, 일반 도형 종류 비율', () => 6],
  catchup: ['소환 직후 성장 가속: 1레벨에서 목표 레벨까지 걸리는 시간(봇 1마리씩 단독)', () => (opt.targets ? opt.targets.split(',').length : 4) * num(opt.n, 5) * num(opt.limit, 90) / 60 * 1.6 + 3],
  traitcheck: ['봇 성격 유형·수치 연결 확인(유형 분포, 파생 값, 시야·두려움·복수·추격 유지·조준 오차, 쉬는 행동 제거)', () => 25],
  memorycheck: ['도주 후 위협 기억(후보 제외, 밀려남, 배회 방향, 끄기)과 도형 후보 들어오는/벗어나는 거리 확인', () => 8],
  aicheck: ['봇 AI 측정: 교전 판단의 정확도(R 구간별 승패), 도주 성공률, 상태 전이와 떨림(플레이어 정지·무적, 봇 정상 수)', o => 8 + o.runs * o.min * 3.5],
  fightcheck: ['봇의 싸움·도주 판단(전투 우위 R) 확인: 유형별 판단표, ±15% 여유, 최소 유지 시간, 다른 적에 대한 즉시 도주', () => 25],
  clashcheck: ['총알끼리 충돌 비교(이전 방식 instant와 새 방식 mass를 같은 조건에서 비교)', () => 2],
  rulecheck: ['최근 바꾼 규칙 확인(총알 속도·크기, 반동 유지, 체력 회복·급속 회복, 성장 가속 상한, 맵 크기 기준, 부활 레벨)', () => 3],
  ttk: ['탱크 처치 시간: 가만히 선 탱크를 정면 400px에서 쏠 때 걸리는 시간과 발수(사수 빌드 x 대상 빌드)', () => 5],
  sanity: ['이상 상태 감시(숫자 오류, 비정상 속도, 맵 밖 이탈, 체력 초과, 죽은 개체 잔존 등) — 플레이어가 움직이며 사격하는 실제 한 판', o => 10 + o.min * 7],
  knockcheck: ['총알의 밀림·꺾임 확인(정지한 대상에 총알 한 발이 주는 속도, 비껴 맞을 때 꺾임, 무적 대상은 밀리지 않음)', () => 3],
  buildcheck: ['성격 유형별 능력치 투자·클래스 선택 확인(레벨 45까지 단계적으로 성장, 유형별 평균 빌드와 클래스 비율)', () => 8],
  scorecheck: ['점수제 목표 선택 확인(유형별 선호, 도주 우선, 유지 보너스와 최소 유지 시간, 배회 방향)', () => 5],
  types: ['성격 유형별 봇 성과(소환·사망·수명·레벨·처치), 봇 10마리 정상 상태', o => o.runs * o.min * 5],
  pop: ['봇 개체군: 레벨 추이, 사망 원인, 수명, 점수 출처, 도형 보충률', o => o.runs * o.min * 3],
  fp: ['가짜 플레이어(봇 AI, 점수 100%)의 성장·생존', o => o.runs * o.min * 5.5],
  spawn: ['신규 플레이어 스폰 위치 공정성 + 가만히 있을 때 생존', o => 12 + o.trials * 11],
  late: ['후반(플레이어 Lv45) 정상 상태: 봇 수, 회전율, 성능', o => o.min * 2.2],
  perf: ['성능: update/draw 프레임당 ms (--level, --min)', o => 20 + o.min * 2.2],
};
if (opt.help || opt.list || !opt.names.length) {
  console.log('사용법: node tests/run.js <시나리오> [옵션]  (파일 맨 위 주석 참고)\n');
  for (const [k, v] of Object.entries(SC)) console.log('  ' + k.padEnd(9) + v[0] + '   (기본 예상 ' + Math.round(v[1](O(k))) + '초)');
  console.log('\n  그룹: quick = ' + GROUPS.quick.join(','), '\n        all   = ' + GROUPS.all.join(','));
  process.exit(0);
}
const names = [].concat(...opt.names.map(n => GROUPS[n] || [n]));
for (const n of names) if (!SC[n]) { console.error('알 수 없는 시나리오: ' + n + ' (--list로 확인)'); process.exit(1); }
const est = names.reduce((a, n) => a + SC[n][1](O(n)), 0), maxSec = num(opt['max-sec'], 150);
console.log('예상 실행 시간 약 ' + Math.round(est) + '초 (' + names.join(', ') + ')');
if (est > maxSec && !opt.force) { console.error('예상 시간이 --max-sec ' + maxSec + '초를 넘습니다. --runs/--min을 줄이거나 --force로 강제 실행하세요.'); process.exit(2); }

/* ---------- 시드 / 게임 로드 ---------- */
function seedRand(s) { let a = s >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const reseed = tag => { if (opt.seed !== undefined) seedRand(num(opt.seed, 1) * 7919 + hash(tag)); };
if (opt.seed !== undefined) seedRand(num(opt.seed, 1));
const gamePath = opt.game || 'game.js';
const noop = () => {}, ctx = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 0 }) : noop, set: () => true }), els = {};
const el = id => els[id] || (els[id] = { value: '', classList: { add: noop, remove: noop }, addEventListener: noop, getContext: () => ctx, set onclick(f) {}, textContent: '' });
global.document = { getElementById: el }; global.window = global; global.innerWidth = 1280; global.innerHeight = 720; global.devicePixelRatio = 1;
global.__L = {}; global.addEventListener = (n, f) => { (__L[n] = __L[n] || []).push(f); };
global.requestAnimationFrame = noop; global.setTimeout = noop;
Object.defineProperty(global, 'performance', { value: { now: () => Date.now() }, configurable: true, writable: true });
let src = fs.readFileSync(gamePath, 'utf8');
const gameSha = crypto.createHash('sha256').update(src).digest('hex').slice(0, 12);
const marker = "game = new Game(document.getElementById('c'));";
if (!src.includes(marker)) { console.error('game.js에서 "' + marker + '" 줄을 찾지 못했습니다.'); process.exit(1); }
const overrides = opt.sets.map(s => { const m = /^([A-Za-z_][\w.]*)=(.+)$/.exec(s || ''); if (!m) { console.error('--set 형식: 경로=값 (예: bots.base=12)'); process.exit(1); } let v; try { v = JSON.parse(m[2]); } catch (e) { v = m[2]; } return 'CFG.' + m[1] + ' = ' + JSON.stringify(v) + ';'; }).join('\n');
src = src.replace(marker, overrides + '\n' + marker) + '\n;globalThis.__x = { g: game, C: CFG, MAP, mapTarget, setMapSize, respawnLevel, inNest, pointsFor, Bot, Player, ANIMALS, TICK };';
let g, C, MAP, mapTarget, setMapSize, respawnLevel, inNest, pointsFor, Bot, Player;
const srcTemplate = src; // 로드 전의 설정 적용본(시나리오마다 새로 평가하기 위해 보관)
function boot() { // 게임을 새로 만들고 참조를 갱신 (시나리오 사이에 월드가 섞이지 않게)
  global.__L = {}; seedBoot(); (0, eval)(srcTemplate);
  ({ g, C, MAP, mapTarget, setMapSize, respawnLevel, inNest, pointsFor, Bot, Player } = global.__x);
  if (opt.nosep) { g.separateShapes = () => {}; g.shapeFree = () => true; } // 성능 비교용: 도형 겹침 방지(분리 + 생성 시 검사) 끄기
}
function seedBoot() { if (opt.seed !== undefined) seedRand(num(opt.seed, 1)); }
boot();
console.log((opt.nosep ? '[도형 겹침 방지 끔] ' : '') + 'game.js ' + gameSha + (opt.sets.length ? '  설정 변경: ' + opt.sets.join(', ') : '') + (opt.seed !== undefined ? '  seed ' + opt.seed : '  (시드 없음: 실행마다 결과가 달라짐)'));

/* ---------- 도우미 ---------- */
const results = {};
const say = (s, detail) => { if (detail && opt.brief) return; console.log(s); };
const rec = (k, v) => { if (typeof v === 'number' && isFinite(v)) results[k] = +v.toFixed(4); return v; };
const med = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
const tick = (n, cb) => { for (let i = 1; i <= n; i++) { g.update(1 / 60); if (cb) cb(i); } };
// 플레이어를 정지·무적 상태로 새로 시작하고 봇을 비운다
function fresh(o) {
  o = o || {}; g.dev = false; g.state = 'menu'; g.start(); const P = g.player; P.invT = 0; if (o.level > 1) P.setLevel(o.level);
  P.hp = P.maxHp = 1e9; P.x = o.x !== undefined ? o.x : MAP.lo + 800; P.y = o.y !== undefined ? o.y : MAP.lo + 800; P.vx = P.vy = 0;
  g.bots = []; g.crashers = []; g.bullets = []; g.input.axis = () => [0, 0]; g.input.down = false; g.input.auto = false; return P; // 이전 시나리오의 총알이 남지 않게 비움
}
const mkShape = (type, x, y, extra) => { const S = C.shapes[type]; return Object.assign({ s: S, kind: S.name || type, nest: false, cl: null, x, y, r: S.r, hp: S.hp, maxHp: S.hp, dmg: S.dmg, a: 0, spin: 0, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0, calm: 99 }, extra || {}); };

/* ---------- 시나리오 ---------- */
const S = {};
S.config = () => {
  const B = C.bots, K = C.clusters;
  say('=== [config] 설정에서 계산되는 값 (시뮬레이션 아님) ===');
  say('봇 설정 ' + JSON.stringify(B));
  say('목표 봇 수: ' + [1, 5, 10, 20, 30, 40, 45].map(l => 'Lv' + l + '→' + Math.min(B.max, B.base + Math.floor(l * B.perLevel))).join(' '));
  say('맵 크기(탱크 수): ' + [2, 5, 11, 15, 20, 25].map(n => n + '대→' + Math.round(mapTarget(n))).join(' ') + '  (최소 ' + C.map.min + ', 최대 ' + C.map.max + ', 좌표 공간 ' + C.world + ')');
  say('군집 수(맵 크기): ' + [7000, 10000, 16583, 20000, 23000].map(z => z + '→' + Math.max(1, Math.floor(Math.min(K.maxCount, z * z / K.areaPerCluster) + 0.35))).join(' ') + '  (maxCount ' + K.maxCount + ', 반지름 ' + K.rMin + '~' + K.rMax + ', 밀도 ' + K.density + ')');
  say('일반 도형 목표(맵 크기): ' + [7000, 10000, 16583, 23000].map(z => z + '→' + Math.round(C.shapeDensity * z * z)).join(' ') + '  (밀도 ' + C.shapeDensity + ')');
  say('점수 배율(봇) ' + B.shapeXp + ' | 급속회복 ' + C.hyperAfter + '초 후 ' + (C.hyperRate * 100).toFixed(1) + '%/초 | 스폰 무적 ' + C.spawnInvuln + '초 | 부활 규칙 ' + C.respawnMode);
  rec('config.botTarget45', Math.min(B.max, B.base + Math.floor(45 * B.perLevel))); rec('config.map11', mapTarget(11));
};

S.shapes = () => {
  const cx = C.world / 2, P = fresh({ x: cx - 3000, y: cx }), owner = {};
  say('=== [shapes] 총알 vs 도형 (기본 총알: 관통 0, 피해 0) ===');
  function hits(type, pen, dmg) {
    const Pl = new Player(); if (pen) Pl.up.pen = pen; if (dmg) Pl.up.bDmg = dmg; if (pen || dmg) Pl.recalc();
    const sh = mkShape(type, cx, cx), sp = Pl.spec; g.shapes = [sh]; g.crashers = []; let n = 0, first = null, survived = null;
    while (sh.hp > 0 && n < 5000) {
      n++; const h0 = sh.hp; g.bullets = [{ x: cx - sh.r - 12, y: cx, vx: 480, vy: 0, r: 8, dmg: sp.dmg, pen: sp.pen, pen0: sp.pen, life: 2, owner, col: '#fff', out: '#000', hits: [] }];
      for (let i = 0; i < 45; i++) g.updateBullets(1 / 60); if (first === null) first = h0 - sh.hp; if (survived === null) survived = g.bullets.length === 1; // 접촉 틱 교환 모델: 총알이 도형을 완전히 지나갈 때까지(0.75초)
    }
    return { n, first: +first.toFixed(2), survived };
  }
  for (const t of ['square', 'triangle', 'pentagon', 'hexagon', 'alpha']) { const r = hits(t); say(t.padEnd(8) + '체력 ' + String(C.shapes[t].hp).padStart(4) + ' → 처치 ' + String(r.n).padStart(4) + '발, 첫 발 피해 ' + r.first + ', 총알이 통과 ' + r.survived); rec('shapes.hits.' + t, r.n); }
  say('(위키 기준: 사각형 2 / 삼각형 5 / 오각형 22발, 육각형 첫 발 3.5)', true);
  const a = hits('hexagon', 7), b = hits('hexagon', 7, 7); say('육각형: 관통 7 → ' + a.n + '발(통과 ' + a.survived + '), 관통 7+피해 7 → ' + b.n + '발'); rec('shapes.hex.pen7dmg7', b.n);
  say('--- 몸통 충돌 1틱 (플레이어 Body 0포인트): 플레이어 받은 피해 / 도형 받은 피해 ---');
  for (const t of ['square', 'triangle', 'pentagon', 'hexagon', 'alpha']) {
    const P2 = fresh({ x: cx, y: cx }); const S2 = C.shapes[t], sh = mkShape(t, cx + P2.r + S2.r - 6, cx); g.shapes = [sh]; const h0 = P2.hp; g.collisionPass(); // fresh()는 매번 새 플레이어를 만듦
    say(t.padEnd(8) + (h0 - P2.hp) + ' / ' + (S2.hp - sh.hp) + '  (기대 ' + S2.dmg + ' / 20)', true); rec('shapes.contact.' + t, h0 - P2.hp);
  }
  { const b0 = C.bots.base, p0 = C.bots.perLevel, H = C.shapes.hexagon; C.bots.base = 0; C.bots.perLevel = 0; fresh({ x: cx - 3000, y: cx }); const sh = mkShape('hexagon', cx, cx, { hp: H.hp * 0.7, nest: false }); g.shapes = [sh]; tick(60); C.bots.base = b0; C.bots.perLevel = p0; const gain = sh.hp - H.hp * 0.7; say('육각형 재생: 체력 ' + (H.hp * 0.7) + ' → 1초 후 ' + sh.hp.toFixed(1) + ' (기대 +' + (H.hp * H.regen).toFixed(0) + ')'); rec('shapes.hex.regen1s', gain); }
};

S.botspawn = () => {
  say('=== [botspawn] 봇 스폰 위치 (4000회) ===');
  const cx = C.world / 2, P = fresh(); setMapSize(mapTarget(1 + C.bots.base)); g.shapes = [];
  const pts = []; let fail = 0, vis = 0, nestBad = 0, out = 0;
  for (let t = 0; t < 4000; t++) {
    g.bots = []; P.x = cx + 1500; P.y = cx - 800; g.cam.x = P.x; g.cam.y = P.y; if (!g.spawnBot(1)) { fail++; continue; }
    const b = g.bots[0]; pts.push([b.x, b.y]); if (g.cam.visible(b.x, b.y, 0)) vis++; if (inNest(b.x, b.y, 899)) nestBad++; if (b.x < MAP.lo || b.x > MAP.hi || b.y < MAP.lo || b.y > MAP.hi) out++;
  }
  const q = [0, 0, 0, 0]; let n1500 = 0, n3000 = 0, sd = 0;
  for (const [x, y] of pts) { q[(x > cx ? 1 : 0) + (y > cx ? 2 : 0)]++; const d = Math.hypot(x - P.x, y - P.y); sd += d; if (d < 1500) n1500++; if (d < 3000) n3000++; }
  say('맵 ' + Math.round(MAP.size) + ' | 표본 ' + pts.length + ' 실패 ' + fail + ' | 화면 안 ' + vis + ' | 맵 밖 ' + out + ' | 둥지(+900) 안 ' + nestBad);
  say('사분면(좌상/우상/좌하/우하) ' + q.join('/') + ' | 플레이어까지 평균 거리 ' + Math.round(sd / pts.length) + ' | 1500 이내 ' + (n1500 / pts.length * 100).toFixed(1) + '% | 3000 이내 ' + (n3000 / pts.length * 100).toFixed(1) + '%');
  rec('botspawn.within1500', n1500 / pts.length * 100); rec('botspawn.fail', fail);
};

S.autofire = () => {
  say('=== [autofire] 사망 시 오토파이어 해제 ===');
  const kd = e => { for (const f of __L.keydown || []) f(Object.assign({ repeat: false, target: { tagName: 'DIV' }, preventDefault() {} }, e)); };
  const P = fresh(); kd({ code: 'KeyE' }); const on = g.input.auto; P.invT = 0; P.hp = 1; P.hurt(5, { kind: 'x' }); const afterDeath = g.input.auto; kd({ code: 'KeyE' }); const deadE = g.input.auto;
  g.start(); const restart = g.input.auto; kd({ code: 'KeyE' }); const again = g.input.auto; g.input.auto = false;
  say('플레이 중 E ' + on + ' → 사망 후 ' + afterDeath + ' → 사망 화면에서 E ' + deadE + ' → 재시작 직후 ' + restart + ' → 플레이 중 E ' + again + '  (기대: true false false false true)');
};

S.nest = () => {
  say('=== [nest] 둥지 구성 / 육각형 재등장 / 일반 도형 종류 비율 ===');
  const N = C.nest; fresh(); const cnt = { hex: 0, alpha: 0, pent: 0 };
  for (const s of g.shapes) if (s.nest) { if (s.kind === 'hexagon') cnt.hex++; else if (s.kind === 'alpha pentagon') cnt.alpha++; else cnt.pent++; }
  say('둥지: 육각형 ' + cnt.hex + '/' + N.hexagons + ' 알파 ' + cnt.alpha + '/' + N.alphaMax + ' 오각형 ' + cnt.pent + '/' + N.pentagons + ' | 둥지 밖 육각형 ' + g.shapes.filter(s => !s.nest && s.kind === 'hexagon').length);
  { const keep = g.shapes; g.shapes = []; const c = {}; for (let i = 0; i < 30000; i++) g.spawnShape(true); for (const s of g.shapes) c[s.kind] = (c[s.kind] || 0) + 1; g.shapes = keep;
    say('둥지 밖 일반 도형 30000개 표본: ' + Object.entries(c).map(([k, v]) => k + ' ' + (v / 300).toFixed(2) + '%').join(' | ') + '  (오각형:육각형 ≈ ' + ((c.pentagon || 0) / Math.max(1, c.hexagon || 0)).toFixed(0) + ':1, 위키 약 50:1)'); rec('nest.pentPerHex', (c.pentagon || 0) / Math.max(1, c.hexagon || 0)); }
  const b0 = C.bots.base, p0 = C.bots.perLevel; C.bots.base = 0; C.bots.perLevel = 0; // 봇 소환 영향 제거
  g.shapes = g.shapes.filter(s => s.kind !== 'hexagon'); const tl = [];
  for (let i = 0; i <= (N.hexagons > 0 ? 60 * 130 : 0); i++) { if (i % 600 === 0) tl.push(Math.round(i / 60) + 's:' + g.shapes.filter(s => s.kind === 'hexagon' && s.nest).length); g.update(1 / 60); }
  C.bots.base = b0; C.bots.perLevel = p0; say(N.hexagons > 0 ? '둥지 육각형을 모두 없앤 뒤 재등장(10초 간격): ' + tl.join(' ') + '  (hexRespawn ' + N.hexRespawn + '초, 최대 ' + N.hexagons + ')' : '둥지 육각형 0개 설정(nest.hexagons = 0): 재등장 검사 생략');
};

S.catchup = () => {
  const B = C.bots, targets = (opt.targets || '5,8,11,14').split(',').map(Number), n = num(opt.n, 5), limit = num(opt.limit, 90), b0 = B.base, p0 = B.perLevel;
  B.base = 0; B.perLevel = 0; // 다른 봇이 자동 소환되지 않게
  say('=== [catchup] 1레벨로 소환된 봇이 목표 레벨까지 걸리는 시간 (봇 1마리씩 단독, 시도 ' + n + '회, 제한 ' + limit + '초, catchUp ' + B.catchUp + ' +' + B.catchUpRamp + '/초) ===');
  try {
    for (const T of targets) {
      const times = [], mul = []; let died = 0, timeout = 0;
      for (let k = 0; k < n; k++) {
        reseed('catchup' + T + '_' + k); fresh();
        let x, y, tries = 0; do { x = MAP.lo + 300 + Math.random() * (MAP.size - 600); y = MAP.lo + 300 + Math.random() * (MAP.size - 600); } while (inNest(x, y, 900) && ++tries < 50);
        const bot = new Bot(x, y, 1, 'CatchUp', T); g.bots = [bot]; let t = null, gone = false;
        for (let i = 1; i <= 60 * limit; i++) {
          g.update(1 / 60);
          if (bot.hp <= 0 || !g.bots.includes(bot)) { died++; gone = true; break; }
          if (bot.level >= T) { t = i / 60; mul.push(B.catchUp + B.catchUpRamp * bot.age); break; }
        }
        if (t !== null) times.push(t); else if (!gone) timeout++;
      }
      say('목표 Lv' + String(T).padStart(2) + ': 도달 ' + times.length + '/' + n + (times.length ? ' | 시간(초) 중앙값 ' + med(times).toFixed(0) + ' 평균 ' + avg(times).toFixed(0) + ' 최대 ' + Math.max(...times).toFixed(0) + ' | 도달 시점 평균 가속 x' + avg(mul).toFixed(1) : '') + ' | 죽음 ' + died + ' | 제한 시간 초과 ' + timeout);
      rec('catchup.t' + T + '.med', times.length ? med(times) : limit); rec('catchup.t' + T + '.reached', times.length);
    }
  } finally { B.base = b0; B.perLevel = p0; }
};

S.traitcheck = () => {
  C.botFight.mode = 'legacy'; // 이 시나리오는 이전(legacy) 방식의 도망 체력·겁내는 레벨 차이를 확인(새 방식은 fightcheck)
  const T = C.botTypes, N = 7000, f2 = x => (+x).toFixed(2), b0 = C.bots.base, p0 = C.bots.perLevel; C.bots.base = 0; C.bots.perLevel = 0; // 다른 봇이 자동 소환되지 않게
  const mkBot = (t, x, y) => { const keep = C.botTypes; C.botTypes = [Object.assign({}, t, { w: 1 })]; const b = new Bot(x, y, 1, 'T'); C.botTypes = keep; return b; }; // 특정 유형의 봇 만들기
  const dummyFor = lv => { const d = mkBot(T[T.length - 1], 0, 0); d.invT = 1e9; d.hp = d.maxHp = 1e9; d.level = lv; d.update = function () { this.age += 1 / 60; }; return d; }; // 움직이지 않는 상대 탱크(무적)
  const setup = (t, D, dlv) => { fresh(); g.player.alive = false; const bot = mkBot(t, MAP.lo + 3000, MAP.lo + 3000); bot.invT = 0; bot.idleT = 0; const d = dummyFor(bot.level + dlv); d.x = bot.x + D; d.y = bot.y; g.bots = [bot, d]; g.shapes = []; g.crashers = []; return { bot, d }; };
  try {
    say('=== [traitcheck] 봇 성격 유형 / 수치 연결 확인 ===');
    fresh(); const cnt = {}, sk = {}; let smin = 9, smax = 0;
    for (let i = 0; i < N; i++) { const b = new Bot(MAP.lo + 500, MAP.lo + 500, 1, 'T'), k = b.pt.n; cnt[k] = (cnt[k] || 0) + 1; (sk[k] = sk[k] || []).push(b.skill); smin = Math.min(smin, b.skill); smax = Math.max(smax, b.skill); }
    say('[1] 유형 분포(' + N + '마리, 기대 각 ' + Math.round(N / T.length) + '): ' + T.map(t => t.n + ' ' + (cnt[t.n] || 0)).join(' | '));
    say('    숙련도 범위 ' + f2(smin) + '~' + f2(smax) + ' (설정 ' + C.botSkill.join('~') + ') | 유형별 평균 ' + T.map(t => t.n + ' ' + f2(avg(sk[t.n] || [0]))).join(' | ')); rec('traitcheck.skillMin', smin); rec('traitcheck.skillMax', smax);
    say('[2] 유형별 파생 값 (식과 일치 여부 포함)');
    for (const t of T) {
      const b = mkBot(t, MAP.lo + 500, MAP.lo + 500), F = C.botFx, ex = { fleeHp: F.fleeHp[0] + F.fleeHp[1] * t.b, fearGap: F.fearGap[0] + F.fearGap[1] * t.b, sightMul: F.sight[0] + F.sight[1] * t.b, chaseT: F.chaseT[0] + F.chaseT[1] * t.p, grudgeT: F.grudgeT[0] + F.grudgeT[1] * t.r };
      const ok = Object.keys(ex).every(k => Math.abs(b[k] - ex[k]) < 1e-9) && b.restHp === undefined;
      say('    ' + t.n.padEnd(6) + ' 대담' + t.b + ' 목표' + t.g + ' 끈기' + t.p + ' 복수' + t.r + ' → 도망 ' + (b.fleeHp * 100).toFixed(0) + '% | 겁내는 레벨차 ' + b.fearGap.toFixed(1) + ' | 시야 ' + Math.round(750 * b.sightMul) + ' | 추격 ' + b.chaseT.toFixed(1) + '초 | 복수 ' + b.grudgeT.toFixed(1) + '초 | ' + (ok ? '식과 일치' : '불일치!'));
    }
    say('[3] 교전 시야: 상대 탱크가 D px 떨어졌을 때 노리는가 (O=노림)');
    for (const t of T) { const rs = [500, 700, 850].map(D => { const { bot, d } = setup(t, D, 0); bot.pickTarget(g); return bot.target === d ? 'O' : 'X'; }); say('    ' + t.n.padEnd(6) + ' 기대 시야 ' + Math.round(750 * (0.7 + 0.6 * t.b)) + ' → 500:' + rs[0] + ' 700:' + rs[1] + ' 850:' + rs[2]); }
    say('[4] 두려움: 상대가 +8 / +12 레벨 높을 때 도주(afraid) 여부 (기대 기준 = 2 + 16 x 대담함 레벨)');
    for (const t of T) { const rs = [8, 12].map(L => { const { bot } = setup(t, 400, L); bot.pickTarget(g); return bot.afraid ? '도주' : '맞섬'; }); say('    ' + t.n.padEnd(6) + ' 기준 ' + (2 + 16 * t.b).toFixed(1) + ' → +8:' + rs[0] + ' +12:' + rs[1]); }
    say('[5] 복수: 시야 밖(시야의 1.2배)에 있는 상대가 나를 때렸을 때 노리는가 → 복수 시간이 지나면 포기하는가');
    for (const t of T) {
      const { bot, d } = setup(t, 1, 0), sight = 750 * bot.sightMul; d.x = bot.x + sight * 1.2; bot.pickTarget(g); const before = bot.target === d;
      bot.hurt(5, d); bot.target = null; bot.kind = ''; bot.pickTarget(g); const after = bot.target === d; bot.grudgeLeft = 0; bot.target = null; bot.kind = ''; bot.pickTarget(g); const expired = bot.target === d;
      say('    ' + t.n.padEnd(6) + ' 복수 ' + bot.grudgeT.toFixed(1) + '초 | 맞기 전 ' + (before ? '노림' : '안 노림') + ' → 맞은 뒤 ' + (after ? '노림' : '안 노림') + ' → 시간 만료 후 ' + (expired ? '노림' : '안 노림'));
    }
    { const A = C.botFx.aim, m0 = A.mode; A.mode = 'legacy'; const { bot } = setup(T[0], 400, 0); let mx = 0; const lim = bot.aimErrMax; for (let i = 0; i < 2000; i++) { bot.pickTarget(g); mx = Math.max(mx, Math.abs(bot.aimErr)); } A.mode = m0; say('[6] 조준 오차(aim.mode=legacy, 이전 방식): 2000번 뽑은 최대 ' + mx.toFixed(4) + ' rad (이 봇의 상한 ' + lim.toFixed(4) + ', 숙련도 ' + f2(bot.skill) + ')'); }
    { const A = C.botFx.aim, m0 = A.mode; A.mode = 'human'; const { bot, d } = setup(T[0], 400, 0); d.invT = 1e9; let mx = 0, ch = 0, pe = 0; for (let i = 0; i < 60 * 20; i++) { bot.ai(1 / 60, g); mx = Math.max(mx, Math.abs(bot.aimErr)); if (Math.abs(bot.aimErr - pe) > 1e-9) ch++; pe = bot.aimErr; } A.mode = m0; const sp = bot.spec, lim = (A.e0 * (1 - bot.skill) + A.ed * Math.min(1, 400 / (sp.bSpeed * sp.life))) * (A.habit[0] + A.habit[1] * bot.habit); say('[6b] 조준 오차(aim.mode=human): 정지한 상대, 20초 최대 ' + mx.toFixed(4) + ' rad (거리 400px 상한 ' + lim.toFixed(4) + ', 숙련도 ' + f2(bot.skill) + ', 습관 ' + f2(bot.habit) + ') | 오차가 바뀐 프레임 ' + ch + '/1200 (계속 변하면 1200에 가까움)'); rec('traitcheck.aimHumanMax', mx); }
    { const { bot } = setup(T[0], 400, 0); g.bots = [bot]; bot.hp = bot.maxHp * 0.1; let sp = 0; const n = 120; for (let i = 0; i < n; i++) { bot.ai(1 / 60, g); sp += Math.hypot(bot.inp.ax, bot.inp.ay); } say('[7] 쉬는 행동 제거: 체력 10%, 대상 없음일 때 평균 이동 속도 비율 ' + (sp / n).toFixed(2) + ' (0이면 멈춰 있음, wander.mode=legacy이면 0.4, natural이면 spdBase + spdK x 목표지향 = ' + (C.botFx.wander.spdBase + C.botFx.wander.spdK * bot.pt.g).toFixed(2) + ')'); rec('traitcheck.lowHpMove', sp / n); }
    say('[8] 추격 유지: 상대(무적, 초속 400)가 도망칠 때 목표를 놓는 시간 (기본 시야 750, 상대 시작 거리 600)');
    for (const t of T) {
      const { bot, d } = setup(t, 600, 0); bot.pickTarget(g); const acq = bot.target === d; let drop = null, dist = 0; // 처음에 목표를 확실히 잡은 상태에서 시작
      for (let i = 1; i <= 60 * 15; i++) { d.x += 400 / 60; g.update(1 / 60); if (i > 5 && bot.target !== d) { drop = i / 60; dist = Math.hypot(d.x - bot.x, d.y - bot.y); break; } }
      say('    ' + t.n.padEnd(6) + ' 끈기 ' + t.p + ' (추격 ' + (2 + 8 * t.p).toFixed(1) + '초, 시야 ' + Math.round(750 * (0.7 + 0.6 * t.b)) + ' x ' + (1 + t.p).toFixed(2) + '배) → ' + (acq ? '' : '(처음 목표 획득 실패) ') + (drop === null ? '15초 동안 놓지 않음' : '놓은 시각 ' + drop.toFixed(1) + '초, 그때 거리 ' + Math.round(dist) + 'px')); rec('traitcheck.chaseDrop.' + t.n, drop === null ? 15 : drop);
    }
  } finally { C.bots.base = b0; C.bots.perLevel = p0; }
};

S.types = o => {
  const modes = {}; let modeN = 0; // 봇 행동 상태 집계
  const sw = { n: 0, flip: 0 }, BP = Bot.prototype, origPick = BP.pickTarget; // 목표 전환(다른 대상으로 바뀜)과 되돌림(A→B→A, 3초 안) 횟수
  const rows = {}, tot = { spawn: 0, died: 0, causes: {} }, tn = b => (b.pt ? b.pt.n : '(유형 없음)'), row = k => rows[k] || (rows[k] = { spawn: 0, died: 0, lifeD: [], lifeA: [], lvA: [], lvD: [], kills: 0 });
  for (let r = 0; r < o.runs; r++) {
    reseed('types' + r); fresh(); const ok = g.onKill.bind(g), os = g.spawnBot;
    g.onKill = e => {
      const k = e.lastHit;
      if (e.isBot) { const R = row(tn(e)); R.died++; tot.died++; R.lifeD.push(e.age); R.lvD.push(e.level); const key = !k ? 'unknown' : k.isBot ? 'bot' : (k.kind || 'player'); tot.causes[key] = (tot.causes[key] || 0) + 1; if (k && k.isBot) row(tn(k)).kills++; }
      return ok(e);
    };
    g.spawnBot = pl => { const res = os.call(g, pl); if (res) { tot.spawn++; row(tn(g.bots[g.bots.length - 1])).spawn++; } return res; };
    BP.pickTarget = function (gm) { const prev = this.target; origPick.call(this, gm); const cur = this.target; if (prev && cur && cur !== prev) { sw.n++; if (cur === this._prevT && g.clock - this._swT < 3) sw.flip++; this._prevT = prev; this._swT = g.clock; } };
    tick(3600 * o.min, i => { if (i % 6) return; for (const b of g.bots) { if (b.hp <= 0 || b.idleT > 0) continue; const k = b.invT > 0 ? '무적' : b.mode === 'flee' ? '도주' : b.mode === 'hunt' ? '사냥' : b.mode === 'farm' ? '파밍' : '배회'; modes[k] = (modes[k] || 0) + 1; modeN++; } }); // 봇 행동 상태 비율 집계(0.1초마다)
    BP.pickTarget = origPick;
    for (const b of g.bots) { const R = row(tn(b)); R.lifeA.push(b.age); R.lvA.push(b.level); }
    delete g.onKill; delete g.spawnBot;
  }
  say('=== [types] 성격 유형별 봇 성과 (플레이어 정지·무적, 봇 정상 수, ' + o.runs + '회 x ' + o.min + '분 = 총 ' + o.runs * o.min + '분) ===');
  const all = []; let aliveN = 0;
  for (const k of Object.keys(rows).sort()) {
    const R = rows[k], life = R.lifeD.concat(R.lifeA); all.push(...life); aliveN += R.lifeA.length;
    say(k.padEnd(8) + ' 소환 ' + String(R.spawn).padStart(3) + ' 사망 ' + String(R.died).padStart(3) + ' (사망/소환 ' + (R.died / Math.max(1, R.spawn) * 100).toFixed(0) + '%) | 평균 수명(생존 포함) ' + avg(life).toFixed(0) + '초 | 사망 시 평균 레벨 ' + avg(R.lvD).toFixed(1) + ' | 끝에 살아있는 봇 ' + R.lifeA.length + '마리 평균 레벨 ' + avg(R.lvA).toFixed(1) + ' | 탱크 처치 ' + R.kills);
    rec('types.' + k + '.deathRate', R.died / Math.max(1, R.spawn) * 100);
  }
  say('합계: 소환 ' + tot.spawn + ' 사망 ' + tot.died + ' (분당 ' + (tot.died / (o.runs * o.min)).toFixed(2) + ') | 사망 원인 ' + JSON.stringify(tot.causes) + ' | 평균 수명(생존 포함) ' + avg(all).toFixed(0) + '초');
  const botMin = all.reduce((a, b) => a + b, 0) / 60; say('목표 전환 ' + sw.n + '회 (봇·분당 ' + (sw.n / Math.max(1, botMin)).toFixed(2) + '), 3초 안에 원래 목표로 되돌아간 전환 ' + sw.flip + '회 (전환의 ' + (sw.flip / Math.max(1, sw.n) * 100).toFixed(0) + '%)');
  say('봇 행동 상태 비율(소환 직후 대기 제외): ' + ['도주', '사냥', '파밍', '배회', '무적'].map(k => k + ' ' + ((modes[k] || 0) / Math.max(1, modeN) * 100).toFixed(1) + '%').join(' | ')); rec('types.fleePct', (modes['도주'] || 0) / Math.max(1, modeN) * 100); rec('types.huntPct', (modes['사냥'] || 0) / Math.max(1, modeN) * 100);
  rec('types.deathsPerMin', tot.died / (o.runs * o.min)); rec('types.lifeAvg', avg(all)); rec('types.switchPerBotMin', sw.n / Math.max(1, botMin)); rec('types.flipPct', sw.flip / Math.max(1, sw.n) * 100);
};

S.knockcheck = () => {
  const cx = C.world / 2, builds = [['기본', 8, 7], ['중간', 26, 16], ['최대', 50, 28]], owner = {}, f0 = x => Math.round(x);
  const shoot = (setup, hpB, d, off) => { // 대상에 총알 한 발(속도 480)을 쏘고 대상의 속도와 총알의 꺾인 각도를 잼
    const P = fresh({ x: cx - 3000, y: cx }); g.bots = []; g.shapes = []; g.crashers = []; const t = setup(); const R = t.r; g.bullets = [{ x: cx - R - 12, y: cx + (off || 0) * R, vx: 480, vy: 0, r: 8, dmg: d, pen: hpB, pen0: hpB, life: 3, owner, col: '#fff', out: '#000', hits: [] }];
    for (let i = 0; i < 45; i++) g.updateBullets(1 / 60); const b = g.bullets[0];
    return { v: Math.hypot(t.vx, t.vy), ang: b ? Math.atan2(b.vy, b.vx) * 180 / Math.PI : null, surv: !!b };
  };
  say('=== [knockcheck] 총알 한 발이 정지한 대상에 주는 속도(px/초) / 정면 사격, bulletPush ' + C.bulletPush + ' (x탱크 ' + C.pushTank + ', x도형 ' + C.pushShape + ', x총알 ' + C.pushBullet + '), bulletDeflect ' + C.bulletDeflect + ' ===');
  say('대상            ' + builds.map(b => b[0].padStart(8)).join(''));
  for (const [k, n] of [['square', '사각형'], ['triangle', '삼각형'], ['pentagon', '오각형'], ['hexagon', '육각형'], ['alpha', '알파']]) {
    const row = builds.map(([, h, d]) => f0(shoot(() => { const sh = mkShape(k, cx, cx); g.shapes = [sh]; return sh; }, h, d).v)); say(n.padEnd(8) + row.map(v => String(v).padStart(8)).join('')); rec('knockcheck.' + k + '.max', row[2]);
  }
  for (const [bp, n] of [[0, 'Body 0 탱크'], [7, 'Body 7 탱크']]) {
    const row = builds.map(([, h, d]) => f0(shoot(() => { const bot = new Bot(cx, cx, 1, 'T'); bot.invT = 0; bot.idleT = 99; bot.up.body = bp; bot.recalc(); bot.hp = bot.maxHp = 1e9; bot.vx = bot.vy = 0; g.bots = [bot]; return bot; }, h, d).v)); say(n.padEnd(10) + row.map(v => String(v).padStart(8)).join(''));
  }
  const inv = shoot(() => { const bot = new Bot(cx, cx, 1, 'T'); bot.invT = 5; bot.idleT = 99; bot.hp = bot.maxHp = 1e9; bot.vx = bot.vy = 0; g.bots = [bot]; return bot; }, 50, 28).v; say('무적 탱크(최대 총알): 속도 ' + f0(inv) + ' (기대 0)'); rec('knockcheck.invulnerable', inv);
  say('비껴 맞을 때 총알의 꺾인 각도(도, 0이 직진): 대상 반지름의 50% 어긋나게 쏨, 최대 총알 / 생존 여부');
  for (const [k, n] of [['square', '사각형'], ['pentagon', '오각형'], ['hexagon', '육각형']]) { const r1 = shoot(() => { const sh = mkShape(k, cx, cx); g.shapes = [sh]; return sh; }, 50, 28, 0.5); say('  ' + n.padEnd(6) + (r1.ang === null ? '총알 소멸' : r1.ang.toFixed(1) + '도') + (r1.surv ? '' : '')); }
  say('(기대: 가벼운 대상일수록 속도가 크고 무거운 육각형·알파는 거의 안 움직임, 정면 사격은 각도 0, 비껴 맞으면 대상 중심 반대쪽(음수)으로 꺾임)');
};

S.dmgrange = () => { // 총알 한 발이 정지한 탱크에 정면으로 맞아 주는 총 피해(대상 체력 감소량) 측정. 대상은 무적이 아니고 체력이 매우 큼
  const cx = C.world / 2, f1 = x => x.toFixed(1), f0 = x => Math.round(x);
  const one = (cls, lvA, upA, lvT, bodyT) => {
    const A = new Player(); A.setLevel(lvA); A.setClass(cls); Object.assign(A.up, upA); A.recalc();
    const T = new Bot(cx, cx, lvT, 'T'); T.up.body = bodyT; T.recalc(); T.hp = T.maxHp = 1e12; T.invT = 0; T.idleT = 1e9; T.vx = T.vy = 0;
    fresh(); g.bots = [T]; g.shapes = []; g.crashers = []; const sp = A.spec, br = A.barrels[0], r = sp.size * (br.size || 1), tx = cx - T.r - 100;
    g.bullets = [{ x: tx, y: cx, vx: sp.bSpeed, vy: 0, v0: sp.bSpeed, r, dmg: sp.dmg, pen: sp.pen, pen0: sp.pen, life: 5, owner: A, col: '#fff', out: '#000', hits: [] }];
    const hp0 = T.hp; for (let i = 0; i < 240 && g.bullets.length; i++) { g.updateBullets(1 / 60); if (g.bullets[0] && g.bullets[0].x > cx + 400) break; }
    return { d: hp0 - T.hp, sp, ticks: sp.dmg ? (hp0 - T.hp) / sp.dmg : 0 };
  };
  const classes = Object.keys(C.classes), pts = [0, 3, 7], bodies = [0, 3, 7], lv = [1, 15, 45];
  let n = 0, sum = 0, mn = { d: 1e9 }, mx = { d: -1 }; const byCls = {}, rows = [];
  for (const cls of classes) for (const lA of lv) for (const bd of pts) for (const pn of pts) for (const bs of pts) for (const bt of bodies) for (const lT of lv) {
    if (bd + pn + bs > pointsFor(lA) || bt > pointsFor(lT)) continue; /* 그 레벨에서 가질 수 있는 포인트만 */
    const r = one(cls, lA, { bDmg: bd, pen: pn, bSpeed: bs }, lT, bt), rec0 = { d: r.d, cls, lA, bd, pn, bs, bt, lT, dmg: r.sp.dmg, pen: r.sp.pen, v: r.sp.bSpeed };
    n++; sum += r.d; (byCls[cls] = byCls[cls] || []).push(r.d); if (r.d < mn.d) mn = rec0; if (r.d > mx.d) mx = rec0; rows.push(rec0);
  }
  say('=== [dmgrange] 총알 한 발의 총 피해(정지한 탱크에 정면 직격) | 조합 ' + n + '개: 클래스 5 x 공격자 레벨 {1,15,45} x Bullet Damage·Penetration·Bullet Speed 포인트 {0,3,7}(합이 그 레벨의 포인트 이하) x 대상 Body Damage 포인트 {0,3,7}(그 레벨의 포인트 이하) x 대상 레벨 {1,15,45} ===');
  const show = (t, r) => say(t + ' ' + f1(r.d) + ' | ' + r.cls + ' 공격자 Lv' + r.lA + ' (피해 포인트 ' + r.bd + ', 관통 ' + r.pn + ', 속도 ' + r.bs + ') → 대상 Lv' + r.lT + ' (Body ' + r.bt + ') | 틱당 피해 ' + f1(r.dmg) + ', 총알 체력 ' + f1(r.pen) + ', 속도 ' + f0(r.v));
  show('최소', mn); show('최대', mx); say('평균(조합 평균) ' + f1(sum / n));
  const sorted = rows.map(r => r.d).sort((a, b) => a - b), q = p => sorted[Math.floor((sorted.length - 1) * p)]; say('분위수: 5% ' + f1(q(0.05)) + ' | 25% ' + f1(q(0.25)) + ' | 중앙값 ' + f1(q(0.5)) + ' | 75% ' + f1(q(0.75)) + ' | 95% ' + f1(q(0.95)) + ' | 최대/최소 ' + f1(mx.d / mn.d) + '배');
  for (const c of classes) { const a = byCls[c]; say('  ' + c.padEnd(8) + ' 최소 ' + f1(Math.min(...a)) + ' | 평균 ' + f1(a.reduce((x, y) => x + y, 0) / a.length) + ' | 최대 ' + f1(Math.max(...a))); }
  const hpT = r => 50 + 2 * (r.lT - 1), one1 = rows.filter(r => r.d >= hpT(r)); // 대상 최대 체력 = 50 + 2 x (레벨 - 1) (Max Health 포인트 0 가정, 가장 약한 경우)
  say('한 발에 대상 최대 체력(Max Health 0포인트)을 넘는 조합: ' + one1.length + '/' + n + ' (' + f1(100 * one1.length / n) + '%), 대상이 Lv1인 경우만: ' + rows.filter(r => r.lT === 1 && r.d >= 50).length + '/' + rows.filter(r => r.lT === 1).length);
  for (const cap of [40, 60, 80, 100, 120]) { const cs = rows.map(r => Math.min(r.d, cap)); say('  최대 피해 ' + cap + '로 제한하면: 평균 ' + f1(cs.reduce((x, y) => x + y, 0) / n) + ' (' + f1(100 * (1 - cs.reduce((x, y) => x + y, 0) / sum)) + '% 감소), 영향받는 조합 ' + f1(100 * rows.filter(r => r.d > cap).length / n) + '%, 최대/최소 ' + f1(cap / mn.d) + '배'); }
  for (const T of [3, 4, 5, 6]) { const cs = rows.map(r => Math.min(r.d, r.dmg * T)), mx2 = Math.max(...cs), mn2 = Math.min(...cs); say('  한 대상에 주는 접촉 틱을 ' + T + '틱으로 제한하면: 최소 ' + f1(mn2) + ' | 평균 ' + f1(cs.reduce((x, y) => x + y, 0) / n) + ' (' + f1(100 * (1 - cs.reduce((x, y) => x + y, 0) / sum)) + '% 감소) | 최대 ' + f1(mx2) + ', 영향받는 조합 ' + f1(100 * rows.filter(r => r.d > r.dmg * T + 1e-6).length / n) + '%, 최대/최소 ' + f1(mx2 / mn2) + '배'); }
  const A0 = new Player(); const ub = C.stats.find(x => x.k === 'bDmg'), up = C.stats.find(x => x.k === 'pen'), bo = C.stats.find(x => x.k === 'body');
  say('이론 상한(접촉이 총알 체력이 다할 때까지 이어질 때) = 틱당 피해 x 총알 체력 ÷ 대상 방어(Body) = (' + (ub.base + 7 * ub.per) + ') x (' + (up.base + 7 * up.per) + ' x ' + C.bulletHp + ') ÷ ' + bo.base + ' = ' + f1((ub.base + 7 * ub.per) * (up.base + 7 * up.per) * C.bulletHp / bo.base) + ' (기본 Tank 클래스 기준)');
  say('기준 비교(대상 Lv1 Body 0): 0포인트 Lv1 Tank ' + f1(one('tank', 1, {}, 1, 0).d) + ' | Lv45 피해 7포인트만 ' + f1(one('tank', 45, { bDmg: 7 }, 1, 0).d) + ' | 관통 7포인트만 ' + f1(one('tank', 45, { pen: 7 }, 1, 0).d) + ' | 피해+관통 7포인트 ' + f1(one('tank', 45, { bDmg: 7, pen: 7 }, 1, 0).d) + ' | 피해+관통+속도 7포인트 ' + f1(one('tank', 45, { bDmg: 7, pen: 7, bSpeed: 7 }, 1, 0).d));
  rec('dmgrange.min', mn.d); rec('dmgrange.avg', sum / n); rec('dmgrange.max', mx.d);
};

S.bodycheck = () => { // 몸통 충돌 물리 측정: 플레이어(레벨 L)가 정지한 대상 쪽으로 3초 동안 계속 전진
  const cx = C.world / 2, f1 = x => x.toFixed(1), L = num(opt.level, 1), out = {};
  const run = (label, make) => {
    const P = fresh({ x: cx - 250, y: cx, level: L }); g.bots = []; g.shapes = []; g.crashers = []; const T = make(); P.invT = 0; P.hp = P.maxHp = 1e9;
    g.input.axis = () => [1, 0]; const x0 = P.x, t0 = T.x; let contact = 0, vSum = 0, maxPen = 0, rev = 0; const lastX = []; // contact = 겹친 프레임 수, rev = 속도가 뒤로 향한 프레임 수
    for (let i = 1; i <= 180; i++) {
      g.update(1 / 60); if (g.shapes.length && g.shapes[0] !== T && label.startsWith('도형')) g.shapes = [T]; if (T.hp < T.maxHp * 0.5 && T.maxHp < 1e8) T.hp = T.maxHp; // 대상이 죽지 않게 체력을 되돌림
      const pen = P.r + T.r - Math.hypot(T.x - P.x, T.y - P.y); if (pen > 0) { contact++; vSum += P.vx; maxPen = Math.max(maxPen, pen); if (P.vx < 0) rev++; }
      if (i > 150) lastX.push(P.x);
    }
    const v = (lastX[lastX.length - 1] - lastX[0]) / ((lastX.length - 1) / 60);
    say(label.padEnd(26) + ' | 플레이어 이동 ' + f1(P.x - x0).padStart(6) + 'px | 마지막 0.5초 평균 속도 ' + f1(v).padStart(6) + ' | 대상 밀림 ' + f1(T.x - t0).padStart(6) + 'px | 접촉 ' + String(contact).padStart(3) + '/180프레임, 접촉 중 평균 vx ' + f1(contact ? vSum / contact : 0).padStart(6) + ', 뒤로 향한 프레임 ' + rev + ', 최대 겹침 ' + f1(maxPen));
    out[label] = { dist: P.x - x0, v, push: T.x - t0, contact }; return P;
  };
  say('=== [bodycheck] 플레이어 Lv' + L + '이 정지한 대상(정면 250px)을 향해 3초 동안 계속 전진 | 자유 이동 최고 속도 약 ' + f1(new Player().s.move) + ' ===');
  for (const t of ['square', 'triangle', 'pentagon', 'hexagon', 'alpha']) run('도형 ' + t, () => { const sh = mkShape(t, cx, cx, { calm: 0, hp: 1e9, maxHp: 1e9 }); g.shapes = [sh]; return sh; });
  for (const [lab, dl] of [['탱크 같은 레벨', 0], ['탱크 +10레벨', 10]]) run('탱크 ' + lab.slice(3), () => { const keep = C.botTypes; const b = new Bot(cx, cx, 1 + L - 1 + dl, 'D'); b.idleT = 1e9; b.invT = 1e9; b.x = cx; b.y = cx; b.hp = b.maxHp = 1e9; g.bots = [b]; return b; });
  rec('bodycheck', JSON.stringify(out));
};

S.sanity = o => {
  const frames = Math.round(3600 * o.min), fin = Number.isFinite;
  say('=== [sanity] 이상 상태 감시 (' + o.min + '분, 플레이어가 무작위로 움직이며 가장 가까운 대상을 조준·사격, 체력 무한) ===');
  const P = fresh({ x: C.world / 2 - 2500, y: C.world / 2, level: o.level }); P.aim = function () {}; // 조준을 직접 지정(--level로 시작 레벨 지정)
  let dx = 1, dy = 0; g.input.axis = () => [dx, dy];
  const bad = {}, note = (k, m) => { const b = bad[k] || (bad[k] = { n: 0, first: m }); b.n++; };
  const st = { maxTankV: 0, maxShapeV: 0, maxCrV: 0, maxBulV: 0, maxBul: 0, minShapes: 1e9, maxShapes: 0, minBots: 1e9, maxBots: 0, minMap: 1e9, maxMap: 0, maxMapStep: 0, maxUpd: 0, sumUpd: 0 };
  const prevScore = new WeakMap(); let prevMap = MAP.size, shotFrames = 0, nearFrames = 0;
  for (let i = 1; i <= frames; i++) {
    if (i % 120 === 1) { const a = Math.random() * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); }
    let best = null, bd = 1400;
    for (const arr of [g.bots, g.crashers, g.shapes]) for (const e of arr) { if (e.hp <= 0) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < bd) { bd = d; best = e; } }
    if (best) { P.angle = Math.atan2(best.y - P.y, best.x - P.x); g.input.down = true; nearFrames++; } else g.input.down = false;
    const t0 = process.hrtime.bigint(); g.update(1 / 60); const ms = Number(process.hrtime.bigint() - t0) / 1e6; st.sumUpd += ms; if (ms > st.maxUpd) st.maxUpd = ms;
    if (i % 3) continue;
    const lo = MAP.lo, hi = MAP.hi;
    for (const tk of [P, ...g.bots]) {
      if (!fin(tk.x) || !fin(tk.y) || !fin(tk.vx) || !fin(tk.vy) || !fin(tk.hp)) { note('탱크 좌표·속도·체력이 숫자가 아님', (tk.name || 'player') + ' @' + (i / 60).toFixed(1) + 's'); continue; }
      const v = Math.hypot(tk.vx, tk.vy); if (v > st.maxTankV) st.maxTankV = v; if (v > 2500) note('탱크 속도 2500 초과', (tk.name || 'player') + ' ' + Math.round(v) + ' @' + (i / 60).toFixed(1) + 's');
      if (tk.hp > tk.maxHp + 1e-6 && tk !== P) note('체력이 최대치 초과', tk.name + ' ' + tk.hp.toFixed(1) + '/' + tk.maxHp.toFixed(1));
      if (tk.x < lo - tk.r - 5 || tk.x > hi + tk.r + 5 || tk.y < lo - tk.r - 5 || tk.y > hi + tk.r + 5) note('탱크가 맵 밖', (tk.name || 'player') + ' (' + Math.round(tk.x) + ',' + Math.round(tk.y) + ') 맵 ' + Math.round(lo) + '~' + Math.round(hi));
      if (tk !== P) { if (tk.hp <= 0) note('죽은 봇이 목록에 남음', tk.name); const ps = prevScore.get(tk); if (ps !== undefined && tk.score < ps - 1e-6) note('봇 점수가 줄어듦', tk.name + ' ' + ps.toFixed(0) + '→' + tk.score.toFixed(0)); prevScore.set(tk, tk.score); }
    }
    for (const s of g.shapes) {
      if (!fin(s.x) || !fin(s.y) || !fin(s.vx) || !fin(s.vy) || !fin(s.hp) || !fin(s.r)) { note('도형 좌표·속도·체력이 숫자가 아님', s.kind); continue; }
      const v = Math.hypot(s.vx, s.vy); if (v > st.maxShapeV) st.maxShapeV = v; if (v > 1500) note('도형 속도 1500 초과', s.kind + ' ' + Math.round(v));
      if (s.hp > s.maxHp + 1e-6) note('도형 체력이 최대치 초과', s.kind + ' ' + s.hp.toFixed(1));
      if (s.hp <= 0) note('죽은 도형이 목록에 남음', s.kind);
      if (s.x < lo - s.r - 300 || s.x > hi + s.r + 300 || s.y < lo - s.r - 300 || s.y > hi + s.r + 300) note('도형이 맵 밖 300px 초과', s.kind + ' (' + Math.round(s.x) + ',' + Math.round(s.y) + ')');
    }
    for (const c of g.crashers) {
      if (!fin(c.x) || !fin(c.y) || !fin(c.vx) || !fin(c.vy) || !fin(c.hp)) { note('크래셔 좌표·속도·체력이 숫자가 아님', ''); continue; }
      const v = Math.hypot(c.vx, c.vy); if (v > st.maxCrV) st.maxCrV = v; if (v > 2000) note('크래셔 속도 2000 초과', Math.round(v));
      if (c.hp <= 0) note('죽은 크래셔가 목록에 남음', '');
    }
    for (const b of g.bullets) {
      if (!fin(b.x) || !fin(b.y) || !fin(b.vx) || !fin(b.vy) || !fin(b.pen) || !fin(b.r)) { note('총알 값이 숫자가 아님', ''); continue; }
      const v = Math.hypot(b.vx, b.vy); if (v > st.maxBulV) st.maxBulV = v; if (v > 3000) note('총알 속도 3000 초과', Math.round(v));
      if (b.pen <= 0) note('체력이 0 이하인 총알이 남음', b.pen.toFixed(2));
    }
    if (g.bullets.length > 520) note('총알 수 520 초과', g.bullets.length);
    st.maxBul = Math.max(st.maxBul, g.bullets.length); st.minShapes = Math.min(st.minShapes, g.shapes.length); st.maxShapes = Math.max(st.maxShapes, g.shapes.length);
    st.minBots = Math.min(st.minBots, g.bots.length); st.maxBots = Math.max(st.maxBots, g.bots.length);
    st.minMap = Math.min(st.minMap, MAP.size); st.maxMap = Math.max(st.maxMap, MAP.size);
    const step = Math.abs(MAP.size - prevMap) / (3 / 60); prevMap = MAP.size; if (step > st.maxMapStep) st.maxMapStep = step; if (step > C.map.rate * 1.5 + 1) note('맵 크기 변화 속도 초과', Math.round(step) + 'px/초');
    if (MAP.size < C.map.min - 1 || MAP.size > C.map.max + 1) note('맵 크기가 허용 범위 밖', Math.round(MAP.size));
  }
  const keys = Object.keys(bad);
  say('플레이어: 레벨 ' + P.level + ', 점수 ' + Math.round(P.score) + ', 대상을 조준한 프레임 ' + (nearFrames / frames * 100).toFixed(0) + '%');
  say('봇 수 ' + st.minBots + '~' + st.maxBots + ' | 도형 수 ' + st.minShapes + '~' + st.maxShapes + ' | 총알 최대 ' + st.maxBul + ' | 맵 한 변 ' + Math.round(st.minMap) + '~' + Math.round(st.maxMap) + ' (변화 속도 최대 ' + Math.round(st.maxMapStep) + 'px/초)');
  say('최대 속도(px/초): 탱크 ' + Math.round(st.maxTankV) + ' | 도형 ' + Math.round(st.maxShapeV) + ' | 크래셔 ' + Math.round(st.maxCrV) + ' | 총알 ' + Math.round(st.maxBulV));
  say('update 시간(프레임당 ms): 평균 ' + (st.sumUpd / frames).toFixed(2) + ' | 최대 ' + st.maxUpd.toFixed(1));
  if (!keys.length) say('감시 결과: 이상 없음'); else { say('감시 결과: 이상 ' + keys.length + '종'); for (const k of keys) say('  ! ' + k + ' — ' + bad[k].n + '회 (첫 사례: ' + bad[k].first + ')'); }
  rec('sanity.issues', keys.length); rec('sanity.maxTankV', st.maxTankV); rec('sanity.maxShapeV', st.maxShapeV); rec('sanity.updMs', st.sumUpd / frames);
};

S.ttk = () => {
  const cx = C.world / 2, DIST = 400, ZERO = { regen: 0, maxHp: 0, body: 0, bSpeed: 0, pen: 0, bDmg: 0, reload: 0, move: 0 };
  const shooters = [['Lv1 기본', 1, {}], ['Lv15 (재장전·피해·관통 3)', 15, { reload: 3, bDmg: 3, pen: 3 }], ['Lv45 (재장전·피해·관통 7)', 45, { reload: 7, bDmg: 7, pen: 7 }]];
  const targets = [['Lv1 (체력 0, 몸통 0)', 1, {}], ['Lv15 (체력 3, 몸통 2)', 15, { maxHp: 3, body: 2 }], ['Lv45 (체력 7, 몸통 7)', 45, { maxHp: 7, body: 7 }]];
  say('=== [ttk] 탱크 처치 시간: Tank 클래스 사수가 가만히 선 대상을 정면 ' + DIST + 'px에서 연사 (대상은 반격·이동 없음, 회복 포함) ===');
  say('사수 \\ 대상'.padEnd(30) + targets.map(t => t[0].padStart(24)).join(''));
  for (const [sn, sl, sup] of shooters) {
    const row = [];
    for (const [tn, tl, tup] of targets) {
      const P = fresh({ x: cx - DIST, y: cx }); g.shapes = []; P.setLevel(sl); Object.assign(P.up, ZERO, sup); P.recalc(); P.hp = P.maxHp = 1e9; P.aim = function () {}; P.angle = 0; P.x = cx - DIST; P.y = cx; g.input.down = true;
      const bot = new Bot(cx, cx, 1, 'T'); for (let L = 2; L <= tl; L++) bot.addXp(C.scoreAt[L] - bot.score); Object.assign(bot.up, ZERO, tup); bot.recalc(); bot.invT = 0; bot.idleT = 1e9; bot.hp = bot.maxHp; bot.vx = bot.vy = 0; bot.x = cx; bot.y = cx; g.bots = [bot];
      let shots = 0; const os = g.shoot, b0 = C.bots.base, p0 = C.bots.perLevel; C.bots.base = 0; C.bots.perLevel = 0; g.shoot = function (...a) { if (a[0] === P) shots++; return os.apply(this, a); }; // 사수의 발사만 세고 다른 봇 소환은 막음
      let frames = 0, dead = false; const hp0 = bot.maxHp;
      while (frames < 60 * 60 && !dead) { g.update(1 / 60); frames++; if (bot.hp <= 0 || !g.bots.includes(bot)) dead = true; if (g.bots.length && g.bots[0] !== bot) g.bots = [bot]; }
      g.shoot = os; C.bots.base = b0; C.bots.perLevel = p0; g.input.down = false;
      row.push(dead ? (frames / 60).toFixed(1) + '초, ' + shots + '발 (체력 ' + Math.round(hp0) + ')' : '60초 안에 못 죽임 (체력 ' + Math.round(hp0) + ')');
      rec('ttk.' + sl + '.' + tl, dead ? frames / 60 : 999);
    }
    say(sn.padEnd(30) + row.map(c => c.padStart(24)).join(''));
  }
};

S.memorycheck = () => {
  const BF = C.botFight, F = C.botFx, T = C.botTypes, b0 = C.bots.base, p0 = C.bots.perLevel; C.bots.base = 0; C.bots.perLevel = 0;
  const mkBot = (t, x, y) => { const keep = C.botTypes; C.botTypes = [Object.assign({}, t, { w: 1 })]; const b = new Bot(x, y, 1, 'T'); C.botTypes = keep; return b; };
  const dummy = (L, x, y) => { const d = mkBot(T[T.length - 1], x, y); d.invT = 1e9; d.hp = d.maxHp = 1e9; d.level = L; d.score = 60; d.update = function () { this.age += 1 / 60; }; return d; };
  const adiffT = (a, b) => ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; // 각도 차이(-pi ~ pi)
  fresh(); g.player.alive = false; g.shapes = []; g.crashers = [];
  const bal = T.find(x => x.n === '균형형');
  const setup = () => { const bot = mkBot(bal, MAP.lo + 3000, MAP.lo + 3000); for (let l = 2; l <= 15; l++) bot.addXp(C.scoreAt[l] - bot.score); bot.invT = 0; bot.idleT = 0; bot.hp = bot.maxHp; bot.holdLeft = 0; bot.decLeft = 0; bot.threat = null; bot.think = 99; bot.t = 99; g.bots = [bot]; g.shapes = []; return bot; };
  let bad = 0; const chk = (ok, msg) => { say('    ' + (ok ? 'OK  ' : '(!) ') + msg); if (!ok) bad++; };
  say('=== [memorycheck] 도주 후 위협 기억(' + BF.fleeMemory + '초, 구역 반지름 = 시야 x ' + BF.threatMul + ')과 도형 후보 들어오는/벗어나는 거리(' + F.farmIn + ' / ' + F.farmOut + ') ===');
  say('[1] 도주를 시작하면 상대의 마지막 위치를 기억');
  { const bot = setup(), d = dummy(45, bot.x + 500, bot.y); g.bots.push(d); bot.pickTarget(g); chk(bot.mode === 'flee', 'Lv45 상대가 500px 거리에 있으면 도주 (모드 ' + bot.mode + ')'); chk(!!bot.threat && bot.threat.en === d && Math.abs(bot.threat.x - d.x) < 1e-6, '기억에 상대와 위치가 저장됨'); chk(!!bot.threat && Math.abs(bot.threat.until - (bot.age + BF.fleeMemory)) < 1e-6, '기억 시간 = 지금 + ' + BF.fleeMemory + '초'); }
  say('[2] 기억 중에는 위협 구역의 도형이 후보에서 빠지고, 기억이 끝나면 돌아옴');
  { const bot = setup(), d = dummy(45, bot.x + 500, bot.y); g.bots.push(d); bot.pickTarget(g); g.bots = [bot];
    const A = mkShape('square', bot.x + 450, bot.y + 100), B = mkShape('square', bot.x - 850, bot.y); g.shapes = [A, B]; bot.pickTarget(g);
    chk(bot.target === B, '위협 구역 안의 가까운 도형(A, 461px)은 제외되고 반대쪽 도형(B, 850px)을 노림 (목표 ' + (bot.target === A ? 'A' : bot.target === B ? 'B' : '없음') + ')');
    bot.age += BF.fleeMemory + 0.1; bot.holdLeft = 0; bot.pickTarget(g); chk(bot.target === A && bot.threat === null, '기억이 끝나면 가까운 도형 A를 다시 노림 (목표 ' + (bot.target === A ? 'A' : bot.target === B ? 'B' : '없음') + ')'); }
  say('[3] 파밍·배회 중 위협 구역 안이면 바깥으로 밀려나며 속도가 오름 (배회 속도 0.4 기준)');
  for (const [wa, name] of [[0, '위협 쪽으로 배회 중'], [Math.PI, '위협 반대쪽으로 배회 중']]) { const bot = setup(), d = dummy(45, bot.x + 300, bot.y); bot.wa = wa; bot.ai(1 / 60, g); const ax0 = bot.inp.ax; bot.threat = { x: bot.x + 300, y: bot.y, en: d, until: bot.age + 5 }; bot.ai(1 / 60, g); const ax1 = bot.inp.ax; chk(ax1 < ax0 - 1e-6, name + ': 가로 이동 입력 ' + ax0.toFixed(2) + ' → ' + ax1.toFixed(2) + ' (작아지거나 반대쪽으로 더 빨라져야 함)'); }
  say('[4] 배회 방향이 위협 쪽이면 반대로 돌림');
  { const bot = setup(), d = dummy(45, bot.x + 300, bot.y); bot.threat = { x: bot.x + 300, y: bot.y, en: d, until: bot.age + 5 }; g.clusters = []; let toward = 0; for (let i = 0; i < 300; i++) { const a = bot.wanderDir(g); if (Math.abs(adiffT(a, 0)) < 1 - 0.51) toward++; } chk(toward === 0, '위협이 바로 앞(0도)에 있을 때 위협 쪽 ±0.49라디안 안으로 향한 배회 방향 ' + toward + '번 (300번 중, 0이어야 함)'); }
  say('[5] 도형 후보에 들어오는 거리(' + F.farmIn + ')와 유지하는 거리(' + F.farmOut + ')');
  { const bot = setup(), S = mkShape('square', bot.x + 1000, bot.y); g.shapes = [S]; bot.target = null; bot.mode = ''; bot.pickTarget(g); chk(bot.target === null, '목표가 없을 때 1000px 도형은 새로 노리지 않음 (들어오는 거리 ' + F.farmIn + ')');
    bot.target = S; bot.kind = 'shape'; bot.mode = 'farm'; bot.holdLeft = 0; bot.pickTarget(g); chk(bot.target === S, '이미 노리는 1000px 도형은 유지 (벗어나는 거리 ' + F.farmOut + ')');
    S.x = bot.x + F.farmOut + 100; bot.holdLeft = 0; bot.pickTarget(g); chk(bot.target === null, (F.farmOut + 100) + 'px로 멀어지면 놓음'); }
  say('[6] 위협 기억을 끄면(fleeMemory = 0) 이전과 같음');
  { const keep = BF.fleeMemory; BF.fleeMemory = 0; const bot = setup(), d = dummy(45, bot.x + 500, bot.y); g.bots.push(d); bot.pickTarget(g); chk(bot.mode === 'flee' && bot.threat === null, '도주는 하지만 기억은 저장되지 않음'); BF.fleeMemory = keep; }
  say('확인 결과: 기대와 다른 경우 ' + bad + '건' + (bad ? '  (!)' : '  → 모두 일치'));
  rec('memorycheck.mismatch', bad); C.bots.base = b0; C.bots.perLevel = p0;
};

S.aicheck = o => {
  const BP = Bot.prototype, origPick = BP.pickTarget, FW = 20, PW = 6, RE = 10; // FW: 싸움 결과를 기다리는 시간(초), PW: 도주 뒤 생존을 확인하는 시간, RE: 같은 상대에게 다시 도주하면 재교전으로 보는 시간
  const fights = [], flees = [], dw = {}, tr = {}, cnt = { botSec: 0, ntr: 0, rapid: 0, flip: 0, sw: 0, fleeStart: 0 }, wd = [], nb = [0, 0, 0, 0], rp = {}; // wd: 배회 방문 시간, nb: 파밍>배회 전이 때 가장 가까운 도형 거리 구간, rp: 3초 안 되돌림 패턴
  let act = [], flAct = [], post = [];
  const catOf = b => !b.target ? '배회' : b.kind === 'tank' ? (b.mode === 'flee' ? '도주' : '싸움') : '파밍';
  const dead = b => b.hp <= 0 || b.gone, sightOf = b => 750 * b.sightMul / b.def.fov, ratioOf = x => x.hp < x.maxHp ? x.hp / x.maxHp : 1;
  const endFight = (ep, res) => { ep.res = res; fights.push(ep); const i = act.indexOf(ep); if (i >= 0) act.splice(i, 1); };
  const endFlee = (ep, res, now) => { ep.res = res; ep.dur = now - ep.t0; flees.push(ep); const i = flAct.indexOf(ep); if (i >= 0) flAct.splice(i, 1); ep.me._lf = { en: ep.en, t: now }; if (!/사망/.test(res)) post.push({ ep, until: now + PW }); };
  for (let run = 0; run < o.runs; run++) {
    reseed('aicheck' + run); fresh(); act = []; flAct = []; post = [];
    BP.pickTarget = function (gm) {
      const pm = this.mode, pt = this.target, pk = this.kind; origPick.call(this, gm);
      if (this.idleT > 0) return;
      const now = g.clock, cat = catOf(this), a = this._ai || (this._ai = { cat, last: null, t0: now });
      if (cat !== a.cat) { // 상태 전이 기록과 빠른 되돌림(3초 안 A→B→A) 검출
        const key = a.cat + '>' + cat; tr[key] = (tr[key] || 0) + 1; cnt.ntr++;
        if (a.cat === '배회') wd.push(now - a.t0); // 배회를 끝낼 때 그 방문의 길이
        if (a.cat === '파밍' && cat === '배회') { let nd = Infinity; for (const sh of g.shapes) { const dd = Math.hypot(sh.x - this.x, sh.y - this.y); if (dd < nd) nd = dd; } nb[nd < 900 ? 0 : nd < 1200 ? 1 : nd < 1500 ? 2 : 3]++; } // 파밍을 잃은 순간 가장 가까운 도형까지의 거리
        a.t0 = now;
        if (a.last && a.last.from === cat && a.last.to === a.cat && now - a.last.t < 3) { cnt.rapid++; { const pk = cat + '>' + a.cat + '>' + cat; rp[pk] = (rp[pk] || 0) + 1; } if ((cat === '싸움' && a.cat === '도주') || (cat === '도주' && a.cat === '싸움')) cnt.flip++; }
        a.last = { from: a.cat, to: cat, t: now }; a.cat = cat;
      }
      if (pm === 'flee' && pk === 'tank' && (this.mode !== 'flee' || this.target !== pt)) { // 도주 종료: 어떻게 끝났는지 분류
        const ep = flAct.find(e => e.me === this);
        if (ep) endFlee(ep, this.mode === 'hunt' && this.target === pt ? '싸움으로 전환' : (!pt || dead(pt)) ? '상대 사망' : this.target === pt ? '기타' : Math.hypot(pt.x - this.x, pt.y - this.y) > sightOf(this) * 1.2 ? '탈출(거리)' : '다른 대상으로 전환', now);
      }
      const T = this.target;
      if (this.kind === 'tank' && T && T !== g.player && (this.mode === 'hunt' || this.mode === 'flee') && (this.mode !== pm || T !== pt)) { // 새 싸움·도주 판단(플레이어는 정지·무적이라 제외)
        const base = { me: this, en: T, t0: now, R: this.matchup(T), ty: this.pt ? this.pt.n : '?', lm: this.level, le: T.level, pmy: this.hp / this.maxHp, pen: ratioOf(T), sw: false };
        if (this.mode === 'hunt') act.push(base);
        else { for (const e of act) if (e.me === this) { e.sw = true; cnt.sw++; } const d0 = Math.hypot(T.x - this.x, T.y - this.y), lf = this._lf; base.d0 = d0; base.dmax = d0; base.re = !!(lf && lf.en === T && now - lf.t < RE); base.chased = T.target === this; /* chased: 재교전 때 상대가 나를 쫓고 있었는지 */ flAct.push(base); cnt.fleeStart++; }
      }
    };
    tick(3600 * o.min, i => {
      if (i % 6) return; const now = g.clock;
      for (const b of g.bots) { if (b.hp <= 0 || b.idleT > 0) continue; const c = catOf(b); dw[c] = (dw[c] || 0) + 0.1; cnt.botSec += 0.1; }
      for (const ep of act.slice()) { const me = ep.me, en = ep.en; if (dead(en)) endFight(ep, en.lastHit === me ? '승' : '상대가 다른 적에게 사망'); else if (dead(me)) endFight(ep, me.lastHit === en ? '패' : '내가 다른 적에게 사망'); else if (now - ep.t0 >= FW) endFight(ep, '미결'); }
      for (const ep of flAct.slice()) { const me = ep.me, en = ep.en; if (dead(me)) { endFlee(ep, me.lastHit === en ? '추격자에게 사망' : '다른 적에게 사망', now); continue; } if (dead(en)) { endFlee(ep, '상대 사망', now); continue; } const d = Math.hypot(en.x - me.x, en.y - me.y); if (d > ep.dmax) ep.dmax = d; }
      for (const q of post.slice()) { const me = q.ep.me; if (dead(me)) { q.ep.post = me.lastHit === q.ep.en ? '추격자' : '다른 적'; post.splice(post.indexOf(q), 1); } else if (now >= q.until) post.splice(post.indexOf(q), 1); }
    });
    BP.pickTarget = origPick;
    for (const ep of act) { ep.res = '미결'; fights.push(ep); } // 실행이 끝날 때 진행 중인 싸움은 미결로 처리(진행 중인 도주는 제외)
  }
  const pc = (n, d) => (d ? (n / d * 100).toFixed(0) : '-') + '%', botMin = cnt.botSec / 60;
  say('=== [aicheck] 봇 AI 측정 (플레이어 정지·무적이라 봇끼리의 교전만 집계, 봇 정상 수, ' + o.runs + '회 x ' + o.min + '분 = 총 ' + o.runs * o.min + '분, 싸움 결과 대기 ' + FW + '초, 도주 뒤 생존 확인 ' + PW + '초, 재교전 기준 ' + RE + '초) ===');
  const bins = [[0, 0.3, '< 0.3'], [0.3, 0.5, '0.3~0.5'], [0.5, 0.8, '0.5~0.8'], [0.8, 1.2, '0.8~1.2'], [1.2, 2, '1.2~2'], [2, 4, '2~4'], [4, 1e9, '>= 4']];
  say('[1] 싸움 판단의 정확도: 싸우기로 한 시점의 R 구간별 20초 안의 결과 (승 = 내가 상대를 처치, 패 = 상대에게 처치됨, 승률 = 승 ÷ (승 + 패))');
  say('    R 구간      건수   승   패  내가 다른 적에게 사망  상대가 다른 적에게 사망  미결   승률');
  const row = (label, list) => { const c = k => list.filter(e => e.res === k).length, w = c('승'), l = c('패'); say('    ' + label.padEnd(10) + String(list.length).padStart(5) + String(w).padStart(5) + String(l).padStart(5) + String(c('내가 다른 적에게 사망')).padStart(14) + String(c('상대가 다른 적에게 사망')).padStart(20) + String(c('미결')).padStart(8) + String(pc(w, w + l)).padStart(7)); return [w, l]; };
  for (const [lo, hi, lb] of bins) row(lb, fights.filter(e => e.R >= lo && e.R < hi));
  const [W1, L1] = row('전체', fights), dec = fights.filter(e => e.res === '승' || e.res === '패'), okN = dec.filter(e => (e.R >= 1) === (e.res === '승')).length;
  say('    결판이 난 싸움 ' + dec.length + '건 중 "R이 1 이상이면 승, 미만이면 패" 예측이 맞은 비율 ' + pc(okN, dec.length) + ' | 싸우기로 한 뒤 도주로 바뀐 싸움 ' + cnt.sw + '건 (' + pc(cnt.sw, fights.length) + ')');
  say('[2] 도주 성공률: 도주 시작부터 종료까지');
  const kinds = ['탈출(거리)', '싸움으로 전환', '다른 대상으로 전환', '상대 사망', '기타'], types = [...new Set(flees.map(e => e.ty))].sort();
  say('    유형        건수 탈출(거리) 싸움 전환 다른 대상 상대 사망 도주 중 사망 탈출 뒤 ' + PW + '초 내 사망  재교전 평균 지속(초)');
  const frow = (label, list) => { const c = k => list.filter(e => e.res === k).length, dd = list.filter(e => /사망/.test(e.res) && e.res !== '상대 사망').length, po = list.filter(e => e.post).length, re = list.filter(e => e.re).length; say('    ' + label.padEnd(8) + String(list.length).padStart(6) + String(c('탈출(거리)')).padStart(9) + String(c('싸움으로 전환')).padStart(8) + String(c('다른 대상으로 전환')).padStart(9) + String(c('상대 사망')).padStart(8) + String(dd).padStart(10) + String(po).padStart(16) + String(re).padStart(8) + String(avg(list.map(e => e.dur || 0)).toFixed(1)).padStart(10)); return { n: list.length, esc: c('탈출(거리)'), dd, po, re }; };
  for (const ty of types) frow(ty, flees.filter(e => e.ty === ty));
  const F = frow('전체', flees);
  say('    도주 시작 R 평균 ' + avg(flees.map(e => e.R)).toFixed(2) + ' | 시작 거리 평균 ' + avg(flees.map(e => e.d0 || 0)).toFixed(0) + 'px | 도주 중 도달한 최대 거리 평균 ' + avg(flees.map(e => e.dmax || 0)).toFixed(0) + 'px | 봇·분당 도주 시작 ' + (cnt.fleeStart / Math.max(1e-6, botMin)).toFixed(2) + '회');
  say('    도주 종료 뒤 같은 상대에게 ' + RE + '초 안에 다시 도주한 경우(재교전) ' + F.re + '건 (' + pc(F.re, F.n) + ')');
  { const reL = flees.filter(e => e.re); say('    재교전 ' + reL.length + '건 중 상대가 쫓아온 경우(상대의 목표가 나) ' + reL.filter(e => e.chased).length + '건 | 봇이 스스로 돌아간 경우 ' + reL.filter(e => !e.chased).length + '건'); rec('aicheck.reengageReturned', reL.filter(e => !e.chased).length); }
  say('[3] 상태 전이와 떨림 (배회·파밍·싸움·도주)');
  const cats = ['배회', '파밍', '싸움', '도주'], visits = k => Object.keys(tr).filter(x => x.endsWith('>' + k)).reduce((a, x) => a + tr[x], 0);
  say('    상태별 시간 비중 / 한 번에 머문 평균 시간: ' + cats.map(k => k + ' ' + ((dw[k] || 0) / Math.max(1e-6, cnt.botSec) * 100).toFixed(1) + '% / ' + ((dw[k] || 0) / Math.max(1, visits(k))).toFixed(1) + '초').join(' | '));
  say('    봇·분당 상태 전이 ' + (cnt.ntr / Math.max(1e-6, botMin)).toFixed(2) + '회 | 3초 안 되돌림(A→B→A) ' + (cnt.rapid / Math.max(1e-6, botMin)).toFixed(2) + '회 (전이의 ' + pc(cnt.rapid, cnt.ntr) + ') | 그중 싸움↔도주 되돌림 ' + (cnt.flip / Math.max(1e-6, botMin)).toFixed(2) + '회');
  say('    자주 일어나는 전이: ' + Object.keys(tr).sort((a, b) => tr[b] - tr[a]).slice(0, 6).map(k => k + ' ' + tr[k]).join(' | '));
  say('    3초 안 되돌림 패턴 상위: ' + (Object.keys(rp).sort((a, b) => rp[b] - rp[a]).slice(0, 5).map(k => k + ' ' + rp[k]).join(' | ') || '없음'));
  { const w3 = wd.filter(x => x < 3).length, w10 = wd.filter(x => x >= 3 && x < 10).length, wl = wd.filter(x => x >= 10).length; say('    배회 방문 ' + wd.length + '회: 3초 미만 ' + pc(w3, wd.length) + ' | 3~10초 ' + pc(w10, wd.length) + ' | 10초 이상 ' + pc(wl, wd.length) + ' | 평균 ' + avg(wd).toFixed(1) + '초'); rec('aicheck.wanderShortPct', wd.length ? w3 / wd.length * 100 : 0); }
  { const nt = nb.reduce((a, b) => a + b, 0); say('    파밍>배회 전이 ' + nt + '회 중 가장 가까운 도형까지의 거리: 900 미만 ' + pc(nb[0], nt) + ' | 900~1200 ' + pc(nb[1], nt) + ' | 1200~1500 ' + pc(nb[2], nt) + ' | 1500 이상 ' + pc(nb[3], nt) + '  (900~1200 구간이 farmOut으로 막을 수 있는 몫)'); rec('aicheck.farmBoundaryPct', nt ? nb[1] / nt * 100 : 0); }
  rec('aicheck.fights', fights.length); rec('aicheck.fightAcc', dec.length ? okN / dec.length * 100 : 0); rec('aicheck.fleeN', F.n); rec('aicheck.fleeEscapePct', F.n ? F.esc / F.n * 100 : 0); rec('aicheck.fleeDeadPct', F.n ? F.dd / F.n * 100 : 0); rec('aicheck.reengagePct', F.n ? F.re / F.n * 100 : 0); rec('aicheck.rapidPerBotMin', cnt.rapid / Math.max(1e-6, botMin));
};

S.fightcheck = () => {
  const B = C.botFight, T = C.botTypes, b0 = C.bots.base, p0 = C.bots.perLevel; C.bots.base = 0; C.bots.perLevel = 0;
  const off = L => Math.pow(1 + (L - 1) / B.offBase, B.offPow), f2 = x => (+x).toFixed(2);
  const mkBot = (t, x, y) => { const keep = C.botTypes; C.botTypes = [Object.assign({}, t, { w: 1 })]; const b = new Bot(x, y, 1, 'T'); C.botTypes = keep; return b; };
  const dummy = (L, fe, x, y) => { const d = mkBot(T[T.length - 1], x, y); d.invT = 1e9; d.hp = d.maxHp = 1e9; d.level = L; d.score = 60; d.hp = d.maxHp * fe; d.update = function () { this.age += 1 / 60; }; return d; };
  fresh(); g.player.alive = false; g.shapes = []; g.crashers = [];
  const setup = (t, L, fm) => { const bot = mkBot(t, MAP.lo + 3000, MAP.lo + 3000); for (let l = 2; l <= L; l++) bot.addXp(C.scoreAt[l] - bot.score); bot.invT = 0; bot.idleT = 0; bot.hp = bot.maxHp * fm; bot.holdLeft = 0; bot.decLeft = 0; g.bots = [bot]; return bot; };
  say('=== [fightcheck] 봇의 싸움·도주 판단 (전투 우위 R, 모드 ' + B.mode + ') ===');
  let bad = 0;
  say('[1] 판단표: 기준 이상이면 싸움(hunt), 아니면 도주(flee). 상대는 거리 300, 새로 마주친 상태. 열 = 안전농부 / 균형형 / 돌격형');
  const scs = [['Lv15 대 Lv15, 체력 100%/100%', 15, 1, 15, 1], ['Lv15 대 Lv20, 100%/100%', 15, 1, 20, 1], ['Lv20 대 Lv15, 100%/100%', 20, 1, 15, 1], ['Lv30(내 30%) 대 Lv30(100%)', 30, 0.3, 30, 1], ['Lv15(100%) 대 Lv30(체력 20%)', 15, 1, 30, 0.2], ['Lv15(50%) 대 Lv15(50%)', 15, 0.5, 15, 0.5], ['Lv10 대 Lv30, 100%/100%', 10, 1, 30, 1]];
  const names = ['안전농부', '균형형', '돌격형'].map(n => T.find(x => x.n === n));
  for (const [nm, lm, fm, le, fe] of scs) {
    const cells = [];
    for (const ty of names) {
      const bot = setup(ty, lm, fm), d = dummy(le, fe, bot.x + 300, bot.y); g.bots.push(d); bot.pickTarget(g);
      const R = bot.matchup(d), Rx = fm * off(lm) / (fe * off(le)), expFight = R >= bot.fightThr, act = bot.mode, ok = act === (expFight ? 'hunt' : 'flee') && Math.abs(R - Rx) < 1e-6; if (!ok) bad++;
      cells.push(f2(R) + ' ' + (act === 'hunt' ? '싸움' : act === 'flee' ? '도주' : act || '없음') + (ok ? '' : ' (!)'));
    }
    say('    ' + nm.padEnd(34) + cells.map(c => c.padEnd(14)).join(''));
  }
  say('    기준(안전/균형/돌격) = ' + names.map(ty => f2(mkBot(ty, 0, 0).fightThr)).join(' / ') + '  (R이 이 이상이면 싸움)');
  say('[2] ±' + B.hyst * 100 + '% 여유: 유지 시간이 끝난 뒤 (균형형 Lv15). 싸움 중이면 R이 기준 x ' + (1 - B.hyst) + ' 밑이어야 도주, 도주 중이면 기준 x ' + (1 + B.hyst) + ' 이상이어야 싸움');
  const bal = names[1], decide = (prev, mul, dec) => { const bot = setup(bal, 15, 1), d = dummy(15, 1, bot.x + 300, bot.y); g.bots.push(d); const want = mul * bot.fightThr; if (want <= 1) bot.hp = bot.maxHp * want; else d.hp = d.maxHp / want; /* 목표 R이 내 체력만으로 안 되면 상대 체력 비율을 낮춰서 맞춤 */ bot.target = d; bot.kind = 'tank'; bot.mode = prev; bot.decLeft = dec; bot.holdLeft = 0; bot.pickTarget(g); return { mode: bot.mode, R: bot.matchup(d) }; };
  for (const [prev, mul, exp] of [['hunt', 0.9, 'hunt'], ['hunt', 0.8, 'flee'], ['flee', 1.1, 'flee'], ['flee', 1.2, 'hunt']]) { const o = decide(prev, mul, 0), ok = o.mode === exp; if (!ok) bad++; say('    ' + (prev === 'hunt' ? '싸움 중' : '도주 중') + ', R = 기준 x ' + mul + ' (R ' + f2(o.R) + ') → ' + (o.mode === 'hunt' ? '싸움' : o.mode === 'flee' ? '도주' : o.mode) + ' (기대 ' + (exp === 'hunt' ? '싸움' : '도주') + ')' + (ok ? '' : '  (!)')); }
  say('[3] 최소 유지 시간(싸움 ' + B.fightHold + '초, 도주 ' + B.fleeHold + '초): 남은 시간이 있으면 R이 기준을 넘나들어도 판단 유지, 끝나면 바뀜');
  for (const [prev, mul, dec, exp] of [['hunt', 0.2, 1.5, 'hunt'], ['hunt', 0.2, 0, 'flee'], ['flee', 3, 1.5, 'flee'], ['flee', 3, 0, 'hunt']]) { const o = decide(prev, mul, dec), ok = o.mode === exp; if (!ok) bad++; say('    ' + (prev === 'hunt' ? '싸움 중' : '도주 중') + ', R = 기준 x ' + mul + ', 남은 유지 시간 ' + dec + '초 → ' + (o.mode === 'hunt' ? '싸움' : o.mode === 'flee' ? '도주' : o.mode) + ' (기대 ' + (exp === 'hunt' ? '싸움' : '도주') + ')' + (ok ? '' : '  (!)')); }
  say('[4] 유지 시간 중에도 다른 적에 대한 새 도주 판단은 즉시 적용');
  { const bot = setup(bal, 15, 1), a = dummy(5, 1, bot.x + 300, bot.y), c = dummy(45, 1, bot.x, bot.y + 400); g.bots.push(a, c); bot.target = a; bot.kind = 'tank'; bot.mode = 'hunt'; bot.decLeft = 1.5; bot.holdLeft = 1.5; bot.pickTarget(g); const ok = bot.mode === 'flee' && bot.target === c; if (!ok) bad++; say('    약한 상대(Lv5)와 싸우는 중(유지 시간 1.5초 남음)에 Lv45가 나타남 → ' + (bot.mode === 'flee' && bot.target === c ? 'Lv45에게서 도주' : '모드 ' + bot.mode) + (ok ? '' : '  (!)')); }
  say('쉬움 보정 = clamp(R ÷ (' + B.easeDiv + ' x 기준), ' + B.easeMin + ', ' + B.easeMax + ')');
  say('판단 확인 결과: 기대와 다른 경우 ' + bad + '건' + (bad ? '  (!)' : '  → 모두 일치'));
  rec('fightcheck.mismatch', bad); C.bots.base = b0; C.bots.perLevel = p0;
};

S.clashcheck = () => {
  const cx = C.world / 2, A = {}, B = {}, modes = ['instant', 'mass'], keep = C.bulletClashMode;
  const bl = (x, y, vx, d, owner) => ({ x, y, vx, vy: 0, r: d[2], dmg: d[0], pen: d[1], pen0: d[1], life: 3, owner, col: '#fff', out: '#000', hits: [] });
  const basic = [7, 8, 10.4], twin = [4.55, 7.2, 8.84], max = [28, 50, 10.4];
  const cases = [['기본 대 기본 (정면)', basic, basic, 0], ['Tank 대 Twin (정면)', basic, twin, 0], ['기본 대 피해7·관통7 (정면)', basic, max, 0], ['피해7·관통7 끼리 (정면)', max, max, 0], ['피해7·관통7 끼리 (반지름만큼 어긋남: 방향 고정 확인)', max, max, 10.4], ['기본 대 기본 (반지름만큼 어긋남)', basic, basic, 10.4]];
  say('=== [clashcheck] 총알끼리 충돌: 서로 336px/초로 마주 날아와 부딪힌 뒤 0.5초 (instant = 이전 방식, mass = 새 방식) ===');
  for (const [name, a, b, off] of cases) {
    say(name);
    for (const m of modes) {
      C.bulletClashMode = m; fresh({ x: MAP.lo + 800, y: MAP.lo + 800 }); g.shapes = []; g.bots = []; g.crashers = [];
      const ba = bl(cx - 120, cx, 336, a, A), bb = bl(cx + 120, cx + off, -336, b, B); g.bullets = [ba, bb];
      for (let i = 0; i < 30; i++) g.updateBullets(1 / 60);
      const f = x => g.bullets.includes(x) ? '체력 ' + x.pen.toFixed(1) + ', 속도 ' + Math.hypot(x.vx, x.vy).toFixed(0) + ', 방향 ' + (Math.atan2(x.vy, x.vx) * 180 / Math.PI).toFixed(0) + '도' : '소멸';
      say('    ' + m.padEnd(8) + 'A(→) ' + f(ba) + '  |  B(←) ' + f(bb));
    }
  }
  C.bulletClashMode = keep;
};

S.rulecheck = () => {
  const ZERO = { regen: 0, maxHp: 0, body: 0, bSpeed: 0, pen: 0, bDmg: 0, reload: 0, move: 0 }, cx = C.world / 2, b0 = C.bots.base, p0 = C.bots.perLevel; C.bots.base = 0; C.bots.perLevel = 0;
  say('=== [rulecheck] 최근 바꾼 규칙 확인 ===');
  // 1) 총알 속도·크기 (기대: 속도 = (480 + 45 x 포인트) x 클래스 x ' + C.bulletSpeedMul + ', 크기 = 8 x 1.01^(레벨-1) x 포신 x ' + C.bulletSizeMul + ')
  const specOf = (lv, bs) => { const P = new Player(); if (lv > 1) P.setLevel(lv); Object.assign(P.up, ZERO, { bSpeed: bs }); P.recalc(); return P.spec; };
  const rows = [[1, 0], [1, 7], [45, 0]].map(([lv, bs]) => { const sp = specOf(lv, bs), expV = (480 + 45 * bs) * C.bulletSpeedMul, expR = 8 * Math.pow(1.01, lv - 1) * C.bulletSizeMul; return `Lv${lv} 속도포인트 ${bs}: 속도 ${sp.bSpeed.toFixed(1)}(기대 ${expV.toFixed(1)}) 크기 ${sp.size.toFixed(2)}(기대 ${expR.toFixed(2)})`; });
  say('[1] 총알 스펙 — ' + rows.join(' | '));
  // 2) 반동이 속도·크기 배율의 영향을 받지 않는지: 현재 설정과 배율 1.0 설정에서 첫 발의 반동 크기를 비교
  const recoilOf = () => { const P = fresh({ x: cx, y: cx }); g.shapes = []; P.up && Object.assign(P.up, ZERO); P.recalc(); P.hp = P.maxHp = 1e9; P.aim = function () {}; P.angle = 0; g.input.down = true; g.update(1 / 60); g.input.down = false; return Math.hypot(P.recX, P.recY); };
  const rNow = recoilOf(), sm = C.bulletSpeedMul, zm = C.bulletSizeMul; C.bulletSpeedMul = 1; C.bulletSizeMul = 1; const rOne = recoilOf(); C.bulletSpeedMul = sm; C.bulletSizeMul = zm;
  say('[2] 반동(첫 발, Tank 레벨 1): 현재 설정 ' + rNow.toFixed(2) + ' / 속도·크기 배율 1.0 설정 ' + rOne.toFixed(2) + (Math.abs(rNow - rOne) < 0.01 * Math.max(1, rOne) ? '  → 같음(배율의 영향 없음)' : '  → 다름(!)'));
  // 3) 체력 회복: 맞은 직후부터 항상 회복하는지, 15초 뒤 급속 회복인지
  const regenOf = pts => { fresh({ x: cx, y: cx }); g.shapes = []; const bx = MAP.lo + 800, by = MAP.lo + 800, bot = new Bot(bx, by, 1, 'T'); // 둥지의 크래셔가 시험 대상을 공격하지 않게 모서리에 두고 크래셔를 비움
     Object.assign(bot.up, ZERO, { regen: pts }); bot.recalc(); bot.invT = 0; bot.idleT = 1e9; bot.hp = bot.maxHp * 0.3; bot.sinceHit = 0; g.bots = [bot]; const mh = bot.maxHp, out = []; let h = bot.hp;
    for (let s = 1; s <= 18; s++) { for (let i = 0; i < 60; i++) { g.update(1 / 60); g.crashers = []; if (g.bots[0] !== bot) g.bots = [bot]; } if (s === 1 || s === 5 || s === 16 || s === 17) { out.push([s, (bot.hp - h) / mh * 100]); } h = bot.hp; }
    return out; };
  for (const pts of [0, 3, 7]) { const o = regenOf(pts), exp = (0.03 + 0.12 * pts) / 30 * 100; say(`[3] 체력 회복 Regen ${pts}포인트: 맞은 직후 1초 +${o[0][1].toFixed(2)}%(기대 ${exp.toFixed(2)}%) | 5초째 +${o[1][1].toFixed(2)}% | 16초째 +${o[2][1].toFixed(2)}% | 17초째 +${o[3][1].toFixed(2)}% (기대 급속 ${(C.hyperRate * 100).toFixed(1)}%)`); }
  // 3b) 플레이어 본인의 회복(레벨별 초당 회복량, HP 단위): 봇과 같은 코드를 쓰는지 확인
  for (const lv of [1, 15, 45]) { const row = []; for (const pts of [0, 3, 7]) { fresh({ x: MAP.lo + 800, y: MAP.lo + 800 }); g.shapes = []; const P = g.player; if (lv > 1) P.setLevel(lv); Object.assign(P.up, ZERO, { regen: pts }); P.recalc(); P.invT = 0; P.hp = P.maxHp * 0.5; P.sinceHit = 0; const h0 = P.hp; for (let i = 0; i < 300; i++) { g.update(1 / 60); g.crashers = []; } row.push(`Regen ${pts}: 초당 ${((P.hp - h0) / 5).toFixed(2)} HP (최대 ${Math.round(P.maxHp)})`); }
    say(`[3b] 플레이어 Lv${lv} 맞은 직후 5초간 회복 — ` + row.join(' | ')); }
  // 4) 성장 가속 상한: 목표 레벨 최소 점수를 넘어서 오르지 않는지 (큰 도형 점수 375 = 육각형 1500 x 0.25)
  let capBad = 0, cases = 0; for (const T of [5, 10, 14]) for (let sc = 0; sc < C.scoreAt[T]; sc += 7) for (const raw of [2.5, 32.5, 375]) { const b = new Bot(cx, cx, T, 'T'); b.score = sc; b.level = (() => { let L = 1; while (L < C.maxLevel && C.scoreAt[L + 1] <= sc) L++; return L; })(); b.age = 20; const gain = b.catchGain(raw), after = sc + gain; cases++; if (after > Math.max(C.scoreAt[T], sc + raw) + 1e-6 || gain < raw - 1e-6) capBad++; }
  say('[4] 성장 가속 상한 검사: ' + cases + '가지 중 목표 레벨을 넘거나 기본 획득량보다 적은 경우 ' + capBad + '건' + (capBad ? '  (!)' : '  → 이상 없음'));
  // 5) 맵 크기 기준 (계획된 탱크 수)
  C.bots.base = b0; C.bots.perLevel = p0; const keepL = g.player.level; const m = [1, 5, 10, 20, 30, 45].map(L => { g.player.level = L; const n = g.plannedTanks(); return `Lv${L}→계획 ${n}대, 맵 ${Math.round(mapTarget(n))}`; }); g.player.level = keepL;
  say('[5] 계획된 탱크 수와 목표 맵 크기: ' + m.join(' | '));
  // 6) 부활 레벨
  say('[6] 부활 레벨(규칙 ' + C.respawnMode + '): ' + [1, 5, 10, 15, 23, 30, 45].map(L => `Lv${L}→${respawnLevel(L)}`).join(' | '));
  C.bots.base = b0; C.bots.perLevel = p0;
};

S.buildcheck = () => {
  const T = C.botTypes, N = 2000, keys = C.stats.map(s => s.k);
  say('=== [buildcheck] 성격 유형별 능력치 투자와 클래스 선택 (레벨 2→45 단계적 성장, 유형별 ' + N + '마리) ===');
  say('유형        ' + keys.map(k => k.padStart(8)).join('') + '  | 클래스 Twin/Sniper/MG/Flank, 같은 유형 가중치 동일');
  for (const t of T) {
    const sum = {}; keys.forEach(k => sum[k] = 0); const cc = {}; let w0 = null, same = true;
    for (let i = 0; i < N; i++) {
      const keep = C.botTypes; C.botTypes = [Object.assign({}, t, { w: 1 })]; const b = new Bot(MAP.lo + 500, MAP.lo + 500, 1, 'T'); C.botTypes = keep;
      const wj = JSON.stringify(b.wt); if (w0 === null) w0 = wj; else if (wj !== w0) same = false;
      for (let L = 2; L <= 45; L++) b.addXp(C.scoreAt[L] - b.score); // 레벨 15에서 클래스를 고르는 순서를 그대로 거침
      for (const k of keys) sum[k] += b.up[k]; cc[b.cls] = (cc[b.cls] || 0) + 1;
    }
    const pc = c => ((cc[c] || 0) / N * 100).toFixed(0) + '%';
    say(t.n.padEnd(8) + ' ' + keys.map(k => (sum[k] / N).toFixed(1).padStart(8)).join('') + '  | ' + pc('twin') + '/' + pc('sniper') + '/' + pc('machine') + '/' + pc('flank') + ', ' + (same ? '예' : '아니오'));
    rec('buildcheck.' + t.n + '.maxHp', sum.maxHp / N);
  }
  say('(기대: 유형별 평균은 계산값과 비슷(Reload 5.0~6.7, Max Health 3.2~5.7 등), 클래스 비율은 모든 유형 30/20/30/20 안팎, 같은 유형의 가중치는 클래스 선택 전 모두 같음)');
};

S.scorecheck = () => {
  const T = C.botTypes, F = C.botFx, b0 = C.bots.base, p0 = C.bots.perLevel; C.bots.base = 0; C.bots.perLevel = 0;
  const sat = x => 1 - Math.exp(-x / F.scoreScale), f2 = x => (+x).toFixed(2);
  const mkBot = (t, x, y) => { const keep = C.botTypes; C.botTypes = [Object.assign({}, t, { w: 1 })]; const b = new Bot(x, y, 1, 'T'); C.botTypes = keep; return b; };
  const dummy = (t, lv) => { const d = mkBot(t, 0, 0); d.invT = 1e9; d.hp = d.maxHp = 1e9; d.level = lv; d.score = 60; d.update = function () { this.age += 1 / 60; }; return d; };
  const setup = t => { fresh(); g.player.alive = false; const bot = mkBot(t, MAP.lo + 3000, MAP.lo + 3000); bot.invT = 0; bot.idleT = 0; g.bots = [bot]; g.shapes = []; g.crashers = []; return bot; };
  const keepClusters = g.clusters;
  try {
    say('=== [scorecheck] 점수제 목표 선택 확인 (2단계) ===');
    say('[1] 선호: 같은 거리(300px)에 오각형과 같은 레벨 탱크(점수 60)가 있을 때 무엇을 노리는가 (기대는 점수식으로 계산)');
    let okN = 0;
    for (const t of T) {
      const bot = setup(t), d = dummy(T[T.length - 1], bot.level); d.x = bot.x; d.y = bot.y - 300; d.hp = d.maxHp * 0.3; g.bots.push(d); const pent = mkShape('pentagon', bot.x + 300, bot.y); g.shapes = [pent];
      bot.pickTarget(g); const obs = bot.target === d ? '탱크' : bot.target === pent ? '오각형' : '없음';
      const R1 = bot.matchup(d), ez = Math.max(C.botFight.easeMin, Math.min(C.botFight.easeMax, R1 / (C.botFight.easeDiv * bot.fightThr))), tk = sat((40 + 0.5 * 60) * 2 * t.g * ez / 450), pe = sat(130 * 2 * (1 - t.g) / 450), exp = tk > pe ? '탱크' : '오각형'; if (obs === exp) okN++;
      say('    ' + t.n.padEnd(6) + ' 탱크 ' + f2(tk) + ' / 오각형 ' + f2(pe) + ' → 기대 ' + exp + ', 실제 ' + obs + (obs === exp ? '' : '  (불일치!)'));
    }
    rec('scorecheck.prefOk', okN);
    say('[2] 도주 우선: 레벨이 30 높은 탱크가 400px, 오각형이 200px에 있을 때 (모든 유형이 도주해야 함)');
    for (const t of T) { const bot = setup(t), d = dummy(T[T.length - 1], bot.level + 30); d.x = bot.x + 400; d.y = bot.y; g.bots.push(d); g.shapes = [mkShape('pentagon', bot.x, bot.y + 200)]; bot.pickTarget(g); say('    ' + t.n.padEnd(6) + ' 목표 ' + (bot.target === d ? '그 탱크' : bot.target ? '도형' : '없음') + ', 모드 ' + (bot.mode || '-') + ', afraid ' + bot.afraid); }
    say('[3] 낮은 체력: 체력 10%, 같은 레벨 탱크가 400px에 있을 때 (도주해야 함)');
    for (const t of T) { const bot = setup(t), d = dummy(T[T.length - 1], bot.level); d.x = bot.x + 400; d.y = bot.y; g.bots.push(d); bot.hp = bot.maxHp * 0.1; bot.pickTarget(g); say('    ' + t.n.padEnd(6) + ' 도망 기준 ' + (bot.fleeHp * 100).toFixed(0) + '% → 모드 ' + (bot.mode || '-') + ', afraid ' + bot.afraid); }
    say('[4] 떨림 방지: 현재 목표 A(오각형 400px). (가) B가 조금 더 가까움(370px), (나) B가 훨씬 가까움(100px)+유지 시간 없음, (다) 같은 B+유지 시간 2초 남음');
    for (const t of T) {
      const res = [];
      for (const [bd, hold] of [[370, 0], [100, 0], [100, 2]]) {
        const bot = setup(t), A = mkShape('pentagon', bot.x + 400, bot.y), Bsh = mkShape('pentagon', bot.x, bot.y - bd); g.shapes = [A, Bsh]; bot.target = A; bot.kind = 'shape'; bot.mode = 'farm'; bot.holdLeft = hold; bot.pickTarget(g); res.push(bot.target === A ? 'A 유지' : bot.target === Bsh ? 'B로 교체' : '없음');
      }
      say('    ' + t.n.padEnd(6) + ' 유지 보너스 x' + f2(1.2 + 0.6 * t.p) + ', 최소 유지 ' + f2(1 + 2 * t.p) + '초 → (가) ' + res[0] + ' | (나) ' + res[1] + ' | (다) ' + res[2] + '   (기대: A 유지 | B로 교체 | A 유지)');
    }
    say('[5] 배회 방향: 탱크(동쪽 2000px)와 도형 군집(북쪽 2000px)이 있을 때 4000번 뽑은 방향 비율 (기대: 탱크 쪽 = 목표지향 g, 군집 쪽 = 1 − g)');
    for (const t of T) {
      const bot = setup(t), d = dummy(T[T.length - 1], 1); d.x = bot.x + 2000; d.y = bot.y; g.bots.push(d); g.clusters = [{ x: bot.x, y: bot.y - 2000, r: 600 }]; let nt = 0, nc = 0;
      for (let i = 0; i < 4000; i++) { const a = bot.wanderDir(g); if (Math.abs(Math.atan2(Math.sin(a - 0), Math.cos(a - 0))) < 0.6) nt++; else if (Math.abs(Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2))) < 0.6) nc++; }
      say('    ' + t.n.padEnd(6) + ' g ' + t.g + ' → 탱크 쪽 ' + (nt / 40).toFixed(0) + '% (기대 ' + (t.g * 100).toFixed(0) + '%), 군집 쪽 ' + (nc / 40).toFixed(0) + '% (기대 ' + ((1 - t.g) * 100).toFixed(0) + '%)');
    }
  } finally { C.bots.base = b0; C.bots.perLevel = p0; g.clusters = keepClusters; }
};

S.pop = o => {
  const B = C.bots, agg = { deaths: {}, lv: { '<5': 0, '5-14': 0, '15-29': 0, '30+': 0 }, spawn: 0, died: [], alive: [], xpShape: 0, xpTank: 0, kills: { alpha: [], hexagon: [] }, free: [], clu: [], snaps: {}, f45: [] };
  const marks = [5, 10, 15, 20, 25, 30].filter(m => m <= o.min); for (const m of marks) agg.snaps[m] = [];
  for (let r = 0; r < o.runs; r++) {
    reseed('pop' + r); fresh(); const t0 = g.clock, born = new Map(); let f45 = null; const ok = g.onKill.bind(g), os = g.spawnBot;
    g.onKill = e => {
      const k = e.lastHit;
      if (k && k.addXp && k.hp > 0 && k.isBot) { if (e.isBot) agg.xpTank += 40 + e.score * 0.5; else { const base = e.s.xp * B.shapeXp; agg.xpShape += k.catchGain ? k.catchGain(base) : (k.catchMul ? base * k.catchMul() : base); } }
      if (k && k.isBot && (e.kind === 'alpha pentagon' || e.kind === 'hexagon')) agg.kills[e.kind === 'hexagon' ? 'hexagon' : 'alpha'].push(((g.clock - t0) / 60).toFixed(1) + '분:Lv' + k.level);
      if (e.isBot) { const key = !k ? 'unknown' : k.isBot ? 'bot' : (k.kind || 'player'); agg.deaths[key] = (agg.deaths[key] || 0) + 1; const L = e.level; agg.lv[L < 5 ? '<5' : L < 15 ? '5-14' : L < 30 ? '15-29' : '30+']++; agg.died.push(g.clock - (born.has(e) ? born.get(e) : t0)); }
      return ok(e);
    };
    g.spawnBot = pl => { const res = os.call(g, pl); if (res) { agg.spawn++; born.set(g.bots[g.bots.length - 1], g.clock); } return res; };
    tick(3600 * o.min, i => {
      if (i % 600 === 0) { let free = 0, clu = 0; for (const s of g.shapes) { if (s.nest) continue; if (s.cl) clu++; else free++; } const fT = Math.round(C.shapeDensity * MAP.size ** 2), cT = g.clusters.reduce((a, c) => a + c.target, 0); agg.free.push(free / fT); agg.clu.push(clu / Math.max(1, cT)); }
      for (const m of marks) if (i === m * 3600) agg.snaps[m].push(g.bots.map(b => b.level).sort((a, b) => b - a));
      if (f45 === null && g.bots.some(b => b.level >= 45)) f45 = i / 3600;
    });
    for (const b of g.bots) agg.alive.push(g.clock - (born.has(b) ? born.get(b) : t0)); // 살아남은 봇도 수명에 포함(절단 표시)
    if (f45 !== null) agg.f45.push(+f45.toFixed(1)); delete g.onKill; delete g.spawnBot;
  }
  say('=== [pop] 봇 개체군 (플레이어 정지·무적, ' + o.runs + '회 x ' + o.min + '분) ===');
  for (const m of marks) { const a = agg.snaps[m]; say(m + '분: 봇수 ' + a.map(x => x.length).join('/') + ' | 최고 ' + a.map(x => x[0] || 0).join('/') + ' | 2위 ' + a.map(x => x[1] || 0).join('/') + ' | 중앙값 ' + a.map(x => med(x)).join('/') + ' | Lv15+ ' + a.map(x => x.filter(l => l >= 15).length).join('/')); rec('pop.top' + m, avg(a.map(x => x[0] || 0))); }
  const td = sum(agg.deaths); say('스폰 ' + agg.spawn + ' 사망 ' + td + ' (분당 ' + (td / (o.runs * o.min)).toFixed(1) + ') | 원인 ' + JSON.stringify(agg.deaths) + ' | 사망 시 레벨 ' + JSON.stringify(agg.lv)); rec('pop.deathsPerMin', td / (o.runs * o.min));
  const all = agg.died.concat(agg.alive), pct = (a, f) => (a.filter(f).length / Math.max(1, a.length) * 100).toFixed(0) + '%';
  say('수명(초): 죽은 봇 중앙값 ' + med(agg.died).toFixed(0) + ', 30초 미만 ' + pct(agg.died, x => x < 30) + ' | 살아남은 봇 ' + agg.alive.length + '마리 중앙값 ' + med(agg.alive).toFixed(0) + ' | 전체(생존 포함) 5분 이상 ' + pct(all, x => x >= 300));
  rec('pop.lifeMedDied', med(agg.died)); rec('pop.lifeAll5min', all.filter(x => x >= 300).length / Math.max(1, all.length) * 100);
  const xt = agg.xpShape + agg.xpTank; say('점수 출처: 도형·크래셔 ' + Math.round(agg.xpShape) + ' / 탱크 처치 ' + Math.round(agg.xpTank) + ' (탱크 ' + (agg.xpTank / Math.max(1, xt) * 100).toFixed(0) + '%)', true); rec('pop.tankXpShare', agg.xpTank / Math.max(1, xt) * 100);
  say('도형 보충률: 일반 평균 ' + avg(agg.free).toFixed(2) + ' 최저 ' + Math.min(...agg.free).toFixed(2) + ' | 군집 평균 ' + avg(agg.clu).toFixed(2) + ' 최저 ' + Math.min(...agg.clu).toFixed(2), true);
  say('알파 처치 ' + JSON.stringify(agg.kills.alpha) + ' | 육각형 처치 ' + agg.kills.hexagon.length + '회 ' + JSON.stringify(agg.kills.hexagon.slice(0, 6)) + ' | Lv45 최초 도달(분) ' + (agg.f45.join(',') || '없음'), true);
};

S.fp = o => {
  const B = C.bots; B.base += 1; // 가짜 플레이어도 봇 목록에 들어가므로 +1
  try {
    const marks = [2, 5, 10, 15, 20].filter(m => m <= o.min), A = { deaths: {}, lives: [], lvAt: {}, t: { 15: [], 30: [], 45: [] }, from: [] }, res = []; for (const m of marks) A.lvAt[m] = [];
    for (let r = 0; r < o.runs; r++) {
      reseed('fp' + r); const P = fresh(); P.x = MAP.lo + 800; const t0 = g.clock; let fp = null, bornAt = 0, deaths = 0, peak = 1; const hit = {};
      const make = lv => { const sp = g.spawnPos(); fp = new Bot(sp.x, sp.y, lv, 'FakePlayer'); fp.proxy = true; g.bots.push(fp); bornAt = g.clock; };
      const ok = g.onKill.bind(g);
      g.onKill = e => {
        const k = e.lastHit, was = fp && e === fp, rr = ok(e);
        if (fp && k === fp && !e.isBot) fp.addXp(e.s.xp * (1 - B.shapeXp)); // 플레이어는 도형 점수를 100% 받음
        if (was) { deaths++; const key = !k ? 'unknown' : k.isBot ? 'bot' : (k.kind || 'player'); A.deaths[key] = (A.deaths[key] || 0) + 1; A.lives.push(g.clock - bornAt); A.from.push(fp.level); const nl = respawnLevel(fp.level); fp = null; make(nl); }
        return rr;
      };
      make(1);
      tick(3600 * o.min, i => {
        if (i % 60 === 0 && fp) { P.level = fp.level; P.score = fp.score; } // 플레이어 레벨 = 가짜 플레이어 레벨 (봇 수/시작 레벨에 반영)
        if (fp) { peak = Math.max(peak, fp.level); for (const k of [15, 30, 45]) if (peak >= k && hit[k] === undefined) hit[k] = (g.clock - t0) / 60; }
        for (const m of marks) if (i === m * 3600 && fp) A.lvAt[m].push(fp.level);
      });
      for (const k of [15, 30, 45]) if (hit[k] !== undefined) A.t[k].push(hit[k].toFixed(1));
      res.push('시도' + (r + 1) + ': 최고 Lv' + peak + ', 사망 ' + deaths + '회'); delete g.onKill;
    }
    say('=== [fp] 가짜 플레이어(봇 AI, 도형 점수 100%) vs 봇, ' + o.runs + '회 x ' + o.min + '분 ===');
    say(res.join(' | ')); say('시점별 레벨: ' + marks.map(m => m + '분 ' + A.lvAt[m].join('/')).join(' | '));
    say('Lv15 최초 도달(분) ' + (A.t[15].join(',') || '-') + ' | Lv30 ' + (A.t[30].join(',') || '-') + ' | Lv45 ' + (A.t[45].join(',') || '-'));
    A.lives.sort((a, b) => a - b); say('사망 ' + A.lives.length + '회, 수명 중앙값(초) ' + (A.lives.length ? A.lives[Math.floor(A.lives.length / 2)].toFixed(0) : '-') + ' | 원인 ' + JSON.stringify(A.deaths) + ' | 사망 시 레벨 ' + A.from.join(','));
    rec('fp.deaths', A.lives.length); rec('fp.lvAtEnd', avg(A.lvAt[marks[marks.length - 1]] || [0]));
  } finally { B.base -= 1; }
};

S.spawn = o => {
  reseed('spawn'); let P = fresh(); tick(3600 * 4); // 4분 워밍업
  const dists = [], near = [], surv = [], killers = {};
  for (let t = 0; t < o.trials; t++) {
    for (let k = 0; k < 300; k++) { const sp = g.spawnPos(); let md = 1e9, ml = 0; for (const b of g.bots) { const d = Math.hypot(b.x - sp.x, b.y - sp.y); if (d < md) { md = d; ml = b.level; } } dists.push(md); if (md < 1000) near.push(ml); }
    g.state = 'menu'; g.start(); P = g.player; P.sinceHit = 99; g.input.axis = () => [0, 0]; g.input.down = false;
    let s = 0; for (; s < 60 * 150 && g.state === 'play'; s++) g.update(1 / 60); surv.push(s / 60);
    if (g.state !== 'play') { const k = P.lastHit; const key = k && k.isBot ? '봇 Lv' + k.level : (k && k.kind) || '?'; killers[key] = (killers[key] || 0) + 1; }
    tick(90);
  }
  dists.sort((a, b) => a - b); const q = p => dists[Math.floor(dists.length * p)]; surv.sort((a, b) => a - b);
  say('=== [spawn] 스폰/생존 (봇 정상 상태, spawnGap ' + C.bots.spawnGap + ', 시도 ' + o.trials + '회) ===');
  say('스폰 위치에서 가장 가까운 봇 거리: 최소 ' + Math.round(q(0)) + ' | 10% ' + Math.round(q(0.1)) + ' | 중앙값 ' + Math.round(q(0.5)) + ' | 90% ' + Math.round(q(0.9)));
  say('가장 가까운 봇이 700px 이내 ' + (dists.filter(d => d < 700).length / dists.length * 100).toFixed(1) + '% | 1000px 이내 ' + (dists.filter(d => d < 1000).length / dists.length * 100).toFixed(1) + '% | 그 근처 봇 레벨 평균 ' + (near.length ? avg(near).toFixed(1) : '-'));
  say('가만히 선 1레벨 플레이어(무적 포함) 생존(초): ' + surv.map(x => x.toFixed(0)).join(',') + ' | 150초 생존 ' + surv.filter(x => x >= 150).length + '/' + surv.length + ' | 사망 원인 ' + JSON.stringify(killers));
  rec('spawn.near1000', dists.filter(d => d < 1000).length / dists.length * 100); rec('spawn.surv150', surv.filter(x => x >= 150).length); rec('spawn.survMed', med(surv));
};

S.late = o => {
  reseed('late'); fresh({ level: 45 }); const B = C.bots, target = Math.min(B.max, B.base + Math.floor(45 * B.perLevel)); let deaths = 0, spawns = 0, ms = 0, n = 0;
  const ok = g.onKill.bind(g), os = g.spawnBot; g.onKill = e => { if (e.isBot) deaths++; return ok(e); }; g.spawnBot = pl => { const r = os.call(g, pl); if (r) spawns++; return r; };
  const trace = [], stepMin = Math.max(1, Math.floor(o.min / 5)), warm = 3600 * Math.min(3, o.min / 2);
  for (let i = 1; i <= 3600 * o.min; i++) {
    const t0 = process.hrtime.bigint(); g.update(1 / 60); if (i > warm) { ms += Number(process.hrtime.bigint() - t0) / 1e6; n++; }
    if (i % (3600 * stepMin) === 0) trace.push((i / 3600) + '분 봇' + g.bots.length + '/' + target + ' 맵' + Math.round(MAP.size) + ' 군집' + g.clusters.length + ' 도형' + g.shapes.length + ' 최고Lv' + Math.max(0, ...g.bots.map(b => b.level)));
  }
  delete g.onKill; delete g.spawnBot;
  say('=== [late] 후반 정상 상태 (플레이어 Lv45 정지·무적, ' + o.min + '분) ==='); say(trace.join('\n'));
  say('봇 레벨 분포 ' + g.bots.map(b => b.level).sort((a, b) => b - a).join('/')); say('스폰 ' + spawns + ' 사망 ' + deaths + ' (분당 ' + (deaths / o.min).toFixed(1) + ') | update 평균 ' + (ms / Math.max(1, n)).toFixed(2) + 'ms/프레임 (헤드리스 CPU 시간)');
  rec('late.deathsPerMin', deaths / o.min); rec('late.updateMs', ms / Math.max(1, n)); rec('late.bots', g.bots.length);
};

S.perf = o => {
  reseed('perf'); fresh({ level: o.level }); tick(3600 * 2);
  const prof = {}, undo = [];
  const wrap = (obj, name, label) => { const f = obj[name]; obj[name] = function (...a) { const t = process.hrtime.bigint(); const res = f.apply(this, a); prof[label] = (prof[label] || 0) + Number(process.hrtime.bigint() - t) / 1e6; return res; }; undo.push(() => { obj[name] = f; }); };
  if (opt.prof) { const GP = Object.getPrototypeOf(g), BP = Bot.prototype; for (const n of ['separateShapes', 'collisionPass', 'updateBullets', 'spawnShape', 'reap']) wrap(GP, n, n); for (const n of ['ai', 'pickTarget']) wrap(BP, 'Bot.' === '' ? n : n, 'Bot.' + n); }
  let ms = 0, n = 0, bs = 0, bm = 0;
  for (let i = 0; i < 3600 * o.min; i++) { const t0 = process.hrtime.bigint(); g.update(1 / 60); ms += Number(process.hrtime.bigint() - t0) / 1e6; n++; bs += g.bullets.length; if (g.bullets.length > bm) bm = g.bullets.length; }
  for (const u of undo) u();
  const t1 = process.hrtime.bigint(); for (let i = 0; i < 120; i++) g.draw(); const dms = Number(process.hrtime.bigint() - t1) / 1e6 / 120;
  say('=== [perf] 플레이어 Lv' + o.level + ' | 봇 ' + g.bots.length + ' 도형 ' + g.shapes.length + ' 군집 ' + g.clusters.length + ' 총알 평균 ' + (bs / n).toFixed(0) + '(최대 ' + bm + ') | update ' + (ms / n).toFixed(2) + 'ms/프레임, draw(가짜 ctx) ' + dms.toFixed(2) + 'ms ===');
  if (opt.prof) say('  함수별 프레임당 ms: ' + Object.entries(prof).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + (v / n).toFixed(2)).join(' | ') + '  (collisionPass는 separateShapes 포함, spawnShape는 shapeFree 포함, Bot.ai는 pickTarget 포함)');
  rec('perf.updateMs', ms / n); rec('perf.bulletsAvg', bs / n); for (const k in prof) rec('perf.' + k, prof[k] / n);
};

/* ---------- 실행 ---------- */
const T0 = Date.now();
for (const [ni, n] of names.entries()) { if (ni > 0) boot(); const t = Date.now(); S[n](O(n)); say('  (' + n + ' 소요 ' + ((Date.now() - t) / 1000).toFixed(1) + '초)', true); }
console.log('총 소요 ' + ((Date.now() - T0) / 1000).toFixed(1) + '초');
const dir = path.join(__dirname, 'results');
if (opt.save) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, opt.save + '.json'), JSON.stringify({ game: gameSha, sets: opt.sets, seed: opt.seed, names, results }, null, 1)); console.log('결과 저장: tests/results/' + opt.save + '.json'); }
if (opt.compare) {
  const file = path.join(dir, opt.compare + '.json');
  if (!fs.existsSync(file)) console.log('비교할 파일이 없습니다: ' + file);
  else { const prev = JSON.parse(fs.readFileSync(file, 'utf8')); console.log('=== 비교: ' + opt.compare + ' (game ' + prev.game + ') → 지금 (game ' + gameSha + ') ===');
    for (const k of Object.keys(results)) if (k in prev.results) { const a = prev.results[k], b = results[k], d = b - a; console.log('  ' + k.padEnd(24) + a + ' → ' + b + (d ? '  (' + (d > 0 ? '+' : '') + (+d.toFixed(3)) + ')' : '  (동일)')); } }
}
