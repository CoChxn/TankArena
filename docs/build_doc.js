// Tank Arena 게임 작동 원리 문서(docx) 생성 스크립트
// 사용: node docs/build_doc.js  (게임 폴더에서 실행, game.js의 CFG를 읽어 수치 표를 자동 계산)
// 규칙: 코드를 바꿀 때 이 스크립트의 설명 문장(수작업 부분)도 함께 고치고 다시 생성한다. 수치 표는 game.js에서 자동으로 갱신된다.
// 출력: docs/Tank_Arena_Mechanics_Review.docx (DOC_OUT 환경변수로 경로 변경)
const fs = require('fs'), crypto = require('crypto');
const D = require('docx');
const DOC_OUT = process.env.DOC_OUT || require('path').join(__dirname, 'Tank_Arena_Mechanics_Review.docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType, HeadingLevel, LevelFormat, Footer, PageNumber } = D;

/* ---------- game.js에서 설정값 읽기 (게임 실행 아님: 상수와 순수 함수만 평가) ---------- */
const GP = require('path').join(__dirname, '..', 'game.js');
const src = fs.readFileSync(GP, 'utf8'), lines = src.split('\n');
const cut = lines.findIndex(l => l.startsWith('/* ============ 유틸'));
const botLines = lines.filter(l => /^const (BOT_DIST|BOT_BUILD|BOT_CLASS_W) /.test(l));
const bi = lines.findIndex(l => l.startsWith('const botBuildWeights')), bwLines = lines.slice(bi, bi + lines.slice(bi).findIndex(l => l === '};') + 1);
const G = new Function(lines.slice(0, cut).join('\n') + '\n' + botLines.join('\n') + '\n' + bwLines.join('\n') + '\nreturn { CFG, TICK, TANK_RT, lvPow, pointsFor, respawnLevel, mapTarget, BOT_DIST, BOT_BUILD, BOT_CLASS_W, botBuildWeights };')();
const { CFG, TICK, TANK_RT, lvPow, pointsFor, respawnLevel, BOT_DIST, BOT_BUILD, BOT_CLASS_W, botBuildWeights } = G;
const SHA = crypto.createHash('sha256').update(src).digest('hex').slice(0, 12), NLINES = lines.length - (lines[lines.length - 1] === '' ? 1 : 0);
const f1 = x => (+x).toFixed(1), f2 = x => (+x).toFixed(2), n0 = x => Math.round(x).toLocaleString('en-US');

/* ---------- 문서 도우미 ---------- */
const W = 9638; // 본문 폭(DXA): A4, 좌우 여백 2cm
const FONT = { ascii: 'Malgun Gothic', hAnsi: 'Malgun Gothic', eastAsia: 'Malgun Gothic', cs: 'Malgun Gothic' };
const run = (t, o = {}) => new TextRun({ text: String(t), font: FONT, ...o });
const rich = (t, o = {}) => {
  let bold = false, code = false; const rs = [];
  for (const s of String(t).split(/(\*\*|`)/)) {
    if (s === '**') { bold = !bold; continue; } if (s === '`') { code = !code; continue; } if (!s) continue;
    rs.push(code ? new TextRun({ text: s, font: { ascii: 'Consolas', hAnsi: 'Consolas', eastAsia: 'Malgun Gothic', cs: 'Consolas' }, size: (o.size || 20) - 2, bold: bold || o.bold, color: '9C3D00', shading: { type: ShadingType.CLEAR, fill: 'F3F3F3', color: 'auto' } }) : run(s, { ...o, bold: bold || o.bold }));
  }
  return rs;
};
const P = (t, o = {}) => new Paragraph({ children: rich(t, o.run), spacing: { after: 110, line: 300 }, alignment: o.align, ...(o.para || {}) });
const H1 = (t, brk) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: !!brk, keepNext: true, spacing: { before: brk ? 0 : 520, after: 200 }, children: [run(t, { bold: true, size: 34, color: '1F3864' })] });
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 280, after: 120 }, children: [run(t, { bold: true, size: 26, color: '2E5C8A' })] });
const H3 = t => new Paragraph({ heading: HeadingLevel.HEADING_3, keepNext: true, spacing: { before: 200, after: 80 }, children: [run(t, { bold: true, size: 22, color: '404040' })] });
const BUL = items => items.map(t => new Paragraph({ numbering: { reference: 'bul', level: 0 }, children: rich(t), spacing: { after: 60, line: 290 } }));
const NUM = (items, k) => items.map(t => new Paragraph({ numbering: { reference: 'n' + k, level: 0 }, children: rich(t), spacing: { after: 60, line: 290 } }));
const FML = ls => ls.map(t => new Paragraph({ children: [new TextRun({ text: t, font: { ascii: 'Consolas', hAnsi: 'Consolas', eastAsia: 'Malgun Gothic', cs: 'Consolas' }, size: 18 })], shading: { type: ShadingType.CLEAR, fill: 'F2F2F2', color: 'auto' }, indent: { left: 240 }, spacing: { after: 20 } }));
const NOTE = (t, kind) => new Paragraph({ children: rich(t, { size: 19 }), shading: { type: ShadingType.CLEAR, fill: kind === 'warn' ? 'FFF2CC' : 'E8F1FA', color: 'auto' }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: kind === 'warn' ? 'BF9000' : '2E75B6', space: 6 } }, indent: { left: 200 }, spacing: { before: 80, after: 140, line: 290 } });
const SP = () => new Paragraph({ children: [], spacing: { after: 100 } });
const bd = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' }, borders = { top: bd, bottom: bd, left: bd, right: bd };
function T(headers, rows, widths, o = {}) {
  const n = headers.length; widths = (widths || Array(n).fill(Math.floor(W / n))).slice(); widths[widths.length - 1] += W - widths.reduce((a, b) => a + b, 0);
  const fs = o.size || 18;
  const keep = o.keep !== false && rows.length <= 12;
  const cell = (t, w, head, al, kn) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders, shading: head ? { fill: 'D9E2EC', type: ShadingType.CLEAR, color: 'auto' } : undefined, margins: { top: 45, bottom: 45, left: 80, right: 80 }, children: String(t).split('\n').map(line => new Paragraph({ alignment: al, keepNext: !!kn, children: rich(line, { size: fs, bold: head }) })) });
  const hr = new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => cell(h, widths[i], true, AlignmentType.CENTER, true)) });
  const body = rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i], false, (o.align && o.align[i]) || AlignmentType.LEFT, keep && ri < rows.length - 1)) }));
  return [new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows: [hr, ...body] }), SP()];
}
const CT = AlignmentType.CENTER;
const out = [];
const add = (...a) => { for (const x of a) Array.isArray(x) ? add(...x) : out.push(x); };

/* ---------- 계산 도우미 ---------- */
const S = CFG.shapes, CL = CFG.classes, K = CFG.clusters, N = CFG.nest, B = CFG.bots, FX = CFG.botFx;
const sat = raw => 1 - Math.exp(-raw / FX.scoreScale);
const shapeRows = [['square', '사각형'], ['triangle', '삼각형'], ['pentagon', '오각형'], ['hexagon', '육각형'], ['alpha', '알파 오각형']];
const hitsToKill = (sh, hpB, dmg) => Math.ceil(sh.hp / (dmg * Math.min(1, hpB / sh.bcost)) - 1e-9);
const wsum = Object.values(S).reduce((a, s) => a + s.w, 0), avgClusterShapes = Math.PI * ((720 ** 3 - 560 ** 3) / (3 * 160)) * K.density;
const clComp = { square: 0.45 * 0.85 + 0.35 * 0.25 + 0.2 * 0.5, triangle: 0.45 * 0.15 + 0.35 * 0.75 + 0.2 * 0.4, pentagon: 0.2 * 0.1 };
function worldAt(n) {
  const size = Math.min(CFG.map.max, Math.max(CFG.map.min, Math.sqrt(n * CFG.map.areaPerTank))), R = N.r * size / N.refMap, a = (R / N.r) ** 2;
  const free = Math.round(CFG.shapeDensity * size * size), nc = Math.max(1, Math.floor(Math.min(K.maxCount, size * size / K.areaPerCluster) + 0.35)), cs = nc * avgClusterShapes;
  const pent = Math.round(N.pentagons * a), cr = Math.round(N.crasherMax * a);
  let xp = 0; for (const k in S) xp += free * S[k].w / wsum * S[k].xp; for (const k in clComp) xp += cs * clComp[k] * S[k].xp;
  xp += pent * S.pentagon.xp + N.alphaMax * S.alpha.xp + cr * ((1 - N.largeRatio) * CFG.crashers.small.xp + N.largeRatio * CFG.crashers.large.xp);
  return { n, size, R, free, nc, cs, pent, cr, total: free + cs + pent + N.alphaMax, xp };
}

/* =================== 표지 =================== */
add(new Paragraph({ spacing: { before: 2600, after: 200 }, alignment: CT, children: [run('Tank Arena', { bold: true, size: 84, color: '1F3864' })] }));
add(new Paragraph({ spacing: { after: 160 }, alignment: CT, children: [run('게임 작동 원리 및 중간 점검 문서', { bold: true, size: 38, color: '2E5C8A' })] }));
add(new Paragraph({ spacing: { after: 700 }, alignment: CT, children: [run('개발자용 · 게임을 처음 보는 사람도 핵심 규칙과 세부 수치를 이해할 수 있도록 정리', { size: 22, color: '595959' })] }));
add(T(['항목', '내용'], [
  ['기준 파일', `game.js (${NLINES}줄, SHA-256 앞 12자리 ${SHA})`],
  ['작성일', '2026-10-06'],
  ['구성 파일', 'index.html · style.css · game.js · tests/run.js (외부 이미지·사운드 없음)'],
  ['기술', 'HTML5 Canvas 2D + 바닐라 JavaScript, 서버 없음 (브라우저에서 index.html을 열면 실행)'],
  ['수치의 출처', '이 문서의 모든 설정값과 계산값은 game.js의 CFG(설정)와 규칙 함수에서 읽어 계산했습니다. 표에 (측정)이라고 적은 값은 개발 중 Node 헤드리스 시뮬레이션에서 얻은 값입니다.'],
], [2200, W - 2200]));
add(NOTE('**읽는 법:** 1~2장은 게임이 무엇이고 어떻게 돌아가는지, 3~8장은 규칙과 수치의 상세, 9장은 설정값 총람, 10장은 테스트 도구와 측정 결과, 11장은 해결하지 못한 문제, 12장은 개선 제안, 부록은 변경 이력과 용어입니다.'));

/* =================== 1. 개요 =================== */
add(H1('1. 게임 개요', true));
add(P('**Tank Arena**는 diep.io를 참고한 2D 탑다운 탱크 서바이벌 게임입니다. 플레이어는 탱크 하나를 조종해 맵 곳곳의 **도형**(사각형, 삼각형, 오각형, 육각형)과 **다른 탱크(AI 봇)** 를 처치하고 점수를 얻습니다. 점수가 쌓이면 레벨이 오르고(최대 45), 레벨이 오를 때마다 얻는 **능력치 포인트**로 탱크의 8가지 능력치를 강화합니다. 15레벨에서는 **클래스**(Twin, Sniper, Machine Gun, Flank Guard)를 선택합니다. 죽으면 **같은 월드에서** 레벨이 줄어든 상태로 다시 시작합니다.'));
add(H2('1.1 핵심 게임 루프'));
add(...NUM([
  '**돌아다니며 파밍**: 도형을 쏴서 부수면 점수를 즉시 얻습니다(경험치 구슬 없음).',
  '**레벨업**: 점수가 레벨별 필요 점수(2장 표)를 넘으면 레벨이 오르고 능력치 포인트를 받습니다(1~8번 키 또는 + 버튼).',
  '**싸움**: 다른 탱크와 총알·몸통 충돌로 싸웁니다. 탱크를 처치하면 상대 점수에 비례한 보상을 얻습니다.',
  '**위험 지역**: 맵 중앙의 Pentagon Nest에는 점수가 높은 도형이 많지만 크래셔(탱크를 쫓는 분홍 삼각형)가 지키고 있습니다.',
  '**죽음**: 나를 죽인 대상을 관전한 뒤, 사망 레벨에 따른 시작 레벨로 같은 월드에서 재시작합니다.',
], 1));
add(H2('1.2 파일 구성과 실행'));
add(...T(['파일', '역할'], [
  ['index.html', '진입점. 캔버스, 시작 메뉴(닉네임 입력, Play), 사망 화면(Play again). 한국어 lang 설정, 화면 문구는 영어.'],
  ['style.css', '시작·사망 화면 오버레이, 버튼, 닉네임 입력칸 스타일.'],
  ['game.js', `게임 전체 로직(${NLINES}줄). 설정(CFG), 입력, 카메라, 플레이어, 봇 AI, 크래셔, UI, 게임 본체(소환, 충돌, 갱신, 그리기).`],
  ['tests/run.js', '설정형 헤드리스 시뮬레이션 테스트 도구(10장). 가짜 DOM으로 game.js를 화면 없이 돌려 봅니다.'],
  ['tests/ 나머지', '통합 전의 개별 테스트 스크립트(t_pop.js, t_fp.js 등). 기록 보존용.'],
], [2200, W - 2200]));
add(NOTE('**실행:** index.html, style.css, game.js를 같은 폴더에 두고 index.html을 브라우저로 엽니다. game.js를 바꾼 뒤에는 Ctrl+F5(강력 새로 고침)로 불러오세요. 압축 파일 안에서 바로 열면 game.js가 로드되지 않아 버튼이 동작하지 않습니다.'));
add(H2('1.3 조작'));
add(...T(['입력', '동작'], [
  ['W A S D / 방향키', '이동 (대각선은 속도가 같도록 정규화)'],
  ['마우스 이동', '포신 조준 (화면 좌표를 월드 좌표로 변환)'],
  ['마우스 클릭 / Space', '발사 (누르고 있는 동안 연사)'],
  ['E', '자동 발사 토글 — 플레이 중에만 동작. 죽으면 자동으로 꺼짐'],
  ['1~8 / 능력치 줄 옆 + 버튼', '해당 능력치에 포인트 1 투자 (포인트가 있고 7 미만일 때)'],
  ['클래스 타일 클릭', '15레벨과 30레벨에 좌상단에 나타나는 타일 중 하나 선택'],
  ['\\ (백슬래시)', '개발자 모드 켜기 + 즉시 1레벨 상승 (새로 고침 전까지 유지)'],
  ['F2', '개발자 모드에서 정보 패널 켜고 끄기 (봇 킬로그도 함께)'],
  ['마우스 휠 (개발자 모드)', '시야 확대/축소 (x0.1 ~ x3)'],
], [3000, W - 3000]));

/* =================== 2. 핵심 작동 원리 =================== */
add(H2('1.4 현재 규칙 요약'));
add(P('각 항목의 자세한 내용과 근거는 오른쪽에 적은 장을 보세요. 수치는 `game.js`의 `CFG`에서 읽은 설정값이며, 시뮬레이션으로 측정한 값은 각 장에 따로 표시했습니다.'));
add(...T(['주제', '현재 규칙 요약', '상세'], [
  ['총알', `총알은 체력(관통)을 가진 개체이고 대상과 겹쳐 있는 동안 매 틱(0.04초) 서로 피해와 체력을 교환합니다. 한 발이 한 탱크에 주는 총 피해는 Dmin~Dmax로 제한됩니다(tMin ${CFG.bulletRange.tMin}, tMaxA ${CFG.bulletRange.tMaxA}, tMaxB ${CFG.bulletRange.tMaxB}). 밀림·꺾임은 질량 모델이고 총알끼리 충돌 뒤 방향은 고정됩니다. 기본 속도 x${CFG.bulletSpeedMul}, 크기 x${CFG.bulletSizeMul}.`, '5.1~5.2'],
  ['몸통 충돌', `충돌 틱마다 서로 한 번씩 피해를 주고 질량에 따라 튕깁니다(반발 0.6). 사각형·삼각형·오각형은 탱크와 부딪힐 때 질량을 x${CFG.bodyPhys.shapeMass.square}로 계산해 탱크가 덜 멈춥니다.`, '5.3'],
  ['도형', `일반 도형 수 = 맵 크기² x ${CFG.shapeDensity.toExponential()}. 사각형 약 70%, 삼각형 25%, 오각형 5%(육각형은 둥지 밖 0.2%).`, '6장'],
  ['군집', `위치를 정하면 ${K.growTime[0]}~${K.growTime[1]}초 동안 도형을 하나씩 만들고, 만든 개수가 목표(면적 x ${K.density.toExponential()})에 닿으면 군집을 없애 도형이 일반 도형이 됩니다. 군집 수는 맵 면적 ÷ ${n0(K.areaPerCluster)}(최대 ${K.maxCount}).`, '6장'],
  ['중앙 둥지', `기준(맵 16,583) 오각형 ${N.pentagons}개, 크래셔 최대 ${N.crasherMax}마리, 알파 오각형 ${N.alphaMax}개. 맵 크기에 따라 면적 비로 늘고 줄어듭니다.`, '6장'],
  ['클래스', `15레벨에 Twin, Sniper, Machine Gun, Flank Guard 중 선택, 30레벨에 ${Object.keys(CFG.classUp30).map(k => `${CL[k].n} → ${CFG.classUp30[k].map(x => CL[x].n).join('/')}`).join(', ')}. 선택은 좌상단 타일 클릭입니다.`, '4.5'],
  ['봇 AI', '성격 7유형, 점수제 목표 선택, 전투 우위 R(체력%와 레벨)로 싸움·도주 결정, 도주 후 5초 동안 위협 기억. 배회는 서서히 방향을 틀고, 도주는 옆 성분과 흔들림을 섞어 곡선으로, 조준 오차는 계속 변하고 거리·상대 가속에 비례합니다.', '7장'],
  ['성장', `최대 레벨 ${CFG.maxLevel}, 점수표와 능력치 포인트는 diep.io 위키 기준. 봇은 1레벨로 소환해 목표 레벨까지 성장 가속을 받습니다.`, '4장, 7.2'],
  ['검증', '`tests/run.js`의 헤드리스 시뮬레이션과 `npm run check`. 시나리오 목록과 측정 한계(시드, 단일 측정 오차 약 5%)는 10장.', '10장'],
], [1500, W - 2500, 1000], { size: 17 }));

add(H1('2. 핵심 작동 원리 한눈에 보기'));
add(H2('2.1 한 프레임에서 일어나는 일'));
add(P('메인 루프는 브라우저 프레임마다 `dt`(경과 시간, 최대 0.05초로 제한)를 계산해 `update(dt)`와 `draw()`를 호출합니다. `update`의 순서는 다음과 같습니다.'));
add(...NUM([
  '시계 증가, **맵 크기 갱신**(계획된 탱크 수의 30초 평균에 맞춰 초당 최대 100씩 이동).',
  '플레이어 스폰 무적 해제 판정(이동 또는 발사하면 해제).',
  '플레이어 이동 → 카메라 → 조준 → 발사. 죽은 상태라면 관전 카메라가 대상을 부드럽게 따라감.',
  '**도형** 이동(표류, 맵·군집·둥지 경계 반사, 육각형·알파 체력 재생).',
  '**크래셔** 갱신(가까운 탱크 추적 또는 둥지 복귀).',
  '**봇** 갱신(AI: 목표 선택, 이동, 조준, 발사).',
  '**충돌 틱**(0.04초마다): 도형끼리 겹침 해소 → 탱크와 도형·크래셔의 몸통 충돌 → 탱크끼리 몸통 충돌.',
  '**총알** 갱신: 이동, 수명, 맵 밖 소멸, 도형·봇·크래셔·플레이어와의 명중 판정, 총알끼리 충돌.',
  '메시지 타이머 갱신, **처치 처리**(체력 0 이하인 대상을 제거하고 경험치 지급).',
  '**스포너**: 봇 소환(6초), 도형 보충과 군집 관리(0.4초 틱), 크래셔 보충(1.5초).',
], 2));
add(H2('2.2 주기 정리'));
add(...T(['주기', '값', '내용'], [
  ['프레임', '브라우저 프레임, dt 최대 0.05초', '이동, 총알, 도형 이동 등 연속 갱신'],
  ['충돌 틱', `${TICK}초 (초당 25회)`, '몸통 충돌 피해(한 틱에 한 번씩 서로 피해), 도형 겹침 해소'],
  ['봇 판단', '0.25~0.5초마다 (무작위)', '목표 재선정(점수 계산). 이동과 사격은 매 프레임'],
  ['도형 틱', '0.4초', '일반 도형 최대 3개, 군집은 초당 ' + CFG.clusters.refill + '개 속도로(누적, 한 틱 최대 2개), 둥지 오각형 2개 보충, 군집 이동·정리'],
  ['크래셔 보충', '1.5초', '목표 수보다 적으면 1마리 추가'],
  ['봇 소환', `${B.spawnEvery}초 (실패하면 0.5초 뒤 재시도)`, '봇 수가 목표보다 적을 때'],
  ['알파 오각형 재등장', `${N.alphaRespawn}초`, '둥지의 알파가 없어진 뒤 이 시간이 지나면 하나 생성'],
], [2200, 3000, W - 5200]));
add(H2('2.3 이 게임을 이해하는 다섯 가지 핵심 규칙'));
add(...NUM([
  '**총알은 체력(관통력)을 가진다.** 총알은 대상과 겹쳐 있는 동안 매 틱(0.04초) 서로 피해를 교환합니다. 대상은 총알 피해량만큼, 총알은 대상의 방어값(cost)만큼 체력을 잃고, 총알 체력이 0이 되면 사라집니다. 그래서 한 대상에 주는 총 피해는 대략 `총알 피해 × min(총알 체력 ÷ cost, 겹친 틱 수)`이고, 관통과 피해를 함께 올릴수록 곱으로 늘어납니다.',
  '**처치하면 즉시 점수.** 마지막으로 피해를 준 탱크가 점수를 받습니다. 도형은 고정 점수, 탱크는 상대 점수에 비례합니다.',
  '**맵은 탱크 수에 맞춰 커진다.** 탱크 1대당 면적이 일정하도록 맵 한 변이 `√(탱크 수 × 2,500만)`이 됩니다(7,000~23,000).',
  '**월드는 일반 도형 + 군집 + 중앙 둥지로 구성된다.** 군집과 둥지의 크기·개수는 맵 면적에 비례해 도형 밀도가 일정하게 유지됩니다.',
  '**봇은 플레이어와 같은 스펙과 성장 규칙을 쓴다.** 달라지는 것은 AI(성격)와 점수 배율(도형 0.25배 등)뿐입니다.',
], 3));
add(H2('2.4 설정은 한 곳에'));
add(P('모든 밸런스 값은 game.js 맨 위의 `CFG` 객체(와 그 아래 `CFG.botTypes`, `CFG.botSkill`, `CFG.botFx`)에 모여 있습니다. 코드를 건드리지 않고 값만 바꿔 실험할 수 있으며, 테스트 도구는 `--set 경로=값`으로 실행 시점에 값을 덮어쓸 수 있습니다. 설정 전체 목록은 9장에 있습니다.'));

/* =================== 3. 맵과 월드 =================== */
add(H1('3. 맵과 월드'));
add(H2('3.1 좌표와 맵 크기'));
add(...BUL([
  `좌표 공간은 ${n0(CFG.world)} × ${n0(CFG.world)}이고, 실제로 플레이할 수 있는 정사각형 영역(맵)은 그 중앙에 놓입니다. 한 변의 길이 = 맵 크기.`,
  `**맵 크기 공식:** 맵 크기 = clamp(√(전체 탱크 수 × ${n0(CFG.map.areaPerTank)}), ${n0(CFG.map.min)}, ${n0(CFG.map.max)}). 탱크 수는 실제 탱크 수가 아니라 **계획된 탱크 수** = 플레이어 1 + 목표 봇 수(min(${CFG.bots.max}, ${CFG.bots.base} + 플레이어 레벨 × ${CFG.bots.perLevel}), 소수는 내림)입니다. 봇이 한 마리씩 소환되는 동안이나 일시적으로 죽어 있을 때도 맵이 줄지 않습니다.`,
  `계획된 탱크 수는 **30초 지수 평균**으로 반영해서 플레이어 레벨이 바뀌어도(죽어서 레벨이 내려가는 경우 포함) 맵이 갑자기 변하지 않고, 맵은 목표 크기를 향해 **초당 최대 ${CFG.map.rate}**씩만 변합니다.`,
  '시작 시 맵은 플레이어 1 + 기본 봇 10 = 11대 기준으로 16,583입니다.',
  '**경계:** 탱크는 경계에서 멈추고(바깥쪽 속도 0), 도형은 경계에서 안쪽으로 밀리며 반사되고, 총알은 영역 밖으로 나가면 사라집니다. 맵은 움직이는 벽처럼 작동합니다.',
]));
add(H2('3.2 맵 크기에 따른 월드 구성 (계산값)'));
add(P('아래 표는 코드의 공식으로 계산한 값입니다. 점수 총량은 맵 전체에 서 있는 도형·크래셔의 점수를 모두 더한 값(군집은 평균 크기와 구성비 기준)입니다.'));
{
  const rows = [2, 5, 11, 15, 20, 25].map(n => { const w = worldAt(n); return [n + '대', n0(w.size), n0(w.R), String(w.pent), String(w.cr), n0(w.free), `${w.nc}개 (약 ${n0(w.cs)})`, n0(w.total), n0(w.xp), n0(w.xp / n)]; });
  add(...T(['탱크 수', '맵 한 변', '둥지 반지름', '둥지 오각형', '크래셔', '일반 도형', '군집(도형 수)', '도형 합계', '점수 총량', '탱크당 점수'], rows, [800, 900, 900, 850, 800, 900, 1500, 900, 1100, 988], { size: 16, align: Array(10).fill(CT) }));
}
add(NOTE('**관찰:** 둥지와 군집이 맵 면적에 비례하지만 군집은 최대 7개에서 멈추므로, 탱크가 많아질수록 탱크당 점수는 줄어듭니다(2대 약 8,300 → 20대 약 2,900).'));

/* =================== 4. 탱크 =================== */
add(H1('4. 탱크 (플레이어와 봇 공통)'));
add(P('플레이어와 봇은 같은 `Player` 클래스를 씁니다. 레벨, 점수, 능력치, 클래스, 이동, 발사, 체력 회복이 모두 같습니다. 봇은 입력을 키보드 대신 AI가 만들어 낸다는 점만 다릅니다.'));
add(H2('4.1 레벨과 필요 점수'));
add(P(`최대 레벨은 ${CFG.maxLevel}이고, 필요 점수는 diep.io 위키 표를 따릅니다. 레벨을 올릴 때마다 점수를 쌓아 두었다가 한꺼번에 오를 수도 있습니다(점수가 여러 레벨 몫이면 연속 상승).`));
{
  const rows = []; for (let i = 1; i <= 15; i++) { const r = []; for (const g of [0, 15, 30]) { const L = i + g; r.push(String(L), n0(CFG.scoreAt[L]), String(pointsFor(L))); } rows.push(r); }
  add(...T(['레벨', '필요 점수', '누적 포인트', '레벨', '필요 점수', '누적 포인트', '레벨', '필요 점수', '누적 포인트'], rows, Array(9).fill(Math.floor(W / 9)), { size: 17, align: Array(9).fill(CT) }));
}
add(H2('4.2 능력치 포인트 규칙 (33점 규칙)'));
add(...BUL([
  '레벨 2~28은 레벨마다 1포인트(1레벨 0, 28레벨 누적 27), **29레벨은 포인트 없음**, 30레벨부터 3레벨마다 1포인트입니다. 45레벨에서 누적 **33포인트**입니다.',
  `능력치 8개 각각 최대 **${CFG.maxPts}포인트**(개발자 모드는 한도 없음). 33포인트로는 56칸을 모두 채울 수 없으므로 빌드의 선택이 중요합니다.`,
  '포인트는 쓰지 않고 모아 둘 수 있습니다. 재시작할 때는 해당 레벨의 포인트가 사용하지 않은 상태로 주어집니다.',
]));
add(H2('4.3 능력치 8종과 포인트별 값'));
add(P('능력치 값은 `기본값 + 포인트당 증가량 × 포인트`입니다(diep.io 위키 수식). 최대 체력은 레벨당 +2가 추가로 붙습니다(레벨 보정은 아래 4.4).'));
{
  const rows = []; for (let p = 0; p <= CFG.maxPts; p++) {
    const v = k => { const st = CFG.stats.find(s => s.k === k); return st.base + st.per * p; };
    rows.push([String(p), f2((0.03 + 0.12 * p) / 30 * 100) + '%', String(v('maxHp')), String(v('body')), n0(v('bSpeed') * CFG.bulletSpeedMul), `${v('pen') * CFG.bulletHp}`, String(v('bDmg')), `${TANK_RT[p]}틱 (${f2(TANK_RT[p] * TICK)}초)`, String(v('move'))]);
  }
  add(...T(['포인트', 'Health Regen (초당 최대체력)', 'Max Health', 'Body Damage', 'Bullet Speed (px/s)', 'Bullet Penetration (총알 체력)', 'Bullet Damage', 'Reload (Tank)', 'Movement Speed (px/s)'], rows, [750, 1250, 900, 900, 1050, 1300, 950, 1400, 1138], { size: 16, align: Array(9).fill(CT) }));
}
add(...T(['능력치', '공식', '의미'], [
  ['Health Regen', '(0.03 + 0.12 × 포인트) ÷ 30 (초당 최대 체력 비율)', `맞은 직후에도 항상 회복(맞은 뒤 대기 시간 없음). ${CFG.hyperAfter}초 이상 맞지 않으면 급속 회복(초당 ${f1(CFG.hyperRate * 100)}%)`],
  ['Max Health', '50 + 20 × 포인트 + 2 × (레벨 − 1)', '레벨업 때 체력 비율은 유지'],
  ['Body Damage', '5 + 포인트', '몸통 충돌 피해와 총알 방어값(총알이 이 값만큼 체력을 잃음)'],
  ['Bullet Speed', `(480 + 45 × 포인트) × 클래스 배율 × ${CFG.bulletSpeedMul}`, `총알 이동 속도(px/초). ${CFG.bulletSpeedMul}는 총알 기본 속도 배율(bulletSpeedMul)로, 포인트로 늘어난 속도까지 포함한 전체에 곱함`],
  ['Bullet Penetration', '(2 + 1.5 × 포인트) × 4 × 클래스 배율', '총알 체력. 대상과 겹쳐 있는 동안 틱마다 대상의 방어값만큼 깎임'],
  ['Bullet Damage', '(7 + 3 × 포인트) × 클래스 배율', '총알 기본 피해'],
  ['Reload', '재장전 틱 표(포인트당 −1틱) × 0.04초', '표를 넘으면 포인트당 0.5틱씩 추가 감소(최소 1틱). 클래스마다 표가 다름'],
  ['Movement Speed', '(230 + 20 × 포인트) ÷ 1.01^(레벨−1)', '최종 이동 속도(px/초)'],
], [1900, 3600, W - 5500]));
add(H2('4.4 탱크 기본 수치'));
add(...T(['항목', '값', '설명'], [
  ['반지름', `${CFG.playerR} × 1.01^(레벨−1)`, `1레벨 ${CFG.playerR}, 45레벨 ${f1(CFG.playerR * lvPow(45))}. 총알 크기도 같은 비율로 커짐(기본 8 × ${CFG.bulletSizeMul})`],
  ['시야(줌)', `(1 − 0.0065 × (레벨−1)) × 클래스 시야 배율 × ${CFG.viewScale}(viewScale)`, `1레벨 ${f2(CFG.viewScale)}, 45레벨 ${f2((1 - 0.0065 * 44) * CFG.viewScale)}. 값이 작을수록 화면에 더 넓은 월드가 보임. 줌은 초당 3의 비율로 부드럽게 따라감`],
  ['최대 체력', '50 + 20 × 포인트 + 2 × (레벨−1)', '1레벨 기본 50'],
  ['이동 속도', '(230 + 20 × 포인트) ÷ 1.01^(레벨−1)', `가속은 이동 속도 × 마찰 ${CFG.drag}, 최종 속도가 위 값. 반동을 포함한 최고 속도는 1,500px/초로 제한`],
  ['스폰 무적', `${CFG.spawnInvuln}초`, '이동하거나 발사하면 즉시 해제. 무적 중에는 피해를 받지 않음(상대에게 주는 몸통 피해는 그대로). 화면에서 반투명하게 깜빡임'],
  ['오토 파이어', 'E 키', '발사 입력을 계속 누른 것으로 처리. 죽으면 꺼짐'],
], [1800, 3500, W - 5300]));
add(H2('4.5 클래스 (15레벨과 30레벨에서 선택)'));
add(P('기본 클래스는 Tank이고 15레벨(`classUpLevel`)에 한 번 4개 중 하나를 고르고, 30레벨(`classUpLevel2`)에 한 번 더 고를 수 있습니다(선택은 좌상단 타일 클릭, 키보드 단축키 없음). 30레벨 선택지는 15레벨에서 고른 클래스에 따라 달라지며 `CFG.classUp30`에 있습니다. 배율은 기본 Tank 기준입니다. 레벨 45 업그레이드 트리와 드론·트랩·자동 포탑·Smasher 클래스는 아직 없습니다(11장).'));
{
  const rtOf = k => CL[k].rt || TANK_RT;
  const rows = Object.keys(CL).map(k => { const c = CL[k]; return [c.n, 'x' + c.dmg, 'x' + c.pen, 'x' + c.speed, `${rtOf(k)[0]}→${rtOf(k)[7]}틱${c.reloadMul ? ' x' + c.reloadMul : ''}`, 'x' + c.fov, 'x' + c.recoil]; });
  add(...T(['클래스', '피해', '관통(총알 체력)', '총알 속도', '재장전(0→7포인트)', '시야 배율', '반동'], rows, [1900, 1000, 1500, 1300, 2000, 1000, 938], { size: 17, align: Array(7).fill(CT) }));
}
add(...T(['클래스', '포신과 특징'], [
  ['Tank', '포신 1개(길이 1.9, 너비 0.84, 탱크 반지름 기준). 가장 단순한 기준 클래스.'],
  ['Twin', '포신 2개(길이 1.9, 각 너비 0.84, 좌우 ±0.52 오프셋)가 **번갈아** 발사(재장전/2 간격). 총알 크기 0.85배. 연사 2배에 피해 0.65배, 관통 0.9배라 DPS 약 130%. 반동 0.25배.'],
  ['Sniper', '긴 포신(2.2). 총알 속도 1.4배, 재장전이 느리고(23→12틱), 시야가 넓음(0.85). 반동 0.25배.'],
  ['Machine Gun', '사다리꼴 포신(길이 1.9, 밑동 0.84에서 끝 1.47로 넓어짐). 재장전이 약 2배 빠르고(8→4틱), 피해 0.7배, 총알이 ±0.16라디안(약 ±9.2도) 퍼짐, 총알 크기 0.9배. 반동 0.4배.'],
  ['Flank Guard', '앞 포신(1.9) + 뒤 포신(1.35, 180도 회전)이 **동시에** 발사. 피해 100%. 앞뒤 반동이 상쇄되어 정지한 채로 쏠 수 있음.'],
  ['Triple Shot (30레벨)', '포신 3개(앞 + 좌우 ±0.5라디안)가 동시에 발사. 총알 크기 0.85배. 위키 기준: 피해 0.7배, 관통은 Twin보다 약 11% 높음(1.0). 재장전 x1.8은 **추정**(앞쪽 지표를 Twin과 비슷하게 맞춤).'],
  ['Twin Flank (30레벨)', '앞 2 + 뒤 2 포신이 번갈아 발사(앞뒤 반동 상쇄). 위키: Twin보다 피해가 더 낮음, 피해 0.55는 **추정**(앞쪽 지표가 Tank와 비슷하도록).'],
  ['Quad Tank (30레벨)', '십자 4방향 포신이 동시에 발사. 위키: 피해 5.25(= 기본의 0.75배), 총알 내구도 75%.'],
  ['Tri-Angle (30레벨)', '앞 포신 1개(보통 총알) + 뒤쪽 양옆(180도 ± 0.5라디안)으로 벌어진 포신 2개가 동시에 발사. 위키: 뒤 포신 총알은 위력 20%, 수명 약 절반(1.5초). 포신별 `dmg`·`pen`·`life` 배율(뒤 포신 0.2·1·0.5)을 새로 지원하며, 뒤 포신의 각도·길이·너비는 **추정**. 뒤로 쏘는 반동이 몸을 앞으로 밀어 줌.'],
  ['Assassin (30레벨)', 'Sniper보다 긴 포신(2.5). 위키: 총알 속도 1.5배, 재장전 30틱(포인트마다 -2, -2, -3, -2, -1, -2, -2틱). 시야 0.75, 피해·관통 1.0은 **추정**.'],
  ['Hunter (30레벨)', '길고 가는 포신(2.2, 너비 0.6) + 짧고 굵은 포신(1.7, 너비 0.95)이 동시에 발사해 한 번에 2발. 위키: 피해 0.75배(5.25), 총알 속도 1.4배, 재장전 38틱. 재장전 표는 Sniper 표 x 38/23의 반올림으로 **추정**.'],
  ['Destroyer (30레벨)', '굵은 포신 1개(너비 1.3), 총알 크기 2배, 총알 속도 0.7배, 피해 3배(위키 기준 Annihilator가 21 = 3배이며 Destroyer와 같음). 재장전 Tank x4(60틱), 반동 2.5배, 한 발의 하한·상한 배율 0.4·0.33은 **추정**(상한이 다른 클래스와 비슷하도록).'],
  ['Gunner (30레벨)', '가는 포신 4개(너비 0.42, 총알 크기 0.55배)가 번갈아 발사. 피해 0.2배, 재장전 Machine Gun 표 x1.15, 탄 퍼짐 ±0.14라디안. 위키는 "작고 약한 총알, 재장전 크게 증가"만 있어 수치는 모두 **추정**(정면 지표를 Machine Gun의 약 1.1배로 맞춤).'],
], [1900, W - 1900]));
add(H3('30레벨 선택지 (classUp30)'));
add(...T(['15레벨 클래스', '30레벨에서 고를 수 있는 클래스'], Object.keys(CFG.classUp30).map(k => [CL[k].n, CFG.classUp30[k].map(x => CL[x].n).join(', ') || '(아직 없음)']), [2400, W - 2400]));
add(H3('재장전 틱 표 (포인트 0~7)'));
add(...T(['클래스', '0', '1', '2', '3', '4', '5', '6', '7'], [['Tank, Twin, Flank Guard', ...TANK_RT.map(String)], ['Sniper', ...CL.sniper.rt.map(String)], ['Machine Gun', ...CL.machine.rt.map(String)]], [2400, ...Array(8).fill(Math.floor((W - 2400) / 8))], { size: 17, align: Array(9).fill(CT) }));
add(P(`1틱 = ${TICK}초이므로 Tank 0포인트는 0.60초, 7포인트는 0.32초에 한 발입니다.`));
add(H2('4.6 발사, 총알, 반동'));
add(...BUL([
  `**총알 생성:** 포신 끝(길이의 92%)에서 발사 방향으로 생성됩니다. 총알 크기 = 8 × 1.01^(레벨−1) × 포신별 배율 × ${CFG.bulletSizeMul}(bulletSizeMul). 동시에 존재하는 총알은 최대 500개이고, 넘으면 가장 오래된 것을 지웁니다.`,
  `**지속시간:** 1.9초 × ${CFG.bulletLife} = **${f2(1.9 * CFG.bulletLife)}초**. 사거리 = 총알 속도 × 지속시간(Tank 0포인트 약 ${n0(480 * CFG.bulletSpeedMul * 1.9 * CFG.bulletLife)}px).`,
  '**총알 체력:** (2 + 1.5 × 포인트) × 4 × 클래스 관통 배율. 예) 관통 0포인트 8, 3포인트 26, 7포인트 50.',
  '**반동:** 쏜 방향의 반대로 밀립니다(운동량 보존). 아래 식으로 계산하고 두 단계 지연(시상수 0.04초, 0.07초)을 거쳐 부드럽게 전달합니다.',
]));
add(...FML([`반동 속도 = min(${CFG.recoilMax}, ${CFG.recoilK} × ${CFG.recoilMul} × 클래스 반동 × (총알 크기 ÷ 탱크 반지름)² × √(총알 속도 × ${CFG.recoilV}))`, `${CFG.recoilMul}는 모든 레벨에 같은 반동 보정(50%)입니다. 레벨에 따른 보정은 없습니다. 식의 총알 크기와 속도는 기본 배율(크기 ×${CFG.bulletSizeMul}, 속도 ×${CFG.bulletSpeedMul})을 곱하기 전의 값을 써서, 이 배율을 바꿔도 반동은 달라지지 않습니다(diep.io에서 반동은 클래스별 숨은 배율).`]));
add(H2('4.7 사망과 재시작'));
add(...BUL([
  '체력이 0 이하가 되면 사망합니다. 오토 파이어가 꺼지고, **마지막으로 피해를 준 대상**을 카메라가 부드럽게 따라가며 관전합니다(대상이 죽으면 그 자리에 고정, "Spectating 이름" 표시).',
  '사망 화면에 처치한 대상(`You were killed by 이름` 또는 `a/an 도형 이름`)과 Score, Level, Kills, Time, 재시작 레벨이 표시됩니다. 닉네임을 바꿔 다시 시작할 수 있습니다(최대 15자).',
  '**월드는 유지**됩니다. 봇, 도형, 크래셔, 총알은 그대로 두고 플레이어만 새로 만듭니다. 시작 위치는 둥지 반경 + 900 밖에서, 봇과의 거리가 250px 이상이 되는 곳을 40번까지 시도해 고릅니다.',
  '나를 처치한 봇은 `40 + 내 점수 × 0.5`의 점수를 받습니다.',
]));
add(H3('재시작 레벨 규칙 (respawnMode: diep)'));
add(...FML(['레벨 ≤ 11 → max(1, 레벨 − 1)', '레벨 12~15 → 12', '레벨 16~29 → max(12, 레벨 ÷ 2 내림)', '레벨 ≥ 30 → 레벨 ÷ 2 내림']));
add(...T(['사망 레벨', ...[1, 2, 5, 8, 11, 12, 15, 16, 20, 25, 29, 30, 40, 45].map(String)], [['재시작 레벨', ...[1, 2, 5, 8, 11, 12, 15, 16, 20, 25, 29, 30, 40, 45].map(L => String(respawnLevel(L)))]], [1300, ...Array(14).fill(Math.floor((W - 1300) / 14))], { size: 15, align: Array(15).fill(CT) }));

/* =================== 5. 전투 규칙 =================== */
add(H1('5. 전투 규칙'));
add(H2('5.1 총알이 대상에 닿아 있을 때 (접촉 틱 교환)'));
add(...NUM([
  '대상의 **방어값(cost)** 을 구합니다: 탱크는 `5 + Body Damage 포인트`(=Body Damage 능력치), 도형·크래셔는 도형별 `bcost`.',
  '총알이 대상과 **겹쳐 있는 동안 매 틱(0.04초)** 서로 피해를 교환합니다. 대상은 총알 피해(`Bullet Damage`)만큼 체력을 잃고, 총알은 대상의 방어값(cost)만큼 총알 체력을 잃습니다. 프레임 시간이 틱과 다르므로 `프레임 시간 ÷ 0.04`를 곱해 연속으로 계산합니다.',
  '총알 체력이 한 틱분보다 적게 남았으면 마지막 교환은 **남은 비율만큼만** 하고 총알이 사라집니다(대상이 받는 피해 = 총알 피해 × 남은 체력 ÷ cost). 그래서 체력이 cost보다 낮은 총알의 피해는 줄어듭니다. 기본 총알(체력 8, 피해 7)이 오각형(cost 12)에 주는 피해 4.7, 육각형(cost 16)에 주는 피해 3.5가 이렇게 나오며 diep.io 위키 베타 문서의 값과 같습니다.',
  '총알 체력이 남으면 대상을 뚫고 나가거나 몸 안에 머물며 계속 교환하고, 나간 뒤에는 다음 대상과 같은 규칙으로 교환합니다. 접촉하는 시간은 `겹치는 거리 ÷ 총알 속도`입니다. 총알 체력이 0 이하가 되면 소멸합니다.',
  '총알 소유자 자신은 맞지 않고, 플레이어도 봇의 총알과 같은 규칙으로 교환합니다. 무적인 대상은 피해를 받지 않지만 총알은 체력을 잃습니다. 대상은 총알에 밀리고 총알은 방향이 꺾입니다(아래 밀림과 꺾임 참고). 마지막으로 피해를 준 탱크가 처치 보상을 받습니다.',
], 4));
add(...FML(['한 프레임: u = 프레임 시간 ÷ 0.04,   f = min(1, 총알 체력 ÷ (cost × u))', '대상 피해 = 총알 피해 × u × f,   총알 체력 −= cost × u × f', '한 대상에 주는 총 피해 ≈ 총알 피해 × min(총알 체력 ÷ cost, 겹친 틱 수)']));
{
  const BR = 8 * CFG.bulletSizeMul, SP0 = 480 * CFG.bulletSpeedMul, through = r => 2 * (r + BR) / (SP0 * TICK), perB = (hp, c, r, d) => d * Math.min(hp / c, through(r)), nKill = (sh, hp, d) => Math.ceil(sh.hp / perB(hp, sh.bcost, sh.r, d) - 1e-9);
  add(P(`**겹치는 틱 수**는 총알이 대상 중심을 정면으로 지나갈 때 \`2 × (대상 반지름 + 총알 반지름 ${BR}) ÷ (총알 속도 × 0.04)\`입니다. 총알 속도 ${SP0}px/초(Bullet Speed 0포인트)이면 한 틱에 ${f1(SP0 * TICK)}px를 움직입니다. 비껴 맞으면 더 짧습니다.`));
  add(H3('도형별 방어값과 정면 통과 조건 (계산값)'));
  add(...T(['도형', '반지름', 'cost', '정면 통과 시 겹치는 틱 수', '정면 통과에 필요한 총알 체력', '필요 관통(Tank 계열)'], shapeRows.map(([k, n]) => { const sh = S[k], need = sh.bcost * through(sh.r), p = Math.ceil(((need / CFG.bulletHp) - 2) / 1.5 + 1e-9); return [n, String(sh.r), String(sh.bcost), f1(through(sh.r)), `${f1(need)} 초과`, p <= CFG.maxPts ? `${p}포인트` : `${p}포인트 (7 초과, 개발자 모드만)`]; }), [1500, 900, 800, 2200, 2400, W - 7800], { align: Array(6).fill(CT) }));
  add(P('관통 7포인트(총알 체력 50)로도 오각형·육각형·알파 오각형을 정면으로 완전히 통과하지는 못하고 몸 안에서 소멸하며, 그 동안 계속 피해를 줍니다. 사각형과 삼각형은 관통 ' + (a => a[0] === a[1] ? a[0] : a[0] + '~' + a[1])([S.square, S.triangle].map(sh => Math.ceil(((sh.bcost * through(sh.r)) / CFG.bulletHp - 2) / 1.5 + 1e-9))) + '포인트부터 정면 통과가 가능하고, 가장자리를 스치듯 맞으면 겹치는 시간이 짧아 더 쉽게 통과합니다.'));
  add(H3('도형 처치에 필요한 발수 (계산값, 정지한 도형을 정면으로 쏠 때)'));
  add(P('기본 = 관통 0·피해 0포인트(총알 체력 8, 피해 7), 중간 = 관통 3·피해 3(체력 26, 피해 16), 최대 = 관통 7·피해 7(체력 50, 피해 28). 총알 속도는 모두 ' + n0(SP0) + 'px/초, 총알 반지름은 ' + f1(BR) + '. 괄호는 총알 한 발의 총 피해입니다.'));
  const bs = [[8, 7], [26, 16], [50, 28]];
  add(...T(['도형', '체력', '점수', '기본', '중간', '최대'], shapeRows.map(([k, n]) => { const sh = S[k]; return [n, n0(sh.hp), n0(sh.xp), ...bs.map(([h, d]) => `${n0(nKill(sh, h, d))}발 (${f1(perB(h, sh.bcost, sh.r, d))})`)]; }), [1700, 1100, 1100, 1900, 1900, W - 7700], { align: Array(6).fill(CT) }));
  add(H3('탱크에 대한 영향 (계산값, 정지한 레벨 1 탱크를 정면으로 맞힐 때 총알 한 발의 총 피해)'));
  add(...T(['총알', 'Body 0 탱크 (cost 5)', 'Body 7 탱크 (cost 12)', '이전 모델(대상당 1회 정산): Body 0 / Body 7'], [['기본 (체력 8, 피해 7)', ...[5, 12].map(c => f1(perB(8, c, CFG.playerR, 7))), `${f1(7 * Math.min(1, 8 / 5))} / ${f1(7 * Math.min(1, 8 / 12))}`], ['중간 (체력 26, 피해 16)', ...[5, 12].map(c => f1(perB(26, c, CFG.playerR, 16))), `${f1(16 * Math.min(1, 26 / 5))} / ${f1(16 * Math.min(1, 26 / 12))}`], ['최대 (체력 50, 피해 28)', ...[5, 12].map(c => f1(perB(50, c, CFG.playerR, 28))), `${f1(28 * Math.min(1, 50 / 5))} / ${f1(28 * Math.min(1, 50 / 12))}`]], [2600, 2200, 2200, W - 7000], { align: [AlignmentType.LEFT, CT, CT, CT] }));
  add(NOTE('**전투 속도가 크게 달라집니다.** 새 모델에서는 총알이 탱크 몸 안에 머무는 동안 계속 피해를 주므로, Body Damage가 낮은 탱크에게는 기본 총알도 이전(7)보다 큰 피해(' + f1(perB(8, 5, CFG.playerR, 7)) + ')를 주고, 관통·피해를 높게 찍은 총알은 이전 28에서 ' + n0(perB(50, 5, CFG.playerR, 28)) + '까지 늘어납니다. 관통과 피해를 같이 올리는 빌드의 전투력이 크게 오르는 변경이라, 봇 개체군·사망 속도·도형 파밍 속도 모두 이전 측정과 다를 수 있습니다(측정 전).', 'warn'));
}
add(H3('총알 한 발이 한 대상에 주는 총 피해의 범위 (bulletRange)'));
{
  const BR = CFG.bulletRange;
  add(P('접촉 틱 교환만 쓰면 총 피해 = 틱당 피해 Dt × min(총알 체력 ÷ 대상 Body, 몸을 통과하는 틱 수)가 되어, 피해 포인트와 관통 포인트가 곱해지면서 한 발의 피해 범위가 매우 넓었습니다(측정: 최소 2.7 ~ 최대 233.3, 85.5배). 그래서 **탱크 고유 특성(클래스), Bullet Damage, Bullet Penetration** 세 가지로만 정해지는 범위를 두고, 접촉 틱 교환으로 계산한 누적 피해를 그 안으로 제한합니다.'));
  add(...BUL([
    '**하한** Dmin = Dt × tMin × (클래스 rangeMin). **상한** Dmax = Dt × (tMaxA + tMaxB × P) × (클래스 rangeMax). Dt = 틱당 피해 = (7 + 3 × Bullet Damage 포인트) × 클래스 피해 배율, P = 총알 체력 ÷ bulletHp = (2 + 1.5 × Penetration 포인트) × 클래스 관통 배율, tMin = ' + BR.tMin + ', tMaxA = ' + BR.tMaxA + ', tMaxB = ' + BR.tMaxB + '. 클래스의 rangeMin/rangeMax는 설정하지 않으면 1입니다.',
    '**동작:** 한 대상에 준 누적 피해 = clamp(접촉 틱 교환으로 계산한 누적, Dmin, Dmax). 총알이 대상에 처음 닿는 프레임에 Dmin을 바로 주고, 계산이 Dmin을 넘으면 그만큼 더 주며, Dmax에 닿으면 그 대상에게는 더 주지 않습니다. 총알은 계속 진행하고 체력도 계속 소모되어 관통으로 다른 대상을 뚫는 능력은 그대로입니다.',
    '**적용 대상:** `target = ' + BR.target + '`: 탱크(플레이어와 봇)가 맞을 때만 적용하고 도형·크래셔는 이전과 같습니다(`all`이면 모두). `mode = legacy`이면 범위 제한이 없습니다(이전 동작).',
    '**주의:** tMaxA + tMaxB × P가 tMin보다 작으면(Penetration 0포인트 근처) 상한이 하한보다 낮아지므로 상한을 하한과 같게 올립니다. 그 경우 총알은 대상의 Body와 관계없이 항상 Dmin만 줍니다.',
  ]));
  add(NOTE('**측정(시뮬레이션, 시드 1, 정면 직격한 정지 탱크, 조합 1,785개의 격자 평균이며 실제 플레이 분포가 아님):** 최소 2.7 → 6.8, 평균 41.3 → 34.1(약 17% 감소), 최대 233.3 → 109.9, 최대/최소 85.5배 → 16.1배, 한 발에 대상 최대 체력을 넘는 조합 12.1% → 4.7%. 클래스별 최대는 Tank·Flank 110, Sniper 110, Machine Gun 77, Twin 66. `ttk`(처치 시간)는 약한 사수가 강한 대상을 잡는 시간이 짧아졌고(Lv1 → Lv45 23.1초 → 15.9초, Lv1 → Lv15 11.5초 → 8.8초) 강한 사수가 약한 대상을 잡는 시간은 길어졌습니다(Lv15 → Lv1 1.07초 → 1.55초). 같은 시드 한 판에서 봇 사망은 `types` 분당 2.4 → 1.0, `pop` 분당 1.9 → 1.6으로 줄었지만 표본이 작아 구분되지 않습니다. 도형 처치 발수(`shapes`)와 밀림·꺾임(`knockcheck`), 총알 충돌(`clashcheck`)은 이전과 같았습니다.', 'warn'));
}
add(H3('밀림과 꺾임 (질량 모델)'));
{
  const Pu = CFG.bulletPush, Df = CFG.bulletDeflect, BD = CFG.bulletBaseDmg, vb = 480 * CFG.bulletSpeedMul, rb = 8 * CFG.bulletSizeMul, through = r => 2 * (r + rb) / (vb * TICK);
  add(P('diep.io 위키는 투사체가 부딪힌 대상을 밀어내고(총알 크기와 피해 포인트가 클수록 넉백이 커짐), 총알도 그 과정에서 튕겨 방향이 꺾이며, 탱크마다 밀림을 줄이는 숨은 저항이 있다고 설명합니다. 실제 수치와 공식은 확인하지 못해서, 아래는 이 설명을 바탕으로 한 **근사 모델**입니다.'));
  add(...BUL([
    '**질량:** 탱크 = 반지름², 도형·크래셔 = 반지름² × 질량 배수(육각형 2, 알파 4), 총알 = (총알 반지름)² × (총알 피해 ÷ ' + BD + '). 총알 크기와 피해 포인트가 클수록 총알이 무겁습니다.',
    '**대상의 밀림:** 총알과 겹쳐 있는 동안 매 틱 총알 방향으로 속도가 더해집니다. 더해지는 양 = 다가오는 속도 × (총알 질량 ÷ (총알 질량 + 대상 질량)) × `bulletPush` × 대상별 배율(`pushTank` 탱크·크래셔 ' + CFG.pushTank + ', `pushShape` 도형 ' + CFG.pushShape + ', `pushBullet` 총알 ' + CFG.pushBullet + ') × 교환 비중. 교환 비중은 접촉 틱 교환의 `프레임 시간 ÷ 0.04 × 남은 비율`이라 총알이 오래 머물수록 더 밀고 일찍 소멸하면 덜 밉니다. 한 프레임 최대 증가는 `bulletPushCap`입니다.',
    '**총알의 꺾임:** 속력은 그대로 두고 방향만 대상 중심의 반대쪽으로 꺾입니다. 정면으로 맞으면 직진하고 비껴 맞을수록 꺾이며, 대상이 무거울수록(총알 질량 비율이 낮을수록) 많이 꺾입니다(`bulletDeflect`, 한 프레임 최대 0.3라디안).',
    '**무적 대상**(스폰 무적 중인 탱크)은 밀리지 않습니다. 숨은 넉백 저항은 값을 몰라 설정 자리(`resist`, 기본 1)와 클래스별 배율 자리(`push`, 기본 1)만 두었습니다.',
    '밀린 속도는 기존 마찰(탱크)과 표류 복귀(도형)로 줄어듭니다.',
  ]));
  const rows = [...shapeRows.map(([k, n]) => [n, S[k].r ** 2 * (S[k].mass || 1), S[k].bcost, S[k].r, CFG.pushShape]), ['탱크 (Body 0)', CFG.playerR ** 2, 5, CFG.playerR, CFG.pushTank], ['탱크 (Body 7)', CFG.playerR ** 2, 12, CFG.playerR, CFG.pushTank]], bs = [[8, 7], [26, 16], [50, 28]];
  add(P(`총알 한 발이 정지한 대상을 정면으로 맞혔을 때 대상이 얻는 속도(px/초, 계산값, bulletPush ${Pu}, 총알 속도 ${vb}):`));
  add(...T(['대상', '질량', ...[7, 16, 28].map((d, i) => ['기본', '중간', '최대'][i] + ' (총알 질량 ' + n0(rb * rb * d / BD) + ')')], rows.map(([n, m, c, r, pf]) => [n, n0(m), ...bs.map(([h, d]) => { const mb = rb * rb * d / BD, sh = mb / (mb + m), k = Math.min(h / c, through(r)); return n0(vb * (1 - Math.pow(1 - sh * Pu * pf, k))); })]), [2400, 1300, 2000, 1900, W - 7600], { align: [AlignmentType.LEFT, CT, CT, CT, CT] }));
  add(P(`탱크의 최대 이동 속도는 약 230px/초(이동 0포인트), 도형의 표류는 5~22px/초입니다. 값은 직접 플레이해 보며 \`bulletPush\`(시작 ${Pu})와 \`bulletDeflect\`(시작 ${Df})로 조정하고, 대상별 강도는 \`pushTank\`(${CFG.pushTank}), \`pushShape\`(${CFG.pushShape}), \`pushBullet\`(${CFG.pushBullet})로 조정합니다. 실제 diep.io와 맞는지는 수치를 확인하지 못해 검증하지 않았습니다.`));
}
add(H2('5.2 총알끼리의 충돌'));
add(...BUL([
  '서로 다른 소유자의 총알만 충돌합니다(같은 탱크의 총알끼리는 부딪히지 않음). 한 프레임 동안의 상대 이동 경로로 판정해서 빠른 총알이 서로 통과하는 문제를 막습니다(사전 필터 120px).',
  '**현재 방식(`bulletClashMode = mass`):** 탱크·도형과 같은 **접촉 틱 교환**입니다. 겹쳐 있는 동안 매 틱 각 총알은 상대 총알의 피해량만큼 체력을 잃고, 체력이 먼저 바닥나는 쪽까지만 교환합니다(마지막 틱은 남은 비율만큼). 승패를 한 번에 정하지 않으므로 체력이 충분하면 **둘 다 살아남아** 서로 지나칠 수 있습니다.',
  '**질량 모델도 같이 적용:** 총알 질량은 반지름² × (피해 ÷ 7)이고, 서로를 대상으로 한 번씩 5.1의 밀림과 꺾임 규칙을 적용합니다. 상대 방향으로 속도가 더해져 살아남은 총알이 느려질 수 있습니다. 방향은 `bulletClashKeepDir`(현재 ' + CFG.bulletClashKeepDir + ')가 true이면 충돌 전 방향으로 되돌려 **바뀌지 않고**, false이면 꺾임으로 방향도 바뀝니다.',
  '**총알끼리 속도 보호:** 총알끼리의 밀림은 `pushBullet` 배율(현재 ' + CFG.pushBullet + ')만 적용하고, 충돌 뒤에도 총알 속도는 처음 속도의 `bulletMinSpeed`(현재 ' + CFG.bulletMinSpeed + ') 밑으로 떨어지지 않습니다. 느려진 총알이 겹침이 길어져 정지·소멸하는 되먹임을 막기 위한 장치입니다. 방향 고정이 켜져 있으면 속도는 밀린 속도의 원래 방향 성분(처음 방향으로 투영한 값)으로 정하고 처음 속도를 넘지 않게 제한하므로, 역방향으로 되튀거나 처음보다 빨라지는 일이 없습니다.',
  '**이전 방식(`bulletClashMode = instant`):** 각 총알의 내구도 q = (피해 ÷ 최초 체력) × 현재 체력²을 비교해 큰 쪽이 살아남고, 남는 체력은 √((큰 q − 작은 q) ÷ 큰 쪽의 피해/최초 체력)입니다. 두 q의 차이가 큰 쪽의 ' + (CFG.clashTol * 100) + '% 이내(clashTol ' + CFG.clashTol + ')면 둘 다 사라집니다.',
  '**되돌리기:** 설정 `bulletClashMode`를 instant로 바꾸면 이전 방식으로 돌아갑니다. 파일 전체 백업은 `backups/2026-10-07_before_bullet_clash_mass` 폴더에 있습니다.',
]));
{
  const TKS = TICK, v0 = 336, ovl = (a, b) => 2 * (a[2] + b[2]) / ((2 * v0) * TKS);
  const massRes = (a, b) => { const tt = ovl(a, b), f = Math.min(tt, a[1] / b[0], b[1] / a[0]); return [Math.max(0, a[1] - b[0] * f), Math.max(0, b[1] - a[0] * f), tt]; };
  const instRes = (a, b) => { const ka = a[0] / a[1], kb = b[0] / b[1], qa = ka * a[1] * a[1], qb = kb * b[1] * b[1]; if (Math.abs(qa - qb) <= CFG.clashTol * Math.max(qa, qb)) return [0, 0]; return qa > qb ? [Math.sqrt((qa - qb) / ka), 0] : [0, Math.sqrt((qb - qa) / kb)]; };
  const fmt = x => x < 0.05 ? '소멸' : '체력 ' + x.toFixed(1);
  const bas = [7, 8, 10.4], twn = [4.55, 7.2, 8.84], mx = [28, 50, 10.4];
  add(P('같은 속도(' + v0 + 'px/초)로 정면에서 부딪힐 때의 계산 예입니다(괄호는 피해, 최초 체력, 반지름. 질량 방식의 결과는 밀림과 꺾임을 제외한 체력 변화만 계산).'));
  add(...T(['조합 (A 대 B)', '겹치는 틱 수', '현재 방식(mass) A / B', '이전 방식(instant) A / B'], [['기본(7, 8) 대 기본', bas, bas], ['기본 대 Twin(4.55, 7.2)', bas, twn], ['기본 대 피해7·관통7(28, 50)', bas, mx], ['피해7·관통7 끼리', mx, mx]].map(([n, a, b]) => { const m = massRes(a, b), i = instRes(a, b); return [n, f1(m[2]), fmt(m[0]) + ' / ' + fmt(m[1]), fmt(i[0]) + ' / ' + fmt(i[1])]; }), [3000, 1300, 2500, W - 6800], { align: [AlignmentType.LEFT, CT, CT, CT] }));
  add(NOTE('**차이:** 이전 방식은 항상 한쪽이 지거나 둘 다 사라졌지만, 현재 방식은 총알 체력이 충분한 경우(예: 피해7·관통7끼리) 둘 다 살아남아 서로 지나칩니다. 그래서 총알이 이전보다 오래 남아 화면의 총알 수가 늘 수 있습니다.', 'warn'));
}
add(H2('5.3 몸통 충돌'));
add(P('충돌 틱(0.04초)마다 겹침이 1px 이상이면 **서로 한 번씩** 피해를 주고, 질량에 따라 튕겨 나갑니다.'));
add(...T(['충돌 상대', '내가 받는 피해', '내가 주는 피해'], [
  ['탱크 ↔ 탱크', '상대 Body Damage 능력치 × 6', '내 Body Damage 능력치 × 6'],
  ['탱크 → 도형', '도형 몸통 피해(dmg)', '내 Body Damage 능력치 × 4'],
  ['탱크 → 크래셔', '크래셔 몸통 피해 8', '내 Body Damage 능력치 × 4'],
], [2200, 3700, W - 5900]));
add(...BUL([
  '**튕김:** 반발 계수 0.6, 질량 = 반지름² × 도형 질량 배수(육각형 2, 알파 4)이고, 탱크와 부딪힐 때 사각형·삼각형·오각형은 여기에 `bodyPhys.shapeMass`(' + CFG.bodyPhys.shapeMass.square + ')를 더 곱해 가볍게 계산합니다(탱크가 덜 멈춤, `bodyPhys.mode = legacy`이면 곱하지 않음, 육각형·알파·크래셔·탱크끼리의 충돌은 그대로). 겹침은 겹친 양의 65%씩 질량이 가벼운 쪽이 더 많이 밀려 해소합니다.',
  '무적 상태의 탱크는 피해를 받지 않지만 상대에게는 피해를 줍니다.',
]));
add(H3('레벨 1 탱크(체력 50)가 도형과 부딪힐 때 (계산값)'));
add(...T(['도형', '탱크가 받는 피해/틱', '탱크가 죽는 데 걸리는 틱 (시간)', '탱크(Body 0)가 도형을 죽이는 틱', '탱크(Body 7)가 도형을 죽이는 틱'], shapeRows.map(([k, n]) => { const s = S[k], t = Math.ceil(50 / s.dmg); return [n, String(s.dmg), `${t}틱 (${f2(t * TICK)}초)`, n0(Math.ceil(s.hp / 20)) + '틱', n0(Math.ceil(s.hp / 48)) + '틱']; }), [1500, 1500, 2400, 2100, W - 7500], { align: Array(5).fill(CT) }));
add(P('사각형과 삼각형은 박치기로 이길 수 있지만, 오각형은 레벨 1에서 둘 다 죽고, 육각형과 알파는 닿기만 해도 레벨 1 탱크가 즉사합니다.'));
add(H2('5.4 체력 회복'));
add(...BUL([
  `**맞은 직후에도 항상** 초당 최대 체력의 (0.03 + 0.12 × Regen 포인트) ÷ 30만큼 회복합니다(0포인트 0.1%/초, 7포인트 2.9%/초). 이전에는 마지막으로 맞은 뒤 2초가 지나야 시작했는데 이 대기 시간을 없앴습니다.`,
  `맞지 않은 지 **${CFG.hyperAfter}초**가 넘으면 **급속 회복**: 초당 최대 체력의 ${f1(CFG.hyperRate * 100)}%.`,
  '도형: 육각형과 알파 오각형만 8초 동안 맞지 않으면 초당 최대 체력의 1%를 회복합니다(다른 도형과 크래셔는 회복하지 않음).',
]));
add(H2('5.5 처치 보상'));
add(...T(['처치하는 쪽', '처치당하는 대상', '얻는 점수'], [
  ['플레이어', '도형, 크래셔', '도형별 점수 × 1 (전부)'],
  ['플레이어', '봇', '40 + 봇 점수 × 0.5'],
  ['봇', '도형, 크래셔', `도형별 점수 × ${B.shapeXp} × 가속 배율(목표 레벨 미만일 때 ${B.catchUp} + ${B.catchUpRamp} × 소환 후 초, 아니면 1). 목표 레벨 최소 점수에 닿는 데까지만 가속`],
  ['봇', '봇 또는 플레이어', '40 + 상대 점수 × 0.5'],
], [1900, 2600, W - 4500]));
add(P('보상은 마지막으로 피해를 준 탱크에게 즉시 지급되며(경험치 구슬 없음), 지급 시점에 처치한 쪽이 살아 있어야 합니다.'));

/* =================== 6. 도형·크래셔·월드 구성 =================== */
add(H1('6. 도형, 크래셔, 월드 구성'));
add(H2('6.1 도형 종류'));
add(P('체력, 몸통 피해, 점수는 diep.io 위키를 기준으로 합니다. 반지름은 diep.io 캔버스 자료(탱크 반지름 50 기준: 사각형·삼각형 55, 오각형 75, 알파 오각형 200, 작은 크래셔 35, 큰 크래셔 55)를 탱크 반지름 24로 환산한 값이고, 육각형은 자료가 없어 오각형의 1.5배로 추정했습니다. 질량과 표류 속도는 이 프로젝트에서 정했습니다. 육각형은 사용자 지정으로 체력 1000(위키는 1500)입니다.'));
add(...T(['도형', '변', '반지름', '체력', '점수', '몸통 피해', 'bcost', '질량 배수', '체력 재생', '총알 통과', '색'], shapeRows.map(([k, n]) => { const s = S[k]; return [n, String(s.n), String(s.r), n0(s.hp), n0(s.xp), String(s.dmg), String(s.bcost), 'x' + (s.mass || 1), s.regen ? `${s.regen * 100}%/초` : '없음', s.solid ? '불가' : '가능', s.c]; }), [1400, 500, 800, 800, 800, 850, 750, 850, 1000, 850, 1038], { size: 16, align: Array(11).fill(CT) }));
add(...BUL([
  `**표류:** 도형은 천천히 떠다닙니다(속도 5~22px/초, 육각형 6, 알파 4). 방향 전환은 부드러운 보간(초당 1.5의 비율)이고 회전 속도는 ±0.6라디안/초 이내입니다.`,
  '**크래셔 점수:** 작은 크래셔(반지름 ' + CFG.crashers.small.r + ', 체력 10, 점수 15), 큰 크래셔(반지름 ' + CFG.crashers.large.r + ', 체력 30, 점수 25). 둘 다 몸통 피해 8, bcost 8.',
  `**겹침 방지:** 도형끼리는 최소 ${CFG.shapeGap}px 간격을 둡니다. 새로 만들 때는 빈 자리만 사용하고(30번 시도), 이미 있는 도형이 겹치면 0.04초마다 질량 비율로 밀어내며 이동 방향을 튕겨 줍니다. 알파 오각형은 빈 자리가 없어도 생성합니다.`,
]));
add(H2('6.2 도형 분포'));
add(H3('(1) 둥지 밖 일반 구역'));
add(P(`일반 도형 수 = 맵 크기² × ${CFG.shapeDensity.toExponential()}. 종류는 가중치로 뽑습니다(둥지에 들어가지 않는 위치에서만 생성).`));
add(...T(['도형', '가중치', '비율', '맵 16,583에서 평균 개수'], ['square', 'triangle', 'pentagon', 'hexagon'].map(k => { const free = Math.round(CFG.shapeDensity * 16583 * 16583); return [shapeRows.find(r => r[0] === k)[1], String(S[k].w), f2(S[k].w / wsum * 100) + '%', f1(free * S[k].w / wsum)]; }), [2000, 1700, 2000, W - 5700], { align: Array(4).fill(CT) }));
add(P('오각형 대 육각형은 약 25:1입니다(위키는 약 50:1이라고 하지만 사용자 지정으로 육각형 0.2%). 알파 오각형은 일반 구역에서 생성되지 않습니다.'));
add(H3('(2) 도형 군집 (맵 곳곳의 작은 도형 밀집 구역)'));
add(...T(['항목', '값'], [
  ['군집 수', `맵 면적 ÷ ${n0(K.areaPerCluster)} (반올림 기준 +0.35, 최소 1, 최대 ${K.maxCount}). 경계값에서 늘었다 줄었다 하지 않도록 ±0.35의 여유(히스테리시스)를 둠`],
  ['반지름', `${K.rMin} ~ ${K.rMax} 사이 무작위(군집마다)`],
  ['도형 수(목표, target)', `면적 × ${K.density.toExponential()} × (0.9~1.1 무작위) — 평균 약 ${f1(avgClusterShapes)}개. ${K.mode === 'legacy' ? '목표를 계속 유지하도록 보충' : '목표는 그 군집이 한 번에 만들어 내는 총 도형 수(총 생성 예산)'}`],
  ['종류', '사각형 군집 45% / 삼각형 군집 35% / 혼합 군집 20%'],
  ['구성', '사각형 군집: 사각형 85% + 삼각형 15%\n삼각형 군집: 삼각형 75% + 사각형 25%\n혼합 군집: 사각형 50% + 삼각형 40% + 오각형 10%'],
  ['전체 구성비(기댓값)', `사각형 ${f1(clComp.square * 100)}%, 삼각형 ${f1(clComp.triangle * 100)}%, 오각형 ${f1(clComp.pentagon * 100)}%`],
  ['수명과 이동', K.mode === 'legacy' ? `수명 ${K.life}초(×0.8~1.2). 수명이 끝나거나, 30초가 지난 뒤 도형이 목표의 ${K.depleted * 100}% 미만이거나, 맵 경계·둥지에 가까워지면 다른 곳으로 이동(남은 도형은 일반 도형이 됨)` : `일생: 위치 확정(도형 0개, 게임 시작 때는 목표의 ${K.startFill[0] * 100}~${K.startFill[1] * 100}%를 미리 채움) → 성장(${K.growTime[0]}~${K.growTime[1]}초 동안 하나씩 생성) → 생성한 개수(spawned)가 목표에 닿으면 군집을 바로 없애고 도형은 일반 도형이 됨. 군집 수는 면적 기준으로 유지되어 다른 곳에 새 군집이 생김. 안전장치로 수명 ${K.life}초(×0.8~1.2), 맵 경계·둥지에 가까워지는 경우에도 같은 방식으로 종료`],
  ['위치 조건', `둥지에서 반지름 + 300 이상, 다른 군집과 ${K.minGap}px 이상, 플레이어 시야(평소 기준) 밖`],
  ['보충 / 성장', K.mode === 'legacy' ? `군집당 초당 최대 ${K.refill}개(이전 5개/초 = 0.4초마다 2개). 0.4초마다 ${K.refill} × 0.4씩 누적해 1이 넘으면 생성하고, 화면 안이라 막혀도 한 틱 최대 2개까지만 몰아서 생성` : `보충하지 않음. 처치로 도형이 줄어도 다시 만들지 않고, 군집마다 초당 (목표 ÷ 성장 시간)개를 누적해 생성(화면 안이라 막히면 한 틱 최대 2개까지만 몰아서 생성). 생성에 성공한 만큼만 spawned를 올림`],
  ['종료 뒤 도형', K.release === 'zone' ? '원래 군집 경계 안에 머묾(일반 도형으로 셈)' : '경계 튕김이 사라져 일반 도형처럼 표류하며 흩어짐(초당 5~22px). 일반 도형 수가 목표의 1.15배를 넘을 때는 화면 밖의 오래된 도형부터 지움(군집이 막 풀어 놓은 도형이 먼저 지워지지 않도록)'],
  ['봇 배회', `도형이 목표의 ${K.attractMin * 100}% 이상 찬 군집만 배회 목적지 후보(성장 중인 빈 군집으로 몰리지 않음)`],
], [2300, W - 2300]));
add(H3('(3) 중앙 Pentagon Nest와 크래셔'));
add(...T(['항목', '값'], [
  ['반지름', `${n0(N.r)} × 맵 크기 ÷ ${n0(N.refMap)} — 맵 크기에 비례(항상 맵의 약 1.38%를 차지). 16,583에서 1,100`],
  ['오각형', `기준 ${N.pentagons}개(맵 16,583) × 면적 비. 도형 밀도는 맵 크기와 무관하게 일정(약 ${(N.pentagons / (Math.PI * N.r * N.r)).toExponential(2)}/px², 이전 기준 40개일 때 1.05e-5). 0.4초마다 2개씩 보충, 초과분은 화면 밖에서 서서히 제거`],
  ['육각형', `둥지에는 소환하지 않음(nest.hexagons = ${N.hexagons}, 재등장 ${N.hexRespawn}초 설정은 남아 있음)`],
  ['알파 오각형', `최대 ${N.alphaMax}개(맵 크기와 무관), 둥지 중심 가까이(반지름의 25% 이내)에 생성, 없어진 뒤 ${N.alphaRespawn}초 후 재등장`],
  ['크래셔', `기준 ${N.crasherMax}마리 × 면적 비, 큰 크래셔 비율 ${N.largeRatio * 100}%. 1.5초마다 부족한 만큼 1마리씩 보충(플레이어 500px 이내에는 만들지 않음)`],
  ['화면 표시', '둥지 바닥 색과 미니맵 원은 개발자 모드에서만 보임'],
], [2300, W - 2300]));
add(H2('6.3 크래셔 동작'));
add(...T(['항목', '작은 크래셔', '큰 크래셔'], [
  ['반지름 / 체력 / 점수 / 몸통 피해', `${CFG.crashers.small.r} / ${CFG.crashers.small.hp} / ${CFG.crashers.small.xp} / ${CFG.crashers.small.dmg}`, `${CFG.crashers.large.r} / ${CFG.crashers.large.hp} / ${CFG.crashers.large.xp} / ${CFG.crashers.large.dmg}`],
  ['이동 속도 / 추적 거리', `${CFG.crashers.small.speed} px/초 / ${CFG.crashers.small.range}`, `${CFG.crashers.large.speed} px/초 / ${CFG.crashers.large.range}`],
], [3400, 3100, W - 6500]));
add(...BUL([
  '0.2~0.4초마다 추적 거리 안에서 **가장 가까운 탱크**(플레이어와 봇 모두)를 목표로 삼아 돌진합니다. 추적 거리의 1.6배 넘게 벌어지면 포기합니다.',
  '대상이 없으면 둥지로 돌아가 천천히 맴돕니다(둥지 반지름의 90% 밖이면 중심으로 이동).',
]));

/* =================== 7. 봇 AI =================== */
add(H1('7. 봇 AI'));
add(P('봇은 `Bot extends Player`로, 플레이어와 똑같은 스펙과 성장 규칙을 씁니다. 매 프레임 AI가 **가짜 입력**(이동 방향, 발사 여부)과 조준 각도를 만들면 플레이어와 같은 이동·발사 코드가 처리합니다. 이 장의 성격 시스템은 2026-10-06 현재 **1단계(성격 유형 도입, 수치를 행동에 연결), 2단계(점수제 목표 선택, 떨림 방지), 3단계(능력치 투자·클래스 연동, 패널 표시)가 모두 코드에 들어 있습니다.** 2단계는 시뮬레이션으로 검증했습니다. 목표 전환(떨림)은 약 79% 줄었지만 봇 사망이 늘었습니다(10.6, 11장 17번). 3단계는 아직 시뮬레이션으로 검증하지 않았습니다(11장 20번).'));
add(H2('7.1 소환'));
add(...BUL([
  `**봇 수:** 목표 = min(${B.max}, ${B.base} + 플레이어 레벨 × ${B.perLevel}) (내림). 부족하면 ${B.spawnEvery}초마다 1마리 소환, 위치를 못 찾으면 0.5초 뒤 재시도.`,
  `**목표 레벨:** 50%는 1, 나머지 50%는 플레이어 레벨 × (0.3~0.7)을 반올림해 1~${B.maxSpawnLevel}로 제한. **시작 레벨은 항상 1**이고 이 값은 "목표 레벨"로 저장됩니다.`,
  '**위치:** 맵 안쪽 150px 여백 안에서 **완전 무작위**로 40번까지 뽑되, 플레이어의 평소 시야 안(개발자 줌과 무관)과 15레벨 미만 봇의 둥지 반경 + 900 안은 제외합니다.',
  `**스폰 무적과 대기:** 플레이어와 같은 무적(${CFG.spawnInvuln}초, 이동·발사하면 해제)을 받고, 소환 직후 0~${B.spawnIdle}초(봇마다 무작위) 동안은 이동과 발사 없이 서 있습니다. 대기가 끝나고 AI가 움직이면 무적이 풀리므로 실질적인 무적은 대기 시간과 같습니다.`,
  '**이름:** 동물 이름 목록에서 현재 존재하는 탱크와 겹치지 않게 고릅니다.',
]));
add(H2('7.2 성장 가속'));
add(P(`1레벨로 소환된 봇이 목표 레벨보다 낮은 동안은 도형·크래셔 점수 배율에 **가속 배율**이 곱해집니다. 가속 배율 = ${B.catchUp} + ${B.catchUpRamp} × 소환 후 경과 초 (소환 직후 5배에서 시작해 초당 0.5씩 증가). 목표 레벨에 도달하면 가속이 꺼지고 원래 배율(${B.shapeXp})로 돌아갑니다. 탱크 처치 보상에는 적용되지 않습니다. 또한 가속은 **목표 레벨의 최소 점수에 닿는 데까지만** 적용됩니다. 한 번의 획득에서 가속된 점수가 목표까지 남은 점수보다 크면 남은 점수까지만 얻고(기본 획득량보다 적어지지는 않음), 목표 레벨에 도달하면 가속이 꺼집니다. 그래서 큰 도형을 잡아도 목표 레벨을 넘어 오르지 않습니다.`));
add(P('측정(헤드리스, 봇 한 마리 단독, 각 5회, 시드 1)에서 목표 레벨 14까지 가속이 없으면 90초 안에 도달하지 못했지만 이 가속에서는 중앙값 19초(최대 48초)에 도달했습니다(10장).'));
add(H2('7.3 성격 유형과 수치'));
add(P(`성격 수치는 5개(0~1)입니다. 봇이 생길 때 아래 7개 유형 중 하나가 **균등 확률**로 정해지고, 유형의 값이 **그대로**(랜덤 편차 없음) 그 봇의 성격이 되며 평생 바뀌지 않습니다. 숙련도만 유형과 무관하게 ${CFG.botSkill[0]}~${CFG.botSkill[1]} 균등 분포에서 봇마다 뽑습니다(모든 유형의 평균이 같아 유형이 더 강해지지 않음).`));
add(...T(['수치', '0 ↔ 1', '영향을 주는 것'], [
  ['대담함', '신중·도주 ↔ 대담·투쟁', '도망 시작 체력, 강한 상대를 두려워하는 레벨 차이, 교전 시야'],
  ['목표지향', '도형 파밍 ↔ 탱크 사냥', '사냥·파밍 점수의 상대 비중, 대상이 없을 때의 배회 방향'],
  ['끈기', '쉽게 포기 ↔ 끝까지 추격', '시야 밖으로 나간 상대를 쫓는 시간·거리, 현재 목표 유지 보너스, 최소 유지 시간'],
  ['복수심', '무심 ↔ 복수', '때린 상대를 기억하는 시간, 그 상대를 노리는 점수 가중'],
  ['숙련도', '서툼 ↔ 능숙', '조준 오차 (총알 회피는 다음 단계)'],
], [1700, 2600, W - 4300]));
add(...T(['유형', '대담함', '목표지향', '끈기', '복수심', '느낌'], [
  ['안전농부', '0.20', '0.15', '0.30', '0.20', '싸움을 피하고 도형만 팜'],
  ['겁없는농부', '0.85', '0.20', '0.40', '0.30', '위험을 개의치 않고 파밍'],
  ['저격형', '0.25', '0.80', '0.30', '0.40', '유리할 때만 공격하고 빠짐'],
  ['돌격형', '0.85', '0.85', '0.80', '0.50', '체력이 낮아도 돌진'],
  ['복수자', '0.50', '0.50', '0.60', '0.95', '때린 상대를 집요하게 쫓음'],
  ['추격자', '0.60', '0.70', '0.95', '0.40', '한 번 정하면 끝까지 따라감'],
  ['균형형', '0.50', '0.50', '0.50', '0.50', '기준(전부 0.5)'],
], [1500, 1000, 1100, 1000, 1000, W - 5600], { align: [AlignmentType.LEFT, CT, CT, CT, CT, AlignmentType.LEFT] }));
add(H2('7.4 수치가 행동에 연결되는 식'));
add(...T(['수치', '연결 대상', '식'], [
  ['대담함 b', '도망 시작 체력', `${FX.fleeHp[0]} + (${FX.fleeHp[1]}) × b → 55%에서 15% (botFight.mode = legacy에서만 사용)`],
  ['대담함 b', '겁내는 레벨 차이 (상대가 이만큼 높으면 도주)', `${FX.fearGap[0]} + ${FX.fearGap[1]} × b → 2에서 18레벨 (legacy에서만 사용)`],
  ['대담함 b', '싸움 기준 (전투 우위 R이 이 이상이면 싸움, 7.9)', `${CFG.botFight.thrMul} × (${CFG.botFight.needBase} − ${CFG.botFight.needBold} × b) → 1.15에서 0.46`],
  ['대담함 b', '교전 시야', `750 × (${FX.sight[0]} + ${FX.sight[1]} × b) ÷ 클래스 시야 배율`],
  ['끈기 p', '시야 밖 추격 시간', `${FX.chaseT[0]} + ${FX.chaseT[1]} × p 초, 거리는 시야의 (1 + p)배까지`],
  ['끈기 p', '현재 목표 유지 보너스', `${FX.stayBase} + ${FX.stayK} × p (새 후보의 원점수가 현재 목표의 원점수 × 이 배수보다 높아야 교체)`],
  ['끈기 p', '최소 유지 시간', `${FX.holdBase} + ${FX.holdK} × p 초`],
  ['복수심 r', '복수 기억 시간', `${FX.grudgeT[0]} + ${FX.grudgeT[1]} × r 초 (시야의 ${FX.grudgeRange}배 거리까지 노림)`],
  ['복수심 r', '복수 대상 점수 가중', `1 + ${FX.grudgeW} × r`],
  ['목표지향 g', '사냥 가중 / 파밍 가중', '2 × g / 2 × (1 − g)  (g = 0.5이면 둘 다 1)'],
  ['숙련도 s', '조준 오차', `${FX.aim.mode === 'legacy' ? '' : '현재는 7.11의 사람다운 조준(오차가 계속 변하고 거리·상대 가속에 비례). '}이전 방식(aim.mode = legacy): 목표를 고를 때마다 ±${FX.aimErr} × (1 − s) 라디안`],
], [1700, 3300, W - 5000]));
add(P('유형별로 계산된 값은 다음과 같습니다.'));
{
  const rows = CFG.botTypes.map(t => { const fh = FX.fleeHp[0] + FX.fleeHp[1] * t.b, fg = FX.fearGap[0] + FX.fearGap[1] * t.b, sg = 750 * (FX.sight[0] + FX.sight[1] * t.b); return [t.n, f1(fh * 100) + '%', f1(fg), n0(sg), f1(FX.chaseT[0] + FX.chaseT[1] * t.p) + '초', f1(FX.grudgeT[0] + FX.grudgeT[1] * t.r) + '초', f2(2 * t.g), f2(2 * (1 - t.g)), 'x' + f2(FX.stayBase + FX.stayK * t.p), f1(FX.holdBase + FX.holdK * t.p) + '초', 'x' + f2(1 + FX.grudgeW * t.r)]; });
  add(...T(['유형', '도망 체력', '겁내는 레벨차', '교전 시야', '추격 시간', '복수 시간', '사냥 가중', '파밍 가중', '유지 보너스', '최소 유지', '복수 가중'], rows, [1250, 800, 850, 800, 800, 800, 800, 800, 900, 800, W - 8600], { size: 16, align: Array(11).fill(CT) }));
}
add(H2('7.5 점수제 목표 선택 (2단계)'));
add(P('봇은 0.25~0.5초마다 **후보**를 모으고 점수를 매겨 가장 높은 것을 고릅니다. 모든 봇이 **같은 식**을 쓰며 성격 수치는 입력값(가중치와 기준값)으로만 작용합니다(유형별 가산점 없음). 싸움과 도주는 **전투 우위 R**(내·상대 체력과 레벨)로 판단합니다(7.9).'));
add(...T(['후보', '조건', '점수'], [
  ['탱크 사냥', `교전 시야 안(또는 복수 대상이 시야 ${FX.grudgeRange}배 안, 또는 추격 유지 중), 싸우기로 판단한 상대(전투 우위 R이 기준 이상, 7.9)`, `sat( (40 + 0.5 × 상대 점수) × 사냥 가중 × 쉬움 보정 ÷ (거리 + 150) )\n복수 대상이면 × 복수 가중`],
  ['도형 파밍', '새로 노릴 때 거리 ' + FX.farmIn + ' 이내, 이미 노리는 도형은 ' + FX.farmOut + 'px까지 유지(떨림 방지, 7.10). 15레벨 미만은 둥지 안 도형 제외, 알파는 관통 5포인트·25레벨 이상, 육각형은 관통 3포인트·20레벨 이상만', 'sat( 도형 점수 × 파밍 가중 ÷ (거리 + 150) )'],
  ['크래셔 처리', '새로 노릴 때 거리 ' + FX.crasherIn + ' 이내, 이미 노리는 크래셔는 ' + FX.crasherOut + 'px까지 유지. 도주 후 위협 구역 안(450px 이내 제외)은 후보에서 제외(7.10)', `sat( 크래셔 점수 × 파밍 가중 × (450 이내이면 ${FX.crashUrg}) ÷ (거리 + 150) )`],
  ['도주', '전투 우위 R이 기준 미만이고 상대가 시야 안(7.9). legacy 모드에서는 상대 레벨이 내 레벨 + 겁내는 레벨 차이보다 높거나, 내 체력이 도망 체력보다 낮을 때', `${FX.fleeBase} + (1 − 거리 ÷ 시야). 항상 1 이상`],
], [1500, 3800, W - 5300]));
add(...FML([`sat(x) = 1 − exp(−x ÷ ${FX.scoreScale})   (기회 점수를 0~1로 눌러 도주 점수(1 이상)가 항상 우선하게 함)`, `쉬움 보정 = clamp(R ÷ (${CFG.botFight.easeDiv} × 싸움 기준), ${CFG.botFight.easeMin}, ${CFG.botFight.easeMax})   (legacy: clamp(1 − (상대 레벨 − 내 레벨) ÷ (${FX.easeDiv} × 겁내는 레벨 차이), 0.25, 1.5))`]));
add(H3('점수 계산 예 (거리 300, 내 레벨 5, 탱크 상대는 레벨 5·점수 60)'));
{
  const types = ['균형형', '안전농부', '돌격형'].map(n => CFG.botTypes.find(t => t.n === n));
  const cand = [['사각형', 10, 'f'], ['삼각형', 25, 'f'], ['오각형', 130, 'f'], ['작은 크래셔 (300px, 가중 x3)', 15, 'c'], ['같은 레벨 탱크 (보상 70)', 70, 't']];
  const rows = cand.map(([nm, xp, kind]) => [nm, ...types.map(t => { const raw = xp * (kind === 't' ? 2 * t.g : 2 * (1 - t.g)) * (kind === 'c' ? FX.crashUrg : 1) / 450; return f2(sat(raw)); })]);
  add(...T(['후보', ...types.map(t => `${t.n} (사냥 ${f2(2 * t.g)} / 파밍 ${f2(2 * (1 - t.g))})`)], rows, [3200, 2146, 2146, 2146], { align: [AlignmentType.LEFT, CT, CT, CT] }));
}
{
  const [bl, sf, as] = ['균형형', '안전농부', '돌격형'].map(n => CFG.botTypes.find(t => t.n === n)), sc = (xp, tank, t) => f2(sat(xp * (tank ? 2 * t.g : 2 * (1 - t.g)) / 450));
  add(P(`같은 거리(300px)라면 균형형은 오각형(${sc(130, false, bl)})을 같은 레벨 탱크(${sc(70, true, bl)})보다 먼저 노리고, 안전농부는 탱크 점수가 ${sc(70, true, sf)}로 낮아 오각형(${sc(130, false, sf)})이 보이면 도형을 택하며, 돌격형은 탱크(${sc(70, true, as)})가 오각형(${sc(130, false, as)})보다 높습니다. 후보가 탱크 하나뿐이면 어떤 유형이든 그 탱크를 노립니다(의도된 동작).`));
  add(NOTE('**참고:** 후보를 고르는 것은 눌린 점수(0~1)로 하고, 현재 목표를 유지할지 판단하는 유지 보너스 비교는 눌리기 전의 원점수로 합니다(7.6).'));
}
add(H2('7.6 떨림 방지 규칙'));
add(...NUM([
  '**유지 보너스:** 현재 목표의 점수에 `1.2 + 0.6 × 끈기`배를 곱해서, 새 후보가 그보다 높을 때만 바꿉니다. 이 비교는 0~1로 누르기 전의 **원점수**로 합니다(눌린 점수로 비교하면 점수가 큰 후보 사이에서는 교체가 막히기 때문).',
  '**최소 유지 시간:** 목표나 행동이 바뀌면 `1 + 2 × 끈기`초 동안은 바꾸지 않습니다(1~3초).',
  '**위험 우선:** 새로 도주해야 하는 상황(다른 적에 대한 판단 포함)이 되면 위 두 규칙과 싸움·도주 판단 유지 시간을 무시하고 즉시 도주로 바뀝니다.',
  `**도주 해제는 더 엄격하게(legacy 모드. 새 방식은 7.9의 ±15% 여유):** 도주를 시작한 기준보다 레벨 차이 ${FX.fleeReleaseGap}, 체력 ${FX.fleeReleaseHp * 100}%포인트 여유를 두고, 상대를 보는 거리를 시야의 1.2배까지 넓혀 해제 여부를 봅니다.`,
  '현재 목표가 죽거나 후보에서 사라지면 즉시 새 목표를 고릅니다. 재평가 주기는 그대로이고 결정만 걸러냅니다.',
], 5));
add(H2('7.7 이동과 사격'));
add(...T(['상황', '이동'], [
  ['도주 (탱크 대상)', '상대 반대 방향으로 전속 이동. 도망치며 조준과 사격은 계속'],
  ['크래셔 대상', '거리 420 미만이면 전속 후퇴, 그 이상이면 좌우로 절반 속도 이동'],
  ['그 밖의 목표 (사냥, 파밍)', '선호 거리 +50보다 멀면 전속 접근, −50보다 가까우면 0.8배 속도로 후퇴, 그 사이면 좌우로 절반 속도 이동. 좌우 방향은 판단 때마다 15% 확률로 뒤집힘'],
  ['목표 없음', CFG.botFx.wanderTime[0] + '~' + CFG.botFx.wanderTime[1] + '초마다 방향을 새로 정해 배회(natural: 속도 ' + FX.wander.spdBase + ' + ' + FX.wander.spdK + ' × g, 방향은 서서히 돌고 느리게 흔들림, 7.11 참고. legacy: 40% 속도, 즉시 방향 전환). 목표지향 g 확률로 3,500px 안의 가장 가까운 탱크 쪽, 아니면 가장 가까운 도형 군집 쪽(이미 군집 안이면 무작위)으로 향함. 체력이 낮아도 멈춰서 쉬지 않음'],
], [2600, W - 2600]));
add(...T(['클래스', '선호 거리(탱크 상대)', '선호 거리(도형 파밍)'], [['Tank', ...BOT_DIST.tank], ['Twin', ...BOT_DIST.twin], ['Sniper', ...BOT_DIST.sniper], ['Machine Gun', ...BOT_DIST.machine], ['Flank Guard', ...BOT_DIST.flank], ['Assassin (30레벨)', ...BOT_DIST.assassin], ['Destroyer (30레벨)', ...BOT_DIST.destroyer], ['Gunner (30레벨)', ...BOT_DIST.gunner], ['그 밖의 30레벨 클래스', '이전 클래스 값', '이전 클래스 값']].map(r => [r[0], typeof r[1] === 'number' ? r[1] + 'px' : r[1], typeof r[2] === 'number' ? r[2] + 'px' : r[2]]), [2800, 3400, W - 6200], { align: [AlignmentType.LEFT, CT, CT] }));
add(...BUL([
  '**조준과 사격:** 목표의 속도를 반영한 이동 예측 조준(총알 도달 시간 = 거리 ÷ 총알 속도)에 조준 오차를 더하고(7.11), 포신은 초당 7라디안으로 돌립니다(새 탱크를 노린 직후에는 잠깐 느림). 사거리(총알 속도 × 지속시간 × 0.85) 안이고 조준 오차가 `0.25 + 탄 퍼짐` 라디안 이내일 때 발사합니다.',
  '**몸통 회피:** 도형은 `반지름 + 50 + 몸통 피해 × 4`, 크래셔는 `반지름 + 90` 안에 들어오면 반대 방향 힘으로 밀려나며(가까울수록 강함), 회피 중에는 속도가 최소 0.9가 됩니다.',
  '**맵 가장자리:** 경계에서 200px 안이면 중앙 쪽으로 향합니다(목표가 있으면 중앙 방향을 더함).',
  '**둥지:** 15레벨 미만이거나 체력이 도망 기준보다 낮은 봇은 둥지 반지름 + 250 안에서 바깥으로 밀려납니다.',
  '**쉬는 행동은 없습니다.** 체력이 낮아도 도망(탱크 상대)과 크래셔 회피 외에는 평소처럼 파밍하고 배회합니다.',
]));
add(H2('7.8 능력치 투자와 클래스 선택 (3단계)'));
{
  const Z = CFG.botBuild, ord = ['reload', 'bDmg', 'pen', 'maxHp', 'bSpeed', 'move', 'body', 'regen'], nm = { reload: 'Reload', bDmg: 'Bullet Damage', pen: 'Penetration', maxHp: 'Max Health', bSpeed: 'Bullet Speed', move: 'Movement Speed', body: 'Body Damage', regen: 'Health Regen' };
  add(...BUL([
    '레벨이 오르면 포인트를 **즉시 전부** 씁니다. 포인트 한 점마다 7점이 안 찬 능력치 중에서 가중치로 **한 점씩 가중 추첨**하므로, 같은 유형이어도 빌드는 조금씩 다릅니다. 이전의 봇별 무작위 배율(0.5~1.5배)은 없앴습니다.',
    `**가중치 = 기본 가중치 × 성격 편향 배수 × 클래스 배수**이고, 최종 배수는 ${Z.lo}~${Z.hi}배로 제한합니다. 기본 가중치는 ${ord.map(k => `${nm[k]} ${BOT_BUILD[k]}`).join(', ')}입니다.`,
    `**클래스 선택:** 30레벨에는 선택지 안에서 균등하게 뽑고(15레벨과 30레벨을 한꺼번에 넘으면 두 번 뽑음), 15레벨에는 가중 추첨합니다(Twin ${BOT_CLASS_W.twin * 10}%, Sniper ${BOT_CLASS_W.sniper * 10}%, Machine Gun ${BOT_CLASS_W.machine * 10}%, Flank Guard ${BOT_CLASS_W.flank * 10}%). **모든 유형이 같고 유형별 선호는 없습니다**(사용자 결정).`,
    '**클래스 연동:** 클래스를 고른 뒤 얻는 포인트(15레벨 이후 19점)부터 클래스 배수가 겹칩니다. 15레벨의 포인트까지(14점)는 유형 가중치만 씁니다.',
    '포인트 총량, 점수 배율, 능력치 7점 한도는 모든 유형이 같고, 유형은 투자 방향만 바꿉니다.',
  ]));
  add(P(`성격 수치를 \`d = 2 × 수치 − 1\`(−1~1)로 바꾼 뒤 능력치마다 편향 b를 구하고, \`배수 = 1 + (b > 0 ? ${Z.up} : ${Z.dn}) × b\`(${f1(1 - Z.dn)}~${f1(1 + Z.up)}배)로 바꿉니다.`));
  add(...T(['능력치', '편향 b', '의미'], [['Reload', '(대담함 + 목표지향) ÷ 2', '공격적이고 사냥형일수록'], ['Bullet Damage', '(대담함 − 목표지향) ÷ 2', '공격적이고 파밍형일수록'], ['Penetration', '− 목표지향', '파밍형일수록'], ['Max Health', '− 대담함', '신중할수록'], ['Bullet Speed', '끈기', '끈질길수록'], ['Movement Speed', '(끈기 − 대담함) ÷ 2', '끈질기고 신중할수록'], ['Body Damage', '대담함', '대담할수록'], ['Health Regen', '− 대담함 ÷ 2', '신중할수록']], [2200, 3500, W - 5700]));
  add(...T(['클래스', '클래스를 고른 뒤 올리는 능력치 배수'], [['Twin', 'Reload x1.3, Bullet Damage x1.2'], ['Sniper', 'Bullet Speed x1.4, Penetration x1.3, Bullet Damage x1.2'], ['Machine Gun', 'Reload x1.4, Bullet Damage x1.3, Max Health x1.2'], ['Flank Guard', 'Movement Speed x1.3, Max Health x1.3, Body Damage x1.3']].map(([c, t]) => [c, t]), [2200, W - 2200]));
  add(P('유형별 편향 배수(클래스 선택 전, 계산값)와 레벨 45에서의 평균 투자 포인트(33점, 같은 알고리즘의 근사 계산, 소수 첫째 자리까지 의미)는 다음과 같습니다.'));
  const mk = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }, rnd = mk(20261006), cw = BOT_CLASS_W, cwSum = Object.values(cw).reduce((x, y) => x + y, 0);
  const avgBuild = ty => {
    const sum = {}; ord.forEach(k => sum[k] = 0), N0 = 3000;
    for (let i = 0; i < N0; i++) {
      const up = {}; ord.forEach(k => up[k] = 0); let w = botBuildWeights(ty, 'tank');
      for (let n = 0; n < 33; n++) {
        if (n === 14) { let r = rnd() * cwSum, c = 'twin'; for (const k of ['twin', 'sniper', 'machine', 'flank']) { c = k; r -= cw[k]; if (r <= 0) break; } w = botBuildWeights(ty, c); }
        const pool = ord.filter(k => up[k] < CFG.maxPts), tot = pool.reduce((x, k) => x + w[k], 0); let r = rnd() * tot, pick = pool[pool.length - 1];
        for (const k of pool) { r -= w[k]; if (r <= 0) { pick = k; break; } } up[pick]++;
      }
      ord.forEach(k => sum[k] += up[k]);
    }
    return ord.map(k => f1(sum[k] / N0));
  };
  var N0;
  add(...T(['유형', ...ord.map(k => nm[k].replace('Movement ', 'Move ').replace('Bullet ', 'B. ').replace('Penetration', 'Pen'))], CFG.botTypes.map(t => { const w = botBuildWeights(t, 'tank'); return [t.n + ' (편향 배수)', ...ord.map(k => f2(w[k] / BOT_BUILD[k]))]; }), [1700, ...Array(8).fill(Math.floor((W - 1700) / 8))], { size: 15, align: Array(9).fill(CT) }));
  add(...T(['유형', ...ord.map(k => nm[k].replace('Movement ', 'Move ').replace('Bullet ', 'B. ').replace('Penetration', 'Pen'))], CFG.botTypes.map(t => [t.n + ' (레벨 45 평균)', ...avgBuild(t)]), [1700, ...Array(8).fill(Math.floor((W - 1700) / 8))], { size: 15, align: Array(9).fill(CT) }));
  add(P('이전(모든 봇 같은 평균)에는 Reload 5.8, Bullet Damage 5.8, Penetration 5.2, Max Health 4.5, Bullet Speed 3.5, Movement Speed 3.5, Body Damage 2.4, Health Regen 2.4였습니다. 유형 간 차이는 Max Health 3.2~5.7, Penetration 4.0~6.2, Body Damage 1.6~3.2 정도로 약합니다.'));
  add(NOTE('**유형 이름과 빌드가 어긋나는 경우가 있습니다.** 저격형(신중, 사냥형, 끈기 낮음)은 계산식상 Bullet Speed·Penetration 투자가 적고 Max Health가 많으며 Sniper 클래스는 20%만 고릅니다. 유형 이름은 성격의 별명일 뿐 빌드를 보장하지 않습니다. 시뮬레이션으로 검증하기 전의 값입니다(11장 20번).', 'warn'));
}

add(H2('7.9 싸움 또는 도주 판단 (전투 우위 R)'));
{
  const BF = CFG.botFight, offF = L => Math.pow(1 + (L - 1) / BF.offBase, BF.offPow);
  const Rf = (lm, fm, le, fe) => (fm * offF(lm)) / (fe * offF(le)), thr = b => BF.thrMul * (BF.needBase - BF.needBold * b);
  const tys = ['안전농부', '균형형', '돌격형'].map(n => CFG.botTypes.find(t => t.n === n));
  add(P('봇이 근처 탱크를 만나면 싸울지 도망칠지를 **전투 우위 R** 하나로 정합니다. 설정 `botFight.mode`가 power일 때의 방식이고, legacy로 바꾸면 이전 방식(레벨 차이와 내 체력 비율로 도주 판단)으로 돌아갑니다.'));
  add(...FML(['R = (내 체력% × 내 공격력) ÷ (상대 체력% × 상대 공격력)', `공격력(레벨) = (1 + (레벨 − 1) ÷ ${BF.offBase})^${BF.offPow}`, `싸움 기준 = ${BF.thrMul} × (${BF.needBase} − ${BF.needBold} × 대담함)`]));
  add(...BUL([
    '**입력은 체력 비율과 레벨뿐입니다.** 공격력은 레벨로만 추정하고(빌드, 클래스, 이동 속도는 보지 않음), 체력은 양쪽 모두 **체력 막대에 보이는 비율**만 씁니다(내 체력%, 상대는 다친 경우 보이는 비율, 가득 찬 상대는 100%). 최대 체력의 크기는 보지 않으므로 레벨이 같고 체력이 가득이면 R이 1입니다. 여러 적을 합산하지 않고 한 상대씩 판단합니다.',
    'R이 기준 **이상이면 싸움(사냥), 미만이면 도주**입니다. 중간(경계) 구간은 없습니다. 복수 대상은 기준에 ' + BF.grudgeNeed + '배를 곱해 더 쉽게 싸웁니다.',
    '**최소 유지 시간:** 싸움 또는 도주를 정하면 ' + BF.fightHold + '초(싸움), ' + BF.fleeHold + '초(도주) 동안은 R이 기준을 넘나들어도 그 판단을 유지합니다. 상대가 죽거나 시야를 벗어나면(도주는 시야의 1.2배 밖) 풀립니다.',
    '**±' + (BF.hyst * 100) + '% 여유:** 유지 시간이 끝난 뒤에는 싸우는 중이면 R이 기준 × ' + (1 - BF.hyst) + ' 미만이어야 도주로, 도주 중이면 기준 × ' + (1 + BF.hyst) + ' 이상이어야 싸움으로 바꿉니다.',
    '**다른 적에 대한 새 도주 판단은 유지 시간 중에도 즉시 적용**됩니다(협공을 피하기 위함).',
    '내 체력이 낮을 때의 별도 안전장치는 두지 않았습니다(내 체력이 R에 반영됨). 싸우는 중 R이 기준 × `breakRatio` 밑으로 급락하면 유지 시간을 무시하는 자리가 있으나 현재 ' + BF.breakRatio + '(꺼짐)입니다.',
    '**쉬움 보정**은 `clamp(R ÷ (' + BF.easeDiv + ' × 기준), ' + BF.easeMin + ', ' + BF.easeMax + ')`로, 기준을 간신히 넘는 상대는 점수가 깎이고 훨씬 유리한 상대는 최대 ' + BF.easeMax + '배입니다.',
  ]));
  add(H3('유형별 기준'));
  add(...T(['유형', '대담함', '싸움 기준', '싸움 → 도주 (R 미만)', '도주 → 싸움 (R 이상)', '복수 대상 기준'], tys.map(t => [t.n, f2(t.b), f2(thr(t.b)), f2(thr(t.b) * (1 - BF.hyst)), f2(thr(t.b) * (1 + BF.hyst)), f2(thr(t.b) * BF.grudgeNeed)]), [1700, 1100, 1400, 2000, 2000, W - 8200], { align: [AlignmentType.LEFT, CT, CT, CT, CT, CT] }));
  add(H3('전투 우위 R 예시 (체력 100%끼리, 행 = 내 레벨, 열 = 상대 레벨)'));
  const Ls = [1, 5, 10, 15, 20, 30, 45];
  add(...T(['내 레벨 / 상대 레벨', ...Ls.map(l => 'Lv' + l)], Ls.map(lm => ['Lv' + lm, ...Ls.map(le => f2(Rf(lm, 1, le, 1)))]), [1300, ...Array(7).fill(Math.floor((W - 1300) / 7))], { align: Array(8).fill(CT), size: 17 }));
  add(P('R이 1이면 비슷하고, 레벨이 5 높으면 약 0.6, 10~15 높으면 0.3 아래입니다. 같은 레벨에서는 R이 체력 비율(내 체력 ÷ 상대 체력)과 같습니다.'));
  add(H3('판단 예시 (안전농부 / 균형형 / 돌격형)'));
  const scs = [['Lv15 대 Lv15, 체력 100%끼리', 15, 1, 15, 1], ['Lv15 대 Lv20, 100%끼리', 15, 1, 20, 1], ['Lv20 대 Lv15, 100%끼리', 20, 1, 15, 1], ['Lv30 (내 체력 30%) 대 Lv30 (100%)', 30, 0.3, 30, 1], ['Lv15 (100%) 대 Lv30 (체력 20%)', 15, 1, 30, 0.2], ['Lv15 (50%) 대 Lv15 (50%)', 15, 0.5, 15, 0.5], ['Lv10 대 Lv30, 100%끼리', 10, 1, 30, 1]];
  add(...T(['상황', 'R', '판단'], scs.map(([n, lm, fm, le, fe]) => { const r = Rf(lm, fm, le, fe); return [n, f2(r), tys.map(t => r >= thr(t.b) ? '싸움' : '도주').join(' / ')]; }), [4200, 1100, W - 5300], { align: [AlignmentType.LEFT, CT, CT] }));
  add(NOTE('**한계:** 공격력 곡선은 예시이고 실제 처치력(빌드, 총알이 몸 안에 머무는 시간 모델)과 차이가 있을 수 있어서 `ttk`로 측정해 보정해야 합니다. 여러 적 합산, 이동 속도, 클래스는 반영하지 않았고, 도주 후보가 시야 안의 모든 탱크라서 이전보다 도주가 자주 일어나 파밍 시간이 줄 수 있습니다. 이전 방식으로 잰 봇 개체군 측정값과는 직접 비교할 수 없습니다. 체력은 비율만 보고 최대 체력의 크기는 보지 않아서, 다친 고레벨 상대를 과소평가하는 것을 공격력 지수 ' + BF.offPow + '(체력 풀이 레벨에 따라 커지는 효과를 흡수)로 보정했습니다.', 'warn'));
}

add(H2('7.10 도주 후 위협 기억과 도형 후보 거리'));
{
  const BF = CFG.botFight, FXk = CFG.botFx;
  add(P('도주한 뒤 곧바로 같은 상대에게 돌아가 다시 도주하는 반복(재교전)과, 도형 후보가 범위 경계에서 들락날락해 파밍과 배회를 오가는 떨림을 줄이는 두 규칙입니다. 개선 전 측정(시드 21, 22 합계 60분)에서는 도주 334건 중 재교전이 190건(57%), 도주 중 사망이 13%, 봇·분당 상태 전이 2.8회와 3초 안 되돌림 0.94회였습니다.'));
  add(...BUL([
    '**위협 기억:** 도주를 선택하면 그 상대의 마지막 위치를 저장하고, 도주 중에는 매번 갱신해서 도주가 끝난 뒤에도 `fleeMemory`(' + BF.fleeMemory + ')초 동안 기억합니다. 같은 상대와 싸우기로 하거나 상대가 죽으면 지우고, 가장 최근 한 명만 기억합니다. 위치는 도주 중 시야 안에서 본 마지막 위치입니다.',
    '**기억하는 동안:** (1) 위협 위치에서 `교전 시야 × threatMul`(' + BF.threatMul + ') 안의 도형과 크래셔는 파밍 후보에서 뺍니다(450px 안의 크래셔는 예외). (2) 파밍이나 배회 중에 그 구역 안이면 바깥으로 최대 `threatPush`(' + BF.threatPush + ') 세기로 밀려나고 속도가 0.7 이상이 됩니다. (3) 배회 방향이 위협 쪽(±1라디안)이면 반대쪽으로 돌립니다. 싸움이나 도주 중에는 적용하지 않습니다.',
    '**도형·크래셔 후보 거리:** 새로 노릴 때는 `farmIn`(' + FXk.farmIn + ')px, `crasherIn`(' + FXk.crasherIn + ')px 안의 것만 후보이고, 이미 노리는 목표는 `farmOut`(' + FXk.farmOut + ')px, `crasherOut`(' + FXk.crasherOut + ')px까지 유지합니다. 두 값을 같게 하면 이전과 같습니다.',
    '**끄기:** `botFight.fleeMemory`를 0으로 하면 위협 기억을 쓰지 않고, `botFx.farmOut`·`crasherOut`을 `farmIn`·`crasherIn`과 같게 하면 이전 거리로 돌아갑니다.',
  ]));
  add(NOTE('**효과는 측정 전입니다.** 상대가 계속 쫓아오면 기억과 무관하게 다시 도주합니다. 위협 구역에서 도형이 빠지므로 배회 시간이 조금 늘 수 있고, 군집 한 구역을 다른 봇이 차지하면 그 구역을 비웁니다. `aicheck`(재교전을 상대가 쫓아온 경우와 봇이 스스로 돌아간 경우로 나눔, 3초 안 되돌림 패턴, 배회 방문 시간, 파밍을 잃은 순간의 도형 거리)와 `memorycheck`로 확인합니다.', 'warn'));
}

add(H2('7.11 사람다운 조준·도주·배회'));
{
  const W = FX.wander, FL = FX.flee, A = FX.aim;
  add(P('단순한 봇이 기계처럼 보이는 가장 큰 이유는 완벽한 조준과 직선 도주입니다. 웹 조사에서 확인한 사례(FPS 봇 연구, BotPrize 우승 봇이 빠른 움직임과 원거리의 정확도를 일부러 제한한 점, 게임 AI의 조향 행동을 가중합하는 표준 방식과 노이즈 배회)를 참고해 세 가지를 바꿨습니다. 세 항목은 각각 `mode`를 `legacy`로 두면 이전 동작으로 돌아갑니다.'));
  add(...BUL([
    '**배회(wander.mode = ' + W.mode + '):** 속도 = ' + W.spdBase + ' + ' + W.spdK + ' × g (g = 목표지향 0~1, 이전에는 고정 0.4). 새 방향은 즉시 바꾸지 않고 초당 ' + W.turnRate + '라디안으로 서서히 돌며, 서로 다른 주기의 사인 두 개를 합친 느린 흔들림(최대 ±' + W.wobble + '라디안)이 더해집니다.',
    '**도주(flee.mode = ' + FL.mode + '):** 도주 방향 u = (적 반대 단위벡터 −n) + p × k. p는 n에 수직인 단위벡터, k = sideK × 가까움 × 옆방향 + 흔들림이고 (sideK = ' + FL.sideK + ', 가까움 = 1 − 거리 ÷ 시야를 0.2~1로 제한, 옆방향 = −1~1, 흔들림 = 최대 ±' + FL.wobble + '). 옆방향은 ' + FL.sideT[0] + '~' + FL.sideT[1] + '초마다 반대로 바뀌지만 초당 ' + FL.sideRate + '의 속도로 부드럽게 전환합니다. 앞쪽 ' + FL.lookAhead + 'px 지점이 맵 가장자리 ' + FL.edgeMargin + 'px 안이면 중앙 쪽 성분(' + FL.edgePush + ')을 더합니다. 실제 이동 방향은 초당 ' + FL.turnRate + '라디안까지만 돌 수 있어 급회전이 없습니다.',
    '**조준(aim.mode = ' + A.mode + '):** 오차 최대 E = (e0 × (1 − s) + ed × min(1, d ÷ D) + ev × min(1, a ÷ accRef)) × (habit[0] + habit[1] × h). s = 숙련도, d = 상대까지 거리, D = 총알 사거리(속도 × 지속시간), a = 상대 속도의 초당 변화량(가속, 이동평균), h = 봇마다 고정된 습관(0~1), e0 = ' + A.e0 + ', ed = ' + A.ed + ', ev = ' + A.ev + ', accRef = ' + A.accRef + ', habit = ' + JSON.stringify(A.habit) + '. 오차 각도는 −E~+E 사이에서 약 ' + A.drift + '초마다 새 값으로 부드럽게 이동합니다(한 번 뽑고 고정하지 않음). 총알 도달 시간에 봇마다 고정된 배율 1 ± ' + A.leadErr + '를 곱해 예측이 조금씩 어긋나고, 새 탱크를 노리기 시작하면 숙련도에 따라 ' + A.lockMax + '(낮은 숙련도)~' + A.lockMin + '(높은 숙련도)초 동안 포신 회전 속도가 ' + A.lockSlow + '배가 됩니다.',
  ]));
  add(NOTE('**측정 결과(시뮬레이션, 표본이 작아 오차가 큼):** `traitcheck`로 확인한 정지한 상대 20초 조준에서 최대 오차 0.036라디안(거리 400px 상한 0.0377)이었고, 오차 각도는 1,200프레임 중 1,194프레임에서 변했습니다. `sanity`(6분)는 이상 없음이었습니다. 도주(`aicheck`, 시드 11, 3회 합계)는 세 설정을 비교했습니다: 전부 새 방식 도주 159건·탈출 114건(72%)·도주 중 사망 21건(13%), 도주만 이전 방식 156건·106건(68%)·27건(17%), 전부 이전 방식 189건·147건(78%)·15건(8%). 건수가 150~190건이라 표준오차가 약 3.5%포인트여서, 이 차이(탈출률 약 6%포인트, 사망률 약 5%포인트)는 **통계적으로 구분되지 않는다고 봐야 합니다(계산한 추정, 약 1.3~1.5 표준편차).** 시드 1 한 판에서는 봇 사망이 분당 1.4회에서 2.4회로 늘었지만(`types`, 사망 7건 → 12건) 표본이 작아 원인을 가리지 못했습니다. 같은 시드의 `pop`은 분당 사망 1.80에서 1.83으로 거의 같았습니다. 반복 측정(시드 21)에서는 `types` 6회 합계로 새 방식 사망 42건(분당 1.40)·이전 방식 30건(분당 1.00)이었고(차이 12건, 포아송 표준오차 약 8.5건이라 약 1.4 표준편차, 계산한 추정), 더 긴 `pop` 3회 합계로는 새 방식 75건·이전 방식 78건(둘 다 분당 1.7)으로 같았습니다. 두 측정을 합치면 117건 대 108건으로, 사망이 늘었다는 증거는 찾지 못했습니다(시드 1의 증가는 우연으로 보임). 도주 성공률은 위 표본으로는 구분되지 않았고 더 많은 표본이 필요합니다.', 'warn'));
}

/* =================== 8. 화면과 개발자 모드 =================== */
add(H1('8. 화면, 사운드, 개발자 모드'));
add(H2('8.1 화면 구성'));
add(...T(['요소', '위치', '내용'], [
  ['월드', '전체', '회색 바탕, ' + CFG.grid + 'px 격자(선 색 #c5c5c5), 도형, 크래셔, 총알, 탱크(체력 막대는 피해를 입은 대상만), 이름표. 무적 중인 탱크는 반투명하게 깜빡임. 피격 시 붉게 번쩍임'],
  ['상단 중앙', '위', '체력/피해/재장전/속도 요약, 조작 안내, 처치 메시지("You\'ve killed 이름", 4초, 최대 4줄)'],
  ['하단 중앙', '아래', '이름, 점수 막대(내 점수 ÷ 1위 점수), 레벨 경험치 막대(`레벨 N 클래스  현재/필요`)'],
  ['능력치 패널', '좌하단', '8개 줄에 포인트 막대와 + 버튼. 포인트가 있을 때 슬라이드로 나타나고, 없으면 커서를 왼쪽 아래에 두면 보임'],
  ['클래스 타일', '좌상단', '15레벨 Tank에게 4개, 30레벨 15레벨 클래스에게 `classUp30`의 선택지 타일 표시, 클릭으로 선택'],
  ['Scoreboard', '우상단', '상위 10명. 짙은 회색(#373737) 알약 트랙 위에 연초록(#90eda9) 알약 게이지(1위 대비 비율, 목표 길이로 부드럽게 따라감), 클래스 아이콘(모두 파랑)이 게이지 끝에 붙어 다니며 1위는 왼쪽, 나머지는 오른쪽을 봄, 글자(이름 - 점수)는 막대 가운데에 아이콘 위로 표시, 마우스를 올리면 게이지가 약간 밝아짐'],
  ['미니맵', '우하단', '150px. 봇은 빨간 점, 나는 조준 방향 검은 삼각형, 현재 시야 사각형. 둥지 원은 개발자 모드에서만'],
], [1700, 1300, W - 3000]));
add(P('파티클 효과는 꺼져 있습니다(`CFG.particles = false`). diep.io에는 파티클이 없다는 것을 사용자가 확인했습니다. `true`로 바꾸면 사망·처치·명중·클래스 선택에 파편이 다시 나옵니다. **사운드는 없습니다.**'));
add(H3('탱크와 도형의 모양 (diep.io 캡처 측정 기준)'));
add(...BUL([
  '**색:** 파랑 탱크 #4fafdc(윤곽 #3983a4), 포신 #999999(윤곽 #727272)는 캡처 측정값입니다. 빨간 탱크 #df5759(윤곽 #a64141)는 같은 색 체계의 추정값입니다. 총알은 주인 탱크의 색을 따릅니다.',
  '**포신(탱크 반지름 기준):** Tank 길이 1.9·너비 0.84, Twin 각 포신 너비 0.84·좌우 ±0.52, Machine Gun 길이 1.9·밑동 0.84에서 끝 1.47, 윤곽 두께는 반지름의 약 12.5%(3px). Sniper와 Flank Guard 뒤쪽 포신은 캡처가 없어 길이는 그대로입니다. 포신은 몸통 뒤에 그려집니다.',
  '**체력 막대:** 어두운 회색(#555555) 알약 모양 트랙 안에 연초록(#9be188) 막대. 높이 7(안쪽 여백 1.5)로 모두 같고, 폭은 탱크·크래셔 반지름의 2.3배, 도형은 `max(44.3, 6.5 + 1.43 × 반지름)`입니다(육각형·알파·크래셔는 추정).',
  '**도형 반지름:** diep.io 캔버스 자료(탱크 반지름 50 기준 사각형·삼각형 55, 오각형 75, 알파 오각형 200, 작은 크래셔 35, 큰 크래셔 55)를 탱크 반지름 24로 환산(×0.48)했고, 육각형은 오각형의 1.5배로 추정했습니다. 도형은 변 길이가 아니라 중심에서 꼭짓점까지의 반지름으로 그려집니다.',
]));
add(H2('8.2 개발자 모드'));
add(P('`\\` 키를 한 번 누르면 켜집니다(1레벨 상승이 함께 일어남). 새로 고침 전까지 유지됩니다.'));
add(...BUL([
  '능력치 포인트 소모 없음, 능력치 7점 한도 없음.',
  '마우스 휠로 시야 x0.1~x3. 줌을 빼도 봇·군집 소환 판정은 평소 시야 기준이라 소환이 막히지 않습니다.',
  '둥지 바닥(어두운 원), 군집 구역 색, 미니맵의 둥지 원이 보입니다.',
  '**F2 패널(왼쪽 WORLD/CLUSTERS, 오른쪽 BOTS):** 봇 소환 타이머와 목표 수, 다음 소환 목표 레벨, 봇별 레벨(목표 레벨 `Lv 3> 7`, 가속 배율 `x12`)·클래스·점수·체력·상태(`idle`, `inv`, `wander`, `fight`, `flee`, `shape`, `crasher`)·거리·**성격 유형 이름과 숙련도**(`s0.93` 형식)·전투 우위 R(`R1.25`), FPS, 총알·도형 수, 맵 현재/목표 크기, 일반·군집·둥지 도형 수, 크래셔 수, 군집별 종류·반지름·도형 수·수명. 패널이 켜져 있으면 화면의 봇 이름 옆에도 `이름  성격 유형  행동 R값`이 표시됩니다.',
  '**봇 킬로그**(F2와 함께 켜고 꺼짐, 화면 위쪽 가운데): `A (Lv12) killed B (Lv7)`, `B (Lv7) was killed by a crasher` 형식, 최대 6줄·6초.',
]));

/* =================== 9. 설정값 총람 =================== */
add(H1('9. 설정값 총람 (game.js의 CFG)'));
add(P('아래 값은 game.js를 읽어 그대로 옮긴 것입니다. 수정은 game.js 상단에서 하거나, 테스트 도구에서 `--set 경로=값`으로 실행 시점에만 덮어쓸 수 있습니다.'));
const kv = (o, pre) => Object.entries(o).filter(([, v]) => typeof v !== 'object').map(([k, v]) => [pre + k, String(v)]);
add(H2('9.1 전역'));
add(...T(['이름', '값', '의미'], [
  ['world', n0(CFG.world), '좌표 공간 한 변'], ['grid', CFG.grid, '배경 격자 간격(px)'], ['maxLevel', CFG.maxLevel, '최대 레벨'], ['maxPts', CFG.maxPts, '능력치당 최대 포인트'], ['clashTol', CFG.clashTol, '총알끼리 충돌 시 동률 판정 오차(bulletClashMode = instant에서만 사용)'], ['bulletClashMode', CFG.bulletClashMode, '총알끼리 충돌 방식: mass = 접촉 틱 교환 + 질량 모델(현재), instant = 이전 방식(내구도 비교로 한 번에 승패)'],
  ['bulletHp', CFG.bulletHp, '총알 체력 = 관통 능력치 × 이 값'], ['drag', CFG.drag, '탱크 마찰(최종 속도 = 이동 속도)'], ['playerR', CFG.playerR, '1레벨 탱크 반지름'], ['particles', String(CFG.particles), '파티클 효과 켜기'],
  ['scoreboardSmooth', CFG.scoreboardSmooth, '리더보드 게이지가 목표 길이로 따라가는 속도(1/초, 클수록 빠름, 0이면 즉시)'],
  ['bodyPhys', JSON.stringify(CFG.bodyPhys), '몸통 충돌 물리: mode(tuned/legacy), shapeMass = 탱크와 부딪힐 때 도형 질량에 곱하는 배율(작을수록 가벼움)'], ['bulletRange', JSON.stringify(CFG.bulletRange), '한 발의 총 피해 범위: mode(range/legacy), target(tank/all), tMin 하한 틱 수, tMaxA/tMaxB 상한 틱 수 = tMaxA + tMaxB × P (P = 총알 체력 ÷ bulletHp)'], ['classUpLevel / classUpLevel2', `${CFG.classUpLevel} / ${CFG.classUpLevel2}`, '클래스를 고르는 레벨(15레벨 / 30레벨)'], ['classUp30', JSON.stringify(CFG.classUp30), '15레벨 클래스 -> 30레벨에서 고를 수 있는 클래스 목록(비어 있으면 타일 없음)'], ['classes.*.reloadMul / par', '(클래스 정의)', '30레벨 클래스의 재장전 배율 / 이전 클래스(봇의 선호 거리·능력치 투자가 없을 때 따름)'], ['bulletLife', CFG.bulletLife, '총알 지속시간 배율(기본 1.9초 × 이 값)'], ['bulletPush', CFG.bulletPush, '총알에 밀리는 강도(대상 속도 증가 배율)'], ['bulletDeflect', CFG.bulletDeflect, '총알이 꺾이는 강도'], ['bulletPushCap', CFG.bulletPushCap, '한 프레임에 더해지는 속도 상한(px/초)'], ['pushTank', CFG.pushTank, '탱크·크래셔가 받는 밀림 배율(bulletPush에 곱함)'], ['pushShape', CFG.pushShape, '도형이 받는 밀림 배율'], ['pushBullet', CFG.pushBullet, '총알끼리 충돌 시 밀림 배율'], ['bulletClashKeepDir', CFG.bulletClashKeepDir, '총알끼리 충돌 뒤에도 진행 방향을 충돌 전 방향으로 유지(true). false면 이전처럼 꺾임·밀림으로 방향이 바뀜'], ['bulletMinSpeed', CFG.bulletMinSpeed, '총알끼리 충돌 뒤 유지하는 최소 속도(처음 속도의 비율, 0이면 하한 없음)'], ['bulletBaseDmg', CFG.bulletBaseDmg, '총알 질량의 기준 피해(피해가 클수록 총알이 무거움)'], ['bulletSpeedMul', CFG.bulletSpeedMul, '총알 기본 속도 배율(포인트로 늘어난 속도까지 전체에 곱함, 사거리도 같은 비율로 변함)'], ['bulletSizeMul', CFG.bulletSizeMul, '총알 기본 크기 배율(반동에는 영향 없음)'], ['viewScale', CFG.viewScale, '화면 기본 배율(클수록 확대, 개발자 휠 줌은 이 값에 곱해짐)'], ['shapeGap', CFG.shapeGap, '도형 사이 최소 간격(px)'], ['shapeDensity', CFG.shapeDensity.toExponential(), '둥지 밖 일반 도형 밀도(개/px²)'],
  ['hyperAfter', CFG.hyperAfter, '급속 회복 시작 무피격 시간(초)'], ['hyperRate', CFG.hyperRate, '급속 회복 초당 최대 체력 비율'],
  ['spawnInvuln', CFG.spawnInvuln, '스폰 무적 최대 시간(초)'], ['respawnMode', CFG.respawnMode, "재시작 레벨 규칙('diep' 또는 'reset')"],
  ['recoilK / recoilV / recoilMax', `${CFG.recoilK} / ${CFG.recoilV} / ${CFG.recoilMax}`, '반동 계수 / 기준 속도 / 한 발 상한'], ['recoilMul', CFG.recoilMul, '모든 레벨에 적용하는 반동 배율(레벨 보정 없음)'], ['classUpLevel', CFG.classUpLevel, '클래스 선택 레벨'],
], [2800, 1700, W - 4500]));
add(H2('9.2 맵, 군집, 둥지, 크래셔'));
add(...T(['이름', '값', '의미'], [
  ['map.areaPerTank', n0(CFG.map.areaPerTank), '탱크 1대당 면적'], ['map.min / max', `${n0(CFG.map.min)} / ${n0(CFG.map.max)}`, '맵 한 변 범위'], ['map.rate', CFG.map.rate, '맵 크기 변화 속도(px/초)'], ['map.smooth', CFG.map.smooth, '탱크 수 평균 시간(초)'],
  ['clusters.areaPerCluster', n0(K.areaPerCluster), '군집 1개당 맵 면적'], ['clusters.refill', K.refill, 'legacy 모드의 군집 도형 보충 속도(개/초, 이전 5). density는 이전 2.8e-5에서 x1.2'], ['clusters.mode / growTime / startFill', `${K.mode} / ${JSON.stringify(K.growTime)} / ${JSON.stringify(K.startFill)}`, 'grow(성장 후 목표 달성 시 종료) 또는 legacy / 군집이 목표를 채우는 시간(초, 범위) / 게임 시작 때 미리 채우는 비율(범위)'], ['clusters.release / attractMin', `${K.release} / ${K.attractMin}`, '종료 뒤 도형 처리(free 표류, zone 경계 안) / 봇이 배회 목적지로 삼는 군집의 최소 채움 비율'], ['clusters.maxCount', K.maxCount, '군집 최대 수'], ['clusters.rMin / rMax', `${K.rMin} / ${K.rMax}`, '군집 반지름 범위'], ['clusters.density', K.density.toExponential(), '군집 안 도형 밀도'], ['clusters.life', K.life, '군집 수명(초)'], ['clusters.minGap', K.minGap, '군집 사이 최소 거리'], ['clusters.depleted', K.depleted, '이 비율 미만이면 이동(30초 후)'],
  ['nest.r', N.r, '둥지 반지름(맵 refMap 기준)'], ['nest.refMap', n0(N.refMap), '둥지 크기 기준 맵 크기'], ['nest.pentagons', N.pentagons, '둥지 오각형(기준)'], ['nest.hexagons / hexRespawn', `${N.hexagons} / ${N.hexRespawn}`, '둥지 육각형 수 / 재등장 시간'], ['nest.alphaMax / alphaRespawn', `${N.alphaMax} / ${N.alphaRespawn}`, '알파 최대 수 / 재등장 시간(초)'], ['nest.crasherMax / largeRatio', `${N.crasherMax} / ${N.largeRatio}`, '크래셔 기준 수 / 큰 것 비율'],
], [2800, 1700, W - 4500]));
add(H2('9.3 봇'));
add(...T(['이름', '값', '의미'], [
  ['bots.base / perLevel / max', `${B.base} / ${B.perLevel} / ${B.max}`, '봇 수 = min(max, base + 레벨 × perLevel)'], ['bots.spawnEvery', B.spawnEvery, '봇 소환 간격(초)'], ['bots.maxSpawnLevel', B.maxSpawnLevel, '소환 목표 레벨 상한'], ['bots.spawnGap', B.spawnGap, '재시작한 플레이어와 봇 사이 최소 거리'],
  ['bots.shapeXp', B.shapeXp, '봇이 도형·크래셔로 얻는 점수 배율'], ['bots.spawnIdle', B.spawnIdle, '소환 직후 최대 대기 시간(초)'], ['bots.catchUp / catchUpRamp', `${B.catchUp} / ${B.catchUpRamp}`, '성장 가속 시작 배율 / 초당 증가'],
  ['botSkill', CFG.botSkill.join(' ~ '), '숙련도 분포(균등)'], ['botFx.fleeHp', JSON.stringify(FX.fleeHp), '도망 체력 = a + k × 대담함'], ['botFx.fearGap', JSON.stringify(FX.fearGap), '겁내는 레벨 차이'], ['botFx.sight', JSON.stringify(FX.sight), '교전 시야 배율'], ['botFx.chaseT / grudgeT', `${JSON.stringify(FX.chaseT)} / ${JSON.stringify(FX.grudgeT)}`, '추격 시간 / 복수 시간(초)'],
  ['botFx.grudgeRange / aimErr', `${FX.grudgeRange} / ${FX.aimErr}`, '복수 대상 거리 배수 / 조준 오차 계수'], ['botFx.scoreScale / crashUrg / easeDiv', `${FX.scoreScale} / ${FX.crashUrg} / ${FX.easeDiv}`, '점수 포화 상수 / 크래셔 가중 / 쉬운 사냥감 보정'],
  ['botFight.mode', CFG.botFight.mode, 'power = 전투 우위 R 방식(현재), legacy = 이전 방식(레벨 차이·체력 비율)'], ['botFight.offBase / offPow', `${CFG.botFight.offBase} / ${CFG.botFight.offPow}`, '공격력 = (1 + (레벨−1) ÷ offBase)^offPow'], ['botFight.needBase / needBold / thrMul', `${CFG.botFight.needBase} / ${CFG.botFight.needBold} / ${CFG.botFight.thrMul}`, '싸움 기준 = thrMul × (needBase − needBold × 대담함)'], ['botFight.hyst / fightHold / fleeHold', `${CFG.botFight.hyst} / ${CFG.botFight.fightHold} / ${CFG.botFight.fleeHold}`, '기준의 ± 여유 비율 / 싸움 유지 시간 / 도주 유지 시간(초)'], ['botFight.grudgeNeed', CFG.botFight.grudgeNeed, '복수 대상에게 곱하는 싸움 기준 배수'], ['botFight.easeDiv / easeMin / easeMax', `${CFG.botFight.easeDiv} / ${CFG.botFight.easeMin} / ${CFG.botFight.easeMax}`, '쉬움 보정 = clamp(R ÷ (easeDiv × 기준), easeMin, easeMax)'], ['botFight.breakRatio', CFG.botFight.breakRatio, '싸우는 중 R이 기준 × 이 값 밑이면 유지 시간 무시(0 = 꺼짐)'],
  ['botFx.fleeBase / fleeReleaseGap / fleeReleaseHp', `${FX.fleeBase} / ${FX.fleeReleaseGap} / ${FX.fleeReleaseHp}`, '도주 기본 점수 / 해제 레벨 여유 / 해제 체력 여유'], ['botFx.stayBase / stayK', `${FX.stayBase} / ${FX.stayK}`, '유지 보너스 = stayBase + stayK × 끈기'], ['botFx.holdBase / holdK', `${FX.holdBase} / ${FX.holdK}`, '최소 유지 시간(초) = holdBase + holdK × 끈기'],
  ['botBuild.up / dn / lo / hi', `${CFG.botBuild.up} / ${CFG.botBuild.dn} / ${CFG.botBuild.lo} / ${CFG.botBuild.hi}`, '능력치 편향 배수의 + 한도 / − 한도 / 최종 하한 / 상한'], ['botBuild.cls', JSON.stringify(CFG.botBuild.cls), '클래스를 고른 뒤 올리는 능력치 배수'],
  ['botFx.grudgeW', FX.grudgeW, '복수 가중 = 1 + grudgeW × 복수심'], ['botFx.huntSense / farmSense', `${n0(FX.huntSense)} / ${n0(FX.farmSense)}`, '대상이 없을 때 배회 방향을 정하는 감지 거리(px)'], ['botFx.wanderTime', `${FX.wanderTime[0]} ~ ${FX.wanderTime[1]}`, '대상이 없을 때 배회 방향을 새로 뽑는 간격(초) 범위'], ['botFx.farmIn / farmOut', `${FX.farmIn} / ${FX.farmOut}`, '도형 후보에 새로 들어오는 거리 / 이미 노리는 도형을 유지하는 최대 거리(px)'], ['botFx.crasherIn / crasherOut', `${FX.crasherIn} / ${FX.crasherOut}`, '크래셔 후보에 새로 들어오는 거리 / 이미 노리는 크래셔를 유지하는 최대 거리(px)'], ['botFx.wander', JSON.stringify(FX.wander), '배회: mode(natural/legacy), 속도 = spdBase + spdK × 목표지향, turnRate 회전 속도(라디안/초), wobble 흔들림(라디안)'], ['botFx.flee', JSON.stringify(FX.flee), '도주: mode, sideK 옆 성분, wobble 흔들림, sideT 옆방향 전환 간격(초), sideRate 전환 속도, turnRate 회전 속도, lookAhead/edgeMargin/edgePush 가장자리 회피'], ['botFx.aim', JSON.stringify(FX.aim), '조준: mode(human/legacy), e0·ed·ev 오차 계수, accRef 기준 가속, drift 오차 변화 주기(초), habit 습관 배율, leadErr 예측 오차, lockMax/lockMin/lockSlow 노림 지연'], ['botFight.fleeMemory', CFG.botFight.fleeMemory, '도주한 상대를 기억하는 시간(초, 0 = 끔)'], ['botFight.threatMul / threatPush', `${CFG.botFight.threatMul} / ${CFG.botFight.threatPush}`, '피할 구역 반지름 = 교전 시야 × threatMul / 구역 안에서 바깥으로 미는 최대 세기'],
], [3000, 1900, W - 4900], { size: 17 }));

/* =================== 10. 테스트 도구와 측정 결과 =================== */
add(H1('10. 테스트 도구와 측정 결과'));
add(P('모든 측정은 **Node.js 헤드리스 시뮬레이션**(가짜 DOM으로 game.js를 화면 없이 구동)에서 얻은 값입니다. 실제 브라우저에서의 프레임 속도나 플레이 느낌과는 다를 수 있으며, 표본이 작은 값은 참고용입니다. **총알 판정을 접촉 틱 교환 모델로 바꾸거나 총알 속도·크기를 바꾸기 전에 측정한 값(성능, 봇 개체군, 도형 처치 발수 등)은 이전 규칙 기준**이라 달라질 수 있습니다.'));
add(H2('10.1 tests/run.js 사용법'));
add(...FML(['node tests/run.js <시나리오[,시나리오]> [옵션]', '예) node tests/run.js quick', '예) node tests/run.js types --runs 3 --min 10 --seed 21', '예) node tests/run.js pop --set bots.base=12', '예) node tests/run.js perf --level 45 --min 3 --prof --nosep']));
add(...T(['시나리오', '내용'], [
  ['config', '설정에서 계산되는 값 확인(목표 봇 수, 맵 크기, 군집 수 등, 시뮬레이션 없음)'], ['shapes', '총알 vs 도형 발수와 관통, 몸통 충돌 피해, 육각형 재생'], ['botspawn', '봇 스폰 위치 분포(맵 전체 무작위인지)'], ['autofire', '사망 시 오토 파이어 해제'], ['nest', '둥지 구성, 육각형 재등장 타이머, 일반 도형 종류 비율'],
  ['catchup', '1레벨 봇이 목표 레벨까지 걸리는 시간(성장 가속)'], ['pop', '봇 개체군: 레벨 추이, 사망 원인, 수명, 점수 출처, 도형 보충률'], ['fp', '가짜 플레이어(봇 AI, 점수 100%)의 성장과 생존'], ['spawn', '신규 플레이어 스폰 위치 공정성과 생존'], ['late', '후반(플레이어 Lv45) 정상 상태'], ['perf', '성능(update·draw 프레임당 ms, --prof로 함수별 시간)'],
  ['traitcheck', '성격 유형과 수치 연결 확인(유형 분포, 파생 값, 시야, 두려움, 복수, 추격 유지, 조준 오차)'], ['buildcheck', '성격 유형별 능력치 투자·클래스 선택(레벨 45까지 성장, 유형별 평균 빌드와 클래스 비율)'], ['scorecheck', '점수제 목표 선택 확인(유형별 선호, 도주 우선, 유지 보너스·최소 유지 시간, 배회 방향)'], ['knockcheck', '총알의 밀림·꺾임 확인(대상별 속도, 비껴 맞을 때 꺾임, 무적 대상은 밀리지 않음)'], ['rulecheck', '최근 바꾼 규칙 확인(총알 속도·크기, 반동 유지, 체력 회복·급속 회복, 성장 가속 상한, 맵 크기 기준, 부활 레벨)'], ['clashcheck', '총알끼리 충돌 비교(이전 방식 instant와 현재 방식 mass를 같은 조건에서 비교)'], ['fightcheck', '봇의 싸움·도주 판단(전투 우위 R) 확인: 유형별 판단표, ±15% 여유, 최소 유지 시간, 다른 적에 대한 즉시 도주'], ['aicheck', '봇 AI 측정: 교전 판단의 정확도(R 구간별 승패), 도주 성공률과 재교전, 상태 전이·떨림, 배회 방문 시간, 파밍을 잃은 순간의 도형 거리'], ['memorycheck', '도주 후 위협 기억(후보 제외, 밀려남, 배회 방향, 끄기)과 도형 후보 들어오는/벗어나는 거리 확인'], ['ttk', '탱크 처치 시간(사수 빌드 x 대상 빌드, 정지한 대상 정면 400px)'], ['sanity', '이상 상태 감시(숫자 오류, 비정상 속도, 맵 밖 이탈, 체력 초과, 죽은 개체 잔존 등, 플레이어가 움직이며 사격하는 한 판)'], ['types', '성격 유형별 봇 성과(소환·사망·수명·레벨·처치, 목표 전환 횟수, 행동 상태 비율)'],
], [1800, W - 1800]));
add(P('주요 옵션: `--runs N`, `--min M`, `--trials N`, `--level L`, `--seed S`(같은 시드면 같은 결과), `--set 경로=값`(반복 가능, 게임 생성 전에 적용), `--brief`, `--save 이름` / `--compare 이름`(결과 저장·비교), `--game 경로`(다른 버전 비교), `--prof`, `--nosep`, `--max-sec`(예상 시간 초과 시 중단), `--force`. 시나리오마다 게임을 새로 불러와 실행하므로 서로 영향을 주지 않습니다.'));
add(H2('10.2 성능 (perf: 플레이어 Lv45 정지, 봇 19마리, 워밍업 2분 후 3분 측정, 시드 1)'));
add(...T(['시점의 변경', 'update 프레임당', '비고'], [
  ['총알 격자 도입 전 (겹침 방지 켬)', '2.34 ~ 2.63 ms', 'updateBullets가 1.4~1.6ms로 가장 큼'],
  ['겹침 방지를 끈 비교 (--nosep)', '3.13 ~ 3.17 ms', '느려진 원인이 겹침 방지가 아님을 확인 (겹침 방지 자체는 약 0.23ms)'],
  ['총알-도형 격자 적용 후', '1.25 ~ 1.26 ms', 'updateBullets 0.33ms (약 77% 감소)'],
  ['총알 지속시간 x1.7 적용 후', '1.13 ~ 1.16 ms', '총알 평균 48 → 102발(약 2.1배), updateBullets 0.29 → 0.43ms'],
  ['봇 AI 성격 1단계 적용 후', '1.50 ms', 'Bot.ai 0.20 → 0.34ms. 측정 흔들림(약 12%)이 섞여 있음. 2단계 적용 후 성능은 미측정'],
], [3700, 2100, W - 5800]));
add(H2('10.3 성장 가속 (catchup: 봇 1마리 단독, 목표 레벨별 5회, 제한 90초, 시드 1)'));
add(...T(['목표 레벨', '가속 없음', '고정 5배', '5배 + 초당 0.5 증가 (현재)'], [['5', '29초 (5/5)', '14초 (5/5)', '9초 (5/5, 최대 17)'], ['8', '80초 (4/5)', '18초 (5/5)', '15초 (5/5, 최대 20)'], ['11', '90초 안에 0/5', '31초 (5/5, 최대 66)', '18초 (5/5, 최대 23)'], ['14', '90초 안에 0/5', '44초 (5/5, 최대 68)', '19초 (5/5, 평균 25, 최대 48)']], [1500, 2000, 2400, W - 5900], { align: Array(4).fill(CT) }));
add(P('시간은 중앙값입니다. 단독 측정이라 실제 게임에서는 다른 봇에게 죽거나 도형이 멀어서 더 늦을 수 있습니다.'));
add(H2('10.4 성격 유형 1단계 확인 (traitcheck, 시드 1)'));
add(...BUL([
  '유형 분포(7,000마리): 965~1,043마리로 고르게 나옴(기대 1,000). 숙련도 범위 0.85~1.00, 유형별 평균 0.92~0.93으로 유형과 무관.',
  '7개 유형의 파생 값(도망 체력, 겁내는 레벨 차이, 시야, 추격·복수 시간)이 계산식과 모두 일치.',
  '교전 시야: 상대가 500/700/850px일 때 노리는지가 유형별 기대 시야(615~908)와 일치. 두려움: 상대가 +8, +12레벨 높을 때 도주 여부가 기준(5.2~15.6레벨)과 일치.',
  '복수: 시야의 1.2배 밖의 상대가 때리면 노리고, 복수 시간(5.4~14.4초)이 지나면 포기. 조준 오차의 최대는 상한(약 0.0088라디안)과 일치.',
  '쉬는 행동 제거: 체력 10%, 대상 없음일 때 이동 속도 비율 0.40(배회), 멈추지 않음.',
  '추격 유지(상대 초속 400으로 도망, 시작 거리 600): 목표를 놓는 시각이 안전농부 1.1초, 저격형 1.2초, 균형형 2.6초, 복수자 2.9초, 겁없는농부 3.1초, 추격자 4.5초, 돌격형 5.3초. 이 값은 끈기뿐 아니라 시야 크기에도 영향을 받으며, 이번 검사에서는 거리 조건이 먼저 걸려 "추격 시간 제한"은 시험되지 않았습니다.',
]));
add(H2('10.5 봇 개체군 변화 (types, 봇 10마리, 3회 × 10분 = 30분)'));
add(...T(['조건', '소환', '사망', '분당 사망', '평균 수명(생존 포함)'], [
  ['이전 AI (유형 도입 전), 시드 21', '54', '23', '0.77', '320초'], ['이전 AI, 시드 22', '56', '26', '0.87', '306초'], ['성격 1단계, 시드 21', '63', '33', '1.10', '272초'], ['성격 1단계, 시드 22', '66', '35', '1.17', '266초'], ['성격 1단계, 모두 균형형, 시드 21', '64', '34', '1.13', '268초'],
], [4200, 900, 900, 1300, W - 7300], { align: [AlignmentType.LEFT, CT, CT, CT, CT] }));
add(...BUL([
  '새 AI에서 봇 사망이 약 40% 늘었고(분당 0.82 → 1.13), 모든 사망이 다른 봇에게 당한 것(도형·크래셔로 죽은 경우 0건)입니다. 모든 봇을 균형형으로 고정해도 같아서 유형 다양성이 원인이 아니고, 쉬는 행동 제거나 복수·추격 유지 같은 공통 변화가 후보입니다(미분리).',
  '유형별 성과(두 시드 합계, 표본 12~25마리/유형, 오차 ±11~13%포인트): 사망 비율 겁없는농부 35%, 안전농부 42%, 복수자 45%, 저격형 53%, 균형형 60%, 추격자 61%, 돌격형 68%. 겁없는농부가 가장 잘 살아남고 많이 처치(0.95/소환), 돌격형은 많이 죽고 거의 못 잡음(0.26/소환). 우연일 수 있어 단정하지 않습니다.',
  '이 측정은 모두 2단계(점수제) 적용 **전** 코드입니다. 2단계 이후의 사망률·유형별 성과는 아직 측정하지 않았습니다.',
]));

add(H2('10.6 봇 AI 2단계(점수제) 검증 (scorecheck, traitcheck, types)'));
add(...BUL([
  '**점수제 동작 (scorecheck):** 같은 거리(300px)의 오각형과 같은 레벨 탱크 중 무엇을 노리는지가 7개 유형 모두 점수식의 기대와 일치했습니다(안전농부·겁없는농부·복수자·균형형은 오각형, 저격형·돌격형·추격자는 탱크). 레벨이 30 높은 탱크가 400px에 있으면 더 가까운 오각형이 있어도 7개 유형 모두 도주했고, 체력 10%에서도 7개 모두 도주했습니다.',
  '**유지 보너스와 최소 유지 시간:** 21가지 경우 중 20개가 기대와 일치했습니다(조금 가까운 후보는 무시, 훨씬 가까운 후보로 교체, 최소 유지 시간 동안에는 유지). 예외 1건: 겁없는농부는 훨씬 가까운(100px) 오각형으로 바꾸지 않았습니다(점수 비 1.43 < 유지 보너스 1.44). 점수를 누르는 함수 때문이었고, 이후 유지 보너스 비교를 원점수로 바꿔 해결했습니다(11.2의 18번). 변경 후 scorecheck는 21가지 모두 기대와 일치합니다.',
  '**배회 방향:** 탱크가 동쪽 2,000px, 군집이 북쪽 2,000px에 있을 때 4,000번 뽑은 방향 비율이 유형별 목표지향과 ±2%포인트 안으로 일치했습니다(안전농부 탱크 15%·군집 85%, 돌격형 83%·17%).',
  '**1단계 항목 유지 (traitcheck):** 유형 분포, 파생 값, 시야, 두려움, 복수, 쉬는 행동 제거가 2단계에서도 그대로입니다. 추격 유지에서 목표를 놓는 시각은 안전농부 0.8초, 저격형 0.9초, 복수자 2.3초, 균형형 2.5초, 겁없는농부 2.8초, 추격자 4.5초, 돌격형 5.1초입니다.',
]));
add(...T(['조건 (봇 10마리, 3회 × 10분 = 30분)', '소환', '사망', '분당 사망', '평균 수명', '목표 전환 (봇·분당)', '3초 내 되돌림'], [
  ['1단계, 시드 21', '63', '33', '1.10', '272초', '11.04', '11%'], ['1단계, 시드 22', '66', '35', '1.17', '266초', '미측정', '-'],
  ['2단계, 시드 21', '91', '61', '2.03', '187초', '2.32', '7%'], ['2단계, 시드 22', '97', '67', '2.23', '178초', '2.38', '7%'],
  ['2단계 + 유지 보너스 원점수 비교, 시드 21', '86', '56', '1.87', '200초', '2.18', '5%'], ['2단계 + 유지 보너스 원점수 비교, 시드 22', '84', '54', '1.80', '204초', '2.36', '5%'],
  ['2단계 + 탱크 쪽 배회 끔 (huntSense=0), 시드 21', '63', '33', '1.10', '272초', '1.94', '5%'], ['2단계 + 탱크 쪽 배회 끔, 시드 22', '83', '53', '1.77', '206초', '2.16', '5%'],
], [3500, 700, 700, 900, 1000, 1500, W - 8300], { size: 17, align: [AlignmentType.LEFT, CT, CT, CT, CT, CT, CT] }));
add(...BUL([
  '**떨림 방지는 효과가 있습니다.** 목표 전환이 봇·분당 11.0회에서 2.3회로 약 79% 줄었고, 3초 안에 원래 목표로 돌아가는 비율도 11%에서 7%로 줄었습니다.',
  '**봇 사망은 늘었습니다.** 분당 1.13에서 2.13으로 약 1.9배입니다(두 시드 합계 각 60분, 사망 68건에서 128건, 오차 약 ±0.15). 탱크 쪽 배회를 끄면 1.43이 되어 증가분의 약 70%가 목표지향 배회 때문입니다. 나머지 약 +0.3은 원인을 가리지 못했습니다.',
  '사망 원인은 대부분 다른 봇이고, 도형에게 죽은 경우가 2단계 실험에서 3건(오각형 2, 사각형 1) 나왔습니다.',
  '**유지 보너스를 원점수로 비교한 뒤(시드 21·22 합계 60분):** 목표 전환은 봇·분당 2.27회로 이전(2.35회)과 같고 3초 안 되돌림은 7%에서 5%로 줄었습니다. 봇 사망은 분당 1.83으로 이전 2.13보다 약 14% 적지만(사망 128건 → 110건) 오차가 약 ±0.15라 효과로 확정하기는 어렵습니다. 사망 원인은 봇 109건, 크래셔 1건입니다.',
]));
add(...T(['유형 (2단계, 두 시드 합계)', '소환', '사망 비율', '탱크 처치'], [['안전농부', '21', '86%', '13'], ['겁없는농부', '32', '72%', '27'], ['추격자', '25', '72%', '11'], ['저격형', '26', '69%', '15'], ['균형형', '32', '63%', '14'], ['돌격형', '26', '62%', '26'], ['복수자', '26', '58%', '20']], [3200, 1600, 2400, W - 7200], { align: [AlignmentType.LEFT, CT, CT, CT] }));
add(P('유형당 소환이 21~32마리라 오차가 큽니다. 1단계에서는 안전농부의 사망 비율이 가장 낮았는데(42%) 2단계에서는 가장 높아졌습니다. 유형 간 균형은 사용자 결정으로 검증하지 않기로 했습니다.'));
add(H2('10.7 성격 1단계 이후 사망 증가의 원인 분리 (모두 균형형, 시드 21과 22 합계 각 60분)'));
add(...T(['조건', '소환', '사망', '분당 사망 (오차 약 ±0.13)'], [
  ['이전 AI (성격 도입 전, 유형 없음)', '110', '49', '0.82'], ['1단계, 쉬는 행동 있음', '116', '56', '0.93'], ['1단계, 쉬는 행동 제거', '121', '61', '1.02'], ['위 + 복수·추격 끔', '124', '63', '1.05'], ['1단계, 쉬는 행동 제거, 유형 혼합', '129', '68', '1.13'],
], [4800, 1100, 1100, W - 7000], { align: [AlignmentType.LEFT, CT, CT, CT] }));
add(...BUL([
  '**복수와 추격 유지는 원인이 아닙니다.** 둘을 꺼도 사망이 줄지 않았습니다(1.02 → 1.05).',
  '쉬는 행동 제거의 영향은 약 +0.1(0.93 → 1.02)이고, 성격 도입 자체(유형 값에 따른 도망 체력 등)도 약 +0.1(0.82 → 0.93)입니다. 둘 다 오차 범위 안이라 하나의 원인으로 특정할 수 없습니다. 이전 AI에서 유형 혼합 1단계까지의 총 증가(0.82 → 1.13)는 오차의 약 2배입니다.',
]));
add(H2('10.8 테스트 도구 정리 후 재실행 결과 (game.js 252b99603a49, 시드 1)'));
add(...BUL([
  '**shapes:** 레벨 1 플레이어(Body 0)와 도형의 몸통 충돌 1틱 피해가 8/12/16/20(사각형·삼각형 8, 오각형 12, 육각형 16, 알파 20)으로 기대와 일치, 도형이 받는 피해 20. 육각형 재생은 체력을 70%로 낮춘 뒤 1초에 +10(기대 +10). 관통 7 총알이 육각형을 통과(143발에 처치), 관통 7+피해 7로 36발.',
  '**nest:** 알파 1/1, 오각형 40/40, 둥지 육각형 0. 둥지 밖 일반 도형 3만 개 표본에서 육각형 0.17~0.22%(오각형:육각형 21~28:1).',
  '**botspawn:** 4,000번 소환 시 사분면 분포 945/1023/1021/1011, 화면 안·맵 밖·둥지 근처 0건, 플레이어에게서 1,500px 이내 1.0%. **autofire:** 기대와 일치.',
  '**fp (완벽 파밍 가짜 플레이어, 2회 × 10분):** 최고 Lv38과 Lv45, 사망 0회, Lv15 도달 0.9~1.3분, Lv30 2.5~6.1분, Lv45 6.9분(한 시도). 이전 측정(15분에 Lv14~31)보다 훨씬 빠릅니다(11장 19번).',
  '**spawn (8회):** 스폰 위치에서 가장 가까운 봇까지 최소 253px, 중앙값 2,329px, 700px 이내 5.3%. 가만히 선 1레벨 플레이어가 150초를 버틴 경우 5/8, 사망 원인은 봇 Lv13 1건, Lv39 2건.',
  '**도구에서 고친 문제 3건(게임 코드 문제 아님):** 몸통 충돌 검사가 이전 플레이어 객체를 읽어 피해 0으로 표시, 재생 검사가 체력 변경 전 값(1500) 기준이고 이전 검사에서 남은 총알에 맞아 음수로 표시, 시나리오끼리 월드가 섞여 nest가 빈 둥지를 봄. 시나리오마다 게임을 새로 불러오도록 바꿨습니다.',
]));

/* =================== 11. 문제점 =================== */
add(H1('11. 해결하지 못한 문제와 결정된 사항'));
add(P('번호는 이전 점검 때 붙인 번호를 그대로 씁니다(17번부터는 이번에 새로 발견한 것).'));
add(H2('11.1 아직 남아 있는 것'));
add(...T(['번호', '내용', '상태·비고'], [
  ['4', '봇이 시야 밖의 플레이어 위치를 압니다(목표지향 배회가 3,500px 안의 탱크로 이동).', '보류(사용자 결정). 사망 증가(17번)는 현 상태 유지로 결정'],
  ['20', '**3단계(성장 연동)가 시뮬레이션으로 검증되지 않았습니다.** 문법 검사만 통과했습니다. 유형별 평균 빌드가 계산값(7.8)과 맞는지, 같은 유형의 가중치가 같은지, 봇 사망·수명이 달라지는지 모릅니다.', '확인 필요: buildcheck(새로 추가), types'],
  ['7', '실제 브라우저에서 플레이하며 확인한 적이 없습니다(킬로그 표시, 체감 난이도, 프레임 속도).', '사용자가 직접 점검'],
  ['13', '레벨 30·45 클래스 트리 업그레이드가 없고, 봇 재소환 간격이 최대 6초입니다.', '미구현, 사용자가 나중에 진행'],
], [700, 6200, W - 6900], { size: 17, keep: false }));
add(H2('11.2 결정된 사항과 해결된 것'));
add(...T(['번호', '항목', '결과'], [
  ['1', '2단계 검증', '완료(10.6). 점수제와 떨림 방지는 의도대로 동작, 새 문제 17·18번 발견'],
  ['2', '1단계 이후 사망 증가 원인', '분리 완료(10.7). 복수·추격은 원인이 아니고 쉬는 행동 제거는 약 +0.1(오차 범위)'],
  ['3', '유형 간 균형', '사용자 결정: 검증하지 않음'],
  ['5', '농부형도 도형 후보가 없으면 탱크를 공격', '사용자 결정: 의도된 동작'],
  ['8', '총알 지속시간 x1.7의 전투 균형', '사용자 결정: 양호(문제가 생기면 사용자가 알림)'],
  ['9', '성장 가속이 목표 레벨을 넘어 오름', '해결: 목표 레벨 최소 점수에 닿는 데까지만 가속(7.2). 시뮬레이션 확인은 하지 않기로 함(사용자 결정)'],
  ['10', '알파·오각형·육각형의 통과 규칙 불일치', '해결: 모두 통과 가능으로 통일(5.1)'],
  ['11', '체력 재생이 육각형·알파에만 있음, 위키에서 확인하지 못한 값', '사용자 결정: 현재 값 확정'],
  ['12', '신규 플레이어가 스폰 직후 고레벨 봇을 만날 수 있음', '사용자 결정: 괜찮음(문제가 생기면 사용자가 알림)'],
  ['14', '파티클', '사용자 확인: diep.io에 파티클 없음(꺼 둔 상태 유지)'],
  ['15', '개발자 모드 진입 키가 레벨 상승과 묶임', '사용자 결정: 괜찮음'],
  ['6', '능력치 투자와 클래스 선택이 성격과 무관', '해결(3단계): 성격 유형 기반 가중치 + 클래스 연동, 클래스 확률은 3:2:3:2 고정(사용자 결정). 검증은 아직(20번)'],
  ['16', 'tests/run.js 구식 시나리오', '해결: 정리 후 재실행(10.8), 시나리오마다 게임 새로 로드'],
  ['17', '2단계 이후 봇 사망 증가(분당 1.13 → 2.13)', '사용자 결정: 현재 상태 유지(탱크 쪽 배회를 줄이려면 `huntSense`로 조정 가능, 끄면 1.43)'],
  ['18', '점수를 0~1로 누르는 함수 때문에 유지 보너스가 큰 점수 후보에서 과하게 작동(교체가 막힘)', '해결: 유지 보너스 비교를 눌리기 전의 원점수로 변경(7.6). 변경 후 scorecheck 21/21 일치, 목표 전환은 봇·분당 2.2~2.4로 변화 없음(10.6)'],
  ['19', '완벽 파밍 가짜 플레이어의 빠른 성장(Lv45 약 7분)', '사용자 결정: 의도된 동작'],
], [700, 3600, W - 4300], { size: 17, keep: false }));

/* =================== 12. 개선 제안 =================== */
add(H1('12. 앞으로 개선하면 좋을 점'));
add(H2('12.1 봇 AI'));
add(...BUL([
  '사망 증가(17번)는 현재 상태 유지로 결정했습니다. 필요해지면 `huntSense`로 조정할 수 있습니다(보류 중인 4번과 함께).',
  '3단계(성장 연동)는 코드에 들어갔고 검증이 남아 있습니다(20번). 저격형처럼 유형 이름과 빌드가 어긋나는 경우가 있어서, 이름과 맞추려면 편향식을 손봐야 합니다.',
  '**총알 회피(숙련도):** 날아오는 총알을 보고 피하는 행동을 다음 단계에 추가.',
]));
add(H2('12.2 게임 규칙과 밸런스'));
add(...BUL([
  '탱크가 많아질수록 탱크당 점수가 줄어드는 문제(3장): 군집 최대 수나 군집 밀도를 맵 크기에 따라 늘리는 방안.',
  '레벨 30·45 클래스 트리 업그레이드 구현(사용자가 나중에 진행).',
]));
add(H2('12.3 성능과 코드 구조'));
add(...BUL([
  '`Bot.pickTarget`이 도형 전체를 순회합니다. 총알 충돌에 쓴 격자를 재사용하면 봇 수가 많은 후반 비용을 줄일 수 있습니다. 2단계 적용 후 성능은 측정하지 못했습니다.',
  '`collisionPass`의 탱크-도형 이중 루프도 격자화 후보입니다(프레임당 약 0.2ms).',
  `game.js가 ${NLINES}줄 단일 파일입니다. 봇 AI, 월드 생성, UI를 분리하면 유지보수가 쉬워지지만 지금 구조로도 동작에는 문제가 없습니다.`,
  '브라우저 안에서 프레임 시간과 총알 수를 보여 주는 성능 표시를 개발자 패널에 추가.',
]));
add(H2('12.4 도구와 확인 방식'));
add(...BUL([
  '핵심 수치의 회귀 테스트(처치 발수, 관통 조건, 맵 크기 공식 등)를 정해 두고 변경 때마다 비교(`shapes`, `scorecheck` 활용).',
  '설정(CFG)을 개발자 패널에서 직접 조정하는 기능, 시드 고정 재현 기능.',
  '직접 플레이 점검 체크리스트(조작감, 킬로그 표시, 봇 행동)를 만들어 정기적으로 확인(사용자 진행 예정).',
]));

/* =================== 부록 =================== */
add(H1('부록 A. 주요 변경 이력 (주제별)'));
add(P('변경 이력을 주제별로 묶었습니다. 각 주제 안의 순서는 원래 기록 순서이고 항목 내용은 그대로입니다. 이전 세션의 변경에는 날짜가 기록되어 있지 않아 날짜 순으로는 정리하지 않았습니다. 이번 세션의 가장 최근 변경은 A.1에 따로 요약했습니다.'));
add(H2('A.1 최근 변경 요약'));
add(...BUL([
  '**30레벨 전직:** 15레벨 클래스에서 고르는 30레벨 클래스 8개 추가(Triple Shot, Twin Flank, Quad Tank, Assassin, Hunter, Destroyer, Gunner, Tri-Angle). 드론·트랩·자동 포탑·Smasher는 제외(4.5절).',
  '**군집 개편:** 위치 확정 → 성장 → 목표 도달 시 즉시 종료 → 일반 도형 전환. 군집 보충 속도 5개/초 → 1개/초, 일반 도형 밀도 3.6e-6 → 4.1e-6(6장).',
  '**중앙 둥지:** 도형 밀도 30% 감소(오각형 40 → 28, 크래셔 22 → 15, 6장).',
  '**총알 피해 범위:** 한 발이 한 대상에 주는 총 피해를 Dmin~Dmax로 제한(측정 최소 2.7 → 6.8, 최대 233.3 → 109.9, 5.1절).',
  '**몸통 충돌:** 사각형·삼각형·오각형이 탱크와 부딪힐 때 질량을 0.35배로 계산(5.3절).',
  '**봇 AI:** 사람다운 배회·도주·조준(7.11절).',
  '**개발 방식:** `npm run check`에 짧은 `sanity` 추가, 문서 생성기 경로 수정, 측정 시나리오(`bodycheck`, `dmgrange`, `shapeflow`, `clustercheck`, `classcheck`) 추가(10장).',
]));
add(H2('A.2 도형·군집·둥지·맵'));
add(...NUM([
  '육각형 추가(체력 1000, 점수 1500, 몸통 피해 16, 총알 통과 가능, 일반 구역 0.2%, 둥지에는 소환하지 않음, 재생). 알파 오각형 점수 3000.',
  '오각형·육각형 총알 통과 가능으로 변경(알파는 통과 불가 유지).',
  '중앙 둥지 크기를 맵 크기에 비례하게(밀도 동일).',
  '도형끼리 겹치지 않게(생성 시 빈 자리 + 0.04초마다 분리).',
  '알파 오각형도 총알 통과 가능으로 통일(오각형·육각형·알파 모두 통과).',
  '맵 크기를 정하는 탱크 수를 실제 탱크 수에서 계획된 탱크 수(플레이어 + 목표 봇 수)로 변경. 게임 시작 직후 봇이 한 마리씩 소환되는 동안 맵이 최대 21%(16,583 → 13,083) 줄던 문제를 해결.',
  '도형·크래셔 반지름을 diep.io 캔버스 자료에 맞춰 변경(사각형 22→26.4, 삼각형 26→26.4, 오각형 44→36, 육각형 66→54(추정), 알파 105→96, 작은 크래셔 15→16.8, 큰 크래셔 24→26.4).',
  '중앙 둥지 도형 밀도 30% 감소: 기준 오각형 수 nest.pentagons 40 → 28(밀도 1.05e-5 → 7.4e-6/px²), 크래셔 기준 수 nest.crasherMax 22 → 15(약 32% 감소). 알파 오각형은 그대로. nest.pentagons 40, nest.crasherMax 22로 이전 동작 복귀.',
  '군집 개편(clusters.mode = grow): 위치를 정한 뒤 40~80초 동안 도형을 하나씩 만들고, 만든 개수가 목표에 닿으면 군집을 바로 없애며 도형은 일반 도형이 됨(처치로 줄어도 보충하지 않는 총 생성 예산). 게임 시작 때는 목표의 20~90%를 미리 채움, 일반 도형 초과분은 오래된 것부터 지움, 봇은 30% 이상 찬 군집만 배회 목적지로 삼음. 총 도형 수 유지를 위해 일반 도형 밀도 shapeDensity 3.6e-6 → 4.1e-6. clusters.mode = legacy와 shapeDensity 3.6e-6으로 이전 동작 복귀. 측정(시드 1, 15분, 1회, 개편 전 대비): 전체 도형 수 평균 1,348 → 1,413, 군집 처치 2.76 → 1.19개/초, 일반 도형 처치 4.35 → 5.82개/초, 군집이 목표를 채우는 데 평균 61.4초(42~83초), 목표 초과 생성·종료 뒤 생성 0건, 군집 수 7 유지, `pop` 봇 사망 분당 2.23 → 2.33, 봇의 탱크 처치 점수 비중 23.7% → 29.1%, `fp`(가짜 플레이어) 15분 뒤 레벨 37 → 30.5(표본 1회, 오차 큼). 테스트 도구에 clustercheck 시나리오 추가.',
  '군집 도형 보충 속도를 군집당 5개/초에서 1개/초로 낮추고(clusters.refill), 총량 유지를 위해 군집 목표 도형 수를 20% 올림(clusters.density 2.8e-5 → 3.36e-5). refill 5, density 2.8e-5로 이전 동작 복귀. 측정(시드 1, 15분, 1회): 전체 도형 수 평균 1,336 → 1,348, 군집 처치 6.66 → 2.76개/초, 일반 도형 처치 3.42 → 4.35개/초, 봇 사망 `pop` 분당 1.6 → 2.2, 봇의 탱크 처치 점수 비중 13.9% → 23.7%, `fp`(가짜 플레이어) 15분 뒤 레벨 44 → 37(표본 1회, 오차 큼). 테스트 도구에 shapeflow 시나리오 추가.',
], 21));
add(H2('A.3 총알·피해·충돌'));
add(...NUM([
  '총알 지속시간 x1.7.',
  '총알-도형 충돌 격자(총알 처리 비용 약 77% 감소).',
  '반동의 레벨 보정을 없애고 모든 레벨에 50%를 적용.',
  '총알 기본 속도를 0.7배, 기본 크기를 1.3배로 변경(bulletSpeedMul, bulletSizeMul). diep.io처럼 지속시간은 그대로라 사거리는 속도 배율만큼 줄고, 반동은 이 배율의 영향을 받지 않게 유지.',
  '총알끼리의 충돌을 탱크·도형과 같은 접촉 틱 교환 + 질량 모델로 변경(bulletClashMode = mass). 이전 방식(내구도 비교로 한 번에 승패)은 bulletClashMode = instant와 백업 폴더로 복원 가능.',
  '밀림 강도를 대상별로 분리(pushTank, pushShape, pushBullet)하고 총알끼리 충돌에 속도 하한(bulletMinSpeed)을 추가. 모두 1, 1, 1, 0으로 두면 이전과 같음.',
  '총알끼리 충돌 뒤 총알의 진행 방향을 충돌 전 방향으로 고정(bulletClashKeepDir). 속도는 처음 속도의 bulletMinSpeed~100% 범위로 제한.',
  '총알 한 발이 탱크 한 대에 주는 총 피해에 범위(bulletRange: 하한 Dt × 1.5, 상한 Dt × (0.8 + 0.25 × P))를 둠. 측정 최소 2.7 → 6.8, 최대 233.3 → 109.9. 테스트 도구에 dmgrange 시나리오 추가. bulletRange.mode = legacy로 이전 동작 복귀.',
  '총알의 밀림과 꺾임을 질량 모델로 구현(대상은 총알 방향으로 밀리고 총알은 비껴 맞으면 꺾임, 무적 대상은 밀리지 않음). 기존의 처음 닿을 때 속도의 2%만 미는 방식은 삭제.',
  '총알 판정을 접촉 중 매 틱 교환 모델로 변경(대상당 1회 정산 → 겹쳐 있는 동안 총알 체력이 0이 될 때까지 연속 피해). 관통 포인트 공식(기본 체력 × (1 + 0.75 × 포인트))은 이미 같아서 그대로.',
  '도형에 맞은 총알의 체력 소모를 방어값 × 1.5에서 방어값(×1)으로 변경(shapeDrain 삭제).',
], 22));
add(H2('A.4 몸통 충돌·체력'));
add(...NUM([
  '체력 회복(Health Regen)의 "마지막으로 맞은 뒤 2초 후 시작" 대기 시간을 없애고 항상 회복(regenDelay 설정 삭제). 10초 무피격 급속 회복은 그대로.',
  '몸통 충돌: 사각형·삼각형·오각형이 탱크와 부딪힐 때 질량을 0.35배로 계산해 탱크가 덜 멈추게 변경(bodyPhys). 테스트 도구에 bodycheck 시나리오 추가. bodyPhys.mode = legacy로 이전 동작 복귀.',
], 23));
add(H2('A.5 클래스·전직'));
add(...NUM([
  '30레벨 전직 3단계: Flank Guard에 Tri-Angle 추가(classUp30). 포신별 총알 배율(포신의 dmg, pen, life 필드)을 지원해 뒤 포신 총알을 위력 20%·수명 50%로 만듦. 테스트 도구의 classcheck에 화면 타일과 포신별 총알 확인 추가.',
  '30레벨 전직 2단계: Sniper에 Assassin, Hunter / Machine Gun에 Destroyer, Gunner 추가(classUp30). Destroyer는 한 발의 하한·상한 배율(rangeMin 0.4, rangeMax 0.33)로 최대 피해를 다른 클래스와 비슷하게 제한. 새 클래스의 선호 거리 BOT_DIST 추가(Assassin 620/480, Destroyer 380/280, Gunner 260/190), Hunter는 Sniper 값을 따름.',
  '30레벨 전직 1단계: 15레벨 클래스에서 고르는 30레벨 클래스 구조(classUpLevel2, classUp30, par, reloadMul)와 Triple Shot, Twin Flank, Quad Tank 추가. 플레이어(타일 클릭)와 봇(균등 추첨)이 같은 규칙(classChoices)을 사용. Sniper·Machine Gun의 30레벨 선택지는 다음 단계. 테스트 도구에 classcheck 시나리오 추가.',
], 24));
add(H2('A.6 봇 AI'));
add(...NUM([
  '봇 소환 위치를 맵 전체 무작위로 변경(화면 안, 저레벨 봇의 둥지 근처만 제외).',
  '봇 스폰 무적과 0~3초 랜덤 대기.',
  '봇을 모두 1레벨로 소환하고 원래 레벨은 목표 레벨로 두어 성장 가속(5배에서 시작, 초당 +0.5).',
  '소환·정리용 "화면 안" 판정에서 개발자 줌을 제외(줌을 많이 뺄 때 봇 소환이 계속 실패하던 문제 수정).',
  '봇 AI 1단계: 성격 유형 7종과 수치 5개, 수치를 기존 상수에 연결, 체력이 낮을 때 멈춰서 쉬는 행동 제거.',
  '봇 AI 2단계: 점수제 목표 선택, 떨림 방지 규칙, 목표지향 배회.',
  '성장 가속을 목표 레벨 최소 점수에 닿는 데까지만 적용(목표 레벨을 넘어 오르지 않음).',
  '봇 유지 보너스 비교를 눌리기 전의 원점수로 변경(점수가 큰 후보 사이에서 교체가 막히던 문제 해결).',
  '봇의 싸움·도주 판단을 전투 우위 R(내·상대 체력과 레벨)로 변경(botFight.mode = power). 경계 구간 없음, 싸움·도주 최소 유지 시간 2초, ±15% 여유, 복수 대상 기준 0.7배, 쉬움 보정은 R ÷ (1.5 × 기준). botFight.mode = legacy로 이전 방식 복귀.',
  '전투 우위 R의 체력을 절대 체력에서 체력%로 변경하고 공격력 지수를 2에서 3으로 변경(추정 최대 체력 설정 hpPtsPerLevel, hpPtsMax 삭제).',
  '레벨 15 미만 봇의 둥지 규칙 3개(둥지 도형을 파밍 후보에서 제외, 둥지 반지름 + 250 안에서 밀려남, 둥지 반지름 + 900 안 소환 제외)를 한 번 삭제했다가 다시 복원. 봇 배회 방향 갱신 간격을 5~10초로 변경(botFx.wanderTime).',
  '도주 후 위협 기억(botFight.fleeMemory 5초: 후보 제외, 구역에서 밀려남, 배회 방향 보정)과 도형·크래셔 후보의 들어오는/벗어나는 거리 분리(botFx.farmIn 900 / farmOut 1200, crasherIn 700 / crasherOut 900) 추가. fleeMemory 0과 farmOut = farmIn으로 이전 동작 복귀.',
  '봇 AI 사람다운 행동 개선: 배회 속도·방향 변경(botFx.wander), 도주 방향에 옆 성분·흔들림·회전 속도 제한·가장자리 회피(botFx.flee), 조준 오차가 계속 변하고 거리·상대 가속에 비례하며 노림 지연·습관·예측 오차 추가(botFx.aim). 각 mode를 legacy로 두면 이전 동작.',
  '봇 AI 3단계: 능력치 투자 가중치를 성격 유형으로 계산(봇별 무작위 배율 제거), 클래스 선택 후 클래스 배수 추가(클래스 확률은 3:2:3:2 고정), 개발자 패널에 숙련도 표시, 테스트 도구에 buildcheck 추가.',
], 25));
add(H2('A.7 화면·UI·개발자 모드'));
add(...NUM([
  '사망 시 오토 파이어 해제(E 키는 플레이 중에만 동작).',
  '개발자 모드: 줌 x0.1까지, 둥지 바닥 색과 미니맵 둥지 원은 개발자 모드에서만, 봇 킬로그 추가(F2 연동, 크래셔·도형 사망 포함).',
  '파티클 효과 끄기(`CFG.particles`).',
  '화면 기본 배율을 1.1배로 변경(viewScale).',
  '탱크 디자인을 diep.io 캡처에 맞춤: 포신 길이·굵기, 탱크 색, 알약 모양 체력 막대(폭은 탱크 2.3r, 도형 max(44.3, 6.5 + 1.43r), 높이 7).',
  '배경 격자 간격을 24(탱크 반지름과 같음), 격자선 색을 #c5c5c5로 변경.',
  '리더보드 변경: 아이콘 방향(1위 왼쪽, 나머지 오른쪽), 아이콘이 게이지 끝에 붙어 다님, 게이지 연초록·탱크 모두 파랑, 짙은 회색 알약 트랙·알약 게이지, 글자를 아이콘 위에 표시, 게이지가 목표 길이로 부드럽게 이동(scoreboardSmooth).',
], 26));
add(H2('A.8 테스트·개발 도구'));
add(...NUM([
  '테스트 도구 tests/run.js 통합(설정형, 시드, 저장·비교, 함수별 시간).',
  '테스트 도구 정리: 시나리오마다 게임을 새로 로드, scorecheck 추가, types에 목표 전환 측정, shapes·nest·pop 수정.',
  '테스트 도구에 aicheck(봇 AI 측정)와 memorycheck 시나리오 추가.',
  'npm run check에 짧은 sanity 추가, 문서 생성기가 ../game.js를 읽고 docs/에 출력하도록 경로 수정, traitcheck에 사람다운 조준 확인([6b]) 추가.',
  '테스트 도구에 knockcheck, rulecheck, clashcheck, ttk, sanity 시나리오 추가.',
], 27));
add(H1('부록 B. 용어'));
add(...T(['용어', '설명'], [
  ['틱', `충돌 판정의 시간 단위. 1틱 = ${TICK}초(diep.io 서버 틱과 같음). 재장전도 틱 단위 표를 사용.`],
  ['포인트', '레벨업으로 얻는 능력치 투자 단위. 능력치당 최대 7.'],
  ['총알 체력(관통력)', '`Bullet Penetration` 능력치 × 4. 대상과 겹쳐 있는 동안 틱마다 줄고 0이 되면 총알이 사라짐.'],
  ['질량', '밀림 계산에 쓰는 값. 탱크·도형 = 반지름²(도형은 질량 배수 곱), 총알 = 총알 반지름² × 총알 피해 ÷ 7.'],
  ['방어값(cost, bcost)', '대상과 겹쳐 있는 동안 틱마다 총알 체력이 깎이는 양. 탱크는 Body Damage 능력치, 도형은 bcost.'],
  ['군집', '맵 곳곳에 도형이 모여 있는 소형 구역(Pentagon Nest의 작은 버전). 일정 시간이 지나면 이동.'],
  ['Pentagon Nest(둥지)', '맵 중앙의 원형 구역. 오각형과 알파 오각형이 많고 크래셔가 지킴.'],
  ['크래셔', '둥지를 지키며 가까운 탱크에게 돌진하는 분홍 삼각형.'],
  ['목표 레벨', '봇의 원래 시작 레벨. 이 레벨에 도달할 때까지 성장 가속을 받음.'],
  ['성장 가속', '목표 레벨 미만인 봇의 도형·크래셔 점수 배율에 곱하는 값(5 + 0.5 × 소환 후 초).'],
  ['sat 함수', '기회 점수를 0~1로 누르는 함수 1 − exp(−x/0.4). 도주 점수가 항상 앞서게 함.'],
  ['헤드리스 시뮬레이션', '브라우저 없이 가짜 DOM으로 game.js를 구동해 규칙과 수치를 확인하는 방식(화면이 없음).'],
], [2400, W - 2400]));

/* =================== 문서 생성 =================== */
const numCfg = [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }];
for (let k = 1; k <= 30; k++) numCfg.push({ reference: 'n' + k, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] });
const doc = new Document({
  creator: 'Claude', title: 'Tank Arena 게임 작동 원리 및 중간 점검 문서',
  styles: { default: { document: { run: { font: FONT, size: 20 } } }, paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 34, bold: true, font: FONT }, paragraph: { spacing: { before: 0, after: 200 }, outlineLevel: 0 } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, font: FONT }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
    { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, font: FONT }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
  ] },
  numbering: { config: numCfg },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Tank Arena 중간 점검 문서 · ', { size: 16, color: '808080' }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '808080' })] })] }) },
    children: out }],
});
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(DOC_OUT, buf); console.log('docx 생성 완료', buf.length, '바이트, 요소', out.length); });
