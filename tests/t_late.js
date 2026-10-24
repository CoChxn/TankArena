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
// [F] 후반(플레이어 Lv45, 목표 봇 19마리) 정상 상태: 봇 수/회전율/맵/성능
g.start();let P=g.player;P.setLevel(45);P.invT=0;P.hp=P.maxHp=1e9;P.x=1500;P.y=1500;g.bots=[];g.input.axis=()=>[0,0];g.input.down=false;
const B=C.bots;const target=Math.min(B.max,B.base+Math.floor(45*B.perLevel));let deaths=0,spawns=0;const lv=[];
const ok=g.onKill.bind(g);g.onKill=e=>{if(e.isBot)deaths++;return ok(e)};const os=g.spawnBot.bind(g);g.spawnBot=pl=>{const r=os(pl);if(r)spawns++;return r};
const trace=[];let ms=0,n=0;
for(let i=1;i<=60*60*10;i++){const t0=process.hrtime.bigint();g.update(1/60);if(i>60*60*3){ms+=Number(process.hrtime.bigint()-t0)/1e6;n++;}
 if(i%(60*120)===0)trace.push(`${i/3600}분 봇${g.bots.length}/${target} 맵${Math.round(MAP.size)} 군집${g.clusters.length} 도형${g.shapes.length} 최고Lv${Math.max(...g.bots.map(b=>b.level))}`);}
g.onKill=ok;g.spawnBot=os;
console.log('=== [F] 후반 정상 상태 (플레이어 Lv45 정지·무적, 10분) ===');console.log(trace.join('\n'));
const ls=g.bots.map(b=>b.level).sort((a,b)=>b-a);console.log('10분 시점 봇 레벨 분포',ls.join('/'));
console.log('스폰',spawns,'사망',deaths,'(분당 사망',(deaths/10).toFixed(1)+')','| update 평균(3분 이후)',(ms/n).toFixed(2)+'ms/프레임');
