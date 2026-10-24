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
// ===== 재검증: 총알 vs 도형(맵 중앙 좌표 사용) / 봇 스폰 위치(정상 봇 수 설정, 큰 맵) =====
const up=n=>{for(let i=0;i<n;i++)g.update(1/60);};const W=C.world,cx=W/2;
g.start();let P=g.player;P.invT=0;P.hp=P.maxHp=1e9;g.bots=[];g.crashers=[];
console.log('설정: 봇 base',C.bots.base,'perLevel',C.bots.perLevel,'| 현재 맵',Math.round(MAP.size),'범위',Math.round(MAP.lo),'~',Math.round(MAP.hi),'| 테스트 좌표 중심',cx);
const OA={};
function shootHits(type,pen){const S=C.shapes[type];const sh={s:S,kind:S.name||type,nest:false,cl:null,x:cx,y:cx,r:S.r,hp:S.hp,maxHp:S.hp,dmg:S.dmg,a:0,spin:0,dx:0,dy:0,vx:0,vy:0,flash:0,calm:99};g.shapes=[sh];g.crashers=[];g.bots=[];
 const Pl=new Player();if(pen){Pl.up.pen=pen;Pl.recalc();}let n=0,first=null,pass=null;
 while(sh.hp>0&&n<3000){n++;const h0=sh.hp;g.bullets=[{x:cx-S.r-12,y:cx,vx:480,vy:0,r:8,dmg:Pl.spec.dmg,pen:Pl.spec.pen,pen0:Pl.spec.pen,life:2,owner:OA,col:'#fff',out:'#000',hits:[]}];for(let i=0;i<10;i++)g.updateBullets(1/60);if(first===null)first=h0-sh.hp;if(pass===null)pass=g.bullets.length;}
 return {hits:n,firstHit:+first.toFixed(2),bulletSurvivedHit:pass===1};}
console.log('=== 기본 총알(관통 0, 피해 0) vs 도형: 처치까지 필요한 발수 / 첫 발 피해 ===');
for(const t of ['square','triangle','pentagon','hexagon','alpha'])console.log(t.padEnd(8),'체력',String(C.shapes[t].hp).padStart(4),JSON.stringify(shootHits(t)));
console.log('(위키 기준: 사각형 2발 / 삼각형 5발 / 오각형 22발, 육각형은 첫 발 3.5 = 7 x 8/16)');
{const r=shootHits('hexagon',7);console.log('관통 7포인트 총알 vs 육각형:',JSON.stringify(r),'-> 통과하지 못하면 bulletSurvivedHit=false');}
{const S=C.shapes.hexagon;const Pl=new Player();Pl.up.pen=7;Pl.up.bDmg=7;Pl.recalc();const sh={s:S,kind:'hexagon',nest:false,cl:null,x:cx,y:cx,r:S.r,hp:S.hp,maxHp:S.hp,dmg:S.dmg,a:0,spin:0,dx:0,dy:0,vx:0,vy:0,flash:0,calm:99};g.shapes=[sh];let n=0;while(sh.hp>0&&n<3000){n++;g.bullets=[{x:cx-S.r-12,y:cx,vx:480,vy:0,r:8,dmg:Pl.spec.dmg,pen:Pl.spec.pen,pen0:Pl.spec.pen,life:2,owner:OA,col:'#fff',out:'#000',hits:[]}];for(let i=0;i<10;i++)g.updateBullets(1/60);}console.log('관통 7 + 피해 7 총알로 육각형 처치 발수:',n,'(체력 1500, 한 발 28 x min(1, 50/16))');}
console.log('=== 봇 스폰 위치: 맵 전체 무작위 (봇 base 10 정상 설정, 맵 크기를 정상 값으로) ===');
setMapSize(mapTarget(11));
{const pts=[];let fail=0,vis=0,nestBad=0,outMap=0;g.shapes=[];
 for(let t=0;t<4000;t++){g.bots=[];P.x=cx+1500;P.y=cx-800;g.cam.x=P.x;g.cam.y=P.y;if(!g.spawnBot(1)){fail++;continue;}const b=g.bots[0];pts.push([b.x,b.y]);if(g.cam.visible(b.x,b.y,0))vis++;if(inNest(b.x,b.y,899))nestBad++;if(b.x<MAP.lo||b.x>MAP.hi||b.y<MAP.lo||b.y>MAP.hi)outMap++;}
 const q=[0,0,0,0];let n1500=0,n3000=0,sd=0;for(const [x,y] of pts){q[(x>cx?1:0)+(y>cx?2:0)]++;const d=Math.hypot(x-P.x,y-P.y);sd+=d;if(d<1500)n1500++;if(d<3000)n3000++;}
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
 console.log('맵',Math.round(MAP.size),'범위',Math.round(MAP.lo),'~',Math.round(MAP.hi),'| 표본',pts.length,'실패',fail,'| 화면 안',vis,'| 맵 밖',outMap,'| 둥지(+900) 안',nestBad);
 console.log('사분면(좌상/우상/좌하/우하)',q.join('/'),'| x 범위',Math.round(Math.min(...xs)),'~',Math.round(Math.max(...xs)),'| y 범위',Math.round(Math.min(...ys)),'~',Math.round(Math.max(...ys)));
 console.log('플레이어까지 평균 거리',Math.round(sd/pts.length),'| 1500 이내',(n1500/pts.length*100).toFixed(1)+'%','| 3000 이내',(n3000/pts.length*100).toFixed(1)+'%');
 // 플레이어 사망 중(카메라 기준)에도 동일하게 작동하는지
 P.alive=false;let ok=0;for(let t=0;t<500;t++){g.bots=[];if(g.spawnBot(1))ok++;}console.log('플레이어 사망 상태에서도 소환 성공',ok+'/500');P.alive=true;}
