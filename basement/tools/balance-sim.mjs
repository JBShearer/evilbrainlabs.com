/* ============================================================
   ACCEPTANCE SIMULATOR — THE SHOP AND THE SUMMONS (v3).
   Drives the REAL modules headless. Proves the pinned criteria:
   a pure shipper gets dragged out within every few ships; three
   in a row is possible when things are calm; nobody grinds
   uninterrupted forever.

   Run from the site root:
     node basement/tools/balance-sim.mjs [careers] [runsPerCareer]
================================================================ */
globalThis.localStorage={_m:{},
  getItem(k){return this._m[k]??null},
  setItem(k,v){this._m[k]=String(v)},
  removeItem(k){delete this._m[k]}};
globalThis.history={replaceState(){}};
globalThis.location={hash:""};

const CAREERS=+(process.argv[2]||30);
const RUNS_PER=+(process.argv[3]||8);
const POLICIES=["shipper","dutiful","mixed"];

const rnd=()=>Math.random();
const pickR=a=>a[Math.floor(rnd()*a.length)];

const base=new URL("../js/",import.meta.url).href;
const E=await import(base+"engine.js");
const data=await import(base+"data.js");
const Ledger=await import(base+"ledger.js");
const World=await import(base+"world.js");
const Board=await import(base+"board.js");
const Summons=await import(base+"summons.js");

function resetCareer(){
  localStorage._m={};
  for(const k of Object.keys(E.FILE))delete E.FILE[k];
  Object.assign(E.FILE,{runs:0,bestDay:0,bestSyn:0,lore:[],trust:{},
    roles:["TRAINEE"],deaths:{},v:3,shipsTotal:0,cyclesTotal:0,ledger:[],echoes:[],bestStreak:0});
}
const deathBox={cause:null};
const knockBox={count:0};
E.on("week",()=>{Ledger.onWeek();Board.onWeek();World.weekTick();Summons.onWeek();});
E.on("shipped",({product,funder,verdict})=>{
  Ledger.recordShip({product,funder,verdict});
  if(Summons.afterShip())knockBox.count++;
});
E.on("died",({cause})=>{deathBox.cause=cause;});

/* ---- shop-action replicas (mirror rooms.js constants) ---- */
function chuteBuy(kind){
  const cost={part:5,napkin:3,coolant:4}[kind];
  if(E.R.syn<cost)return false;
  E.spend(cost);
  if(kind==="part"){
    const kinds=["act","tool","purpose"];
    const k=pickR(kinds);
    const pool={act:data.ACTS,tool:data.TOOLS,purpose:data.PURPOSES}[k].filter(p=>!p.rare);
    E.grantPart(k,pickR(pool).id);
  }
  if(kind==="napkin")E.R.inv.napkins++;
  if(kind==="coolant"){E.R.inv.coolant++;E.fx({sus:-1});}
  return true;
}
function scrapBin(){
  const key="scrap:"+E.R.week;
  const total=E.R.inv.act.length+E.R.inv.tool.length+E.R.inv.purpose.length;
  if(total>=3||E.R.spent[key])return false;
  E.R.spent[key]=1;
  const kinds=["act","tool","purpose"];
  const k=pickR(kinds);
  const pool={act:data.ACTS,tool:data.TOOLS,purpose:data.PURPOSES}[k].filter(p=>!p.rare);
  E.grantPart(k,pickR(pool).id);
  return true;
}
function extension(){
  const key="ext:"+E.R.week, cost=15+10*(E.R.extUsed||0);
  if(E.R.spent[key]||E.R.doom<8||E.R.syn<cost)return false;
  E.R.spent[key]=1;E.R.extUsed=(E.R.extUsed||0)+1;
  E.spend(cost);E.R.doom=Math.max(0,E.R.doom-1);E.tick(1);
  return true;
}
function build(){
  const inv=E.R.inv;
  const a=inv.act[0],t=inv.tool[0],p=inv.purpose[0];
  const napkin=inv.napkins>0&&rnd()<.5;
  E.consumeParts(a,t,p);
  if(napkin)inv.napkins--;
  E.makeProduct(a,t,p,napkin?"napkin":"lab");
  E.tick(1);
}

/* attend: approximate each body's outcome with its real fx ranges */
function attendSummons(s,stats){
  const T=Summons.TYPES[s.type];
  switch(T.body){
    case "hearing":{
      const spec=Ledger.hearingCard(s.payload.hook);
      const c=pickR(spec.choices);E.fx(c.fx||{});break;}
    case "minigame":{
      const g=T.game;
      if(g==="simon"){rnd()<.6?(E.fx({syn:5}),E.bump("gi",1)):E.fx({sus:1});}
      if(g==="captcha"){const r=rnd();r<.5?E.fx({syn:6}):r<.85?E.fx({syn:2,sus:1}):E.fx({sus:3});}
      if(g==="coolant"){rnd()<.55?E.fx({syn:5}):E.fx({sus:2});}
      if(g==="clicker"){E.fx({syn:8,sus:rnd()<.2?1:0});}
      if(g==="shredder"){E.fx({syn:4,sus:rnd()<.4?2:0,clr:rnd()<.5?1:0});}
      break;}
    case "choices":{const c=pickR(T.event.choices);E.fx(c.fx||{});if(c.trust)E.bump(c.trust[0],c.trust[1]);break;}
    case "meeting":{E.bump(s.payload?.castId||"gary",1);E.fx({syn:2});break;}
    case "mail":{const env=pickR(data.MAIL);const c=rnd()<.5?env.a:env.b;E.fx(c.fx||{});
      if(c.kind==="coolant"){E.R.inv.coolant++;E.fx({sus:-1});}
      if(c.kind==="napkin")E.R.inv.napkins++;
      if(c.kind==="part")chuteFree();break;}
    case "archive":{E.fx({clr:1});break;}
    case "pitch":{if(E.R.product){
      let mood=50;
      for(const kind of ["claim","demo","ask"]){
        const sl=pickR(data.SLIDES[kind]);
        mood+=sl.d[0]+Math.floor(rnd()*(sl.d[1]-sl.d[0]+1));}
      E.R.product.pitched=true;E.R.product.mood=Math.max(0,Math.min(100,mood));
      E.R.product.funder=pickR(data.FUNDERS);}
      break;}
    case "exec":{E.fx({clr:1});break;}
  }
  if(E.R.dead)return;
  const T2=Summons.TYPES[s.type];
  if(T2.rewards?.part)chuteFree();
  if(T2.rewards?.coolant){E.R.inv.coolant++;E.fx({sus:-1});}
  if(T2.rewards?.clr)E.fx({clr:T2.rewards.clr});
  if(T2.rewards?.sus)E.fx({sus:T2.rewards.sus});
  if(T2.rewards?.trust)E.bump(T2.rewards.trust[0],T2.rewards.trust[1]);
  stats.attendStreaks.push(E.R.streak);
  Summons.resolve(s);
  E.tick(2);
}
function chuteFree(){
  const kinds=["act","tool","purpose"];
  const k=pickR(kinds);
  const pool={act:data.ACTS,tool:data.TOOLS,purpose:data.PURPOSES}[k].filter(p=>!p.rare);
  E.grantPart(k,pickR(pool).id);
}
function faceInvasion(){
  const T=Summons.TYPES[E.R.invasion.type];
  if(T.body==="minigame"){rnd()<.5?E.fx({syn:2}):E.fx({sus:3});}
  else E.fx({doom:1});
  Summons.clearInvasion();
  E.tick(1);
}

function wantAttend(policy,s){
  if(Summons.isSubpoenaed(s))return true;
  if(policy==="dutiful")return true;
  if(policy==="shipper")return false;
  /* mixed: let it simmer once, answer before it boils */
  return s.ducked>=1||E.R.sus>=6||s.type==="hearing";
}

async function simCareer(policy){
  resetCareer();
  const runs=[];
  for(let r=0;r<RUNS_PER;r++){
    deathBox.cause=null;
    const R=E.newRun("TRAINEE");
    R.syn+=5;
    const stats={attendStreaks:[],maxStreak:0,invasions:0,knocksSeen:0,calm3:0,calmTries:0,calmEligible:true};
    let actions=0,calmRun=0,counting=true;
    while(!R.dead&&actions<500){
      actions++;
      stats.maxStreak=Math.max(stats.maxStreak,R.streak);
      if(R.invasion){stats.invasions++;faceInvasion();continue;}
      /* respond to pending summons per policy */
      const pending=R.summons[0];
      if(pending){
        /* only score a stretch as "calm" if it began with no due hooks
           and no duck pile — that's what calm means */
        if(counting){
          if(stats.calmEligible){stats.calmTries++;if(calmRun>=3)stats.calm3++;}
          counting=false;}
        if(wantAttend(policy,pending)){
          attendSummons(pending,stats);calmRun=0;counting=true;
          stats.calmEligible=R.ducked===0&&!R.hooks.some(h=>h.fired&&!h.summoned);
          continue;}
        else if(pending.ducked===0){Summons.duck(pending);continue;}
        /* already ducked once: shipper lets TTL rot, others attended above */
      }
      if(R.subpoena){const s=R.summons.find(x=>Summons.isSubpoenaed(x));
        if(s){attendSummons(s,stats);calmRun=0;counting=true;continue;}
        R.subpoena=false; /* orphaned guard */}
      /* upkeep */
      if(policy!=="shipper"&&R.sus>=6&&chuteBuy("coolant"))continue;
      if(extension())continue;
      /* ship the line */
      if(R.product){
        const res=E.ship(rnd()<.7?pickR(data.FUNDERS):null);
        if(res&&counting)calmRun++;
        continue;
      }
      const inv=R.inv;
      if(inv.act.length&&inv.tool.length&&inv.purpose.length){build();continue;}
      if(scrapBin())continue;
      if(chuteBuy("part"))continue;
      /* broke and partless: a lunch will come eventually */
      E.tick(1);
    }
    runs.push({policy,runIndex:r+1,weeks:R.week,ships:R.ships,actions,
      cause:R.dead?(deathBox.cause||"?"):"TIMEOUT",syn:R.syn,
      served:R.summonsServed,ducked:R.ducked,
      maxStreak:stats.maxStreak,invasions:stats.invasions,
      attendStreaks:stats.attendStreaks,calm3:stats.calm3,calmTries:stats.calmTries});
  }
  return runs;
}

const mean=a=>a.length?(a.reduce((x,y)=>x+y,0)/a.length):0;
const median=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
const fmt=n=>(Math.round(n*10)/10).toString();

const all=[];
for(const policy of POLICIES)
  for(let c=0;c<CAREERS;c++)
    all.push(...await simCareer(policy));

console.log(`\n=== SHOP & SUMMONS ACCEPTANCE · ${CAREERS}×${RUNS_PER}×${POLICIES.length} = ${all.length} runs ===\n`);
for(const policy of POLICIES){
  const runs=all.filter(r=>r.policy===policy);
  const causes={};
  runs.forEach(r=>causes[r.cause]=(causes[r.cause]||0)+1);
  const causeStr=Object.entries(causes).sort((a,b)=>b[1]-a[1])
    .map(([k,v])=>`${k} ${(v/runs.length*100).toFixed(0)}%`).join(" · ");
  const streaksAtAttend=runs.flatMap(r=>r.attendStreaks);
  console.log(`${policy.toUpperCase()}  (${runs.length} runs)`);
  console.log(`  weeks     mean ${fmt(mean(runs.map(r=>r.weeks)))} · median ${median(runs.map(r=>r.weeks))}`);
  console.log(`  ships     mean ${fmt(mean(runs.map(r=>r.ships)))} · median ${median(runs.map(r=>r.ships))}`);
  console.log(`  deaths    ${causeStr}`);
  console.log(`  maxStreak mean ${fmt(mean(runs.map(r=>r.maxStreak)))} · max ${Math.max(...runs.map(r=>r.maxStreak))}`);
  console.log(`  summons   served ${fmt(mean(runs.map(r=>r.served)))} · ducked ${fmt(mean(runs.map(r=>r.ducked)))} · invasions ${fmt(mean(runs.map(r=>r.invasions)))}`);
  if(streaksAtAttend.length)
    console.log(`  ships-between-attendances mean ${fmt(mean(streaksAtAttend))} · median ${median(streaksAtAttend)}`);
  const c3=runs.reduce((n,r)=>n+r.calm3,0), ct=runs.reduce((n,r)=>n+r.calmTries,0);
  if(ct)console.log(`  calm stretches reaching 3+ ships before a knock: ${(c3/ct*100).toFixed(0)}% (${c3}/${ct})`);
  console.log("");
}
