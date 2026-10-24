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
// [D] 스폰 공정성 + 가만히 있는 1레벨 플레이어의 생존 (봇 10마리 정상 상태의 같은 월드에서 연속 시험)
g.start();let P=g.player;P.hp=P.maxHp=1e9;P.x=1500;P.y=1500;g.bots=[];g.input.axis=()=>[0,0];g.input.down=false;
for(let i=0;i<60*60*4;i++)g.update(1/60); // 4분 워밍업
const dists=[],near=[];let surv=[],killers={};
for(let t=0;t<14;t++){
 // 이 시점 스폰 위치 분포 (300회 표본)
 for(let k=0;k<300;k++){const sp=g.spawnPos();let md=1e9,ml=0;for(const b of g.bots){const d=Math.hypot(b.x-sp.x,b.y-sp.y);if(d<md){md=d;ml=b.level;}}dists.push(md);if(md<1000)near.push(ml);}
 g.state='menu';g.start();P=g.player;P.sinceHit=99;let s=0,dead=false;
 for(;s<60*150&&g.state==='play';s++)g.update(1/60); // 가만히(이동·발사 없음) 최대 150초
 const secs=s/60;surv.push(secs);if(g.state!=='play'){const k=P.lastHit;const key=k&&k.isBot?'봇 Lv'+k.level:(k&&k.kind)||'?';killers[key]=(killers[key]||0)+1;}
 g.state==='play'?0:0;
 // 사망 화면 상태면 다음 시도를 위해 그대로 두고 월드를 1~2초 더 진행
 for(let i=0;i<90;i++)g.update(1/60);}
dists.sort((a,b)=>a-b);const q=p=>dists[Math.floor(dists.length*p)];
console.log('=== [D] 스폰/생존 (봇 10마리 정상 상태, spawnGap',C.bots.spawnGap,') ===');
console.log('새 플레이어 스폰 위치에서 가장 가까운 봇까지 거리: 최소',Math.round(q(0))+'px | 10%',Math.round(q(0.1)),'| 중앙값',Math.round(q(0.5)),'| 90%',Math.round(q(0.9)));
console.log('스폰 표본 중 가장 가까운 봇이 700px 이내 비율',(dists.filter(d=>d<700).length/dists.length*100).toFixed(1)+'%','| 1000px 이내',(dists.filter(d=>d<1000).length/dists.length*100).toFixed(1)+'%','| 그 근처 봇 레벨 평균',near.length?(near.reduce((a,b)=>a+b,0)/near.length).toFixed(1):'-');
surv.sort((a,b)=>a-b);console.log('가만히 선 1레벨 플레이어(무적 10초 포함): 생존 시간(초) 정렬',surv.map(x=>x.toFixed(0)).join(','),'| 150초 생존',surv.filter(x=>x>=150).length+'/'+surv.length,'| 사망 원인',JSON.stringify(killers));
