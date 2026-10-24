const noop=()=>{};
const ctx=new Proxy({}, {get:(t,k)=>k==='measureText'?()=>({width:0}):noop, set:()=>true});
const els={};
const el=id=>els[id]||(els[id]={value:'',classList:{add:noop,remove:noop},addEventListener:(n,f)=>{(global.__ev=global.__ev||{})[n]=f},getContext:()=>ctx,set onclick(f){},textContent:''});
global.document={getElementById:el};
global.window=global;global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
const L={};global.addEventListener=(n,f)=>{(L[n]=L[n]||[]).push(f)};
global.requestAnimationFrame=noop;global.setTimeout=noop;
global.performance={now:()=>Date.now()};
const src=require('fs').readFileSync('game.js','utf8')+'\n;globalThis.__g=()=>game;globalThis.__C=CFG;globalThis.respawnLevel=respawnLevel;globalThis.inNest=inNest;globalThis.pointsFor=pointsFor;globalThis.TICK=TICK;globalThis.MAP=MAP;globalThis.mapTarget=mapTarget;globalThis.setMapSize=setMapSize;globalThis.Bot=Bot;globalThis.Player=Player;globalThis.ANIMALS=ANIMALS;';
(0,eval)(src);
const g=__g(),C=__C;
g.start();g.input.down=true;
const step=(n)=>{for(let i=0;i<n;i++){g.update(1/60);g.draw();}};
// ===== 이번 변경 검증: 오토파이어 해제 / 육각형 / 봇 완전 무작위 스폰 =====
const E=id=>document.getElementById(id);const up=n=>{for(let i=0;i<n;i++)g.update(1/60);};
const kd=e=>{for(const f of L.keydown)f(Object.assign({repeat:false,target:{tagName:'DIV'},preventDefault(){}},e))};
let T0=1000;performance.now=()=>T0;
console.log('=== [1] 사망 시 오토파이어 해제 ===');
g.start();let P=g.player;P.invT=0;P.hp=P.maxHp=1e9;g.bots=[];g.input.axis=()=>[0,0];g.input.down=false;g.input.auto=false;
kd({code:'KeyE'});console.log('플레이 중 E -> auto',g.input.auto,'(true)');
P.hp=1;P.hurt(5,{kind:'x'});console.log('사망 후 state',g.state,'auto',g.input.auto,'(false)');
kd({code:'KeyE'});console.log('사망 화면에서 E -> auto',g.input.auto,'(false 유지)');
g.start();console.log('다시 시작 직후 auto',g.input.auto,'(false)');kd({code:'KeyE'});console.log('플레이 중 E -> auto',g.input.auto,'(true)');g.input.auto=false;
console.log('=== [2] 육각형 ===');
const H=C.shapes.hexagon;console.log('설정',JSON.stringify(H),'| 오각형',JSON.stringify(C.shapes.pentagon));
let hexN=0,alN=0,penN=0;for(const s of g.shapes)if(s.nest){if(s.kind==='hexagon')hexN++;else if(s.kind==='alpha pentagon')alN++;else penN++;}
console.log('시작 시 둥지: 육각형',hexN,'/',C.nest.hexagons,'알파',alN,'오각형',penN,'| 일반 구역 육각형',g.shapes.filter(s=>!s.nest&&s.kind==='hexagon').length);
{const keep=g.shapes;g.shapes=[];const cnt={};for(let i=0;i<30000;i++)g.spawnShape(true);for(const s of g.shapes)cnt[s.kind]=(cnt[s.kind]||0)+1;const tot=g.shapes.length;
 console.log('둥지 밖 일반 도형 30000개 표본:',Object.entries(cnt).map(([k,v])=>k+' '+v+' ('+(v/tot*100).toFixed(2)+'%)').join(' | '),'| 기대 육각형 약 0.10%, 오각형 약 5.0%, 비 오각형:육각형 =',(cnt.pentagon/(cnt.hexagon||1)).toFixed(0)+':1 (위키 약 50:1)');g.shapes=keep;}
// 총알 vs 육각형
const OA={};function shootHits(type,hp){const S=C.shapes[type];const sh={s:S,kind:S.name||type,nest:false,cl:null,x:3000,y:3000,r:S.r,hp:hp||S.hp,maxHp:S.hp,dmg:S.dmg,a:0,spin:0,dx:0,dy:0,vx:0,vy:0,flash:0,calm:99};g.shapes=[sh];g.crashers=[];g.bots=[];
 const Pl=new Player();let n=0,first=null,pass=null;while(sh.hp>0&&n<3000){n++;const h0=sh.hp;g.bullets=[{x:3000-S.r-12,y:3000,vx:480,vy:0,r:8,dmg:Pl.spec.dmg,pen:Pl.spec.pen,pen0:Pl.spec.pen,life:2,owner:OA,col:'#fff',out:'#000',hits:[]}];for(let i=0;i<10;i++)g.updateBullets(1/60);if(first===null)first=h0-sh.hp;if(pass===null)pass=g.bullets.length;}
 return {hits:n,firstHit:+first.toFixed(2),bulletSurvived:pass===1};}
for(const t of ['square','triangle','pentagon','hexagon','alpha'])console.log('기본 총알 vs',t.padEnd(8),JSON.stringify(shootHits(t)));
{const Pl=new Player();Pl.up.pen=7;Pl.recalc();const S=H;const sh={s:S,kind:'hexagon',nest:false,cl:null,x:3000,y:3000,r:S.r,hp:S.hp,maxHp:S.hp,dmg:S.dmg,a:0,spin:0,dx:0,dy:0,vx:0,vy:0,flash:0,calm:99};g.shapes=[sh];
 g.bullets=[{x:3000-S.r-12,y:3000,vx:480,vy:0,r:8,dmg:Pl.spec.dmg,pen:Pl.spec.pen,pen0:Pl.spec.pen,life:2,owner:OA,col:'#fff',out:'#000',hits:[]}];for(let i=0;i<10;i++)g.updateBullets(1/60);console.log('관통 7포인트 총알도 육각형을 통과하지 못함(solid):',g.bullets.length===0,'| 한 발 피해',(S.hp-sh.hp).toFixed(1));}
// 몸통 충돌
g.start();P=g.player;P.invT=0;P.hp=P.maxHp=1e9;P.x=3000;P.y=3000;P.vx=P.vy=0;g.bots=[];g.crashers=[];
{const S=H;const sh={s:S,kind:'hexagon',nest:false,cl:null,x:3000+P.r+S.r-6,y:3000,r:S.r,hp:S.hp,maxHp:S.hp,dmg:S.dmg,a:0,spin:0,dx:0,dy:0,vx:0,vy:0,flash:0,calm:99};g.shapes=[sh];const h0=P.hp;g.collisionPass();console.log('몸통 충돌 1틱: 플레이어가 받은 피해',(h0-P.hp),'(기대 16) | 육각형이 받은 피해',(S.hp-sh.hp),'(기대 20) | 육각형 질량배수',S.mass);}
// 재생
{const S=H;const sh={s:S,kind:'hexagon',nest:true,cl:null,x:6000,y:6000,r:S.r,hp:1000,maxHp:S.hp,dmg:S.dmg,a:0,spin:0,dx:0,dy:0,vx:0,vy:0,flash:0,calm:99};g.shapes=[sh];g.player.alive=true;up(60);console.log('재생: 체력 1000 -> 1초 후',sh.hp.toFixed(1),'(기대 약 1015)');sh.calm=0;const h=sh.hp;up(60*5);console.log('맞은 직후 5초간(calm<8): 변화',(sh.hp-h).toFixed(1),'(0)');}
// 재등장 타이머
g.start();P=g.player;P.hp=P.maxHp=1e9;P.x=1500;P.y=1500;g.bots=[];g.input.axis=()=>[0,0];C.bots.base=0;C.bots.perLevel=0;
{g.shapes=g.shapes.filter(s=>s.kind!=='hexagon');const tl=[];for(let i=0;i<=60*130;i++){if(i%(60*10)===0){tl.push(Math.round(i/60)+'s:'+g.shapes.filter(s=>s.kind==='hexagon'&&s.nest).length);}g.update(1/60);}console.log('둥지 육각형을 모두 없앤 뒤 재등장(10초 간격):',tl.join(' '),'| 설정 hexRespawn',C.nest.hexRespawn,'s, 최대',C.nest.hexagons);}
// 사망 문구
{g.start();P=g.player;P.invT=0;const S=H;const sh={s:S,kind:'hexagon',nest:false,cl:null,x:0,y:0,r:S.r,hp:S.hp,maxHp:S.hp,dmg:S.dmg};P.hp=1;P.hurt(5,sh);console.log('육각형에게 사망 문구:',JSON.stringify(E('dead-title').textContent));}
// 점수
{g.start();P=g.player;P.invT=0;P.hp=P.maxHp=1e9;const S=H;const sc=P.score;const sh={s:S,kind:'hexagon',nest:false,cl:null,x:0,y:0,r:S.r,hp:-1,maxHp:S.hp,dmg:S.dmg,lastHit:P};g.shapes=[sh];g.reap();console.log('플레이어가 육각형 처치: 점수 +',(P.score-sc),'(기대 1500)');
 g.bots=[];const b=new Bot(500,500,10,'T');g.bots=[b];const sc2=b.score;g.shapes=[{s:S,kind:'hexagon',nest:false,cl:null,x:0,y:0,r:S.r,hp:-1,maxHp:S.hp,dmg:S.dmg,lastHit:b}];g.reap();console.log('봇이 육각형 처치: 점수 +',(b.score-sc2),'(기대 375 = 1500 x 0.25)');}
// 봇의 육각형 선택
{g.start();g.player.alive=false;g.crashers=[];const S=H;const mk=(lv,pen)=>{const b=new Bot(3000,3000,lv,'T');b.up.pen=pen;b.recalc();b.hp=b.maxHp;g.bots=[b];g.shapes=[{s:S,kind:'hexagon',nest:false,cl:null,x:3300,y:3000,r:S.r,hp:S.hp,maxHp:S.hp,dmg:S.dmg,a:0,spin:0,dx:0,dy:0,vx:0,vy:0,flash:0,calm:99}];b.pickTarget(g);return b.target?'노림':'무시';};
 console.log('봇의 육각형 선택: Lv10 pen0 ->',mk(10,0),'| Lv20 pen3 ->',mk(20,3),'| Lv25 pen2 ->',mk(25,2),'| Lv30 pen5 ->',mk(30,5),'(Lv20 이상 & 관통 3 이상만 노려야 함)');}
console.log('=== [3] 봇 스폰 위치: 맵 전체 무작위 ===');
g.start();P=g.player;P.invT=0;P.hp=P.maxHp=1e9;g.shapes=g.shapes.slice(0,0);g.crashers=[];
{const W=C.world,cx=W/2;const pts=[];let fail=0,vis=0,nestBad=0,outMap=0;const px=[P.x,P.y];
 for(let t=0;t<4000;t++){g.bots=[];P.x=cx+1500;P.y=cx-800;g.cam.x=P.x;g.cam.y=P.y;if(!g.spawnBot(1)){fail++;continue;}const b=g.bots[0];pts.push([b.x,b.y]);if(g.cam.visible(b.x,b.y,0))vis++;if(inNest(b.x,b.y,899))nestBad++;if(b.x<MAP.lo||b.x>MAP.hi||b.y<MAP.lo||b.y>MAP.hi)outMap++;}
 const q=[0,0,0,0];let near1500=0,near3000=0,sd=0;for(const [x,y] of pts){q[(x>cx?1:0)+(y>cx?2:0)]++;const d=Math.hypot(x-P.x,y-P.y);sd+=d;if(d<1500)near1500++;if(d<3000)near3000++;}
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
 console.log('맵',Math.round(MAP.size),'| 표본',pts.length,'실패',fail,'| 화면 안',vis,'| 맵 밖',outMap,'| 둥지(+900) 안',nestBad);
 console.log('사분면 분포(좌상/우상/좌하/우하)',q.join('/'),'| x 범위',Math.round(Math.min(...xs)),'~',Math.round(Math.max(...xs)),' y 범위',Math.round(Math.min(...ys)),'~',Math.round(Math.max(...ys)));
 console.log('플레이어까지 평균 거리',Math.round(sd/pts.length),'| 1500 이내',(near1500/pts.length*100).toFixed(1)+'%','| 3000 이내',(near3000/pts.length*100).toFixed(1)+'%','(이전 방식은 화면 대각선 절반+200~800 이내 = 100%)');}
console.log('=== [4] 안정성(4분) + 그리기 ===');
C.bots.base=10;C.bots.perLevel=0.2;g.start();P=g.player;P.hp=P.maxHp=1e9;P.x=1500;P.y=1500;g.bots=[];g.input.axis=()=>[0,0];g.dev=true;
for(let i=0;i<60*60*4;i++){g.update(1/60);if(i%300===0){T0+=16;g.draw();}}
let nan=0;for(const b of g.bots)if(![b.x,b.y,b.vx,b.vy].every(isFinite))nan++;for(const s of g.shapes)if(![s.x,s.y,s.hp].every(isFinite))nan++;
console.log('NaN',nan,'| 봇',g.bots.length,'| 육각형(둥지/일반)',g.shapes.filter(s=>s.kind==='hexagon'&&s.nest).length+'/'+g.shapes.filter(s=>s.kind==='hexagon'&&!s.nest).length,'| 도형',g.shapes.length);
