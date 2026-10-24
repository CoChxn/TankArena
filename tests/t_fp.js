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
// [B] 가짜 플레이어: 봇 AI가 조종하되 플레이어 규칙(도형 점수 배율 1, 사망 시 부활 레벨 규칙)을 따름.
//     '완벽한 파밍 효율의 사람'에 해당하는 상한선 -> 실제 사람은 이보다 느리거나 비슷
const RUNS=2,MIN=15,B=C.bots;B.base=11; // 가짜 플레이어도 봇 목록에 들어가므로 +1
const res=[];const A={deaths:{},lives:[],lvAt:{2:[],5:[],10:[],15:[]},t15:[],t30:[],t45:[],respawnFrom:[]};
for(let t=0;t<RUNS;t++){g.dev=false;g.start();const P=g.player;P.hp=P.maxHp=1e9;P.x=1500;P.y=1500;g.bots=[];g.input.axis=()=>[0,0];g.input.down=false;
 let fp=null,bornAt=0,deaths=0,peak=1,hit={};
 const make=lv=>{const sp=g.spawnPos();fp=new Bot(sp.x,sp.y,lv,'FakePlayer');fp.proxy=true;g.bots.push(fp);bornAt=g.clock;};
 const ok=g.onKill.bind(g);
 g.onKill=e=>{const k=e.lastHit;const was=fp&&e===fp;const r=ok(e);
  if(fp&&k===fp&&!e.isBot)fp.addXp(e.s.xp*(1-B.shapeXp)); // 플레이어는 도형 점수를 100% 받음
  if(was){deaths++;const key=!k?'unknown':k.isBot?'bot Lv'+k.level:(k.kind||'player');A.deaths[key.replace(/ Lv\d+/,'')]=(A.deaths[key.replace(/ Lv\d+/,'')]||0)+1;A.lives.push(g.clock-bornAt);A.respawnFrom.push(fp.level);const nl=respawnLevel(fp.level);fp=null;make(nl);}
  return r};
 make(1);
 for(let i=1;i<=60*60*MIN;i++){g.update(1/60);if(i%60===0&&fp){P.level=fp.level;P.score=fp.score;} // 플레이어 레벨 = 가짜 플레이어 레벨 (봇 수/시작 레벨에 반영)
  if(fp){peak=Math.max(peak,fp.level);for(const k of [30,45])if(peak>=k&&hit[k]===undefined){hit[k]=g.clock/60;}if(peak>=15&&hit[15]===undefined)hit[15]=g.clock/60;}
  for(const m of [2,5,10,15])if(i===m*3600&&fp)A.lvAt[m].push(fp.level);}
 if(hit[15]!==undefined)A.t15.push(hit[15].toFixed(1));if(hit[30]!==undefined)A.t30.push(hit[30].toFixed(1));if(hit[45]!==undefined)A.t45.push(hit[45].toFixed(1));
 res.push(`시도${t+1}: 최고 Lv${peak}, 사망 ${deaths}회`);g.onKill=ok;}
console.log('=== [B] 가짜 플레이어(완벽 파밍, 점수 100%) vs 봇 10마리, '+RUNS+'회 x '+MIN+'분 ===');
console.log(res.join(' | '));
console.log('시점별 레벨(2/5/10/15/20분):',[2,5,10,15].map(m=>m+'분 '+A.lvAt[m].join('/')).join(' | '));
console.log('Lv15 최초 도달(분)',A.t15.join(',')||'-','| Lv30',A.t30.join(',')||'-','| Lv45',A.t45.join(',')||'-');
A.lives.sort((a,b)=>a-b);console.log('가짜 플레이어 사망',A.lives.length,'회, 수명(초) 중앙값',A.lives.length?A.lives[Math.floor(A.lives.length/2)].toFixed(0):'-','| 원인',JSON.stringify(A.deaths),'| 사망 시 레벨',A.respawnFrom.join(','));
