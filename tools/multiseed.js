'use strict';
// 여러 시드로 같은 시나리오를 두 설정(A, B)에 대해 반복 측정하고 평균·표준편차·차이를 비교한다.
// 사용: node tools/multiseed.js 설정파일.json   (설정 예는 아래 DEFAULT 참고)
// 설정: { scen: ['types','pop'], min: 5, seeds: [1,2,3], game: 'game.js', jobs: 4, A: { name: '이전', sets: ['bulletRange.mode="legacy"'] }, B: { name: '지금', sets: [] }, only: '정규식(보고할 키)', all: false }
// 결과 파일은 tests/results/_ms_*.json 로 저장했다가 읽은 뒤 지운다(.gitignore). 차이가 두 설정의 표준오차 합성(z)으로 2 이상인 키만 "유의"로 표시한다(표본이 3개 안팎이면 참고용).
const { spawn } = require('child_process'), fs = require('fs'), path = require('path');
const cfgPath = process.argv[2]; if (!cfgPath) { console.error('사용: node tools/multiseed.js 설정파일.json'); process.exit(1); }
const cfg = Object.assign({ min: 5, seeds: [1, 2, 3], game: 'game.js', jobs: 4, only: '', all: false }, JSON.parse(fs.readFileSync(cfgPath, 'utf8')));
const dir = path.join(__dirname, '..', 'tests', 'results'); fs.mkdirSync(dir, { recursive: true });
const jobs = []; for (const side of ['A', 'B']) for (const seed of cfg.seeds) jobs.push({ side, seed, tag: '_ms_' + side + '_' + seed + '_' + process.pid });
let running = 0, next = 0, done = 0; const t0 = Date.now();
function launch() {
  while (running < cfg.jobs && next < jobs.length) {
    const j = jobs[next++]; running++;
    const args = ['tests/run.js', cfg.scen.join(','), '--seed', String(j.seed), '--min', String(cfg.min), '--force', '--game', cfg.game, '--save', j.tag];
    for (const s of cfg[j.side].sets || []) args.push('--set', s);
    const p = spawn('node', args, { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
    p.on('exit', code => { running--; done++; j.code = code; console.error(`[${done}/${jobs.length}] ${cfg[j.side].name} 시드 ${j.seed} 종료(코드 ${code}), ${Math.round((Date.now() - t0) / 1000)}초`); if (done === jobs.length) report(); else launch(); });
  }
}
function stat(a) { const n = a.length, m = a.reduce((x, y) => x + y, 0) / n, v = n > 1 ? a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1) : 0; return { n, m, sd: Math.sqrt(v) }; }
function report() {
  const get = side => { const o = {}; for (const j of jobs.filter(x => x.side === side)) { const f = path.join(dir, j.tag + '.json'); if (!fs.existsSync(f)) continue; const r = JSON.parse(fs.readFileSync(f, 'utf8')).results; for (const k in r) (o[k] = o[k] || []).push(r[k]); fs.unlinkSync(f); } return o; };
  const A = get('A'), B = get('B'), re = cfg.only ? new RegExp(cfg.only) : null, rows = [];
  for (const k of Object.keys(A)) { if (!B[k] || (re && !re.test(k))) continue; const a = stat(A[k]), b = stat(B[k]), d = b.m - a.m, se = Math.sqrt(a.sd ** 2 / a.n + b.sd ** 2 / b.n), z = se > 0 ? d / se : (d === 0 ? 0 : Infinity); rows.push({ k, a, b, d, z }); }
  rows.sort((x, y) => Math.abs(y.z) - Math.abs(x.z));
  const f = x => Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2);
  console.log(`=== multiseed: ${cfg.scen.join(',')} --min ${cfg.min}, 시드 ${cfg.seeds.join(',')}, ${cfg.A.name}(A) 대 ${cfg.B.name}(B) ===`);
  console.log('키'.padEnd(34) + (cfg.A.name + ' 평균±sd').padStart(20) + (cfg.B.name + ' 평균±sd').padStart(20) + '차이(B-A)'.padStart(12) + '  z   ');
  for (const r of rows) { if (!cfg.all && Math.abs(r.z) < 1.5 && !re) continue; console.log(r.k.padEnd(34) + `${f(r.a.m)}±${f(r.a.sd)}`.padStart(20) + `${f(r.b.m)}±${f(r.b.sd)}`.padStart(20) + f(r.d).padStart(12) + '  ' + (isFinite(r.z) ? r.z.toFixed(1) : 'inf') + (Math.abs(r.z) >= 2 ? '  유의' : '')); }
  console.log(`(표시 ${cfg.all || re ? '전체/지정' : '|z| 1.5 이상'}, 키 ${rows.length}개 중. 시드 ${cfg.seeds.length}개라 z는 거친 참고값, 총 ${Math.round((Date.now() - t0) / 1000)}초)`);
}
launch();
