/* ============================================================
   BALANCE SIMULATOR — Sublevel B, the office labyrinth.
   Drives the REAL game modules (engine/gen/data/ledger/world/board)
   headless in Node, with player policies that replicate room-verb
   costs and probabilities from rooms.js. No DOM, no browser, no
   network. Purely a tuning instrument.

   Run from the site root:
     node basement/tools/balance-sim.mjs [careers] [runsPerCareer]
================================================================ */

/* browser shims BEFORE importing game modules */
globalThis.localStorage={_m:{},
  getItem(k){return this._m[k]??null},
  setItem(k,v){this._m[k]=String(v)},
  removeItem(k){delete this._m[k]}};
globalThis.history={replaceState(){}};
globalThis.location={hash:""};

const CAREERS=+(process.argv[2]||30);
const RUNS_PER=+(process.argv[3]||8);
const POLICIES=["grinder","wanderer","careful","pitcher"];

const rnd=()=>Math.random();
const pickR=a=>a[Math.floor(rnd()*a.length)];

/* Import ONCE (internal relative imports must share the same instances);
   careers are separated by resetting the personnel file in place. */
const base=new URL("../js/",import.meta.url).href;
const E=await import(base+"engine.js");
const data=await import(base+"data.js");
const Ledger=await import(base+"ledger.js");
const World=await import(base+"world.js");
const Board=await import(base+"board.js");

function resetCareer(){
  localStorage._m={};
  for(const k of Object.keys(E.FILE))delete E.FILE[k];
  Object.assign(E.FILE,{runs:0,bestDay:0,bestSyn:0,lore:[],trust:{},
    roles:["TRAINEE"],deaths:{},v:2,shipsTotal:0,cyclesTotal:0,ledger:[],echoes:[]});
}

/* wire the loop the way main.js does — once */
const deathBox={cause:null};
E.on("week",()=>{Ledger.onWeek();Board.onWeek();World.weekTick();});
E.on("shipped",({product,funder})=>{Ledger.recordShip({product,funder});});
E.on("died",({cause})=>{deathBox.cause=cause;});

/* ---- room-verb replicas (constants mirror rooms.js) ---- */
function salvage(E,data){
  const risky=rnd()<.3;
  const roll=rnd();
  const kinds=["act","tool","purpose"];
  const kind=pickR(kinds);
  const pool={act:data.ACTS,tool:data.TOOLS,purpose:data.PURPOSES}[kind].filter(p=>!p.rare);
  if(roll<(risky?.5:.75)){
    E.grantPart(kind,pickR(pool).id);
    if(risky){
      const k2=pickR(kinds);
      const pool2={act:data.ACTS,tool:data.TOOLS,purpose:data.PURPOSES}[k2].filter(p=>!p.rare);
      E.grantPart(k2,pickR(pool2).id);
    }
  } else if(roll<.9){E.fx({sus:1});}
  else {E.fx({doom:1});}
  E.tick(1);
}
function hazardHit(E,data){
  const hz=pickR(data.HAZARDS);
  const c=rnd()<.5?hz.a:hz.b;
  E.fx(c.fx||{});
  if(c.trust)E.bump(c.trust[0],c.trust[1]);
}
function meeting(E,data){
  const pool=data.MEETINGS.filter(m=>!m.req&&!m.reqTrust);
  const ev=pickR(pool);
  const c=pickR(ev.choices);
  E.fx(c.fx||{});
  if(c.trust)E.bump(c.trust[0],c.trust[1]);
  E.tick(1);
}
function hearing(E,Ledger){
  const hook=E.R.hearingQueue.shift();
  if(!hook)return;
  const spec=Ledger.hearingCard(hook);
  const c=pickR(spec.choices);
  E.fx(c.fx||{});
  E.tick(1);
}
function vendingBuy(E,data,kind){
  const item=data.VENDING_STOCK.find(s=>s.kind===kind);
  if(!item||E.R.syn<item.cost)return false;
  E.spend(item.cost);
  if(kind==="coolant"){E.R.inv.coolant++;E.fx({sus:-1});}
  if(kind==="napkin")E.R.inv.napkins++;
  if(kind==="part"){
    const kinds=["act","tool","purpose"];
    const k=pickR(kinds);
    const pool={act:data.ACTS,tool:data.TOOLS,purpose:data.PURPOSES}[k].filter(p=>!p.rare);
    E.grantPart(k,pickR(pool).id);
  }
  E.tick(1);
  return true;
}
function build(E,builtIn){
  const inv=E.R.inv;
  const a=inv.act[0],t=inv.tool[0],p=inv.purpose[0];
  E.consumeParts(a,t,p);
  if(builtIn==="napkin")inv.napkins--;
  const prod=E.makeProduct(a,t,p,builtIn);
  if(builtIn==="lab"&&rnd()<.25){       /* a partner happened to be leaning there */
    if(rnd()<.5){prod.stats.mg+=1;prod.stats.mh+=3;prod.stats.mc+=1;}
    else prod.stats.mc+=1;
    for(const k of ["mg","mh","mc"])prod.stats[k]=Math.max(0,Math.min(15,prod.stats[k]));
  }
  E.tick(1);
  return prod;
}
function pitchSim(E,data,p){
  const chaired=rnd()<.3;
  let mood=50+(E.R.role==="PUBLICIST"?8:0);
  for(const kind of ["claim","demo","ask"]){
    const s=pickR(data.SLIDES[kind]);
    const delta=s.d[0]+Math.floor(rnd()*(s.d[1]-s.d[0]+1));
    mood=Math.max(0,Math.min(100,mood+delta+(chaired?-3:0)));
  }
  p.pitched=true;p.mood=mood;
  if(chaired&&mood>=55){p.stats.mg=Math.min(15,p.stats.mg+1);E.bump("stall",1);}
  E.tick(1);
  return mood;
}

function bestRole(FILE,policy){
  const pref={grinder:["PROCUREMENT","FACILITIES","TRAINEE"],
    wanderer:["FACILITIES","ARCHIVIST","TRAINEE"],
    careful:["BODY DOUBLE","ARCHIVIST","TRAINEE"],
    pitcher:["PUBLICIST","PROCUREMENT","TRAINEE"]}[policy];
  for(const r of pref)if(FILE.roles.includes(r))return r;
  return "TRAINEE";
}

/* ---- one career = one reset personnel file ---- */
async function simCareer(policy,tag){
  resetCareer();
  const runs=[];
  for(let r=0;r<RUNS_PER;r++){
    deathBox.cause=null;
    const R=E.newRun(bestRole(E.FILE,policy));
    R.syn+=5;                                     /* certification, common path */
    let actions=0,susMax=0,revenue=0,napkinBuilds=0,labBuilds=0,moods=[];
    const walksPerAction={grinder:1,wanderer:4,careful:2,pitcher:2}[policy];
    while(!R.dead&&actions<400){
      actions++;
      for(let w=0;w<walksPerAction&&!R.dead;w++){
        E.walkTick();
        if(!R.dead&&rnd()<.16)hazardHit(E,data);
      }
      if(R.dead)break;
      susMax=Math.max(susMax,R.sus);
      if(policy==="careful"&&R.sus>=5&&vendingBuy(E,data,"coolant"))continue;
      if(policy==="careful"&&R.sus>=7&&R.syn>=6){E.spend(6);E.fx({sus:-2});E.tick(1);continue;}
      /* filing extension: pay down doom, once per week, escalating cost */
      {const cost=15+10*(R.extUsed||0);
       if(policy!=="wanderer"&&R.doom>=8&&R.syn>=cost&&!R.spent["ext:"+R.week]){
         R.spent["ext:"+R.week]=1;R.extUsed=(R.extUsed||0)+1;
         E.spend(cost);R.doom=Math.max(0,R.doom-1);E.tick(1);continue;
       }}
      if(R.dead)break;
      if(R.hearingQueue.length){hearing(E,Ledger);continue;}
      if(R.product){
        if(policy==="pitcher"&&!R.product.pitched){moods.push(pitchSim(E,data,R.product));continue;}
        const funder=rnd()<.7?pickR(data.FUNDERS):null;
        const res=E.ship(funder);
        if(res)revenue+=res.revenue;
        continue;
      }
      const inv=R.inv;
      if(inv.act.length&&inv.tool.length&&inv.purpose.length){
        const napkinOK=inv.napkins>0&&policy!=="careful";
        if(napkinOK&&(policy==="grinder"||rnd()<.5)){build(E,"napkin");napkinBuilds++;}
        else {build(E,"lab");labBuilds++;}
        continue;
      }
      if(inv.napkins===0&&policy==="grinder"&&vendingBuy(E,data,"napkin"))continue;
      if(policy==="wanderer"&&rnd()<.35){meeting(E,data);continue;}
      if(R.syn>=6&&rnd()<.4){vendingBuy(E,data,"part");continue;}
      salvage(E,data);
    }
    runs.push({policy,runIndex:r+1,weeks:R.week,ships:R.ships,actions,
      cause:R.dead?(deathBox.cause||"?"):"TIMEOUT",syn:R.syn,susMax,revenue,
      napkinBuilds,labBuilds,
      revPerShip:R.ships?Math.round(revenue/R.ships):0,
      moods});
  }
  return runs;
}

/* ---- aggregate ---- */
const mean=a=>a.length?(a.reduce((x,y)=>x+y,0)/a.length):0;
const median=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
const fmt=n=>(Math.round(n*10)/10).toString();

const all=[];
for(const policy of POLICIES){
  for(let c=0;c<CAREERS;c++){
    all.push(...await simCareer(policy,policy+c));
  }
}

console.log(`\n=== BALANCE REPORT · ${CAREERS} careers × ${RUNS_PER} runs × ${POLICIES.length} policies = ${all.length} runs ===\n`);
for(const policy of POLICIES){
  const runs=all.filter(r=>r.policy===policy);
  const causes={};
  runs.forEach(r=>causes[r.cause]=(causes[r.cause]||0)+1);
  const causeStr=Object.entries(causes).sort((a,b)=>b[1]-a[1])
    .map(([k,v])=>`${k} ${(v/runs.length*100).toFixed(0)}%`).join(" · ");
  console.log(`${policy.toUpperCase()}  (${runs.length} runs)`);
  console.log(`  weeks    mean ${fmt(mean(runs.map(r=>r.weeks)))} · median ${median(runs.map(r=>r.weeks))} · max ${Math.max(...runs.map(r=>r.weeks))}`);
  console.log(`  ships    mean ${fmt(mean(runs.map(r=>r.ships)))} · median ${median(runs.map(r=>r.ships))}`);
  console.log(`  actions  mean ${fmt(mean(runs.map(r=>r.actions)))}`);
  console.log(`  deaths   ${causeStr}`);
  console.log(`  synergy  end mean ${fmt(mean(runs.map(r=>r.syn)))} · median ${median(runs.map(r=>r.syn))} · max ${Math.max(...runs.map(r=>r.syn))}`);
  console.log(`  rev/ship mean ${fmt(mean(runs.filter(r=>r.ships).map(r=>r.revPerShip)))}`);
  console.log(`  susMax   mean ${fmt(mean(runs.map(r=>r.susMax)))}`);
  console.log(`  builds   napkin ${runs.reduce((n,r)=>n+r.napkinBuilds,0)} · lab ${runs.reduce((n,r)=>n+r.labBuilds,0)}`);
  if(policy==="pitcher"){
    const moods=runs.flatMap(r=>r.moods);
    console.log(`  moods    mean ${fmt(mean(moods))} · ≥75 (2×): ${(moods.filter(m=>m>=75).length/Math.max(1,moods.length)*100).toFixed(0)}% · <30: ${(moods.filter(m=>m<30).length/Math.max(1,moods.length)*100).toFixed(0)}%`);
  }
  console.log("");
}

/* run-index drift: do later employments get easier (roles) */
for(const policy of POLICIES){
  const runs=all.filter(r=>r.policy===policy);
  const early=runs.filter(r=>r.runIndex<=2),late=runs.filter(r=>r.runIndex>=RUNS_PER-1);
  console.log(`${policy}: weeks run1-2 ${fmt(mean(early.map(r=>r.weeks)))} → run${RUNS_PER-1}+ ${fmt(mean(late.map(r=>r.weeks)))} · ships ${fmt(mean(early.map(r=>r.ships)))} → ${fmt(mean(late.map(r=>r.ships)))}`);
}
