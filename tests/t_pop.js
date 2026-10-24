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
const RUNS=2,MIN=15,B=C.bots;const out=[];const agg={deaths:{},lvDeath:{'<5':0,'5-14':0,'15-29':0,'30+':0},spawn:0,lives:[],xpShape:0,xpTank:0,alphaKill:[],alphaSpawn:0,freeRatio:[],cluRatio:[],top:{5:[],10:[],15:[]},cnt:{},first45:[]};
for(let t=0;t<RUNS;t++){g.dev=false;g.start();const P=g.player;P.hp=P.maxHp=1e9;P.x=1500;P.y=1500;g.bots=[];g.input.axis=()=>[0,0];g.input.down=false;
 const born=new Map();const ok=g.onKill.bind(g);
 g.onKill=e=>{const k=e.lastHit;
  if(k&&k.addXp&&k.hp>0&&k.isBot){if(e.isBot)agg.xpTank+=40+e.score*.5;else agg.xpShape+=e.s.xp*B.shapeXp;}
  if(e.kind==='alpha pentagon'&&k&&k.isBot)agg.alphaKill.push(+(g.clock/60).toFixed(1)+':Lv'+k.level);
  if(e.isBot){const key=!k?'unknown':k.isBot?'bot':(k.kind||'player');agg.deaths[key]=(agg.deaths[key]||0)+1;const L=e.level;agg.lvDeath[L<5?'<5':L<15?'5-14':L<30?'15-29':'30+']++;agg.lives.push(g.clock-(born.get(e)||0));}
  return ok(e)};
 const os=g.spawnBot.bind(g);g.spawnBot=pl=>{const r=os(pl);if(r){agg.spawn++;born.set(g.bots[g.bots.length-1],g.clock);}return r};
 const sp=g.spawnShape.bind(g);g.spawnShape=(a,n,ty,cl)=>{if(ty==='alpha')agg.alphaSpawn++;return sp(a,n,ty,cl)};
 let f45=null;
 for(let i=1;i<=60*60*MIN;i++){g.update(1/60);for(const b of g.bots)if(!born.has(b))born.set(b,g.clock);
  if(i%600===0){let free=0,clu=0,cl=0;for(const s of g.shapes){if(s.nest)continue;if(s.cl)clu++;else free++;}const fT=Math.round(C.shapeDensity*MAP.size**2),cT=g.clusters.reduce((a,c)=>a+c.target,0);agg.freeRatio.push(free/fT);agg.cluRatio.push(clu/Math.max(1,cT));}
  const m=i/3600;for(const k of [5,10,15])if(i===k*3600)agg.top[k].push(g.bots.map(b=>b.level).sort((a,b)=>b-a));
  if(f45===null&&g.bots.some(b=>b.level>=45))f45=i/3600;}
 if(f45!==null)agg.first45.push(f45.toFixed(1));g.onKill=ok;g.spawnBot=os;g.spawnShape=sp;}
const med=a=>{a=[...a].sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:0};const avg=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);
console.log('=== [A] 봇 개체군 (기본 설정, 플레이어 정지·무적, '+RUNS+'회 x '+MIN+'분) ===');
for(const k of [5,10,15]){const arr=agg.top[k];console.log(k+'분: 봇수 '+arr.map(a=>a.length).join('/')+' | 최고 레벨 '+arr.map(a=>a[0]).join('/')+' | 2위 '+arr.map(a=>a[1]).join('/')+' | 중앙값 '+arr.map(a=>med(a)).join('/')+' | Lv15+ 봇 수 '+arr.map(a=>a.filter(l=>l>=15).length).join('/'));}
const td=Object.values(agg.deaths).reduce((a,b)=>a+b,0);
console.log('스폰',agg.spawn,'사망',td,'= 분당',(td/(RUNS*MIN)).toFixed(1),'| 사망 원인',JSON.stringify(agg.deaths),'| 사망 시 레벨',JSON.stringify(agg.lvDeath));
agg.lives.sort((a,b)=>a-b);console.log('봇 수명(초) 중앙값',med(agg.lives).toFixed(0),'| 30초 미만 비율',(agg.lives.filter(x=>x<30).length/agg.lives.length*100).toFixed(0)+'%','| 5분 이상',(agg.lives.filter(x=>x>=300).length/agg.lives.length*100).toFixed(0)+'%');
console.log('점수 출처: 도형·크래셔',Math.round(agg.xpShape),'/ 탱크 처치',Math.round(agg.xpTank),'(탱크 비중',(agg.xpTank/(agg.xpShape+agg.xpTank)*100).toFixed(0)+'%)');
console.log('도형 보충률(일반 도형 현재/목표) 평균',avg(agg.freeRatio).toFixed(2),'최저',Math.min(...agg.freeRatio).toFixed(2),'| 군집 충원율 평균',avg(agg.cluRatio).toFixed(2),'최저',Math.min(...agg.cluRatio).toFixed(2));
console.log('알파 오각형: 재등장',agg.alphaSpawn,'회, 봇이 처치',agg.alphaKill.length,'회',JSON.stringify(agg.alphaKill.slice(0,8)),'| Lv45 최초 도달(분)',agg.first45.join(',')||'없음');
