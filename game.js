'use strict';
/* ============ Config (모든 밸런스 값은 여기서 수정) ============ */
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const adiff = (a, t) => ((t - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
const turn = (a, t, r) => a + clamp(adiff(a, t), -r, r);
const BUILD_ID = 'fcbe86c'; /* 자동 생성: npm run version (이 줄을 뺀 game.js 내용 해시) */

const CFG = {
  world: 23000, grid: 24, maxLevel: 45, maxPts: 7, clashTol: 0.02, bulletHp: 4, drag: 4.5, playerR: 24, particles: false, bulletLife: 1.7, shapeGap: 4, shapeDensity: 4.1e-6, hyperAfter: 15, hyperRate: 0.10, spawnInvuln: 10, respawnMode: 'diep', recoilK: 2.7, recoilV: 480, recoilMax: 150, recoilMul: 0.5,
  // 레벨별 필요 점수 (diep.io 위키 표, 인덱스 = 레벨)
  scoreAt: [0, 0, 4, 13, 28, 50, 78, 113, 157, 211, 275, 350, 437, 538, 655, 787, 948, 1109, 1301, 1516, 1767, 2026, 2325, 2647, 3035, 3433, 3883, 4379, 4925, 5525, 6184, 6907, 7698, 8537, 9426, 10368, 11367, 12426, 13549, 14739, 16000, 17337, 18754, 20256, 21849, 23536],
  stats: [ // 값 = base + per x 포인트 (diep.io 위키 수식). regen/reload/body는 사용처에서 별도 공식을 적용
    { k: 'regen', n: 'Health Regen', c: '#e8b18f', base: 0, per: 1 },
    { k: 'maxHp', n: 'Max Health', c: '#e86fe0', base: 50, per: 20 },
    { k: 'body', n: 'Body Damage', c: '#a37be8', base: 5, per: 1 },
    { k: 'bSpeed', n: 'Bullet Speed', c: '#5b9bf0', base: 480, per: 45 },
    { k: 'pen', n: 'Bullet Penetration', c: '#f2d94e', base: 2, per: 1.5 },
    { k: 'bDmg', n: 'Bullet Damage', c: '#f06c6c', base: 7, per: 3 },
    { k: 'reload', n: 'Reload', c: '#6fe06f', base: 0, per: 1 },
    { k: 'move', n: 'Movement Speed', c: '#58e0e0', base: 230, per: 20 },
  ],
  shapes: { // 반지름은 diep.io 캔버스 자료(탱크 반지름 50 기준: 사각형·삼각형 55, 오각형 75, 알파 200, 작은 크래셔 35, 큰 크래셔 55)를 탱크 반지름 24로 환산(x0.48). 육각형은 자료가 없어 오각형의 1.5배로 추정. 체력/몸통 피해/점수는 diep.io 위키 기준. bcost = 맞은 총알의 체력이 깎이는 양(대 투사체 피해)
    square:   { n: 4, r: 26.4,  hp: 10,   xp: 10,   dmg: 8,  bcost: 8,  c: '#ffe869', w: 70 },
    triangle: { n: 3, r: 26.4,  hp: 30,   xp: 25,   dmg: 8,  bcost: 8,  c: '#fc7677', w: 25 },
    pentagon: { n: 5, r: 36,  hp: 100,  xp: 130,  dmg: 12, bcost: 12, c: '#768dfc', w: 5 },
    // 육각형: 청록색, 체력 1000/점수 1500/몸통 피해 16, 둥지 밖 일반 구역 도형의 0.2%(w=0.2004), 둥지에는 소환하지 않음(nest.hexagons=0), 총알 통과 가능, 체력 재생
    hexagon:  { n: 6, r: 54,  hp: 1000, xp: 1500, dmg: 16, bcost: 16, c: '#58d6e8', w: 0.2004, mass: 2, regen: 0.01 },
    alpha:    { n: 5, r: 96, hp: 3000, xp: 3000, dmg: 20, bcost: 20, c: '#768dfc', w: 0, name: 'alpha pentagon', mass: 4, regen: 0.01 }, // 둥지에서만 등장
  },
  // 크래셔: 둥지를 지키며 탱크를 향해 돌진 (작은 것 체력 10/점수 15, 큰 것 체력 30/점수 25)
  crashers: {
    small: { r: 16.8, hp: 10, xp: 15, dmg: 8, bcost: 8, speed: 190, range: 650, c: '#f177dd' },
    large: { r: 26.4, hp: 30, xp: 25, dmg: 8, bcost: 8, speed: 160, range: 650, c: '#f177dd' },
  },
  // 도형 군집(소형 둥지): 맵 곳곳에 도형이 모여 있는 구역. 일정 시간이 지나거나 대부분 파괴되면 다른 곳으로 옮겨감
  map: { areaPerTank: 25e6, min: 7000, max: 23000, rate: 100, smooth: 30 }, // 맵 한 변 = sqrt(전체 탱크 수 x areaPerTank), min~max 제한, 초당 rate만큼 서서히 변화
  clusters: { areaPerCluster: 33e6, maxCount: 7, rMin: 560, rMax: 720, density: 3.36e-5, refill: 1, mode: 'grow', growTime: [40, 80], startFill: [0.2, 0.9], release: 'free', attractMin: 0.3, life: 480, minGap: 2000, depleted: 0.3 }, // refill = 군집 한 곳이 도형을 다시 채우는 최대 속도(개/초, 이전 5 = 0.4초마다 2개), density = 면적당 목표 도형 수(이전 2.8e-5, 보충을 느리게 한 만큼 x1.2). 이전 동작으로 돌리려면 refill 5, density 2.8e-5 // mode 'grow' = 군집이 위치를 정한 뒤 growTime(초, 범위에서 무작위) 동안 도형을 하나씩 만들고, 만든 개수(spawned)가 목표(target)에 닿으면 더 만들지 않고 군집을 바로 없애며 도형은 일반 도형이 됨(처치로 줄어도 보충하지 않는 총 생성 예산). 'legacy' = 이전 보충 방식(refill로 계속 보충, 소진·수명 시 이동). startFill = 게임 시작 때 목표의 몇 %까지 미리 채울지(범위), release 'free' = 풀린 도형은 표류하며 흩어짐, 'zone' = 풀린 뒤에도 원래 군집 경계 안에 머묾, attractMin = 봇이 배회 목적지로 삼는 군집의 최소 채움 비율 // 반지름은 rMin~rMax 사이 무작위, 도형 수 = 면적 x density
  nest: { r: 1100, refMap: 16583, pentagons: 28, hexagons: 0, hexRespawn: 40, alphaMax: 1, alphaRespawn: 120, crasherMax: 15, largeRatio: 0.35 }, // 맵 중앙의 Pentagon Nest. r/pentagons/crasherMax는 맵 한 변이 refMap일 때의 값이고, 반지름은 맵 크기에 비례, 오각형·크래셔 수는 면적에 비례(밀도 동일), 알파는 항상 alphaMax개
  // 탱크 클래스. 배율은 기본 Tank 기준(diep.io 위키 참고). 배럴 값은 탱크 반지름(r) 배율:
  // len 길이, w 밑 너비, w2 끝 너비, off 옆 오프셋, ang 방향 회전, size 총알 크기 배율
  bots: { base: 10, perLevel: 0.2, max: 20, spawnEvery: 6, maxSpawnLevel: 14, spawnGap: 250, shapeXp: 0.25, spawnIdle: 3, catchUp: 5, catchUpRamp: 0.5 }, // catchUp/catchUpRamp: 목표 레벨(소환 규칙으로 정해진 원래 시작 레벨)에 도달할 때까지 도형·크래셔 점수 배율에 곱하는 가속 = catchUp + catchUpRamp x 소환 후 경과 초 // spawnIdle: 소환 직후 0~spawnIdle초 동안 가만히 대기(무적) // shapeXp: 봇이 도형·크래셔로 얻는 점수 배율(플레이어와 같거나 느린 성장 속도) // spawnGap: 재시작한 플레이어와 봇 사이 최소 거리 // 동시 봇 수 = min(max, base + 플레이어레벨*perLevel)
  classUpLevel: 15,
  classOrder: ['twin', 'sniper', 'machine', 'flank'],
  // 30레벨 전직: 15레벨에서 고른 클래스 -> 고를 수 있는 클래스 목록(diep.io 위키 기준, 드론·트랩·자동 포탑·Smasher 클래스는 제외). 비어 있으면 선택 타일이 없음
  classUpLevel2: 30,
  classUp30: { twin: ['triple', 'quadtank', 'twinflank'], sniper: ['assassin', 'hunter'], machine: ['destroyer', 'gunner'], flank: ['triangle', 'quadtank', 'twinflank'] },
  classes: {
    tank:    { n: 'Tank', dmg: 1, pen: 1, speed: 1, reload: 1, fov: 1, recoil: 1, barrels: [{ len: 1.9, w: 0.84 }] },
    // 두 포신이 번갈아 발사(연사 2배), 총알 피해 감소 -> 총 DPS 약 130%
    twin:    { n: 'Twin', c: '#6fc3f0', dmg: 0.65, pen: 0.9, speed: 1, reload: 1, fov: 1, alt: true, recoil: 0.25,
               barrels: [{ len: 1.9, w: 0.84, off: -0.52, size: 0.85 }, { len: 1.9, w: 0.84, off: 0.52, size: 0.85 }] },
    // 총알 속도 1.4배, 재장전 느림(23t vs 15t), 시야 넓음, 긴 포신
    sniper:  { n: 'Sniper', c: '#f2a65a', dmg: 1, pen: 1, speed: 1.4, rt: [23, 21, 19, 18, 16, 15, 14, 12], fov: 0.85, recoil: 0.25, barrels: [{ len: 2.2, w: 0.7 }] },
    // 재장전 약 2배 빠름(8t), 피해 -30%, 탄 퍼짐, 사다리꼴 포신
    machine: { n: 'Machine Gun', c: '#e8cf5c', dmg: 0.7, pen: 1, speed: 1, rt: [8, 7, 7, 6, 6, 5, 5, 4], fov: 1, spread: 0.16, recoil: 0.4,
               barrels: [{ len: 1.9, w: 0.84, w2: 1.47, size: 0.9 }] },
    // 앞 포신 + 짧은 뒤 포신 동시 발사, 피해 100%, 반동 상쇄
    flank:   { n: 'Flank Guard', c: '#7ad98a', dmg: 1, pen: 1, speed: 1, reload: 1, fov: 1, recoil: 1,
               barrels: [{ len: 1.9, w: 0.84 }, { len: 1.35, w: 0.84, ang: Math.PI }] },
    // ---- 30레벨 클래스 (par = 이전 클래스, 봇의 거리·능력치 투자 값이 없을 때 이 값을 따름). reloadMul = 재장전 배율. 수치 출처: 위키(피해·관통 배율 일부) + 추정(재장전·피해 등 DPS를 기존 클래스에 맞춤) ----
    // Triple Shot: 포신 3개(앞 + 좌우로 벌어짐) 동시 발사. 위키: 피해 4.9 = 기본의 0.7배, 관통은 Twin의 약 1.11배(0.9 -> 1.0). 재장전은 추정(1대1 결투 승률 `classduel`로 맞춤: 1.8 -> 1.0, 이전 승률 16% -> 약 48%)
    triple:  { n: 'Triple Shot', c: '#5fb5e8', par: 'twin', dmg: 0.7, pen: 1, speed: 1, reloadMul: 1, fov: 1, recoil: 0.3,
               barrels: [{ len: 1.9, w: 0.84, ang: -0.5, size: 0.85 }, { len: 1.9, w: 0.84, size: 0.85 }, { len: 1.9, w: 0.84, ang: 0.5, size: 0.85 }] },
    // Twin Flank: 앞 2 + 뒤 2, 번갈아 발사(앞뒤 반동이 상쇄). 위키: Twin보다 피해가 더 낮음(0.55는 추정, 앞쪽 지표가 기본 탱크와 비슷하도록)
    twinflank: { n: 'Twin Flank', c: '#6cd0b0', par: 'twin', dmg: 0.55, pen: 0.9, speed: 1, reloadMul: 1, fov: 1, alt: true, recoil: 0.25,
               barrels: [{ len: 1.9, w: 0.84, off: -0.52, size: 0.85 }, { len: 1.9, w: 0.84, off: -0.52, ang: Math.PI, size: 0.85 }, { len: 1.9, w: 0.84, off: 0.52, size: 0.85 }, { len: 1.9, w: 0.84, off: 0.52, ang: Math.PI, size: 0.85 }] },
    // Quad Tank: 십자 4방향 포신 동시 발사. 위키: 피해 5.25 = 기본의 0.75배, 총알 내구도 75%. 재장전 x0.5(Tank 대비 2배 빠름)는 추정(`classduel`로 맞춤, 정면 포신이 1/4뿐이라 1.0이면 승률 19%)
    quadtank: { n: 'Quad Tank', c: '#8ccf6a', par: 'flank', dmg: 0.75, pen: 0.75, speed: 1, reloadMul: 0.5, fov: 1, recoil: 1,
               barrels: [{ len: 1.9, w: 0.84 }, { len: 1.9, w: 0.84, ang: Math.PI / 2 }, { len: 1.9, w: 0.84, ang: Math.PI }, { len: 1.9, w: 0.84, ang: -Math.PI / 2 }] },
    // Tri-Angle: 앞 포신 1개(보통 총알) + 뒤쪽 양옆으로 벌어진 포신 2개. 위키: 뒤 포신 총알은 위력 20%, 수명은 약 절반(1.5초). 뒤 포신의 각도·길이·너비와 관통 배율은 **추정**(뒤 포신 반동이 몸을 앞으로 밀어 줌). 포신별 dmg/pen/life = 그 포신 총알의 피해·관통·수명 배율
    triangle: { n: 'Tri-Angle', c: '#5cc9a7', par: 'flank', dmg: 1, pen: 1, speed: 1, reloadMul: 1, fov: 1, recoil: 1,
               barrels: [{ len: 1.9, w: 0.84 }, { len: 1.6, w: 0.7, ang: Math.PI - 0.5, dmg: 0.2, life: 0.5 }, { len: 1.6, w: 0.7, ang: Math.PI + 0.5, dmg: 0.2, life: 0.5 }] },
    // Assassin: 더 긴 포신의 저격형. 위키: 총알 속도 기본의 1.5배, 재장전 30틱(포인트마다 -2, -2, -3, -2, -1, -2, -2틱), 시야 넓음. 피해 1.25(`classduel`로 맞춤, 1.0이면 승률 약 40%), 한 발 상한 배율 rangeMax 0.8(최대 피해를 다른 클래스와 비슷하게), 관통 1.0, 시야 0.75, 반동은 Sniper와 같게 둔 **추정**
    assassin: { n: 'Assassin', c: '#e08a4a', par: 'sniper', dmg: 1.25, pen: 1, speed: 1.5, rt: [30, 28, 26, 23, 21, 20, 18, 16], fov: 0.75, recoil: 0.25, rangeMax: 0.8, barrels: [{ len: 2.5, w: 0.7 }] },
    // Hunter: 길고 가는 포신 + 짧고 굵은 포신이 겹쳐 동시 발사. 위키: 피해 5.25 = 기본의 0.75배(Sniper보다 -25%), 총알 속도 1.4배, 재장전 38틱. 재장전 표는 Sniper 표 x 38/23을 반올림한 **추정**
    hunter:  { n: 'Hunter', c: '#f0c070', par: 'sniper', dmg: 0.75, pen: 1, speed: 1.4, rt: [38, 35, 31, 30, 26, 25, 23, 20], fov: 0.85, recoil: 0.25, barrels: [{ len: 2.2, w: 0.6, size: 0.75 }, { len: 1.7, w: 0.95 }] },
    // Destroyer: 크고 느린 총알(크기 2배, 속도 0.7배), 높은 피해(위키: Annihilator가 21 = 3배이고 Destroyer와 같음), 매우 느린 재장전(Tank x2.6 = 39틱, 추정: x4(60틱)이면 `classduel` 승률 약 30%), 반동 큼(추정), rangeMin 0.4, rangeMax 0.33 = 한 발의 하한·상한을 다른 클래스(최대 약 110)와 비슷하게(추정)
    destroyer: { n: 'Destroyer', c: '#d4a63c', par: 'machine', dmg: 3, pen: 1, speed: 0.7, reloadMul: 2.6, fov: 1, recoil: 2.5, rangeMin: 0.4, rangeMax: 0.33, barrels: [{ len: 1.9, w: 1.3, size: 2 }] },
    // Gunner: 작은 포신 4개가 번갈아 아주 빠르게 발사하는 약한 총알(위키: 작고 약한 총알, 재장전 크게 증가). 피해 0.2, 재장전 Machine Gun 표 x1.15, 퍼짐은 **추정**(정면 지표를 Machine Gun의 약 1.1배로 맞춤)
    gunner:  { n: 'Gunner', c: '#f0e08a', par: 'machine', dmg: 0.2, pen: 1, speed: 1, reloadMul: 1.15, rt: [8, 7, 7, 6, 6, 5, 5, 4], fov: 1, alt: true, spread: 0.14, recoil: 0.4,
               barrels: [{ len: 1.9, w: 0.42, off: -0.75, size: 0.55 }, { len: 1.9, w: 0.42, off: 0.25, size: 0.55 }, { len: 1.9, w: 0.42, off: -0.25, size: 0.55 }, { len: 1.9, w: 0.42, off: 0.75, size: 0.55 }] },
  },
};

// ---- 봇 성격 (1단계: 수치를 기존 상수에 연결) ----
// b 대담함(신중·도주 ↔ 대담·투쟁), g 목표지향(도형 파밍 ↔ 탱크 사냥), p 끈기, r 복수심, w 소환 가중치(모두 1 = 균등). 숙련도는 유형과 무관하게 botSkill 범위에서 봇마다 뽑음.
CFG.botTypes = [
  { n: '안전농부', b: 0.2, g: 0.15, p: 0.3, r: 0.2, w: 1 },
  { n: '겁없는농부', b: 0.85, g: 0.2, p: 0.4, r: 0.3, w: 1 },
  { n: '저격형', b: 0.25, g: 0.8, p: 0.3, r: 0.4, w: 1 },
  { n: '돌격형', b: 0.85, g: 0.85, p: 0.8, r: 0.5, w: 1 },
  { n: '복수자', b: 0.5, g: 0.5, p: 0.6, r: 0.95, w: 1 },
  { n: '추격자', b: 0.6, g: 0.7, p: 0.95, r: 0.4, w: 1 },
  { n: '균형형', b: 0.5, g: 0.5, p: 0.5, r: 0.5, w: 1 },
];
CFG.botSkill = [0.85, 1.0];
// 값 = [a, k] -> a + k x 수치. fleeHp: 체력 비율, fearGap: 레벨 차이, sight: 시야 배율, chaseT/grudgeT: 초
CFG.botFx = { fleeHp: [0.55, -0.40], fearGap: [2, 16], sight: [0.7, 0.6], chaseT: [2, 8], grudgeT: [3, 12], grudgeRange: 1.5, aimErr: 0.1,
  // 2단계(점수제): scoreScale 기회 점수 포화 상수, crashUrg 가까운 크래셔 가중, easeDiv 쉬운 사냥감 보정, fleeBase 도주 기본 점수(항상 기회 점수 1 미만보다 우선), fleeRelease* 도주 해제 여유, stay* 현재 목표 유지 보너스 = stayBase + stayK x 끈기, hold* 최소 유지 시간(초) = holdBase + holdK x 끈기, grudgeW 복수 가중 = 1 + grudgeW x 복수심, hunt/farmSense 대상이 없을 때 배회 방향을 정할 때 감지하는 거리
  scoreScale: 0.4, crashUrg: 3, easeDiv: 2, fleeBase: 1, fleeReleaseGap: 1, fleeReleaseHp: 0.2, stayBase: 1.2, stayK: 0.6, holdBase: 1, holdK: 2, grudgeW: 3, huntSense: 3500, farmSense: 3500, wanderTime: [5, 10], farmIn: 900, farmOut: 1200, crasherIn: 700, crasherOut: 900 }; // wanderTime: 대상이 없을 때 배회 방향을 새로 뽑는 간격(초) 범위. farmIn/farmOut: 도형 후보에 새로 들어오는 거리 / 지금 노리는 목표를 유지하는 최대 거리(px), crasherIn/crasherOut: 크래셔 (두 값을 같게 하면 이전과 같음. 후보가 범위 경계에서 들락날락해 파밍과 배회를 오가는 떨림을 줄임)
// 3단계: 능력치 투자 가중치 = 기본 가중치 x (성격 편향 배수) x (클래스 배수), 0.6~1.6배로 제한. up/dn: 편향이 +/-일 때의 최대 변화폭, cls: 클래스를 고른 뒤 올리는 능력치
CFG.botBuild = { up: 0.6, dn: 0.4, lo: 0.6, hi: 1.6, cls: { twin: { reload: 1.3, bDmg: 1.2 }, sniper: { bSpeed: 1.4, pen: 1.3, bDmg: 1.2 }, machine: { reload: 1.4, bDmg: 1.3, maxHp: 1.2 }, flank: { move: 1.3, maxHp: 1.3, body: 1.3 } } };
// 총알의 밀림·꺾임(질량 모델): bulletPush 대상이 밀리는 강도, bulletDeflect 총알이 꺾이는 강도, bulletPushCap 한 프레임에 더해지는 속도 상한(px/초), bulletBaseDmg 총알 질량의 기준 피해(피해가 클수록 질량이 큼)
CFG.bulletPush = 0.5; CFG.bulletDeflect = 0.5; CFG.bulletPushCap = 150; CFG.bulletBaseDmg = 7;
CFG.pushTank = 0.5; CFG.pushShape = 1; CFG.pushBullet = 0.2; CFG.bulletMinSpeed = 0.7; // 밀림 대상별 배율(bulletPush에 곱함): pushTank = 탱크·크래셔, pushShape = 도형, pushBullet = 총알(총알끼리 충돌). bulletMinSpeed = 총알끼리 충돌 뒤에도 유지하는 최소 속도(처음 속도의 비율, 0이면 하한 없음). 모두 1, 1, 1, 0으로 두면 이전과 같음
CFG.bulletClashKeepDir = true; // 총알끼리 충돌 뒤에도 각 총알의 진행 방향을 충돌 전 방향으로 유지(true). 속도는 밀림으로 줄 수 있고 처음 속도의 bulletMinSpeed~100%로 제한. false면 이전처럼 꺾임·밀림으로 방향이 바뀔 수 있음
CFG.bulletClashMode = 'mass'; // 총알끼리 충돌 방식: 'mass' = 탱크·도형과 같은 접촉 틱 교환 + 질량 모델(밀림·꺾임), 'instant' = 이전 방식(내구도 비교로 한 번에 승패를 정함, clashTol 사용)
CFG.bulletSpeedMul = 0.7; CFG.bulletSizeMul = 1.3; // 총알 기본 속도·크기 배율(diep.io는 클래스마다 총알 속도·크기를 배율로 정함. 예: Destroyer는 속도 0.7배, 크기 2배). 속도 배율은 능력치 포인트로 늘어난 속도까지 포함한 전체에 곱함. 사거리 = 속도 x 지속시간이라 속도 배율만큼 줄어듦
CFG.viewScale = 1.1; // 화면 기본 배율(이전 기본 = 1.0): 클수록 화면이 확대됨(보이는 범위는 1 ÷ 값). 개발자 휠 줌은 이 값에 곱해짐
// 봇의 싸움·도주 판단(전투 우위 R). mode: 'power' = R 방식, 'legacy' = 이전 방식(레벨 차이·체력 비율). R = (내 체력% x 내 공격력) / (상대 체력% x 상대 공격력). 체력% = 체력 막대에 보이는 비율(상대는 다친 경우만 보이고 가득 차면 100%, 최대 체력의 크기는 보지 않음), 공격력 = (1 + (레벨-1)/offBase)^offPow(레벨로만 추정).
// 싸움 기준 = thrMul x (needBase - needBold x 대담함). R이 기준 이상이면 싸움, 아니면 도주(경계 구간 없음). 복수 대상은 기준 x grudgeNeed. 정한 판단은 fightHold/fleeHold초 동안 유지하고 그 뒤에는 기준의 +/-hyst 여유를 둠. breakRatio > 0이면 싸우는 중 R이 기준 x breakRatio 밑으로 떨어질 때 유지 시간을 무시(0 = 꺼짐). 쉬움 보정 = clamp(R / (easeDiv x 기준), easeMin, easeMax)
CFG.botFight = { mode: 'power', offBase: 14, offPow: 3, needBase: 1.6, needBold: 1.25, thrMul: 0.85, hyst: 0.15, fightHold: 2, fleeHold: 2, grudgeNeed: 0.7, easeDiv: 1.5, easeMin: 0.4, easeMax: 1.5, breakRatio: 0, fleeMemory: 5, threatMul: 1, threatPush: 1.2 };
// 도주 후 위협 기억: 도주한 상대의 마지막 위치를 fleeMemory초 동안 기억(0 = 끔). 그 위치에서 (교전 시야 x threatMul) 안의 도형·크래셔(450px 안의 크래셔는 제외)는 파밍 후보에서 빼고, 파밍·배회 중에 그 구역 안이면 바깥으로 최대 threatPush 세기로 밀려나며(속도 0.7 이상), 배회 방향이 위협 쪽이면 반대로 돌림
// 사람다운 움직임·조준 (봇 AI 개선). 각 mode를 'legacy'로 두면 이전 동작.
// wander(대상이 없을 때 배회): 속도 = spdBase + spdK x 목표지향, 방향은 새 방향으로 turnRate(라디안/초)만큼만 서서히 돌고 wobble(라디안)만큼 느리게 흔들림
CFG.botFx.wander = { mode: 'natural', spdBase: 0.55, spdK: 0.3, turnRate: 0.8, wobble: 0.25 };
// flee(도주): 도주 방향 = (적 반대) + 옆 방향 x (sideK x 가까움 + wobble 흔들림), 옆 방향은 sideT초(범위)마다 바뀌며 sideRate(1/초)로 부드럽게 전환, 실제 방향은 turnRate(라디안/초)만큼만 돎. 앞쪽 lookAhead(px)가 맵 가장자리 edgeMargin 안이면 중앙 쪽으로 edgePush만큼 틀음
CFG.botFx.flee = { mode: 'natural', sideK: 0.5, wobble: 0.3, sideT: [0.6, 1.4], sideRate: 2.5, turnRate: 4, lookAhead: 500, edgeMargin: 250, edgePush: 1 };
// aim(조준): 오차 최대 E = e0 x (1 - 숙련도) + ed x (거리 / 사거리) + ev x (상대 가속 / accRef), 오차 각도는 drift초마다 새 목표로 부드럽게 이동, 봇마다 습관 배율 habit[0] + habit[1] x 습관, 예측 시간 배율은 1 +/- leadErr(봇마다 고정), 새 탱크를 노리면 숙련도에 따라 lockMax~lockMin초 동안 회전 속도가 lockSlow배
CFG.botFx.aim = { mode: 'human', e0: 0.1, ed: 0.06, ev: 0.05, accRef: 1000, drift: 0.3, habit: [0.7, 0.6], leadErr: 0.1, lockMax: 0.35, lockMin: 0.15, lockSlow: 0.35 };
// 몸통 충돌 물리: 탱크가 도형과 부딪힐 때 계산에 쓰는 도형의 질량 = r x r x mass x shapeMass[도형 종류]. 값이 작을수록 도형이 가벼워 탱크가 덜 멈추고 도형이 더 쉽게 밀림(1 = 이전과 같음, 적은 종류는 1). mode 'legacy'는 shapeMass를 쓰지 않음(이전 동작). 탱크끼리·크래셔와의 충돌, 도형끼리의 충돌, 총알 밀림은 영향 없음
CFG.bodyPhys = { mode: 'tuned', shapeMass: { square: 0.35, triangle: 0.35, pentagon: 0.35 } };
// 총알 한 발이 한 대상(탱크)에 주는 총 피해의 범위: 하한 Dmin = Dt x tMin x (클래스 rangeMin), 상한 Dmax = Dt x (tMaxA + tMaxB x P) x (클래스 rangeMax). Dt = 틱당 피해(Bullet Damage 포인트 x 클래스 피해 배율), P = 총알 체력 / bulletHp(Penetration 포인트 x 클래스 관통 배율). 실제 총 피해 = 접촉 틱 교환으로 계산한 누적 피해를 Dmin~Dmax로 제한(하한은 처음 닿는 프레임에 바로 줌, 상한에 닿으면 그 대상에게는 더 주지 않고 총알은 계속 진행). target 'tank' = 탱크가 맞는 경우만(도형·크래셔는 이전과 같음), 'all' = 도형·크래셔 포함. mode 'legacy'는 범위 제한 없음(이전 동작)
CFG.bulletRange = { mode: 'range', target: 'tank', tMin: 1.5, tMaxA: 0.8, tMaxB: 0.25 };
CFG.scoreboardSmooth = 6; // 리더보드 게이지가 목표 길이로 따라가는 속도(1/초, 클수록 빠름, 0이면 즉시). 6이면 약 0.5초에 95% 도달
const tierOf = k => k === 'tank' ? 1 : CFG.classOrder.includes(k) ? 2 : 3; // 클래스 단계: 1 = Tank, 2 = 15레벨 클래스, 3 = 30레벨 클래스
const classChoices = (cls, level) => cls === 'tank' ? (level >= CFG.classUpLevel ? CFG.classOrder : []) : tierOf(cls) === 2 && level >= CFG.classUpLevel2 ? (CFG.classUp30[cls] || []) : []; // 지금 고를 수 있는 클래스 목록(플레이어와 봇 공통)
const TICK = 0.04; // diep.io 서버 틱(1틱 = 0.04초)
const TANK_RT = [15, 14, 13, 12, 11, 10, 9, 8]; // 기본 Tank 재장전(틱): 포인트당 -1틱. Sniper/Machine Gun은 클래스의 rt 표 사용
const lvPow = L => Math.pow(1.01, L - 1); // 레벨당 탱크·총알 크기 +1% (속도는 반대로 감소)
const pointsFor = L => L <= 28 ? L - 1 : L === 29 ? 27 : 28 + Math.floor((L - 30) / 3); // 레벨 L까지 누적 능력치 포인트 (45레벨 = 33)
const respawnLevel = L => CFG.respawnMode === 'diep' ? (L <= 11 ? Math.max(1, L - 1) : L <= 15 ? 12 : L < 30 ? Math.max(12, L >> 1) : L >> 1) : 1; // 사망 후 재시작 레벨 ('reset': 항상 1레벨, 'diep': diep.io 규칙)
const MAP = { lo: 0, hi: 0, size: 0 }; // 현재 플레이 가능한 정사각형 영역 (좌표 공간 중앙 기준)
const NEST = { r: CFG.nest.r }; // 현재 Pentagon Nest 반지름: 맵 크기에 비례
const setMapSize = size => { MAP.size = size; MAP.lo = CFG.world / 2 - size / 2; MAP.hi = CFG.world / 2 + size / 2; NEST.r = CFG.nest.r * size / CFG.nest.refMap; };
const nestArea = () => (NEST.r / CFG.nest.r) ** 2; // 기준 대비 둥지 면적 비 (개수에 곱해 밀도를 동일하게 유지)
const nestPent = () => Math.round(CFG.nest.pentagons * nestArea());
const nestCrash = () => Math.round(CFG.nest.crasherMax * nestArea());
const mapTarget = n => clamp(Math.sqrt(n * CFG.map.areaPerTank), CFG.map.min, CFG.map.max); // 전체 탱크 수 n에 맞는 맵 크기 (탱크 1대당 면적 일정)
const inNest = (x, y, m = 0) => Math.hypot(x - CFG.world / 2, y - CFG.world / 2) < NEST.r + m;

/* ============ 유틸 / 그리기 헬퍼 ============ */
const TANK_BLUE = ['#4fafdc', '#3983a4'], TANK_RED = ['#df5759', '#a64141']; // 탱크 몸통 색(채움, 윤곽). 파랑은 diep.io 캡처 측정값, 빨강은 같은 색 체계의 추정값
function shade(h, f) { const n = parseInt(h.slice(1), 16); const c = i => clamp(Math.round(((n >> i) & 255) * f), 0, 255); return `rgb(${c(16)},${c(8)},${c(0)})`; }
for (const t of [...Object.values(CFG.shapes), ...Object.values(CFG.crashers)]) t.o = shade(t.c, 0.78);

function touch(a, b) { const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r; return dx * dx + dy * dy < rr * rr; }
function collide(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr || d2 === 0) return null;
  const d = Math.sqrt(d2); return { nx: dx / d, ny: dy / d, pen: rr - d };
}
function poly(ctx, x, y, r, n, a, fill, stroke) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) { const t = a + i * TAU / n, px = x + Math.cos(t) * r, py = y + Math.sin(t) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke(); }
}
function disc(ctx, x, y, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 3; ctx.stroke(); }
}
const DEF_BARRELS = [{ len: 1.9, w: 0.84 }]; // diep.io 캡처 측정: 탱크 반지름 r 기준 길이 1.9, 굵기 0.84
function drawBarrels(ctx, x, y, r, ang, barrels, kicks, lw) {
  for (let i = 0; i < barrels.length; i++) {
    const b = barrels[i], len = b.len * r - (kicks[i] || 0), w1 = b.w * r / 2, w2 = (b.w2 || b.w) * r / 2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang + (b.ang || 0)); ctx.translate(0, (b.off || 0) * r);
    ctx.beginPath(); ctx.moveTo(0, -w1); ctx.lineTo(len, -w2); ctx.lineTo(len, w2); ctx.lineTo(0, w1); ctx.closePath();
    ctx.fillStyle = '#999'; ctx.fill(); ctx.strokeStyle = '#727272'; ctx.lineWidth = lw || 3; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  }
}
function drawTank(ctx, e, body, out, gun) {
  if (gun) drawBarrels(ctx, e.x, e.y, e.r, e.angle, e.barrels || DEF_BARRELS, e.kicks || [e.kick]);
  disc(ctx, e.x, e.y, e.r, body, out);
  if (e.flash > 0) disc(ctx, e.x, e.y, e.r, `rgba(255,60,60,${Math.min(0.5, e.flash * 4)})`);
}
function pill(ctx, x, y, w, h, fill) { // 양 끝이 둥근 막대
  const r = h / 2; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function hpbar(ctx, e) { // diep.io 캡처 측정(1레벨 탱크 r=24 기준, 1px = 0.49 단위): 높이는 모든 대상이 7로 같고, 폭은 탱크·크래셔 2.3r, 도형은 max(44.3, 6.5 + 1.43r)
  const tankLike = !!e.up || e instanceof Crasher, h = 7, ins = 1.5, w = tankLike ? e.r * 2.3 : Math.max(44.3, 6.5 + e.r * 1.43);
  const x = e.x - w / 2, y = e.y + (tankLike ? e.r * 1.5 + 1.5 : e.r + 5); // 탱크는 몸통 아래 0.5r, 도형은 외접원 아래 약 3.5
  pill(ctx, x, y, w, h, '#555555');
  pill(ctx, x + ins, y + ins, Math.max(h - 2 * ins, (w - 2 * ins) * clamp(e.hp / e.maxHp, 0, 1)), h - 2 * ins, '#9be188');
}
function label(ctx, t, x, y, size, align) {
  ctx.font = `bold ${size}px Ubuntu,"Trebuchet MS",sans-serif`; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(t, x, y); ctx.fillStyle = '#fff'; ctx.fillText(t, x, y);
}

const ANIMALS = ['Aardvark', 'Albatross', 'Alpaca', 'Badger', 'Bat', 'Bear', 'Beaver', 'Bison', 'Buffalo', 'Camel', 'Capybara', 'Cheetah', 'Cobra', 'Cougar', 'Coyote', 'Crane', 'Crocodile', 'Dingo', 'Dolphin', 'Eagle', 'Elephant', 'Falcon', 'Ferret', 'Flamingo', 'Fox', 'Gazelle', 'Gecko', 'Giraffe', 'Gorilla', 'Hamster', 'Hedgehog', 'Heron', 'Hippo', 'Hyena', 'Ibis', 'Iguana', 'Jackal', 'Jaguar', 'Kangaroo', 'Koala', 'Lemur', 'Leopard', 'Lion', 'Lynx', 'Meerkat', 'Moose', 'Narwhal', 'Ocelot', 'Octopus', 'Otter', 'Owl', 'Panda', 'Panther', 'Parrot', 'Pelican', 'Penguin', 'Puma', 'Raccoon', 'Raven', 'Rhino', 'Seal', 'Shark', 'Sloth', 'Tiger', 'Toucan', 'Turtle', 'Walrus', 'Weasel', 'Wolf', 'Wombat', 'Yak', 'Zebra'];
const fmt = n => n < 1000 ? String(Math.floor(n)) : n < 1e6 ? (n / 1000).toFixed(1) + 'k' : (n / 1e6).toFixed(2) + 'm';

/* ============ Input ============ */
class Input {
  constructor(cv) {
    this.keys = {}; this.mx = 0; this.my = 0; this.down = false; this.auto = false;
    addEventListener('keydown', e => { // e.code 사용: 한글 IME 상태에서도 WASD 동작
      if (e.target && e.target.tagName === 'INPUT') return; // 닉네임 입력 중에는 게임 키 무시
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F2'].includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        if (e.code === 'KeyE' && game.state === 'play') this.auto = !this.auto; // 플레이 중에만 오토파이어 토글
        if (e.code === 'F2' && game.dev) game.devPanel = !game.devPanel; // 개발자 정보 패널 켜기/끄기
        if (e.code === 'Backslash') game.devLevelUp(); // 개발자용: \ 키로 1레벨 상승
        const m = /^Digit([1-8])$/.exec(e.code); if (m) game.upgrade(+m[1] - 1);
      }
      this.keys[e.code] = true;
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; this.down = false; });
    cv.addEventListener('mousemove', e => { this.mx = e.clientX; this.my = e.clientY; });
    cv.addEventListener('mousedown', e => { this.mx = e.clientX; this.my = e.clientY; if (!game.ui.click(e.clientX, e.clientY)) this.down = true; });
    addEventListener('mouseup', () => { this.down = false; });
    cv.addEventListener('wheel', e => { if (!game.dev) return; e.preventDefault(); game.cam.zoomMul = clamp(game.cam.zoomMul * (e.deltaY > 0 ? 0.9 : 1.1), 0.1, 3); }, { passive: false }); // 개발자 모드: 휠로 시야 확대/축소
  }
  get fire() { return this.down || this.auto || this.keys.Space; }
  axis() {
    const k = this.keys;
    let x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    let y = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
    const l = Math.hypot(x, y); if (l) { x /= l; y /= l; } return [x, y];
  }
}

/* ============ Camera (월드 <-> 화면 좌표 분리) ============ */
class Camera {
  constructor() { this.x = this.y = 0; this.w = 800; this.h = 600; this.zoom = 1; this.zoomMul = 1; this.baseZoom = 1; } // baseZoom: 개발자 줌을 뺀 평소 시야의 줌 // zoomMul: 개발자 모드 휠 줌 배율
  follow(t, dt, level, fov, smooth) {
    if (smooth) { const k = 1 - Math.exp(-smooth * dt); this.x += (t.x - this.x) * k; this.y += (t.y - this.y) * k; } else { this.x = t.x; this.y = t.y; } // smooth: 관전 시 부드럽게 따라감
    this.baseZoom = (1 - 0.0065 * (level - 1)) * (fov || 1) * CFG.viewScale; const target = this.baseZoom * this.zoomMul; this.zoom += (target - this.zoom) * Math.min(1, 3 * dt);
  }
  wx(sx) { return this.x + (sx - this.w / 2) / this.zoom; }
  wy(sy) { return this.y + (sy - this.h / 2) / this.zoom; }
  apply(ctx) { ctx.translate(this.w / 2, this.h / 2); ctx.scale(this.zoom, this.zoom); ctx.translate(-this.x, -this.y); }
  visibleBase(x, y, r) { const z = this.baseZoom; return Math.abs(x - this.x) < this.w / 2 / z + r && Math.abs(y - this.y) < this.h / 2 / z + r; } // 소환용 화면 판정: 개발자 줌과 무관하게 평소 플레이어 시야 기준
  visible(x, y, r) { return Math.abs(x - this.x) < this.w / 2 / this.zoom + r && Math.abs(y - this.y) < this.h / 2 / this.zoom + r; }
}

/* ============ Particles ============ */
class Particles {
  constructor() { this.a = []; }
  burst(x, y, col, n, sp) {
    if (!CFG.particles) return; // 파티클 효과 꺼짐 (diep.io에는 없음). 켜려면 CFG.particles = true
    for (let i = 0; i < n; i++) {
      if (this.a.length > 400) this.a.shift();
      const t = rand(0, TAU), v = rand(sp * 0.3, sp);
      this.a.push({ x, y, vx: Math.cos(t) * v, vy: Math.sin(t) * v, l: rand(0.35, 0.8), r: rand(2, 5), c: col });
    }
  }
  update(dt) {
    let j = 0; const f = Math.exp(-3 * dt);
    for (const p of this.a) { p.l -= dt; if (p.l > 0) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= f; p.vy *= f; this.a[j++] = p; } }
    this.a.length = j;
  }
  draw(ctx, cam) {
    for (const p of this.a) { if (!cam.visible(p.x, p.y, 10)) continue; ctx.globalAlpha = clamp(p.l * 2, 0, 1); disc(ctx, p.x, p.y, p.r, p.c); }
    ctx.globalAlpha = 1;
  }
}

/* ============ Player ============ */
class Player {
  constructor() {
    this.x = this.y = CFG.world / 2; this.vx = this.vy = 0; this.angle = 0; this.kick = 0; this.flash = 0;
    this.level = 1; this.score = 0; this.pts = 0; this.alive = true; this.cool = 0; this.sinceHit = 9; this.lastHit = null; this.invT = 0; this.kills = 0; this.born = 0; this.recX = 0; this.recY = 0; this.bufX = 0; this.bufY = 0; this.col = TANK_BLUE[0]; this.out = TANK_BLUE[1]; this.name = 'Unnamed tank';
    this.up = {}; for (const s of CFG.stats) this.up[s.k] = 0;
    this.maxHp = 0; this.hp = 0; this.setClass('tank'); this.hp = this.maxHp;
  }
  recalc() {
    const s = {}, u = this.up; for (const st of CFG.stats) s[st.k] = st.base + st.per * u[st.k];
    const L = this.level, lp = lvPow(L), d = this.def; // diep.io: 레벨당 크기·총알 크기 +1%, 기본 속도는 그만큼 감소
    this.s = s; this.r = CFG.playerR * lp; this.speedMul = 1 / lp; this.fov = d.fov || 1;
    const rt = d.rt || TANK_RT, ru = u.reload; this.reloadT = (ru < rt.length ? rt[ru] : Math.max(1, rt[rt.length - 1] - (ru - rt.length + 1) * 0.5)) * TICK * (d.reloadMul || 1); // 클래스별 재장전(틱) 표 (표를 넘으면 포인트당 0.5틱씩 추가 감소, 최소 1틱)
    this.spec = { bSpeed: s.bSpeed * d.speed * CFG.bulletSpeedMul, dmg: s.bDmg * d.dmg, pen: s.pen * CFG.bulletHp * d.pen, size: 8 * lp * CFG.bulletSizeMul, life: 1.9 * CFG.bulletLife, spread: d.spread || 0 }; // pen = 총알 체력(x4), 크기는 레벨에만 비례
    const ratio = this.maxHp ? this.hp / this.maxHp : 1; this.maxHp = s.maxHp + (L - 1) * 2; this.hp = ratio * this.maxHp;
  }
  setClass(k) {
    this.cls = k; this.def = CFG.classes[k]; this.barrels = this.def.barrels; this.kicks = this.barrels.map(() => 0); this.bi = 0; this.cool = 0; this.recalc();
  }
  upgrade(i) {
    const k = CFG.stats[i].k, dev = this === game.player && game.dev; // 개발자: 포인트 소모 없음, 능력치 한도 없음
    if (dev || (this.pts > 0 && this.up[k] < CFG.maxPts)) { this.up[k]++; if (!dev) this.pts--; this.recalc(); }
  }
  addXp(v) { // 점수 기반 레벨 (diep.io 점수표), 포인트는 33점 규칙
    this.score += v;
    while (this.level < CFG.maxLevel && this.score >= CFG.scoreAt[this.level + 1]) { this.level++; this.pts += pointsFor(this.level) - pointsFor(this.level - 1); this.recalc(); }
  }
  setLevel(L) { this.level = L; this.score = CFG.scoreAt[L]; this.pts = pointsFor(L); this.recalc(); this.hp = this.maxHp; } // 재시작: 해당 레벨의 최소 점수, 포인트는 미사용 상태
  hurt(d, by) { if (this.invT > 0) return; /* 스폰 무적: 피해를 받지 않음 */ this.hp -= d; this.sinceHit = 0; this.flash = 0.12; if (by) this.lastHit = by; if (this.hp <= 0 && this.alive) game.die(); }
  move(dt, inp) {
    const [ax, ay] = inp.axis(), s = this.s, W = CFG.world;
    const mv = s.move * this.speedMul; this.vx += ax * mv * CFG.drag * dt; this.vy += ay * mv * CFG.drag * dt; // 최종 속도 ≈ 이동속도 x 레벨 보정
    const f = Math.exp(-CFG.drag * dt); this.vx *= f; this.vy *= f;
    const k1 = 1 - Math.exp(-dt / 0.04), k2 = 1 - Math.exp(-dt / 0.07); // 반동은 두 단계 지연을 거쳐 부드럽게 전달 (총 이동 거리 동일, 프레임레이트 무관)
    const mx = this.recX * k1, my = this.recY * k1; this.recX -= mx; this.recY -= my; this.bufX += mx; this.bufY += my;
    const ux = this.bufX * k2, uy = this.bufY * k2; this.bufX -= ux; this.bufY -= uy; this.vx += ux; this.vy += uy;
    const spd = Math.hypot(this.vx, this.vy); if (spd > 1500) { this.vx *= 1500 / spd; this.vy *= 1500 / spd; } // 극단적 빌드의 반동 폭주 방지
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.x < MAP.lo + this.r) { this.x = MAP.lo + this.r; this.vx = Math.max(0, this.vx); } if (this.x > MAP.hi - this.r) { this.x = MAP.hi - this.r; this.vx = Math.min(0, this.vx); }
    if (this.y < MAP.lo + this.r) { this.y = MAP.lo + this.r; this.vy = Math.max(0, this.vy); } if (this.y > MAP.hi - this.r) { this.y = MAP.hi - this.r; this.vy = Math.min(0, this.vy); }
    this.flash = Math.max(0, this.flash - dt); for (let i = 0; i < this.kicks.length; i++) this.kicks[i] = Math.max(0, this.kicks[i] - 70 * dt);
    this.sinceHit += dt;
    if (this.hp < this.maxHp) { // 체력 회복은 맞은 직후에도 항상 작동: 초당 최대체력 비율 = (0.03 + 0.12 x 포인트) / 30. 무피격이 hyperAfter초를 넘으면 급속 회복
      const rate = this.sinceHit > CFG.hyperAfter ? CFG.hyperRate : (0.03 + 0.12 * s.regen) / 30;
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * rate * dt);
    }
  }
  aim(inp, cam) { this.angle = Math.atan2(cam.wy(inp.my) - this.y, cam.wx(inp.mx) - this.x); }
  shoot(dt, inp, g) {
    this.cool -= dt;
    if (inp.fire && this.cool <= 0) {
      const n = this.barrels.length, R = this.reloadT;
      const fireOne = i => { // 운동량 보존: 반동 속도 = (총알 질량 x 총알 속도) / 탱크 질량, 질량 ~ 반지름^2, 방향은 실제 발사 방향(탄 퍼짐 포함)의 반대
        const sp = this.spec, a = g.shoot(this, sp, this.barrels[i], i), m = sp.size / CFG.bulletSizeMul / this.r; // 반동은 총알 기본 크기·속도 배율(bulletSizeMul, bulletSpeedMul)의 영향을 받지 않음(diep.io에서 반동은 클래스별 숨은 배율)
        const lm = CFG.recoilMul; // 반동은 모든 레벨에서 50%(레벨 보정 없음)
        const dv = Math.min(CFG.recoilMax, CFG.recoilK * lm * (this.def.recoil != null ? this.def.recoil : 1) * m * m * Math.sqrt(sp.bSpeed / CFG.bulletSpeedMul * CFG.recoilV)); // 속도 영향은 제곱근으로 완화(저점/고점 폭 축소), 한 발 상한 있음
        this.recX -= Math.cos(a) * dv; this.recY -= Math.sin(a) * dv;
        this.kicks[i] = this.r * clamp(0.12 + 0.2 * dv / 144, 0.1, 0.35); // 반동이 클수록 포신이 더 많이 움찔함
      };
      if (this.def.alt) { fireOne(this.bi); this.bi = (this.bi + 1) % n; this.cool = R / n; } // Twin: 번갈아 발사
      else { for (let i = 0; i < n; i++) fireOne(i); this.cool = R; }
    }
  }
}

/* ============ Bot (플레이어와 같은 스펙/성장 시스템을 쓰는 AI 탱크) ============ */
const BOT_DIST = { tank: [340, 260], twin: [320, 250], sniper: [520, 420], machine: [230, 170], flank: [320, 250], assassin: [620, 480], destroyer: [380, 280], gunner: [260, 190] }; /* 값이 없는 30레벨 클래스는 이전 클래스(par)의 값을 따름 */ // [탱크 상대, 도형 파밍] 선호 거리
const BOT_BUILD = { reload: 3, bDmg: 3, pen: 2.5, bSpeed: 1.5, maxHp: 2, move: 1.5, body: 1, regen: 1 }; // 능력치 투자 기본 가중치(성격 유형과 클래스로 0.6~1.6배 편향)
const BOT_CLASS_W = { twin: 3, sniper: 2, machine: 3, flank: 2 }; /* 30레벨 클래스는 목록에서 균등하게 고름 */ // 클래스 선택 확률 3:2:3:2 (모든 유형 동일)
const botBuildWeights = (ty, cls) => { // 성격 수치 -> 능력치 투자 가중치. b>0이면 +0.6, b<0이면 -0.4 한도로 배수를 만들고 클래스 배수를 곱해 0.6~1.6으로 제한
  const Z = CFG.botBuild, B = 2 * ty.b - 1, G = 2 * ty.g - 1, P = 2 * ty.p - 1, w = {}; // 대담함, 목표지향, 끈기를 -1~1로
  const bias = { reload: (B + G) / 2, bDmg: (B - G) / 2, pen: -G, bSpeed: P, move: (P - B) / 2, maxHp: -B, regen: -B / 2, body: B };
  for (const k in BOT_BUILD) { const b = clamp(bias[k], -1, 1), m = (1 + (b > 0 ? Z.up : Z.dn) * b) * ((Z.cls[cls] || Z.cls[(CFG.classes[cls] || {}).par] || {})[k] || 1); w[k] = BOT_BUILD[k] * clamp(m, Z.lo, Z.hi); }
  return w;
};
const pickBotType = () => { let t = 0; for (const x of CFG.botTypes) t += x.w; let r = Math.random() * t; for (const x of CFG.botTypes) { r -= x.w; if (r <= 0) return x; } return CFG.botTypes[0]; }; // 가중치 추첨(현재 균등)

class Bot extends Player {
  constructor(x, y, lv, name, targetLv) { // lv = 시작 레벨, targetLv = 도달해야 할 목표 레벨(가속 대상)
    super(); this.x = x; this.y = y; this.isBot = true; this.name = name; this.col = TANK_RED[0]; this.out = TANK_RED[1];
    this.inp = { ax: 0, ay: 0, fire: false, axis() { return [this.ax, this.ay]; } }; // 플레이어 Input과 같은 인터페이스
    this.target = null; this.kind = ''; this.afraid = false; this.think = rand(0, 0.4); this.t = 0; this.wa = rand(0, TAU); this.side = Math.random() < 0.5 ? 1 : -1;
    const ty = pickBotType(), F = CFG.botFx, lin = (c, x) => c[0] + c[1] * x; // 성격 유형(고정값)과 숙련도(유형과 무관)
    this.pt = ty; this.skill = rand(CFG.botSkill[0], CFG.botSkill[1]); this.wt = botBuildWeights(ty, 'tank'); // 능력치 투자 가중치(성격 유형 기반, 랜덤 배율 없음, 클래스 선택 후 갱신)
    this.fleeHp = lin(F.fleeHp, ty.b); this.fearGap = lin(F.fearGap, ty.b); this.sightMul = lin(F.sight, ty.b); // 대담함
    this.fightThr = CFG.botFight.thrMul * (CFG.botFight.needBase - CFG.botFight.needBold * ty.b); this.decLeft = 0; // 대담함: 싸움 기준(R이 이 이상이면 싸움), 싸움·도주 판단 최소 유지 시간 타이머
    this.chaseT = lin(F.chaseT, ty.p); this.chaseRange = 1 + ty.p; this.lostT = 0; // 끈기
    this.grudgeT = lin(F.grudgeT, ty.r); this.grudge = null; this.grudgeLeft = 0; this.grudgeMul = 1 + F.grudgeW * ty.r; // 복수심
    this.threat = null; // 도주한 상대의 마지막 위치 기억(fleeMemory초)
    this.wHunt = 2 * ty.g; this.wFarm = 2 * (1 - ty.g); // 목표지향: 사냥/파밍 점수 가중(0.5이면 둘 다 1)
    this.stay = F.stayBase + F.stayK * ty.p; this.holdT = F.holdBase + F.holdK * ty.p; this.holdLeft = 0; this.mode = ''; // 끈기: 현재 목표 유지 보너스와 최소 유지 시간 (mode: '', hunt, farm, flee)
    this.aimErrMax = F.aimErr * (1 - this.skill); this.aimErr = 0; // 숙련도(조준 오차)
    const A = F.aim, FL = F.flee; this.ph = rand(0, TAU); this.waT = this.wa; this.fa = null; this.fleeSide = this.side; this.fleeSideGoal = this.side; this.fleeSideT = rand(FL.sideT[0], FL.sideT[1]); // 도주·배회 자연스러움: 방향 목표, 도주 방향, 옆 방향 상태
    this.habit = rand(0, 1); this.leadMul = 1 + rand(-A.leadErr, A.leadErr); this.aimU = 0; this.aimUT = 0; this.aimTimer = 0; this.accS = 0; this.accT = null; this.pvx = 0; this.pvy = 0; this.lockLeft = 0; this.lastT = null; // 조준: 습관, 예측 배율, 오차 상태, 상대 가속 추정, 노림 지연
    this.setLevel(lv); this.spendPoints(); this.pickClass(); this.hp = this.maxHp; // 해당 레벨의 최소 점수와 33점 규칙 포인트
    this.age = 0; this.targetLv = Math.max(lv, targetLv || lv); this.invT = CFG.spawnInvuln; this.idleT = rand(0, CFG.bots.spawnIdle); // 스폰 무적(플레이어와 동일) + 0~spawnIdle초 랜덤 대기 후 행동 시작
  }
  spendPoints() {
    while (this.pts > 0) {
      let tot = 0; for (const st of CFG.stats) if (this.up[st.k] < CFG.maxPts) tot += this.wt[st.k];
      if (tot <= 0) break;
      let r = Math.random() * tot, pick = null;
      for (const st of CFG.stats) if (this.up[st.k] < CFG.maxPts) { pick = st.k; r -= this.wt[st.k]; if (r <= 0) break; }
      this.up[pick]++; this.pts--;
    }
    this.recalc();
  }
  pickClass() {
    for (let step = 0; step < 2; step++) { /* 15레벨과 30레벨을 한꺼번에 넘은 경우도 두 번 고름 */
      const ch = classChoices(this.cls, this.level); if (!ch.length) return;
      let tot = 0; for (const c of ch) tot += this.cls === 'tank' ? BOT_CLASS_W[c] : 1;
      let r = Math.random() * tot, k = ch[0]; for (const c of ch) { k = c; r -= this.cls === 'tank' ? BOT_CLASS_W[c] : 1; if (r <= 0) break; }
      this.setClass(k); this.wt = botBuildWeights(this.pt, k); // 이후 포인트부터 클래스에 맞는 능력치 가중치를 겹침
    }
  }
  addXp(v) { super.addXp(v); this.spendPoints(); this.pickClass(); } // 플레이어와 같은 레벨업 -> 포인트 투자 -> 15레벨 클래스 선택
  hurt(d, by) { if (this.invT > 0) return; /* 스폰 무적: 피해를 받지 않음 */ this.hp -= d; this.sinceHit = 0; this.flash = 0.12; if (by) this.lastHit = by; if (by && by !== this && by.up) { this.grudge = by; this.grudgeLeft = this.grudgeT; } }
  pickTarget(g) { // 점수제 목표 선택(2단계): 후보(탱크 사냥/도주, 도형·크래셔 파밍)마다 점수를 매겨 가장 높은 것을 고르고, 떨림 방지 규칙을 적용. 모든 봇이 같은 식을 쓰며 성격 수치는 입력값으로만 작용
    const p = g.player, F = CFG.botFx, sight = 750 * this.sightMul / this.def.fov, cur = this.target; // 교전 시야: 대담함
    if (F.aim.mode === 'legacy') this.aimErr = (Math.random() * 2 - 1) * this.aimErrMax; // 숙련도: 목표를 고를 때마다 조준 오차를 새로 뽑음(이전 방식, 새 방식은 ai()에서 계속 갱신)
    if (Math.random() < 0.15) this.side *= -1;
    const alive = t => t && t.hp > 0 && !t.gone && (t !== p || p.alive);
    const sat = raw => 1 - Math.exp(-raw / F.scoreScale); // 기회 점수(파밍·사냥)를 0~1로 눌러서, 도주 점수(1 이상)가 항상 우선하도록 함
    const wasFlee = this.mode === 'flee';
    const th = this.threatNow(), thR = th ? sight * CFG.botFight.threatMul : 0, nearTh = (x, y) => th && Math.hypot(x - th.x, y - th.y) < thR; // 도주한 상대를 기억하는 동안 그 위치 주변은 파밍 후보에서 제외
    let bt = null, bk = '', bm = '', bs = 0, br = 0, ct = null, ck = '', cm = '', cs = 0, cr = 0; // 최고 점수 후보(b)와 현재 목표의 후보(c): s = 눌린 점수(후보 선택), r = 원점수(유지 보너스 비교)
    const consider = (t, kind, mode, score, raw) => { if (t === cur) { ct = t; ck = kind; cm = mode; cs = score; cr = raw; } if (!bt || score > bs) { bt = t; bk = kind; bm = mode; bs = score; br = raw; } };
    const tank = t => {
      if (t === this || !alive(t)) return;
      const d = Math.hypot(t.x - this.x, t.y - this.y), gr = t === this.grudge && this.grudgeLeft > 0, keep = t === cur && this.kind === 'tank' && this.lostT < this.chaseT;
      if (d > sight && !(gr && d < sight * F.grudgeRange) && !(keep && d < sight * this.chaseRange)) return; // 교전 시야 밖은 후보 아님(복수 대상, 추격 유지 중인 상대는 예외)
      const fc = wasFlee && t === cur, gap = t.level - this.level; // 전투력은 레벨로만 비교. 도주 중이던 상대는 해제 기준을 더 엄격하게(떨림 방지)
      const BF = CFG.botFight; let threatened, ease;
      if (BF.mode === 'power') { // 전투 우위 R로 싸움/도주를 가르는 새 방식(경계 구간 없음)
        const R = this.matchup(t), thr = this.fightThr * (gr ? BF.grudgeNeed : 1), prev = t === cur ? this.mode : ''; // prev = 이 상대에 대해 이미 내린 판단(hunt 싸움 / flee 도주)
        let fight;
        if (prev === 'hunt' || prev === 'flee') {
          if (this.decLeft > 0 && !(BF.breakRatio > 0 && prev === 'hunt' && R < thr * BF.breakRatio)) fight = prev === 'hunt'; // 최소 유지 시간 동안은 판단을 유지
          else fight = prev === 'hunt' ? R >= thr * (1 - BF.hyst) : R >= thr * (1 + BF.hyst); // 그 뒤에는 기준의 +/-hyst 여유를 두고 바꿈
        } else fight = R >= thr; // 새로 마주친 상대(다른 적 포함)는 바로 판단
        threatened = !fight; ease = clamp(R / (BF.easeDiv * thr), BF.easeMin, BF.easeMax); // 기준보다 훨씬 유리한 상대일수록 쉬운 사냥감
      } else { // 이전 방식(legacy): 레벨 차이와 내 체력 비율
        threatened = gap > this.fearGap - (fc ? F.fleeReleaseGap : 0) || this.hp < this.maxHp * (this.fleeHp + (fc ? F.fleeReleaseHp : 0));
        ease = clamp(1 - gap / (F.easeDiv * this.fearGap), 0.25, 1.5); // 나보다 낮은 레벨일수록 쉬운 사냥감
      }
      if (threatened) { if (d < sight * (fc ? 1.2 : 1)) { const fs = F.fleeBase + clamp(1 - d / sight, 0, 1); consider(t, 'tank', 'flee', fs, fs); } return; }
      let raw = (40 + 0.5 * t.score) * this.wHunt * ease / (d + 150); if (gr) raw *= this.grudgeMul; // 처치 보상 x 사냥 가중, 복수 대상은 가중
      consider(t, 'tank', 'hunt', sat(raw), raw);
    };
    tank(p); for (const b of g.bots) tank(b);
    for (const c of g.crashers) { if (c.hp <= 0) continue; const d = Math.hypot(c.x - this.x, c.y - this.y); if (d > (c === cur ? F.crasherOut : F.crasherIn) || (d >= 450 && nearTh(c.x, c.y))) continue; const rw = c.s.xp * this.wFarm * (d < 450 ? F.crashUrg : 1) / (d + 150); consider(c, 'crasher', 'farm', sat(rw), rw); } // 접근하는 크래셔(450 이내)는 가중
    const lowNest = this.level < 15, canAlpha = this.up.pen >= 5 && this.level >= 25, canHex = this.up.pen >= 3 && this.level >= 20; // 저레벨 봇은 둥지를 피하고, 알파 오각형·육각형은 강한 봇만 노림
    for (const s of g.shapes) { const dx = s.x - this.x, lim = s === cur ? F.farmOut : F.farmIn; if (dx > lim || dx < -lim) continue; if (s.kind === 'alpha pentagon' ? !canAlpha : s.kind === 'hexagon' ? !canHex : (lowNest && s.nest)) continue; const d = Math.hypot(dx, s.y - this.y); if (d > lim || nearTh(s.x, s.y)) continue; const rw = s.s.xp * this.wFarm / (d + 150); consider(s, 'shape', 'farm', sat(rw), rw); }
    let t = bt, kind = bk, mode = bm;
    if (cur && ct === cur && bt !== cur && alive(cur)) { // 현재 목표가 아직 후보이면 떨림 방지: 새로 위험해진 경우(도주)가 아니면 최소 유지 시간 동안, 그 뒤에는 새 점수가 (유지 보너스 x 현재 점수)보다 높을 때만 교체
      if (!(bm === 'flee' && !wasFlee) && (this.holdLeft > 0 || br < cr * this.stay)) { t = cur; kind = ck; mode = cm; } // 유지 보너스는 눌리기 전의 원점수로 비교(눌린 점수로 비교하면 큰 점수 후보에서 교체가 막힘)
    }
    if (t !== cur || mode !== this.mode) this.holdLeft = this.holdT; // 새 목표나 새 행동으로 바뀌면 최소 유지 시간 시작
    if ((mode === 'hunt' || mode === 'flee') && (t !== cur || mode !== this.mode)) this.decLeft = mode === 'flee' ? CFG.botFight.fleeHold : CFG.botFight.fightHold; // 싸움·도주를 새로 정하면 그 판단의 최소 유지 시간 시작
    this.target = t; this.kind = t ? kind : ''; this.mode = t ? mode : ''; this.afraid = !!t && mode === 'flee';
    const BFm = CFG.botFight; if (BFm.fleeMemory > 0) { if (mode === 'flee' && t) this.threat = { x: t.x, y: t.y, en: t, until: this.age + BFm.fleeMemory }; else if (this.threat && mode === 'hunt' && t === this.threat.en) this.threat = null; } // 도주 중에는 상대의 마지막 위치와 기억 시간을 갱신하고, 같은 상대와 싸우기로 하면 기억을 지움
  }
  threatNow() { // 도주한 상대를 기억하는 동안(fleeMemory초)의 마지막 위치 정보. 기억이 끝났거나 상대가 죽었으면 null
    const th = this.threat; if (!th) return null;
    if (CFG.botFight.fleeMemory <= 0 || this.age >= th.until || th.en.hp <= 0 || th.en.gone) { this.threat = null; return null; }
    return th;
  }
  stateTag() { return this.idleT > 0 ? 'idle' : this.invT > 0 ? 'inv' : !this.target ? 'wander' : this.kind === 'tank' ? (this.afraid ? 'flee' : 'fight') : this.kind; } // 현재 행동(개발자 패널과 화면 표시 공용)
  rTag() { return this.kind === 'tank' && this.target ? ' R' + this.matchup(this.target).toFixed(2) : ''; } // 탱크를 상대하는 중이면 전투 우위 R(개발자 패널과 화면 표시 공용)
  matchup(t) { // 전투 우위 R = (내 체력% x 내 공격력) / (상대 체력% x 상대 공격력). 체력%는 체력 막대에 보이는 비율(상대는 다친 경우만 보이고 가득 차면 100%), 공격력은 레벨로만 추정
    const B = CFG.botFight, off = L => Math.pow(1 + (L - 1) / B.offBase, B.offPow);
    const mine = this.hp / this.maxHp, theirs = t.hp < t.maxHp ? t.hp / t.maxHp : 1;
    return (mine * off(this.level)) / Math.max(1e-6, theirs * off(t.level));
  }
  wanderDir(g) { // 대상이 없을 때의 배회 방향: 목표지향이 높을수록 다른 탱크 쪽(사냥), 낮을수록 도형 군집 쪽(파밍)으로 향함. 가까이 갈 대상이 없으면 무작위
    const F = CFG.botFx; let tx = null, ty = null, bd = Infinity;
    if (Math.random() < this.pt.g) { const chk = t => { if (t === this || t.hp <= 0 || t.gone || (t === g.player && !g.player.alive)) return; const d = Math.hypot(t.x - this.x, t.y - this.y); if (d < bd && d < F.huntSense) { bd = d; tx = t.x; ty = t.y; } }; chk(g.player); for (const b of g.bots) chk(b); }
    else { for (const c of g.clusters) { const d = Math.hypot(c.x - this.x, c.y - this.y); if (CFG.clusters.mode !== 'legacy' && c.n < c.target * CFG.clusters.attractMin) continue; /* 성장 중이라 아직 도형이 적은 군집은 목적지로 삼지 않음 */ if (d < bd && d < F.farmSense && d > c.r * 0.5) { bd = d; tx = c.x; ty = c.y; } } }
    let a = tx === null ? rand(0, TAU) : Math.atan2(ty - this.y, tx - this.x) + rand(-0.5, 0.5);
    const th = this.threatNow(); if (th) { const away = Math.atan2(this.y - th.y, this.x - th.x); if (Math.abs(adiff(a, away)) > Math.PI - 1) a = away + rand(-0.5, 0.5); } // 도주한 상대 쪽(+/-1라디안) 방향이면 반대쪽으로
    return a;
  }
  fleeDir(dt, nx, ny, d, sight) { // 도주 방향: 적 반대 + 부드럽게 바뀌는 옆 방향 + 느린 흔들림, 맵 가장자리 쪽이면 중앙으로 틀고, 실제 방향은 turnRate만큼만 돎. nx, ny = 적을 향한 단위벡터, d = 거리
    const F = CFG.botFx.flee; if (F.mode === 'legacy') return [-nx, -ny];
    this.fleeSideT -= dt; if (this.fleeSideT <= 0) { this.fleeSideT = rand(F.sideT[0], F.sideT[1]); this.fleeSideGoal = Math.random() < 0.5 ? 1 : -1; }
    this.fleeSide += clamp(this.fleeSideGoal - this.fleeSide, -F.sideRate * dt, F.sideRate * dt);
    const near = clamp(1 - d / sight, 0.2, 1), wob = F.wobble * (Math.sin(this.age * 1.9 + this.ph) + Math.sin(this.age * 3.1 + this.ph * 1.7)) / 2, k = F.sideK * near * this.fleeSide + wob;
    let ux = -nx - ny * k, uy = -ny + nx * k; const l = Math.hypot(ux, uy) || 1, ex = this.x + ux / l * F.lookAhead, ey = this.y + uy / l * F.lookAhead, m = F.edgeMargin;
    if (ex < MAP.lo + m || ex > MAP.hi - m || ey < MAP.lo + m || ey > MAP.hi - m) { const c = Math.atan2(CFG.world / 2 - this.y, CFG.world / 2 - this.x); ux += Math.cos(c) * F.edgePush; uy += Math.sin(c) * F.edgePush; } // 앞쪽이 가장자리면 중앙 쪽 성분을 더함
    const da = Math.atan2(uy, ux); this.fa = this.fa === null ? da : turn(this.fa, da, F.turnRate * dt);
    return [Math.cos(this.fa), Math.sin(this.fa)];
  }
  ai(dt, g) {
    const p = g.player, W = CFG.world, inp = this.inp, sp = this.spec;
    this.think -= dt; this.t -= dt;
    if (this.think <= 0) { this.think = rand(0.25, 0.5); this.pickTarget(g); }
    if (this.grudgeLeft > 0) this.grudgeLeft -= dt;
    if (this.holdLeft > 0) this.holdLeft -= dt;
    if (this.decLeft > 0) this.decLeft -= dt;
    const sight = 750 * this.sightMul / this.def.fov;
    let T = this.target; if (T && (T.hp <= 0 || T.gone || (T === p && !p.alive))) T = this.target = null;
    let ux = 0, uy = 0, spd = 1, aim, fire = false;
    if (T) {
      const dx = T.x - this.x, dy = T.y - this.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d, sx = -ny * this.side, sy = nx * this.side;
      this.lostT = this.kind === 'tank' && d > sight ? this.lostT + dt : 0; // 끈기: 시야 밖에 머문 시간
      const flee = this.mode === 'flee' && this.kind === 'tank', pref = (BOT_DIST[this.cls] || BOT_DIST[this.def.par] || BOT_DIST.tank)[this.kind === 'tank' ? 0 : 1];
      if (!flee) this.fa = null; if (flee) { const fd = this.fleeDir(dt, nx, ny, d, sight); ux = fd[0]; uy = fd[1]; } else if (this.kind === 'crasher') { if (d < 420) { ux = -nx; uy = -ny; } else { ux = sx; uy = sy; spd = 0.5; } } else if (d > pref + 50) { ux = nx; uy = ny; } else if (d < pref - 50) { ux = -nx; uy = -ny; spd = 0.8; } else { ux = sx; uy = sy; spd = 0.5; }
      const A = CFG.botFx.aim; let lt = d / sp.bSpeed;
      if (A.mode !== 'legacy') { // 사람다운 조준: 상대 가속, 거리에 따라 커지는 오차, 계속 변하는 오차 각도, 예측 시간 오차, 새 탱크를 노릴 때 지연
        if (T !== this.accT) { this.accT = T; this.pvx = T.vx || 0; this.pvy = T.vy || 0; this.accS = 0; }
        else { const da = Math.hypot((T.vx || 0) - this.pvx, (T.vy || 0) - this.pvy) / Math.max(dt, 1e-3); this.pvx = T.vx || 0; this.pvy = T.vy || 0; this.accS += (da - this.accS) * Math.min(1, dt * 5); }
        this.aimTimer -= dt; if (this.aimTimer <= 0) { this.aimTimer = A.drift * rand(0.7, 1.3); this.aimUT = Math.random() * 2 - 1; }
        this.aimU += (this.aimUT - this.aimU) * Math.min(1, dt / (A.drift * 0.5));
        const E = (A.e0 * (1 - this.skill) + A.ed * Math.min(1, d / (sp.bSpeed * sp.life)) + A.ev * Math.min(1, this.accS / A.accRef)) * (A.habit[0] + A.habit[1] * this.habit);
        this.aimErr = this.aimU * E; lt *= this.leadMul;
        if (T !== this.lastT) { this.lastT = T; if (this.kind === 'tank' && this.mode === 'hunt') this.lockLeft = A.lockMax - (A.lockMax - A.lockMin) * clamp((this.skill - CFG.botSkill[0]) / Math.max(1e-6, CFG.botSkill[1] - CFG.botSkill[0]), 0, 1); }
      }
      aim = Math.atan2(dy + (T.vy || 0) * lt, dx + (T.vx || 0) * lt) + this.aimErr; // 이동 예측 사격
      fire = d < sp.bSpeed * sp.life * 0.85 && Math.abs(adiff(this.angle, aim)) < 0.25 + sp.spread;
    } else {
      const W = CFG.botFx.wander, nat = W.mode !== 'legacy';
      if (this.t <= 0) { this.t = rand(CFG.botFx.wanderTime[0], CFG.botFx.wanderTime[1]); const wd = this.wanderDir(g); if (nat) this.waT = wd; else this.wa = wd; }
      if (nat) this.wa = turn(this.wa, this.waT, W.turnRate * dt); // 새 방향으로 서서히 돎
      const wb = nat ? W.wobble * (Math.sin(this.age * 0.9 + this.ph) + Math.sin(this.age * 1.7 + this.ph * 1.3)) / 2 : 0; // 느린 흔들림
      ux = Math.cos(this.wa + wb); uy = Math.sin(this.wa + wb); spd = nat ? W.spdBase + W.spdK * this.pt.g : 0.4; aim = this.wa;
    }
    if (!T) this.lostT = 0;
    let ax = 0, ay = 0; // 도형/크래셔 몸통 회피: 가까워질수록 반대 방향으로 밀어냄 (몸통 충돌 피해로 죽지 않도록)
    const avoid = (e, m) => {
      const R = e.r + this.r + m, dx = this.x - e.x, dy = this.y - e.y; if (Math.abs(dx) > R || Math.abs(dy) > R) return;
      const d = Math.hypot(dx, dy) || 1; if (d >= R) return; const w = (1 - d / R) * 3; ax += dx / d * w; ay += dy / d * w;
    };
    for (const s of g.shapes) avoid(s, 50 + s.dmg * 4); for (const c of g.crashers) avoid(c, 90);
    if (ax || ay) { ux += ax; uy += ay; spd = Math.max(spd, 0.9); }
    const thm = this.threatNow(); if (thm && this.mode !== 'hunt' && this.mode !== 'flee') { const tdx = this.x - thm.x, tdy = this.y - thm.y, td = Math.hypot(tdx, tdy) || 1, tR = sight * CFG.botFight.threatMul; if (td < tR) { const w = CFG.botFight.threatPush * (1 - td / tR); ux += tdx / td * w; uy += tdy / td * w; spd = Math.max(spd, 0.7); } } // 파밍·배회 중 도주한 상대의 구역 안이면 바깥으로 밀려남
    if (this.x < MAP.lo + 200 || this.y < MAP.lo + 200 || this.x > MAP.hi - 200 || this.y > MAP.hi - 200) { // 맵 가장자리에서는 중앙 쪽으로
      const c = Math.atan2(W / 2 - this.y, W / 2 - this.x);
      if (!T) { this.wa = this.waT = c; ux = Math.cos(c); uy = Math.sin(c); } else { ux += Math.cos(c) * 0.8; uy += Math.sin(c) * 0.8; }
    }
    if ((this.level < 15 || this.hp < this.maxHp * this.fleeHp) && inNest(this.x, this.y, 250)) { const c = Math.atan2(this.y - W / 2, this.x - W / 2); ux += Math.cos(c) * 1.5; uy += Math.sin(c) * 1.5; } // 저레벨 봇은 둥지에서 벗어남
    const l = Math.hypot(ux, uy); if (l > 1) { ux /= l; uy /= l; }
    inp.ax = ux * spd; inp.ay = uy * spd; inp.fire = fire; if (this.lockLeft > 0) this.lockLeft -= dt;
    this.angle = turn(this.angle, aim, 7 * dt * (this.lockLeft > 0 ? CFG.botFx.aim.lockSlow : 1));
  }
  catchMul() { return this.level < this.targetLv ? CFG.bots.catchUp + CFG.bots.catchUpRamp * this.age : 1; } // 목표 레벨 미만일 때 점수 가속 배율(시간이 지날수록 커짐)
  catchGain(raw) { // 가속된 점수 획득량: 목표 레벨 최소 점수에 닿을 때까지만 가속하고, 그 이상은 가속하지 않아 목표 레벨을 넘어 오르지 않음
    if (this.level >= this.targetLv) return raw;
    return Math.min(raw * this.catchMul(), Math.max(raw, CFG.scoreAt[this.targetLv] - this.score));
  }
  update(dt, g) {
    this.age += dt;
    if (this.idleT > 0) { // 소환 직후 대기: 이동·발사 없이 서 있음(무적 시간은 계속 흐름)
      this.idleT -= dt; this.invT -= dt; this.inp.ax = this.inp.ay = 0; this.inp.fire = false;
      this.move(dt, this.inp); this.shoot(dt, this.inp, g); return;
    }
    this.ai(dt, g);
    if (this.invT > 0) { this.invT -= dt; if (this.inp.ax || this.inp.ay || this.inp.fire) this.invT = 0; } // 이동하거나 발사하면 스폰 무적 해제 (플레이어와 동일)
    this.move(dt, this.inp); this.shoot(dt, this.inp, g);
  }
}

/* ============ Crasher (둥지를 지키며 탱크에게 돌진하는 분홍 삼각형) ============ */
class Crasher {
  constructor(big, x, y) {
    const s = big ? CFG.crashers.large : CFG.crashers.small;
    this.s = s; this.kind = 'crasher'; this.x = x; this.y = y; this.r = s.r; this.hp = this.maxHp = s.hp; this.dmg = s.dmg;
    this.vx = this.vy = 0; this.angle = rand(0, TAU); this.flash = 0; this.wa = rand(0, TAU); this.target = null; this.think = rand(0, 0.3); this.calm = 99;
  }
  update(dt, g) {
    const s = this.s, W = CFG.world, p = g.player; this.flash = Math.max(0, this.flash - dt); this.think -= dt;
    if (this.think <= 0) { // 사정거리 안의 가장 가까운 탱크(플레이어/봇 모두)를 추적
      this.think = rand(0.2, 0.4); let best = null, bd = s.range * s.range;
      if (p.alive) { const d2 = (p.x - this.x) ** 2 + (p.y - this.y) ** 2; if (d2 < bd) { bd = d2; best = p; } }
      for (const b of g.bots) { const d2 = (b.x - this.x) ** 2 + (b.y - this.y) ** 2; if (b.hp > 0 && d2 < bd) { bd = d2; best = b; } }
      this.target = best;
    }
    let T = this.target; if (T && (T.hp <= 0 || T.gone || (T === p && !p.alive))) T = this.target = null;
    let ux = 0, uy = 0, spd = 1;
    if (T) { const dx = T.x - this.x, dy = T.y - this.y, d = Math.hypot(dx, dy) || 1; if (d > s.range * 1.6) T = this.target = null; else { ux = dx / d; uy = dy / d; } }
    if (!T) { // 추적 대상이 없으면 둥지로 돌아가 천천히 맴돎
      const dx = W / 2 - this.x, dy = W / 2 - this.y, d = Math.hypot(dx, dy) || 1;
      if (d > NEST.r * 0.9) { ux = dx / d; uy = dy / d; spd = 0.6; } else { this.wa += dt * 0.6; ux = Math.cos(this.wa); uy = Math.sin(this.wa); spd = 0.3; }
    }
    const drag = 3; this.vx += ux * s.speed * spd * drag * dt; this.vy += uy * s.speed * spd * drag * dt;
    const f = Math.exp(-drag * dt); this.vx *= f; this.vy *= f; this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.x < MAP.lo + this.r) { this.x = MAP.lo + this.r; this.vx = Math.max(0, this.vx); } if (this.x > MAP.hi - this.r) { this.x = MAP.hi - this.r; this.vx = Math.min(0, this.vx); }
    if (this.y < MAP.lo + this.r) { this.y = MAP.lo + this.r; this.vy = Math.max(0, this.vy); } if (this.y > MAP.hi - this.r) { this.y = MAP.hi - this.r; this.vy = Math.min(0, this.vy); }
    this.angle = turn(this.angle, Math.atan2(uy, ux), 8 * dt);
  }
}

/* ============ UI ============ */
class UI {
  constructor(g) { this.g = g; this.rows = []; this.tiles = []; this.showAt = 0; }
  click(mx, my) {
    if (this.g.state !== 'play') return false;
    for (const t of this.tiles) if (mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h) { this.g.chooseClass(t.k); return true; }
    for (const r of this.rows) if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { this.g.upgrade(r.i); return true; }
    return false;
  }
  panel(ctx, x, y, maxH, lines) { // 개발자 정보 패널: 반투명 배경 + 고정폭 글꼴 (줄이 넘치면 생략)
    const lh = 13, n = Math.max(1, Math.min(lines.length, Math.floor((maxH - 10) / lh)));
    ctx.font = '11px Consolas, "Courier New", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    let w = 0; for (let i = 0; i < n; i++) w = Math.max(w, ctx.measureText(lines[i].t).width);
    w += 16; if (x < 0) x = -x - w; // x가 음수면 오른쪽 끝(-x) 기준 정렬
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, y, w, n * lh + 10);
    for (let i = 0; i < n; i++) { const L = i === n - 1 && n < lines.length ? { t: `... +${lines.length - n + 1} more` } : lines[i]; ctx.fillStyle = L.h ? '#ffe05a' : L.c || '#fff'; ctx.fillText(L.t, x + 8, y + 5 + i * lh); }
  }
  drawDev(ctx, W, H) { // 개발에 도움이 되는 상태 정보 (F2로 켜고 끔)
    const g = this.g, p = g.player, B = CFG.bots, K = CFG.clusters, N = CFG.nest, pl = p.alive ? p.level : 1;
    const H1 = t => ({ t, h: 1 }), L1 = (t, c) => ({ t, c });
    // --- 오른쪽: 봇 ---
    const target = Math.min(B.max, B.base + Math.floor(pl * B.perLevel)), a = clamp(Math.round(pl * 0.3), 1, B.maxSpawnLevel), b = clamp(Math.round(pl * 0.7), 1, B.maxSpawnLevel);
    const bl = [H1('BOTS'),
      L1(`spawn timer ${Math.max(0, g.spawnT).toFixed(1)}s / ${B.spawnEvery}s${g.bots.length < target && g.spawnT <= 0 ? '  (spawning)' : ''}`),
      L1(`bots ${g.bots.length} / target ${target}  (max ${B.max}, base ${B.base}, +${B.perLevel}/lv)`),
      L1(`next target lv: 1 (50%) or ${a}-${b} (50%), start Lv1, catch-up x${B.catchUp}+${B.catchUpRamp}/s  shapeXp x${B.shapeXp}`)];
    for (const o of [...g.bots].sort((x, y) => y.level - x.level)) {
      const st = o.stateTag(), d = Math.round(Math.hypot(o.x - p.x, o.y - p.y));
      bl.push(L1(`${o.name.slice(0, 9).padEnd(9)} Lv${String(o.level).padStart(2)}${o.level < o.targetLv ? '>' + String(o.targetLv).padStart(2) : '   '} ${o.def.n.slice(0, 5).padEnd(5)} ${fmt(o.score).padStart(6)} hp${String(Math.round(o.hp / o.maxHp * 100)).padStart(3)}% ${st.padEnd(6)} d${d}${o.level < o.targetLv ? ' x' + Math.round(o.catchMul()) : ''} ${o.pt.n} s${o.skill.toFixed(2)}${o.rTag()}`));
    }
    this.panel(ctx, -(W - 16), 282, H - 282 - 176, bl);
    // --- 왼쪽: 월드 / 군집 ---
    let free = 0, clu = 0, nestP = 0, alpha = 0, hex = 0, hexOut = 0; for (const s of g.shapes) { if (s.nest) { if (s.kind === 'alpha pentagon') alpha++; else if (s.kind === 'hexagon') hex++; else nestP++; } else if (s.cl) clu++; else { free++; if (s.kind === 'hexagon') hexOut++; } }
    const freeT = Math.round(CFG.shapeDensity * MAP.size * MAP.size), want = Math.min(K.maxCount, MAP.size * MAP.size / K.areaPerCluster);
    const wl = [H1('WORLD'),
      L1(`player Lv${p.level} score ${fmt(p.score)} pts ${g.dev ? 'inf' : p.pts} inv ${Math.max(0, p.invT).toFixed(1)}s kills ${p.kills}`),
      L1(`fps ${g.fps.toFixed(0)}  bullets ${g.bullets.length}  fx ${g.fx.a.length}  shapes ${g.shapes.length}`),
      L1(`map ${Math.round(MAP.size)} -> ${Math.round(mapTarget(g.nTanks))}  tanks ${g.bots.length + 1}/${g.plannedTanks()} (avg ${g.nTanks.toFixed(2)})`),
      L1(`free ${free}/${freeT}  cluster ${clu}  nest ${nestP}/${nestPent()} r${Math.round(NEST.r)}  alpha ${alpha}/${N.alphaMax}${alpha < N.alphaMax ? ' (' + Math.max(0, g.alphaT).toFixed(0) + 's)' : ''}  hex ${hex}/${N.hexagons}${hex < N.hexagons ? ' (' + Math.max(0, g.hexT).toFixed(0) + 's)' : ''}+${hexOut}`),
      L1(`crashers ${g.crashers.length}/${nestCrash()}  timer ${Math.max(0, g.crasherT).toFixed(1)}s  shape tick ${Math.max(0, g.shapeT).toFixed(2)}s`),
      H1('CLUSTERS'),
      L1(`count ${g.clusters.length}  want ${want.toFixed(2)} (area / ${(K.areaPerCluster / 1e6).toFixed(0)}M)  max ${K.maxCount}`)];
    g.clusters.forEach((c, i) => wl.push(L1(`#${i + 1} ${c.type.padEnd(8)} r${Math.round(c.r)} n ${String(c.n).padStart(2)}/${c.target} sp ${c.spawned}/${c.target} age ${Math.round(c.age)}/${Math.round(c.life)}s @${Math.round(c.x)},${Math.round(c.y)}`)));
    this.panel(ctx, 16, 250, H - 250 - 262, wl);
  }
  draw(ctx, W, H) {
    const g = this.g, p = g.player, rows = this.rows; rows.length = 0;
    // 업그레이드 바
    // 업그레이드 패널 (diep.io: 각 능력치 옆 + 버튼 클릭 또는 숫자키, 포인트가 있으면 표시, 없으면 커서를 왼쪽 아래에 두면 표시)
    const rh = 22, gap = 5, bwid = 212, bx0 = 16, y0 = H - 16 - 8 * (rh + gap), im0 = g.input;
    const nowT = performance.now(), dtu = Math.min(0.1, (nowT - (this.lastT || nowT)) / 1000); this.lastT = nowT;
    const want = g.dev || p.pts > 0 || (im0.mx < 340 && im0.my > H - 300);
    this.panelT = clamp((this.panelT || 0) + (want ? 1 : -1) * dtu * 5, 0, 1);
    const pe = 1 - (1 - this.panelT) * (1 - this.panelT), ox = -(1 - pe) * 300;
    if (this.panelT > 0.02) {
      CFG.stats.forEach((st, i) => {
        const y = y0 + i * (rh + gap), x = bx0 + ox, can = g.dev || (p.pts > 0 && p.up[st.k] < CFG.maxPts), bcx = x + bwid + 17, bcy = y + rh / 2;
        const hov = im0.mx >= x && im0.mx <= x + bwid + 34 && im0.my >= y && im0.my <= y + rh;
        if (this.panelT > 0.5) rows.push({ x, y, w: bwid + 34, h: rh, i });
        ctx.globalAlpha = pe * (can && hov ? 1 : 0.88); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y, bwid, rh);
        const sw = (bwid - 8) / CFG.maxPts;
        for (let k = 0; k < CFG.maxPts; k++) { ctx.fillStyle = k < p.up[st.k] ? st.c : 'rgba(255,255,255,.12)'; ctx.fillRect(x + 4 + k * sw, y + 3, sw - 2, rh - 6); }
        ctx.globalAlpha = pe; label(ctx, st.n, x + 8, y + rh / 2 + 1, 12); label(ctx, `[${i + 1}]`, x + bwid - 6, y + rh / 2 + 1, 11, 'right');
        if (p.up[st.k] > CFG.maxPts) label(ctx, String(p.up[st.k]), x + bwid - 34, y + rh / 2 + 1, 11, 'right'); // 개발자 모드: 한도 초과 포인트 표시
        disc(ctx, bcx, bcy, can && hov ? 12.5 : 11, can ? st.c : 'rgba(0,0,0,.35)', can ? shade(st.c, 0.72) : 'rgba(0,0,0,.2)', 2); // + 버튼 (포인트가 없으면 비활성)
        ctx.beginPath(); ctx.moveTo(bcx - 5, bcy); ctx.lineTo(bcx + 5, bcy); ctx.moveTo(bcx, bcy - 5); ctx.lineTo(bcx, bcy + 5);
        ctx.strokeStyle = can ? '#fff' : 'rgba(255,255,255,.35)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
      });
      ctx.globalAlpha = pe; if (g.dev) label(ctx, 'x∞ (dev)', bx0 + ox, y0 - 16, 20); else if (p.pts > 0) label(ctx, `x${p.pts}`, bx0 + ox, y0 - 16, 20); // 사용 가능한 포인트 수
      ctx.globalAlpha = 1;
    }
    // 클래스 업그레이드 타일 (diep.io처럼 좌상단, 왼쪽에서 슬라이드 인, 클릭으로 선택)
    this.tiles.length = 0;
    const choices = p.alive ? classChoices(p.cls, p.level) : [];
    if (choices.length) {
      if (!this.showAt) this.showAt = performance.now();
      const k = clamp((performance.now() - this.showAt) / 350, 0, 1), ease = 1 - (1 - k) * (1 - k), ts = 92, tg = 10, im = g.input;
      choices.forEach((key, i) => {
        const cd = CFG.classes[key], tx = 16 - (1 - ease) * 240 + (i % 2) * (ts + tg), ty = 16 + ((i / 2) | 0) * (ts + tg);
        const hov = im.mx >= tx && im.mx <= tx + ts && im.my >= ty && im.my <= ty + ts;
        this.tiles.push({ x: tx, y: ty, w: ts, h: ts, k: key });
        ctx.globalAlpha = hov ? 1 : 0.85; ctx.fillStyle = cd.c; ctx.fillRect(tx, ty, ts, ts);
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(tx, ty + ts - 24, ts, 24);
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3; ctx.strokeRect(tx + 1.5, ty + 1.5, ts - 3, ts - 3);
        const ir = hov ? 17 : 15, icx = tx + ts / 2, icy = ty + 38;
        drawBarrels(ctx, icx, icy, ir, -Math.PI / 2, cd.barrels, []); disc(ctx, icx, icy, ir, TANK_BLUE[0], TANK_BLUE[1]);
        ctx.globalAlpha = 1; label(ctx, cd.n, tx + ts / 2, ty + ts - 12, 12, 'center');
      });
    } else this.showAt = 0;
    // 경험치/점수
    const bw = Math.min(420, W - 40), bx = (W - bw) / 2, by = H - 36, full = p.level >= CFG.maxLevel;
    const lo = CFG.scoreAt[p.level], need = full ? 1 : CFG.scoreAt[p.level + 1] - lo, cur = p.score - lo; // 레벨 진행도 = 점수 - 현재 레벨 최소 점수
    let top = p.score; for (const o of g.bots) if (o.hp > 0 && o.score > top) top = o.score; // 리더(1위) 점수
    const sbw = bw * 0.82, sbx = (W - sbw) / 2, sby = by - 26; // 점수 바: 내 점수 / 1위 점수 (내가 1위이면 가득 참, diep.io와 동일)
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(sbx, sby, sbw, 20); ctx.fillStyle = '#6cf08a'; ctx.fillRect(sbx + 3, sby + 3, (sbw - 6) * clamp(p.score / Math.max(1, top), 0, 1), 14);
    label(ctx, `Score: ${fmt(p.score)}`, W / 2, sby + 11, 12, 'center'); label(ctx, p.name, W / 2, sby - 14, 18, 'center');
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(bx, by, bw, 22);
    ctx.fillStyle = '#ffe05a'; ctx.fillRect(bx + 3, by + 3, (bw - 6) * (full ? 1 : clamp(cur / need, 0, 1)), 16);
    label(ctx, full ? `Level ${p.level} ${p.def.n} (max)` : `Level ${p.level} ${p.def.n}   ${Math.floor(cur)} / ${need}`, W / 2, by + 12, 13, 'center');
    // 현재 능력치 요약
    label(ctx, `HP ${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}   Damage ${p.spec.dmg.toFixed(0)}   Reload ${p.reloadT.toFixed(2)}s   Speed ${Math.round(p.s.move * p.speedMul)}`, W / 2, 20, 13, 'center');
    label(ctx, 'WASD move · mouse aim · click/Space fire · E auto-fire' + (g.input.auto ? ' (ON)' : ''), W / 2, 40, 12, 'center');
    if (p.invT > 0) label(ctx, `Spawn protection ${Math.ceil(p.invT)}s - move or fire to end`, W / 2, H - 104, 13, 'center');
    if (g.dev && g.devPanel) this.drawDev(ctx, W, H);
    if (g.dev) label(ctx, `dev zoom x${g.cam.zoomMul.toFixed(2)} (mouse wheel) · F2: dev panel`, W / 2, 58, 12, 'center');
    // Scoreboard: 제목 + 1위 대비 점수 비례 막대, 내 항목은 파란색
    const list = []; if (p.alive) list.push({ k: p, n: p.name, s: p.score, me: true, def: p.def });
    for (const b of g.bots) if (b.hp > 0) list.push({ k: b, n: b.name, s: b.score, me: false, def: b.def });
    list.sort((a, b) => b.s - a.s);
    const topS = Math.max(1, list.length ? list[0].s : 1), sw = 220, sx = W - sw - 16;
    const sbA = this.sbAnim || (this.sbAnim = new Map()), kSm = CFG.scoreboardSmooth, sbLive = new Set(); // 게이지의 화면상 비율을 항목(탱크)별로 기억해 목표 비율로 부드럽게 따라가게 함(10위 밖에서도 갱신해서 순위에 들어올 때 끊기지 않음)
    for (const e of list) { const tg = e.s / topS, cv = sbA.get(e.k); e.v = cv === undefined || kSm <= 0 ? tg : cv + (tg - cv) * (1 - Math.exp(-kSm * dtu)); sbA.set(e.k, e.v); sbLive.add(e.k); }
    for (const k of [...sbA.keys()]) if (!sbLive.has(k)) sbA.delete(k); // 사라진 탱크는 정리
    label(ctx, 'Scoreboard', sx + sw / 2, 26, 20, 'center');
    list.slice(0, 10).forEach((e, i) => {
      const ir = 6, y = 46 + i * 22, hov = g.input.mx >= sx && g.input.mx <= sx + sw && g.input.my >= y && g.input.my <= y + 18; // diep.io: 클래스 아이콘이 게이지 끝에 붙어 다니고, 마우스를 올리면 막대가 밝아짐
      pill(ctx, sx, y, sw, 18, '#373737'); // 트랙: 짙은 회색 알약(diep.io 스크린샷 측정값 #373737)
      const fw = Math.max(2 * ir + 2, (sw - 4) * e.v); // 게이지 길이: 1위 대비 비율을 부드럽게 따라간 값(최대 = 막대 전체, 양쪽 2px 여백), 최소 = 아이콘 지름 + 2
      ctx.globalAlpha = hov ? 1 : 0.95; pill(ctx, sx + 2, y + 2, fw, 14, '#90eda9'); ctx.globalAlpha = 1; // 게이지는 연초록 알약(diep.io 스크린샷 측정값 #90eda9, 마우스를 올리면 불투명해져 약간 밝아짐)
      const icx = sx + 2 + fw - ir - 1, icy = y + 9; // 아이콘은 게이지 끝(오른쪽)에 붙음: 원의 오른쪽 가장자리가 게이지 끝과 거의 같음(스크린샷 측정). 1위의 아이콘은 왼쪽, 나머지는 오른쪽을 봄(diep.io 위키: 리더의 탱크는 다른 항목과 반대 방향인 왼쪽을 봄)
      drawBarrels(ctx, icx, icy, ir, i === 0 ? Math.PI : 0, e.def.barrels, [], 1.5); disc(ctx, icx, icy, ir, TANK_BLUE[0], TANK_BLUE[1], 1.5); // 탱크는 모두 파랑
      label(ctx, `${e.n} - ${fmt(e.s)}`, sx + sw / 2, y + 10, 12, 'center'); // 글자는 막대 전체의 가운데, 아이콘 위에 그려서 이름과 점수가 가려지지 않음
    });
    // 킬 메시지: 상단 중앙에 쌓이고 서서히 사라짐
    g.notes.forEach((nt, i) => {
      const y = 84 + i * 30; ctx.globalAlpha = clamp(nt.t, 0, 1);
      ctx.font = 'bold 15px Ubuntu,"Trebuchet MS",sans-serif'; const tw = ctx.measureText(nt.text).width + 28;
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(W / 2 - tw / 2, y - 12, tw, 24);
      label(ctx, nt.text, W / 2, y, 15, 'center'); ctx.globalAlpha = 1;
    });
    if (g.dev && g.devPanel) g.devLog.forEach((nt, i) => { // 개발자 모드: 봇 킬로그 (킬 메시지 아래, 작은 글씨, F2로 개발자 패널과 함께 켜고 끔)
      const y = 232 + i * 20; ctx.globalAlpha = clamp(nt.t, 0, 1);
      ctx.font = 'bold 12px Ubuntu,"Trebuchet MS",sans-serif'; const tw = ctx.measureText(nt.text).width + 20;
      ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(W / 2 - tw / 2, y - 9, tw, 18);
      label(ctx, nt.text, W / 2, y, 12, 'center'); ctx.globalAlpha = 1;
    });
    // 미니맵
    const ms = 150, mx = W - ms - 16, my = H - ms - 16, k = ms / MAP.size;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(mx, my, ms, ms); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.strokeRect(mx, my, ms, ms);
    if (g.dev) { ctx.beginPath(); ctx.arc(mx + ms / 2, my + ms / 2, NEST.r * k, 0, TAU); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.stroke(); } // Pentagon Nest 위치 (개발자 모드에서만 표시)
    ctx.fillStyle = '#f14e54'; for (const e of g.bots) ctx.fillRect(mx + (e.x - MAP.lo) * k - 1.5, my + (e.y - MAP.lo) * k - 1.5, 3, 3);
    const c = g.cam, vw = c.w / c.zoom * k, vh = c.h / c.zoom * k;
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.strokeRect(mx + (c.x - MAP.lo) * k - vw / 2, my + (c.y - MAP.lo) * k - vh / 2, vw, vh);
    ctx.save(); ctx.translate(mx + (p.x - MAP.lo) * k, my + (p.y - MAP.lo) * k); ctx.rotate(p.angle); // 조준 방향을 향하는 삼각형 (diep.io 미니맵과 동일한 방향 표시)
    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3.5, -3.5); ctx.lineTo(-3.5, 3.5); ctx.closePath(); ctx.fillStyle = '#000'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  }
}

/* ============ Game ============ */
class Game {
  constructor(cv) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.cam = new Camera(); this.fx = new Particles();
    this.input = new Input(cv); this.ui = new UI(this); this.shapes = []; this.state = 'menu'; this.name = 'Unnamed tank';
    this.fps = 60; this.devPanel = true; this.clock = 0; this.spec = null; this.specPos = { x: 0, y: 0 }; this.dev = false; this.crashers = []; this._tanks = []; this.ctick = 0; this.shapeT = 0; this.crasherT = 0; this.alphaT = CFG.nest.alphaRespawn; this.hexT = 0; this.respawnLv = 1;
    this.nTanks = 1 + CFG.bots.base; setMapSize(mapTarget(this.nTanks)); // 시작 맵 크기: 플레이어 + 기본 봇 수 기준
    this.clusters = []; this.reset(); this.player.alive = false;
    for (let i = 0, n = Math.max(1, Math.floor(Math.min(CFG.clusters.maxCount, MAP.size * MAP.size / CFG.clusters.areaPerCluster) + 0.35)); i < n; i++) this.newCluster(null, true); // 군집 수 = 맵 면적 / areaPerCluster
    for (const c of this.clusters) { const K = CFG.clusters, want = K.mode === 'legacy' ? c.target : Math.floor(c.target * rand(K.startFill[0], K.startFill[1])); for (let i = 0; i < want; i++) if (this.spawnShape(true, false, null, c) !== false) c.spawned++; } // 'grow'는 일부만 미리 채움(나머지는 성장)
    for (let i = 0, n = Math.round(CFG.shapeDensity * MAP.size * MAP.size); i < n; i++) this.spawnShape(true);
    for (let i = 0, n = nestPent(); i < n; i++) this.spawnShape(true, true);
    this.spawnShape(true, true, 'alpha');
    for (let i = 0; i < CFG.nest.hexagons; i++) this.spawnShape(true, true, 'hexagon');
    for (let i = 0; i < 12; i++) this.spawnCrasher(true);
    this.resize(); addEventListener('resize', () => this.resize());
    const sp0 = this.spawnPos(); this.player.x = sp0.x; this.player.y = sp0.y; this.specPos.x = sp0.x; this.specPos.y = sp0.y; // 시작 화면의 월드도 둥지 밖에서 보이도록
  }
  resize() {
    const d = this.dpr = Math.min(2, window.devicePixelRatio || 1); this.W = innerWidth; this.H = innerHeight;
    this.cv.width = this.W * d; this.cv.height = this.H * d; this.cam.w = this.W; this.cam.h = this.H;
  }
  plannedTanks() { const B = CFG.bots; return 1 + Math.min(B.max, B.base + Math.floor(this.player.level * B.perLevel)); } // 계획된 탱크 수 = 플레이어 1 + 목표 봇 수(플레이어 레벨에 따라 증가)
  reset() { this.player = new Player(); this.bots = []; this.bullets = []; this.notes = []; this.devLog = []; this.spawnT = 0; this.fx.a.length = 0; }
  start() {
    const nk = document.getElementById(this.state === 'dead' ? 'nick2' : 'nick'); // 닉네임 (비우면 기본값)
    this.name = (nk && nk.value.trim().slice(0, 15)) || 'Unnamed tank';
    const rl = this.state === 'dead' ? this.respawnLv : 1, old = this.player; // 사망 시 레벨에 따른 재시작 레벨
    this.spec = null; this.player = new Player(); this.player.name = this.name; this.player.born = this.clock; this.player.invT = CFG.spawnInvuln; if (rl > 1) this.player.setLevel(rl); // 봇/도형/크래셔/총알은 그대로 두고 플레이어만 새로 생성(같은 월드에서 재시작)
    this.bullets = this.bullets.filter(b => b.owner !== old); this.notes = []; this.devLog = [];
    const sp = this.spawnPos(); this.player.x = sp.x; this.player.y = sp.y;
    this.state = 'play'; this.cam.zoom = CFG.viewScale;
    document.getElementById('menu').classList.add('hidden'); document.getElementById('dead').classList.add('hidden');
  }
  die() {
    const p = this.player; p.alive = false; this.state = 'dead'; this.input.down = false; this.input.auto = false; // 죽으면 오토파이어 해제
    this.fx.burst(p.x, p.y, '#00b2e1', 30, 320);
    const k = p.lastHit, bot = k && k.isBot; if (bot && k.hp > 0) k.addXp(40 + p.score * 0.5); // 처치한 봇이 경험치 획득
    this.respawnLv = respawnLevel(p.level);
    this.spec = k && k.hp !== undefined ? k : null; this.specPos.x = p.x; this.specPos.y = p.y; // diep.io: 사망하면 나를 죽인 대상을 관전(대상이 죽으면 그 자리에 카메라 고정)
    const secs = Math.floor(this.clock - p.born), tm = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
    const art = k && k.kind && /^[aeiou]/.test(k.kind) ? 'an' : 'a';
    document.getElementById('dead-title').textContent = bot ? `You were killed by ${k.name}` : k && k.kind ? `You were killed by ${art} ${k.kind}` : 'You were destroyed';
    document.getElementById('result').textContent = `Score ${Math.floor(p.score)}   Level ${p.level}   Kills ${p.kills}   Time ${tm}` + '\n' + (bot ? `${k.name} · Lv ${k.level} ${k.def.n} · ` : '') + `Respawn at Lv ${this.respawnLv}`;
    const n2 = document.getElementById('nick2'); if (n2) n2.value = this.name;
    setTimeout(() => { if (this.state === 'dead') document.getElementById('dead').classList.remove('hidden'); }, 500);
  }
  upgrade(i) { if (this.state === 'play' && this.player.alive) this.player.upgrade(i); }
  devLevelUp() { // 개발자용: 다음 레벨 점수까지 즉시 지급 (포인트는 33점 규칙대로)
    const p = this.player; if (this.state !== 'play' || !p.alive) return;
    this.dev = true; // 한 번이라도 사용하면 개발자로 간주 (페이지를 새로고침하기 전까지 유지)
    if (p.level >= CFG.maxLevel) return;
    p.addXp(CFG.scoreAt[p.level + 1] - p.score);
  }

  pickName() { // 현재 존재하는 탱크와 겹치지 않는 동물 이름
    const used = new Set(this.bots.map(b => b.name)); used.add(this.name);
    const free = ANIMALS.filter(n => !used.has(n));
    return free.length ? free[(Math.random() * free.length) | 0] : ANIMALS[(Math.random() * ANIMALS.length) | 0] + ' ' + (2 + ((Math.random() * 8) | 0));
  }
  spawnPos() { // 둥지 밖에서 시작, 봇과는 겹치지 않을 정도(spawnGap)만 떨어짐
    const W = CFG.world, need = CFG.bots.spawnGap; let best = { x: MAP.lo + 600, y: MAP.lo + 600 }, bd = -1;
    for (let i = 0; i < 40; i++) {
      const x = rand(MAP.lo + 300, MAP.hi - 300), y = rand(MAP.lo + 300, MAP.hi - 300); if (inNest(x, y, 900)) continue; let md = 1e9; // 둥지 반경 + 크래셔 추적 거리(650) 밖에서 시작
      for (const b of this.bots) md = Math.min(md, Math.hypot(b.x - x, b.y - y));
      if (md > bd) { bd = md; best = { x, y }; } if (md >= need) break;
    }
    return best;
  }
  newCluster(old, first) { // 도형 군집의 위치/크기/종류/목표 개수를 새로 정함 (둥지와 다른 군집에서 떨어진 곳, 화면 밖)
    const K = CFG.clusters, W = CFG.world, c = old || {}; let best = null;
    for (let i = 0; i < 60 && !best; i++) {
      const r = rand(K.rMin, K.rMax), x = rand(MAP.lo + r + 150, MAP.hi - r - 150), y = rand(MAP.lo + r + 150, MAP.hi - r - 150);
      if (inNest(x, y, r + 300) || this.clusters.some(o => o !== c && Math.hypot(o.x - x, o.y - y) < K.minGap) || (!first && this.cam.visibleBase(x, y, r + 120))) continue;
      best = { x, y, r };
    }
    if (!best) { if (old) old.age = 0; return false; }
    const t = Math.random(), r = best.r;
    Object.assign(c, best, { type: t < 0.45 ? 'square' : t < 0.8 ? 'triangle' : 'mixed', age: 0, life: K.life * rand(0.8, 1.2), n: 0,
      target: Math.round(K.density * Math.PI * r * r * rand(0.9, 1.1)), spawned: 0, acc: 0, retired: false });
    c.grow = c.target / rand(K.growTime[0], K.growTime[1]); /* 성장 속도(개/초): 목표를 growTime 동안 나눠 채움 */
    if (!old) this.clusters.push(c);
    return true;
  }
  endCluster(c) { // 'grow'에서 군집을 없앰: 도형은 일반 도형이 되어 표류하고('free'), 'zone'이면 원래 군집 경계 안에 머묾(일반 도형으로 셈). 같은 위치에는 곧바로 새 군집이 아니라 면적 기준 군집 수에 맞춰 다른 곳에 새로 생김
    c.retired = true; if (CFG.clusters.release !== 'zone') for (const s of this.shapes) if (s.cl === c) s.cl = null;
    const i = this.clusters.indexOf(c); if (i >= 0) this.clusters.splice(i, 1);
  }
  spawnShape(anywhere, nest, type, cl) { // nest=true면 Pentagon Nest 안(오각형, type='alpha'는 알파 오각형), 아니면 둥지 밖(사각형/삼각형/가끔 오각형)
    const T = CFG.shapes, W = CFG.world, cx = W / 2; let x, y, n = 0;
    if (!type && cl) { const q = Math.random(); type = cl.type === 'square' ? (q < 0.85 ? 'square' : 'triangle') : cl.type === 'triangle' ? (q < 0.75 ? 'triangle' : 'square') : (q < 0.5 ? 'square' : q < 0.9 ? 'triangle' : 'pentagon'); }
    if (!type) { if (nest) type = 'pentagon'; else { let tot = 0; for (const k in T) tot += T[k].w; let r = Math.random() * tot; for (const k in T) { r -= T[k].w; if (r <= 0) { type = k; break; } } } }
    const s = T[type];
    do {
      if (nest) { const a = rand(0, TAU), d = (type === 'alpha' ? 0.25 : 0.93) * NEST.r * Math.sqrt(Math.random()); x = cx + Math.cos(a) * d; y = cx + Math.sin(a) * d; }
      else if (cl) { const a = rand(0, TAU), d = (cl.r - s.r) * Math.sqrt(Math.random()); x = cl.x + Math.cos(a) * d; y = cl.y + Math.sin(a) * d; }
      else { x = rand(MAP.lo + s.r, MAP.hi - s.r); y = rand(MAP.lo + s.r, MAP.hi - s.r); }
      n++;
    } while (((!nest && !cl && inNest(x, y, 80)) || (!anywhere && this.cam.visibleBase(x, y, s.r + 80)) || !this.shapeFree(x, y, s.r)) && n < 30);
    if (type !== 'alpha' && !this.shapeFree(x, y, s.r)) return false; // 30번 시도해도 빈 자리가 없으면 이번에는 생성하지 않음(다음 틱에 다시 시도). 알파 오각형은 항상 생성하고 아래 분리 처리에 맡김
    const t = rand(0, TAU), v = type === 'alpha' ? 4 : type === 'hexagon' ? 6 : rand(5, 22);
    this.shapes.push({ s, kind: s.name || type, nest: !!nest, cl: cl || null, x, y, r: s.r, hp: s.hp, maxHp: s.hp, dmg: s.dmg, a: rand(0, TAU), spin: rand(-0.6, 0.6), dx: Math.cos(t) * v, dy: Math.sin(t) * v, vx: 0, vy: 0, flash: 0, calm: 99 });
  }
  shapeFree(x, y, r) { // 새 도형이 기존 도형과 겹치지 않는지 (최소 간격 CFG.shapeGap)
    const gap = CFG.shapeGap;
    for (const s of this.shapes) { const m = s.r + r + gap; if (Math.abs(s.x - x) < m && Math.abs(s.y - y) < m && (s.x - x) ** 2 + (s.y - y) ** 2 < m * m) return false; }
    return true;
  }
  separateShapes() { // 도형끼리 겹치지 않게: x좌표로 정렬해 가까운 쌍만 검사 -> 겹치면 질량 비율로 밀어내고, 서로 다가가는 속도 성분은 탄성 충돌(반발 0.6)로 튕김
    const ord = this._ord || (this._ord = []), gap = CFG.shapeGap; ord.length = 0;
    for (const s of this.shapes) if (s.hp > 0) ord.push(s);
    ord.sort((a, b) => a.x - b.x);
    const LIM = 2 * CFG.shapes.alpha.r + gap; // 가장 큰 도형 기준 검사 범위
    for (let i = 0; i < ord.length; i++) {
      const a = ord[i], ma = a.r * a.r * (a.s.mass || 1);
      for (let j = i + 1; j < ord.length; j++) {
        const b = ord[j], dx = b.x - a.x; if (dx > LIM) break;
        const dy = b.y - a.y, min = a.r + b.r + gap, d2 = dx * dx + dy * dy; if (d2 >= min * min) continue;
        const ok = d2 > 0.0001, d = ok ? Math.sqrt(d2) : 0.01, nx = ok ? dx / d : 1, ny = ok ? dy / d : 0;
        const mb = b.r * b.r * (b.s.mass || 1), ov = (min - d) * 0.6, wa = mb / (ma + mb), wb = ma / (ma + mb); // 무거운 쪽은 덜 밀림
        a.x -= nx * ov * wa; a.y -= ny * ov * wa; b.x += nx * ov * wb; b.y += ny * ov * wb;
        for (const [kx, ky] of [['dx', 'dy'], ['vx', 'vy']]) { // 표류 방향(dx,dy)과 현재 속도(vx,vy) 모두 처리
          const va = a[kx] * nx + a[ky] * ny, vb = b[kx] * nx + b[ky] * ny;
          if (va > vb) { const k = 1.6 * (va - vb) / (1 / ma + 1 / mb); a[kx] -= k / ma * nx; a[ky] -= k / ma * ny; b[kx] += k / mb * nx; b[ky] += k / mb * ny; }
        }
      }
    }
  }
  spawnCrasher(anywhere) {
    const W = CFG.world, p = this.player; let x, y, n = 0;
    do { const a = rand(0, TAU), d = NEST.r * 0.95 * Math.sqrt(Math.random()); x = W / 2 + Math.cos(a) * d; y = W / 2 + Math.sin(a) * d; n++; }
    while (!anywhere && p.alive && Math.hypot(x - p.x, y - p.y) < 500 && n < 20);
    this.crashers.push(new Crasher(Math.random() < CFG.nest.largeRatio, x, y));
  }
  spawnBot(pl) { // 맵 전체 무작위(화면 밖), 15레벨 이상은 생성하지 않음 (성장은 파밍으로만)
    const B = CFG.bots, lv = Math.random() < 0.5 ? 1 : clamp(Math.round(pl * rand(0.3, 0.7)), 1, B.maxSpawnLevel); // 절반은 1레벨, 절반은 플레이어 레벨의 0.3~0.7배(최대 maxSpawnLevel)
    const cam = this.cam;
    for (let i = 0; i < 40; i++) { // 맵 전체에서 완전 무작위 위치 (화면 안과, 15레벨 미만 봇의 둥지 근처만 제외)
      const x = rand(MAP.lo + 150, MAP.hi - 150), y = rand(MAP.lo + 150, MAP.hi - 150);
      if (cam.visibleBase(x, y, 150) || (lv < 15 && inNest(x, y, 900))) continue;
      this.bots.push(new Bot(x, y, 1, this.pickName(), lv)); return true; // 모두 1레벨로 시작, 원래 시작 레벨(lv)은 목표 레벨로 두고 도달할 때까지 성장 가속
    }
    return false;
  }
  shoot(o, sp, b, bi) {
    b = b || DEF_BARRELS[0]; // 포신 끝(+옆 오프셋)에서 생성, 퍼짐은 발사 방향에만 적용
    const a0 = o.angle + (b.ang || 0), tip = b.len * o.r * 0.92, off = (b.off || 0) * o.r;
    const a = a0 + (sp.spread ? rand(-sp.spread, sp.spread) : 0), c = Math.cos(a), s = Math.sin(a);
    if (this.bullets.length > 500) this.bullets.shift();
    this.bullets.push({ x: o.x + Math.cos(a0) * tip - Math.sin(a0) * off, y: o.y + Math.sin(a0) * tip + Math.cos(a0) * off, vx: c * sp.bSpeed, vy: s * sp.bSpeed, v0: sp.bSpeed, r: sp.size * (b.size || 1), dmg: sp.dmg * (b.dmg || 1), pen: sp.pen * (b.pen || 1), pen0: sp.pen * (b.pen || 1), life: sp.life * (b.life || 1), owner: o, col: o.col, out: o.out, hits: [] });
    if (o.kicks) o.kicks[bi] = o.r * 0.3; else o.kick = o.r * 0.3;
    return a;
  }
  chooseClass(k) {
    const p = this.player;
    if (this.state === 'play' && p.alive && CFG.classes[k] && classChoices(p.cls, p.level).includes(k)) { p.setClass(k); this.fx.burst(p.x, p.y, CFG.classes[k].c, 16, 260); }
  }
  damage(e, d, by) { if (e.hurt) e.hurt(d, by); else { e.hp -= d; e.flash = 0.12; e.lastHit = by; e.calm = 0; } }
  onKill(e) { // 마지막으로 피해를 준 탱크가 즉시 경험치 획득 (도형은 고정값, 탱크는 점수에 비례)
    const k = e.lastHit; if (k && k.addXp && k.hp > 0) k.addXp(e.isBot ? 40 + e.score * 0.5 : k.isBot ? k.catchGain(e.s.xp * CFG.bots.shapeXp) : e.s.xp); // 봇이 도형/크래셔로 얻는 점수는 shapeXp 배율 적용(목표 레벨 미만이면 목표 레벨까지만 가속)
    if (e.isBot && k === this.player) { this.note(`You've killed ${e.name}`); k.kills++; } // diep.io식 킬 메시지
    if (this.dev && e.isBot && k !== this.player) { // 개발자 모드: 봇 사망 로그(봇끼리, 크래셔·도형에게). 플레이어가 처치한 경우는 위의 킬 메시지가 있음
      const nm = `${e.name} (Lv${e.level})`;
      this.devNote(k && k.isBot ? `${k.name} (Lv${k.level}) killed ${nm}` : `${nm} was killed by ${k && k.kind ? (/^[aeiou]/.test(k.kind) ? 'an ' : 'a ') + k.kind : 'unknown'}`);
    }
    this.fx.burst(e.x, e.y, e.col || e.s.c, 10 + (e.r >> 2), 220);
  }
  devNote(text) { this.devLog.unshift({ t: 6, text }); if (this.devLog.length > 6) this.devLog.pop(); } // 개발자용 킬로그(최대 6줄, 6초)
  note(text) { this.notes.unshift({ t: 4, text }); if (this.notes.length > 4) this.notes.pop(); }
  collisionPass() { // 충돌 틱(0.04초)마다 몸통 충돌 처리
    this.separateShapes(); // 도형끼리 겹침 해소
    const p = this.player, tanks = this._tanks; tanks.length = 0;
    if (p.alive) tanks.push(p); for (const b of this.bots) if (!b.gone && b.hp > 0) tanks.push(b);
    for (const t of tanks) {
      if (t.hp <= 0) continue;
      for (const s of this.shapes) if (s.hp > 0 && Math.abs(s.x - t.x) < s.r + t.r && Math.abs(s.y - t.y) < s.r + t.r) this.bodyContact(t, s);
      for (const c of this.crashers) if (c.hp > 0 && Math.abs(c.x - t.x) < c.r + t.r && Math.abs(c.y - t.y) < c.r + t.r) this.bodyContact(t, c);
    }
    for (let i = 0; i < tanks.length; i++) for (let j = i + 1; j < tanks.length; j++) this.bodyContact(tanks[i], tanks[j]);
  }
  bodyContact(a, b) { // diep.io: 충돌 틱마다 '한 번의 타격' 피해를 서로 주고, 질량(크기)에 따라 튕겨 나감
    const c = collide(a, b); if (!c || c.pen < 1) return;
    const bT = !!b.up, toB = a.s.body * (bT ? 6 : 4), toA = bT ? b.s.body * 6 : b.dmg; // (Body Damage 포인트+5) x (대 탱크 6 / 대 도형 4)
    a.hurt(toA, b); this.damage(b, toB, a);
    const BP = CFG.bodyPhys, sm = bT || BP.mode === 'legacy' ? 1 : (BP.shapeMass[b.kind] || 1), ma = a.r * a.r, mb = ((b.s && b.s.mass) || 1) * b.r * b.r * sm, im = 1 / ma + 1 / mb; /* 도형 질량 배율(작은 도형만 가볍게) */
    const vn = (b.vx - a.vx) * c.nx + (b.vy - a.vy) * c.ny;
    if (vn < 0) { const j = -1.6 * vn / im; a.vx -= j * c.nx / ma; a.vy -= j * c.ny / ma; b.vx += j * c.nx / mb; b.vy += j * c.ny / mb; }
    const cor = c.pen * 0.65, wa = (1 / ma) / im, wb = (1 / mb) / im; // 가벼운 쪽이 더 많이 밀려남
    a.x -= c.nx * cor * wa; a.y -= c.ny * cor * wa; b.x += c.nx * cor * wb; b.y += c.ny * cor * wb;
  }
  bulletVs(b, arr, u) { // 총알이 대상과 겹쳐 있는 동안 매 프레임 서로 피해를 교환 (u = 프레임 시간 ÷ 0.04초 = 이번 프레임이 차지하는 틱 수)
    for (const e of arr) {
      if (e === b.owner || e.hp <= 0) continue;
      if (Math.abs(e.x - b.x) > e.r + b.r || Math.abs(e.y - b.y) > e.r + b.r || !touch(b, e)) continue;
      if (!this.bulletExchange(b, e, u)) return false;
    }
    return true;
  }
  bulletExchange(b, e, u) { // 접촉 틱 교환: 대상은 총알 피해를, 총알은 대상의 방어값(탱크: 5+Body Damage 포인트, 도형: bcost)을 틱마다 잃음. 총알 체력이 모자라면 남은 비율만큼만 교환하고 소멸
    const cost = e.up ? e.s.body : e.s.bcost, loss = cost * u, f = Math.min(1, b.pen / loss), BR = CFG.bulletRange;
    let dm = b.dmg * u * f;
    if (BR.mode !== 'legacy' && (e.up || BR.target === 'all')) { // 한 대상에 주는 총 피해를 Dmin~Dmax로 제한: 누적 = clamp(접촉 틱 교환 누적, Dmin, Dmax)
      const rs = b.rs || (b.rs = []); let r = null; for (const x of rs) if (x.e === e) { r = x; break; } if (!r) { r = { e, rate: 0, dealt: 0 }; rs.push(r); }
      const df = (b.owner && b.owner.def) || {}, lo = b.dmg * BR.tMin * (df.rangeMin || 1), hi = Math.max(lo, b.dmg * (BR.tMaxA + BR.tMaxB * b.pen0 / CFG.bulletHp) * (df.rangeMax || 1));
      r.rate += dm; const nd = clamp(r.rate, lo, hi); dm = Math.max(0, nd - r.dealt); r.dealt += dm;
    }
    this.damage(e, dm, b.owner); b.pen -= loss * f; if (e.s.solid) b.pen = 0;
    if (!b.hits.includes(e)) { b.hits.push(e); this.fx.burst(b.x, b.y, e.col || e.s.c, 2, 90); } // 처음 닿을 때만 파티클
    this.bulletPush(b, e, u * f);
    return b.pen > 0;
  }
  bulletPush(b, e, w) { // 질량 모델: 겹쳐 있는 동안 대상이 총알 방향으로 밀리고(w = 교환 비중 u × f), 총알은 속력은 그대로 방향만 바깥으로 꺾임
    const sp = Math.hypot(b.vx, b.vy); if (sp < 1 || w <= 0) return;
    const tx = b.vx / sp, ty = b.vy / sp, dx = e.x - b.x, dy = e.y - b.y, dd = Math.hypot(dx, dy) || 1, nx = dx / dd, ny = dy / dd;
    const mb = b.r * b.r * (b.dmg / CFG.bulletBaseDmg), mt = e.pen0 !== undefined ? e.r * e.r * (e.dmg / CFG.bulletBaseDmg) : e.r * e.r * ((e.s && e.s.mass) || 1), share = mb / (mb + mt); // 총알 질량 = 크기² x 피해 비율, 대상 질량 = 반지름² x 질량 배수
    if (!(e.invT > 0)) { // 무적 대상은 밀리지 않음
      const closing = (b.vx - e.vx) * tx + (b.vy - e.vy) * ty, cp = (b.owner && b.owner.def && b.owner.def.push) || 1; // 다가오는 속도, 클래스별 배율(기본 1)
      if (closing > 0) { const kp = e.pen0 !== undefined ? CFG.pushBullet : (e.up || e.kind === 'crasher') ? CFG.pushTank : CFG.pushShape; // 대상 종류별 배율(총알 / 탱크·크래셔 / 도형)
        const dv = Math.min(closing * share * CFG.bulletPush * kp * cp * w / (e.resist || 1), CFG.bulletPushCap); e.vx += tx * dv; e.vy += ty * dv; }
    }
    const cross = tx * ny - ty * nx, th = clamp(CFG.bulletDeflect * (1 - share) * cross * w, -0.3, 0.3), c = Math.cos(-th), sn = Math.sin(-th); // 정면(cross 0)이면 직진, 비껴 맞으면 대상 중심 반대쪽으로 꺾임
    const vx = b.vx; b.vx = vx * c - b.vy * sn; b.vy = vx * sn + b.vy * c;
  }
  buildShapeGrid() { // 도형을 256px 칸에 담은 격자(총알 충돌용). 배열을 재사용해 쓰레기 생성을 줄임
    const CS = 256, grid = this._sgrid || (this._sgrid = new Map()), used = this._sused || (this._sused = []);
    for (const a of used) a.length = 0; used.length = 0;
    for (const s of this.shapes) {
      if (s.hp <= 0) continue; const key = (Math.floor(s.x / CS) + 8) * 2048 + Math.floor(s.y / CS) + 8; let a = grid.get(key);
      if (!a) { a = []; grid.set(key, a); } if (!a.length) used.push(a); a.push(s);
    }
    return grid;
  }
  bulletVsShapes(b, grid, u) { // 총알 주변 칸의 도형만 검사 (가장 큰 도형 반지름 + 총알 반지름 범위 안의 칸)
    const CS = 256, R = this._maxShapeR || (this._maxShapeR = Math.max(...Object.values(CFG.shapes).map(s => s.r))), reach = R + b.r;
    const x0 = Math.floor((b.x - reach) / CS) + 8, x1 = Math.floor((b.x + reach) / CS) + 8, y0 = Math.floor((b.y - reach) / CS) + 8, y1 = Math.floor((b.y + reach) / CS) + 8;
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const a = grid.get(cx * 2048 + cy); if (a && !this.bulletVs(b, a, u)) return false; }
    return true;
  }
  updateBullets(dt) {
    const p = this.player, W = CFG.world, u = dt / TICK; let j = 0; const grid = this.buildShapeGrid();
    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let alive = b.life > 0 && b.x > MAP.lo && b.y > MAP.lo && b.x < MAP.hi && b.y < MAP.hi;
      if (alive) {
        alive = this.bulletVsShapes(b, grid, u) && this.bulletVs(b, this.bots, u) && this.bulletVs(b, this.crashers, u);
        if (alive && b.owner !== p && p.alive && touch(b, p)) alive = this.bulletExchange(b, p, u); // 플레이어도 봇의 총알과 같은 규칙으로 교환
      }
      if (alive) this.bullets[j++] = b;
    }
    this.bullets.length = j;
    // 서로 다른 탱크의 총알끼리 충돌: 관통력 비교
    const bl = this.bullets, n = bl.length; let dead = false;
    for (let i = 0; i < n; i++) {
      const a = bl[i]; if (a.pen <= 0) continue;
      for (let k = i + 1; k < n; k++) {
        const c = bl[k]; if (c.pen <= 0 || c.owner === a.owner) continue;
        if (Math.abs(a.x - c.x) > 120 || Math.abs(a.y - c.y) > 120) continue;
        // 한 프레임 동안의 상대 이동 경로로 판정 (고속 총알이 서로 통과하는 터널링 방지)
        const px = (c.x - c.vx * dt) - (a.x - a.vx * dt), py = (c.y - c.vy * dt) - (a.y - a.vy * dt), rx = c.vx - a.vx, ry = c.vy - a.vy;
        const rr = rx * rx + ry * ry, tt = rr > 0 ? clamp(-(px * rx + py * ry) / rr, 0, dt) : 0, ex = px + rx * tt, ey = py + ry * tt, R = a.r + c.r;
        if (ex * ex + ey * ey > R * R) continue;
        if (CFG.bulletClashMode === 'instant') this.bulletClash(a, c); else this.bulletContact(a, c, u); if (CFG.bulletClashMode === 'instant' || a.pen <= 0 || c.pen <= 0) this.fx.burst((a.x + c.x) / 2, (a.y + c.y) / 2, '#ffffff', 2, 80); dead = true;
        if (a.pen <= 0) break;
      }
    }
    if (dead) { let m = 0; for (const b of bl) if (b.pen > 0) bl[m++] = b; bl.length = m; }
  }
  bulletContact(a, c, u) { // 총알끼리(새 방식): 탱크·도형과 같은 접촉 틱 교환. 겹쳐 있는 동안 매 틱 서로 상대의 피해량만큼 체력을 잃고(체력이 먼저 바닥나는 쪽까지만), 질량 모델로 서로를 밀고 꺾음
    if (a.v0 === undefined) a.v0 = Math.hypot(a.vx, a.vy); if (c.v0 === undefined) c.v0 = Math.hypot(c.vx, c.vy); // 처음 속도(속도 하한 계산용)
    const ax = a.vx, ay = a.vy, cx = c.vx, cy = c.vy; // 밀리기 전 속도(속도 하한을 적용할 때 방향 보존용)
    const la = c.dmg * u, lc = a.dmg * u, f = Math.min(1, a.pen / la, c.pen / lc);
    a.pen -= la * f; c.pen -= lc * f; if (a.pen < 1e-6) a.pen = 0; if (c.pen < 1e-6) c.pen = 0;
    const w = u * f; this.bulletPush(a, c, w); this.bulletPush(c, a, w); // 서로를 대상으로 한 번씩(pushBullet 배율 적용)
    const fl = CFG.bulletMinSpeed, kd = CFG.bulletClashKeepDir;
    for (const [bb, bx, by] of [[a, ax, ay], [c, cx, cy]]) {
      if (bb.pen <= 0) continue;
      if (kd) { // 방향 고정: 충돌 전 방향으로 되돌리고, 속도는 밀린 속도의 원래 방향 성분을 [처음 속도 x bulletMinSpeed, 처음 속도]로 제한(역방향으로 되튀지 않고, 처음보다 빨라지지 않음)
        const o = Math.hypot(bx, by); if (o < 1e-6) continue; const dx = bx / o, dy = by / o, proj = bb.vx * dx + bb.vy * dy, sp = Math.min(bb.v0, Math.max(proj, bb.v0 * fl, 0));
        bb.vx = dx * sp; bb.vy = dy * sp; continue;
      }
      if (fl > 0) { // 이전 방식: 속도가 처음의 fl 밑으로 떨어지지 않게(느려진 총알이 겹침이 길어져 정지·소멸하는 되먹임 방지)
        const sp = Math.hypot(bb.vx, bb.vy), mn = bb.v0 * fl; if (sp >= mn) continue;
        if (sp > 1e-6) { bb.vx *= mn / sp; bb.vy *= mn / sp; } else { const o = Math.hypot(bx, by) || 1; bb.vx = bx / o * mn; bb.vy = by / o * mn; }
      }
    }
  }
  bulletClash(a, b) {
    // diep.io식: 충돌 중 서로의 현재 피해량(최대 피해 x 체력 비율)만큼 상대 체력을 깎는다.
    // 이 연속 교환의 해석해는 "내구도 = 피해량 x 체력"이 큰 쪽이 생존(남는 체력은 아래 식), 같으면 둘 다 소멸
    const ka = a.dmg / a.pen0, kb = b.dmg / b.pen0, qa = ka * a.pen * a.pen, qb = kb * b.pen * b.pen;
    if (Math.abs(qa - qb) <= CFG.clashTol * Math.max(qa, qb)) { a.pen = b.pen = 0; return; }
    if (qa > qb) { a.pen = Math.sqrt((qa - qb) / ka); b.pen = 0; } else { b.pen = Math.sqrt((qb - qa) / kb); a.pen = 0; }
  }
  reap() {
    const sweep = (arr, onDie) => { let j = 0; for (const e of arr) { if (e.gone) continue; if (e.hp <= 0) onDie(e); else arr[j++] = e; } arr.length = j; };
    sweep(this.shapes, e => this.onKill(e)); sweep(this.bots, e => this.onKill(e)); sweep(this.crashers, e => this.onKill(e));
  }
  update(dt) {
    const p = this.player, W = CFG.world, inp = this.input, cx = W / 2; this.clock += dt; if (dt > 0) this.fps += (1 / dt - this.fps) * 0.05;
    { this.nTanks += (this.plannedTanks() - this.nTanks) * (1 - Math.exp(-dt / CFG.map.smooth)); // 실제 탱크 수가 아닌 계획된 탱크 수를 따라 시작 직후(봇이 한 마리씩 소환되는 동안)에 맵이 줄지 않음
    const tgt = mapTarget(this.nTanks), stp = CFG.map.rate * dt; setMapSize(MAP.size + clamp(tgt - MAP.size, -stp, stp)); } // 탱크 수는 30초 평균으로 완만하게 반영(봇이 잠깐 죽어도 맵이 출렁이지 않음) // 맵은 전체 탱크 수(플레이어+봇)에 맞춰 서서히 확대/축소
    if (p.alive && p.invT > 0) { p.invT -= dt; const [iax, iay] = inp.axis(); if (iax || iay || inp.fire) p.invT = 0; } // 이동하거나 발사하면 스폰 무적 해제 (diep.io: 스폰 후 최대 10초 무적)
    if (p.alive) { p.move(dt, inp); this.cam.follow(p, dt, p.level, p.fov); p.aim(inp, this.cam); p.shoot(dt, inp, this); }
    else { // 사망/시작 화면: 처치한 대상을 부드럽게 따라가고, 대상이 사라지면 마지막 위치에 카메라가 머무름
      const t = this.spec && this.spec.hp > 0 && !this.spec.gone ? this.spec : null;
      if (t) { this.specPos.x = t.x; this.specPos.y = t.y; }
      this.cam.follow(this.specPos, dt, t && t.level ? t.level : p.level, t && t.fov ? t.fov : p.fov, 4);
    }
    for (const s of this.shapes) {
      s.vx += (s.dx - s.vx) * Math.min(1, 1.5 * dt); s.vy += (s.dy - s.vy) * Math.min(1, 1.5 * dt);
      s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.spin * dt; s.flash = Math.max(0, s.flash - dt); s.calm += dt;
      { const lo = MAP.lo + s.r, hi = MAP.hi - s.r; // 맵 경계(움직이는 벽)에서 안쪽으로 밀어내고, 바깥으로 향할 때만 반사
        if (s.x < lo) { s.x = lo; if (s.dx < 0) s.dx = -s.dx; if (s.vx < 0) s.vx = -s.vx; } else if (s.x > hi) { s.x = hi; if (s.dx > 0) s.dx = -s.dx; if (s.vx > 0) s.vx = -s.vx; }
        if (s.y < lo) { s.y = lo; if (s.dy < 0) s.dy = -s.dy; if (s.vy < 0) s.vy = -s.vy; } else if (s.y > hi) { s.y = hi; if (s.dy > 0) s.dy = -s.dy; if (s.vy > 0) s.vy = -s.vy; } }
      if (s.nest) { // 둥지 안 도형은 둥지 경계에서 튕김
        const dx = s.x - cx, dy = s.y - cx, d = Math.hypot(dx, dy), lim = NEST.r - s.r;
        if (d > lim) { const nx = dx / d, ny = dy / d, a = s.dx * nx + s.dy * ny, b = s.vx * nx + s.vy * ny; s.x = cx + nx * lim; s.y = cx + ny * lim; if (a > 0) { s.dx -= 2 * a * nx; s.dy -= 2 * a * ny; } if (b > 0) { s.vx -= 2 * b * nx; s.vy -= 2 * b * ny; } }
      }
      else if (s.cl) { // 군집 안 도형은 군집 경계에서 튕김
        const c = s.cl, dx = s.x - c.x, dy = s.y - c.y, d = Math.hypot(dx, dy), lim = c.r - s.r;
        if (d > lim) { const nx = dx / d, ny = dy / d, a = s.dx * nx + s.dy * ny, b = s.vx * nx + s.vy * ny; s.x = c.x + nx * lim; s.y = c.y + ny * lim; if (a > 0) { s.dx -= 2 * a * nx; s.dy -= 2 * a * ny; } if (b > 0) { s.vx -= 2 * b * nx; s.vy -= 2 * b * ny; } }
      }
      if (s.s.regen && s.calm > 8 && s.hp < s.maxHp) s.hp = Math.min(s.maxHp, s.hp + s.maxHp * s.s.regen * dt); // 알파 오각형·육각형은 일정 시간 맞지 않으면 체력 재생
    }
    for (const c of this.crashers) c.update(dt, this);
    for (const b of this.bots) b.update(dt, this);
    this.ctick += dt; while (this.ctick >= TICK) { this.ctick -= TICK; this.collisionPass(); }
    this.updateBullets(dt);
    for (const n of this.notes) n.t -= dt;
    while (this.notes.length && this.notes[this.notes.length - 1].t <= 0) this.notes.pop();
    for (const n of this.devLog) n.t -= dt; while (this.devLog.length && this.devLog[this.devLog.length - 1].t <= 0) this.devLog.pop();
    this.reap(); this.fx.update(dt);
    // 스포너
    const B = CFG.bots, pl = p.alive ? p.level : 1, target = Math.min(B.max, B.base + Math.floor(pl * B.perLevel)); this.spawnT -= dt;
    if (this.spawnT <= 0 && this.bots.length < target) this.spawnT = this.spawnBot(pl) ? B.spawnEvery : 0.5;
    this.shapeT -= dt;
    if (this.shapeT <= 0) {
      this.shapeT = 0.4; let out = 0, nestP = 0, alpha = 0, hex = 0; for (const c of this.clusters) c.n = 0;
      for (const s of this.shapes) { if (s.nest) { if (s.kind === 'alpha pentagon') alpha++; else if (s.kind === 'hexagon') hex++; else nestP++; } else if (s.cl && !s.cl.retired) s.cl.n++; else out++; } /* 군집이 끝난 뒤 경계 안에 남은('zone') 도형은 일반 도형으로 셈 */
      const KC = CFG.clusters, gm = KC.mode !== 'legacy';
      for (const c of this.clusters.slice()) { /* 'grow'에서는 순회 중 군집을 없애므로 복사본을 돎 */
        c.age += 0.4;
        if (c.age > c.life || (!gm && c.age > 30 && c.n < c.target * KC.depleted) || c.x - c.r < MAP.lo + 100 || c.x + c.r > MAP.hi - 100 || c.y - c.r < MAP.lo + 100 || c.y + c.r > MAP.hi - 100 || Math.hypot(c.x - cx, c.y - cx) < NEST.r + c.r) { if (gm) this.endCluster(c); else { for (const s of this.shapes) if (s.cl === c) s.cl = null; this.newCluster(c); } continue; } // 수명 종료·경계·둥지 겹침(legacy는 소진도): 'grow'는 군집을 없애고 도형은 일반 도형이 됨, legacy는 다른 곳으로 이동
        if (gm) { // 성장: 초당 c.grow개를 누적해 정수만큼 생성하고 생성 성공한 만큼 spawned를 올림. spawned가 목표에 닿으면 군집 종료
          c.acc = Math.min(c.acc + c.grow * 0.4, 2);
          for (let g = Math.floor(c.acc + 1e-9); c.spawned < c.target && g-- > 0;) if (this.spawnShape(false, false, null, c) !== false) { c.acc -= 1; c.spawned++; c.n++; }
          if (c.spawned >= c.target) this.endCluster(c);
          continue;
        }
        c.acc = Math.min((c.acc || 0) + CFG.clusters.refill * 0.4, 2); /* 보충 속도: 초당 refill개를 누적해 정수만큼 생성(밀린 만큼 한꺼번에 몰리지 않도록 한 틱 최대 2개) */
        for (let g = Math.floor(c.acc + 1e-9); c.n < c.target && g-- > 0;) if (this.spawnShape(false, false, null, c) !== false) { c.acc -= 1; c.n++; }
      }
      { // 군집 수는 맵 면적에 비례 (경계값에서 늘었다 줄었다 하지 않도록 0.3 히스테리시스)
        const want = Math.min(CFG.clusters.maxCount, MAP.size * MAP.size / CFG.clusters.areaPerCluster);
        if (this.clusters.length < Math.max(1, Math.floor(want + 0.35))) this.newCluster(null, false);
        else if (this.clusters.length > Math.max(1, Math.ceil(want - 0.35))) { // 줄어야 하면 화면 밖에 있는 군집 중 도형이 가장 적은 것을 제거(남은 도형은 일반 도형이 됨)
          let best = null; for (const c of this.clusters) if (!this.cam.visibleBase(c.x, c.y, c.r + 100) && (!best || c.n < best.n)) best = c;
          if (best) { for (const sh of this.shapes) if (sh.cl === best) sh.cl = null; this.clusters.splice(this.clusters.indexOf(best), 1); }
        }
      }
      const freeT = Math.round(CFG.shapeDensity * MAP.size * MAP.size); // 맵이 줄면 일반 도형도 화면 밖에서 서서히 줄임
      if (out > freeT * 1.15) {
        if (gm) { for (let i = 0, rm = 0; i < this.shapes.length && rm < 2;) { const sh = this.shapes[i]; if (!sh.nest && (!sh.cl || sh.cl.retired) && !this.cam.visibleBase(sh.x, sh.y, sh.r + 80)) { this.shapes.splice(i, 1); rm++; out--; } else i++; } } /* 'grow': 오래된 도형부터 지움(막 풀린 군집 도형이 먼저 지워지지 않게) */
        else for (let i = this.shapes.length - 1, rm = 0; i >= 0 && rm < 2; i--) { const sh = this.shapes[i]; if (!sh.nest && !sh.cl && !this.cam.visibleBase(sh.x, sh.y, sh.r + 80)) { this.shapes.splice(i, 1); rm++; out--; } }
      }
      for (let g = 3; out < freeT && g-- > 0; out++) this.spawnShape(false);
      const nestT = nestPent(); // 둥지가 줄어들면 화면 밖의 초과 오각형을 서서히 제거
      if (nestP > nestT * 1.15) for (let i = this.shapes.length - 1, rm = 0; i >= 0 && rm < 2; i--) { const sh = this.shapes[i]; if (sh.nest && sh.kind === 'pentagon' && !this.cam.visibleBase(sh.x, sh.y, sh.r + 80)) { this.shapes.splice(i, 1); rm++; nestP--; } }
      for (let g = 2; nestP < nestT && g-- > 0; nestP++) this.spawnShape(false, true);
      if (alpha < CFG.nest.alphaMax) { this.alphaT -= 0.4; if (this.alphaT <= 0) { this.spawnShape(true, true, 'alpha'); this.alphaT = CFG.nest.alphaRespawn; } } else this.alphaT = CFG.nest.alphaRespawn; // 알파는 사라진 뒤 일정 시간 후 재등장
      if (hex < CFG.nest.hexagons) { this.hexT -= 0.4; if (this.hexT <= 0) { this.spawnShape(false, true, 'hexagon'); this.hexT = CFG.nest.hexRespawn; } } else this.hexT = CFG.nest.hexRespawn; // 육각형도 처치 후 일정 시간 뒤 하나씩 재등장
    }
    this.crasherT -= dt; if (this.crasherT <= 0) { this.crasherT = 1.5; if (this.crashers.length < nestCrash()) this.spawnCrasher(false); }
  }
  draw() {
    const ctx = this.ctx, cam = this.cam, W = CFG.world, p = this.player, G = CFG.grid;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.fillStyle = '#b3b3b3'; ctx.fillRect(0, 0, this.W, this.H);
    ctx.save(); cam.apply(ctx); ctx.fillStyle = '#cdcdcd'; ctx.fillRect(MAP.lo, MAP.lo, MAP.size, MAP.size);
    if (this.dev) { ctx.beginPath(); ctx.arc(W / 2, W / 2, NEST.r, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.07)'; ctx.fill(); } // Pentagon Nest 바닥 (개발자 모드에서만 표시)
    if (this.dev) for (const c of this.clusters) { if (!cam.visible(c.x, c.y, c.r)) continue; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fillStyle = c.type === 'square' ? 'rgba(255,214,60,.07)' : c.type === 'triangle' ? 'rgba(255,90,90,.06)' : 'rgba(110,130,255,.06)'; ctx.fill(); } // 개발자 모드에서만 도형 군집 바닥 표시
    const hw = cam.w / 2 / cam.zoom, hh = cam.h / 2 / cam.zoom, x0 = Math.max(MAP.lo, cam.x - hw), x1 = Math.min(MAP.hi, cam.x + hw), y0 = Math.max(MAP.lo, cam.y - hh), y1 = Math.min(MAP.hi, cam.y + hh);
    ctx.beginPath(); for (let x = Math.ceil(x0 / G) * G; x <= x1; x += G) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); } for (let y = Math.ceil(y0 / G) * G; y <= y1; y += G) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    ctx.strokeStyle = 'rgba(0,0,0,.039)'; ctx.lineWidth = 1; ctx.stroke(); // 격자선 색: 배경 #cdcdcd 위에서 #c5c5c5가 되는 투명도(diep.io 캡처 측정). 투명도를 써서 개발자 모드의 둥지·군집 바닥 위에서도 겹쳐 보임
    for (const s of this.shapes) {
      if (!cam.visible(s.x, s.y, s.r)) continue;
      poly(ctx, s.x, s.y, s.r, s.s.n, s.a, s.s.c, s.s.o); if (s.flash > 0) poly(ctx, s.x, s.y, s.r, s.s.n, s.a, `rgba(255,60,60,${Math.min(0.5, s.flash * 4)})`);
      if (s.hp < s.maxHp) hpbar(ctx, s);
    }
    for (const c of this.crashers) {
      if (!cam.visible(c.x, c.y, c.r + 10)) continue;
      poly(ctx, c.x, c.y, c.r, 3, c.angle, c.s.c, c.s.o); if (c.flash > 0) poly(ctx, c.x, c.y, c.r, 3, c.angle, `rgba(255,60,60,${Math.min(0.5, c.flash * 4)})`);
      if (c.hp < c.maxHp) hpbar(ctx, c);
    }
    for (const b of this.bullets) if (cam.visible(b.x, b.y, b.r)) disc(ctx, b.x, b.y, b.r, b.col, b.out);
    for (const e of this.bots) { if (!cam.visible(e.x, e.y, e.r + 30)) continue; if (e.invT > 0) ctx.globalAlpha = 0.45 + 0.25 * Math.sin(this.clock * 8 + e.x); drawTank(ctx, e, e.col, e.out, true); ctx.globalAlpha = 1; if (e.hp < e.maxHp) hpbar(ctx, e); label(ctx, this.dev && this.devPanel ? `${e.name}  ${e.pt.n}  ${e.stateTag()}${e.rTag()}` : e.name, e.x, e.y - e.r - 28, 13, 'center'); label(ctx, `Lv ${e.level} ${e.def.n}`, e.x, e.y - e.r - 13, 11, 'center'); } // 개발자 모드(F2 패널이 켜져 있을 때)에는 이름 옆에 성격 유형, 현재 행동, 전투 우위 R을 함께 표시
    if (p.alive) { if (p.invT > 0) ctx.globalAlpha = 0.45 + 0.25 * Math.sin(this.clock * 8); drawTank(ctx, p, p.col, p.out, true); ctx.globalAlpha = 1; if (p.hp < p.maxHp) hpbar(ctx, p); label(ctx, p.name, p.x, p.y - p.r - 14, 14, 'center'); } // 무적 중에는 반투명하게 깜빡임
    this.fx.draw(ctx, cam); ctx.restore();
    if (this.state === 'play') this.ui.draw(ctx, this.W, this.H);
    else if (this.state === 'dead' && this.spec && this.spec.hp > 0) label(ctx, 'Spectating ' + (this.spec.name || this.spec.kind), this.W / 2, 36, 16, 'center');
  }
}

/* ============ 메인 루프 (delta time, 최대 50ms로 제한) ============ */
let game, last = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
  game.update(dt); game.draw(); requestAnimationFrame(frame);
}
game = new Game(document.getElementById('c'));
document.getElementById('play').onclick = () => game.start();
document.getElementById('again').onclick = () => game.start();
{ const ve = document.getElementById('ver'); if (ve) ve.textContent = 'v' + BUILD_ID; } // 화면 왼쪽 아래의 버전 표시(현재 파일의 내용 해시 앞 7자리, 최신 파일인지 확인용)
for (const id of ['nick', 'nick2']) document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') game.start(); });
requestAnimationFrame(frame);
